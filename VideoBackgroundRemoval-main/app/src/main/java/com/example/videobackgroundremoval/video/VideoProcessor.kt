package com.example.videobackgroundremoval.video

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageFormat
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.YuvImage
import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import android.util.Log
import com.example.videobackgroundremoval.renderer.BackgroundReplacementRenderer
import com.example.videobackgroundremoval.ml.SegmentationMode
import com.example.videobackgroundremoval.ml.SegmentationProcessor
import com.example.videobackgroundremoval.ml.PersonSegmenter
import com.example.videobackgroundremoval.ml.SegmentationResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer

/**
 * 動画の背景を白に置き換える処理を統合するクラス
 *
 * iOS対応知識:
 * - MediaExtractor/MediaCodec → AVAssetReader/AVAssetReaderTrackOutput
 * - MediaMuxer → AVAssetWriter/AVAssetWriterInput
 * - 処理フローは同じ: デコード → 処理 → エンコード
 */
class VideoProcessor(private val context: Context) {

    // DeepLab V3: 全オブジェクト検出用
    private val objectSegmenter = SegmentationProcessor(context)

    // MediaPipe Selfie Segmentation: 人物検出用（VIDEO モード相当）
    private val personSegmenter = PersonSegmenter(context)

    private val renderer = BackgroundReplacementRenderer()

    private var isInitialized = false
    private var currentMode = SegmentationMode.PERSON  // デフォルトは人物モード

    companion object {
        private const val TAG = "VideoProcessor"
        private const val MIME_TYPE = "video/avc" // H.264
        private const val FRAME_RATE = 30
        private const val I_FRAME_INTERVAL = 1
        private const val BIT_RATE = 6000000 // 6Mbps
    }

    /**
     * プロセッサを初期化
     */
    suspend fun initialize() = withContext(Dispatchers.IO) {
        Log.d(TAG, "Initializing video processor...")

        try {
            // 両方のセグメンターを初期化
            objectSegmenter.initialize()
            personSegmenter.initialize()
            // renderer.initialize() // OpenGL ESはコンテキストが必要なのでスキップ（現在未使用）
            isInitialized = true

            Log.d(TAG, "Video processor initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize", e)
            throw e
        }
    }

    /**
     * 動画ファイルを処理して背景を白に置き換え
     *
     * @param inputUri 入力動画のURI
     * @param outputFile 出力動画ファイル
     * @param progressCallback 進捗コールバック (0.0 ~ 1.0)
     */
    private var debugInfo = StringBuilder()

    suspend fun processVideo(
        inputUri: Uri,
        outputFile: File,
        progressCallback: (Float) -> Unit = {},
        debugCallback: ((String) -> Unit)? = null
    ) = withContext(Dispatchers.IO) {
        debugInfo.clear()
        if (!isInitialized) {
            throw IllegalStateException("Processor not initialized")
        }

        Log.d(TAG, "Starting video processing...")
        Log.d(TAG, "Input: $inputUri")
        Log.d(TAG, "Output: ${outputFile.absolutePath}")

        // 新しい動画処理開始時に状態をリセット（EMA フィルタをクリア）
        personSegmenter.resetState()

        var extractor: MediaExtractor? = null
        var decoder: MediaCodec? = null
        var encoder: MediaCodec? = null
        var muxer: MediaMuxer? = null

        try {
            // MediaExtractorで入力動画を開く
            extractor = MediaExtractor().apply {
                context.contentResolver.openFileDescriptor(inputUri, "r")?.use { pfd ->
                    setDataSource(pfd.fileDescriptor)
                }
            }

            // 映像トラックを選択
            val trackIndex = selectVideoTrack(extractor)
            if (trackIndex < 0) {
                throw RuntimeException("No video track found")
            }

            extractor.selectTrack(trackIndex)
            val inputFormat = extractor.getTrackFormat(trackIndex)

            // 動画情報を取得
            val width = inputFormat.getInteger(MediaFormat.KEY_WIDTH)
            val height = inputFormat.getInteger(MediaFormat.KEY_HEIGHT)
            val duration = inputFormat.getLong(MediaFormat.KEY_DURATION)

            Log.d(TAG, "Video info: ${width}x${height}, duration=${duration}us")

            // デコーダーを作成
            val mime = inputFormat.getString(MediaFormat.KEY_MIME)!!
            decoder = MediaCodec.createDecoderByType(mime)
            decoder.configure(inputFormat, null, null, 0)
            decoder.start()

            // エンコーダーとMuxerを作成
            val outputFormat = createOutputFormat(width, height)
            encoder = MediaCodec.createEncoderByType(MIME_TYPE)
            encoder.configure(outputFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)

            // OpenGL ESレンダラー用にSurfaceを作成
            val encoderSurface = encoder.createInputSurface()
            encoder.start()

            // BackgroundReplacementRendererを初期化（GPU処理）
            renderer.initialize(width, height, encoderSurface)

            muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

            // フレーム処理ループ（GPU版）
            processFrames(extractor, decoder, encoder, muxer, duration, width, height, progressCallback, debugCallback)

            Log.d(TAG, "Video processing completed successfully")

        } catch (e: Exception) {
            Log.e(TAG, "Video processing failed", e)
            throw e
        } finally {
            // リソースを解放
            extractor?.release()
            decoder?.stop()
            decoder?.release()
            encoder?.stop()
            encoder?.release()
            muxer?.stop()
            muxer?.release()
        }
    }

    /**
     * フレーム処理のメインループ（GPU版）
     */
    private fun processFrames(
        extractor: MediaExtractor,
        decoder: MediaCodec,
        encoder: MediaCodec,
        muxer: MediaMuxer,
        totalDuration: Long,
        width: Int,
        height: Int,
        progressCallback: (Float) -> Unit,
        debugCallback: ((String) -> Unit)?
    ) {
        val decoderBufferInfo = MediaCodec.BufferInfo()
        val encoderBufferInfo = MediaCodec.BufferInfo()
        var muxerTrackIndex = -1
        var frameCount = 0

        var inputDone = false
        var outputDone = false

        while (!outputDone) {
            // デコーダーに入力
            if (!inputDone) {
                val inputBufferIndex = decoder.dequeueInputBuffer(10000)
                if (inputBufferIndex >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferIndex)!!
                    val sampleSize = extractor.readSampleData(inputBuffer, 0)

                    if (sampleSize < 0) {
                        decoder.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        inputDone = true
                    } else {
                        val presentationTimeUs = extractor.sampleTime
                        decoder.queueInputBuffer(inputBufferIndex, 0, sampleSize, presentationTimeUs, 0)
                        extractor.advance()

                        // 進捗を更新
                        val progress = presentationTimeUs.toFloat() / totalDuration
                        progressCallback(progress)
                    }
                }
            }

            // デコーダーから出力を取得
            val outputBufferIndex = decoder.dequeueOutputBuffer(decoderBufferInfo, 10000)
            if (outputBufferIndex >= 0) {
                // フレームを処理
                if (decoderBufferInfo.size > 0) {
                    // MediaCodecのImage APIでフレームを取得
                    val image = decoder.getOutputImage(outputBufferIndex)

                    if (image != null) {
                        try {
                            // GPU処理: YUV平面を直接抽出（高速）
                            val (yData, uData, vData) = extractYUVPlanes(image, width, height)

                            // セグメンテーション: モードに応じてセグメンターを選択
                            val fullBitmap = imageToBitmapForSegmentation(image, width, height)

                            // MediaPipe用に512x512にリサイズ（検証用）
                            val resizedForSegmentation = if (currentMode == SegmentationMode.PERSON) {
                                Bitmap.createScaledBitmap(fullBitmap, 512, 512, true)
                            } else {
                                fullBitmap
                            }

                            val segResult = when (currentMode) {
                                SegmentationMode.PERSON -> {
                                    // MediaPipe Selfie Segmentation (VIDEO モード)
                                    // MediaCodecのタイムスタンプ（マイクロ秒）をそのまま渡す
                                    personSegmenter.segmentPerson(resizedForSegmentation, decoderBufferInfo.presentationTimeUs)
                                }
                                SegmentationMode.ALL -> {
                                    // DeepLab V3 (全オブジェクト検出)
                                    objectSegmenter.segmentBitmap(resizedForSegmentation)
                                }
                            }

                            if (resizedForSegmentation != fullBitmap) {
                                resizedForSegmentation.recycle()
                            }
                            fullBitmap.recycle()

                            // デバッグ情報を蓄積（必ず表示）
                            if (frameCount == 0) {
                                debugInfo.append(segResult.debugInfo)
                                Log.d(TAG, "Debug info captured:\n${segResult.debugInfo}")

                                // 即座に画面に表示
                                debugCallback?.invoke(debugInfo.toString())
                            }

                            // GPU処理: OpenGL ESでYUV→RGB変換、マスク適用、背景置換
                            // マスクはGPU側でリニアフィルタリングにより自動リサイズ
                            renderer.renderFrame(
                                yData,
                                uData,
                                vData,
                                segResult.mask,
                                segResult.width,
                                segResult.height,
                                decoderBufferInfo.presentationTimeUs
                            )

                            frameCount++

                            if (frameCount % 30 == 0) {
                                Log.d(TAG, "Processed $frameCount frames")
                            }

                        } catch (e: Exception) {
                            Log.e(TAG, "Frame processing error at frame $frameCount", e)
                            // エラーを画面に表示
                            if (frameCount == 0 && debugCallback != null) {
                                debugCallback.invoke("⚠️ エラー発生:\n${e.message}\n${e.stackTraceToString().take(500)}")
                            }
                            frameCount++ // エラーでもカウントを進める
                        } finally {
                            image.close()
                        }
                    }
                }

                decoder.releaseOutputBuffer(outputBufferIndex, false)

                if ((decoderBufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                    // エンコーダーにEOSを送る（Surfaceモード用）
                    encoder.signalEndOfInputStream()
                    inputDone = true
                }
            }

            // エンコーダーからの出力をMuxerに書き込む
            val encoderStatus = encoder.dequeueOutputBuffer(encoderBufferInfo, 10000)
            if (encoderStatus == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                val outputFormat = encoder.outputFormat
                muxerTrackIndex = muxer.addTrack(outputFormat)
                muxer.start()
                Log.d(TAG, "Muxer started")
            } else if (encoderStatus >= 0) {
                val encodedData = encoder.getOutputBuffer(encoderStatus)!!

                if (encoderBufferInfo.size > 0) {
                    encodedData.position(encoderBufferInfo.offset)
                    encodedData.limit(encoderBufferInfo.offset + encoderBufferInfo.size)
                    muxer.writeSampleData(muxerTrackIndex, encodedData, encoderBufferInfo)
                }

                encoder.releaseOutputBuffer(encoderStatus, false)

                // エンコーダーのEOS検出
                if ((encoderBufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                    Log.d(TAG, "Encoder reached EOS")
                    outputDone = true
                }
            }
        }

        Log.d(TAG, "Total frames processed: $frameCount")
    }

    /**
     * MediaCodec ImageをBitmapに変換
     * iOS対応: CVImageBufferRef → CGImage変換に相当
     */
    private fun imageToBitmap(image: Image): Bitmap {
        val width = image.width
        val height = image.height
        val planes = image.planes

        val yPlane = planes[0]
        val uPlane = planes[1]
        val vPlane = planes[2]

        val ySize = width * height
        val yBuffer = yPlane.buffer
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val nv21 = ByteArray(ySize + ySize / 2)

        // Y平面をコピー（パディング考慮）
        val yRowStride = yPlane.rowStride
        val yPixelStride = yPlane.pixelStride

        yBuffer.position(0)
        var pos = 0
        for (row in 0 until height) {
            for (col in 0 until width) {
                nv21[pos++] = yBuffer.get(row * yRowStride + col * yPixelStride)
            }
        }

        // UV平面をNV21形式でコピー（VUVUVU...）
        val uvRowStride = uPlane.rowStride
        val uvPixelStride = uPlane.pixelStride
        val uvWidth = width / 2
        val uvHeight = height / 2

        uBuffer.position(0)
        vBuffer.position(0)

        for (row in 0 until uvHeight) {
            for (col in 0 until uvWidth) {
                val uvIdx = row * uvRowStride + col * uvPixelStride
                nv21[pos++] = vBuffer.get(uvIdx)  // V
                nv21[pos++] = uBuffer.get(uvIdx)  // U
            }
        }

        // NV21からBitmapに変換
        val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
        val out = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, width, height), 100, out)
        val jpegData = out.toByteArray()

        return BitmapFactory.decodeByteArray(jpegData, 0, jpegData.size)
            ?: Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    }

    /**
     * Image (YUV_420_888) を NV21形式のバイト配列に変換
     */
    private fun yuv420ToNv21(image: Image): ByteArray {
        val width = image.width
        val height = image.height
        val ySize = width * height
        val uvSize = width * height / 2

        val nv21 = ByteArray(ySize + uvSize)

        val yBuffer = image.planes[0].buffer.duplicate()
        val uBuffer = image.planes[1].buffer.duplicate()
        val vBuffer = image.planes[2].buffer.duplicate()

        yBuffer.rewind()
        uBuffer.rewind()
        vBuffer.rewind()

        val yRowStride = image.planes[0].rowStride
        val yPixelStride = image.planes[0].pixelStride
        val uvRowStride = image.planes[1].rowStride
        val uvPixelStride = image.planes[1].pixelStride

        // デバッグログ（画面とLogcat両方に出力）
        val debug = buildString {
            appendLine("=== YUV変換デバッグ ===")
            appendLine("画像: ${width}x${height}")
            appendLine("Y: stride=$yRowStride, pixel=$yPixelStride, buf=${yBuffer.remaining()}")
            appendLine("U: stride=$uvRowStride, pixel=$uvPixelStride, buf=${uBuffer.remaining()}")
            appendLine("V: stride=${image.planes[2].rowStride}, pixel=${image.planes[2].pixelStride}, buf=${vBuffer.remaining()}")
            appendLine("期待NV21サイズ: ${ySize + uvSize}")
        }
        debugInfo.append(debug)
        Log.d(TAG, debug)

        var pos = 0

        // Y平面をコピー
        if (yRowStride == width) {
            // パディングなし - 高速コピー
            debugInfo.appendLine("Y: 高速コピー(パディングなし)")
            yBuffer.get(nv21, 0, ySize)
            pos = ySize
        } else {
            // パディングあり - 行ごとにコピー
            debugInfo.appendLine("Y: 行ごとコピー(パディングあり)")
            yBuffer.rewind()
            for (row in 0 until height) {
                yBuffer.position(row * yRowStride)
                yBuffer.get(nv21, pos, width)
                pos += width
            }
        }

        // UV平面をNV21形式（VUVUVU...）でコピー
        val uvWidth = width / 2
        val uvHeight = height / 2

        debugInfo.appendLine("UV: ${uvWidth}x${uvHeight}, NV21形式に変換中...")

        uBuffer.rewind()
        vBuffer.rewind()

        var uvCopyCount = 0
        for (row in 0 until uvHeight) {
            for (col in 0 until uvWidth) {
                val uvIndex = row * uvRowStride + col * uvPixelStride
                // NV21はVUVUVU...の順
                nv21[pos++] = vBuffer.get(uvIndex)
                nv21[pos++] = uBuffer.get(uvIndex)
                uvCopyCount++
            }
        }

        debugInfo.appendLine("UV完了: ${uvCopyCount}サンプル, pos=$pos")
        debugInfo.appendLine("=========================")
        Log.d(TAG, "YUV conversion completed")

        return nv21
    }

    /**
     * BitmapをYUV420形式に変換してエンコーダーに送信
     */
    private fun encodeBitmap(
        encoder: MediaCodec,
        bitmap: Bitmap,
        presentationTimeUs: Long
    ) {
        val inputBufferIndex = encoder.dequeueInputBuffer(10000)
        if (inputBufferIndex >= 0) {
            val inputBuffer = encoder.getInputBuffer(inputBufferIndex)!!

            // BitmapをYUV420に変換
            val width = bitmap.width
            val height = bitmap.height
            val pixels = IntArray(width * height)
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

            // NV12形式に変換（Y平面 + UVインターリーブ）
            val ySize = width * height
            val uvSize = width * height / 2  // インターリーブなのでU+Vで半分

            val nv12Data = ByteArray(ySize + uvSize)

            inputBuffer.clear()

            var pos = 0

            // Y平面を書き込み
            for (y in 0 until height) {
                for (x in 0 until width) {
                    val pixel = pixels[y * width + x]
                    val r = (pixel shr 16) and 0xFF
                    val g = (pixel shr 8) and 0xFF
                    val b = pixel and 0xFF

                    // RGB → Y変換
                    val yValue = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
                    nv12Data[pos++] = yValue.toByte()
                }
            }

            // UV平面をインターリーブで書き込み（UVUVUV...）
            for (y in 0 until height step 2) {
                for (x in 0 until width step 2) {
                    val pixel = pixels[y * width + x]
                    val r = (pixel shr 16) and 0xFF
                    val g = (pixel shr 8) and 0xFF
                    val b = pixel and 0xFF

                    // RGB → UV変換
                    val uValue = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
                    val vValue = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128

                    nv12Data[pos++] = uValue.toByte()  // U
                    nv12Data[pos++] = vValue.toByte()  // V
                }
            }

            // NV12データを書き込み
            inputBuffer.put(nv12Data)

            encoder.queueInputBuffer(
                inputBufferIndex,
                0,
                inputBuffer.position(),
                presentationTimeUs,
                0
            )
        }
    }

    /**
     * Canvasを使って背景を白に置き換え（アルファブレンド版）
     * スムーズなマスクに対応したグラデーション合成
     */
    private fun applyWhiteBackgroundSimple(frame: Bitmap, maskBitmap: Bitmap): Bitmap {
        val width = frame.width
        val height = frame.height
        val result = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val framePixels = IntArray(width * height)
        val maskPixels = IntArray(width * height)
        val resultPixels = IntArray(width * height)

        frame.getPixels(framePixels, 0, width, 0, 0, width, height)
        maskBitmap.getPixels(maskPixels, 0, width, 0, 0, width, height)

        // アルファブレンドで合成（マスク値に応じて前景と背景を混ぜる）
        for (i in framePixels.indices) {
            if (i < maskPixels.size) {
                // マスクのR値を取得（グレースケール、0-255）
                val maskValue = (maskPixels[i] shr 16) and 0xFF
                val alpha = maskValue / 255.0f

                // 元の色
                val r = (framePixels[i] shr 16) and 0xFF
                val g = (framePixels[i] shr 8) and 0xFF
                val b = framePixels[i] and 0xFF

                // 白背景との合成
                val finalR = (r * alpha + 255 * (1 - alpha)).toInt().coerceIn(0, 255)
                val finalG = (g * alpha + 255 * (1 - alpha)).toInt().coerceIn(0, 255)
                val finalB = (b * alpha + 255 * (1 - alpha)).toInt().coerceIn(0, 255)

                resultPixels[i] = (0xFF shl 24) or (finalR shl 16) or (finalG shl 8) or finalB
            }
        }

        result.setPixels(resultPixels, 0, width, 0, 0, width, height)

        return result
    }

    /**
     * 映像トラックを選択
     */
    private fun selectVideoTrack(extractor: MediaExtractor): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("video/") == true) {
                return i
            }
        }
        return -1
    }

    /**
     * 出力フォーマットを作成
     */
    private fun createOutputFormat(width: Int, height: Int): MediaFormat {
        return MediaFormat.createVideoFormat(MIME_TYPE, width, height).apply {
            // Surfaceモード用: COLOR_FormatSurfaceを指定
            // OpenGL ESからの入力を受け取る
            setInteger(
                MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface
            )
            setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
            setInteger(MediaFormat.KEY_FRAME_RATE, FRAME_RATE)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, I_FRAME_INTERVAL)
        }
    }

    /**
     * FloatArrayマスク（0.0-1.0）をグレースケールBitmapに変換
     * MediaPipe Selfie Segmentationの出力用
     */
    private fun createMaskBitmapFromFloat(
        maskArray: FloatArray,
        width: Int,
        height: Int,
        useGradient: Boolean = true
    ): Bitmap {
        val pixels = IntArray(width * height) { i ->
            if (useGradient) {
                // グラデーションモード: 信頼度をそのまま使用（滑らかな境界）
                val value = (maskArray[i] * 255).toInt().coerceIn(0, 255)
                (0xFF shl 24) or (value shl 16) or (value shl 8) or value
            } else {
                // 二値化モード: 閾値0.5で白黒に分ける
                val value = if (maskArray[i] >= 0.5f) 255 else 0
                (0xFF shl 24) or (value shl 16) or (value shl 8) or value
            }
        }
        return Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
    }

    /**
     * モルフォロジークロージング（膨張→収縮）で穴を埋める
     * ダンス動画など全身が映る場合の黒い物体（椅子など）を人物領域に含める
     */
    private fun morphologyClose(bitmap: Bitmap, kernelSize: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // 1. 膨張（Dilation）: 白領域を拡大
        val dilated = dilate(pixels, width, height, kernelSize)

        // 2. 収縮（Erosion）: 元のサイズに戻す（穴は埋まったまま）
        val eroded = erode(dilated, width, height, kernelSize)

        return Bitmap.createBitmap(eroded, width, height, Bitmap.Config.ARGB_8888)
    }

    private fun dilate(pixels: IntArray, width: Int, height: Int, kernelSize: Int): IntArray {
        val result = IntArray(width * height)
        val radius = kernelSize / 2

        for (y in 0 until height) {
            for (x in 0 until width) {
                var maxValue = 0
                // カーネル範囲内の最大値を取得
                for (ky in -radius..radius) {
                    for (kx in -radius..radius) {
                        val ny = (y + ky).coerceIn(0, height - 1)
                        val nx = (x + kx).coerceIn(0, width - 1)
                        val value = (pixels[ny * width + nx] shr 16) and 0xFF
                        maxValue = maxValue.coerceAtLeast(value)
                    }
                }
                result[y * width + x] = (0xFF shl 24) or (maxValue shl 16) or (maxValue shl 8) or maxValue
            }
        }
        return result
    }

    private fun erode(pixels: IntArray, width: Int, height: Int, kernelSize: Int): IntArray {
        val result = IntArray(width * height)
        val radius = kernelSize / 2

        for (y in 0 until height) {
            for (x in 0 until width) {
                var minValue = 255
                // カーネル範囲内の最小値を取得
                for (ky in -radius..radius) {
                    for (kx in -radius..radius) {
                        val ny = (y + ky).coerceIn(0, height - 1)
                        val nx = (x + kx).coerceIn(0, width - 1)
                        val value = (pixels[ny * width + nx] shr 16) and 0xFF
                        minValue = minValue.coerceAtMost(value)
                    }
                }
                result[y * width + x] = (0xFF shl 24) or (minValue shl 16) or (minValue shl 8) or minValue
            }
        }
        return result
    }

    /**
     * ImageからYUV平面を個別に抽出（GPU処理用）
     *
     * @return Triple(yData, uData, vData)
     */
    private fun extractYUVPlanes(image: Image, width: Int, height: Int): Triple<ByteArray, ByteArray, ByteArray> {
        val planes = image.planes

        val yPlane = planes[0]
        val uPlane = planes[1]
        val vPlane = planes[2]

        val yBuffer = yPlane.buffer
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val yRowStride = yPlane.rowStride
        val yPixelStride = yPlane.pixelStride

        val uvRowStride = uPlane.rowStride
        val uvPixelStride = uPlane.pixelStride

        val uvWidth = width / 2
        val uvHeight = height / 2

        // Y平面を抽出
        val yData = ByteArray(width * height)
        yBuffer.position(0)
        var pos = 0
        for (row in 0 until height) {
            for (col in 0 until width) {
                yData[pos++] = yBuffer.get(row * yRowStride + col * yPixelStride)
            }
        }

        // U平面を抽出
        val uData = ByteArray(uvWidth * uvHeight)
        uBuffer.position(0)
        pos = 0
        for (row in 0 until uvHeight) {
            for (col in 0 until uvWidth) {
                uData[pos++] = uBuffer.get(row * uvRowStride + col * uvPixelStride)
            }
        }

        // V平面を抽出
        val vData = ByteArray(uvWidth * uvHeight)
        vBuffer.position(0)
        pos = 0
        for (row in 0 until uvHeight) {
            for (col in 0 until uvWidth) {
                vData[pos++] = vBuffer.get(row * uvRowStride + col * uvPixelStride)
            }
        }

        return Triple(yData, uData, vData)
    }

    /**
     * ImageからBitmapに変換（セグメンテーション用）
     *
     * JPEG圧縮を使わず、直接YUV→RGB変換（ITU-R BT.601）
     * 画質劣化を防いでセグメンテーション精度を維持
     */
    private fun imageToBitmapForSegmentation(image: Image, targetWidth: Int, targetHeight: Int): Bitmap {
        val width = image.width
        val height = image.height
        val planes = image.planes

        val yPlane = planes[0]
        val uPlane = planes[1]
        val vPlane = planes[2]

        val yBuffer = yPlane.buffer
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val yRowStride = yPlane.rowStride
        val yPixelStride = yPlane.pixelStride
        val uvRowStride = uPlane.rowStride
        val uvPixelStride = uPlane.pixelStride

        // RGB Bitmapを直接生成（JPEG圧縮なし）
        val pixels = IntArray(width * height)

        for (y in 0 until height) {
            for (x in 0 until width) {
                // Y値を取得
                val yIndex = y * yRowStride + x * yPixelStride
                val yValue = (yBuffer.get(yIndex).toInt() and 0xFF)

                // UV値を取得（4:2:0サブサンプリング）
                val uvRow = y / 2
                val uvCol = x / 2
                val uvIndex = uvRow * uvRowStride + uvCol * uvPixelStride

                val uValue = (uBuffer.get(uvIndex).toInt() and 0xFF) - 128
                val vValue = (vBuffer.get(uvIndex).toInt() and 0xFF) - 128

                // YUV → RGB 変換（ITU-R BT.601）
                val r = (yValue + 1.402 * vValue).toInt().coerceIn(0, 255)
                val g = (yValue - 0.344136 * uValue - 0.714136 * vValue).toInt().coerceIn(0, 255)
                val b = (yValue + 1.772 * uValue).toInt().coerceIn(0, 255)

                pixels[y * width + x] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }

        val bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)

        // ターゲットサイズにリサイズ（必要な場合のみ）
        if (bitmap.width != targetWidth || bitmap.height != targetHeight) {
            val resized = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
            bitmap.recycle()
            return resized
        }

        return bitmap
    }

    /**
     * マスクをリサイズ（バイリニア補間）
     */
    private fun resizeMask(mask: FloatArray, srcWidth: Int, srcHeight: Int, dstWidth: Int, dstHeight: Int): FloatArray {
        val result = FloatArray(dstWidth * dstHeight)
        val xRatio = srcWidth.toFloat() / dstWidth
        val yRatio = srcHeight.toFloat() / dstHeight

        for (y in 0 until dstHeight) {
            for (x in 0 until dstWidth) {
                val srcX = x * xRatio
                val srcY = y * yRatio
                val x0 = srcX.toInt().coerceIn(0, srcWidth - 1)
                val y0 = srcY.toInt().coerceIn(0, srcHeight - 1)
                val x1 = (x0 + 1).coerceIn(0, srcWidth - 1)
                val y1 = (y0 + 1).coerceIn(0, srcHeight - 1)

                // バイリニア補間
                val dx = srcX - x0
                val dy = srcY - y0

                val v00 = mask[y0 * srcWidth + x0]
                val v10 = mask[y0 * srcWidth + x1]
                val v01 = mask[y1 * srcWidth + x0]
                val v11 = mask[y1 * srcWidth + x1]

                val v0 = v00 * (1 - dx) + v10 * dx
                val v1 = v01 * (1 - dx) + v11 * dx
                result[y * dstWidth + x] = v0 * (1 - dy) + v1 * dy
            }
        }
        return result
    }

    /**
     * セグメンテーションモードを設定
     */
    fun setSegmentationMode(mode: SegmentationMode) {
        currentMode = mode
        Log.d(TAG, "Segmentation mode set to: $mode")
    }

    /**
     * リソースを解放
     */
    fun release() {
        objectSegmenter.close()
        personSegmenter.close()
        renderer.release()
        isInitialized = false
        Log.d(TAG, "Video processor released")
    }
}

package com.example.videobackgroundremoval.ml

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenter
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.ByteBufferExtractor
import com.google.mediapipe.framework.image.MPImage

/**
 * MediaPipe Selfie Segmentation を Tasks API (VIDEO モード) で実装
 * カスタムOp対応 + 時間的一貫性を実現
 */
class PersonSegmenter(private val context: Context) {

    private var imageSegmenter: ImageSegmenter? = null
    private var outputWidth = 256
    private var outputHeight = 256

    // 追加の EMA フィルタ（Tasks API の VIDEO モードに加えてさらに平滑化）
    private var previousMask: FloatArray? = null
    private var emaAlpha = 0.3f  // VIDEO モード使用時は控えめに

    // タイムスタンプの単調増加を保証
    private var lastTimestamp = 0L

    companion object {
        private const val TAG = "PersonSegmenter"
        private const val MODEL_NAME = "selfie_segmenter.tflite"
    }

    /**
     * MediaPipe Tasks ImageSegmenter を VIDEO モードで初期化
     */
    fun initialize() {
        try {
            Log.d(TAG, "Initializing MediaPipe ImageSegmenter (VIDEO mode + GPU)...")

            // 0.10.15以降でPR #6046の修正が含まれている想定
            val baseOptions = BaseOptions.builder()
                .setDelegate(Delegate.GPU)
                .setModelAssetPath(MODEL_NAME)
                .build()

            // ImageSegmenter Options を VIDEO モードで設定
            val options = ImageSegmenter.ImageSegmenterOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.VIDEO)  // 時間的一貫性あり
                .setOutputCategoryMask(false)
                .setOutputConfidenceMasks(true)  // モデル本来の出力形式（Float）
                .build()

            // ImageSegmenter を作成
            imageSegmenter = ImageSegmenter.createFromOptions(context, options)

            Log.d(TAG, "ImageSegmenter initialized successfully (VIDEO mode + GPU)")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize with GPU: ${e.message}", e)
            throw e
        }
    }

    /**
     * Bitmap から人物セグメンテーションマスクを生成（VIDEO モード + 追加EMA）
     *
     * @param bitmap 入力画像
     * @param timestampUs MediaCodecのpresentationTimeUs（マイクロ秒）
     */
    fun segmentPerson(bitmap: Bitmap, timestampUs: Long = System.currentTimeMillis() * 1000): SegmentationResult {
        val startTime = System.currentTimeMillis()

        // タイムスタンプの単調増加を保証（MediaPipeの要件）
        val safeTimestamp = if (timestampUs <= lastTimestamp) {
            lastTimestamp + 1  // 最低でも1マイクロ秒進める
        } else {
            timestampUs
        }
        lastTimestamp = safeTimestamp

        Log.d(TAG, "Input bitmap: ${bitmap.width}x${bitmap.height}, config=${bitmap.config}, timestamp=$safeTimestamp us")

        // Bitmapの実際のデータを確認（デバッグ）
        val testPixels = IntArray(100)
        bitmap.getPixels(testPixels, 0, 10, 0, 0, 10, 10)
        val hasColor = testPixels.any { pixel ->
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8) and 0xFF
            val b = pixel and 0xFF
            r != g || g != b  // RGB値が異なればカラー
        }
        Log.d(TAG, "Bitmap has color data: $hasColor, byteCount=${bitmap.byteCount}, allocationByteCount=${bitmap.allocationByteCount}")
        Log.d(TAG, "Sample pixels (first 5): ${testPixels.take(5).map { "0x${it.toString(16)}" }}")

        // BitmapImageBuilderで直接MPImageを作成（公式の推奨方法）
        val mpImage = BitmapImageBuilder(bitmap).build()

        Log.d(TAG, "MPImage created: ${mpImage.width}x${mpImage.height}")

        // VIDEO モードでセグメンテーション実行（タイムスタンプはマイクロ秒）
        val result = imageSegmenter?.segmentForVideo(mpImage, safeTimestamp)

        val inferenceTime = System.currentTimeMillis() - startTime

        // Confidence Masksを取得（モデル本来の出力形式：Float）
        val confidenceMasksOptional = result?.confidenceMasks()

        if (confidenceMasksOptional == null || !confidenceMasksOptional.isPresent || confidenceMasksOptional.get().isEmpty()) {
            Log.e(TAG, "Segmentation result is null or empty")
            return SegmentationResult(FloatArray(outputWidth * outputHeight), outputWidth, outputHeight, "Error: null result")
        }

        // 最初のマスク（人物）を取得
        val personMask = confidenceMasksOptional.get()[0]

        // マスクをFloatArrayに変換（0.0-1.0の信頼度）
        outputWidth = personMask.width
        outputHeight = personMask.height

        // MPImageからByteBufferを取得し、FloatBufferに変換
        val byteBuffer = ByteBufferExtractor.extract(personMask)
        byteBuffer.order(java.nio.ByteOrder.nativeOrder())
        val floatBuffer = byteBuffer.asFloatBuffer()

        val currentMask = FloatArray(outputWidth * outputHeight)
        floatBuffer.get(currentMask)

        // 追加の EMA フィルタで更に平滑化（オプション）
        val smoothedMask = if (previousMask == null || emaAlpha >= 0.99f) {
            // 初回 or EMA無効時: そのまま使用
            currentMask
        } else {
            // EMA 適用: smoothed = α × current + (1-α) × previous
            FloatArray(outputWidth * outputHeight) { i: Int ->
                emaAlpha * currentMask[i] + (1 - emaAlpha) * previousMask!![i]
            }
        }

        // 次回のために保存
        previousMask = smoothedMask.clone()

        // 統計情報
        val personPixels = smoothedMask.count { it > 0.5f }
        val personRatio = (personPixels.toFloat() / smoothedMask.size) * 100

        Log.d(TAG, "========================================")
        Log.d(TAG, "MediaPipe Selfie Segmentation (VIDEO mode):")
        Log.d(TAG, "  推論時間: ${inferenceTime}ms")
        Log.d(TAG, "  人物検出: $personPixels/${smoothedMask.size} (${String.format("%.2f", personRatio)}%)")
        Log.d(TAG, "  追加EMA係数: $emaAlpha")
        Log.d(TAG, "  タイムスタンプ: ${safeTimestamp}us (${safeTimestamp/1000}ms)")
        Log.d(TAG, "========================================")

        val debugInfo = buildString {
            appendLine("=== Selfie Segmentation (VIDEO mode) ===")
            appendLine("推論: ${inferenceTime}ms")
            appendLine("検出: $personPixels/${smoothedMask.size} (${String.format("%.2f", personRatio)}%)")
        }

        return SegmentationResult(smoothedMask, outputWidth, outputHeight, debugInfo)
    }

    /**
     * EMA 係数を設定（0.0 ~ 1.0）
     *
     * @param alpha 係数（大きいほど現フレーム重視、小さいほど時間的平滑化）
     *              推奨: 0.6 ~ 0.8
     */
    fun setEmaAlpha(alpha: Float) {
        emaAlpha = alpha.coerceIn(0.0f, 1.0f)
        Log.d(TAG, "EMA alpha set to: $emaAlpha")
    }

    /**
     * フレーム状態をリセット（新しい動画処理開始時）
     */
    fun resetState() {
        previousMask = null
        lastTimestamp = 0L
        Log.d(TAG, "State reset (EMA filter and timestamp cleared)")
    }

    /**
     * リソースを解放
     */
    fun close() {
        imageSegmenter?.close()
        imageSegmenter = null
        previousMask = null
        Log.d(TAG, "Resources released")
    }
}

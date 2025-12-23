package com.example.videobackgroundremoval.ml

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.gpu.GpuDelegate
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * セグメンテーション結果を保持するデータクラス
 */
data class SegmentationResult(
    val mask: FloatArray,
    val width: Int,
    val height: Int,
    val debugInfo: String = ""
)

/**
 * セグメンテーションモード
 */
enum class SegmentationMode {
    PERSON,  // 人物のみ
    ALL      // 全オブジェクト
}

/**
 * TFLite Interpreter + GPU Delegate を使用した高速セグメンテーション
 */
class SegmentationProcessor(private val context: Context) {

    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null
    private var inputWidth = 0
    private var inputHeight = 0
    private var outputWidth = 0
    private var outputHeight = 0
    private var outputClasses = 0

    var mode: SegmentationMode = SegmentationMode.PERSON

    companion object {
        private const val TAG = "DeepLabSegmenter"
        private const val MODEL_NAME = "deeplab_v3.tflite"
    }

    /**
     * TFLite Interpreter を GPU Delegate 付きで初期化
     */
    fun initialize() {
        try {
            Log.d(TAG, "Initializing TFLite Interpreter with GPU Delegate...")

            // モデルファイルをロード
            val model = loadModelFile(MODEL_NAME)

            // GPU互換性チェック
            val compatList = CompatibilityList()
            val useGpu = compatList.isDelegateSupportedOnThisDevice

            Log.d(TAG, "GPU Delegate supported: $useGpu")

            // Interpreter オプションを設定
            val options = Interpreter.Options()

            if (useGpu) {
                // GPU Delegate を作成（デフォルト設定で最適化）
                gpuDelegate = GpuDelegate()
                options.addDelegate(gpuDelegate)
                Log.d(TAG, "GPU Delegate enabled with default options")
            } else {
                // CPU マルチスレッド
                options.setNumThreads(4)
                Log.d(TAG, "GPU not supported, using CPU with 4 threads")
            }

            // Interpreter を作成
            interpreter = Interpreter(model, options)

            // 入出力の形状を取得
            val inputShape = interpreter!!.getInputTensor(0).shape()
            val outputShape = interpreter!!.getOutputTensor(0).shape()

            inputHeight = inputShape[1]
            inputWidth = inputShape[2]
            outputHeight = outputShape[1]
            outputWidth = outputShape[2]
            outputClasses = if (outputShape.size > 3) outputShape[3] else 1

            Log.d(TAG, "Model initialized successfully")
            Log.d(TAG, "  Input shape: [${inputShape.joinToString(", ")}]")
            Log.d(TAG, "  Output shape: [${outputShape.joinToString(", ")}]")
            Log.d(TAG, "  Output classes: $outputClasses")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize TFLite Interpreter: ${e.message}", e)
            throw e
        }
    }

    /**
     * モデルファイルをロード
     */
    private fun loadModelFile(modelName: String): MappedByteBuffer {
        val fileDescriptor = context.assets.openFd(modelName)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = fileDescriptor.startOffset
        val declaredLength = fileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    /**
     * Bitmap からセグメンテーションマスクを生成（GPU加速）
     */
    fun segmentBitmap(bitmap: Bitmap): SegmentationResult {
        val startTime = System.currentTimeMillis()

        // 入力テンソルを準備（NHWC形式: [1, height, width, 3]）
        val inputBuffer = ByteBuffer.allocateDirect(4 * inputHeight * inputWidth * 3)
        inputBuffer.order(ByteOrder.nativeOrder())

        // Bitmap をリサイズ（必要な場合）
        val resizedBitmap = if (bitmap.width != inputWidth || bitmap.height != inputHeight) {
            Bitmap.createScaledBitmap(bitmap, inputWidth, inputHeight, true)
        } else {
            bitmap
        }

        // Bitmap → ByteBuffer（正規化: 0-255 → 0-1）
        val pixels = IntArray(inputWidth * inputHeight)
        resizedBitmap.getPixels(pixels, 0, inputWidth, 0, 0, inputWidth, inputHeight)

        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF) / 255.0f
            val g = ((pixel shr 8) and 0xFF) / 255.0f
            val b = (pixel and 0xFF) / 255.0f
            inputBuffer.putFloat(r)
            inputBuffer.putFloat(g)
            inputBuffer.putFloat(b)
        }

        if (resizedBitmap != bitmap) {
            resizedBitmap.recycle()
        }

        // 出力テンソルを準備（float32形式: [1, height, width, classes]）
        val outputBuffer = ByteBuffer.allocateDirect(4 * outputHeight * outputWidth * outputClasses)
        outputBuffer.order(ByteOrder.nativeOrder())

        // 推論実行（GPU）
        interpreter?.run(inputBuffer, outputBuffer)

        val inferenceTime = System.currentTimeMillis() - startTime
        Log.d(TAG, "Inference time: ${inferenceTime}ms (GPU)")

        // 出力を解析（argmax でクラスを取得）
        outputBuffer.rewind()
        val maskArray = FloatArray(outputWidth * outputHeight)
        val categoryCount = mutableMapOf<Int, Int>()

        for (i in 0 until outputWidth * outputHeight) {
            // 各ピクセルで最大確率のクラスを取得（argmax）
            var maxClass = 0
            var maxProb = -Float.MAX_VALUE

            for (c in 0 until outputClasses) {
                val prob = outputBuffer.float

                if (prob > maxProb) {
                    maxProb = prob
                    maxClass = c
                }
            }

            categoryCount[maxClass] = (categoryCount[maxClass] ?: 0) + 1

            // DeepLab V3: 全オブジェクト検出モード
            // 背景(class 0)以外のすべてのオブジェクトを保持
            maskArray[i] = if (maxClass != 0) 1.0f else 0.0f
        }

        // デバッグ情報
        val topCategories = categoryCount.toList().sortedByDescending { it.second }.take(5)
        val personPixels = maskArray.count { it > 0.5f }
        val personRatio = (personPixels.toFloat() / maskArray.size) * 100

        Log.d(TAG, "========================================")
        Log.d(TAG, "DeepLab V3 (GPU) カテゴリ検出結果:")
        Log.d(TAG, "  総カテゴリ数: ${categoryCount.size}")
        topCategories.forEachIndexed { index, (category, count) ->
            val percentage = (count.toFloat() / maskArray.size * 100)
            Log.d(TAG, "  ${index + 1}. カテゴリ $category: $count ピクセル (${String.format("%.2f", percentage)}%)")
        }
        Log.d(TAG, "  モード: $mode")
        Log.d(TAG, "  検出ピクセル: $personPixels/${maskArray.size} (${String.format("%.2f", personRatio)}%)")
        Log.d(TAG, "========================================")

        val debugInfo = buildString {
            appendLine("=== DeepLab V3 (GPU) 検出結果 ===")
            appendLine("モード: $mode")
            appendLine("上位: $topCategories")
            appendLine("検出: $personPixels/${maskArray.size} (${String.format("%.2f", personRatio)}%)")
        }

        return SegmentationResult(maskArray, outputWidth, outputHeight, debugInfo)
    }

    /**
     * リソースを解放
     */
    fun close() {
        interpreter?.close()
        interpreter = null
        gpuDelegate?.close()
        gpuDelegate = null
        Log.d(TAG, "Resources released")
    }
}

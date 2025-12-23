package com.example.videobackgroundremoval

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.OpenableColumns
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.example.videobackgroundremoval.ml.SegmentationMode
import com.example.videobackgroundremoval.video.VideoProcessor
import com.google.android.material.switchmaterial.SwitchMaterial
import kotlinx.coroutines.launch
import java.io.File

/**
 * メインActivity - 動画選択と処理のUI
 */
class MainActivity : AppCompatActivity() {

    private lateinit var selectVideoButton: Button
    private lateinit var processButton: Button
    private lateinit var selectedFileText: TextView
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var modeSwitch: SwitchMaterial

    private var selectedVideoUri: Uri? = null
    private lateinit var videoProcessor: VideoProcessor

    // 動画選択のActivityResultLauncher
    private val selectVideoLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                selectedVideoUri = uri
                updateSelectedFile(uri)
                processButton.isEnabled = true
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Viewを初期化
        selectVideoButton = findViewById(R.id.selectVideoButton)
        processButton = findViewById(R.id.processButton)
        selectedFileText = findViewById(R.id.selectedFileText)
        statusText = findViewById(R.id.statusText)
        progressBar = findViewById(R.id.progressBar)
        modeSwitch = findViewById(R.id.modeSwitch)

        // VideoProcessorを初期化
        videoProcessor = VideoProcessor(this)

        // ボタンのクリックリスナーを設定
        selectVideoButton.setOnClickListener {
            selectVideo()
        }

        processButton.setOnClickListener {
            selectedVideoUri?.let { uri ->
                processVideo(uri)
            }
        }

        // モード切り替えスイッチ
        modeSwitch.setOnCheckedChangeListener { _, isChecked ->
            val mode = if (isChecked) {
                SegmentationMode.PERSON
            } else {
                SegmentationMode.ALL
            }
            videoProcessor.setSegmentationMode(mode)
            modeSwitch.text = if (isChecked) "人物のみ" else "全オブジェクト"
            Toast.makeText(this, "モード: ${modeSwitch.text}", Toast.LENGTH_SHORT).show()
        }

        // VideoProcessorを初期化（バックグラウンドで）
        lifecycleScope.launch {
            try {
                statusText.text = "初期化中..."
                videoProcessor.initialize()
                statusText.text = "待機中"
            } catch (e: Exception) {
                statusText.text = "初期化エラー: ${e.message}"
                Toast.makeText(this@MainActivity, "初期化に失敗しました", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * 動画選択ダイアログを表示
     */
    private fun selectVideo() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "video/*"
        }
        selectVideoLauncher.launch(intent)
    }

    /**
     * 選択されたファイル名を表示
     */
    private fun updateSelectedFile(uri: Uri) {
        val fileName = getFileName(uri)
        selectedFileText.text = "選択: $fileName"
    }

    /**
     * URIからファイル名を取得
     */
    private fun getFileName(uri: Uri): String {
        var name = "unknown"
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0) {
                    name = cursor.getString(nameIndex)
                }
            }
        }
        return name
    }

    /**
     * 動画処理を開始
     */
    private fun processVideo(uri: Uri) {
        lifecycleScope.launch {
            try {
                // UIを更新
                selectVideoButton.isEnabled = false
                processButton.isEnabled = false
                progressBar.visibility = View.VISIBLE
                progressBar.progress = 0
                statusText.text = "処理中..."

                // 出力ファイル名を準備（Moviesフォルダに保存）
                val fileName = "video_nobg_${System.currentTimeMillis()}.mp4"
                val outputFile = File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), fileName)

                // 動画を処理
                videoProcessor.processVideo(
                    uri,
                    outputFile,
                    progressCallback = { progress ->
                        runOnUiThread {
                            progressBar.progress = (progress * 100).toInt()
                            statusText.text = "処理中... ${(progress * 100).toInt()}%"
                        }
                    },
                    debugCallback = { debugInfo ->
                        runOnUiThread {
                            statusText.text = "処理中...\n\n${debugInfo}"
                        }
                    }
                )

                // 完了後、共有メニューを表示
                runOnUiThread {
                    progressBar.visibility = View.GONE
                    statusText.text = "完了！\n共有メニューから保存またはビューアーで開けます"
                    selectVideoButton.isEnabled = true
                    processButton.isEnabled = true

                    // FileProviderを使ってURIを取得
                    val videoUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "${applicationContext.packageName}.provider",
                        outputFile
                    )

                    // 共有インテントを作成
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "video/mp4"
                        putExtra(Intent.EXTRA_STREAM, videoUri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }

                    // 共有メニューを表示
                    startActivity(Intent.createChooser(shareIntent, "動画を保存または開く"))
                }

            } catch (e: Exception) {
                runOnUiThread {
                    progressBar.visibility = View.GONE
                    statusText.text = "エラー: ${e.message}"
                    selectVideoButton.isEnabled = true
                    processButton.isEnabled = true
                    Toast.makeText(
                        this@MainActivity,
                        "処理に失敗しました: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        videoProcessor.release()
    }
}
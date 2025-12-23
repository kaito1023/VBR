package com.example.videobackgroundremoval.renderer

import android.graphics.SurfaceTexture
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.EGLContext
import android.opengl.EGLDisplay
import android.opengl.EGLSurface
import android.opengl.EGLExt
import android.opengl.GLES20
import android.opengl.GLES30
import android.util.Log
import android.view.Surface
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * OpenGL ESを使用した高速背景置換レンダラー
 *
 * GPU上で直接処理を行うことで高速化:
 * - YUV → RGB 変換
 * - セグメンテーションマスク適用
 * - 背景を白に置換
 */
class BackgroundReplacementRenderer {

    companion object {
        private const val TAG = "BGReplacementRenderer"

        // 頂点シェーダー（フルスクリーンクワッド）
        private const val VERTEX_SHADER = """#version 300 es
layout(location = 0) in vec4 aPosition;
layout(location = 1) in vec2 aTexCoord;
out vec2 vTexCoord;

void main() {
    gl_Position = aPosition;
    vTexCoord = aTexCoord;
}
"""

        // フラグメントシェーダー（YUV→RGB変換、マスク適用、背景置換）
        private const val FRAGMENT_SHADER = """#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 fragColor;

uniform sampler2D uTextureY;
uniform sampler2D uTextureU;
uniform sampler2D uTextureV;
uniform sampler2D uMaskTexture;
uniform vec3 uBackgroundColor;

// YUV → RGB 変換（ITU-R BT.601）
vec3 yuv2rgb(vec3 yuv) {
    vec3 yuvAdjusted = vec3(
        yuv.x - 0.0625,
        yuv.y - 0.5,
        yuv.z - 0.5
    );

    // RGB計算（正しい係数）
    float r = 1.164 * yuvAdjusted.x + 1.596 * yuvAdjusted.z;
    float g = 1.164 * yuvAdjusted.x - 0.392 * yuvAdjusted.y - 0.813 * yuvAdjusted.z;
    float b = 1.164 * yuvAdjusted.x + 2.017 * yuvAdjusted.y;

    return vec3(r, g, b);
}

void main() {
    float y = texture(uTextureY, vTexCoord).r;
    float u = texture(uTextureU, vTexCoord).r;
    float v = texture(uTextureV, vTexCoord).r;

    vec3 rgb = yuv2rgb(vec3(y, u, v));

    // デバッグ: グレースケール
    // rgb = vec3(y, y, y);

    float mask = texture(uMaskTexture, vTexCoord).r;

    // 背景置換: mask=1.0なら元画像、mask=0.0なら白背景
    vec3 finalColor = mix(uBackgroundColor, rgb, mask);
    fragColor = vec4(finalColor, 1.0);
}
"""

        // フルスクリーンクワッドの頂点データ
        private val VERTEX_DATA = floatArrayOf(
            // 位置 (x, y)      テクスチャ座標 (u, v)
            -1.0f, -1.0f,      0.0f, 1.0f,  // 左下
             1.0f, -1.0f,      1.0f, 1.0f,  // 右下
            -1.0f,  1.0f,      0.0f, 0.0f,  // 左上
             1.0f,  1.0f,      1.0f, 0.0f   // 右上
        )
    }

    private var eglDisplay: EGLDisplay = EGL14.EGL_NO_DISPLAY
    private var eglContext: EGLContext = EGL14.EGL_NO_CONTEXT
    private var eglSurface: EGLSurface = EGL14.EGL_NO_SURFACE

    private var program: Int = 0
    private var vertexBuffer: FloatBuffer

    private var textureY: Int = 0
    private var textureU: Int = 0
    private var textureV: Int = 0
    private var textureMask: Int = 0

    private var width: Int = 0
    private var height: Int = 0

    init {
        // 頂点バッファを準備
        vertexBuffer = ByteBuffer.allocateDirect(VERTEX_DATA.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(VERTEX_DATA)
        vertexBuffer.position(0)
    }

    /**
     * OpenGL ESコンテキストとサーフェスを初期化
     */
    fun initialize(width: Int, height: Int, outputSurface: Surface) {
        Log.d(TAG, "=== Initializing OpenGL ES Renderer ===")
        Log.d(TAG, "Size: ${width}x${height}")
        Log.d(TAG, "Thread: ${Thread.currentThread().name}")

        this.width = width
        this.height = height

        // EGLディスプレイを取得
        eglDisplay = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
        if (eglDisplay == EGL14.EGL_NO_DISPLAY) {
            Log.e(TAG, "eglGetDisplay failed!")
            throw RuntimeException("eglGetDisplay failed")
        }
        Log.d(TAG, "EGL Display acquired: $eglDisplay")

        // EGL初期化
        val version = IntArray(2)
        if (!EGL14.eglInitialize(eglDisplay, version, 0, version, 1)) {
            throw RuntimeException("eglInitialize failed")
        }

        // EGLコンフィグを選択
        val configAttribs = intArrayOf(
            EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
            EGL14.EGL_RED_SIZE, 8,
            EGL14.EGL_GREEN_SIZE, 8,
            EGL14.EGL_BLUE_SIZE, 8,
            EGL14.EGL_ALPHA_SIZE, 8,
            EGL14.EGL_NONE
        )

        val configs = arrayOfNulls<EGLConfig>(1)
        val numConfigs = IntArray(1)
        if (!EGL14.eglChooseConfig(eglDisplay, configAttribs, 0, configs, 0, 1, numConfigs, 0)) {
            throw RuntimeException("eglChooseConfig failed")
        }

        // EGLコンテキストを作成
        val contextAttribs = intArrayOf(
            EGL14.EGL_CONTEXT_CLIENT_VERSION, 3,
            EGL14.EGL_NONE
        )
        eglContext = EGL14.eglCreateContext(eglDisplay, configs[0], EGL14.EGL_NO_CONTEXT, contextAttribs, 0)
        if (eglContext == EGL14.EGL_NO_CONTEXT) {
            Log.e(TAG, "eglCreateContext failed!")
            throw RuntimeException("eglCreateContext failed")
        }
        Log.d(TAG, "EGL Context created: $eglContext")

        // EGLサーフェスを作成
        val surfaceAttribs = intArrayOf(EGL14.EGL_NONE)
        eglSurface = EGL14.eglCreateWindowSurface(eglDisplay, configs[0], outputSurface, surfaceAttribs, 0)
        if (eglSurface == EGL14.EGL_NO_SURFACE) {
            throw RuntimeException("eglCreateWindowSurface failed")
        }

        // コンテキストをカレントに設定
        if (!EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)) {
            throw RuntimeException("eglMakeCurrent failed")
        }

        // OpenGL ESを初期化
        initGL()

        Log.d(TAG, "OpenGL ES initialized: ${width}x${height}")
    }

    /**
     * OpenGL ESプログラムとテクスチャを初期化
     */
    private fun initGL() {
        // シェーダーをコンパイル
        val vertexShader = compileShader(GLES30.GL_VERTEX_SHADER, VERTEX_SHADER)
        val fragmentShader = compileShader(GLES30.GL_FRAGMENT_SHADER, FRAGMENT_SHADER)

        // プログラムをリンク
        program = GLES30.glCreateProgram()
        GLES30.glAttachShader(program, vertexShader)
        GLES30.glAttachShader(program, fragmentShader)
        GLES30.glLinkProgram(program)

        val linkStatus = IntArray(1)
        GLES30.glGetProgramiv(program, GLES30.GL_LINK_STATUS, linkStatus, 0)
        if (linkStatus[0] != GLES30.GL_TRUE) {
            val error = GLES30.glGetProgramInfoLog(program)
            GLES30.glDeleteProgram(program)
            throw RuntimeException("Program link failed: $error")
        }

        // テクスチャを作成
        val textures = IntArray(4)
        GLES30.glGenTextures(4, textures, 0)

        textureY = textures[0]
        textureU = textures[1]
        textureV = textures[2]
        textureMask = textures[3]

        // テクスチャパラメータを設定
        for (texture in textures) {
            GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, texture)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)
        }

        checkGLError("initGL")
    }

    /**
     * シェーダーをコンパイル
     */
    private fun compileShader(type: Int, source: String): Int {
        val shader = GLES30.glCreateShader(type)
        GLES30.glShaderSource(shader, source)
        GLES30.glCompileShader(shader)

        val compileStatus = IntArray(1)
        GLES30.glGetShaderiv(shader, GLES30.GL_COMPILE_STATUS, compileStatus, 0)
        if (compileStatus[0] != GLES30.GL_TRUE) {
            val error = GLES30.glGetShaderInfoLog(shader)
            GLES30.glDeleteShader(shader)
            throw RuntimeException("Shader compilation failed: $error")
        }

        return shader
    }

    /**
     * フレームをレンダリング
     *
     * @param yData Y平面データ
     * @param uData U平面データ
     * @param vData V平面データ
     * @param maskData セグメンテーションマスク（0.0-1.0のfloat配列）
     * @param maskWidth マスクの幅（257など、フレームサイズと異なる可能性あり）
     * @param maskHeight マスクの高さ（257など、フレームサイズと異なる可能性あり）
     * @param presentationTimeUs プレゼンテーションタイムスタンプ（マイクロ秒）
     */
    fun renderFrame(
        yData: ByteArray,
        uData: ByteArray,
        vData: ByteArray,
        maskData: FloatArray,
        maskWidth: Int,
        maskHeight: Int,
        presentationTimeUs: Long
    ) {
        // コンテキストをカレントに設定
        if (!EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)) {
            val error = EGL14.eglGetError()
            Log.e(TAG, "eglMakeCurrent failed! Error: 0x${Integer.toHexString(error)}")
            Log.e(TAG, "  eglDisplay: $eglDisplay")
            Log.e(TAG, "  eglSurface: $eglSurface")
            Log.e(TAG, "  eglContext: $eglContext")
            Log.e(TAG, "  Thread: ${Thread.currentThread().name}")
            throw RuntimeException("eglMakeCurrent failed with error 0x${Integer.toHexString(error)}")
        }

        // タイムスタンプを設定（MediaCodec Surfaceモード用）
        EGLExt.eglPresentationTimeANDROID(eglDisplay, eglSurface, presentationTimeUs * 1000)

        // Yテクスチャをアップロード（ダイレクトバッファを使用）
        GLES30.glActiveTexture(GLES30.GL_TEXTURE0)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureY)
        val yBuffer = ByteBuffer.allocateDirect(yData.size)
            .order(ByteOrder.nativeOrder())
            .put(yData)
        yBuffer.position(0)
        GLES30.glTexImage2D(GLES30.GL_TEXTURE_2D, 0, GLES30.GL_R8, width, height, 0,
            GLES30.GL_RED, GLES30.GL_UNSIGNED_BYTE, yBuffer)

        // Uテクスチャをアップロード（ダイレクトバッファを使用）
        val uvWidth = width / 2
        val uvHeight = height / 2
        GLES30.glActiveTexture(GLES30.GL_TEXTURE1)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureU)
        val uBuffer = ByteBuffer.allocateDirect(uData.size)
            .order(ByteOrder.nativeOrder())
            .put(uData)
        uBuffer.position(0)
        GLES30.glTexImage2D(GLES30.GL_TEXTURE_2D, 0, GLES30.GL_R8, uvWidth, uvHeight, 0,
            GLES30.GL_RED, GLES30.GL_UNSIGNED_BYTE, uBuffer)

        // Vテクスチャをアップロード（ダイレクトバッファを使用）
        GLES30.glActiveTexture(GLES30.GL_TEXTURE2)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureV)
        val vBuffer = ByteBuffer.allocateDirect(vData.size)
            .order(ByteOrder.nativeOrder())
            .put(vData)
        vBuffer.position(0)
        GLES30.glTexImage2D(GLES30.GL_TEXTURE_2D, 0, GLES30.GL_R8, uvWidth, uvHeight, 0,
            GLES30.GL_RED, GLES30.GL_UNSIGNED_BYTE, vBuffer)

        // マスクテクスチャをアップロード（オリジナルサイズ: 257x257など）
        // GPU側のGL_LINEARフィルタリングが自動的に1920x1080へリサイズ
        GLES30.glActiveTexture(GLES30.GL_TEXTURE3)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureMask)
        val maskBuffer = ByteBuffer.allocateDirect(maskData.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(maskData)
        maskBuffer.position(0)
        GLES30.glTexImage2D(GLES30.GL_TEXTURE_2D, 0, GLES30.GL_R32F, maskWidth, maskHeight, 0,
            GLES30.GL_RED, GLES30.GL_FLOAT, maskBuffer)

        // プログラムを使用
        GLES30.glUseProgram(program)

        // ユニフォームを設定
        val locY = GLES30.glGetUniformLocation(program, "uTextureY")
        val locU = GLES30.glGetUniformLocation(program, "uTextureU")
        val locV = GLES30.glGetUniformLocation(program, "uTextureV")
        val locMask = GLES30.glGetUniformLocation(program, "uMaskTexture")
        val locBgColor = GLES30.glGetUniformLocation(program, "uBackgroundColor")

        GLES30.glUniform1i(locY, 0)
        GLES30.glUniform1i(locU, 1)
        GLES30.glUniform1i(locV, 2)
        GLES30.glUniform1i(locMask, 3)
        GLES30.glUniform3f(locBgColor, 1.0f, 1.0f, 1.0f)  // 白背景

        // ビューポート設定
        GLES30.glViewport(0, 0, width, height)
        GLES30.glClearColor(0.0f, 0.0f, 0.0f, 1.0f)
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT)

        // 頂点属性を設定
        vertexBuffer.position(0)
        GLES30.glVertexAttribPointer(0, 2, GLES30.GL_FLOAT, false, 16, vertexBuffer)
        GLES30.glEnableVertexAttribArray(0)

        vertexBuffer.position(2)
        GLES30.glVertexAttribPointer(1, 2, GLES30.GL_FLOAT, false, 16, vertexBuffer)
        GLES30.glEnableVertexAttribArray(1)

        // 描画
        GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, 4)

        // 画面に反映
        if (!EGL14.eglSwapBuffers(eglDisplay, eglSurface)) {
            Log.e(TAG, "eglSwapBuffers failed")
        }

        checkGLError("renderFrame")
    }

    /**
     * OpenGLエラーをチェック
     */
    private fun checkGLError(op: String) {
        val error = GLES30.glGetError()
        if (error != GLES30.GL_NO_ERROR) {
            Log.e(TAG, "GL error after $op: 0x${Integer.toHexString(error)}")
            throw RuntimeException("GL error after $op: 0x${Integer.toHexString(error)}")
        }
    }

    /**
     * リソースを解放
     */
    fun release() {
        if (eglDisplay != EGL14.EGL_NO_DISPLAY) {
            EGL14.eglMakeCurrent(eglDisplay, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)

            if (eglSurface != EGL14.EGL_NO_SURFACE) {
                EGL14.eglDestroySurface(eglDisplay, eglSurface)
                eglSurface = EGL14.EGL_NO_SURFACE
            }

            if (eglContext != EGL14.EGL_NO_CONTEXT) {
                EGL14.eglDestroyContext(eglDisplay, eglContext)
                eglContext = EGL14.EGL_NO_CONTEXT
            }

            EGL14.eglTerminate(eglDisplay)
            eglDisplay = EGL14.EGL_NO_DISPLAY
        }

        // OpenGLリソースを解放
        if (program != 0) {
            GLES30.glDeleteProgram(program)
            program = 0
        }

        val textures = intArrayOf(textureY, textureU, textureV, textureMask)
        GLES30.glDeleteTextures(4, textures, 0)

        Log.d(TAG, "Resources released")
    }
}

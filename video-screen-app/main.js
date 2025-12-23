const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ポート設定
const HTTP_PORT = 3000;
const WEBSOCKET_PORT = 3001;

let mainWindow;
let io;

// アップロードディレクトリの設定
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer設定（ファイルアップロード処理）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `video_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB制限（デモ撮影用）
});

// ローカルIPアドレス取得
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4で、内部アドレスでないものを取得
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Electronウィンドウ作成
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#000000'
  });

  mainWindow.loadFile('index.html');

  // 開発中はDevToolsを開く
  if (process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }

  // IPアドレスをレンダラープロセスに送信
  mainWindow.webContents.on('did-finish-load', () => {
    const ipAddress = getLocalIPAddress();
    mainWindow.webContents.send('server-info', {
      ip: ipAddress,
      httpPort: HTTP_PORT,
      wsPort: WEBSOCKET_PORT
    });
    console.log(`Server Info - HTTP: ${ipAddress}:${HTTP_PORT}, WebSocket: ${ipAddress}:${WEBSOCKET_PORT}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// HTTPサーバー設定
function setupHTTPServer() {
  const expressApp = express();

  // CORS有効化
  expressApp.use(cors());
  expressApp.use(express.json());

  // 動画アップロードエンドポイント
  expressApp.post('/upload-video', upload.single('video'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No video file provided' });
      }

      const videoId = path.basename(req.file.filename, path.extname(req.file.filename));
      const videoPath = req.file.path;

      console.log(`Video received: ${req.file.filename} (${req.file.size} bytes)`);

      // レンダラープロセスに動画パスを送信
      if (mainWindow) {
        mainWindow.webContents.send('video-received', {
          videoId: videoId,
          videoPath: videoPath,
          filename: req.file.filename
        });
      }

      res.json({
        success: true,
        videoId: videoId,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 動画ファイル配信（静的ファイル）
  expressApp.use('/videos', express.static(uploadsDir));

  // ヘルスチェック
  expressApp.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  expressApp.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on port ${HTTP_PORT}`);
  });
}

// WebSocketサーバー設定
function setupWebSocketServer() {
  const httpServer = http.createServer();
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 再生コマンド
    socket.on('play', () => {
      console.log('Play command received');
      if (mainWindow) {
        mainWindow.webContents.send('video-control', { action: 'play' });
      }
    });

    // 一時停止コマンド
    socket.on('pause', () => {
      console.log('Pause command received');
      if (mainWindow) {
        mainWindow.webContents.send('video-control', { action: 'pause' });
      }
    });

    // 停止コマンド
    socket.on('stop', () => {
      console.log('Stop command received');
      if (mainWindow) {
        mainWindow.webContents.send('video-control', { action: 'stop' });
      }
    });

    // シークコマンド
    socket.on('seek', (data) => {
      console.log('Seek command received:', data.time);
      if (mainWindow) {
        mainWindow.webContents.send('video-control', {
          action: 'seek',
          time: data.time
        });
      }
    });

    // 切断
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(WEBSOCKET_PORT, () => {
    console.log(`WebSocket Server running on port ${WEBSOCKET_PORT}`);
  });
}

// アプリ起動時
app.whenReady().then(() => {
  createWindow();
  setupHTTPServer();
  setupWebSocketServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 全ウィンドウが閉じられたとき
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリ終了時のクリーンアップ
app.on('will-quit', () => {
  if (io) {
    io.close();
  }
});

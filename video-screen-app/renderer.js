const { ipcRenderer } = require('electron');

// DOM要素の取得
const videoPlayer = document.getElementById('video-player');
const waitingMessage = document.getElementById('waiting-message');
const videoInfo = document.getElementById('video-info');
const ipAddressEl = document.getElementById('ip-address');
const httpPortEl = document.getElementById('http-port');
const wsPortEl = document.getElementById('ws-port');
const videoFilenameEl = document.getElementById('video-filename');

// サーバー情報の受信
ipcRenderer.on('server-info', (event, data) => {
  console.log('Server info received:', data);

  ipAddressEl.textContent = data.ip;
  httpPortEl.textContent = data.httpPort;
  wsPortEl.textContent = data.wsPort;

  // 接続URLをコンソールに表示
  console.log('='.repeat(60));
  console.log('📱 スマホアプリから以下のURLに接続してください:');
  console.log(`HTTP: http://${data.ip}:${data.httpPort}`);
  console.log(`WebSocket: http://${data.ip}:${data.wsPort}`);
  console.log('='.repeat(60));
});

// 動画受信時の処理
ipcRenderer.on('video-received', (event, data) => {
  console.log('Video received:', data);

  // 動画ファイルのパスを設定
  const videoPath = `file://${data.videoPath}`;
  videoPlayer.src = videoPath;

  // 待機メッセージを非表示
  waitingMessage.classList.add('hidden');

  // 動画情報を表示
  videoFilenameEl.textContent = data.filename;
  videoInfo.classList.add('show');

  // コントロールボタンを表示
  document.getElementById('controls').classList.remove('hidden');

  console.log('Video loaded successfully');
});

// 動画制御コマンドの受信
ipcRenderer.on('video-control', (event, data) => {
  console.log('Video control received:', data);

  switch (data.action) {
    case 'play':
      videoPlayer.play()
        .then(() => console.log('Video playing'))
        .catch(err => console.error('Play error:', err));
      break;

    case 'pause':
      videoPlayer.pause();
      console.log('Video paused');
      break;

    case 'stop':
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
      console.log('Video stopped');
      break;

    case 'seek':
      if (data.time !== undefined) {
        videoPlayer.currentTime = data.time;
        console.log(`Seeked to ${data.time}s`);
      }
      break;

    default:
      console.warn('Unknown control action:', data.action);
  }
});

// 動画プレイヤーのイベントリスナー
videoPlayer.addEventListener('play', () => {
  console.log('Video started playing');
});

videoPlayer.addEventListener('pause', () => {
  console.log('Video paused');
});

videoPlayer.addEventListener('ended', () => {
  console.log('Video ended');
});

videoPlayer.addEventListener('error', (e) => {
  console.error('Video error:', e);
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ':
      e.preventDefault();
      if (videoPlayer.paused) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
      break;

    case 'f':
    case 'F':
      // フルスクリーン切り替え
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      break;

    case 'Escape':
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      break;

    case 'ArrowLeft':
      // 5秒巻き戻し
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 5);
      break;

    case 'ArrowRight':
      // 5秒早送り
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 5);
      break;
  }
});

console.log('Renderer process initialized');

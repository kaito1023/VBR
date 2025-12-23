import { io } from 'socket.io-client';

const WEBSOCKET_PORT = 3001;

class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connectionChangeCallbacks = [];
  }

  /**
   * WebSocketサーバーに接続
   * @param {string} ip - 接続先IPアドレス
   * @returns {Promise<boolean>} 接続成功の場合true
   */
  connect(ip) {
    return new Promise((resolve, reject) => {
      try {
        // 既存の接続があれば切断
        if (this.socket) {
          this.disconnect();
        }

        const url = `http://${ip}:${WEBSOCKET_PORT}`;
        console.log('Connecting to WebSocket:', url);

        this.socket = io(url, {
          transports: ['websocket'],
          reconnection: Boolean(true),
          reconnectionAttempts: Number(3),
          reconnectionDelay: Number(1000),
          timeout: Number(10000)
        });

        // 接続成功
        this.socket.on('connect', () => {
          console.log('WebSocket connected:', this.socket.id);
          this.connected = true;
          this.notifyConnectionChange(true);
          resolve(true);
        });

        // 接続エラー
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error.message);
          this.connected = false;
          this.notifyConnectionChange(false);
          reject(new Error('WebSocket接続に失敗しました'));
        });

        // 切断
        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.connected = false;
          this.notifyConnectionChange(false);
        });

        // 再接続成功
        this.socket.on('reconnect', (attemptNumber) => {
          console.log('WebSocket reconnected after', attemptNumber, 'attempts');
          this.connected = true;
          this.notifyConnectionChange(true);
        });

        // 再接続失敗
        this.socket.on('reconnect_failed', () => {
          console.error('WebSocket reconnection failed');
          this.connected = false;
          this.notifyConnectionChange(false);
        });

      } catch (error) {
        console.error('Socket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * WebSocket切断
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.notifyConnectionChange(false);
    }
  }

  /**
   * 再生イベント送信
   */
  emitPlay() {
    if (this.socket && this.connected) {
      console.log('Emitting play event');
      this.socket.emit('play');
    } else {
      console.warn('Socket not connected, cannot emit play');
    }
  }

  /**
   * 一時停止イベント送信
   */
  emitPause() {
    if (this.socket && this.connected) {
      console.log('Emitting pause event');
      this.socket.emit('pause');
    } else {
      console.warn('Socket not connected, cannot emit pause');
    }
  }

  /**
   * 停止イベント送信
   */
  emitStop() {
    if (this.socket && this.connected) {
      console.log('Emitting stop event');
      this.socket.emit('stop');
    } else {
      console.warn('Socket not connected, cannot emit stop');
    }
  }

  /**
   * シークイベント送信
   * @param {number} time - シーク先の秒数
   */
  emitSeek(time) {
    if (this.socket && this.connected) {
      console.log('Emitting seek event:', time);
      this.socket.emit('seek', { time });
    } else {
      console.warn('Socket not connected, cannot emit seek');
    }
  }

  /**
   * 接続状態変更リスナー登録
   * @param {Function} callback - 接続状態変更時のコールバック (connected: boolean)
   */
  onConnectionChange(callback) {
    this.connectionChangeCallbacks.push(callback);
  }

  /**
   * 接続状態変更リスナー解除
   * @param {Function} callback - 解除するコールバック
   */
  offConnectionChange(callback) {
    this.connectionChangeCallbacks = this.connectionChangeCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * 接続状態変更通知
   * @param {boolean} connected - 接続状態
   */
  notifyConnectionChange(connected) {
    this.connectionChangeCallbacks.forEach(callback => {
      callback(connected);
    });
  }

  /**
   * 接続状態を取得
   * @returns {boolean} 接続中の場合true
   */
  isConnected() {
    return this.connected;
  }
}

// シングルトンインスタンスをエクスポート
export default new SocketManager();

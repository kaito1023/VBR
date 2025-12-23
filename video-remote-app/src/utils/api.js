import axios from 'axios';

const HTTP_PORT = 3000;
const TIMEOUT = 300000; // 5分

/**
 * HTTPサーバーへの疎通確認
 * @param {string} ip - 接続先IPアドレス
 * @returns {Promise<boolean>} 接続成功の場合true
 */
export const testConnection = async (ip) => {
  try {
    const response = await axios.get(`http://${ip}:${HTTP_PORT}/health`, {
      timeout: 5000
    });

    return response.data.status === 'ok';
  } catch (error) {
    console.error('Connection test failed:', error.message);
    return false;
  }
};

/**
 * 動画ファイルをアップロード
 * @param {string} ip - 接続先IPアドレス
 * @param {Object} videoFile - 動画ファイル情報
 * @param {Function} onProgress - 進捗コールバック (0-100)
 * @returns {Promise<Object>} アップロード結果
 */
export const uploadVideo = async (ip, videoFile, onProgress) => {
  try {
    const formData = new FormData();

    // React Nativeのファイル形式に対応
    const fileToUpload = {
      uri: videoFile.uri,
      type: videoFile.type || 'video/mp4',
      name: videoFile.name || 'video.mp4'
    };

    formData.append('video', fileToUpload);

    const response = await axios.post(
      `http://${ip}:${HTTP_PORT}/upload-video`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: TIMEOUT,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            if (onProgress) {
              onProgress(percentCompleted);
            }
          }
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Upload failed:', error.message);

    let errorMessage = '動画の送信に失敗しました。';

    if (error.code === 'ECONNABORTED') {
      errorMessage = 'タイムアウトしました。ネットワーク接続を確認してください。';
    } else if (error.response) {
      errorMessage = `サーバーエラー: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'サーバーに接続できません。IPアドレスを確認してください。';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * IPアドレスの形式をバリデーション
 * @param {string} ip - 検証するIPアドレス
 * @returns {boolean} 有効なIPアドレスの場合true
 */
export const validateIP = (ip) => {
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (!ipPattern.test(ip)) {
    return false;
  }

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

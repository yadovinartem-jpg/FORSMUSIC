const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Range', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.options('*', cors());

// Функция получения ссылки с Яндекс.Диска
async function getYandexDiskLink(filename) {
  try {
    const publicKey = process.env.YANDEX_DISK_PUBLIC_KEY;
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${publicKey}&path=/${filename}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000
    });
    
    return response.data.href;
  } catch (error) {
    console.error('Ошибка получения ссылки Яндекс.Диска:', error.message);
    throw error;
  }
}

// Стриминг аудио
app.get('/api/stream/:filename', async (req, res) => {
  const filename = req.params.filename;
  console.log(`🎵 Запрос на стриминг: ${filename}`);
  
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  res.setHeader('Accept-Ranges', 'bytes');
  
  try {
    const downloadUrl = await getYandexDiskLink(filename);
    console.log('🔗 Ссылка на скачивание получена');
    
    const range = req.headers.range;
    const headers = {};
    
    if (range) {
      headers.Range = range;
    }
    
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      headers: headers,
      timeout: 30000
    });
    
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    
    res.status(range ? 206 : 200);
    
    response.data.pipe(res);
    
    req.on('close', () => {
      console.log('📴 Клиент отключился');
      if (response.data && response.data.destroy) {
        response.data.destroy();
      }
    });
    
    response.data.on('error', (error) => {
      if (error.code === 'ECONNRESET') {
        console.log('Соединение сброшено клиентом');
        return;
      }
      console.error('Ошибка потока:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Ошибка стриминга:', error.message);
    
    if (error.code === 'ECONNRESET' || error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      return;
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка стриминга' });
    }
  }
});

// Получение списка треков
app.get('/api/tracks', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Здесь ваш код получения треков
    const tracks = [];
    res.json(tracks);
  } catch (error) {
    console.error('Ошибка получения треков:', error);
    res.status(500).json({ error: 'Ошибка получения треков' });
  }
});

// Тестовый эндпоинт
app.get('/api/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

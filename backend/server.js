require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegStatic);
console.log('✅ FFmpeg initialized');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CORS ==========
app.use(cors({
  origin: 'https://yadovinartem-jpg.github.io',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range']
}));

app.options('*', cors());
app.use(express.json());

// ========== MULTER ==========
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// ========== ЯНДЕКС.ДИСК ==========
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
const YANDEX_API_URL = 'https://cloud-api.yandex.net/v1/disk';

const yandexApi = axios.create({
  baseURL: YANDEX_API_URL,
  headers: { 'Authorization': `OAuth ${YANDEX_TOKEN}` }
});

console.log('✅ Яндекс.Диск инициализирован');

// ========== ФУНКЦИИ ==========
async function getUploadLink(remotePath) {
  const response = await yandexApi.get('/resources/upload', {
    params: { path: remotePath, overwrite: true }
  });
  return response.data.href;
}

async function getDownloadLink(remotePath) {
  const response = await yandexApi.get('/resources/download', {
    params: { path: remotePath }
  });
  return response.data.href;
}

async function getFileInfo(remotePath) {
  const response = await yandexApi.get('/resources', {
    params: { path: remotePath }
  });
  return response.data;
}

async function deleteFile(remotePath) {
  await yandexApi.delete('/resources', {
    params: { path: remotePath, permanently: true }
  });
}

// ========== ЗАГРУЗКА ==========
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const { title, artist } = req.body;
    const remotePath = `/forsity-music/${uuidv4()}-${title || 'untitled'}.opus`;
    
    const uploadUrl = await getUploadLink(remotePath);
    await axios.put(uploadUrl, req.file.buffer, {
      headers: { 'Content-Type': 'audio/opus' }
    });
    
    res.json({
      success: true,
      file: { path: remotePath, title, artist }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== СТРИМИНГ (СПЕЦИАЛЬНО ДЛЯ ТВОЕЙ ПРОБЛЕМЫ) ==========
app.get('/api/stream/:path(*)', async (req, res) => {
  try {
    const remotePath = decodeURIComponent(req.params.path);
    console.log('🎵 Стриминг:', remotePath);
    
    // Получаем ссылку на скачивание
    const downloadUrl = await getDownloadLink(remotePath);
    
    // Получаем информацию о файле для MIME-типа
    const fileInfo = await getFileInfo(remotePath);
    const mimeType = fileInfo.mime_type || 'audio/opus';
    
    // Важно! Заголовки для правильного стриминга
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', 'https://yadovinartem-jpg.github.io');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Делаем запрос к Яндекс.Диску
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 60000
    });
    
    // Если есть Content-Length, передаём его
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    // Включаем поддержку докачки
    let stream = response.data;
    
    // Отправляем данные клиенту
    stream.pipe(res);
    
    // Обработка ошибок без паники
    stream.on('error', (err) => {
      console.log('⚠️ Ошибка потока (игнорируем):', err.code);
    });
    
    // Когда клиент закрыл соединение
    req.on('close', () => {
      stream.destroy();
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
});

app.delete('/api/track/:path(*)', async (req, res) => {
  try {
    await deleteFile(decodeURIComponent(req.params.path));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер на порту ${PORT}`);
});

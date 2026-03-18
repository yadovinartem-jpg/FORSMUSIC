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

// Настройка ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);
console.log('✅ FFmpeg initialized');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CORS ==========
const allowedOrigins = [
  'https://yadovinartem-jpg.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges']
}));

app.options('*', cors());
app.use(express.json());

// ========== ДОПОЛНИТЕЛЬНЫЕ CORS-ЗАГОЛОВКИ ==========
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://yadovinartem-jpg.github.io');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  next();
});

// ========== MULTER ==========
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ========== ЯНДЕКС.ДИСК ==========
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
const YANDEX_API_URL = 'https://cloud-api.yandex.net/v1/disk';

const yandexApi = axios.create({
  baseURL: YANDEX_API_URL,
  headers: {
    'Authorization': `OAuth ${YANDEX_TOKEN}`
  }
});

console.log('✅ Яндекс.Диск инициализирован');

// ========== ФУНКЦИИ ==========
async function getUploadLink(remotePath) {
  const response = await yandexApi.get('/resources/upload', {
    params: { path: remotePath, overwrite: true }
  });
  return response.data.href;
}

async function uploadFile(uploadUrl, fileBuffer) {
  await axios.put(uploadUrl, fileBuffer, {
    headers: { 'Content-Type': 'audio/opus' }
  });
  console.log('✅ Файл загружен на Яндекс.Диск');
}

async function publishFile(remotePath) {
  await yandexApi.put('/resources/publish', null, {
    params: { path: remotePath }
  });
  console.log('✅ Файл опубликован');
}

async function getFileInfo(remotePath) {
  try {
    const response = await yandexApi.get('/resources', {
      params: { path: remotePath }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка получения информации о файле:', error.response?.data || error.message);
    throw error;
  }
}

async function deleteFile(remotePath) {
  await yandexApi.delete('/resources', {
    params: { path: remotePath, permanently: true }
  });
  console.log('✅ Файл удалён с Яндекс.Диска');
}

async function getDownloadLink(remotePath) {
  try {
    const response = await yandexApi.get('/resources/download', {
      params: { path: remotePath }
    });
    return response.data.href;
  } catch (error) {
    console.error('❌ Ошибка получения ссылки на скачивание:', error.response?.data || error.message);
    throw error;
  }
}

async function uploadToYandex(fileBuffer, fileName) {
  console.log('☁️ Загрузка на Яндекс.Диск...');
  
  const remotePath = `/forsity-music/${uuidv4()}-${fileName}`;
  
  const uploadUrl = await getUploadLink(remotePath);
  await uploadFile(uploadUrl, fileBuffer);
  await publishFile(remotePath);
  const fileInfo = await getFileInfo(remotePath);
  
  return {
    path: remotePath,
    publicUrl: fileInfo.public_url,
    name: fileInfo.name,
    size: fileInfo.size
  };
}

function compressAudio(inputBuffer, inputFormat) {
  return new Promise((resolve, reject) => {
    console.log('🔄 Сжатие аудио...');
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const inputPath = path.join(tempDir, `${uuidv4()}.${inputFormat}`);
    const outputPath = path.join(tempDir, `${uuidv4()}.opus`);
    
    fs.writeFileSync(inputPath, inputBuffer);
    
    ffmpeg(inputPath)
      .audioCodec('libopus')
      .audioBitrate(128)
      .audioChannels(2)
      .audioFrequency(48000)
      .output(outputPath)
      .on('end', () => {
        const compressedBuffer = fs.readFileSync(outputPath);
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        console.log(`✅ Сжато: ${inputBuffer.length} → ${compressedBuffer.length} байт`);
        resolve(compressedBuffer);
      })
      .on('error', (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .run();
  });
}

// ========== ЭНДПОЙНТЫ ==========
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  console.log('📥 Получен запрос на загрузку');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { title, artist } = req.body;
    const inputFormat = req.file.originalname.split('.').pop().toLowerCase();

    const compressedBuffer = await compressAudio(req.file.buffer, inputFormat);

    const fileName = `${title || 'untitled'} - ${artist || 'unknown'}.opus`
      .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
      .substring(0, 100);

    const yandexFile = await uploadToYandex(compressedBuffer, fileName);

    res.json({
      success: true,
      file: {
        path: yandexFile.path,
        title: title || req.file.originalname,
        artist: artist || 'Unknown',
        format: 'opus',
        size: yandexFile.size
      }
    });
    
    console.log('✅ Загрузка завершена, путь:', yandexFile.path);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

// ========== УЛУЧШЕННЫЙ СТРИМИНГ С ОБРАБОТКОЙ ОШИБОК ==========
app.get('/api/stream/:path(*)', async (req, res) => {
  let controller;
  
  try {
    const remotePath = decodeURIComponent(req.params.path);
    console.log('🎵 Запрос на стриминг пути:', remotePath);
    
    // Проверяем, есть ли файл
    let fileInfo;
    try {
      fileInfo = await getFileInfo(remotePath);
      console.log('📁 Файл найден на Яндекс.Диске:', fileInfo.name, 'размер:', fileInfo.size);
    } catch (error) {
      console.error('❌ Файл не найден на Яндекс.Диске:', error.response?.data || error.message);
      return res.status(404).json({ error: 'File not found on Yandex.Disk' });
    }
    
    const downloadUrl = await getDownloadLink(remotePath);
    console.log('🔗 Ссылка на скачивание получена');
    
    let mimeType = fileInfo.mime_type || 'audio/opus';
    
    // Устанавливаем заголовки
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', 'https://yadovinartem-jpg.github.io');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Создаем контроллер для отмены запроса при необходимости
    controller = new AbortController();
    
    // Увеличиваем таймаут до 60 секунд
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 60000, // Увеличили с 30000 до 60000
      signal: controller.signal,
      headers: {
        'User-Agent': 'ForsityMusic/1.0',
        'Range': req.headers.range || ''
      }
    });
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    
    // Обработка ошибок потока
    response.data.on('error', (err) => {
      console.error('❌ Ошибка потока данных от Яндекс.Диска:', err.message);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    
    // Если клиент закрыл соединение, отменяем запрос к Яндекс.Диску
    req.on('close', () => {
      console.log('👋 Клиент закрыл соединение');
      if (controller) {
        controller.abort();
      }
    });
    
    // Передаём поток клиенту
    response.data.pipe(res);
    
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
      console.log('⚠️ Соединение сброшено (нормальная ситуация при стриминге)');
    } else if (error.name === 'AbortError') {
      console.log('⏸️ Запрос отменён');
    } else {
      console.error('❌ Ошибка стриминга:', error.message);
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming failed' });
    }
  }
});

// Обработка preflight OPTIONS запросов для стриминга
app.options('/api/stream/:path(*)', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://yadovinartem-jpg.github.io');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// ========== ПРОВЕРКА ФАЙЛА (ДЛЯ ОТЛАДКИ) ==========
app.get('/api/check/:path(*)', async (req, res) => {
  try {
    const remotePath = decodeURIComponent(req.params.path);
    console.log('🔍 Проверка файла:', remotePath);
    
    try {
      const fileInfo = await getFileInfo(remotePath);
      res.json({
        exists: true,
        path: remotePath,
        name: fileInfo.name,
        public_url: fileInfo.public_url,
        mime_type: fileInfo.mime_type,
        size: fileInfo.size
      });
    } catch (error) {
      res.json({
        exists: false,
        path: remotePath,
        error: error.response?.data?.message || error.message
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Check failed', details: error.message });
  }
});

// ========== УДАЛЕНИЕ ==========
app.delete('/api/track/:path(*)', async (req, res) => {
  try {
    const remotePath = decodeURIComponent(req.params.path);
    await deleteFile(remotePath);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    storage: 'yandex-disk',
    timestamp: new Date().toISOString()
  });
});

// ========== ЗАПУСК ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

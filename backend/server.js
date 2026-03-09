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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

// ========== MULTER ==========
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// ========== ЯНДЕКС.ДИСК С ВАШИМ ТОКЕНОМ ==========
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
const YANDEX_API_URL = 'https://cloud-api.yandex.net/v1/disk';

const yandexApi = axios.create({
  baseURL: YANDEX_API_URL,
  headers: {
    'Authorization': `OAuth ${YANDEX_TOKEN}`
  }
});

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
  const response = await yandexApi.get('/resources', {
    params: { path: remotePath }
  });
  return response.data;
}

async function deleteFile(remotePath) {
  await yandexApi.delete('/resources', {
    params: { path: remotePath, permanently: true }
  });
  console.log('✅ Файл удалён с Яндекс.Диска');
}

function convertToDirectLink(publicUrl) {
  return `https://getfile.dokpub.com/yandex/get/${publicUrl}`;
}

async function uploadToYandex(fileBuffer, fileName) {
  console.log('☁️ Загрузка на Яндекс.Диск...');
  
  const remotePath = `/forsity-music/${uuidv4()}-${fileName}`;
  
  const uploadUrl = await getUploadLink(remotePath);
  await uploadFile(uploadUrl, fileBuffer);
  await publishFile(remotePath);
  const fileInfo = await getFileInfo(remotePath);
  const directUrl = convertToDirectLink(fileInfo.public_url);
  
  return {
    path: remotePath,
    publicUrl: fileInfo.public_url,
    directUrl: directUrl,
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
        url: yandexFile.directUrl,
        path: yandexFile.path,
        title: title || req.file.originalname,
        artist: artist || 'Unknown',
        format: 'opus'
      }
    });
    
    console.log('✅ Загрузка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка загрузки:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    storage: 'yandex-disk',
    token: YANDEX_TOKEN ? 'configured' : 'missing'
  });
});

// ========== ЗАПУСК ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌍 Public URL: https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`);
});

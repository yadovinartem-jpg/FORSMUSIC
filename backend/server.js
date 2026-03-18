const express = require('express');
const cors = require('cors');
const axios = require('axios');
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
app.options('*', cors());

// ========== ЯНДЕКС.ДИСК С ТОКЕНОМ ==========
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
const YANDEX_API_URL = 'https://cloud-api.yandex.net/v1/disk';

const yandexApi = axios.create({
  baseURL: YANDEX_API_URL,
  headers: {
    'Authorization': `OAuth ${YANDEX_TOKEN}`
  }
});

console.log('✅ Яндекс.Диск инициализирован с токеном');

// ========== ФУНКЦИИ ==========
async function getDownloadLink(remotePath) {
  try {
    const response = await yandexApi.get('/resources/download', {
      params: { path: remotePath }
    });
    return response.data.href;
  } catch (error) {
    console.error('❌ Ошибка получения ссылки:', error.response?.data || error.message);
    throw error;
  }
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

// ========== СТРИМИНГ ==========
app.get('/api/stream/:path(*)', async (req, res) => {
  const remotePath = decodeURIComponent(req.params.path);
  console.log(`\n🎵 Запрос на стриминг: ${remotePath}`);
  
  try {
    // Получаем информацию о файле
    const fileInfo = await getFileInfo(remotePath);
    console.log('✅ Файл найден:', fileInfo.name);
    console.log('📏 Размер:', fileInfo.size, 'байт');
    
    // Получаем ссылку на скачивание
    const downloadUrl = await getDownloadLink(remotePath);
    console.log('🔗 Ссылка получена');
    
    // Определяем MIME-тип
    const mimeType = fileInfo.mime_type || 'audio/opus';
    console.log('🎵 MIME-тип:', mimeType);
    
    // Заголовки для стриминга
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    // Обрабатываем Range запрос (для перемотки)
    const range = req.headers.range;
    const headers = {};
    if (range) {
      headers.Range = range;
      console.log('📌 Range:', range);
    }
    
    // Запрашиваем файл с Яндекс.Диска
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      headers: headers,
      timeout: 30000
    });
    
    // Передаём заголовки от Яндекса
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    
    // Устанавливаем статус (206 для частичного контента)
    res.status(range ? 206 : 200);
    
    // Считаем отправленные байты
    let bytesSent = 0;
    response.data.on('data', (chunk) => {
      bytesSent += chunk.length;
      console.log(`📤 Отправлено ${bytesSent} байт`);
    });
    
    // Отправляем поток клиенту
    response.data.pipe(res);
    
    // Обработка отключения клиента
    req.on('close', () => {
      console.log(`📴 Клиент отключился, отправлено ${bytesSent} байт`);
      if (response.data && response.data.destroy) {
        response.data.destroy();
      }
    });
    
    response.data.on('error', (error) => {
      if (error.code === 'ECONNRESET') {
        console.log('⚠️ Соединение сброшено (нормально)');
        return;
      }
      console.error('❌ Ошибка потока:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Ошибка стриминга:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка стриминга' });
    }
  }
});

// ========== ПРОВЕРКА ФАЙЛА ==========
app.get('/api/check/:path(*)', async (req, res) => {
  const remotePath = decodeURIComponent(req.params.path);
  
  try {
    const fileInfo = await getFileInfo(remotePath);
    res.json({
      exists: true,
      name: fileInfo.name,
      size: fileInfo.size,
      mime_type: fileInfo.mime_type,
      path: remotePath
    });
  } catch (error) {
    res.json({
      exists: false,
      path: remotePath,
      error: error.message
    });
  }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    storage: 'yandex-disk',
    token: YANDEX_TOKEN ? 'установлен' : 'не установлен',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🔑 Токен: ${YANDEX_TOKEN ? 'установлен' : 'ОТСУТСТВУЕТ!'}`);
});

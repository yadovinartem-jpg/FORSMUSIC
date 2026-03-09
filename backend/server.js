require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');

// Настройка ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());

// Настройка multer для временного хранения в памяти
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB лимит
});

// ========== GOOGLE DRIVE НАСТРОЙКА ==========
let drive;

async function initializeGoogleDrive() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const authClient = await auth.getClient();
    drive = google.drive({ version: 'v3', auth: authClient });
    console.log('✅ Google Drive инициализирован');
  } catch (error) {
    console.error('❌ Ошибка инициализации Google Drive:', error.message);
    console.log('Убедитесь, что файл credentials.json находится в папке backend/');
    process.exit(1);
  }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
/**
 * Сжатие аудио в формат Opus (отличное качество при малом размере)
 */
function compressAudio(inputBuffer, inputFormat, outputFormat = 'opus') {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(__dirname, 'temp', `${uuidv4()}.${inputFormat}`);
    const outputPath = path.join(__dirname, 'temp', `${uuidv4()}.${outputFormat}`);
    
    // Создаем временную папку, если её нет
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }
    
    // Сохраняем входной буфер во временный файл
    fs.writeFileSync(inputPath, inputBuffer);
    
    // Настройки сжатия в зависимости от формата
    let command = ffmpeg(inputPath);
    
    switch(outputFormat) {
      case 'opus':
        // Opus - лучший выбор для стриминга, отличное качество при низком битрейте
        command.audioCodec('libopus')
               .audioBitrate(128) // 128 kbps - отличное качество
               .audioChannels(2)
               .audioFrequency(48000);
        break;
      case 'mp3':
        // MP3 - для совместимости
        command.audioCodec('libmp3lame')
               .audioBitrate(192) // 192 kbps - хорошее качество
               .audioChannels(2);
        break;
      case 'aac':
        // AAC - хороший выбор для Apple устройств
        command.audioCodec('aac')
               .audioBitrate(128)
               .audioChannels(2);
        break;
      default:
        command.audioCodec('libopus')
               .audioBitrate(128);
    }
    
    command.output(outputPath)
           .on('end', () => {
             // Читаем сжатый файл
             const compressedBuffer = fs.readFileSync(outputPath);
             
             // Очищаем временные файлы
             fs.unlinkSync(inputPath);
             fs.unlinkSync(outputPath);
             
             resolve(compressedBuffer);
           })
           .on('error', (err) => {
             // Очищаем временные файлы при ошибке
             if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
             if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
             reject(err);
           })
           .run();
  });
}

/**
 * Загрузка файла в Google Drive
 */
async function uploadToDrive(fileBuffer, fileName, mimeType) {
  try {
    // Определяем MIME тип
    const fileMimeType = mimeType || 'audio/opus';
    
    // Создаем файл в Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: fileMimeType,
        parents: [process.env.DRIVE_FOLDER_ID],
        properties: {
          uploaded: new Date().toISOString(),
          source: 'Forsity Music'
        }
      },
      media: {
        mimeType: fileMimeType,
        body: require('stream').Readable.from(fileBuffer)
      },
      fields: 'id, name, mimeType, size, webViewLink'
    });

    // Делаем файл публичным (для доступа по ссылке)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    return {
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      size: response.data.size,
      webViewLink: response.data.webViewLink,
      // Прямая ссылка для скачивания/стриминга
      directLink: `https://drive.google.com/uc?export=download&id=${response.data.id}`
    };
  } catch (error) {
    console.error('Ошибка загрузки в Google Drive:', error);
    throw error;
  }
}

// ========== ЭНДПОЙНТЫ ==========

/**
 * Загрузка трека
 */
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не предоставлен' });
    }

    const { title, artist } = req.body;
    const originalFile = req.file;
    
    console.log(`📁 Загрузка: ${originalFile.originalname}`);
    
    // Определяем формат входного файла
    const inputFormat = originalFile.originalname.split('.').pop().toLowerCase();
    
    // Сжимаем в Opus (лучший выбор для стриминга)
    console.log('🔄 Сжатие аудио...');
    const compressedBuffer = await compressAudio(
      originalFile.buffer, 
      inputFormat, 
      'opus'
    );
    
    // Генерируем имя файла
    const fileName = `${title || 'untitled'} - ${artist || 'unknown'}.opus`
      .replace(/[^a-zA-Z0-9\s\-_.]/g, '') // Удаляем недопустимые символы
      .substring(0, 100);
    
    // Загружаем в Google Drive
    console.log('☁️ Загрузка в Google Drive...');
    const driveFile = await uploadToDrive(
      compressedBuffer,
      fileName,
      'audio/opus'
    );
    
    // Возвращаем результат
    res.json({
      success: true,
      file: {
        url: driveFile.directLink,
        driveId: driveFile.id,
        title: title || originalFile.originalname,
        artist: artist || 'Unknown',
        format: 'opus',
        bitrate: '128k',
        size: driveFile.size
      }
    });
    
    console.log(`✅ Загружено: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки:', error);
    res.status(500).json({ 
      error: 'Ошибка при загрузке файла',
      details: error.message 
    });
  }
});

/**
 * Получение информации о треке по Drive ID
 */
app.get('/api/track/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, createdTime, properties'
    });
    
    res.json({
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      size: response.data.size,
      created: response.data.createdTime,
      properties: response.data.properties,
      url: `https://drive.google.com/uc?export=download&id=${response.data.id}`
    });
    
  } catch (error) {
    console.error('Ошибка получения информации о треке:', error);
    res.status(500).json({ error: 'Файл не найден' });
  }
});

/**
 * Удаление трека из Google Drive
 */
app.delete('/api/track/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    await drive.files.delete({
      fileId: fileId
    });
    
    res.json({ success: true, message: 'Файл удален' });
    
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({ error: 'Ошибка при удалении файла' });
  }
});

/**
 * Получение списка всех треков (опционально)
 */
app.get('/api/tracks', async (req, res) => {
  try {
    const response = await drive.files.list({
      q: `'${process.env.DRIVE_FOLDER_ID}' in parents and mimeType contains 'audio/'`,
      fields: 'files(id, name, mimeType, size, createdTime, properties)',
      orderBy: 'createdTime desc'
    });
    
    const tracks = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      created: file.createdTime,
      title: file.properties?.title || file.name,
      artist: file.properties?.artist || 'Unknown',
      url: `https://drive.google.com/uc?export=download&id=${file.id}`
    }));
    
    res.json({ tracks });
    
  } catch (error) {
    console.error('Ошибка получения списка треков:', error);
    res.status(500).json({ error: 'Ошибка при получении списка треков' });
  }
});

// ========== ЗАПУСК СЕРВЕРА ==========
initializeGoogleDrive().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 Папка Google Drive ID: ${process.env.DRIVE_FOLDER_ID}`);
  });
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
  console.error('Необработанная ошибка:', error);
});

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 443;

// ========== СОЗДАЁМ ПАПКУ ДЛЯ ЗАГРУЗОК ==========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Папка uploads создана');
}

// ========== НАСТРОЙКА CORS ==========
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== НАСТРОЙКА MULTER ДЛЯ ЗАГРУЗКИ ФАЙЛОВ ==========
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('audio') || file.originalname.endsWith('.mp3')) {
            cb(null, true);
        } else {
            cb(new Error('Только аудиофайлы разрешены'), false);
        }
    }
});

// ========== ЯНДЕКС.ДИСК (ОПЦИОНАЛЬНО) ==========
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
const YANDEX_API_URL = 'https://cloud-api.yandex.net/v1/disk';

const yandexApi = axios.create({
    baseURL: YANDEX_API_URL,
    headers: {
        'Authorization': `OAuth ${YANDEX_TOKEN}`
    }
});

if (YANDEX_TOKEN) {
    console.log('✅ Яндекс.Диск инициализирован с токеном');
} else {
    console.log('⚠️ Яндекс.Диск не настроен (токен отсутствует)');
}

// ========== ФУНКЦИИ ДЛЯ ЯНДЕКС.ДИСКА ==========
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

// ========== ЭНДПОИНТЫ ==========

// Проверка здоровья
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        storage: YANDEX_TOKEN ? 'yandex-disk' : 'local',
        token: YANDEX_TOKEN ? 'установлен' : 'не установлен',
        uploads: fs.readdirSync(uploadDir).length,
        timestamp: new Date().toISOString()
    });
});

// Загрузка файла (ЛОКАЛЬНО)
app.post('/api/upload', upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const file = req.file;
        const title = req.body.title || path.basename(file.originalname, path.extname(file.originalname));
        const artist = req.body.artist || '';

        console.log(`✅ Файл загружен: ${file.originalname} (${file.size} байт)`);

        res.json({
            success: true,
            file: {
                path: file.filename,
                originalName: file.originalname,
                title: title,
                artist: artist,
                size: file.size
            }
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

// Стриминг локального файла
app.get('/api/stream/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);

    // Проверяем существование файла
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Файл не найден' });
    }

    const stat = fs.statSync(filepath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filepath, { start, end });

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg'
        });
        fileStream.pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'audio/mpeg'
        });
        fs.createReadStream(filepath).pipe(res);
    }
});

// Получить список загруженных файлов
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir).map(filename => {
            const filepath = path.join(uploadDir, filename);
            const stat = fs.statSync(filepath);
            return {
                filename,
                size: stat.size,
                created: stat.birthtime
            };
        });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения списка файлов' });
    }
});

// Удалить файл
app.delete('/api/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);

    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            res.json({ success: true, message: 'Файл удалён' });
        } else {
            res.status(404).json({ error: 'Файл не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления файла' });
    }
});

// ========== ЯНДЕКС.ДИСК ЭНДПОИНТЫ (если есть токен) ==========
if (YANDEX_TOKEN) {
    // Стриминг с Яндекс.Диска
    app.get('/api/yandex/stream/:path(*)', async (req, res) => {
        const remotePath = decodeURIComponent(req.params.path);
        
        try {
            const fileInfo = await getFileInfo(remotePath);
            const downloadUrl = await getDownloadLink(remotePath);
            
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
            
            if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
            }
            if (response.headers['content-range']) {
                res.setHeader('Content-Range', response.headers['content-range']);
            }
            
            res.status(range ? 206 : 200);
            response.data.pipe(res);
            
            req.on('close', () => {
                if (response.data && response.data.destroy) {
                    response.data.destroy();
                }
            });
            
        } catch (error) {
            console.error('❌ Ошибка стриминга:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Ошибка стриминга' });
            }
        }
    });

    // Проверка файла на Яндекс.Диске
    app.get('/api/yandex/check/:path(*)', async (req, res) => {
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
            res.json({ exists: false, path: remotePath });
        }
    });
}

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 Папка для загрузок: ${uploadDir}`);
    console.log(`🔑 Токен Яндекс.Диска: ${YANDEX_TOKEN ? 'установлен' : 'ОТСУТСТВУЕТ'}`);
});

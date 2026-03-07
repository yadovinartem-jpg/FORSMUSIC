// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

// Основные элементы
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const playlist = document.getElementById('playlist');
const trackUrl = document.getElementById('trackUrl');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const addTrackBtn = document.getElementById('addTrackBtn');

// ЗАГРУЗКА ФАЙЛОВ С КОМПЬЮТЕРА - обновленная версия с отладкой
console.log('Скрипт загружен, ищем элементы...');

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

console.log('fileInput найден:', fileInput);
console.log('uploadBtn найден:', uploadBtn);

if (!uploadBtn) {
    console.error('ОШИБКА: Кнопка загрузки не найдена! Проверьте id="uploadBtn" в HTML');
} else {
    console.log('Кнопка найдена, добавляем обработчик...');
    
    uploadBtn.addEventListener('click', function(event) {
        console.log('Кнопка нажата! Событие:', event);
        
        const file = fileInput.files[0];
        console.log('Выбранный файл:', file);
        
        if (!file) {
            console.log('Файл не выбран');
            tg.showAlert('Сначала выберите файл!');
            return;
        }
        
        // Проверяем, что это MP3
        console.log('Тип файла:', file.type);
        console.log('Имя файла:', file.name);
        
        if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3') && !file.name.endsWith('.MP3')) {
            console.log('Неправильный формат файла');
            tg.showAlert('Пожалуйста, выберите MP3 файл');
            return;
        }
        
        try {
            console.log('Создаем ссылку на файл...');
            const fileUrl = URL.createObjectURL(file);
            console.log('Ссылка создана:', fileUrl);
            
            // Используем имя файла как название (убираем расширение .mp3)
            const fileName = file.name.replace('.mp3', '').replace('.MP3', '');
            console.log('Имя трека:', fileName);
            
            // Добавляем в плейлист
            tracks.push({
                url: fileUrl,
                title: fileName,
                artist: 'Загружено с ПК'
            });
            
            console.log('Трек добавлен в массив. Всего треков:', tracks.length);
            
            saveTracks();
            updatePlaylist();
            
            // Очищаем input
            fileInput.value = '';
            console.log('Input очищен');
            
            tg.showAlert('Файл загружен!');
            console.log('Уведомление отправлено');
            
            // Если это первый трек, обновляем отображение времени
            if (tracks.length === 1) {
                timeDisplay.textContent = '0:00 / 0:00';
            }
            
        } catch (error) {
            console.error('Ошибка при загрузке файла:', error);
            tg.showAlert('Ошибка при загрузке файла: ' + error.message);
        }
    });
    
    console.log('Обработчик события добавлен');
}

// Аудио элемент
const audio = new Audio();

// Состояние плеера
let isPlaying = false;
let currentTrackIndex = -1;
let tracks = [];

// Загрузка треков из localStorage при старте
loadTracks();

// Функции плеера
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updatePlaylist() {
    playlist.innerHTML = '';
    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="track-info">
                <span class="track-title">${track.title || 'Без названия'}</span>
                <span class="track-artist">${track.artist || 'Неизвестный исполнитель'}</span>
            </div>
        `;
        li.addEventListener('click', () => playTrack(index));
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        playlist.appendChild(li);
    });
}

function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        // Останавливаем текущее воспроизведение
        audio.pause();
        
        currentTrackIndex = index;
        audio.src = tracks[index].url;
        
        // Добавляем обработчик ошибок
        audio.onerror = function(e) {
            console.error('Ошибка загрузки аудио:', e);
            tg.showAlert('Не удалось загрузить трек. Проверьте ссылку или файл.');
            isPlaying = false;
            playPauseBtn.textContent = '▶️ Play';
        };
        
        // Пытаемся воспроизвести
        audio.play().then(() => {
            isPlaying = true;
            playPauseBtn.textContent = '⏸️ Пауза';
            updatePlaylist();
        }).catch(error => {
            console.error('Ошибка воспроизведения:', error);
            tg.showAlert('Не удалось воспроизвести трек. Возможно, файл поврежден или недоступен.');
            isPlaying = false;
            playPauseBtn.textContent = '▶️ Play';
        });
    }
}

function togglePlay() {
    if (tracks.length === 0) {
        tg.showAlert('Сначала добавьте треки в плейлист!');
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        playPauseBtn.textContent = '▶️ Play';
        isPlaying = false;
    } else {
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else {
            audio.play().then(() => {
                playPauseBtn.textContent = '⏸️ Пауза';
                isPlaying = true;
            }).catch(error => {
                console.error('Ошибка воспроизведения:', error);
                tg.showAlert('Не удалось воспроизвести трек');
            });
        }
    }
}

// Сохранение и загрузка треков
function saveTracks() {
    localStorage.setItem('tracks', JSON.stringify(tracks));
}

function loadTracks() {
    const saved = localStorage.getItem('tracks');
    if (saved) {
        try {
            tracks = JSON.parse(saved);
            updatePlaylist();
        } catch (e) {
            console.error('Ошибка загрузки сохраненных треков:', e);
            tracks = [];
        }
    }
}

// События аудио
audio.addEventListener('timeupdate', () => {
    if (audio.duration && !isNaN(audio.duration)) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.value = progress;
        timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
});

audio.addEventListener('ended', () => {
    if (currentTrackIndex < tracks.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        isPlaying = false;
        playPauseBtn.textContent = '▶️ Play';
        currentTrackIndex = -1;
        progressBar.value = 0;
        timeDisplay.textContent = '0:00 / 0:00';
    }
});

audio.addEventListener('loadedmetadata', () => {
    timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
});

// Обработчики событий
playPauseBtn.addEventListener('click', togglePlay);

progressBar.addEventListener('input', () => {
    if (audio.duration && !isNaN(audio.duration)) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});

// Загрузка файлов с компьютера
uploadBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
        tg.showAlert('Сначала выберите файл!');
        return;
    }
    
    // Проверяем, что это MP3
    if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
        tg.showAlert('Пожалуйста, выберите MP3 файл');
        return;
    }
    
    try {
        // Создаем временную ссылку на файл
        const fileUrl = URL.createObjectURL(file);
        
        // Используем имя файла как название (убираем расширение .mp3)
        const fileName = file.name.replace('.mp3', '').replace('.MP3', '');
        
        // Добавляем в плейлист
        tracks.push({
            url: fileUrl,
            title: fileName,
            artist: 'Загружено с ПК'
        });
        
        saveTracks();
        updatePlaylist();
        
        // Очищаем input
        fileInput.value = '';
        tg.showAlert('Файл загружен!');
        
        // Если это первый трек, обновляем отображение времени
        if (tracks.length === 1) {
            timeDisplay.textContent = '0:00 / 0:00';
        }
    } catch (error) {
        console.error('Ошибка при загрузке файла:', error);
        tg.showAlert('Ошибка при загрузке файла');
    }
});

// Добавление по ссылке
addTrackBtn.addEventListener('click', () => {
    const url = trackUrl.value.trim();
    const title = trackTitle.value.trim();
    const artist = trackArtist.value.trim();
    
    if (url && title && artist) {
        tracks.push({ 
            url: url, 
            title: title, 
            artist: artist 
        });
        saveTracks();
        updatePlaylist();
        
        // Очистить поля
        trackUrl.value = '';
        trackTitle.value = '';
        trackArtist.value = '';
        
        tg.showAlert('Трек добавлен!');
    } else {
        tg.showAlert('Заполните все поля!');
    }
});

// Сообщаем Telegram, что приложение готово
tg.ready();

// Очистка временных ссылок при закрытии страницы
window.addEventListener('beforeunload', () => {
    tracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
});

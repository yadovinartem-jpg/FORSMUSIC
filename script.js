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

// ========== ЭКВАЛАЙЗЕР ==========
let audioContext;
let source;
let filters = [];
let eqEnabled = false;

// Настройки эквалайзера по умолчанию
const eqFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
let eqSettings = new Array(10).fill(0);

// Элементы эквалайзера
const toggleEqBtn = document.getElementById('toggleEqBtn');
const eqControls = document.getElementById('eqControls');
const eqPreset = document.getElementById('eqPreset');
const applyPresetBtn = document.getElementById('applyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');

// Ползунки эквалайзера
const eqSliders = [];
const eqValues = [];

for (let i = 0; i < eqFrequencies.length; i++) {
    const freq = eqFrequencies[i];
    const slider = document.getElementById(`eq${freq}`);
    const value = document.getElementById(`eq${freq}Val`);
    if (slider && value) {
        eqSliders.push(slider);
        eqValues.push(value);
        
        // Добавляем обработчик
        slider.addEventListener('input', createEqHandler(i));
    }
}

// Создаем обработчик для каждого ползунка
function createEqHandler(index) {
    return function(e) {
        const val = parseFloat(e.target.value);
        eqSettings[index] = val;
        eqValues[index].textContent = val.toFixed(1) + ' dB';
        updateEQ();
    };
}

// Пресеты эквалайзера
const eqPresets = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    rock: [4, 4, 2, 0, -1, -1, 0, 2, 3, 3],
    pop: [2, 2, 1, 0, 1, 2, 3, 2, 1, 0],
    jazz: [3, 3, 2, 1, 0, 1, 2, 3, 4, 4],
    classical: [2, 2, 1, 0, 0, 0, 0, 1, 2, 3],
    bass: [6, 6, 5, 3, 1, 0, 0, 0, 0, 0],
    treble: [0, 0, 0, 0, 0, 1, 2, 4, 6, 6]
};

// Функция инициализации эквалайзера
function initEQ() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Создаем фильтры для каждой полосы
    filters = [];
    for (let i = 0; i < eqFrequencies.length; i++) {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking'; // Полосовой фильтр
        filter.frequency.value = eqFrequencies[i];
        filter.Q.value = 1; // Добротность
        filter.gain.value = eqSettings[i];
        filters.push(filter);
    }
    
    // Соединяем фильтры последовательно
    for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
    }
}

// Подключение эквалайзера к аудио
function connectEQ() {
    if (!audioContext || !source) return;
    
    try {
        // Отключаем предыдущие соединения
        source.disconnect();
        
        if (eqEnabled && filters.length > 0) {
            // Подключаем через эквалайзер
            source.connect(filters[0]);
            filters[filters.length - 1].connect(audioContext.destination);
            console.log('✅ Эквалайзер подключен');
        } else {
            // Подключаем напрямую
            source.connect(audioContext.destination);
            console.log('🔊 Прямое подключение');
        }
    } catch (e) {
        console.error('Ошибка подключения эквалайзера:', e);
    }
}

// Обновление настроек эквалайзера
function updateEQ() {
    if (!filters.length) return;
    
    for (let i = 0; i < filters.length; i++) {
        filters[i].gain.value = eqSettings[i];
    }
    
    // Сохраняем настройки
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
}

// Применение пресета
function applyPreset(presetName) {
    const preset = eqPresets[presetName];
    if (!preset) return;
    
    for (let i = 0; i < preset.length; i++) {
        eqSettings[i] = preset[i];
        if (eqSliders[i]) {
            eqSliders[i].value = preset[i];
            eqValues[i].textContent = preset[i].toFixed(1) + ' dB';
        }
    }
    
    updateEQ();
}

// Сброс эквалайзера
function resetEQ() {
    for (let i = 0; i < eqSettings.length; i++) {
        eqSettings[i] = 0;
        if (eqSliders[i]) {
            eqSliders[i].value = 0;
            eqValues[i].textContent = '0.0 dB';
        }
    }
    updateEQ();
}

// Загрузка сохраненных настроек
function loadEQSettings() {
    const saved = localStorage.getItem('eqSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            if (settings.length === eqSettings.length) {
                eqSettings = settings;
                for (let i = 0; i < eqSettings.length; i++) {
                    if (eqSliders[i]) {
                        eqSliders[i].value = eqSettings[i];
                        eqValues[i].textContent = eqSettings[i].toFixed(1) + ' dB';
                    }
                }
                updateEQ();
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек EQ:', e);
        }
    }
}

// Модифицируем функцию playTrack для работы с эквалайзером
const originalPlayTrack = playTrack;
playTrack = function(index) {
    originalPlayTrack(index);
    
    // Подключаем эквалайзер к новому аудио
    setTimeout(() => {
        if (audioContext && source) {
            source.disconnect();
        }
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(audio);
        
        initEQ();
        connectEQ();
    }, 100);
};

// Обработчики событий для эквалайзера
toggleEqBtn.addEventListener('click', () => {
    eqControls.classList.toggle('hidden');
    toggleEqBtn.textContent = eqControls.classList.contains('hidden') ? 
        'Показать эквалайзер' : 'Скрыть эквалайзер';
});

applyPresetBtn.addEventListener('click', () => {
    const preset = eqPreset.value;
    applyPreset(preset);
    tg.showAlert(`Пресет "${preset}" применен`);
});

resetEqBtn.addEventListener('click', () => {
    resetEQ();
    tg.showAlert('Эквалайзер сброшен');
});

saveEqBtn.addEventListener('click', () => {
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
    tg.showAlert('Настройки сохранены');
});

// Включение/выключение эквалайзера (можно добавить кнопку)
// Для этого добавьте в HTML кнопку и раскомментируйте код ниже
/*
const enableEqBtn = document.getElementById('enableEqBtn');
enableEqBtn.addEventListener('click', () => {
    eqEnabled = !eqEnabled;
    enableEqBtn.textContent = eqEnabled ? '🔊 EQ: Вкл' : '🔇 EQ: Выкл';
    connectEQ();
});
*/

// Загружаем сохраненные настройки при старте
loadEQSettings();

// Инициализируем эквалайзер при первом воспроизведении
audio.addEventListener('play', () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(audio);
        initEQ();
        connectEQ();
    }
});

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

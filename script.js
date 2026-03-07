// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Основные элементы
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const playlist = document.getElementById('playlist');
const trackUrl = document.getElementById('trackUrl');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const addTrackBtn = document.getElementById('addTrackBtn');

// Элементы громкости
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const volumePercent = document.getElementById('volumePercent');

// Элементы загрузки
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

// Аудио элемент
const audio = new Audio();

// ========== ГРОМКОСТЬ ==========
function initVolume() {
    console.log('Инициализация громкости...');
    
    // Загружаем сохраненную громкость
    const savedVolume = localStorage.getItem('volume');
    let startVolume = 70; // по умолчанию
    
    if (savedVolume !== null) {
        startVolume = parseInt(savedVolume);
    }
    
    // Устанавливаем начальные значения
    audio.volume = startVolume / 100;
    if (volumeSlider) volumeSlider.value = startVolume;
    if (volumePercent) volumePercent.textContent = startVolume + '%';
    updateVolumeIcon(startVolume);
    
    // Обработчик изменения громкости
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
            const volume = parseInt(e.target.value);
            audio.volume = volume / 100;
            volumePercent.textContent = volume + '%';
            updateVolumeIcon(volume);
            localStorage.setItem('volume', volume);
            console.log('Громкость изменена:', volume + '%');
        });
    }
}

function updateVolumeIcon(volume) {
    if (!volumeIcon) return;
    if (volume == 0) {
        volumeIcon.textContent = '🔇';
    } else if (volume < 30) {
        volumeIcon.textContent = '🔈';
    } else if (volume < 70) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
}

// ========== ЭКВАЛАЙЗЕР ==========
let audioContext = null;
let source = null;
let filters = [];
let isEQInitialized = false;

// Ваш пресет
const myPreset = {
    32: 12,
    64: 12,
    125: 9,
    250: 4,
    500: 5,
    1000: 2,
    2000: 2,
    4000: -1,
    8000: 1,
    16000: 1
};

// Настройки эквалайзера
let eqSettings = {
    32: 0,
    64: 0,
    125: 0,
    250: 0,
    500: 0,
    1000: 0,
    2000: 0,
    4000: 0,
    8000: 0,
    16000: 0
};

// Элементы эквалайзера
const toggleEqBtn = document.getElementById('toggleEqBtn');
const eqControls = document.getElementById('eqControls');
const applyMyPresetBtn = document.getElementById('applyMyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');

// Функция создания эквалайзера
function initEQ() {
    if (isEQInitialized) return;
    
    try {
        // Создаем AudioContext только если его еще нет
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Если источник уже есть, отключаем его
        if (source) {
            try {
                source.disconnect();
            } catch (e) {}
        }
        
        // Создаем источник из аудио элемента
        source = audioContext.createMediaElementSource(audio);
        
        // Создаем фильтры для каждой частоты
        filters = [];
        
        // Частоты по порядку (от низких к высоким)
        const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        
        for (let freq of frequencies) {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.0; // Добротность
            filter.gain.value = eqSettings[freq] || 0;
            filters.push(filter);
        }
        
        // Соединяем фильтры последовательно
        for (let i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i + 1]);
        }
        
        // Подключаем первый фильтр к источнику, последний к выходу
        source.connect(filters[0]);
        filters[filters.length - 1].connect(audioContext.destination);
        
        isEQInitialized = true;
        console.log('✅ Эквалайзер инициализирован', eqSettings);
    } catch (e) {
        console.error('Ошибка инициализации эквалайзера:', e);
    }
}

// Обновление настроек эквалайзера
function updateEQ() {
    if (!filters.length) {
        console.log('Фильтры еще не созданы');
        return;
    }
    
    for (let i = 0; i < filters.length; i++) {
        const freq = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000][i];
        const gain = eqSettings[freq];
        filters[i].gain.value = gain;
        console.log(`Фильтр ${freq}Гц установлен: ${gain}dB`);
    }
    
    // Сохраняем настройки
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
}

// Применение вашего пресета
function applyMyPreset() {
    console.log('Применяю ваш пресет...');
    
    // Ваши настройки
    eqSettings = {
        32: 12,
        64: 12,
        125: 9,
        250: 4,
        500: 5,
        1000: 2,
        2000: 2,
        4000: -1,
        8000: 1,
        16000: 1
    };
    
    // Обновляем ползунки
    updateAllSliders();
    
    // Обновляем фильтры
    updateEQ();
    
    tg.showAlert('✅ Ваш пресет применен');
}

// Сброс эквалайзера
function resetEQ() {
    console.log('Сброс эквалайзера...');
    
    // Сбрасываем настройки
    for (let freq in eqSettings) {
        eqSettings[freq] = 0;
    }
    
    // Обновляем ползунки
    updateAllSliders();
    
    // Обновляем фильтры
    updateEQ();
    
    tg.showAlert('🔄 Эквалайзер сброшен');
}

// Обновление всех ползунков
function updateAllSliders() {
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    for (let freq of frequencies) {
        const slider = document.getElementById(`eq${freq}`);
        const value = document.getElementById(`eq${freq}Val`);
        
        if (slider && value) {
            slider.value = eqSettings[freq];
            value.textContent = eqSettings[freq].toFixed(1) + ' dB';
        }
    }
}

// Загрузка сохраненных настроек
function loadEQSettings() {
    const saved = localStorage.getItem('eqSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            eqSettings = {...eqSettings, ...settings};
            updateAllSliders();
            console.log('Загружены настройки EQ:', eqSettings);
        } catch (e) {
            console.error('Ошибка загрузки настроек EQ:', e);
        }
    }
}

// Инициализация ползунков эквалайзера
function initEQSliders() {
    console.log('Инициализация ползунков эквалайзера...');
    
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    for (let freq of frequencies) {
        const slider = document.getElementById(`eq${freq}`);
        const value = document.getElementById(`eq${freq}Val`);
        
        if (slider && value) {
            // Устанавливаем начальное значение
            slider.value = eqSettings[freq];
            value.textContent = eqSettings[freq].toFixed(1) + ' dB';
            
            // Добавляем обработчик
            slider.addEventListener('input', function(e) {
                const val = parseFloat(e.target.value);
                eqSettings[freq] = val;
                value.textContent = val.toFixed(1) + ' dB';
                
                // Обновляем фильтр, если он существует
                if (filters.length > 0) {
                    const index = frequencies.indexOf(freq);
                    if (index !== -1 && filters[index]) {
                        filters[index].gain.value = val;
                        console.log(`Обновлен фильтр ${freq}Гц: ${val}dB`);
                    }
                }
            });
            
            console.log(`Ползунок ${freq}Гц инициализирован`);
        } else {
            console.warn(`Ползунок eq${freq} не найден`);
        }
    }
}

// ========== ОСТАЛЬНОЙ КОД ПЛЕЕРА ==========

// Состояние плеера
let isPlaying = false;
let currentTrackIndex = -1;
let tracks = [];

// Загрузка треков
function loadTracks() {
    const saved = localStorage.getItem('tracks');
    if (saved) {
        try {
            tracks = JSON.parse(saved);
            updatePlaylist();
        } catch (e) {
            console.error('Ошибка загрузки треков:', e);
            tracks = [];
        }
    }
}

// Сохранение треков
function saveTracks() {
    localStorage.setItem('tracks', JSON.stringify(tracks));
}

// Обновление плейлиста
function updatePlaylist() {
    if (!playlist) return;
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

// Форматирование времени
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Воспроизведение трека
function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        audio.pause();
        
        currentTrackIndex = index;
        audio.src = tracks[index].url;
        
        audio.onerror = function(e) {
            console.error('Ошибка загрузки аудио:', e);
            tg.showAlert('Не удалось загрузить трек');
            isPlaying = false;
            playPauseBtn.textContent = '▶️ Play';
        };
        
        audio.play().then(() => {
            isPlaying = true;
            playPauseBtn.textContent = '⏸️ Пауза';
            updatePlaylist();
            
            // Инициализируем эквалайзер при первом воспроизведении
            if (!isEQInitialized) {
                setTimeout(() => {
                    initEQ();
                }, 200);
            }
            
        }).catch(error => {
            console.error('Ошибка воспроизведения:', error);
            tg.showAlert('Не удалось воспроизвести трек');
            isPlaying = false;
            playPauseBtn.textContent = '▶️ Play';
        });
    }
}

// Переключение воспроизведения
function togglePlay() {
    if (tracks.length === 0) {
        tg.showAlert('Сначала добавьте треки!');
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

// ========== ЗАГРУЗКА ФАЙЛОВ ==========
if (uploadBtn) {
    uploadBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            tg.showAlert('Выберите файл!');
            return;
        }
        
        if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
            tg.showAlert('Выберите MP3 файл');
            return;
        }
        
        try {
            const fileUrl = URL.createObjectURL(file);
            const fileName = file.name.replace('.mp3', '').replace('.MP3', '');
            
            tracks.push({
                url: fileUrl,
                title: fileName,
                artist: 'Загружено с ПК'
            });
            
            saveTracks();
            updatePlaylist();
            fileInput.value = '';
            tg.showAlert('Файл загружен!');
            
        } catch (error) {
            console.error('Ошибка:', error);
            tg.showAlert('Ошибка загрузки');
        }
    });
}

// ========== ДОБАВЛЕНИЕ ПО ССЫЛКЕ ==========
if (addTrackBtn) {
    addTrackBtn.addEventListener('click', () => {
        const url = trackUrl.value.trim();
        const title = trackTitle.value.trim();
        const artist = trackArtist.value.trim();
        
        if (url && title && artist) {
            tracks.push({ url, title, artist });
            saveTracks();
            updatePlaylist();
            
            trackUrl.value = '';
            trackTitle.value = '';
            trackArtist.value = '';
            
            tg.showAlert('Трек добавлен!');
        } else {
            tg.showAlert('Заполните все поля!');
        }
    });
}

// ========== СОБЫТИЯ АУДИО ==========
audio.addEventListener('timeupdate', () => {
    if (audio.duration && !isNaN(audio.duration)) {
        const progress = (audio.currentTime / audio.duration) * 100;
        if (progressBar) progressBar.value = progress;
        if (timeDisplay) {
            timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        }
    }
});

audio.addEventListener('ended', () => {
    if (currentTrackIndex < tracks.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        isPlaying = false;
        playPauseBtn.textContent = '▶️ Play';
        currentTrackIndex = -1;
        if (progressBar) progressBar.value = 0;
        if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
    }
});

audio.addEventListener('loadedmetadata', () => {
    if (timeDisplay) {
        timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
    }
});

// ========== ОБРАБОТЧИКИ ==========
if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlay);
}

if (progressBar) {
    progressBar.addEventListener('input', () => {
        if (audio.duration && !isNaN(audio.duration)) {
            audio.currentTime = (progressBar.value / 100) * audio.duration;
        }
    });
}

// ========== ЭКВАЛАЙЗЕР - ОБРАБОТЧИКИ ==========
if (toggleEqBtn && eqControls) {
    toggleEqBtn.addEventListener('click', () => {
        eqControls.classList.toggle('hidden');
        toggleEqBtn.textContent = eqControls.classList.contains('hidden') ? 
            'Показать эквалайзер' : 'Скрыть эквалайзер';
    });
}

if (applyMyPresetBtn) {
    applyMyPresetBtn.addEventListener('click', applyMyPreset);
}

if (resetEqBtn) {
    resetEqBtn.addEventListener('click', resetEQ);
}

if (saveEqBtn) {
    saveEqBtn.addEventListener('click', () => {
        localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
        tg.showAlert('Настройки сохранены');
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация...');
    
    // Загружаем треки
    loadTracks();
    
    // Инициализируем громкость
    initVolume();
    
    // Загружаем настройки эквалайзера
    loadEQSettings();
    
    // Инициализируем ползунки эквалайзера
    initEQSliders();
    
    tg.ready();
    console.log('✅ Приложение готово');
});

// Очистка временных ссылок
window.addEventListener('beforeunload', () => {
    tracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
});

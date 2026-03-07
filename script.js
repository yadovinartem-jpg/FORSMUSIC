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
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');

// Элементы громкости
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const volumePercent = document.getElementById('volumePercent');

// Элементы управления
const repeatBtn = document.getElementById('repeatBtn');
const shuffleBtn = document.getElementById('shuffleBtn');

// Элементы загрузки
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

// Аудио элемент
const audio = new Audio();

// ========== НАСТРОЙКИ ПЛЕЕРА ==========
let isPlaying = false;
let currentTrackIndex = -1;
let tracks = [];

// Режимы повтора: 0 - нет повтора, 1 - повтор всего плейлиста, 2 - повтор одного трека
let repeatMode = 0;
let shuffleMode = false;
let shuffledIndices = [];

// ========== ОЧИСТКА ПРИ ЗАГРУЗКЕ ==========
// Не загружаем старые треки из localStorage
tracks = [];
updatePlaylist();

// ========== ГРОМКОСТЬ ==========
function initVolume() {
    console.log('Инициализация громкости...');
    
    const savedVolume = localStorage.getItem('volume');
    let startVolume = 70;
    
    if (savedVolume !== null) {
        startVolume = parseInt(savedVolume);
    }
    
    audio.volume = startVolume / 100;
    if (volumeSlider) volumeSlider.value = startVolume;
    if (volumePercent) volumePercent.textContent = startVolume + '%';
    updateVolumeIcon(startVolume);
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
            const volume = parseInt(e.target.value);
            audio.volume = volume / 100;
            volumePercent.textContent = volume + '%';
            updateVolumeIcon(volume);
            localStorage.setItem('volume', volume);
        });
    }
}

function updateVolumeIcon(volume) {
    if (!volumeIcon) return;
    if (volume == 0) volumeIcon.textContent = '🔇';
    else if (volume < 30) volumeIcon.textContent = '🔈';
    else if (volume < 70) volumeIcon.textContent = '🔉';
    else volumeIcon.textContent = '🔊';
}

// ========== ФУНКЦИИ ПЛЕЕРА ==========
function updatePlaylist() {
    if (!playlist) return;
    playlist.innerHTML = '';
    
    if (tracks.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Плейлист пуст';
        li.style.justifyContent = 'center';
        li.style.cursor = 'default';
        playlist.appendChild(li);
        return;
    }
    
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

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Функция для получения следующего трека
function getNextTrackIndex() {
    if (tracks.length === 0) return -1;
    
    if (repeatMode === 2) {
        // Повтор одного трека
        return currentTrackIndex;
    }
    
    if (shuffleMode) {
        // Режим перемешивания
        if (shuffledIndices.length === 0) {
            // Создаем новый перемешанный список
            shuffledIndices = Array.from({ length: tracks.length }, (_, i) => i);
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }
        }
        
        const nextIndex = shuffledIndices.shift();
        return nextIndex;
    }
    
    // Обычный порядок
    if (currentTrackIndex < tracks.length - 1) {
        return currentTrackIndex + 1;
    } else if (repeatMode === 1) {
        // Повтор всего плейлиста
        return 0;
    }
    
    return -1;
}

function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        audio.pause();
        
        currentTrackIndex = index;
        audio.src = tracks[index].url;
        
        // Обновляем перемешанный список, если нужно
        if (shuffleMode) {
            shuffledIndices = shuffledIndices.filter(i => i !== index);
        }
        
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

// Обновление иконок режимов
function updateModeButtons() {
    if (repeatBtn) {
        repeatBtn.textContent = repeatMode === 0 ? '🔁' : repeatMode === 1 ? '🔁' : '🔂';
        repeatBtn.classList.toggle('active', repeatMode !== 0);
    }
    
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', shuffleMode);
    }
}

// ========== ЭКВАЛАЙЗЕР ==========
let audioContext = null;
let source = null;
let filters = [];
let isEQInitialized = false;

const frequencyMap = {
    'eq32': 32,
    'eq64': 64,
    'eq125': 125,
    'eq250': 250,
    'eq500': 500,
    'eq1k': 1000,
    'eq2k': 2000,
    'eq4k': 4000,
    'eq8k': 8000,
    'eq16k': 16000
};

const idByFrequency = {
    32: 'eq32',
    64: 'eq64',
    125: 'eq125',
    250: 'eq250',
    500: 'eq500',
    1000: 'eq1k',
    2000: 'eq2k',
    4000: 'eq4k',
    8000: 'eq8k',
    16000: 'eq16k'
};

const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

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

const toggleEqBtn = document.getElementById('toggleEqBtn');
const eqControls = document.getElementById('eqControls');
const applyMyPresetBtn = document.getElementById('applyMyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');

function initEQ() {
    if (isEQInitialized) return;
    
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (source) {
            try {
                source.disconnect();
            } catch (e) {}
        }
        
        source = audioContext.createMediaElementSource(audio);
        filters = [];
        
        for (let freq of frequencies) {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.0;
            filter.gain.value = eqSettings[freq] || 0;
            filters.push(filter);
        }
        
        for (let i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i + 1]);
        }
        
        source.connect(filters[0]);
        filters[filters.length - 1].connect(audioContext.destination);
        
        isEQInitialized = true;
        console.log('✅ Эквалайзер инициализирован');
    } catch (e) {
        console.error('Ошибка инициализации эквалайзера:', e);
    }
}

function updateEQ() {
    if (!filters.length || !isEQInitialized) return;
    
    for (let i = 0; i < filters.length; i++) {
        const freq = frequencies[i];
        const gain = eqSettings[freq];
        filters[i].gain.value = gain;
    }
    
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
}

function applyMyPreset() {
    for (let freq in myPreset) {
        eqSettings[freq] = myPreset[freq];
    }
    
    for (let freq of frequencies) {
        const id = idByFrequency[freq];
        const slider = document.getElementById(id);
        const value = document.getElementById(id + 'Val');
        
        if (slider && value) {
            slider.value = eqSettings[freq];
            value.textContent = eqSettings[freq].toFixed(1) + ' dB';
        }
    }
    
    updateEQ();
    tg.showAlert('✅ Ваш пресет применен');
}

function resetEQ() {
    for (let freq of frequencies) {
        eqSettings[freq] = 0;
    }
    
    for (let freq of frequencies) {
        const id = idByFrequency[freq];
        const slider = document.getElementById(id);
        const value = document.getElementById(id + 'Val');
        
        if (slider && value) {
            slider.value = 0;
            value.textContent = '0.0 dB';
        }
    }
    
    updateEQ();
    tg.showAlert('🔄 Эквалайзер сброшен');
}

function loadEQSettings() {
    const saved = localStorage.getItem('eqSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            for (let freq in settings) {
                if (eqSettings.hasOwnProperty(freq)) {
                    eqSettings[freq] = settings[freq];
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек EQ:', e);
        }
    }
}

function initEQSliders() {
    for (let freq of frequencies) {
        const id = idByFrequency[freq];
        const slider = document.getElementById(id);
        const value = document.getElementById(id + 'Val');
        
        if (slider && value) {
            slider.value = eqSettings[freq];
            value.textContent = eqSettings[freq].toFixed(1) + ' dB';
            
            slider.addEventListener('input', function(e) {
                const val = parseFloat(e.target.value);
                eqSettings[freq] = val;
                value.textContent = val.toFixed(1) + ' dB';
                
                if (filters.length > 0 && isEQInitialized) {
                    const index = frequencies.indexOf(freq);
                    if (index !== -1 && filters[index]) {
                        filters[index].gain.value = val;
                    }
                }
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

// ========== ОЧИСТКА ПЛЕЙЛИСТА ==========
if (clearPlaylistBtn) {
    clearPlaylistBtn.addEventListener('click', () => {
        tracks = [];
        currentTrackIndex = -1;
        isPlaying = false;
        audio.pause();
        playPauseBtn.textContent = '▶️ Play';
        updatePlaylist();
        tg.showAlert('Плейлист очищен');
    });
}

// ========== ОБРАБОТЧИКИ РЕЖИМОВ ==========
if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
        repeatMode = (repeatMode + 1) % 3;
        updateModeButtons();
        
        const messages = ['🔁 Повтор выключен', '🔁 Повтор плейлиста', '🔂 Повтор одного трека'];
        tg.showAlert(messages[repeatMode]);
    });
}

if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
        shuffleMode = !shuffleMode;
        if (shuffleMode) {
            shuffledIndices = [];
        }
        updateModeButtons();
        tg.showAlert(shuffleMode ? '🔀 Перемешивание включено' : '🔀 Перемешивание выключено');
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
    const nextIndex = getNextTrackIndex();
    
    if (nextIndex !== -1) {
        playTrack(nextIndex);
    } else {
        isPlaying = false;
        playPauseBtn.textContent = '▶️ Play';
        currentTrackIndex = -1;
        if (progressBar) progressBar.value = 0;
        if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
        updatePlaylist();
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
    
    initVolume();
    loadEQSettings();
    initEQSliders();
    updateModeButtons();
    
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

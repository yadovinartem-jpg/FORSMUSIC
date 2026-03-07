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
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist}</span>
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
        currentTrackIndex = index;
        audio.src = tracks[index].url;
        audio.play();
        isPlaying = true;
        playPauseBtn.textContent = '⏸️ Пауза';
        updatePlaylist();
    }
}

function togglePlay() {
    if (tracks.length === 0) return;
    
    if (isPlaying) {
        audio.pause();
        playPauseBtn.textContent = '▶️ Play';
    } else {
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else {
            audio.play();
            playPauseBtn.textContent = '⏸️ Пауза';
        }
    }
    isPlaying = !isPlaying;
}

// Сохранение и загрузка треков
function saveTracks() {
    localStorage.setItem('tracks', JSON.stringify(tracks));
}

function loadTracks() {
    const saved = localStorage.getItem('tracks');
    if (saved) {
        tracks = JSON.parse(saved);
        updatePlaylist();
    }
}

// События аудио
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
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

// Обработчики событий
playPauseBtn.addEventListener('click', togglePlay);

progressBar.addEventListener('input', () => {
    if (audio.duration) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});

addTrackBtn.addEventListener('click', () => {
    const url = trackUrl.value.trim();
    const title = trackTitle.value.trim();
    const artist = trackArtist.value.trim();
    
    if (url && title && artist) {
        tracks.push({ url, title, artist });
        saveTracks();
        updatePlaylist();
        
        // Очистить поля
        trackUrl.value = '';
        trackTitle.value = '';
        trackArtist.value = '';
        
        // Показать уведомление в Telegram
        tg.showAlert('Трек добавлен!');
    } else {
        tg.showAlert('Заполните все поля!');
    }
});

// Сообщаем Telegram, что приложение готово
tg.ready();

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Версия Telegram Web App
console.log('Telegram WebApp version:', tg.version);

// Универсальная функция показа уведомлений
function showNotification(message) {
    if (typeof tg.showAlert === 'function') {
        tg.showAlert(message);
    } else if (typeof tg.showPopup === 'function') {
        tg.showPopup({
            title: 'FORSITY MUSIC',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        alert(message);
    }
}

// Основные элементы
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const playlist = document.getElementById('playlist');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const likeBtn = document.getElementById('likeBtn');

// Элементы обложки
const albumArt = document.getElementById('albumArt');
const ctx = albumArt.getContext('2d');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');

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
const coverFileInput = document.getElementById('coverFileInput');

// Элементы навигации по библиотеке
const showPlaylistsBtn = document.getElementById('showPlaylistsBtn');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const showAllTracksBtn = document.getElementById('showAllTracksBtn');
const playlistsSection = document.getElementById('playlistsSection');
const favoritesSection = document.getElementById('favoritesSection');
const allTracksSection = document.getElementById('allTracksSection');

// Элементы для плейлистов
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const playlistModal = document.getElementById('playlistModal');
const playlistName = document.getElementById('playlistName');
const playlistAuthor = document.getElementById('playlistAuthor');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');
const cancelPlaylistBtn = document.getElementById('cancelPlaylistBtn');
const playlistsContainer = document.getElementById('playlistsContainer');
const favoritesList = document.getElementById('favoritesList');

// Элементы для детального просмотра плейлиста
const playlistDetailModal = document.getElementById('playlistDetailModal');
const playlistDetailTitle = document.getElementById('playlistDetailTitle');
const playlistCover = document.getElementById('playlistCover');
const playlistCoverCtx = playlistCover.getContext('2d');
const playlistEditName = document.getElementById('playlistEditName');
const playlistEditAuthor = document.getElementById('playlistEditAuthor');
const renamePlaylistBtn = document.getElementById('renamePlaylistBtn');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
const changePlaylistCoverBtn = document.getElementById('changePlaylistCoverBtn');
const playlistTracks = document.getElementById('playlistTracks');
const availableTracks = document.getElementById('availableTracks');
const closePlaylistDetailBtn = document.getElementById('closePlaylistDetailBtn');

// Элементы эквалайзера
const qSlider = document.getElementById('qSlider');
const qValue = document.getElementById('qValue');
const toggleEqBtn = document.getElementById('toggleEqBtn');
const eqControls = document.getElementById('eqControls');
const applyMyPresetBtn = document.getElementById('applyMyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');

// Аудио элемент
const audio = new Audio();

// ========== НАСТРОЙКИ ПЛЕЕРА ==========
let isPlaying = false;
let currentTrackIndex = -1;
let tracks = [];

// Избранное
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Плейлисты
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];

// Текущий открытый плейлист
let currentPlaylistId = null;

// Режимы повтора: 0 - нет повтора, 1 - повтор всего плейлиста, 2 - повтор одного трека
let repeatMode = 0;
let shuffleMode = false;
let shuffledIndices = [];

// ========== ОЧИСТКА ПРИ ЗАГРУЗКЕ ==========
tracks = [];
updatePlaylist();
updateFavoritesList();
updatePlaylistsContainer();

// ========== ГРОМКОСТЬ ==========
function initVolume() {
    const savedVolume = localStorage.getItem('volume');
    let startVolume = 60; // Установлено 60%
    
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

// ========== ФУНКЦИИ ДЛЯ РИСОВАНИЯ ОБЛОЖКИ ==========
function drawGradientAlbumArt(canvas, text = 'FOR SITY') {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#32007d');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${canvas.width/12}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const words = text.split(' ');
    if (words.length > 2) {
        ctx.fillText(words.slice(0, 2).join(' '), canvas.width/2, canvas.height/2 - 20);
        ctx.fillText(words.slice(2).join(' '), canvas.width/2, canvas.height/2 + 20);
    } else {
        ctx.fillText(text, canvas.width/2, canvas.height/2);
    }
}

// Рисование обложки из изображения
function drawImageAlbumArt(canvas, img) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// Рисуем стандартную обложку при загрузке
drawGradientAlbumArt(albumArt, 'FOR SITY');

// ========== ФУНКЦИИ ДЛЯ ИЗВЛЕЧЕНИЯ ОБЛОЖКИ ИЗ MP3 ==========
function loadJsMediaTags() {
    return new Promise((resolve, reject) => {
        if (window.jsmediatags) {
            resolve(window.jsmediatags);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';
        script.onload = () => resolve(window.jsmediatags);
        script.onerror = (error) => {
            console.error('Ошибка загрузки jsmediatags:', error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function extractAlbumArt(file) {
    try {
        const jsmediatags = await loadJsMediaTags();
        
        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    if (tag.tags && tag.tags.picture) {
                        const picture = tag.tags.picture;
                        const base64String = arrayBufferToBase64(picture.data);
                        const imageUrl = `data:${picture.format};base64,${base64String}`;
                        resolve(imageUrl);
                    } else {
                        resolve(null);
                    }
                },
                onError: () => resolve(null)
            });
        });
    } catch (error) {
        return null;
    }
}

function updateAlbumArt(track) {
    if (track && track.albumArt) {
        const img = new Image();
        img.onload = () => drawImageAlbumArt(albumArt, img);
        img.onerror = () => drawGradientAlbumArt(albumArt, track.title || 'FOR SITY');
        img.src = track.albumArt;
    } else {
        drawGradientAlbumArt(albumArt, track ? track.title : 'FOR SITY');
    }
    
    if (track) {
        currentTrackTitle.textContent = track.title || 'Без названия';
        currentTrackArtist.textContent = track.artist || 'Неизвестный исполнитель';
    } else {
        currentTrackTitle.textContent = 'Нет трека';
        currentTrackArtist.textContent = '';
    }
}

// ========== ФУНКЦИИ ДЛЯ ИЗБРАННОГО ==========
function toggleLike() {
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
        const track = tracks[currentTrackIndex];
        const trackId = `${track.artist}-${track.title}`;
        
        const index = favorites.findIndex(f => f.id === trackId);
        if (index === -1) {
            favorites.push({
                id: trackId,
                ...track
            });
            likeBtn.textContent = '❤️';
            likeBtn.classList.add('active');
        } else {
            favorites.splice(index, 1);
            likeBtn.textContent = '🤍';
            likeBtn.classList.remove('active');
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesList();
    }
}

function updateLikeButton() {
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
        const track = tracks[currentTrackIndex];
        const trackId = `${track.artist}-${track.title}`;
        const isLiked = favorites.some(f => f.id === trackId);
        
        likeBtn.textContent = isLiked ? '❤️' : '🤍';
        likeBtn.classList.toggle('active', isLiked);
    }
}

function updateFavoritesList() {
    if (!favoritesList) return;
    favoritesList.innerHTML = '';
    
    favorites.forEach((track, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="track-info">
                <span class="track-title">${track.title || 'Без названия'}</span>
                <span class="track-artist">${track.artist || 'Неизвестный исполнитель'}</span>
            </div>
            <span class="like-icon active" onclick="removeFromFavorites('${track.id}')">❤️</span>
        `;
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('like-icon')) {
                const trackIndex = tracks.findIndex(t => 
                    t.artist === track.artist && t.title === track.title
                );
                if (trackIndex !== -1) {
                    playTrack(trackIndex);
                }
            }
        });
        favoritesList.appendChild(li);
    });
}

window.removeFromFavorites = function(trackId) {
    favorites = favorites.filter(f => f.id !== trackId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesList();
    updateLikeButton();
};

// ========== ФУНКЦИИ ДЛЯ ПЛЕЙЛИСТОВ ==========
function createPlaylist(name, author) {
    const newPlaylist = {
        id: Date.now().toString(),
        name: name,
        author: author,
        tracks: [],
        cover: null,
        createdAt: new Date().toISOString()
    };
    
    playlists.push(newPlaylist);
    localStorage.setItem('playlists', JSON.stringify(playlists));
    updatePlaylistsContainer();
    showNotification('Плейлист создан!');
}

function updatePlaylistsContainer() {
    if (!playlistsContainer) return;
    playlistsContainer.innerHTML = '';
    
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <div>
                <h4>${playlist.name}</h4>
                <p>Создал: ${playlist.author} • Треков: ${playlist.tracks.length}</p>
            </div>
            <span class="playlist-stats">📋</span>
        `;
        div.addEventListener('click', () => openPlaylistDetail(playlist.id));
        playlistsContainer.appendChild(div);
    });
}

function openPlaylistDetail(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    currentPlaylistId = playlistId;
    playlistDetailTitle.textContent = playlist.name;
    playlistEditName.value = playlist.name;
    playlistEditAuthor.value = playlist.author;
    
    // Рисуем обложку плейлиста
    if (playlist.cover) {
        const img = new Image();
        img.onload = () => drawImageAlbumArt(playlistCover, img);
        img.src = playlist.cover;
    } else {
        drawGradientAlbumArt(playlistCover, playlist.name);
    }
    
    // Отображаем треки в плейлисте
    updatePlaylistTracks();
    
    playlistDetailModal.classList.remove('hidden');
}

function updatePlaylistTracks() {
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    // Отображаем треки в плейлисте
    playlistTracks.innerHTML = '';
    playlist.tracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        trackDiv.innerHTML = `
            <div class="track-info">
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist}</span>
            </div>
            <button class="remove-btn" onclick="removeTrackFromPlaylist('${playlist.id}', ${index})">Удалить</button>
        `;
        trackDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-btn')) {
                const trackIndex = tracks.findIndex(t => t.url === track.url);
                if (trackIndex !== -1) {
                    playTrack(trackIndex);
                    playlistDetailModal.classList.add('hidden');
                }
            }
        });
        playlistTracks.appendChild(trackDiv);
    });
    
    // Отображаем доступные треки
    availableTracks.innerHTML = '';
    tracks.forEach((track, index) => {
        const isInPlaylist = playlist.tracks.some(t => t.url === track.url);
        if (!isInPlaylist) {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'track-item';
            trackDiv.innerHTML = `
                <div class="track-info">
                    <span class="track-title">${track.title}</span>
                    <span class="track-artist">${track.artist}</span>
                </div>
                <button class="add-btn" onclick="addTrackToPlaylist('${playlist.id}', ${index})">Добавить</button>
            `;
            availableTracks.appendChild(trackDiv);
        }
    });
}

window.addTrackToPlaylist = function(playlistId, trackIndex) {
    const playlist = playlists.find(p => p.id === playlistId);
    const track = tracks[trackIndex];
    
    if (playlist && track) {
        playlist.tracks.push({...track});
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistTracks();
        updatePlaylistsContainer();
        showNotification('Трек добавлен в плейлист');
    }
};

window.removeTrackFromPlaylist = function(playlistId, trackIndex) {
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (playlist) {
        playlist.tracks.splice(trackIndex, 1);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistTracks();
        updatePlaylistsContainer();
        showNotification('Трек удален из плейлиста');
    }
};

// Переименование плейлиста
renamePlaylistBtn.addEventListener('click', () => {
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (playlist) {
        const newName = playlistEditName.value.trim();
        const newAuthor = playlistEditAuthor.value.trim();
        
        if (newName) playlist.name = newName;
        if (newAuthor) playlist.author = newAuthor;
        
        localStorage.setItem('playlists', JSON.stringify(playlists));
        playlistDetailTitle.textContent = playlist.name;
        updatePlaylistsContainer();
        drawGradientAlbumArt(playlistCover, playlist.name);
        showNotification('Плейлист обновлен');
    }
});

// Удаление плейлиста
deletePlaylistBtn.addEventListener('click', () => {
    if (confirm('Удалить плейлист?')) {
        playlists = playlists.filter(p => p.id !== currentPlaylistId);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        playlistDetailModal.classList.add('hidden');
        updatePlaylistsContainer();
        showNotification('Плейлист удален');
    }
});

// Загрузка обложки для плейлиста
changePlaylistCoverBtn.addEventListener('click', () => {
    coverFileInput.click();
});

coverFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist) {
            playlist.cover = event.target.result;
            localStorage.setItem('playlists', JSON.stringify(playlists));
            
            const img = new Image();
            img.onload = () => drawImageAlbumArt(playlistCover, img);
            img.src = event.target.result;
            showNotification('Обложка обновлена');
        }
    };
    reader.readAsDataURL(file);
});

// ========== НАВИГАЦИЯ ПО БИБЛИОТЕКЕ ==========
showPlaylistsBtn.addEventListener('click', () => {
    showPlaylistsBtn.classList.add('active');
    showFavoritesBtn.classList.remove('active');
    showAllTracksBtn.classList.remove('active');
    
    playlistsSection.classList.remove('hidden');
    favoritesSection.classList.add('hidden');
    allTracksSection.classList.add('hidden');
});

showFavoritesBtn.addEventListener('click', () => {
    showFavoritesBtn.classList.add('active');
    showPlaylistsBtn.classList.remove('active');
    showAllTracksBtn.classList.remove('active');
    
    favoritesSection.classList.remove('hidden');
    playlistsSection.classList.add('hidden');
    allTracksSection.classList.add('hidden');
});

showAllTracksBtn.addEventListener('click', () => {
    showAllTracksBtn.classList.add('active');
    showPlaylistsBtn.classList.remove('active');
    showFavoritesBtn.classList.remove('active');
    
    allTracksSection.classList.remove('hidden');
    playlistsSection.classList.add('hidden');
    favoritesSection.classList.add('hidden');
});

// ========== МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ПЛЕЙЛИСТА ==========
createPlaylistBtn.addEventListener('click', () => {
    playlistModal.classList.remove('hidden');
});

cancelPlaylistBtn.addEventListener('click', () => {
    playlistModal.classList.add('hidden');
    playlistName.value = '';
    playlistAuthor.value = '';
});

savePlaylistBtn.addEventListener('click', () => {
    const name = playlistName.value.trim();
    const author = playlistAuthor.value.trim();
    
    if (name && author) {
        createPlaylist(name, author);
        playlistModal.classList.add('hidden');
        playlistName.value = '';
        playlistAuthor.value = '';
    } else {
        showNotification('Заполните все поля!');
    }
});

closePlaylistDetailBtn.addEventListener('click', () => {
    playlistDetailModal.classList.add('hidden');
    currentPlaylistId = null;
});

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

function getNextTrackIndex() {
    if (tracks.length === 0) return -1;
    
    if (repeatMode === 2) {
        return currentTrackIndex;
    }
    
    if (shuffleMode) {
        if (shuffledIndices.length === 0) {
            shuffledIndices = Array.from({ length: tracks.length }, (_, i) => i);
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }
        }
        
        const nextIndex = shuffledIndices.shift();
        return nextIndex;
    }
    
    if (currentTrackIndex < tracks.length - 1) {
        return currentTrackIndex + 1;
    } else if (repeatMode === 1) {
        return 0;
    }
    
    return -1;
}

function getPrevTrackIndex() {
    if (tracks.length === 0) return -1;
    
    if (repeatMode === 2) {
        return currentTrackIndex;
    }
    
    if (currentTrackIndex > 0) {
        return currentTrackIndex - 1;
    } else if (repeatMode === 1) {
        return tracks.length - 1;
    }
    
    return -1;
}

function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        audio.pause();
        
        currentTrackIndex = index;
        audio.src = tracks[index].url;
        
        if (shuffleMode) {
            shuffledIndices = shuffledIndices.filter(i => i !== index);
        }
        
        audio.onerror = function(e) {
            showNotification('Не удалось загрузить трек');
            isPlaying = false;
            playPauseBtn.textContent = '▶️';
        };
        
        audio.play().then(() => {
            isPlaying = true;
            playPauseBtn.textContent = '⏸️';
            updatePlaylist();
            updateAlbumArt(tracks[currentTrackIndex]);
            updateLikeButton();
            
            if (!isEQInitialized) {
                setTimeout(() => {
                    initEQ();
                }, 200);
            }
            
        }).catch(error => {
            showNotification('Не удалось воспроизвести трек');
            isPlaying = false;
            playPauseBtn.textContent = '▶️';
        });
    }
}

function togglePlay() {
    if (tracks.length === 0) {
        showNotification('Сначала добавьте треки!');
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        playPauseBtn.textContent = '▶️';
        isPlaying = false;
    } else {
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else {
            audio.play().then(() => {
                playPauseBtn.textContent = '⏸️';
                isPlaying = true;
            }).catch(error => {
                showNotification('Не удалось воспроизвести трек');
            });
        }
    }
}

function playNext() {
    if (tracks.length === 0) return;
    if (currentTrackIndex === -1) {
        playTrack(0);
    } else {
        const nextIndex = getNextTrackIndex();
        if (nextIndex !== -1) {
            playTrack(nextIndex);
        }
    }
}

function playPrev() {
    if (tracks.length === 0) return;
    if (currentTrackIndex === -1) {
        playTrack(0);
    } else {
        const prevIndex = getPrevTrackIndex();
        if (prevIndex !== -1) {
            playTrack(prevIndex);
        }
    }
}

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

let currentQ = 2.5; // Установлено 2.5

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
            filter.Q.value = currentQ;
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
        filters[i].gain.value = eqSettings[frequencies[i]];
        filters[i].Q.value = currentQ;
    }
    
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
    localStorage.setItem('eqQ', currentQ);
}

function updateQ(value) {
    currentQ = parseFloat(value);
    if (qSlider) qSlider.value = currentQ;
    if (qValue) qValue.textContent = currentQ.toFixed(1);
    
    if (filters.length > 0 && isEQInitialized) {
        for (let filter of filters) {
            filter.Q.value = currentQ;
        }
    }
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
    showNotification('✅ Ваш пресет применен');
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
    showNotification('🔄 Эквалайзер сброшен');
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
        } catch (e) {}
    }
    
    const savedQ = localStorage.getItem('eqQ');
    if (savedQ) {
        currentQ = parseFloat(savedQ);
        updateQ(currentQ);
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
    uploadBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) {
            showNotification('Выберите файл!');
            return;
        }
        
        if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
            showNotification('Выберите MP3 файл');
            return;
        }
        
        try {
            const fileUrl = URL.createObjectURL(file);
            const fileName = file.name.replace('.mp3', '').replace('.MP3', '');
            
            showNotification('Чтение метаданных...');
            const albumArtUrl = await extractAlbumArt(file);
            
            tracks.push({
                url: fileUrl,
                title: fileName,
                artist: 'Загружено с ПК',
                albumArt: albumArtUrl
            });
            
            updatePlaylist();
            fileInput.value = '';
            showNotification('Файл загружен!');
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            showNotification('Ошибка загрузки');
        }
    });
}

// ========== ОЧИСТКА ПЛЕЙЛИСТА ==========
if (clearPlaylistBtn) {
    clearPlaylistBtn.addEventListener('click', () => {
        tracks.forEach(track => {
            if (track.url && track.url.startsWith('blob:')) {
                URL.revokeObjectURL(track.url);
            }
        });
        
        tracks = [];
        currentTrackIndex = -1;
        isPlaying = false;
        audio.pause();
        audio.src = '';
        playPauseBtn.textContent = '▶️';
        updatePlaylist();
        drawGradientAlbumArt(albumArt, 'FOR SITY');
        currentTrackTitle.textContent = 'Нет трека';
        currentTrackArtist.textContent = '';
        showNotification('Плейлист очищен');
    });
}

// ========== ОБРАБОТЧИКИ РЕЖИМОВ ==========
if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
        repeatMode = (repeatMode + 1) % 3;
        updateModeButtons();
        
        const messages = ['🔁 Повтор выключен', '🔁 Повтор плейлиста', '🔂 Повтор одного трека'];
        showNotification(messages[repeatMode]);
    });
}

if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
        shuffleMode = !shuffleMode;
        if (shuffleMode) {
            shuffledIndices = [];
        }
        updateModeButtons();
        showNotification(shuffleMode ? '🔀 Перемешивание включено' : '🔀 Перемешивание выключено');
    });
}

// ========== ЛАЙК ==========
if (likeBtn) {
    likeBtn.addEventListener('click', toggleLike);
}

// ========== НАВИГАЦИЯ ПО ТРЕКАМ ==========
if (prevBtn) {
    prevBtn.addEventListener('click', playPrev);
}

if (nextBtn) {
    nextBtn.addEventListener('click', playNext);
}

// ========== УПРАВЛЕНИЕ Q-ФАКТОРОМ ==========
if (qSlider && qValue) {
    qSlider.addEventListener('input', (e) => {
        updateQ(e.target.value);
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
        playPauseBtn.textContent = '▶️';
        currentTrackIndex = -1;
        if (progressBar) progressBar.value = 0;
        if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
        updatePlaylist();
        drawGradientAlbumArt(albumArt, 'FOR SITY');
        currentTrackTitle.textContent = 'Нет трека';
        currentTrackArtist.textContent = '';
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
        showNotification('Настройки сохранены');
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    initVolume();
    loadEQSettings();
    initEQSliders();
    updateModeButtons();
    
    tg.ready();
});

// Очистка временных ссылок при закрытии
window.addEventListener('beforeunload', () => {
    tracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
});

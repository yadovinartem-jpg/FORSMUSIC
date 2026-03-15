// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Адрес бэкенд-сервера (ваш URL)
const API_URL = 'https://stunning-enigma-7vj6wv7x996vhx5px-3000.app.github.dev/api';

// ========== ЭЛЕМЕНТЫ ==========
// Шапка
const uploadBtn = document.getElementById('uploadBtn');

// Модальное окно загрузки
const uploadModal = document.getElementById('uploadModal');
const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const fileInput = document.getElementById('fileInput');
const pendingTracksList = document.getElementById('pendingTracksList');
const confirmUploadBtn = document.getElementById('confirmUploadBtn');

// Модальное окно плейлистов
const playlistModal = document.getElementById('playlistModal');
const closePlaylistModalBtn = document.getElementById('closePlaylistModalBtn');
const playlistModalTitle = document.getElementById('playlistModalTitle');
const playlistCoverEdit = document.getElementById('playlistCoverEdit');
const playlistNameInput = document.getElementById('playlistNameInput');
const playlistDescInput = document.getElementById('playlistDescInput');
const playlistSearchInput = document.getElementById('playlistSearchInput');
const availableTracksList = document.getElementById('availableTracksList');
const playlistTracksList = document.getElementById('playlistTracksList');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
const changePlaylistCoverBtn = document.getElementById('changePlaylistCoverBtn');
const coverFileInput = document.getElementById('coverFileInput');

// Меню троеточия
const trackMenu = document.getElementById('trackMenu');
const closeTrackMenuBtn = document.getElementById('closeTrackMenuBtn');
const showAddToPlaylistBtn = document.getElementById('showAddToPlaylistBtn');
const deleteTrackBtn = document.getElementById('deleteTrackBtn');

// Меню выбора плейлиста
const playlistChoiceMenu = document.getElementById('playlistChoiceMenu');
const closePlaylistChoiceBtn = document.getElementById('closePlaylistChoiceBtn');
const playlistChoiceList = document.getElementById('playlistChoiceList');

// Модальное окно эквалайзера
const eqModal = document.getElementById('eqModal');
const closeEqModalBtn = document.getElementById('closeEqModalBtn');

// Плейлисты
const playlistsGrid = document.getElementById('playlistsGrid');

// Треклист
const tracklist = document.getElementById('tracklist');

// Плеер
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const repeatBtn = document.getElementById('repeatBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const toggleEqBtn = document.getElementById('toggleEqBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const volumePercent = document.getElementById('volumePercent');
const albumArt = document.getElementById('albumArt');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');

// Эквалайзер элементы
const qSlider = document.getElementById('qSlider');
const qValue = document.getElementById('qValue');
const applyMyPresetBtn = document.getElementById('applyMyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');

// Аудио элемент
const audio = new Audio();

// ========== НАСТРОЙКИ АУДИО ==========
audio.preload = 'auto';
audio.crossOrigin = 'anonymous';

// ========== ДАННЫЕ ==========
let isPlaying = false;
let currentTrackIndex = -1;
let tracks = [];
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let pendingTracks = [];
let currentPlaylistId = null;
let currentTrackForMenu = null;
let repeatMode = 0;
let shuffleMode = false;
let shuffledIndices = [];

// ========== MEDIA SESSION API ==========
function setupMediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    
    console.log('🎵 Настройка Media Session для трека:', track.title);
    
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Без названия',
        artist: track.artist || 'Неизвестный исполнитель',
        album: 'Моя коллекция',
        artwork: track.albumArt ? [
            { src: track.albumArt, sizes: '96x96', type: 'image/jpeg' },
            { src: track.albumArt, sizes: '128x128', type: 'image/jpeg' },
            { src: track.albumArt, sizes: '192x192', type: 'image/jpeg' },
            { src: track.albumArt, sizes: '256x256', type: 'image/jpeg' },
            { src: track.albumArt, sizes: '384x384', type: 'image/jpeg' },
            { src: track.albumArt, sizes: '512x512', type: 'image/jpeg' }
        ] : [
            { src: 'icons/maskable_icon_x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/maskable_icon_x512.png', sizes: '512x512', type: 'image/png' }
        ]
    });
    
    if (!navigator.mediaSession._handlersSet) {
        navigator.mediaSession.setActionHandler('play', () => {
            audio.play();
            navigator.mediaSession.playbackState = 'playing';
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            audio.pause();
            navigator.mediaSession.playbackState = 'paused';
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (typeof playPrev === 'function') playPrev();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (typeof playNext === 'function') playNext();
        });
        
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const skipTime = details.seekOffset || 10;
            audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const skipTime = details.seekOffset || 10;
            audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
        });
        
        navigator.mediaSession._handlersSet = true;
    }
    
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    
    if (audio.duration) {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime
        });
    }
}

// ========== СОХРАНЕНИЕ И ЗАГРУЗКА ТРЕКОВ ==========
function saveTracks() {
    try {
        const tracksToSave = tracks.map(track => ({
            path: track.path,
            title: track.title,
            artist: track.artist,
            albumArt: track.albumArt
        }));
        localStorage.setItem('forsity_tracks', JSON.stringify(tracksToSave));
        console.log('✅ Треки сохранены, количество:', tracks.length);
    } catch (e) {
        console.error('❌ Ошибка сохранения треков:', e);
    }
}

function loadTracks() {
    try {
        const saved = localStorage.getItem('forsity_tracks');
        if (saved) {
            tracks = JSON.parse(saved);
            console.log('✅ Загружено треков из localStorage:', tracks.length);
        } else {
            tracks = [];
            console.log('ℹ️ Нет сохранённых треков');
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки треков:', e);
        tracks = [];
    }
    
    updateTracklist();
}

// Загружаем треки при старте
loadTracks();

// ========== ИНИЦИАЛИЗАЦИЯ ==========
updatePlaylistsGrid();

// ========== ФУНКЦИИ ДЛЯ РИСОВАНИЯ ==========
function drawGradientAlbumArt(canvas) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#32007d');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawImageAlbumArt(canvas, img) {
    if (!canvas || !canvas.getContext || !img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// Рисуем стандартную обложку
if (albumArt) drawGradientAlbumArt(albumArt);
if (playlistCoverEdit) drawGradientAlbumArt(playlistCoverEdit);

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С MP3 ==========
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

async function extractMetadata(file) {
    try {
        const jsmediatags = await loadJsMediaTags();
        
        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const metadata = {
                        title: null,
                        artist: null,
                        albumArt: null
                    };
                    
                    if (tag.tags && tag.tags.title) {
                        metadata.title = tag.tags.title;
                    }
                    
                    if (tag.tags && tag.tags.artist) {
                        metadata.artist = tag.tags.artist;
                    }
                    
                    if (tag.tags && tag.tags.picture) {
                        const picture = tag.tags.picture;
                        const base64String = arrayBufferToBase64(picture.data);
                        metadata.albumArt = `data:${picture.format};base64,${base64String}`;
                    }
                    
                    resolve(metadata);
                },
                onError: () => resolve({ title: null, artist: null, albumArt: null })
            });
        });
    } catch (error) {
        return { title: null, artist: null, albumArt: null };
    }
}

// ========== ЗАГРУЗКА ТРЕКОВ ==========
uploadBtn.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
    fileInput.value = '';
    pendingTracks = [];
    updatePendingTracksList();
    confirmUploadBtn.disabled = true;
});

closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
});

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    pendingTracks = [];
    
    for (const file of files) {
        if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
            continue;
        }
        
        const fileName = file.name.replace('.mp3', '').replace('.MP3', '');
        const metadata = await extractMetadata(file);
        
        pendingTracks.push({
            file: file,
            title: metadata.title || fileName,
            artist: metadata.artist || '',
            albumArt: metadata.albumArt,
            fileName: fileName
        });
    }
    
    updatePendingTracksList();
    confirmUploadBtn.disabled = pendingTracks.length === 0;
});

function updatePendingTracksList() {
    pendingTracksList.innerHTML = '';
    
    pendingTracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'pending-track-item';
        
        let coverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'pending-track-cover';
            img.src = track.albumArt;
            coverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'pending-track-cover';
            canvas.width = 50;
            canvas.height = 50;
            const coverCtx = canvas.getContext('2d');
            const gradient = coverCtx.createLinearGradient(0, 0, 50, 50);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            coverCtx.fillStyle = gradient;
            coverCtx.fillRect(0, 0, 50, 50);
            coverHtml = canvas.outerHTML;
        }
        
        trackDiv.innerHTML = `
            <div class="pending-track-header">
                ${coverHtml}
                <div class="pending-track-info">
                    <div class="pending-track-title">${track.title}</div>
                    <div class="pending-track-filename">${track.fileName}</div>
                </div>
            </div>
            <div class="pending-track-edit">
                <input type="text" class="pending-edit-title" data-index="${index}" value="${track.title}" placeholder="Название">
                <input type="text" class="pending-edit-artist" data-index="${index}" value="${track.artist}" placeholder="Исполнитель">
            </div>
        `;
        
        pendingTracksList.appendChild(trackDiv);
    });
    
    document.querySelectorAll('.pending-edit-title').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = e.target.dataset.index;
            pendingTracks[index].title = e.target.value;
        });
    });
    
    document.querySelectorAll('.pending-edit-artist').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = e.target.dataset.index;
            pendingTracks[index].artist = e.target.value;
        });
    });
}

function showLoading(message) {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 18px;
        backdrop-filter: blur(5px);
    `;
    loader.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <div>${message}</div>
        </div>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ==========
confirmUploadBtn.addEventListener('click', async () => {
    showLoading('Загрузка и сжатие треков...');
    
    let uploadedCount = 0;
    const newTracks = [];
    
    for (const track of pendingTracks) {
        try {
            const formData = new FormData();
            formData.append('audio', track.file);
            formData.append('title', track.title);
            formData.append('artist', track.artist);
            
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки');
            }
            
            const result = await response.json();
            console.log('✅ Ответ от сервера:', result);
            
            if (!result.file || !result.file.path) {
                console.error('❌ Сервер не вернул path!');
                continue;
            }
            
            newTracks.push({
                path: result.file.path,
                title: result.file.title,
                artist: result.file.artist,
                albumArt: track.albumArt
            });
            
            uploadedCount++;
            
        } catch (error) {
            console.error('Ошибка загрузки трека:', error);
        }
    }
    
    tracks = [...newTracks, ...tracks];
    saveTracks();
    updateTracklist();
    uploadModal.classList.add('hidden');
    hideLoading();
    
    console.log('✅ Загружено треков:', uploadedCount);
});

// ========== ТРЕКЛИСТ ==========
function updateTracklist() {
    if (!tracklist) return;
    
    tracklist.innerHTML = '';
    
    if (tracks.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Нет треков';
        li.style.justifyContent = 'center';
        li.style.cursor = 'default';
        li.style.padding = '20px';
        li.style.textAlign = 'center';
        li.style.color = '#999';
        tracklist.appendChild(li);
        return;
    }
    
    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'tracklist-item';
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        
        let miniCoverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
            img.onerror = () => {
                const canvas = document.createElement('canvas');
                canvas.className = 'track-mini-cover';
                canvas.width = 40;
                canvas.height = 40;
                const miniCtx = canvas.getContext('2d');
                const gradient = miniCtx.createLinearGradient(0, 0, 40, 40);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                miniCtx.fillStyle = gradient;
                miniCtx.fillRect(0, 0, 40, 40);
                img.parentNode.replaceChild(canvas, img);
            };
            miniCoverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'track-mini-cover';
            canvas.width = 40;
            canvas.height = 40;
            const miniCtx = canvas.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 40, 40);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 40, 40);
            miniCoverHtml = canvas.outerHTML;
        }
        
        li.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${track.title || 'Без названия'}</span>
                <span class="track-artist">${track.artist || ''}</span>
            </div>
            <button class="track-menu-btn">⋮</button>
        `;
        
        const menuBtn = li.querySelector('.track-menu-btn');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTrackMenu(index);
        });
        
        li.addEventListener('click', () => playTrack(index));
        
        tracklist.appendChild(li);
    });
}

// ========== ФУНКЦИЯ ВОСПРОИЗВЕДЕНИЯ ==========
function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        audio.pause();
        
        currentTrackIndex = index;
        
        if (!tracks[index].path) {
            console.error('❌ У трека нет path:', tracks[index]);
            return;
        }
        
        const streamUrl = `${API_URL}/stream/${encodeURIComponent(tracks[index].path)}`;
        console.log('▶️ Воспроизведение через прокси:', streamUrl);
        
        audio.src = '';
        audio.removeAttribute('src');
        
        while (audio.firstChild) {
            audio.removeChild(audio.firstChild);
        }
        
        const source = document.createElement('source');
        source.src = streamUrl;
        source.type = 'audio/ogg';
        audio.appendChild(source);
        
        const source2 = document.createElement('source');
        source2.src = streamUrl;
        source2.type = 'audio/opus';
        audio.appendChild(source2);
        
        const source3 = document.createElement('source');
        source3.src = streamUrl;
        source3.type = 'audio/mpeg';
        audio.appendChild(source3);
        
        audio.load();
        
        if (shuffleMode) {
            shuffledIndices = shuffledIndices.filter(i => i !== index);
        }
        
        audio.onerror = function(e) {
            console.error('❌ Audio error:', e);
            console.error('❌ Audio error code:', audio.error ? audio.error.code : 'unknown');
            console.error('❌ Audio error message:', audio.error ? audio.error.message : 'unknown');
        };
        
        audio.oncanplay = function() {
            console.log('✅ Можно воспроизводить');
            audio.play().then(() => {
                console.log('✅ Воспроизведение успешно');
                isPlaying = true;
                playPauseBtn.textContent = '⏸️';
                updateTracklist();
                updateAlbumArt(tracks[currentTrackIndex]);
                
                setupMediaSession(tracks[currentTrackIndex]);
                
                if (!isEQInitialized) {
                    setTimeout(() => {
                        initEQ();
                    }, 200);
                }
                
            }).catch(error => {
                console.error('❌ Play error:', error);
                isPlaying = false;
                playPauseBtn.textContent = '▶️';
            });
        };
        
        audio.onplaying = function() {
            console.log('▶️ Воспроизведение началось');
            isPlaying = true;
            playPauseBtn.textContent = '⏸️';
            navigator.mediaSession.playbackState = 'playing';
        };
        
        audio.onpause = function() {
            navigator.mediaSession.playbackState = 'paused';
        };
        
        setTimeout(() => {
            if (!isPlaying && audio.readyState >= 2) {
                audio.play().catch(err => {
                    console.error('❌ Таймаут воспроизведения:', err);
                });
            }
        }, 2000);
    }
}

// ========== МЕНЮ ТРЕКА ==========
function openTrackMenu(trackIndex) {
    currentTrackForMenu = trackIndex;
    trackMenu.classList.remove('hidden');
}

closeTrackMenuBtn.addEventListener('click', () => {
    trackMenu.classList.add('hidden');
});

trackMenu.addEventListener('click', (e) => {
    if (e.target === trackMenu) {
        trackMenu.classList.add('hidden');
    }
});

// ========== ДОБАВЛЕНИЕ В ПЛЕЙЛИСТ ==========
showAddToPlaylistBtn.addEventListener('click', () => {
    trackMenu.classList.add('hidden');
    updatePlaylistChoiceList();
    playlistChoiceMenu.classList.remove('hidden');
});

closePlaylistChoiceBtn.addEventListener('click', () => {
    playlistChoiceMenu.classList.add('hidden');
});

playlistChoiceMenu.addEventListener('click', (e) => {
    if (e.target === playlistChoiceMenu) {
        playlistChoiceMenu.classList.add('hidden');
    }
});

function updatePlaylistChoiceList() {
    playlistChoiceList.innerHTML = '';
    
    if (playlists.length === 0) {
        const div = document.createElement('div');
        div.className = 'playlist-choice-item';
        div.innerHTML = '<span style="color: #999; padding: 15px;">Нет плейлистов</span>';
        playlistChoiceList.appendChild(div);
        return;
    }
    
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.className = 'playlist-choice-item';
        
        let coverHtml = '';
        if (playlist.cover) {
            const img = document.createElement('img');
            img.className = 'playlist-choice-cover';
            img.src = playlist.cover;
            img.onerror = () => {
                const canvas = document.createElement('canvas');
                canvas.className = 'playlist-choice-cover';
                canvas.width = 40;
                canvas.height = 40;
                const coverCtx = canvas.getContext('2d');
                const gradient = coverCtx.createLinearGradient(0, 0, 40, 40);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                coverCtx.fillStyle = gradient;
                coverCtx.fillRect(0, 0, 40, 40);
                img.parentNode.replaceChild(canvas, img);
            };
            coverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'playlist-choice-cover';
            canvas.width = 40;
            canvas.height = 40;
            const coverCtx = canvas.getContext('2d');
            const gradient = coverCtx.createLinearGradient(0, 0, 40, 40);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            coverCtx.fillStyle = gradient;
            coverCtx.fillRect(0, 0, 40, 40);
            coverHtml = canvas.outerHTML;
        }
        
        div.innerHTML = `
            ${coverHtml}
            <div class="playlist-choice-info">
                <div class="playlist-choice-name">${playlist.name}</div>
                <div class="playlist-choice-count">${playlist.tracks.length} треков</div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            addTrackToPlaylist(playlist.id);
        });
        
        playlistChoiceList.appendChild(div);
    });
}

function addTrackToPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || currentTrackForMenu === null) return;
    
    const track = tracks[currentTrackForMenu];
    
    if (!playlist.tracks.some(t => t.path === track.path)) {
        playlist.tracks.push({...track});
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistsGrid();
    }
    
    playlistChoiceMenu.classList.add('hidden');
}

// ========== УДАЛЕНИЕ ТРЕКА ==========
deleteTrackBtn.addEventListener('click', async () => {
    if (currentTrackForMenu === null) return;
    
    const trackToDelete = tracks[currentTrackForMenu];
    
    if (trackToDelete.path) {
        try {
            await fetch(`${API_URL}/track/${encodeURIComponent(trackToDelete.path)}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Ошибка удаления с Яндекс.Диска:', error);
        }
    }
    
    playlists.forEach(playlist => {
        playlist.tracks = playlist.tracks.filter(t => t.path !== trackToDelete.path);
    });
    localStorage.setItem('playlists', JSON.stringify(playlists));
    
    tracks.splice(currentTrackForMenu, 1);
    saveTracks();
    
    if (currentTrackIndex === currentTrackForMenu) {
        audio.pause();
        isPlaying = false;
        playPauseBtn.textContent = '▶️';
        currentTrackIndex = -1;
        updateAlbumArt(null);
        progressBar.value = 0;
        timeDisplay.textContent = '0:00 / 0:00';
    } else if (currentTrackIndex > currentTrackForMenu) {
        currentTrackIndex--;
    }
    
    updateTracklist();
    updatePlaylistsGrid();
    trackMenu.classList.add('hidden');
    currentTrackForMenu = null;
});

// ========== ПЛЕЙЛИСТЫ ==========
function updatePlaylistsGrid() {
    playlistsGrid.innerHTML = '';
    
    playlists.forEach(playlist => {
        const square = document.createElement('div');
        square.className = 'playlist-square';
        
        let coverHtml = '';
        if (playlist.cover) {
            const img = document.createElement('img');
            img.className = 'playlist-square-cover';
            img.src = playlist.cover;
            img.onerror = function() {
                const canvas = document.createElement('canvas');
                canvas.className = 'playlist-square-cover';
                canvas.width = 60;
                canvas.height = 60;
                const coverCtx = canvas.getContext('2d');
                const gradient = coverCtx.createLinearGradient(0, 0, 60, 60);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                coverCtx.fillStyle = gradient;
                coverCtx.fillRect(0, 0, 60, 60);
                this.parentNode.replaceChild(canvas, this);
            };
            coverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'playlist-square-cover';
            canvas.width = 60;
            canvas.height = 60;
            const coverCtx = canvas.getContext('2d');
            const gradient = coverCtx.createLinearGradient(0, 0, 60, 60);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            coverCtx.fillStyle = gradient;
            coverCtx.fillRect(0, 0, 60, 60);
            coverHtml = canvas.outerHTML;
        }
        
        square.innerHTML = `
            ${coverHtml}
            <div class="playlist-square-name">${playlist.name}</div>
            <div class="playlist-square-count">${playlist.tracks.length} треков</div>
        `;
        
        square.addEventListener('click', () => openPlaylistEditor(playlist.id));
        
        playlistsGrid.appendChild(square);
    });
    
    const newSquare = document.createElement('div');
    newSquare.className = 'playlist-square';
    newSquare.style.background = '#1a1a1a';
    newSquare.innerHTML = `
        <div style="font-size: 30px; color: #666; margin-bottom: 5px;">➕</div>
        <div class="playlist-square-name">Создать</div>
    `;
    newSquare.addEventListener('click', () => openPlaylistEditor());
    playlistsGrid.appendChild(newSquare);
}

function openPlaylistEditor(playlistId = null) {
    currentPlaylistId = playlistId;
    
    if (playlistId) {
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlistModalTitle.textContent = 'Редактировать плейлист';
            playlistNameInput.value = playlist.name || '';
            playlistDescInput.value = playlist.desc || '';
            
            if (playlist.cover) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => drawImageAlbumArt(playlistCoverEdit, img);
                img.onerror = () => drawGradientAlbumArt(playlistCoverEdit);
                img.src = playlist.cover;
            } else {
                drawGradientAlbumArt(playlistCoverEdit);
            }
            
            deletePlaylistBtn.classList.remove('hidden');
        }
    } else {
        playlistModalTitle.textContent = 'Создать плейлист';
        playlistNameInput.value = '';
        playlistDescInput.value = '';
        drawGradientAlbumArt(playlistCoverEdit);
        deletePlaylistBtn.classList.add('hidden');
    }
    
    updateAvailableTracksList();
    updatePlaylistTracksList();
    
    playlistModal.classList.remove('hidden');
}

closePlaylistModalBtn.addEventListener('click', () => {
    playlistModal.classList.add('hidden');
});

function updateAvailableTracksList() {
    availableTracksList.innerHTML = '';
    
    const searchTerm = playlistSearchInput ? playlistSearchInput.value.toLowerCase() : '';
    const filteredTracks = tracks.filter(track => 
        track.title.toLowerCase().includes(searchTerm) || 
        (track.artist && track.artist.toLowerCase().includes(searchTerm))
    );
    
    filteredTracks.forEach((track) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track-item';
        
        let miniCoverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
            img.onerror = () => {
                const canvas = document.createElement('canvas');
                canvas.className = 'track-mini-cover';
                canvas.width = 30;
                canvas.height = 30;
                const miniCtx = canvas.getContext('2d');
                const gradient = miniCtx.createLinearGradient(0, 0, 30, 30);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                miniCtx.fillStyle = gradient;
                miniCtx.fillRect(0, 0, 30, 30);
                img.parentNode.replaceChild(canvas, img);
            };
            miniCoverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'track-mini-cover';
            canvas.width = 30;
            canvas.height = 30;
            const miniCtx = canvas.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 30, 30);
            miniCoverHtml = canvas.outerHTML;
        }
        
        trackDiv.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist || ''}</span>
            </div>
            <button class="add-to-playlist">+</button>
        `;
        
        const addBtn = trackDiv.querySelector('.add-to-playlist');
        
        if (currentPlaylistId) {
            const playlist = playlists.find(p => p.id === currentPlaylistId);
            if (playlist) {
                const isInPlaylist = playlist.tracks.some(t => t.path === track.path);
                if (isInPlaylist) {
                    addBtn.style.display = 'none';
                }
            }
        }
        
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addTrackToCurrentPlaylist(track);
        });
        
        trackDiv.addEventListener('click', () => {
            const trackIndex = tracks.findIndex(t => t.path === track.path);
            if (trackIndex !== -1) {
                playTrack(trackIndex);
            }
        });
        
        availableTracksList.appendChild(trackDiv);
    });
}

function updatePlaylistTracksList() {
    if (!currentPlaylistId) {
        playlistTracksList.innerHTML = '';
        return;
    }
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    playlistTracksList.innerHTML = '';
    
    playlist.tracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track-item';
        
        let miniCoverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
            img.onerror = () => {
                const canvas = document.createElement('canvas');
                canvas.className = 'track-mini-cover';
                canvas.width = 30;
                canvas.height = 30;
                const miniCtx = canvas.getContext('2d');
                const gradient = miniCtx.createLinearGradient(0, 0, 30, 30);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                miniCtx.fillStyle = gradient;
                miniCtx.fillRect(0, 0, 30, 30);
                img.parentNode.replaceChild(canvas, img);
            };
            miniCoverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'track-mini-cover';
            canvas.width = 30;
            canvas.height = 30;
            const miniCtx = canvas.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 30, 30);
            miniCoverHtml = canvas.outerHTML;
        }
        
        trackDiv.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist || ''}</span>
            </div>
            <button class="remove-from-playlist">✕</button>
        `;
        
        const removeBtn = trackDiv.querySelector('.remove-from-playlist');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrackFromCurrentPlaylist(index);
        });
        
        trackDiv.addEventListener('click', () => {
            const trackIndex = tracks.findIndex(t => t.path === track.path);
            if (trackIndex !== -1) {
                playTrack(trackIndex);
            }
        });
        
        playlistTracksList.appendChild(trackDiv);
    });
}

function addTrackToCurrentPlaylist(track) {
    if (!currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    if (!playlist.tracks.some(t => t.path === track.path)) {
        playlist.tracks.push({...track});
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updateAvailableTracksList();
        updatePlaylistTracksList();
        updatePlaylistsGrid();
    }
}

function removeTrackFromCurrentPlaylist(trackIndex) {
    if (!currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    playlist.tracks.splice(trackIndex, 1);
    localStorage.setItem('playlists', JSON.stringify(playlists));
    updateAvailableTracksList();
    updatePlaylistTracksList();
    updatePlaylistsGrid();
}

savePlaylistBtn.addEventListener('click', () => {
    const name = playlistNameInput ? playlistNameInput.value.trim() : '';
    const desc = playlistDescInput ? playlistDescInput.value.trim() : '';
    
    if (!name) return;
    
    if (currentPlaylistId) {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist) {
            playlist.name = name;
            playlist.desc = desc;
        }
    } else {
        const newPlaylist = {
            id: Date.now().toString(),
            name: name,
            desc: desc,
            tracks: [],
            cover: null,
            createdAt: new Date().toISOString()
        };
        playlists.push(newPlaylist);
    }
    
    localStorage.setItem('playlists', JSON.stringify(playlists));
    updatePlaylistsGrid();
    playlistModal.classList.add('hidden');
});

deletePlaylistBtn.addEventListener('click', () => {
    if (currentPlaylistId) {
        playlists = playlists.filter(p => p.id !== currentPlaylistId);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistsGrid();
        playlistModal.classList.add('hidden');
    }
});

if (playlistSearchInput) {
    playlistSearchInput.addEventListener('input', updateAvailableTracksList);
}

// ========== ОБЛОЖКА ПЛЕЙЛИСТА ==========
changePlaylistCoverBtn.addEventListener('click', () => {
    coverFileInput.click();
});

coverFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            drawImageAlbumArt(playlistCoverEdit, img);
            
            if (currentPlaylistId) {
                const playlist = playlists.find(p => p.id === currentPlaylistId);
                if (playlist) {
                    playlist.cover = event.target.result;
                    localStorage.setItem('playlists', JSON.stringify(playlists));
                    updatePlaylistsGrid();
                }
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// ========== ФУНКЦИИ ПЛЕЕРА ==========
function updateAlbumArt(track) {
    if (!albumArt) return;
    
    if (track && track.albumArt) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => drawImageAlbumArt(albumArt, img);
        img.onerror = () => drawGradientAlbumArt(albumArt);
        img.src = track.albumArt;
    } else {
        drawGradientAlbumArt(albumArt);
    }
    
    if (track) {
        if (currentTrackTitle) currentTrackTitle.textContent = track.title || 'Без названия';
        if (currentTrackArtist) currentTrackArtist.textContent = track.artist || '';
    } else {
        if (currentTrackTitle) currentTrackTitle.textContent = 'Нет трека';
        if (currentTrackArtist) currentTrackArtist.textContent = '';
    }
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

function togglePlay() {
    if (tracks.length === 0) return;
    
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
                console.error('❌ Play error:', error);
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

repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    updateModeButtons();
});

shuffleBtn.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    if (shuffleMode) {
        shuffledIndices = [];
    }
    updateModeButtons();
});

// ========== ЭКВАЛАЙЗЕР ==========
let audioContext = null;
let source = null;
let filters = [];
let isEQInitialized = false;

const idByFrequency = {
    16: 'eq16',
    32: 'eq32',
    64: 'eq64',
    125: 'eq125',
    250: 'eq250',
    500: 'eq500',
    1000: 'eq1k',
    2000: 'eq2k',
    4000: 'eq4k',
    8000: 'eq8k',
    16000: 'eq16k',
    22000: 'eq22k'
};

const frequencies = [16, 32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 22000];

const myPreset = {
    16: 12,
    32: 12,
    64: 12,
    125: 9,
    250: 4,
    500: 5,
    1000: 2,
    2000: 2,
    4000: -1,
    8000: -2,
    16000: -3,
    22000: -5
};

let eqSettings = {
    16: 0,
    32: 0,
    64: 0,
    125: 0,
    250: 0,
    500: 0,
    1000: 0,
    2000: 0,
    4000: 0,
    8000: 0,
    16000: 0,
    22000: 0
};

let currentQ = 2.5;

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

// ========== УПРАВЛЕНИЕ ЭКВАЛАЙЗЕРОМ ==========
toggleEqBtn.addEventListener('click', () => {
    eqModal.classList.remove('hidden');
});

closeEqModalBtn.addEventListener('click', () => {
    eqModal.classList.add('hidden');
});

eqModal.addEventListener('click', (e) => {
    if (e.target === eqModal) {
        eqModal.classList.add('hidden');
    }
});

qSlider.addEventListener('input', (e) => {
    updateQ(e.target.value);
});

applyMyPresetBtn.addEventListener('click', applyMyPreset);
resetEqBtn.addEventListener('click', resetEQ);
saveEqBtn.addEventListener('click', () => {
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
});

// ========== СОБЫТИЯ ПЛЕЕРА ==========
playPauseBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

progressBar.addEventListener('input', () => {
    if (audio.duration && !isNaN(audio.duration)) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});

audio.addEventListener('timeupdate', () => {
    if (audio.duration && !isNaN(audio.duration) && progressBar && timeDisplay) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.value = progress;
        timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
    
    if ('mediaSession' in navigator && audio.duration) {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime
        });
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
        progressBar.value = 0;
        timeDisplay.textContent = '0:00 / 0:00';
        updateTracklist();
        updateAlbumArt(null);
    }
});

audio.addEventListener('loadedmetadata', () => {
    if (timeDisplay) {
        timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
    }
});

// ========== ГРОМКОСТЬ ==========
function initVolume() {
    if (!volumeSlider || !volumePercent || !volumeIcon) return;
    
    const savedVolume = localStorage.getItem('volume');
    let startVolume = 60;
    
    if (savedVolume !== null) {
        startVolume = parseInt(savedVolume);
    }
    
    audio.volume = startVolume / 100;
    volumeSlider.value = startVolume;
    volumePercent.textContent = startVolume + '%';
    updateVolumeIcon(startVolume);
    
    volumeSlider.addEventListener('input', function(e) {
        const volume = parseInt(e.target.value);
        audio.volume = volume / 100;
        volumePercent.textContent = volume + '%';
        updateVolumeIcon(volume);
        localStorage.setItem('volume', volume);
    });
}

function updateVolumeIcon(volume) {
    if (!volumeIcon) return;
    if (volume == 0) volumeIcon.textContent = '🔇';
    else if (volume < 30) volumeIcon.textContent = '🔈';
    else if (volume < 70) volumeIcon.textContent = '🔉';
    else volumeIcon.textContent = '🔊';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    initVolume();
    loadEQSettings();
    initEQSliders();
    updateModeButtons();
    updateAlbumArt(null);
    
    tg.ready();
});

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

// Кнопка установки PWA (опционально)
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const installBtn = document.createElement('button');
    installBtn.id = 'installPwaBtn';
    installBtn.className = 'install-btn hidden';
    installBtn.textContent = '📲 Установить приложение';
    
    document.querySelector('.player-main-block').prepend(installBtn);
    
    installBtn.classList.remove('hidden');
    
    installBtn.addEventListener('click', () => {
        installBtn.classList.add('hidden');
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ Пользователь установил приложение');
            }
            deferredPrompt = null;
        });
    });
});

// Очистка временных ссылок при закрытии
window.addEventListener('beforeunload', () => {
    tracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
});

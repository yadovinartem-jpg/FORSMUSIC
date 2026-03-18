// Инициализация Telegram Web App (с безопасным fallback для обычного браузера)
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

// Адрес бэкенд-сервера (ваш Render URL)
const API_URL = 'https://upgraded-giggle-5g7j5gv5wpw9365w-3000.app.github.dev/api'; 


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
const deleteTrackLocalBtn = document.getElementById('deleteTrackLocalBtn');
const deleteTrackCloudBtn = document.getElementById('deleteTrackCloudBtn');

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
const trackSortSelect = document.getElementById('trackSortSelect');
const recentTracksList = document.getElementById('recentTracksList');
const trackSearchInput = document.getElementById('trackSearchInput');
const searchResults = document.getElementById('searchResults');
const localSearchResults = document.getElementById('localSearchResults');
const remoteSearchResults = document.getElementById('remoteSearchResults');

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

// Аудио элемент (ИСПРАВЛЕНО!)
const audio = new Audio();
audio.crossOrigin = "anonymous"; // Критически важно для эквалайзера!

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
let recentTrackPaths = JSON.parse(localStorage.getItem('recent_tracks')) || [];
let currentTrackSort = localStorage.getItem('track_sort') || 'date_desc';
let trackSearchTimer = null;
let draftPlaylistTracks = [];

// [СОХРАНЕНИЕ И ЗАГРУЗКА ТРЕКОВ]
function saveTracks() {
    try {
        const tracksToSave = tracks.map(track => ({
            path: track.path,
            title: track.title,
            artist: track.artist,
            albumArt: track.albumArt,
            year: track.year || '',
            addedAt: track.addedAt || Date.now(),
            duration: track.duration || 0,
            url: track.url // для обратной совместимости
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
            tracks = JSON.parse(saved).map((track, index) => ({
                ...track,
                year: track.year || '',
                addedAt: track.addedAt || (Date.now() - index),
                duration: Number(track.duration) || 0
            }));
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
                        albumArt: null,
                        year: ''
                    };
                    
                    if (tag.tags && tag.tags.title) {
                        metadata.title = tag.tags.title;
                    }
                    
                    if (tag.tags && tag.tags.artist) {
                        metadata.artist = tag.tags.artist;
                    }
                    
                    if (tag.tags && tag.tags.year) {
                        metadata.year = String(tag.tags.year);
                    }

                    if (tag.tags && tag.tags.picture) {
                        const picture = tag.tags.picture;
                        const base64String = arrayBufferToBase64(picture.data);
                        metadata.albumArt = `data:${picture.format};base64,${base64String}`;
                    }
                    
                    resolve(metadata);
                },
                onError: () => resolve({ title: null, artist: null, albumArt: null, year: '' })
            });
        });
    } catch (error) {
        return { title: null, artist: null, albumArt: null, year: '' };
    }
}
function getTrackDurationValue(track = null) {
    const duration = Number(track?.duration);
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function readAudioDuration(file) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(0);
            return;
        }

        const tempAudio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);

        const cleanup = () => {
            tempAudio.src = '';
            URL.revokeObjectURL(objectUrl);
        };

        tempAudio.preload = 'metadata';
        tempAudio.onloadedmetadata = () => {
            const duration = Number(tempAudio.duration);
            cleanup();
            resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
        };
        tempAudio.onerror = () => {
            cleanup();
            resolve(0);
        };
        tempAudio.src = objectUrl;
    });
}

// [ЗАГРУЗКА ТРЕКОВ]
uploadBtn.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
    fileInput.value = '';
    pendingTracks = [];
    updatePendingTracksList();
    confirmUploadBtn.disabled = true;
});

closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
    // Очищаем временные URL
    pendingTracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
});

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Очищаем предыдущие временные URL
    pendingTracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
    
    pendingTracks = [];
    
    // Создаем массив промисов для параллельной обработки
    const metadataPromises = files.map(async (file) => {
        if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
            return null;
        }
        
        const fileUrl = URL.createObjectURL(file);
        const fileName = file.name.replace('.mp3', '').replace('.MP3', '');
        
        const metadata = await extractMetadata(file);
        const duration = await readAudioDuration(file);
        
        return {
            url: fileUrl,
            file: file,
            title: metadata.title || fileName,
            artist: metadata.artist || '',
            albumArt: metadata.albumArt,
            fileName: fileName,
            year: metadata.year || '',
            addedAt: Date.now()
        };
    });
    
    // Ждем завершения всех промисов
    const results = await Promise.all(metadataPromises);
    pendingTracks = results.filter(track => track !== null);
    updatePendingTracksList();
    confirmUploadBtn.disabled = pendingTracks.length === 0;
});

function updatePendingTracksList() {
    pendingTracksList.innerHTML = '';
    
    pendingTracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'pending-track-item';
        
        // Мини-обложка
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
    
    // Добавляем обработчики для полей ввода
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

// [ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ]
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
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
                albumArt: track.albumArt,
                year: track.year || '',
                addedAt: track.addedAt || Date.now(),
                duration: track.duration || 0,
                url: track.url // сохраняем blob URL для немедленного воспроизведения
            });
            
            uploadedCount++;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки трека:', error);
        }
    }
    
    tracks = [...newTracks, ...tracks];
    saveTracks();
    updateTracklist();
    uploadModal.classList.add('hidden');
    hideLoading();
    
    if (uploadedCount > 0) {
        alert(`Загружено ${uploadedCount} треков`);
    }
});

// [ТРЕКЛИСТ]
function getTrackSortValue(track) {
    return {
        title: (track.title || '').toLowerCase(),
        artist: (track.artist || '').toLowerCase(),
        year: parseInt(track.year, 10) || 0,
        addedAt: Number(track.addedAt) || 0
    };
}

function getSortedTrackEntries() {
    const entries = tracks.map((track, index) => ({ track, index }));

    entries.sort((a, b) => {
        const av = getTrackSortValue(a.track);
        const bv = getTrackSortValue(b.track);

        switch (currentTrackSort) {
            case 'alpha':
                return av.title.localeCompare(bv.title, 'ru');
            case 'artist':
                return av.artist.localeCompare(bv.artist, 'ru') || av.title.localeCompare(bv.title, 'ru');
            case 'year_desc':
                return bv.year - av.year || av.title.localeCompare(bv.title, 'ru');
            case 'date_desc':
            default:
                return bv.addedAt - av.addedAt;
        }
    });

    return entries;
}

function updateTracklist() {
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
    
    getSortedTrackEntries().forEach(({ track, index }) => {
        const li = document.createElement('li');
        li.className = 'tracklist-item';
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        
        // Мини-обложка
        let miniCoverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
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
        
        const durationText = index === currentTrackIndex ? formatTime(audio.currentTime || 0) : formatTime(getTrackDurationValue(track));

        li.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${track.title || 'Без названия'}</span>
                <span class="track-artist">${track.artist || ''}</span>
            </div>
            <span class="track-duration" data-index="${index}">${durationText}</span>
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

function updateActiveTrackTimeInList() {
    if (currentTrackIndex < 0 || !tracklist) return;
    const durationEl = tracklist.querySelector(`.track-duration[data-index="${currentTrackIndex}"]`);
    if (!durationEl) return;

    if (isPlaying || audio.currentTime > 0) {
        durationEl.textContent = formatTime(audio.currentTime || 0);
    } else {
        durationEl.textContent = formatTime(getTrackDurationValue(tracks[currentTrackIndex]));
    }
}

function updateActiveTrackTimeInRecent() {
    if (currentTrackIndex < 0 || !recentTracksList) return;
    const durationEl = recentTracksList.querySelector(`.recent-track-time[data-index="${currentTrackIndex}"]`);
    if (!durationEl) return;

    if (isPlaying || audio.currentTime > 0) {
        durationEl.textContent = formatTime(audio.currentTime || 0);
    } else {
        durationEl.textContent = formatTime(getTrackDurationValue(tracks[currentTrackIndex]));
    }
}

function saveRecentTracks() {
    localStorage.setItem('recent_tracks', JSON.stringify(recentTrackPaths));
}

function addTrackToRecent(track) {
    if (!track || !track.path) return;
    recentTrackPaths = recentTrackPaths.filter(path => path !== track.path);
    recentTrackPaths.unshift(track.path);
    recentTrackPaths = recentTrackPaths.slice(0, 20); // храним только 20 последних
    saveRecentTracks();
    updateRecentTracksList();
}

function updateRecentTracksList() {
    if (!recentTracksList) return;
    recentTracksList.innerHTML = '';

    const recentTracks = recentTrackPaths
        .map(path => tracks.find(track => track.path === path))
        .filter(Boolean);

    if (recentTracks.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Пока нет недавно прослушанных треков';
        li.style.color = '#8f9ab3';
        li.style.padding = '12px 0';
        recentTracksList.appendChild(li);
        return;
    }

    recentTracks.forEach((track) => {
        const index = tracks.findIndex(t => t.path === track.path);
        if (index === -1) return;

        const li = document.createElement('li');
        li.className = 'recent-track-item';

        let coverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
            coverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'track-mini-cover';
            canvas.width = 32;
            canvas.height = 32;
            const miniCtx = canvas.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 32, 32);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 32, 32);
            coverHtml = canvas.outerHTML;
        }
        const durationText = index === currentTrackIndex ? formatTime(audio.currentTime || 0) : formatTime(getTrackDurationValue(track));

        li.innerHTML = `
            ${coverHtml}
            <div class="track-info">
                <span class="track-title">${track.title || 'Без названия'}</span>
                <span class="track-artist">${track.artist || ''}</span>
            </div>
            <span class="recent-track-time" data-index="${index}">${durationText}</span>
        `;

        li.addEventListener('click', () => playTrack(index));
        recentTracksList.appendChild(li);
    });
}

function renderSearchList(listElement, items, { clickable = false } = {}) {
    if (!listElement) return;
    listElement.innerHTML = '';

    if (!items || items.length === 0) {
        const li = document.createElement('li');
        li.className = 'search-item empty';
        li.textContent = 'Ничего не найдено';
        listElement.appendChild(li);
        return;
    }

    items.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'search-item';
        li.innerHTML = `
            <span class="search-title">${item.title || 'Без названия'}</span>
            <span class="search-artist">${item.artist || ''}</span>
        `;

        if (clickable && Number.isInteger(item.index)) {
            li.addEventListener('click', () => playTrack(item.index));
        }

        listElement.appendChild(li);
    });
}

async function fetchRemoteTracksByTitle(query) {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.results || []).map((item) => ({
            title: item.trackName || 'Без названия',
            artist: item.artistName || ''
        }));
    } catch (e) {
        return [];
    }
}

async function handleTrackSearch() {
    if (!trackSearchInput || !searchResults) return;

    const query = trackSearchInput.value.trim().toLowerCase();

    if (!query) {
        searchResults.classList.add('hidden');
        if (localSearchResults) localSearchResults.innerHTML = '';
        if (remoteSearchResults) remoteSearchResults.innerHTML = '';
        return;
    }

    const localMatches = tracks
        .map((track, index) => ({ ...track, index }))
        .filter((track) => (track.title || '').toLowerCase().includes(query));

    const remoteMatchesRaw = await fetchRemoteTracksByTitle(query);
    const localKey = new Set(localMatches.map((t) => `${(t.title || '').toLowerCase()}::${(t.artist || '').toLowerCase()}`));
    const remoteMatches = remoteMatchesRaw.filter((t) => !localKey.has(`${(t.title || '').toLowerCase()}::${(t.artist || '').toLowerCase()}`));

    renderSearchList(localSearchResults, localMatches, { clickable: true });
    renderSearchList(remoteSearchResults, remoteMatches);

    searchResults.classList.remove('hidden');
}

function initTrackSearch() {
    if (!trackSearchInput) return;
    trackSearchInput.addEventListener('input', () => {
        clearTimeout(trackSearchTimer);
        trackSearchTimer = setTimeout(() => {
            handleTrackSearch();
        }, 250);
    });
}

// [ФУНКЦИЯ ВОСПРОИЗВЕДЕНИЯ]
function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        audio.pause();
        
        currentTrackIndex = index;
        addTrackToRecent(tracks[index]);
        
        // Если есть path, стримим с сервера, если нет - используем blob URL
        if (tracks[index].path) {
            const encodedPath = encodeURIComponent(tracks[index].path);
            const streamUrl = `${API_URL}/stream/${encodedPath}`;
            console.log('▶️ Стриминг с сервера:', streamUrl);
            audio.src = streamUrl;
        } else if (tracks[index].url) {
            console.log('▶️ Локальное воспроизведение');
            audio.src = tracks[index].url;
        } else {
            console.error('❌ Нет источника для воспроизведения');
            return;
        }
        
        audio.load();
        
        if (shuffleMode) {
            shuffledIndices = shuffledIndices.filter(i => i !== index);
        }
        
        audio.onerror = function(e) {
            console.error('❌ Audio error:', e);
            console.error('❌ Audio error code:', audio.error ? audio.error.code : 'unknown');
            console.error('❌ Audio error message:', audio.error ? audio.error.message : 'unknown');
            isPlaying = false;
            updatePlayPauseButton();
        };
        
        audio.oncanplay = function() {
            console.log('✅ Можно воспроизводить');
            audio.play().then(() => {
                console.log('✅ Воспроизведение успешно');
                isPlaying = true;
                updatePlayPauseButton();
                updateTracklist();
                updateAlbumArt(tracks[currentTrackIndex]);
                
                if (!isEQInitialized) {
                    setTimeout(() => {
                        initEQ();
                    }, 200);
                }
                
            }).catch(error => {
                console.error('❌ Play error:', error);
                isPlaying = false;
                updatePlayPauseButton();
            });
        };
        
        audio.onplaying = function() {
            console.log('▶️ Воспроизведение началось');
            isPlaying = true;
            updatePlayPauseButton();
        };
    }
}

// [ПРОВЕРКА ФАЙЛА ПЕРЕД ВОСПРОИЗВЕДЕНИЕМ]
async function checkTrackBeforePlay(index) {
    if (!tracks[index] || !tracks[index].path) return false;
    
    try {
        const response = await fetch(`${API_URL}/check/${encodeURIComponent(tracks[index].path)}`);
        const data = await response.json();
        
        if (data.exists) {
            console.log('✅ Файл существует на Яндекс.Диске:', data);
            return true;
        } else {
            console.error('❌ Файл не найден на Яндекс.Диске:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка проверки файла:', error);
        return false;
    }
}

// [МЕНЮ ТРЕКА]
function openTrackMenu(trackIndex) {
    currentTrackForMenu = trackIndex;
    trackMenu.classList.remove('hidden');
}

closeTrackMenuBtn.addEventListener('click', () => {
    trackMenu.classList.add('hidden');
});

// Закрытие меню при клике вне области
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
        
        // Мини-обложка
        let coverHtml = '';
        if (playlist.cover) {
            const img = document.createElement('img');
            img.className = 'playlist-choice-cover';
            img.src = playlist.cover;
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

// [УДАЛЕНИЕ ТРЕКА]
async function deleteTrackByMenu({ deleteFromCloud }) {
    if (currentTrackForMenu === null) return;

    const trackToDelete = tracks[currentTrackForMenu];

    if (deleteFromCloud && trackToDelete.path) {
        try {
            await fetch(`${API_URL}/track/${encodeURIComponent(trackToDelete.path)}`, {
                method: 'DELETE'
            });
            console.log('✅ Трек удалён с Яндекс.Диска');
        } catch (error) {
            console.error('Ошибка удаления с Яндекс.Диска:', error);
        }
    }
    // Удаляем трек из всех плейлистов
    playlists.forEach(playlist => {
        playlist.tracks = playlist.tracks.filter(t => t.path !== trackToDelete.path);
    });
    localStorage.setItem('playlists', JSON.stringify(playlists));

    recentTrackPaths = recentTrackPaths.filter(path => path !== trackToDelete.path);
    saveRecentTracks();
    // Очищаем временный URL если есть
    if (trackToDelete.url && trackToDelete.url.startsWith('blob:')) {
        URL.revokeObjectURL(trackToDelete.url);
    }

    tracks.splice(currentTrackForMenu, 1);
    saveTracks();

    // Если удаляли текущий играющий трек
    if (currentTrackIndex === currentTrackForMenu) {
        audio.pause();
        isPlaying = false;
        updatePlayPauseButton();
        currentTrackIndex = -1;
        updateAlbumArt(null);
        progressBar.value = 0;
        timeDisplay.textContent = '0:00';
    } else if (currentTrackIndex > currentTrackForMenu) {
        // Если удаляли трек до текущего, сдвигаем индекс
        currentTrackIndex--;
    }

    updateTracklist();
    updateRecentTracksList();
    updatePlaylistsGrid();
    trackMenu.classList.add('hidden');
    currentTrackForMenu = null;
}

if (deleteTrackLocalBtn) {
    deleteTrackLocalBtn.addEventListener('click', () => deleteTrackByMenu({ deleteFromCloud: false }));
}

if (deleteTrackCloudBtn) {
    deleteTrackCloudBtn.addEventListener('click', () => deleteTrackByMenu({ deleteFromCloud: true }));
}

// ========== ПЛЕЙЛИСТЫ ==========
function updatePlaylistsGrid() {
    playlistsGrid.innerHTML = '';
    
    playlists.forEach(playlist => {
        const square = document.createElement('div');
        square.className = 'playlist-square';
        
        // Обложка
        let coverHtml = '';
        if (playlist.cover) {
            const img = document.createElement('img');
            img.className = 'playlist-square-cover';
            img.src = playlist.cover;
            img.onerror = function() {
                // Если изображение не загрузилось, заменяем на canvas
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
    
    // Кнопка создания нового плейлиста
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
        draftPlaylistTracks = [];
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
        
        // Мини-обложка
        let miniCoverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
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
        
        const isInPlaylist = currentPlaylistId
            ? ((playlists.find(p => p.id === currentPlaylistId)?.tracks || []).some(t => t.path === track.path))
            : draftPlaylistTracks.some(t => t.path === track.path);

        if (isInPlaylist) {
            addBtn.style.display = 'none';
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
    const playlistTracks = currentPlaylistId
        ? (playlists.find(p => p.id === currentPlaylistId)?.tracks || [])
        : draftPlaylistTracks;

    playlistTracksList.innerHTML = '';

    playlistTracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track-item';
        
        // Мини-обложка
        let miniCoverHtml = '';
        if (track.albumArt) {
            const img = document.createElement('img');
            img.className = 'track-mini-cover';
            img.src = track.albumArt;
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
    if (currentPlaylistId) {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (!playlist) return;

        if (!playlist.tracks.some(t => t.path === track.path)) {
            playlist.tracks.push({...track});
            localStorage.setItem('playlists', JSON.stringify(playlists));
            updatePlaylistsGrid();
        }
    } else {
        if (!draftPlaylistTracks.some(t => t.path === track.path)) {
            draftPlaylistTracks.push({ ...track });
        }
    }

    updateAvailableTracksList();
    updatePlaylistTracksList();
}

function removeTrackFromCurrentPlaylist(trackIndex) {
    if (currentPlaylistId) {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (!playlist) return;

        playlist.tracks.splice(trackIndex, 1);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistsGrid();
    } else {
        draftPlaylistTracks.splice(trackIndex, 1);
    }

    updateAvailableTracksList();
    updatePlaylistTracksList();
}

savePlaylistBtn.addEventListener('click', () => {
    const name = playlistNameInput ? playlistNameInput.value.trim() : '';
    const desc = playlistDescInput ? playlistDescInput.value.trim() : '';
    
    if (!name) return;
    
    if (currentPlaylistId) {
        // Обновляем существующий
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist) {
            playlist.name = name;
            playlist.desc = desc;
        }
    } else {
        // Создаем новый
        const newPlaylist = {
            id: Date.now().toString(),
            name: name,
            desc: desc,
            tracks: draftPlaylistTracks,
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
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
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

function updatePlayPauseButton() {
    if (!playPauseBtn) return;
    playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
}

function togglePlay() {
    if (tracks.length === 0) return;
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        updatePlayPauseButton();
    } else {
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else {
            audio.play().then(() => {
                isPlaying = true;
                updatePlayPauseButton();
            }).catch(error => {
                console.error('Play error:', error);
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
    const activeTrack = tracks[currentTrackIndex];
    const totalDuration = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : getTrackDurationValue(activeTrack);

    if (totalDuration > 0) {
        audio.currentTime = (progressBar.value / 100) * totalDuration;
    }
    refreshProgressFill();
});

audio.addEventListener('timeupdate', () => {
    const activeTrack = tracks[currentTrackIndex];
    const totalDuration = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : getTrackDurationValue(activeTrack);

    if (totalDuration > 0 && progressBar && timeDisplay) {
        const progress = (audio.currentTime / totalDuration) * 100;
        progressBar.value = progress;
        refreshProgressFill();
        timeDisplay.textContent = formatTime(audio.currentTime);
        updateActiveTrackTimeInList();
        updateActiveTrackTimeInRecent();
    }
});

audio.addEventListener('ended', () => {
    const nextIndex = getNextTrackIndex();
    
    if (nextIndex !== -1) {
        playTrack(nextIndex);
    } else {
        isPlaying = false;
        updatePlayPauseButton();
        currentTrackIndex = -1;
        if (progressBar) { progressBar.value = 0; refreshProgressFill(); }
        if (timeDisplay) timeDisplay.textContent = '0:00';
        updateTracklist();
        updateAlbumArt(null);
    }
});

audio.addEventListener('loadedmetadata', () => {
    if (timeDisplay) {
        timeDisplay.textContent = '0:00';
    }

    if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
        tracks[currentTrackIndex].duration = Number(audio.duration) || 0;
        saveTracks();
        updateTracklist();
    }

    if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
        tracks[currentTrackIndex].duration = getTrackDurationValue({ duration: audio.duration }) || getTrackDurationValue(tracks[currentTrackIndex]);
        saveTracks();
        updateTracklist();
        updateRecentTracksList();
    }
});

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseButton();
});
audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseButton();
});
function paintRangeFill(input, percent, activeColor = '#6d26ff', baseColor = '#1c2230') {
    if (!input) return;
    const p = Math.max(0, Math.min(100, percent));
    input.style.background = `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${p}%, ${baseColor} ${p}%, ${baseColor} 100%)`;
}

function refreshProgressFill() {
    if (!progressBar) return;
    const percent = Number(progressBar.value || 0);
    paintRangeFill(progressBar, percent, '#6d26ff', '#1a1f2d');
}

function refreshVolumeFill() {
    if (!volumeSlider) return;
    const percent = Number(volumeSlider.value || 0);
    paintRangeFill(volumeSlider, percent, '#6d26ff', '#1a1f2d');
}

// [ГРОМКОСТЬ]
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
    refreshVolumeFill();
    
    volumeSlider.addEventListener('input', function(e) {
        const volume = parseInt(e.target.value);
        audio.volume = volume / 100;
        volumePercent.textContent = volume + '%';
        updateVolumeIcon(volume);
        refreshVolumeFill();
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
    updateRecentTracksList();
    initTrackSearch();
    refreshProgressFill();
    refreshVolumeFill();

    if (trackSortSelect) {
        trackSortSelect.value = currentTrackSort;
        trackSortSelect.addEventListener('change', (e) => {
            currentTrackSort = e.target.value;
            localStorage.setItem('track_sort', currentTrackSort);
            updateTracklist();
        });
    }

    if (moreActionsBtn) {
        moreActionsBtn.addEventListener('click', () => {
            if (currentTrackIndex === -1) return;
            openTrackMenu(currentTrackIndex);
        });
    }
    
    if (tg) {
        tg.ready();
    }
});

// Очистка временных ссылок при закрытии
window.addEventListener('beforeunload', () => {
    tracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
    });
});

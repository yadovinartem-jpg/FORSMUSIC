// Инициализация Telegram Web App (с безопасным fallback для обычного браузера)
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

// Адрес бэкенд-сервера
const API_URL = 'http://144.31.156.139:3000/api';

// ========== ЭЛЕМЕНТЫ ==========
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const fileInput = document.getElementById('fileInput');
const pendingTracksList = document.getElementById('pendingTracksList');
const confirmUploadBtn = document.getElementById('confirmUploadBtn');

const playlistModal = document.getElementById('playlistModal');
const closePlaylistModalBtn = document.getElementById('closePlaylistModalBtn');
const playlistModalTitle = document.getElementById('playlistModalTitle');
const playlistHeroTitle = document.getElementById('playlistHeroTitle');
const playlistHeroMeta = document.getElementById('playlistHeroMeta');
const playlistDurationSummary = document.getElementById('playlistDurationSummary');
const playlistViewPanel = document.getElementById('playlistViewPanel');
const playlistEditPanel = document.getElementById('playlistEditPanel');
const playlistSearchPanel = document.getElementById('playlistSearchPanel');
const playlistCoverEdit = document.getElementById('playlistCoverEdit');
const playlistNameInput = document.getElementById('playlistNameInput');
const playlistDescInput = document.getElementById('playlistDescInput');
const playlistVisibilityInput = document.getElementById('playlistVisibilityInput');
const playlistSearchInput = document.getElementById('playlistSearchInput');
const availableTracksList = document.getElementById('availableTracksList');
const playlistTracksList = document.getElementById('playlistTracksList');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
const changePlaylistCoverBtn = document.getElementById('changePlaylistCoverBtn');
const playlistPlayBtn = document.getElementById('playlistPlayBtn');
const playlistShuffleBtn = document.getElementById('playlistShuffleBtn');
const playlistFollowBtn = document.getElementById('playlistFollowBtn');
const playlistEditFocusBtn = document.getElementById('playlistEditFocusBtn');
const coverFileInput = document.getElementById('coverFileInput');

const trackMenu = document.getElementById('trackMenu');
const closeTrackMenuBtn = document.getElementById('closeTrackMenuBtn');
const showAddToPlaylistBtn = document.getElementById('showAddToPlaylistBtn');
const deleteTrackLocalBtn = document.getElementById('deleteTrackLocalBtn');
const deleteTrackCloudBtn = document.getElementById('deleteTrackCloudBtn');

const playlistChoiceMenu = document.getElementById('playlistChoiceMenu');
const closePlaylistChoiceBtn = document.getElementById('closePlaylistChoiceBtn');
const playlistChoiceList = document.getElementById('playlistChoiceList');

const eqModal = document.getElementById('eqModal');
const closeEqModalBtn = document.getElementById('closeEqModalBtn');

const playlistsGrid = document.getElementById('playlistsGrid');

const tracklist = document.getElementById('tracklist');
const trackSortSelect = document.getElementById('trackSortSelect');
const recentTracksList = document.getElementById('recentTracksList');
const trackSearchInput = document.getElementById('trackSearchInput');
const searchResults = document.getElementById('searchResults');
const localSearchResults = document.getElementById('localSearchResults');
const remoteSearchResults = document.getElementById('remoteSearchResults');

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

const qSlider = document.getElementById('qSlider');
const qValue = document.getElementById('qValue');
const applyMyPresetBtn = document.getElementById('applyMyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');
const moreActionsBtn = document.getElementById('moreActionsBtn');

const audio = new Audio();
audio.crossOrigin = "anonymous";

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
let playlistEditMode = false;

const CURRENT_USER_NAME = 'Артём Ядовин';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTrackDurationValue(track = null) {
    const duration = Number(track?.duration);
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function formatPlaylistDuration(seconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    if (minutes > 0) return `${minutes} минут`;
    return `${totalSeconds} секунд`;
}

function getPlaylistTracks(playlistId = currentPlaylistId) {
    return playlistId
        ? (playlists.find(p => p.id === playlistId)?.tracks || [])
        : draftPlaylistTracks;
}

function getPlaylistTotalDuration(playlistTracks = []) {
    return playlistTracks.reduce((sum, track) => sum + getTrackDurationValue(track), 0);
}

function updatePlaylistMeta() {
    const playlistTracks = getPlaylistTracks();
    const totalDuration = getPlaylistTotalDuration(playlistTracks);
    const countText = `${playlistTracks.length} ${playlistTracks.length === 1 ? 'трек' : 'треков'}`;
    const durationText = formatPlaylistDuration(totalDuration);

    if (playlistHeroTitle) {
        playlistHeroTitle.textContent = playlistNameInput?.value?.trim() || 'Новый плейлист';
    }
    if (playlistHeroMeta) {
        playlistHeroMeta.textContent = `${countText} • ${durationText}`;
    }
    if (playlistDurationSummary) {
        playlistDurationSummary.textContent = `${playlistTracks.length} аудиозаписей • ${durationText}`;
    }
}

function isPlaylistOwner(playlist) {
    return !playlist || !playlist.owner || playlist.owner === CURRENT_USER_NAME;
}

function setPlaylistMode(isEditMode) {
    playlistEditMode = isEditMode;
    if (playlistViewPanel) playlistViewPanel.classList.toggle('hidden', isEditMode);
    if (playlistEditPanel) playlistEditPanel.classList.toggle('hidden', !isEditMode);
    if (playlistSearchPanel) playlistSearchPanel.classList.toggle('hidden', !isEditMode);
    if (availableTracksList) availableTracksList.classList.toggle('hidden', !isEditMode || !(playlistSearchInput?.value || '').trim());
    if (savePlaylistBtn) savePlaylistBtn.classList.toggle('hidden', !isEditMode);
    if (deletePlaylistBtn) deletePlaylistBtn.classList.toggle('hidden', !isEditMode || !currentPlaylistId);
    if (playlistModalTitle) playlistModalTitle.textContent = isEditMode ? 'Редактирование плейлиста' : '';
}

// ========== РИСОВАНИЕ ==========
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

if (albumArt) drawGradientAlbumArt(albumArt);
if (playlistCoverEdit) drawGradientAlbumArt(playlistCoverEdit);

// ========== РАБОТА С MP3 ==========
function loadJsMediaTags() {
    return new Promise((resolve, reject) => {
        if (window.jsmediatags) {
            resolve(window.jsmediatags);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';
        script.onload = () => resolve(window.jsmediatags);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

async function extractMetadata(file) {
    try {
        const jsmediatags = await loadJsMediaTags();
        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const metadata = { title: null, artist: null, albumArt: null, year: '' };
                    if (tag.tags?.title) metadata.title = tag.tags.title;
                    if (tag.tags?.artist) metadata.artist = tag.tags.artist;
                    if (tag.tags?.year) metadata.year = String(tag.tags.year);
                    if (tag.tags?.picture) {
                        const picture = tag.tags.picture;
                        metadata.albumArt = `data:${picture.format};base64,${arrayBufferToBase64(picture.data)}`;
                    }
                    resolve(metadata);
                },
                onError: () => resolve({ title: null, artist: null, albumArt: null, year: '' })
            });
        });
    } catch {
        return { title: null, artist: null, albumArt: null, year: '' };
    }
}

async function readAudioDuration(file) {
    return new Promise((resolve) => {
        if (!file) return resolve(0);
        const tempAudio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);
        tempAudio.preload = 'metadata';
        tempAudio.onloadedmetadata = () => {
            const duration = Number(tempAudio.duration);
            URL.revokeObjectURL(objectUrl);
            resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
        };
        tempAudio.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(0);
        };
        tempAudio.src = objectUrl;
    });
}

// ========== ЗАГРУЗКА ТРЕКОВ ==========
uploadBtn?.addEventListener('click', () => {
    uploadModal?.classList.remove('hidden');
    fileInput.value = '';
    pendingTracks = [];
    updatePendingTracksList();
    if (confirmUploadBtn) confirmUploadBtn.disabled = true;
});

closeUploadModalBtn?.addEventListener('click', () => {
    uploadModal?.classList.add('hidden');
    pendingTracks.forEach(track => {
        if (track.url?.startsWith('blob:')) URL.revokeObjectURL(track.url);
    });
});

fileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    pendingTracks.forEach(track => {
        if (track.url?.startsWith('blob:')) URL.revokeObjectURL(track.url);
    });
    pendingTracks = [];

    const metadataPromises = files.map(async (file) => {
        if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) return null;
        const fileUrl = URL.createObjectURL(file);
        const fileName = file.name.replace(/\.mp3$/i, '');
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
            addedAt: Date.now(),
            duration
        };
    });

    const results = await Promise.all(metadataPromises);
    pendingTracks = results.filter(track => track !== null);
    updatePendingTracksList();
    if (confirmUploadBtn) confirmUploadBtn.disabled = pendingTracks.length === 0;
});

function updatePendingTracksList() {
    if (!pendingTracksList) return;
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
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 50, 50);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 50, 50);
            coverHtml = canvas.outerHTML;
        }

        trackDiv.innerHTML = `
            <div class="pending-track-header">
                ${coverHtml}
                <div class="pending-track-info">
                    <div class="pending-track-title">${escapeHtml(track.title)}</div>
                    <div class="pending-track-filename">${escapeHtml(track.fileName)}</div>
                </div>
            </div>
            <div class="pending-track-edit">
                <input type="text" class="pending-edit-title" data-index="${index}" value="${escapeHtml(track.title)}" placeholder="Название">
                <input type="text" class="pending-edit-artist" data-index="${index}" value="${escapeHtml(track.artist)}" placeholder="Исполнитель">
            </div>
        `;
        pendingTracksList.appendChild(trackDiv);
    });

    document.querySelectorAll('.pending-edit-title').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = e.target.dataset.index;
            if (pendingTracks[idx]) pendingTracks[idx].title = e.target.value;
        });
    });
    document.querySelectorAll('.pending-edit-artist').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = e.target.dataset.index;
            if (pendingTracks[idx]) pendingTracks[idx].artist = e.target.value;
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

confirmUploadBtn?.addEventListener('click', async () => {
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

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            if (!result.file?.path) continue;

            newTracks.push({
                path: result.file.path,
                title: result.file.title,
                artist: result.file.artist,
                albumArt: track.albumArt,
                year: track.year || '',
                addedAt: track.addedAt || Date.now(),
                duration: track.duration || 0,
                url: track.url
            });
            uploadedCount++;
        } catch (error) {
            console.error('Ошибка загрузки трека:', error);
        }
    }

    tracks = [...newTracks, ...tracks];
    saveTracks();
    updateTracklist();
    uploadModal?.classList.add('hidden');

    if (uploadedCount > 0) alert(`Загружено ${uploadedCount} треков`);
});

// ========== СОХРАНЕНИЕ ТРЕКОВ ==========
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
            url: track.url
        }));
        localStorage.setItem('forsity_tracks', JSON.stringify(tracksToSave));
    } catch (e) {
        console.error('Ошибка сохранения треков:', e);
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
        } else {
            tracks = [];
        }
    } catch (e) {
        tracks = [];
    }
    updateTracklist();
}

loadTracks();
updatePlaylistsGrid();

// ========== ТРЕКЛИСТ ==========
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
            case 'alpha': return av.title.localeCompare(bv.title, 'ru');
            case 'artist': return av.artist.localeCompare(bv.artist, 'ru') || av.title.localeCompare(bv.title, 'ru');
            case 'year_desc': return bv.year - av.year || av.title.localeCompare(bv.title, 'ru');
            default: return bv.addedAt - av.addedAt;
        }
    });
    return entries;
}

function updateTracklist() {
    if (!tracklist) return;
    tracklist.innerHTML = '';

    if (tracks.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Нет треков';
        li.style.cssText = 'justify-content: center; cursor: default; padding: 20px; text-align: center; color: #999;';
        tracklist.appendChild(li);
        return;
    }

    getSortedTrackEntries().forEach(({ track, index }) => {
        const li = document.createElement('li');
        li.className = 'tracklist-item';
        if (index === currentTrackIndex) li.classList.add('active');

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
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 40, 40);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 40, 40);
            miniCoverHtml = canvas.outerHTML;
        }

        const durationText = index === currentTrackIndex ? formatTime(audio.currentTime || 0) : formatTime(getTrackDurationValue(track));

        li.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${escapeHtml(track.title || 'Без названия')}</span>
                <span class="track-artist">${escapeHtml(track.artist || '')}</span>
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

// ========== НЕДАВНИЕ ТРЕКИ ==========
function saveRecentTracks() {
    localStorage.setItem('recent_tracks', JSON.stringify(recentTrackPaths));
}

function addTrackToRecent(track) {
    if (!track?.path) return;
    recentTrackPaths = recentTrackPaths.filter(p => p !== track.path);
    recentTrackPaths.unshift(track.path);
    recentTrackPaths = recentTrackPaths.slice(0, 20);
    saveRecentTracks();
    updateRecentTracksList();
}

function updateRecentTracksList() {
    if (!recentTracksList) return;
    recentTracksList.innerHTML = '';

    const recentTracksListItems = recentTrackPaths
        .map(path => tracks.find(t => t.path === path))
        .filter(Boolean);

    if (recentTracksListItems.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Пока нет недавно прослушанных треков';
        li.style.color = '#8f9ab3';
        li.style.padding = '12px 0';
        recentTracksList.appendChild(li);
        return;
    }

    recentTracksListItems.forEach(track => {
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
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 32, 32);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 32, 32);
            coverHtml = canvas.outerHTML;
        }

        const durationText = index === currentTrackIndex ? formatTime(audio.currentTime || 0) : formatTime(getTrackDurationValue(track));

        li.innerHTML = `
            ${coverHtml}
            <div class="track-info">
                <span class="track-title">${escapeHtml(track.title || 'Без названия')}</span>
                <span class="track-artist">${escapeHtml(track.artist || '')}</span>
            </div>
            <span class="recent-track-time" data-index="${index}">${durationText}</span>
        `;
        li.addEventListener('click', () => playTrack(index));
        recentTracksList.appendChild(li);
    });
}

// ========== ПОИСК ==========
function renderSearchList(listElement, items, options = {}) {
    if (!listElement) return;
    listElement.innerHTML = '';

    if (!items?.length) {
        const li = document.createElement('li');
        li.className = 'search-item empty';
        li.textContent = 'Ничего не найдено';
        listElement.appendChild(li);
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'search-item';
        li.innerHTML = `
            <span class="search-title">${escapeHtml(item.title || 'Без названия')}</span>
            <span class="search-artist">${escapeHtml(item.artist || '')}</span>
        `;
        if (options.clickable && Number.isInteger(item.index)) {
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
        return (data.results || []).map(item => ({
            title: item.trackName || 'Без названия',
            artist: item.artistName || ''
        }));
    } catch {
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
        .filter(track => (track.title || '').toLowerCase().includes(query));

    const remoteMatchesRaw = await fetchRemoteTracksByTitle(query);
    const localKey = new Set(localMatches.map(t => `${(t.title || '').toLowerCase()}::${(t.artist || '').toLowerCase()}`));
    const remoteMatches = remoteMatchesRaw.filter(t => !localKey.has(`${(t.title || '').toLowerCase()}::${(t.artist || '').toLowerCase()}`));

    renderSearchList(localSearchResults, localMatches, { clickable: true });
    renderSearchList(remoteSearchResults, remoteMatches);
    searchResults.classList.remove('hidden');
}

function initTrackSearch() {
    if (!trackSearchInput) return;
    trackSearchInput.addEventListener('input', () => {
        clearTimeout(trackSearchTimer);
        trackSearchTimer = setTimeout(handleTrackSearch, 250);
    });
}

// ========== ВОСПРОИЗВЕДЕНИЕ ==========
function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    audio.pause();

    currentTrackIndex = index;
    addTrackToRecent(tracks[index]);

    if (tracks[index].path) {
        const encodedPath = encodeURIComponent(tracks[index].path);
        const streamUrl = `${API_URL}/stream/${encodedPath}`;
        audio.src = streamUrl;
    } else if (tracks[index].url) {
        audio.src = tracks[index].url;
    } else {
        console.error('Нет источника для воспроизведения');
        return;
    }

    audio.load();

    if (shuffleMode) {
        shuffledIndices = shuffledIndices.filter(i => i !== index);
    }

    audio.onerror = () => {
        isPlaying = false;
        updatePlayPauseButton();
    };

    audio.oncanplay = () => {
        audio.play().then(() => {
            isPlaying = true;
            updatePlayPauseButton();
            updateTracklist();
            updateAlbumArt(tracks[currentTrackIndex]);
            if (!isEQInitialized) setTimeout(() => initEQ(), 200);
        }).catch(() => {
            isPlaying = false;
            updatePlayPauseButton();
        });
    };
}

// ========== ПЛЕЕР ==========
function updateAlbumArt(track) {
    if (!albumArt) return;
    if (track?.albumArt) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => drawImageAlbumArt(albumArt, img);
        img.onerror = () => drawGradientAlbumArt(albumArt);
        img.src = track.albumArt;
    } else {
        drawGradientAlbumArt(albumArt);
    }
    if (currentTrackTitle) currentTrackTitle.textContent = track?.title || 'Нет трека';
    if (currentTrackArtist) currentTrackArtist.textContent = track?.artist || '';
}

function updatePlayPauseButton() {
    if (playPauseBtn) playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
}

function togglePlay() {
    if (!tracks.length) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        updatePlayPauseButton();
    } else {
        if (currentTrackIndex === -1) playTrack(0);
        else audio.play().then(() => {
            isPlaying = true;
            updatePlayPauseButton();
        }).catch(() => {});
    }
}

function playNext() {
    if (!tracks.length) return;
    if (currentTrackIndex === -1) return playTrack(0);
    const nextIdx = getNextTrackIndex();
    if (nextIdx !== -1) playTrack(nextIdx);
}

function playPrev() {
    if (!tracks.length) return;
    if (currentTrackIndex === -1) return playTrack(0);
    const prevIdx = getPrevTrackIndex();
    if (prevIdx !== -1) playTrack(prevIdx);
}

function getNextTrackIndex() {
    if (!tracks.length) return -1;
    if (repeatMode === 2) return currentTrackIndex;
    if (shuffleMode) {
        if (!shuffledIndices.length) {
            shuffledIndices = Array.from({ length: tracks.length }, (_, i) => i);
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }
        }
        return shuffledIndices.shift();
    }
    if (currentTrackIndex < tracks.length - 1) return currentTrackIndex + 1;
    if (repeatMode === 1) return 0;
    return -1;
}

function getPrevTrackIndex() {
    if (!tracks.length) return -1;
    if (repeatMode === 2) return currentTrackIndex;
    if (currentTrackIndex > 0) return currentTrackIndex - 1;
    if (repeatMode === 1) return tracks.length - 1;
    return -1;
}

function updateModeButtons() {
    if (repeatBtn) {
        repeatBtn.textContent = repeatMode === 0 ? '🔁' : repeatMode === 1 ? '🔁' : '🔂';
        repeatBtn.classList.toggle('active', repeatMode !== 0);
    }
    if (shuffleBtn) shuffleBtn.classList.toggle('active', shuffleMode);
}

repeatBtn?.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    updateModeButtons();
});

shuffleBtn?.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    if (shuffleMode) shuffledIndices = [];
    updateModeButtons();
});

// ========== МЕНЮ ТРЕКА ==========
function openTrackMenu(trackIndex) {
    currentTrackForMenu = trackIndex;
    trackMenu?.classList.remove('hidden');
}

closeTrackMenuBtn?.addEventListener('click', () => trackMenu?.classList.add('hidden'));
trackMenu?.addEventListener('click', (e) => {
    if (e.target === trackMenu) trackMenu.classList.add('hidden');
});

showAddToPlaylistBtn?.addEventListener('click', () => {
    trackMenu?.classList.add('hidden');
    updatePlaylistChoiceList();
    playlistChoiceMenu?.classList.remove('hidden');
});

closePlaylistChoiceBtn?.addEventListener('click', () => playlistChoiceMenu?.classList.add('hidden'));

function updatePlaylistChoiceList() {
    if (!playlistChoiceList) return;
    playlistChoiceList.innerHTML = '';

    if (!playlists.length) {
        const div = document.createElement('div');
        div.className = 'playlist-choice-item';
        div.innerHTML = '<span style="color:#999;padding:15px;">Нет плейлистов</span>';
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
            coverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'playlist-choice-cover';
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 40, 40);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 40, 40);
            coverHtml = canvas.outerHTML;
        }

        div.innerHTML = `
            ${coverHtml}
            <div class="playlist-choice-info">
                <div class="playlist-choice-name">${escapeHtml(playlist.name)}</div>
                <div class="playlist-choice-count">${playlist.tracks.length} треков</div>
            </div>
        `;
        div.addEventListener('click', () => addTrackToPlaylist(playlist.id));
        playlistChoiceList.appendChild(div);
    });
}

function addTrackToPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || currentTrackForMenu === null) return;
    const track = tracks[currentTrackForMenu];
    if (!playlist.tracks.some(t => t.path === track.path)) {
        playlist.tracks.push({ ...track });
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistsGrid();
    }
    playlistChoiceMenu?.classList.add('hidden');
}

// ========== УДАЛЕНИЕ ТРЕКА ==========
async function deleteTrackByMenu({ deleteFromCloud }) {
    if (currentTrackForMenu === null) return;
    const trackToDelete = tracks[currentTrackForMenu];

    if (deleteFromCloud && trackToDelete.path) {
        try {
            await fetch(`${API_URL}/track/${encodeURIComponent(trackToDelete.path)}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Ошибка удаления с Яндекс.Диска:', error);
        }
    }

    playlists.forEach(playlist => {
        playlist.tracks = playlist.tracks.filter(t => t.path !== trackToDelete.path);
    });
    localStorage.setItem('playlists', JSON.stringify(playlists));

    recentTrackPaths = recentTrackPaths.filter(p => p !== trackToDelete.path);
    saveRecentTracks();

    if (trackToDelete.url?.startsWith('blob:')) URL.revokeObjectURL(trackToDelete.url);

    tracks.splice(currentTrackForMenu, 1);
    saveTracks();

    if (currentTrackIndex === currentTrackForMenu) {
        audio.pause();
        isPlaying = false;
        updatePlayPauseButton();
        currentTrackIndex = -1;
        updateAlbumArt(null);
        if (progressBar) progressBar.value = 0;
        if (timeDisplay) timeDisplay.textContent = '0:00';
    } else if (currentTrackIndex > currentTrackForMenu) {
        currentTrackIndex--;
    }

    updateTracklist();
    updateRecentTracksList();
    updatePlaylistsGrid();
    trackMenu?.classList.add('hidden');
    currentTrackForMenu = null;
}

deleteTrackLocalBtn?.addEventListener('click', () => deleteTrackByMenu({ deleteFromCloud: false }));
deleteTrackCloudBtn?.addEventListener('click', () => deleteTrackByMenu({ deleteFromCloud: true }));

// ========== ПЛЕЙЛИСТЫ ==========
function updatePlaylistsGrid() {
    if (!playlistsGrid) return;
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
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);
                this.parentNode.replaceChild(canvas, this);
            };
            coverHtml = img.outerHTML;
        } else {
            const canvas = document.createElement('canvas');
            canvas.className = 'playlist-square-cover';
            canvas.width = 60;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 60, 60);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 60, 60);
            coverHtml = canvas.outerHTML;
        }

        square.innerHTML = `
            ${coverHtml}
            <div class="playlist-square-name">${escapeHtml(playlist.name)}</div>
            <div class="playlist-square-count">${playlist.tracks.length} треков • ${formatPlaylistDuration(getPlaylistTotalDuration(playlist.tracks))}</div>
        `;
        square.addEventListener('click', () => openPlaylistEditor(playlist.id));
        playlistsGrid.appendChild(square);
    });

    const newSquare = document.createElement('div');
    newSquare.className = 'playlist-square';
    newSquare.style.background = '#1a1a1a';
    newSquare.innerHTML = `<div style="font-size:30px;color:#666;margin-bottom:5px;">➕</div><div class="playlist-square-name">Создать</div>`;
    newSquare.addEventListener('click', () => openPlaylistEditor());
    playlistsGrid.appendChild(newSquare);
}

function openPlaylistEditor(playlistId = null) {
    currentPlaylistId = playlistId;
    playlistEditMode = !playlistId;

    if (playlistId) {
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            if (playlistNameInput) playlistNameInput.value = playlist.name || '';
            if (playlistDescInput) playlistDescInput.value = playlist.desc || '';
            if (playlistVisibilityInput) playlistVisibilityInput.checked = playlist.isPublic !== false;

            if (playlist.cover) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => drawImageAlbumArt(playlistCoverEdit, img);
                img.onerror = () => drawGradientAlbumArt(playlistCoverEdit);
                img.src = playlist.cover;
            } else {
                drawGradientAlbumArt(playlistCoverEdit);
            }
            if (playlistFollowBtn) playlistFollowBtn.classList.toggle('hidden', isPlaylistOwner(playlist));
            if (playlistEditFocusBtn) playlistEditFocusBtn.classList.toggle('hidden', !isPlaylistOwner(playlist));
        }
    } else {
        if (playlistNameInput) playlistNameInput.value = '';
        if (playlistDescInput) playlistDescInput.value = '';
        draftPlaylistTracks = [];
        if (playlistVisibilityInput) playlistVisibilityInput.checked = true;
        drawGradientAlbumArt(playlistCoverEdit);
        if (playlistFollowBtn) playlistFollowBtn.classList.add('hidden');
        if (playlistEditFocusBtn) playlistEditFocusBtn.classList.remove('hidden');
    }

    updateAvailableTracksList();
    updatePlaylistTracksList();
    updatePlaylistMeta();
    setPlaylistMode(playlistEditMode);
    playlistModal?.classList.remove('hidden');
}

closePlaylistModalBtn?.addEventListener('click', () => playlistModal?.classList.add('hidden'));

function updateAvailableTracksList() {
    if (!availableTracksList) return;
    availableTracksList.innerHTML = '';

    const searchTerm = playlistSearchInput?.value?.toLowerCase() || '';
    if (!searchTerm.trim()) {
        availableTracksList.classList.add('hidden');
        return;
    }
    availableTracksList.classList.remove('hidden');

    const filteredTracks = tracks.filter(track =>
        track.title.toLowerCase().includes(searchTerm) ||
        (track.artist && track.artist.toLowerCase().includes(searchTerm))
    );

    filteredTracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track-item';

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
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 30, 30);
            miniCoverHtml = canvas.outerHTML;
        }

        trackDiv.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${escapeHtml(track.title)}</span>
                <span class="track-artist">${escapeHtml(track.artist || '')}</span>
            </div>
            <span class="playlist-track-duration">${formatTime(getTrackDurationValue(track))}</span>
            <button class="add-to-playlist">+</button>
        `;

        const addBtn = trackDiv.querySelector('.add-to-playlist');
        const isInPlaylist = currentPlaylistId
            ? (playlists.find(p => p.id === currentPlaylistId)?.tracks || []).some(t => t.path === track.path)
            : draftPlaylistTracks.some(t => t.path === track.path);

        if (isInPlaylist) addBtn.style.display = 'none';

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addTrackToCurrentPlaylist(track);
        });
        trackDiv.addEventListener('click', () => {
            const idx = tracks.findIndex(t => t.path === track.path);
            if (idx !== -1) playTrack(idx);
        });
        availableTracksList.appendChild(trackDiv);
    });
}

function updatePlaylistTracksList() {
    if (!playlistTracksList) return;
    const playlistTracks = currentPlaylistId
        ? (playlists.find(p => p.id === currentPlaylistId)?.tracks || [])
        : draftPlaylistTracks;

    playlistTracksList.innerHTML = '';

    playlistTracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track-item';

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
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 30, 30);
            miniCoverHtml = canvas.outerHTML;
        }

        trackDiv.innerHTML = `
            ${miniCoverHtml}
            <div class="track-info">
                <span class="track-title">${escapeHtml(track.title)}</span>
                <span class="track-artist">${escapeHtml(track.artist || '')}</span>
            </div>
            <span class="playlist-track-duration">${formatTime(getTrackDurationValue(track))}</span>
            <button class="remove-from-playlist">✕</button>
        `;

        const removeBtn = trackDiv.querySelector('.remove-from-playlist');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrackFromCurrentPlaylist(index);
        });
        trackDiv.addEventListener('click', () => {
            const idx = tracks.findIndex(t => t.path === track.path);
            if (idx !== -1) playTrack(idx);
        });
        playlistTracksList.appendChild(trackDiv);
    });
    updatePlaylistMeta();
}

function addTrackToCurrentPlaylist(track) {
    if (currentPlaylistId) {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist && !playlist.tracks.some(t => t.path === track.path)) {
            playlist.tracks.push({ ...track });
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
        if (playlist) {
            playlist.tracks.splice(trackIndex, 1);
            localStorage.setItem('playlists', JSON.stringify(playlists));
            updatePlaylistsGrid();
        }
    } else {
        draftPlaylistTracks.splice(trackIndex, 1);
    }
    updateAvailableTracksList();
    updatePlaylistTracksList();
}

function playPlaylist({ shuffle = false } = {}) {
    const playlistTracks = getPlaylistTracks();
    if (!playlistTracks.length) return;
    const sourceTrack = shuffle
        ? playlistTracks[Math.floor(Math.random() * playlistTracks.length)]
        : playlistTracks[0];
    const trackIndex = tracks.findIndex(t => t.path === sourceTrack.path);
    if (trackIndex !== -1) playTrack(trackIndex);
}

savePlaylistBtn?.addEventListener('click', () => {
    const name = playlistNameInput?.value?.trim();
    if (!name) return;

    if (currentPlaylistId) {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist) {
            playlist.name = name;
            playlist.desc = playlistDescInput?.value?.trim() || '';
            playlist.isPublic = playlistVisibilityInput?.checked ?? true;
            playlist.updatedAt = new Date().toISOString();
        }
    } else {
        const newPlaylist = {
            id: Date.now().toString(),
            name: name,
            desc: playlistDescInput?.value?.trim() || '',
            tracks: draftPlaylistTracks,
            cover: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            owner: CURRENT_USER_NAME,
            isPublic: playlistVisibilityInput?.checked ?? true
        };
        playlists.push(newPlaylist);
    }

    localStorage.setItem('playlists', JSON.stringify(playlists));
    updatePlaylistsGrid();
    updatePlaylistMeta();
    setPlaylistMode(false);
    playlistModal?.classList.add('hidden');
});

deletePlaylistBtn?.addEventListener('click', () => {
    if (currentPlaylistId) {
        playlists = playlists.filter(p => p.id !== currentPlaylistId);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        updatePlaylistsGrid();
        playlistModal?.classList.add('hidden');
    }
});

playlistPlayBtn?.addEventListener('click', () => playPlaylist({ shuffle: false }));
playlistShuffleBtn?.addEventListener('click', () => playPlaylist({ shuffle: true }));
playlistEditFocusBtn?.addEventListener('click', () => {
    setPlaylistMode(true);
    playlistNameInput?.focus();
    playlistNameInput?.select?.();
});
playlistFollowBtn?.addEventListener('click', () => {
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    const cloned = { ...playlist, id: Date.now().toString(), owner: CURRENT_USER_NAME, updatedAt: new Date().toISOString() };
    playlists.push(cloned);
    localStorage.setItem('playlists', JSON.stringify(playlists));
    updatePlaylistsGrid();
});
playlistNameInput?.addEventListener('input', updatePlaylistMeta);
playlistSearchInput?.addEventListener('input', updateAvailableTracksList);

changePlaylistCoverBtn?.addEventListener('click', () => {
    if (playlistEditMode) coverFileInput?.click();
});
playlistCoverEdit?.addEventListener('click', () => {
    if (playlistEditMode) coverFileInput?.click();
});

coverFileInput?.addEventListener('change', (e) => {
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

// ========== ЭКВАЛАЙЗЕР ==========
let audioContext = null;
let source = null;
let filters = [];
let isEQInitialized = false;

const frequenciesEQ = [16, 32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 22000];
const idByFrequency = {
    16: 'eq16', 32: 'eq32', 64: 'eq64', 125: 'eq125', 250: 'eq250',
    500: 'eq500', 1000: 'eq1k', 2000: 'eq2k', 4000: 'eq4k',
    8000: 'eq8k', 16000: 'eq16k', 22000: 'eq22k'
};

let eqSettingsEQ = { 16: 0, 32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0, 22000: 0 };
let currentQEQ = 2.5;

function initEQ() {
    if (isEQInitialized) return;
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (source) source.disconnect();
        source = audioContext.createMediaElementSource(audio);
        filters = [];

        for (let freq of frequenciesEQ) {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = currentQEQ;
            filter.gain.value = eqSettingsEQ[freq] || 0;
            filters.push(filter);
        }

        for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
        source.connect(filters[0]);
        filters[filters.length - 1].connect(audioContext.destination);
        isEQInitialized = true;
    } catch (e) {
        console.error('Ошибка инициализации эквалайзера:', e);
    }
}

function updateEQ() {
    if (!filters.length || !isEQInitialized) return;
    for (let i = 0; i < filters.length; i++) {
        filters[i].gain.value = eqSettingsEQ[frequenciesEQ[i]];
        filters[i].Q.value = currentQEQ;
    }
    localStorage.setItem('eqSettings', JSON.stringify(eqSettingsEQ));
    localStorage.setItem('eqQ', currentQEQ);
}

function updateQ(value) {
    currentQEQ = parseFloat(value);
    if (qSlider) qSlider.value = currentQEQ;
    if (qValue) qValue.textContent = currentQEQ.toFixed(1);
    if (filters.length && isEQInitialized) filters.forEach(f => f.Q.value = currentQEQ);
}

function applyMyPreset() {
    const preset = { 16: 12, 32: 12, 64: 12, 125: 9, 250: 4, 500: 5, 1000: 2, 2000: 2, 4000: -1, 8000: -2, 16000: -3, 22000: -5 };
    for (let freq in preset) eqSettingsEQ[freq] = preset[freq];
    for (let freq of frequenciesEQ) {
        const slider = document.getElementById(idByFrequency[freq]);
        const valSpan = document.getElementById(idByFrequency[freq] + 'Val');
        if (slider) slider.value = eqSettingsEQ[freq];
        if (valSpan) valSpan.textContent = eqSettingsEQ[freq].toFixed(1) + ' dB';
    }
    updateEQ();
}

function resetEQ() {
    for (let freq of frequenciesEQ) eqSettingsEQ[freq] = 0;
    for (let freq of frequenciesEQ) {
        const slider = document.getElementById(idByFrequency[freq]);
        const valSpan = document.getElementById(idByFrequency[freq] + 'Val');
        if (slider) slider.value = 0;
        if (valSpan) valSpan.textContent = '0.0 dB';
    }
    updateEQ();
}

function loadEQSettings() {
    const saved = localStorage.getItem('eqSettings');
    if (saved) try { Object.assign(eqSettingsEQ, JSON.parse(saved)); } catch(e) {}
    const savedQ = localStorage.getItem('eqQ');
    if (savedQ) { currentQEQ = parseFloat(savedQ); updateQ(currentQEQ); }
}

function initEQSliders() {
    for (let freq of frequenciesEQ) {
        const slider = document.getElementById(idByFrequency[freq]);
        const valSpan = document.getElementById(idByFrequency[freq] + 'Val');
        if (slider && valSpan) {
            slider.value = eqSettingsEQ[freq];
            valSpan.textContent = eqSettingsEQ[freq].toFixed(1) + ' dB';
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                eqSettingsEQ[freq] = val;
                valSpan.textContent = val.toFixed(1) + ' dB';
                if (filters.length && isEQInitialized) {
                    const idx = frequenciesEQ.indexOf(freq);
                    if (idx !== -1 && filters[idx]) filters[idx].gain.value = val;
                }
            });
        }
    }
}

toggleEqBtn?.addEventListener('click', () => eqModal?.classList.remove('hidden'));
closeEqModalBtn?.addEventListener('click', () => eqModal?.classList.add('hidden'));
eqModal?.addEventListener('click', (e) => { if (e.target === eqModal) eqModal.classList.add('hidden'); });
qSlider?.addEventListener('input', (e) => updateQ(e.target.value));
applyMyPresetBtn?.addEventListener('click', applyMyPreset);
resetEqBtn?.addEventListener('click', resetEQ);
saveEqBtn?.addEventListener('click', () => localStorage.setItem('eqSettings', JSON.stringify(eqSettingsEQ)));

// ========== СОБЫТИЯ ПЛЕЕРА ==========
playPauseBtn?.addEventListener('click', togglePlay);
prevBtn?.addEventListener('click', playPrev);
nextBtn?.addEventListener('click', playNext);

progressBar?.addEventListener('input', () => {
    const activeTrack = tracks[currentTrackIndex];
    const totalDuration = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration : getTrackDurationValue(activeTrack);
    if (totalDuration > 0) audio.currentTime = (progressBar.value / 100) * totalDuration;
    refreshProgressFill();
});

audio.addEventListener('timeupdate', () => {
    const activeTrack = tracks[currentTrackIndex];
    const totalDuration = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration : getTrackDurationValue(activeTrack);
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
    const nextIdx = getNextTrackIndex();
    if (nextIdx !== -1) playTrack(nextIdx);
    else {
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
    if (timeDisplay) timeDisplay.textContent = '0:00';
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
        tracks[currentTrackIndex].duration = getTrackDurationValue({ duration: audio.duration }) || getTrackDurationValue(tracks[currentTrackIndex]);
        saveTracks();
        updateTracklist();
        updateRecentTracksList();
    }
});

audio.addEventListener('play', () => { isPlaying = true; updatePlayPauseButton(); });
audio.addEventListener('pause', () => { isPlaying = false; updatePlayPauseButton(); });
audio.addEventListener('playing', () => { isPlaying = true; updatePlayPauseButton(); });

function paintRangeFill(input, percent, activeColor = '#6d26ff', baseColor = '#1c2230') {
    if (!input) return;
    const p = Math.max(0, Math.min(100, percent));
    input.style.background = `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${p}%, ${baseColor} ${p}%, ${baseColor} 100%)`;
}

function refreshProgressFill() {
    if (progressBar) paintRangeFill(progressBar, Number(progressBar.value || 0), '#6d26ff', '#1a1f2d');
}

function refreshVolumeFill() {
    if (volumeSlider) paintRangeFill(volumeSlider, Number(volumeSlider.value || 0), '#6d26ff', '#1a1f2d');
}

function initVolume() {
    if (!volumeSlider || !volumePercent || !volumeIcon) return;
    const savedVolume = localStorage.getItem('volume');
    let startVolume = savedVolume ? parseInt(savedVolume) : 60;
    audio.volume = startVolume / 100;
    volumeSlider.value = startVolume;
    volumePercent.textContent = startVolume + '%';
    updateVolumeIcon(startVolume);
    refreshVolumeFill();
    volumeSlider.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value);
        audio.volume = vol / 100;
        volumePercent.textContent = vol + '%';
        updateVolumeIcon(vol);
        refreshVolumeFill();
        localStorage.setItem('volume', vol);
    });
}

function updateVolumeIcon(volume) {
    if (!volumeIcon) return;
    if (volume === 0) volumeIcon.textContent = '🔇';
    else if (volume < 30) volumeIcon.textContent = '🔈';
    else if (volume < 70) volumeIcon.textContent = '🔉';
    else volumeIcon.textContent = '🔊';
}

function updateActiveTrackTimeInList() {
    if (currentTrackIndex < 0 || !tracklist) return;
    const durationEl = tracklist.querySelector(`.track-duration[data-index="${currentTrackIndex}"]`);
    if (!durationEl) return;
    if (isPlaying || audio.currentTime > 0) durationEl.textContent = formatTime(audio.currentTime || 0);
    else durationEl.textContent = formatTime(getTrackDurationValue(tracks[currentTrackIndex]));
}

function updateActiveTrackTimeInRecent() {
    if (currentTrackIndex < 0 || !recentTracksList) return;
    const durationEl = recentTracksList.querySelector(`.recent-track-time[data-index="${currentTrackIndex}"]`);
    if (!durationEl) return;
    if (isPlaying || audio.currentTime > 0) durationEl.textContent = formatTime(audio.currentTime || 0);
    else durationEl.textContent = formatTime(getTrackDurationValue(tracks[currentTrackIndex]));
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
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

    moreActionsBtn?.addEventListener('click', () => {
        if (currentTrackIndex !== -1) openTrackMenu(currentTrackIndex);
    });

    if (tg) tg.ready();
});

window.addEventListener('beforeunload', () => {
    tracks.forEach(track => {
        if (track.url?.startsWith('blob:')) URL.revokeObjectURL(track.url);
    });
});

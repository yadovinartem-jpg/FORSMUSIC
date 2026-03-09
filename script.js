// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

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
const trackMenuList = document.getElementById('trackMenuList');
const deleteTrackBtn = document.getElementById('deleteTrackBtn');

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
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const volumePercent = document.getElementById('volumePercent');
const albumArt = document.getElementById('albumArt');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');

// Эквалайзер
const qSlider = document.getElementById('qSlider');
const qValue = document.getElementById('qValue');
const toggleEqBtn = document.getElementById('toggleEqBtn');
const eqControls = document.getElementById('eqControls');
const applyMyPresetBtn = document.getElementById('applyMyPresetBtn');
const resetEqBtn = document.getElementById('resetEqBtn');
const saveEqBtn = document.getElementById('saveEqBtn');

// Аудио элемент
const audio = new Audio();

// ========== ДАННЫЕ ==========
let isPlaying = false;
let currentTrackIndex = -1;
let tracks = []; // Основной треклист
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let pendingTracks = []; // Треки ожидающие подтверждения загрузки
let currentPlaylistId = null; // Текущий редактируемый плейлист
let currentTrackForMenu = null; // Трек для которого открыто меню
let repeatMode = 0; // 0 - нет повтора, 1 - повтор плейлиста, 2 - повтор одного трека
let shuffleMode = false;
let shuffledIndices = [];

// ========== ИНИЦИАЛИЗАЦИЯ ==========
updateTracklist();
updatePlaylistsGrid();

// ========== ФУНКЦИИ ДЛЯ РИСОВАНИЯ ==========
function drawGradientAlbumArt(canvas, text = 'FOR SITY') {
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
if (playlistCoverEdit) drawGradientAlbumArt(playlistCoverEdit, 'Плейлист');

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
                onError: (error) => {
                    console.error('Error reading metadata:', error);
                    resolve({ title: null, artist: null, albumArt: null });
                }
            });
        });
    } catch (error) {
        console.error('Error loading library:', error);
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
        
        return {
            url: fileUrl,
            title: metadata.title || fileName,
            artist: metadata.artist || '',
            albumArt: metadata.albumArt,
            fileName: fileName
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
        const coverCanvas = document.createElement('canvas');
        coverCanvas.className = 'pending-track-cover';
        coverCanvas.width = 50;
        coverCanvas.height = 50;
        
        // Создаем изображение для обложки
        const drawCover = () => {
            if (track.albumArt) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const coverCtx = coverCanvas.getContext('2d');
                    coverCtx.drawImage(img, 0, 0, 50, 50);
                };
                img.src = track.albumArt;
            } else {
                const coverCtx = coverCanvas.getContext('2d');
                const gradient = coverCtx.createLinearGradient(0, 0, 50, 50);
                gradient.addColorStop(0, '#32007d');
                gradient.addColorStop(1, '#000000');
                coverCtx.fillStyle = gradient;
                coverCtx.fillRect(0, 0, 50, 50);
            }
        };
        
        drawCover();
        
        trackDiv.innerHTML = `
            <div class="pending-track-header">
                ${coverCanvas.outerHTML}
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

confirmUploadBtn.addEventListener('click', () => {
    // Добавляем все подтвержденные треки в начало основного списка (чтобы новые были сверху)
    const newTracks = pendingTracks.map(track => ({
        url: track.url,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt
    }));
    
    tracks = [...newTracks, ...tracks];
    
    updateTracklist();
    uploadModal.classList.add('hidden');
});

// ========== ТРЕКЛИСТ ==========
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
    
    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'tracklist-item';
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        
        // Мини-обложка
        const miniCover = document.createElement('canvas');
        miniCover.className = 'track-mini-cover';
        miniCover.width = 40;
        miniCover.height = 40;
        
        if (track.albumArt) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const miniCtx = miniCover.getContext('2d');
                miniCtx.drawImage(img, 0, 0, 40, 40);
            };
            img.src = track.albumArt;
        } else {
            const miniCtx = miniCover.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 40, 40);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 40, 40);
        }
        
        li.appendChild(miniCover);
        
        const trackInfo = document.createElement('div');
        trackInfo.className = 'track-info';
        trackInfo.innerHTML = `
            <span class="track-title">${track.title || 'Без названия'}</span>
            <span class="track-artist">${track.artist || ''}</span>
        `;
        li.appendChild(trackInfo);
        
        const menuBtn = document.createElement('button');
        menuBtn.className = 'track-menu-btn';
        menuBtn.innerHTML = '⋮';
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTrackMenu(index);
        });
        li.appendChild(menuBtn);
        
        li.addEventListener('click', () => playTrack(index));
        
        tracklist.appendChild(li);
    });
}

// ========== МЕНЮ ТРЕКА ==========
function openTrackMenu(trackIndex) {
    currentTrackForMenu = trackIndex;
    updateTrackMenu();
    trackMenu.classList.remove('hidden');
}

function updateTrackMenu() {
    trackMenuList.innerHTML = '';
    
    if (playlists.length === 0) {
        const div = document.createElement('div');
        div.className = 'playlist-menu-item';
        div.innerHTML = '<span style="color: #999; padding: 12px;">Нет плейлистов</span>';
        trackMenuList.appendChild(div);
        return;
    }
    
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.className = 'playlist-menu-item';
        
        // Мини-обложка плейлиста
        const coverCanvas = document.createElement('canvas');
        coverCanvas.className = 'playlist-mini-cover';
        coverCanvas.width = 30;
        coverCanvas.height = 30;
        
        if (playlist.cover) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const coverCtx = coverCanvas.getContext('2d');
                coverCtx.drawImage(img, 0, 0, 30, 30);
            };
            img.src = playlist.cover;
        } else {
            const coverCtx = coverCanvas.getContext('2d');
            const gradient = coverCtx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            coverCtx.fillStyle = gradient;
            coverCtx.fillRect(0, 0, 30, 30);
        }
        
        div.appendChild(coverCanvas);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'playlist-menu-info';
        infoDiv.innerHTML = `
            <div class="playlist-menu-name">${playlist.name}</div>
            <div style="font-size: 10px; color: #999;">${playlist.tracks.length} треков</div>
        `;
        div.appendChild(infoDiv);
        
        // Проверяем, есть ли трек уже в плейлисте
        const track = tracks[currentTrackForMenu];
        const isInPlaylist = playlist.tracks.some(t => t.url === track.url);
        
        if (isInPlaylist) {
            const checkSpan = document.createElement('span');
            checkSpan.className = 'playlist-menu-check';
            checkSpan.textContent = '✓';
            div.appendChild(checkSpan);
        }
        
        div.addEventListener('click', () => {
            toggleTrackInPlaylist(playlist.id, currentTrackForMenu);
            updateTrackMenu();
        });
        
        trackMenuList.appendChild(div);
    });
}

// Функция удаления трека
function deleteTrackFromCollection() {
    if (currentTrackForMenu === null) return;
    
    const trackToDelete = tracks[currentTrackForMenu];
    
    // Удаляем трек из всех плейлистов
    playlists.forEach(playlist => {
        playlist.tracks = playlist.tracks.filter(t => t.url !== trackToDelete.url);
    });
    localStorage.setItem('playlists', JSON.stringify(playlists));
    
    // Очищаем временный URL
    if (trackToDelete.url && trackToDelete.url.startsWith('blob:')) {
        URL.revokeObjectURL(trackToDelete.url);
    }
    
    // Удаляем трек из основного списка
    tracks.splice(currentTrackForMenu, 1);
    
    // Если удаляли текущий играющий трек
    if (currentTrackIndex === currentTrackForMenu) {
        audio.pause();
        isPlaying = false;
        playPauseBtn.textContent = '▶️';
        currentTrackIndex = -1;
        updateAlbumArt(null);
        progressBar.value = 0;
        timeDisplay.textContent = '0:00 / 0:00';
    } else if (currentTrackIndex > currentTrackForMenu) {
        // Если удаляли трек до текущего, сдвигаем индекс
        currentTrackIndex--;
    }
    
    updateTracklist();
    updatePlaylistsGrid();
    trackMenu.classList.add('hidden');
    currentTrackForMenu = null;
}

deleteTrackBtn.addEventListener('click', deleteTrackFromCollection);

closeTrackMenuBtn.addEventListener('click', () => {
    trackMenu.classList.add('hidden');
});

// Закрытие меню при клике вне области
trackMenu.addEventListener('click', (e) => {
    if (e.target === trackMenu) {
        trackMenu.classList.add('hidden');
    }
});

// ========== ПЛЕЙЛИСТЫ ==========
function updatePlaylistsGrid() {
    playlistsGrid.innerHTML = '';
    
    playlists.forEach(playlist => {
        const square = document.createElement('div');
        square.className = 'playlist-square';
        
        // Обложка
        const coverCanvas = document.createElement('canvas');
        coverCanvas.className = 'playlist-square-cover';
        coverCanvas.width = 60;
        coverCanvas.height = 60;
        
        if (playlist.cover) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const coverCtx = coverCanvas.getContext('2d');
                coverCtx.drawImage(img, 0, 0, 60, 60);
            };
            img.src = playlist.cover;
        } else {
            const coverCtx = coverCanvas.getContext('2d');
            const gradient = coverCtx.createLinearGradient(0, 0, 60, 60);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            coverCtx.fillStyle = gradient;
            coverCtx.fillRect(0, 0, 60, 60);
        }
        
        square.appendChild(coverCanvas);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'playlist-square-name';
        nameDiv.textContent = playlist.name;
        square.appendChild(nameDiv);
        
        const countDiv = document.createElement('div');
        countDiv.className = 'playlist-square-count';
        countDiv.textContent = `${playlist.tracks.length} треков`;
        square.appendChild(countDiv);
        
        square.addEventListener('click', () => openPlaylistEditor(playlist.id));
        
        playlistsGrid.appendChild(square);
    });
    
    // Кнопка создания нового плейлиста
    const newSquare = document.createElement('div');
    newSquare.className = 'playlist-square';
    newSquare.style.background = '#1a1a1a';
    
    const plusDiv = document.createElement('div');
    plusDiv.style.fontSize = '30px';
    plusDiv.style.color = '#666';
    plusDiv.style.marginBottom = '5px';
    plusDiv.textContent = '➕';
    newSquare.appendChild(plusDiv);
    
    const newNameDiv = document.createElement('div');
    newNameDiv.className = 'playlist-square-name';
    newNameDiv.textContent = 'Создать';
    newSquare.appendChild(newNameDiv);
    
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
                img.src = playlist.cover;
            } else {
                drawGradientAlbumArt(playlistCoverEdit, playlist.name || 'Плейлист');
            }
            
            deletePlaylistBtn.classList.remove('hidden');
        }
    } else {
        playlistModalTitle.textContent = 'Создать плейлист';
        playlistNameInput.value = '';
        playlistDescInput.value = '';
        drawGradientAlbumArt(playlistCoverEdit, 'Новый плейлист');
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
        const miniCover = document.createElement('canvas');
        miniCover.className = 'track-mini-cover';
        miniCover.width = 30;
        miniCover.height = 30;
        
        if (track.albumArt) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const miniCtx = miniCover.getContext('2d');
                miniCtx.drawImage(img, 0, 0, 30, 30);
            };
            img.src = track.albumArt;
        } else {
            const miniCtx = miniCover.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 30, 30);
        }
        
        trackDiv.appendChild(miniCover);
        
        const trackInfo = document.createElement('div');
        trackInfo.className = 'track-info';
        trackInfo.innerHTML = `
            <span class="track-title">${track.title}</span>
            <span class="track-artist">${track.artist || ''}</span>
        `;
        trackDiv.appendChild(trackInfo);
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-to-playlist';
        addBtn.textContent = '+';
        
        if (currentPlaylistId) {
            const playlist = playlists.find(p => p.id === currentPlaylistId);
            if (playlist) {
                const isInPlaylist = playlist.tracks.some(t => t.url === track.url);
                if (isInPlaylist) {
                    addBtn.style.display = 'none';
                }
            }
        }
        
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addTrackToCurrentPlaylist(track);
        });
        
        trackDiv.appendChild(addBtn);
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
        
        // Мини-обложка
        const miniCover = document.createElement('canvas');
        miniCover.className = 'track-mini-cover';
        miniCover.width = 30;
        miniCover.height = 30;
        
        if (track.albumArt) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const miniCtx = miniCover.getContext('2d');
                miniCtx.drawImage(img, 0, 0, 30, 30);
            };
            img.src = track.albumArt;
        } else {
            const miniCtx = miniCover.getContext('2d');
            const gradient = miniCtx.createLinearGradient(0, 0, 30, 30);
            gradient.addColorStop(0, '#32007d');
            gradient.addColorStop(1, '#000000');
            miniCtx.fillStyle = gradient;
            miniCtx.fillRect(0, 0, 30, 30);
        }
        
        trackDiv.appendChild(miniCover);
        
        const trackInfo = document.createElement('div');
        trackInfo.className = 'track-info';
        trackInfo.innerHTML = `
            <span class="track-title">${track.title}</span>
            <span class="track-artist">${track.artist || ''}</span>
        `;
        trackDiv.appendChild(trackInfo);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-from-playlist';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrackFromCurrentPlaylist(index);
        });
        
        trackDiv.appendChild(removeBtn);
        playlistTracksList.appendChild(trackDiv);
    });
}

function addTrackToCurrentPlaylist(track) {
    if (!currentPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (!playlist) return;
    
    if (!playlist.tracks.some(t => t.url === track.url)) {
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

function toggleTrackInPlaylist(playlistId, trackIndex) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const track = tracks[trackIndex];
    
    const existingIndex = playlist.tracks.findIndex(t => t.url === track.url);
    if (existingIndex === -1) {
        playlist.tracks.push({...track});
    } else {
        playlist.tracks.splice(existingIndex, 1);
    }
    
    localStorage.setItem('playlists', JSON.stringify(playlists));
    updatePlaylistsGrid();
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

function playTrack(index) {
    if (index >= 0 && index < tracks.length) {
        audio.pause();
        
        currentTrackIndex = index;
        audio.src = tracks[index].url;
        
        if (shuffleMode) {
            shuffledIndices = shuffledIndices.filter(i => i !== index);
        }
        
        audio.onerror = function(e) {
            console.error('Audio error:', e);
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.textContent = '▶️';
        };
        
        audio.play().then(() => {
            isPlaying = true;
            if (playPauseBtn) playPauseBtn.textContent = '⏸️';
            updateTracklist();
            updateAlbumArt(tracks[currentTrackIndex]);
            
            if (!isEQInitialized) {
                setTimeout(() => {
                    initEQ();
                }, 200);
            }
            
        }).catch(error => {
            console.error('Play error:', error);
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.textContent = '▶️';
        });
    }
}

function togglePlay() {
    if (tracks.length === 0) return;
    
    if (isPlaying) {
        audio.pause();
        if (playPauseBtn) playPauseBtn.textContent = '▶️';
        isPlaying = false;
    } else {
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else {
            audio.play().then(() => {
                if (playPauseBtn) playPauseBtn.textContent = '⏸️';
                isPlaying = true;
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
});

audio.addEventListener('ended', () => {
    const nextIndex = getNextTrackIndex();
    
    if (nextIndex !== -1) {
        playTrack(nextIndex);
    } else {
        isPlaying = false;
        if (playPauseBtn) playPauseBtn.textContent = '▶️';
        currentTrackIndex = -1;
        if (progressBar) progressBar.value = 0;
        if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
        updateTracklist();
        updateAlbumArt(null);
    }
});

audio.addEventListener('loadedmetadata', () => {
    if (timeDisplay) {
        timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
    }
});

// ========== ЭКВАЛАЙЗЕР - ОБРАБОТЧИКИ ==========
qSlider.addEventListener('input', (e) => {
    updateQ(e.target.value);
});

toggleEqBtn.addEventListener('click', () => {
    eqControls.classList.toggle('hidden');
    toggleEqBtn.textContent = eqControls.classList.contains('hidden') ? 
        'Показать эквалайзер' : 'Скрыть эквалайзер';
});

applyMyPresetBtn.addEventListener('click', applyMyPreset);
resetEqBtn.addEventListener('click', resetEQ);
saveEqBtn.addEventListener('click', () => {
    localStorage.setItem('eqSettings', JSON.stringify(eqSettings));
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    initVolume();
    loadEQSettings();
    initEQSliders();
    updateModeButtons();
    updateAlbumArt(null);
    
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

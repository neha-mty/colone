/* ============================================================
   Spotifyclone — Hybrid Player (YouTube IFrame + HTML5 Audio)
   ============================================================ */

const audio       = document.getElementById('audio-player');
const progressBar = document.getElementById('progress');
const volumeBar   = document.getElementById('volume');
const playBtn     = document.getElementById('play-btn');
const likeBtn     = document.getElementById('like-btn');

let queue         = [];
let currentIndex  = 0;
let isRepeat      = false;
let isShuffle     = false;
let currentSongId = null;
let isYouTube     = false;

let ytPlayer      = null;
let ytReady       = false;
let ytProgressTimer = null;

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-player', {
    width: '0', height: '0',
    // NEW
    playerVars: { 
      autoplay: 0, 
      controls: 0, 
      disablekb: 1, 
      fs: 0, 
      modestbranding: 1, 
      rel: 0,
      origin: window.location.origin,   // ← ADD THIS
    },
    events: {
      onReady:       () => { ytReady = true; },
      onStateChange: onYTStateChange,
      onError:       onYTError,
    },
  });
}

function onYTStateChange(event) {
  const S = YT.PlayerState;
  if (event.data === S.PLAYING)   { playBtn.textContent = '⏸'; startYTProgressTimer(); }
  else if (event.data === S.PAUSED)    { playBtn.textContent = '▶'; stopYTProgressTimer(); }
  else if (event.data === S.BUFFERING) { playBtn.textContent = '⏳'; }
  else if (event.data === S.ENDED) {
    playBtn.textContent = '▶';
    stopYTProgressTimer();
    isRepeat ? replayCurrentYT() : nextSong();
  }
}

function onYTError(event) {
  const errors = {
    2:   '⚠ Invalid video ID',
    5:   '⚠ HTML5 player error',
    100: '⚠ Video not found or private',
    101: '⚠ Embedding disabled by artist',
    150: '⚠ Embedding disabled by artist',
  };
  const msg = errors[event.data] || `⚠ YouTube error (${event.data})`;
  document.getElementById('player-title').textContent = msg;
  document.getElementById('player-artist').textContent = 'Try a different video';
  console.warn('YouTube error code:', event.data);
}

function startYTProgressTimer() {
  stopYTProgressTimer();
  ytProgressTimer = setInterval(() => {
    if (!ytPlayer || !ytReady) return;
    try {
      const cur = ytPlayer.getCurrentTime() || 0;
      const dur = ytPlayer.getDuration()    || 0;
      if (dur > 0) {
        const pct = (cur / dur) * 100;
        progressBar.value = pct;
        progressBar.style.background = `linear-gradient(to right, #fff ${pct}%, #535353 ${pct}%)`;
        document.getElementById('current-time').textContent = formatTime(cur);
        document.getElementById('total-time').textContent   = formatTime(dur);
      }
    } catch(e) {}
  }, 500);
}

function stopYTProgressTimer() {
  if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
}

function replayCurrentYT() {
  ytPlayer.seekTo(0);
  ytPlayer.playVideo();
}

function playSongFromQueue(containerId, index) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const rows = Array.from(container.querySelectorAll('.song-row'));
  queue = rows.map(el => ({
    id:     el.dataset.id     || '',
    src:    el.dataset.src    || '',
    title:  el.dataset.title  || 'Unknown',
    artist: el.dataset.artist || '',
    cover:  el.dataset.cover  || '',
    ytId:   el.dataset.ytid   || '',
  }));
  currentIndex = index;
  loadAndPlay(queue[currentIndex]);
}

function loadAndPlay(song) {
  if (!song) return;
  currentSongId = song.id;
  document.getElementById('player-title').textContent  = song.title;
  document.getElementById('player-artist').textContent = song.artist;
  document.getElementById('player-cover').src          = song.cover || '';
  progressBar.value = 0;
  document.getElementById('current-time').textContent = '0:00';
  document.getElementById('total-time').textContent   = '0:00';
  updateLikeBtn();

  if (song.ytId) {
    isYouTube = true;
    audio.pause(); audio.src = '';
    stopYTProgressTimer();
    if (ytReady && ytPlayer) {
      ytPlayer.loadVideoById(song.ytId);
      ytPlayer.setVolume(parseInt(volumeBar.value));
    } else {
      setTimeout(() => {
        if (ytReady && ytPlayer) {
          ytPlayer.loadVideoById(song.ytId);
          ytPlayer.setVolume(parseInt(volumeBar.value));
        }
      }, 1500);
    }
    playBtn.textContent = '⏳';
  } else if (song.src) {
    isYouTube = false;
    stopYTProgressTimer();
    if (ytReady && ytPlayer) ytPlayer.stopVideo();
    audio.src = song.src;
    audio.play().then(() => { playBtn.textContent = '⏸'; }).catch(() => { playBtn.textContent = '▶'; });
  } else {
    document.getElementById('player-title').textContent = '⚠ No audio source';
    return;
  }

  if (song.id) fetchPost(`/song/${song.id}/play/`);
}

function togglePlay() {
  if (isYouTube) {
    if (!ytReady || !ytPlayer) return;
    ytPlayer.getPlayerState() === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
  } else {
    if (!audio.src) return;
    audio.paused ? audio.play() : audio.pause();
  }
}

function prevSong() {
  if (queue.length === 0) return;
  const cur = isYouTube ? (ytReady && ytPlayer ? ytPlayer.getCurrentTime() : 0) : audio.currentTime;
  if (cur > 3) {
    isYouTube ? ytPlayer.seekTo(0) : (audio.currentTime = 0);
    return;
  }
  currentIndex = (currentIndex - 1 + queue.length) % queue.length;
  loadAndPlay(queue[currentIndex]);
}

function nextSong() {
  if (queue.length === 0) return;
  if (isShuffle) {
    let next;
    do { next = Math.floor(Math.random() * queue.length); } while (queue.length > 1 && next === currentIndex);
    currentIndex = next;
  } else {
    currentIndex = (currentIndex + 1) % queue.length;
  }
  loadAndPlay(queue[currentIndex]);
}

function shuffleQueue() {
  isShuffle = !isShuffle;
  document.getElementById('shuffle-btn').classList.toggle('active', isShuffle);
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  document.getElementById('repeat-btn').classList.toggle('active', isRepeat);
}

function toggleLike() {
  if (!currentSongId) return;
  fetchPost(`/song/${currentSongId}/like/`)
    .then(r => r.json())
    .then(data => {
      likeBtn.textContent = data.liked ? '♥' : '♡';
      likeBtn.classList.toggle('liked', data.liked);
    }).catch(console.warn);
}

function updateLikeBtn() {
  likeBtn.textContent = '♡';
  likeBtn.classList.remove('liked');
}

audio.addEventListener('timeupdate', () => {
  if (isYouTube || !audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressBar.value = pct;
  progressBar.style.background = `linear-gradient(to right, #fff ${pct}%, #535353 ${pct}%)`;
  document.getElementById('current-time').textContent = formatTime(audio.currentTime);
  document.getElementById('total-time').textContent   = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  playBtn.textContent = '▶';
  isRepeat ? (audio.currentTime = 0, audio.play()) : nextSong();
});

audio.addEventListener('play',  () => { if (!isYouTube) playBtn.textContent = '⏸'; });
audio.addEventListener('pause', () => { if (!isYouTube) playBtn.textContent = '▶'; });

progressBar.addEventListener('input', () => {
  if (isYouTube) {
    if (!ytReady || !ytPlayer) return;
    ytPlayer.seekTo((progressBar.value / 100) * (ytPlayer.getDuration() || 0), true);
  } else {
    if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
  }
});

volumeBar.addEventListener('input', () => {
  const vol = volumeBar.value;
  audio.volume = vol / 100;
  if (ytReady && ytPlayer) ytPlayer.setVolume(parseInt(vol));
  volumeBar.style.background = `linear-gradient(to right, #fff ${vol}%, #535353 ${vol}%)`;
});
audio.volume = 0.8;
volumeBar.style.background = `linear-gradient(to right, #fff 80%, #535353 80%)`;

document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  switch (e.code) {
    case 'Space':
      e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':
      e.preventDefault();
      if (isYouTube && ytReady && ytPlayer) ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10, true);
      else audio.currentTime = Math.min(audio.currentTime + 10, audio.duration || 0);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (isYouTube && ytReady && ytPlayer) ytPlayer.seekTo(Math.max(ytPlayer.getCurrentTime() - 10, 0), true);
      else audio.currentTime = Math.max(audio.currentTime - 10, 0);
      break;
    case 'ArrowUp':
      e.preventDefault();
      volumeBar.value = Math.min(parseInt(volumeBar.value) + 10, 100);
      volumeBar.dispatchEvent(new Event('input')); break;
    case 'ArrowDown':
      e.preventDefault();
      volumeBar.value = Math.max(parseInt(volumeBar.value) - 10, 0);
      volumeBar.dispatchEvent(new Event('input')); break;
  }
});

function formatTime(secs) {
  if (isNaN(secs) || secs < 0) return '0:00';
  return `${Math.floor(secs/60)}:${String(Math.floor(secs%60)).padStart(2,'0')}`;
}

function fetchPost(url) {
  return fetch(url, { method:'POST', headers:{'X-CSRFToken': getCookie('csrftoken')} });
}

function getCookie(name) {
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop().split(';').shift() : '';
}

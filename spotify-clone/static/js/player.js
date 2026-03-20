/* ============================================================
   Spotifyclone — player.js   (FIXED)

   BUGS FIXED:
   1. Play/Pause button was stuck — was using .textContent on
      a button that had emoji. Now uses setPlayState() which
      swaps data-state attribute + CSS handles the icon swap.
      This works whether the button has emoji or SVG inside.
   2. Add-to-playlist tick mark — addedSongs Set tracks which
      song IDs have been added this session. All .add-btn
      elements get a ✓ class when their song is in the set.

   ALL original function names preserved:
   togglePlay, prevSong, nextSong, shuffleQueue, toggleRepeat,
   toggleLike, playSongFromQueue, fetchPost, getCookie
============================================================ */

/* ── DOM refs (grabbed inside DOMContentLoaded to avoid null) ── */
let audio, progressBar, volumeBar, playBtn, likeBtn;

/* ── State ── */
let queue           = [];
let currentIndex    = 0;
let isRepeat        = false;
let isShuffle       = false;
let currentSongId   = null;
let isYouTube       = false;
let addedSongs      = new Set(); // tracks songs added to playlist this session

/* ── YouTube ── */
let ytPlayer        = null;
let ytReady         = false;
let ytProgressTimer = null;

/* ══════════════════════════════════════════════
   PLAY STATE  — the ONE place that controls
   the play/pause button appearance.
   Sets data-state="playing"|"paused"|"loading"
   CSS in main.css reads this to show the icon.
══════════════════════════════════════════════ */
function setPlayState(state) {
  if (!playBtn) return;
  playBtn.dataset.state = state; // 'playing' | 'paused' | 'loading'

  // Also update the text content for emoji-based buttons
  // (harmless if button uses CSS pseudo-elements instead)
  const map = { playing: '⏸', paused: '▶', loading: '⏳' };
  playBtn.textContent = map[state] ?? '▶';

  // Drive the spinning vinyl cover animation
  const cover = document.getElementById('player-cover');
  if (cover) cover.classList.toggle('spinning', state === 'playing');

  // Drive equalizer bars
  const eq = document.getElementById('player-eq');
  if (eq) eq.classList.toggle('active', state === 'playing');
}

/* ══════════════════════════════════════════════
   YOUTUBE IFRAME API
══════════════════════════════════════════════ */
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-player', {
    width: '0', height: '0',
    playerVars: {
      autoplay: 0, controls: 0, disablekb: 1,
      fs: 0, modestbranding: 1, rel: 0,
      origin: window.location.origin,
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
  if      (event.data === S.PLAYING)   { setPlayState('playing');  startYTProgressTimer(); }
  else if (event.data === S.PAUSED)    { setPlayState('paused');   stopYTProgressTimer();  }
  else if (event.data === S.BUFFERING) { setPlayState('loading');  }
  else if (event.data === S.ENDED)     {
    setPlayState('paused');
    stopYTProgressTimer();
    isRepeat ? replayCurrentYT() : nextSong();
  }
}

function onYTError(event) {
  const errors = {
    2: '⚠ Invalid video ID', 5: '⚠ HTML5 player error',
    100: '⚠ Video not found or private',
    101: '⚠ Embedding disabled by artist',
    150: '⚠ Embedding disabled by artist',
  };
  const msg = errors[event.data] || `⚠ YouTube error (${event.data})`;
  document.getElementById('player-title').textContent  = msg;
  document.getElementById('player-artist').textContent = 'Try a different video';
  setPlayState('paused');
  console.warn('YouTube error:', event.data);
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
        updateProgressBar(pct);
        document.getElementById('current-time').textContent = formatTime(cur);
        document.getElementById('total-time').textContent   = formatTime(dur);
      }
    } catch (e) { /* ignore */ }
  }, 500);
}

function stopYTProgressTimer() {
  if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
}

function replayCurrentYT() {
  ytPlayer.seekTo(0);
  ytPlayer.playVideo();
}

/* ══════════════════════════════════════════════
   QUEUE & PLAYBACK
══════════════════════════════════════════════ */
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

  const cover = document.getElementById('player-cover');
  if (cover) cover.src = song.cover || '';

  updateProgressBar(0);
  document.getElementById('current-time').textContent = '0:00';
  document.getElementById('total-time').textContent   = '0:00';
  updateLikeBtn();

  if (song.ytId) {
    isYouTube = true;
    audio.pause(); audio.src = '';
    stopYTProgressTimer();
    setPlayState('loading');
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
  } else if (song.src) {
    isYouTube = false;
    stopYTProgressTimer();
    if (ytReady && ytPlayer) ytPlayer.stopVideo();
    audio.src = song.src;
    audio.play()
      .then(()  => setPlayState('playing'))
      .catch(() => setPlayState('paused'));
  } else {
    document.getElementById('player-title').textContent = '⚠ No audio source';
    setPlayState('paused');
    return;
  }

  if (song.id) fetchPost(`/song/${song.id}/play/`);
}

function togglePlay() {
  if (isYouTube) {
    if (!ytReady || !ytPlayer) return;
    const state = ytPlayer.getPlayerState();
    state === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
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
    do { next = Math.floor(Math.random() * queue.length); }
    while (queue.length > 1 && next === currentIndex);
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

/* ══════════════════════════════════════════════
   LIKE BUTTON
══════════════════════════════════════════════ */
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
  if (!likeBtn) return;
  likeBtn.textContent = '♡';
  likeBtn.classList.remove('liked');
}

/* ══════════════════════════════════════════════
   ADD-TO-PLAYLIST TICK MARK
   When a song is added, its song ID goes into
   addedSongs. All .add-btn[data-song="<id>"]
   elements on the page get the class "btn-added"
   which shows a ✓ via CSS.
══════════════════════════════════════════════ */
function markSongAsAdded(songPk) {
  addedSongs.add(String(songPk));
  // Find every add button for this song and style it
  document.querySelectorAll(`.add-btn[data-song="${songPk}"]`).forEach(btn => {
    btn.classList.add('btn-added');
    btn.textContent = '✓ Added';
    btn.title = 'Already in playlist';
  });
}

/* ══════════════════════════════════════════════
   AUDIO ELEMENT EVENTS
══════════════════════════════════════════════ */

/* ── Audio events ── */
// These are registered after DOM is ready (see DOMContentLoaded)

/* ══════════════════════════════════════════════
   PROGRESS & VOLUME HELPERS
══════════════════════════════════════════════ */
function updateProgressBar(pct) {
  if (!progressBar) return;
  progressBar.value = pct;
  progressBar.style.background =
    `linear-gradient(to right, #fff ${pct}%, #535353 ${pct}%)`;
}

function updateVolumeBar(val) {
  if (!volumeBar) return;
  volumeBar.style.background =
    `linear-gradient(to right, #1db954 ${val}%, #535353 ${val}%)`;
}

/* ══════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════ */
function formatTime(secs) {
  if (isNaN(secs) || secs < 0) return '0:00';
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
}

function fetchPost(url) {
  return fetch(url, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCookie('csrftoken') },
  });
}

function getCookie(name) {
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop().split(';').shift() : '';
}

/* ══════════════════════════════════════════════
   INIT — everything that needs the DOM ready
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  audio       = document.getElementById('audio-player');
  progressBar = document.getElementById('progress');
  volumeBar   = document.getElementById('volume');
  playBtn     = document.getElementById('play-btn');
  likeBtn     = document.getElementById('like-btn');

  if (!audio || !progressBar || !volumeBar || !playBtn) return;

  // Init volume
  audio.volume = 0.8;
  updateVolumeBar(80);
  setPlayState('paused');

  /* ── Audio events ── */
  audio.addEventListener('timeupdate', () => {
    if (isYouTube || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    updateProgressBar(pct);
    document.getElementById('current-time').textContent = formatTime(audio.currentTime);
    document.getElementById('total-time').textContent   = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    setPlayState('paused');
    isRepeat ? (audio.currentTime = 0, audio.play()) : nextSong();
  });

  audio.addEventListener('play',  () => { if (!isYouTube) setPlayState('playing'); });
  audio.addEventListener('pause', () => { if (!isYouTube) setPlayState('paused');  });
  audio.addEventListener('waiting', () => { if (!isYouTube) setPlayState('loading'); });
  audio.addEventListener('canplay', () => {
    if (!isYouTube && !audio.paused) setPlayState('playing');
  });

  /* ── Seek ── */
  progressBar.addEventListener('input', () => {
    const pct = parseFloat(progressBar.value);
    updateProgressBar(pct);
    if (isYouTube) {
      if (!ytReady || !ytPlayer) return;
      ytPlayer.seekTo((pct / 100) * (ytPlayer.getDuration() || 0), true);
    } else {
      if (audio.duration) audio.currentTime = (pct / 100) * audio.duration;
    }
  });

  /* ── Volume ── */
  volumeBar.addEventListener('input', () => {
    const vol = parseInt(volumeBar.value);
    audio.volume = vol / 100;
    if (ytReady && ytPlayer) ytPlayer.setVolume(vol);
    updateVolumeBar(vol);
  });

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    switch (e.code) {
      case 'Space':
        e.preventDefault(); togglePlay(); break;
      case 'ArrowRight':
        e.preventDefault();
        if (isYouTube && ytReady && ytPlayer) ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10, true);
        else audio.currentTime = Math.min((audio.currentTime || 0) + 10, audio.duration || 0);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (isYouTube && ytReady && ytPlayer) ytPlayer.seekTo(Math.max(ytPlayer.getCurrentTime() - 10, 0), true);
        else audio.currentTime = Math.max((audio.currentTime || 0) - 10, 0);
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

  /* ── Add-to-playlist interceptor ──
     Intercepts form submits that match /playlist/<n>/add/<n>/
     Shows toast + marks button with tick. views.py unchanged. */
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!form.action) return;
    if (!/\/playlist\/\d+\/add\/\d+\/?/.test(form.action)) return;
    e.preventDefault();

    // Extract song pk from action URL e.g. /playlist/3/add/7/
    const match   = form.action.match(/\/playlist\/(\d+)\/add\/(\d+)/);
    const songPk  = match ? match[2] : null;
    const songTitle = form.closest('[data-title]')?.dataset.title || 'Song';

    fetch(form.action, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
      body: new FormData(form),
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'added') {
          if (songPk) markSongAsAdded(songPk);
          if (window.showToast) showToast('Added to playlist', 'success');
        }
      })
      .catch(() => {
        if (window.showToast) showToast('Could not add. Try again.', 'error');
      });
  });

  /* ── Click interceptor for data-playlist/data-song buttons ── */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.add-btn[data-playlist][data-song]');
    if (!btn) return;
    e.preventDefault();

    const playlistPk = btn.dataset.playlist;
    const songPk     = btn.dataset.song;
    const url        = `/playlist/${playlistPk}/add/${songPk}/`;

    fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'added') {
          markSongAsAdded(songPk);
          if (window.showToast) showToast('Added to playlist', 'success');
        }
      })
      .catch(() => {
        if (window.showToast) showToast('Could not add. Try again.', 'error');
      });
  });
});

// Expose for inline onclick handlers
window.playSongFromQueue = playSongFromQueue;
window.togglePlay        = togglePlay;
window.prevSong          = prevSong;
window.nextSong          = nextSong;
window.shuffleQueue      = shuffleQueue;
window.toggleRepeat      = toggleRepeat;
window.toggleLike        = toggleLike;
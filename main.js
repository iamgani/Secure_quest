// main.js — client updated to use global server API at /api/*
document.addEventListener('DOMContentLoaded', () => {
  // API base — change to your server's origin if client served separately
  const API_BASE = ''; // '' = same origin, or e.g. 'https://secure-quest.example.com'

  // DOM refs
  const splash = document.getElementById('splash');
  const startBtn = document.getElementById('startBtn');
  const playerNameInput = document.getElementById('playerName');

  const statsBtn = document.getElementById('statsBtn');
  const statsBtnGame = document.getElementById('statsBtnGame');
  const statsBtnSuccess = document.getElementById('statsBtnSuccess');
  const statsBtnFail = document.getElementById('statsBtnFail');

  const modal = document.getElementById('statsModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalStats = document.getElementById('modalStats');
  const modalLeaderboard = document.getElementById('modalLeaderboard');
  const closeStats = document.getElementById('closeStats');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  const game = document.getElementById('game');
  const timerEl = document.getElementById('timer');
  const stageEl = document.getElementById('stage');
  const sceneBg = document.getElementById('scene-bg');
  const signboard = document.getElementById('signboard');
  const door = document.getElementById('door');

  const message = document.getElementById('message');
  const notes = document.getElementById('notes');
  const btnRow = document.getElementById('btnRow');

  const successScreen = document.getElementById('success');
  const finalTime = document.getElementById('finalTime');
  const solutionsSummary = document.getElementById('solutionsSummary');
  const blast = document.getElementById('blast');
  const rankingEl = document.getElementById('ranking');
  const retryBtn = document.getElementById('retryBtn');
  const shareBtn = document.getElementById('shareBtn');

  const failScreen = document.getElementById('fail');
  const failReason = document.getElementById('failReason');
  const failRetry = document.getElementById('failRetry');

  // audio
  const bgMusic = document.getElementById('bgMusic');
  const sfxSuccess = document.getElementById('sfxSuccess');
  const sfxFail = document.getElementById('sfxFail');

  // state
  let playerName = '';
  let stage = 1;
  let startTime = 0;
  let timerInt = null;
  let elapsed = 0;

  // backgrounds
  const assets = {
    stage1: 'assets/building_real.png',
    stage2: 'assets/security_area.png',
    stage3: 'assets/iris_door.png',
    stage4: 'assets/desk_area.png'
  };

  // Stages config (unchanged)
  const STAGES = {
    1: {
      label: 'Entrance',
      bg: assets.stage1,
      prompt: 'At the building entrance, which credential do you present to the attendant?',
      choices: [
        { label: 'A. Place your thumb on a reader', success: false },
        { label: 'B. Show a selfie from your phone', success: false },
        { label: 'C. Present your Employee ID card (swapped card allowed)', success: true },
        { label: 'D. Provide an iris image', success: false }
      ],
      note: `<strong>Requirement:</strong> Secure card-based entry with swap detection and credential validation.<br>
             <strong>How Honeywell helps:</strong> Honeywell's ID-card access platforms detect tampering and swaps, validate credentials and integrate logs for audit — proven across multiple customer sites.`,
      failDoesExit: false,
      failMsg: 'Wrong item — guard still lets you inside but marks you suspicious.'
    },
    2: {
      label: 'Security Area',
      bg: assets.stage2,
      prompt: 'A camera asks for a live facial match — what do you present to the camera?',
      choices: [
        { label: 'A. Look directly into the camera for a live face match', success: true },
        { label: 'B. Hold up your ID card to the camera', success: false },
        { label: 'C. Show your thumb to the camera', success: false },
        { label: 'D. Show a printed eye photo', success: false }
      ],
      note: `<strong>Requirement:</strong> Liveness and face-matching resistant to spoof attempts and securely logged.<br>
             <strong>How Honeywell helps:</strong> Honeywell's facial recognition integrates liveness checks with enterprise monitoring, delivering accurate verification.`,
      failDoesExit: true,
      failMsg: 'Camera mismatch — you are escorted out.'
    },
    3: {
      label: 'Iris Gate',
      bg: assets.stage3,
      prompt: 'The inner gate requires a high-security biometric; which do you present?',
      choices: [
        { label: 'A. Step in for a face scan', success: false },
        { label: 'B. Present an iris/eye scan to the reader', success: true  },
        { label: 'C. Swipe your ID card', success: false },
        { label: 'D. Try thumb reader input', success: false }
      ],
      note: `<strong>Requirement:</strong> Fast, contactless iris recognition for high-security gate control with low false accepts.<br>
             <strong>How Honeywell helps:</strong> Honeywell deploys high-accuracy iris readers integrated with access control systems to secure sensitive entry points.`,
      failDoesExit: true,
      failMsg: 'Wrong biometric — access denied.'
    },
    4: {
      label: 'Desk Access',
      bg: assets.stage4,
      prompt: 'At the desk terminal, which method grants local device or desk access?',
      choices: [
        { label: 'A. Provide an iris image', success: false  },
        { label: 'B. Show your face to a nearby camera', success: false },
        { label: 'C. Swipe or present an ID card', success: false },
        { label: 'D. Press your thumb on the fingerprint sensor', success: true }
      ],
      note: `<strong>Requirement:</strong> Reliable fingerprint/thumb authentication for desk-level access and equipment unlocking.<br>
             <strong>How Honeywell helps:</strong> Honeywell's fingerprint-enabled readers provide dependable desk and device access with audit trails.`,
      failDoesExit: true,
      failMsg: 'Wrong access method — escorted out.'
    }
  };

  // Local fallback keys (if server unreachable)
  const LOCAL_STATS_KEY = 'secureQuestStats_local';
  const LOCAL_RANKING_KEY = 'secureQuestRanking_local';

  // helpers for fallback local storage (only used if API fails)
  function loadLocalStats() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) || '{"totalPlays":0,"totalCompletions":0,"totalRetries":0,"lastPlayer":null,"lastPlayedAt":null}');
    } catch (e) {
      return { totalPlays:0, totalCompletions:0, totalRetries:0, lastPlayer:null, lastPlayedAt:null };
    }
  }
  function saveLocalStats(s) {
    try { localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(s)); } catch(e) {}
  }

  // UI helpers
  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function startTimer() {
    startTime = Date.now();
    timerInt = setInterval(() => {
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (timerEl) timerEl.textContent = `Time: ${elapsed}s`;
    }, 300);
  }
  function stopTimer() { clearInterval(timerInt); timerInt = null; }

  function showScreen(screenEl) {
    [splash, game, successScreen, failScreen].forEach(s => s && s.classList.add('hidden'));
    if (screenEl) screenEl.classList.remove('hidden');
  }

  function loadStage(n) {
    const s = STAGES[n]; if (!s) return;
    stage = n;
    if (stageEl) stageEl.textContent = `Stage ${n}/4`;
    if (sceneBg) sceneBg.src = s.bg;
    if (signboard) signboard.textContent = s.label;
    if (message) message.textContent = s.prompt;
    if (notes) notes.innerHTML = '';
    if (door) door.classList.remove('open');

    // build choices
    if (btnRow) {
      btnRow.innerHTML = '';
      s.choices.forEach(ch => {
        const b = document.createElement('button');
        b.className = 'choice-btn';
        b.textContent = ch.label;
        b.addEventListener('click', () => handleChoice(ch));
        b.addEventListener('touchstart', (e) => { e.preventDefault(); handleChoice(ch); }, { passive: false });
        btnRow.appendChild(b);
      });
    }
  }

  function handleChoice(choice) {
    const s = STAGES[stage];
    if (!s) return;
    if (choice.success) {
      if (notes) notes.innerHTML = s.note;
      if (message) message.textContent = 'Verified — opening doors...';
      if (door) door.classList.add('open');
      try { if (sfxSuccess) { sfxSuccess.currentTime = 0; sfxSuccess.play(); } } catch (e) {}
      setTimeout(() => {
        if (stage < 4) loadStage(stage + 1); else winGame();
      }, 850);
    } else {
      if (!s.failDoesExit && stage === 1) {
        if (message) message.textContent = s.failMsg;
        if (door) door.classList.add('open');
        setTimeout(() => loadStage(2), 700);
      } else {
        try { if (sfxFail) { sfxFail.currentTime = 0; sfxFail.play(); } } catch (e) {}
        failGame('You failed access');
      }
    }
  }

  function runBlast() {
    if (!blast) return;
    blast.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.width = `${6 + Math.random()*8}px`;
      p.style.height = `${6 + Math.random()*6}px`;
      p.style.background = `hsl(${Math.random()*360},80%,60%)`;
      p.style.left = `${Math.random()*90}%`;
      p.style.top = `-20px`;
      p.style.opacity = '0.95';
      p.style.transition = '1.1s';
      blast.appendChild(p);
      setTimeout(()=> {
        p.style.top = `${65 + Math.random()*30}%`;
        p.style.transform = `rotate(${Math.random()*720}deg)`;
      }, i*40);
    }
  }

  // ---- Server interactions ----

  async function apiGet(path) {
    try {
      const res = await fetch(API_BASE + path, { method: 'GET', credentials: 'same-origin' });
      if (!res.ok) throw new Error('bad response');
      return await res.json();
    } catch (e) {
      console.warn('apiGet failed', path, e);
      return null;
    }
  }
  async function apiPost(path, body) {
    try {
      const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error('bad response');
      return await res.json();
    } catch (e) {
      console.warn('apiPost failed', path, e);
      return null;
    }
  }

  // update UI modal with server stats; falls back to local storage if server unreachable
  async function renderModalStatsPanel() {
    let stats = await apiGet('/api/stats');
    if (!stats) stats = loadLocalStats();
    if (!modalStats) return;
    const lastPlayed = stats.lastPlayedAt ? new Date(stats.lastPlayedAt).toLocaleString() : '—';
    modalStats.innerHTML = `
      <div class="stats-row"><div class="stat-label">Total Plays</div><div class="stat-value">${stats.totalPlays}</div></div>
      <div class="stats-row"><div class="stat-label">Total Completed</div><div class="stat-value">${stats.totalCompletions}</div></div>
      <div class="stats-row"><div class="stat-label">Total Retries</div><div class="stat-value">${stats.totalRetries}</div></div>
      <div class="stats-row"><div class="stat-label">Last Player</div><div class="stat-value">${stats.lastPlayer ? stats.lastPlayer : '—'}</div></div>
      <div class="stats-row"><div class="stat-label">Last Played</div><div class="stat-value">${lastPlayed}</div></div>
    `;
  }

  async function renderModalLeaderboard() {
    let top = await apiGet('/api/leaderboard?limit=5');
    if (!top) {
      try { top = JSON.parse(localStorage.getItem(LOCAL_RANKING_KEY) || '[]'); } catch(e) { top = []; }
    }
    if (!modalLeaderboard) return;
    modalLeaderboard.innerHTML = '<h3>Leaderboard</h3>';
    if (!top || !top.length) { modalLeaderboard.innerHTML += '<div class="small-muted">No records yet</div>'; return; }
    const ul = document.createElement('div');
    ul.className = 'leaderboard-list';
    top.forEach((r, idx) => {
      const item = document.createElement('div');
      item.className = 'leader-item';
      item.textContent = `${idx+1}. ${r.name} — ${r.time}s`;
      ul.appendChild(item);
    });
    modalLeaderboard.appendChild(ul);
  }

  function openStatsModal() {
    renderModalStatsPanel();
    renderModalLeaderboard();
    show(modal);
    const closeBtn = closeStats || modalCloseBtn;
    if (closeBtn) closeBtn.focus();
  }
  function closeStatsModal() { hide(modal); }

  // ---- game end / start actions that call server endpoints ----

  async function startHandler() {
    const name = playerNameInput && playerNameInput.value ? playerNameInput.value.trim() : '';
    if (!name) { if (playerNameInput) playerNameInput.focus(); return; }
    playerName = name;

    // call server to increment global plays.
    const res = await apiPost('/api/play', { name: playerName });
    if (!res) {
      // fallback: persist locally
      const s = loadLocalStats();
      s.totalPlays = (s.totalPlays || 0) + 1;
      s.lastPlayer = playerName;
      s.lastPlayedAt = Date.now();
      saveLocalStats(s);
    }

    // Start background audio on gesture
    try {
      if (bgMusic) { bgMusic.volume = 0.25; bgMusic.currentTime = 0; bgMusic.play().catch(()=>{}); }
    } catch (e) {}

    showScreen(game);
    loadStage(1);
    startTimer();
  }

  async function winGame() {
    stopTimer();
    // call server to increment completions
    const res = await apiPost('/api/complete', {});
    if (!res) {
      const s = loadLocalStats();
      s.totalCompletions = (s.totalCompletions || 0) + 1;
      saveLocalStats(s);
    }

    if (finalTime) finalTime.textContent = `${playerName} completed in ${elapsed}s`;
    try { if (sfxSuccess) { sfxSuccess.currentTime = 0; sfxSuccess.play(); } } catch (e) {}
    runBlast();

    // save score to server leaderboard
    const saved = await apiPost('/api/score', { name: playerName, time: elapsed });
    if (!saved) {
      // fallback: local leaderboard
      try {
        const raw = JSON.parse(localStorage.getItem(LOCAL_RANKING_KEY) || '[]');
        raw.push({ name: playerName, time: elapsed });
        raw.sort((a,b)=>a.time-b.time);
        localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(raw.slice(0, 50)));
      } catch (e) {}
    }

    showScreen(successScreen);
  }

  async function failGame(msg) {
    stopTimer();
    // increment retry on server (since fail->retry is a retry)
    try {
      const res = await apiPost('/api/retry', {});
      if (!res) {
        const s = loadLocalStats();
        s.totalRetries = (s.totalRetries || 0) + 1;
        saveLocalStats(s);
      }
    } catch (e) { /* ignore */ }

    if (failReason) failReason.textContent = msg;
    showScreen(failScreen);
  }

  // Event listeners attach (start, share, retry etc.)
  if (startBtn) {
    startBtn.addEventListener('click', startHandler);
    startBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHandler(); }, { passive: false });
  }
  if (playerNameInput) {
    playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startHandler(); });
  }

  if (retryBtn) retryBtn.addEventListener('click', ()=> {
    // count as retry
    apiPost('/api/retry', {}); // fire-and-forget; fallback not critical here
    location.reload();
  });
  if (failRetry) failRetry.addEventListener('click', ()=> {
    apiPost('/api/retry', {});
    location.reload();
  });

  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = location.href;
      if (navigator.share) {
        navigator.share({ title: 'Play Secure Quest', text: 'Try this security access game', url }).catch(()=>{});
      } else {
        navigator.clipboard && navigator.clipboard.writeText(url).then(()=> alert('Link copied to clipboard'));
      }
    });
  }

  // Stats modal triggers (show only)
  if (statsBtn) statsBtn.addEventListener('click', openStatsModal);
  if (statsBtnGame) statsBtnGame.addEventListener('click', openStatsModal);
  if (statsBtnSuccess) statsBtnSuccess.addEventListener('click', openStatsModal);
  if (statsBtnFail) statsBtnFail.addEventListener('click', openStatsModal);

  if (closeStats) closeStats.addEventListener('click', closeStatsModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeStatsModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeStatsModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeStatsModal(); });

  // initial UI state
  showScreen(splash);
});

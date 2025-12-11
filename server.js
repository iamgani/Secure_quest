// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// initialize files if missing
if (!fs.existsSync(STATS_FILE)) {
  fs.writeFileSync(STATS_FILE, JSON.stringify({
    totalPlays: 0,
    totalCompletions: 0,
    totalRetries: 0,
    lastPlayer: null,
    lastPlayedAt: null
  }, null, 2));
}
if (!fs.existsSync(SCORES_FILE)) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify([], null, 2));
}

function readStats() {
  return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
}
function writeStats(s) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2));
}
function readScores() {
  return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
}
function writeScores(list) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(list, null, 2));
}

// GET /api/stats -> returns stats object
app.get('/api/stats', (req, res) => {
  try {
    const stats = readStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'failed reading stats' });
  }
});

// POST /api/play -> increment totalPlays and update lastPlayer/lastPlayedAt
// body: { name: "playerName" }
app.post('/api/play', (req, res) => {
  try {
    const name = (req.body && req.body.name) ? String(req.body.name).slice(0,64) : null;
    const stats = readStats();
    stats.totalPlays = (stats.totalPlays || 0) + 1;
    if (name) {
      stats.lastPlayer = name;
      stats.lastPlayedAt = Date.now();
    }
    writeStats(stats);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed incrementing play' });
  }
});

// POST /api/retry -> increment totalRetries
app.post('/api/retry', (req, res) => {
  try {
    const stats = readStats();
    stats.totalRetries = (stats.totalRetries || 0) + 1;
    writeStats(stats);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'failed incrementing retry' });
  }
});

// POST /api/complete -> increment totalCompletions
app.post('/api/complete', (req, res) => {
  try {
    const stats = readStats();
    stats.totalCompletions = (stats.totalCompletions || 0) + 1;
    writeStats(stats);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'failed incrementing completion' });
  }
});

// GET /api/leaderboard -> top N (default 5)
app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '5', 10);
    const scores = readScores();
    scores.sort((a,b) => a.time - b.time);
    res.json(scores.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: 'failed reading leaderboard' });
  }
});

// POST /api/score -> add { name, time } and return top list
app.post('/api/score', (req, res) => {
  try {
    const { name, time } = req.body || {};
    if (!name || typeof time !== 'number') {
      return res.status(400).json({ error: 'invalid payload' });
    }

    const scores = readScores();
    scores.push({ name: String(name).slice(0,64), time: Math.floor(time), createdAt: Date.now() });
    scores.sort((a,b) => a.time - b.time);
    const top = scores.slice(0, 50); // keep up to 50 records to limit file size
    writeScores(top);
    res.json(top.slice(0,5));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed saving score' });
  }
});

// static serving for client (optional). If you want the server to serve the client,
// place your built client files in a `public` folder and enable this:
// app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure Quest API listening on ${PORT}`));

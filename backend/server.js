require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ⬅️ NUEVO

const Player = require('./models/Player');
const Run = require('./models/run');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();

// CORS y JSON
const allow = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) ?? ['*'];
app.use(cors({ origin: allow }));
app.use(express.json());

const { MONGODB_URI, PORT = 3000 } = process.env;

// ====================== ESTÁTICOS (Frontend + Assets) ======================
// Si tu backend/ está en /juego/backend y tu frontend/ y assets/ están en /juego/frontend y /juego/assets,
// estos joins suben un nivel desde backend/ ( __dirname ) a la raíz del repo.

//
// 1) /assets → carpeta real /assets (para que /assets/global/global.css salga con text/css)
//
app.use('/assets',
  express.static(
    path.join(__dirname, '..', 'assets'),
    {
      setHeaders: (res, filePath) => {
        // Forzar MIME correcto para CSS/JS en caso de que el host los sirva como text/plain
        if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
      }
    }
  )
);

// 2) frontend estático (sirve index.html y demás páginas como disparando.html, candy.html, etc.)
app.use(
  express.static(
    path.join(__dirname, '..', 'frontend'),
    {
      setHeaders: (res, filePath) => {
        // No es imprescindible, pero ayuda si hay JS en frontend/
        if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
      }
    }
  )
);

// 3) ruta raíz → entrega el menú de minijuegos de frontend/index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ====================== DB ======================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => { console.error('Error MongoDB:', err); process.exit(1); });

// ====================== API ======================
/**
 * POST /api/runs
 * Guarda una corrida y actualiza mejores marcas del jugador.
 * body: { playerId, name?, score, time, level }
 */
app.post('/api/runs', async (req, res) => {
  try {
    const { playerId, name = '', score, time, level } = req.body || {};
    if (!playerId || typeof score !== 'number' || typeof time !== 'number' || typeof level !== 'number') {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Guarda el run (histórico)
    await Run.create({ playerId, name, score, time, level });

    // Actualiza/crea el player con mejores marcas
    const player = await Player.findOne({ playerId });
    if (!player) {
      const bestTime = time > 0 ? time : 0;
      const created = await Player.create({
        playerId, name, bestScore: score, bestTime, lastLevel: level
      });
      return res.json({ ok: true, player: created });
    } else {
      if (name && name !== player.name) player.name = name;
      if (score > player.bestScore) player.bestScore = score;
      if (player.bestTime === 0 || (time > 0 && time < player.bestTime)) player.bestTime = time;
      player.lastLevel = level;
      player.updatedAt = new Date();
      await player.save();
      return res.json({ ok: true, player });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

/**
 * GET /api/leaderboard?limit=10
 * Ranking por mejor puntaje (desc) y desempate por mejor tiempo (asc).
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const rows = await Player.find({})
      .sort({ bestScore: -1, bestTime: 1 })
      .limit(limit)
      .select({ _id: 0, playerId: 1, name: 1, bestScore: 1, bestTime: 1, updatedAt: 1 });

    res.json({ ok: true, leaderboard: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

/**
 * GET /api/player/:playerId
 * Resumen del jugador.
 */
app.get('/api/player/:playerId', async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.playerId })
      .select({ _id: 0, playerId: 1, name: 1, bestScore: 1, bestTime: 1, lastLevel: 1, updatedAt: 1 });
    if (!player) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, player });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// ====================== REGISTRO ======================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Datos faltantes' });

    const existe = await User.findOne({ username });
    if (existe) return res.status(400).json({ error: 'Usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash: hash });

    res.json({ ok: true, msg: 'Usuario registrado' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Error de servidor en /api/register' });
  }
});

// ====================== LOGIN ======================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Firmar token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: '7d' }
    );

    res.json({ ok: true, token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// ====================== START ======================
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));

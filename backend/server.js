require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Player = require('./models/Player');
const Run = require('./models/run');

const app = express();
const allow = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) ?? ['*'];
app.use(cors({ origin: allow }));
app.use(express.json());

const { MONGODB_URI, PORT = 3000 } = process.env;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB conectado'))
    .catch(err => { console.error('Error MongoDB:', err); process.exit(1); });

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
        await Run.create({
            playerId,
            name,
            score,
            time,
            level,
            game: game === 'snake' ? 'snake' : 'disparando' // default seguro
        });

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
    const gameParam = (req.query.game || '').toLowerCase();
    const game = gameParam === 'snake' ? 'snake' : (gameParam === 'disparando' ? 'disparando' : null);

    if (!game) {
      // ✅ Comportamiento original (global)
      const rows = await Player.find({})
        .sort({ bestScore: -1, bestTime: 1 })
        .limit(limit)
        .select({ _id: 0, playerId: 1, name: 1, bestScore: 1, bestTime: 1, updatedAt: 1 });

      return res.json({ ok: true, leaderboard: rows, scope: 'global' });
    }

    // ✅ Ranking por juego desde Runs
    // Ordenamos primero por score desc, luego time asc, y nos quedamos con el primer run por jugador.
    const rows = await Run.aggregate([
      { $match: { game } },
      { $sort: { score: -1, time: 1, createdAt: 1 } },
      {
        $group: {
          _id: '$playerId',
          name: { $first: '$name' },
          bestScore: { $first: '$score' },
          bestTime: { $first: '$time' },
          updatedAt: { $first: '$createdAt' },
        }
      },
      { $limit: limit },
      { $project: { _id: 0, playerId: '$_id', name: 1, bestScore: 1, bestTime: 1, updatedAt: 1, game: { $literal: game } } }
    ]);

    return res.json({ ok: true, game, leaderboard: rows, scope: 'by-game' });
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

app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));

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
        console.error('REGISTER ERROR:', err); // <-- verás el error en logs de Render
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
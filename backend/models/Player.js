const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  bestScore: { type: Number, default: 0 },      // mayor es mejor
  bestTime: { type: Number, default: 0 },       // 0 = sin marca; menor es mejor
  lastLevel: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Player', PlayerSchema);

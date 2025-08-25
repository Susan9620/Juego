const mongoose = require('mongoose');

const RunSchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  score: { type: Number, required: true },
  time: { type: Number, required: true },  // segundos
  level: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Run', RunSchema);

const mongoose = require('mongoose');

const RunSchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  name:     { type: String, default: '' },
  score:    { type: Number, required: true },
  time:     { type: Number, required: true },  // segundos
  level:    { type: Number, required: true },
  game:     { type: String, enum: ['disparando', 'snake'], default: 'disparando', index: true },
  createdAt:{ type: Date, default: Date.now, index: true }
}, { versionKey: false });

module.exports = mongoose.model('Run', RunSchema);
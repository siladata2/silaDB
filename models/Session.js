// models/Session.js
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // creds.json content (object)
  creds: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // keys folder content (object ya files)
  keys: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  lastConnected: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', SessionSchema);

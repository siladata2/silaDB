// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Session = require('./models/Session');

const app = express();

// ==================== CONFIG (NDANI YA CODE) ====================
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'silatech22';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sila_md:sila0022@sila.67mxtd7.mongodb.net/sila_sessions?retryWrites=true&w=majority';

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve dashboard (static files) — KABLA ya routes
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid API key' });
  }
  next();
}

// ==================== ROUTES ====================

// Health check (bila auth) — dashboard inatumia hii
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'SILA Session DB API',
    version: '1.0.0',
    owner: 'Sila Tech',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root — kama dashboard haipo, rudisha info
app.get('/', (req, res, next) => {
  // express.static inashughulikia '/' kama public/index.html ipo
  // Kama haipo, tutarudisha JSON
  const fs = require('fs');
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.json({
    status: 'ok',
    name: 'SILA Session DB API',
    version: '1.0.0',
    owner: 'Sila Tech',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      dashboard: 'GET / (kama public/index.html ipo)',
      health: 'GET /api/health',
      saveSession: 'POST /api/session (auth)',
      getSession: 'GET /api/session/:number (auth)',
      getAllSessions: 'GET /api/sessions (auth)',
      deleteSession: 'DELETE /api/session/:number (auth)',
      touchSession: 'POST /api/session/:number/touch (auth)'
    }
  });
});

// ==================== SAVE / UPDATE SESSION ====================
app.post('/api/session', authMiddleware, async (req, res) => {
  try {
    const { number, creds, keys } = req.body;

    if (!number || !creds) {
      return res.status(400).json({ status: 'error', message: 'number and creds are required' });
    }

    const sanitized = String(number).replace(/\D/g, '');
    if (!sanitized) {
      return res.status(400).json({ status: 'error', message: 'Invalid number format' });
    }

    const existing = await Session.findOne({ number: sanitized });
    if (existing) {
      existing.creds = creds;
      existing.keys = keys || existing.keys || {};
      existing.lastConnected = new Date();
      existing.isActive = true;
      await existing.save();
      return res.json({ status: 'ok', message: 'Session updated', number: sanitized });
    }

    const newSession = new Session({
      number: sanitized,
      creds,
      keys: keys || {},
      lastConnected: new Date()
    });
    await newSession.save();

    return res.json({ status: 'ok', message: 'Session saved', number: sanitized });
  } catch (err) {
    console.error('POST /api/session error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== GET ONE SESSION ====================
app.get('/api/session/:number', authMiddleware, async (req, res) => {
  try {
    const sanitized = String(req.params.number).replace(/\D/g, '');
    const session = await Session.findOne({ number: sanitized });

    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Session not found' });
    }

    res.json({
      status: 'ok',
      session: {
        number: session.number,
        creds: session.creds,
        keys: session.keys,
        isActive: session.isActive,
        lastConnected: session.lastConnected,
        createdAt: session.createdAt
      }
    });
  } catch (err) {
    console.error('GET /api/session error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== GET ALL SESSIONS ====================
app.get('/api/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({}).select('number isActive lastConnected createdAt');
    res.json({
      status: 'ok',
      count: sessions.length,
      sessions: sessions.map(s => ({
        number: s.number,
        isActive: s.isActive,
        lastConnected: s.lastConnected,
        createdAt: s.createdAt
      }))
    });
  } catch (err) {
    console.error('GET /api/sessions error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== DELETE SESSION ====================
app.delete('/api/session/:number', authMiddleware, async (req, res) => {
  try {
    const sanitized = String(req.params.number).replace(/\D/g, '');
    const result = await Session.findOneAndDelete({ number: sanitized });

    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Session not found' });
    }

    res.json({ status: 'ok', message: 'Session deleted', number: sanitized });
  } catch (err) {
    console.error('DELETE /api/session error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== TOUCH SESSION ====================
app.post('/api/session/:number/touch', authMiddleware, async (req, res) => {
  try {
    const sanitized = String(req.params.number).replace(/\D/g, '');
    await Session.updateOne({ number: sanitized }, { lastConnected: new Date() });
    res.json({ status: 'ok', number: sanitized });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

// ==================== START SERVER ====================
async function start() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('📡 URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 SILA Session DB API running on port ${PORT}`);
      console.log(`🌐 Dashboard: http://localhost:${PORT}/`);
      console.log(`🔑 API Key: ${API_KEY}`);
      console.log(`📢 Owner: Sila Tech`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

start();

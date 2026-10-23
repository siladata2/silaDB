// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Session = require('./models/Session');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware — kila request inahitaji x-api-key
function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid API key' });
  }
  next();
}

// ==================== ROUTES ====================

// Health check (bila auth)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'SILA Session DB API',
    version: '1.0.0',
    owner: 'Sila Tech',
    endpoints: {
      saveSession: 'POST /api/session (auth)',
      getSession: 'GET /api/session/:number (auth)',
      getAllSessions: 'GET /api/sessions (auth)',
      deleteSession: 'DELETE /api/session/:number (auth)',
      updateLastConnected: 'POST /api/session/:number/touch (auth)'
    }
  });
});

// ==================== SAVE / UPDATE SESSION ====================
// Body: { number, creds, keys }
app.post('/api/session', authMiddleware, async (req, res) => {
  try {
    const { number, creds, keys } = req.body;

    if (!number || !creds) {
      return res.status(400).json({ status: 'error', message: 'number and creds are required' });
    }

    const sanitized = String(number).replace(/\D/g, '');

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
        lastConnected: session.lastConnected
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

// ==================== TOUCH SESSION (update lastConnected) ====================
app.post('/api/session/:number/touch', authMiddleware, async (req, res) => {
  try {
    const sanitized = String(req.params.number).replace(/\D/g, '');
    await Session.updateOne({ number: sanitized }, { lastConnected: new Date() });
    res.json({ status: 'ok', number: sanitized });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== START SERVER ====================
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 SILA Session DB API running on port ${PORT}`);
      console.log(`📢 Owner: Sila Tech`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

start();

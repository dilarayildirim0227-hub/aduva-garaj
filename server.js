const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;
const API_TARGET = 'http://localhost:8000';

// API proxy middleware
app.use('/api', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  logLevel: 'silent',
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ detail: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' });
  }
}));

// Static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend dev server: http://localhost:${PORT}`);
  console.log(`🔗 API proxy: http://localhost:${PORT}/api -> ${API_TARGET}`);
});

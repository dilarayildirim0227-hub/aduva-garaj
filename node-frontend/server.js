require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:4000';

app.use(cors());

// Proxy API requests to Python backend - must be before express.json() to avoid body consumption
app.use('/v1', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/v1/' },  // Add /v1 prefix for API
  onProxyReq: (proxyReq, req, res) => {
    // Forward auth headers
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    if (req.headers['x-cart-token']) {
      proxyReq.setHeader('X-Cart-Token', req.headers['x-cart-token']);
    }
    // Forward body for POST/PUT/PATCH
    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Page routes
const pages = {
  '/': 'index.html',
  '/urunler': 'urunlar.html',
  '/urun': 'urun.html',
  '/sepet': 'sepet.html',
  '/giris': 'giris.html',
  '/kayit': 'kayit.html',
  '/odeme': 'odeme.html',
  '/kurumsal': 'kurumsal.html',
  '/iletisim': 'iletisim.html',
  '/hakkimizda': 'hakkimizda.html',
  '/yardim': 'yardim.html',
  '/iade-degisim': 'iade-degisim.html',
  '/kvkk': 'kvkk.html',
  '/gizlilik': 'gizlilik.html',
  '/mesafe-satis': 'mesafe-satis.html',
  '/sifre-sifirla': 'sifre-sifirla.html',
  '/hesabim': 'hesabim.html',
  '/siparislerim': 'siparislerim.html',
  '/araclarim': 'araclarim.html',
  '/siparis-basarili': 'siparis-basarili.html',
};

// Serve specific pages
Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

// Product detail route with dynamic ID
app.get('/urun/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'urun.html'));
});

// Fallback for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
  console.log(`Proxying API requests to ${API_URL}`);
});
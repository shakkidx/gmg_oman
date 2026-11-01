// Admin image upload. The admin panel resizes photos in the browser and sends them
// as a base64 data URL, so no extra upload library is needed on the server.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireAdmin } = require('../../../middleware/auth');

const UPLOAD_DIR = path.join(require('../../../config/storage').UPLOADS_DIR, 'products');
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 8 * 1024 * 1024;

router.post('/', requireAdmin, (req, res) => {
  try {
    const { dataUrl, filename = 'product' } = req.body || {};
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
    if (!m) {
      return res.status(400).json({ success: false, error: 'Please upload a JPG, PNG or WEBP image.' });
    }
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({ success: false, error: 'Image is too large (max 8 MB).' });
    }
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const base = String(filename).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50) || 'product';
    const name = `${base}-${crypto.randomBytes(4).toString('hex')}.${TYPES[m[1]]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    res.status(201).json({ success: true, url: `/uploads/products/${name}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

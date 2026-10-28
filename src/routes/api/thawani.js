// Thawani Callback Verification & Webhook Endpoint

const express = require('express');
const router = express.Router();
const ThawaniService = require('../../services/thawani/thawaniService');

/**
 * GET /api/thawani/verify
 * Server-side verification called when customer returns from payment page
 */
router.get('/verify', async (req, res) => {
  try {
    const { session_id } = req.query;
    const order_id = req.query.order_id || req.query.order;

    if (!session_id && !order_id) {
      return res.status(400).json({
        success: false,
        error: 'session_id or order_id is required for verification.'
      });
    }

    const verification = await ThawaniService.verifySession(session_id, order_id);

    res.json({
      success: true,
      data: verification
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/thawani/webhook
 * Receives payment notifications from Thawani Merchant System
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'Empty webhook payload.' });
    }

    const result = await ThawaniService.processWebhook(payload);

    res.json({
      success: true,
      message: 'Webhook processed successfully.',
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

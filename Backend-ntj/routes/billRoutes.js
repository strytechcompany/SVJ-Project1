const express = require('express');
const {
  createBill,
  getBills,
  getBillById,
  handleWhatsAppStatusWebhook,
} = require('../controllers/billController');

const router = express.Router();

router.post('/whatsapp/status', handleWhatsAppStatusWebhook);
router.post('/create', createBill);
router.get('/', getBills);
router.get('/:id', getBillById);

module.exports = router;

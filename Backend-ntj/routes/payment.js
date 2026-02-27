const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  handleDealerTransfer,
  getDealerTransferHistory,
  getPaymentById,
  updatePayment,
  deletePayment
} = require('../controllers/paymentController');

router.get('/', getPayments);
router.post('/', createPayment);
router.post('/dealerTransferHistory', handleDealerTransfer);
router.get('/dealerTransferHistory', getDealerTransferHistory);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createBillSummary,
  getBillSummaries,
  getBillsByCustomerId,
  getBillSummaryById,
  updateBillSummary,
  deleteBillSummary
} = require('../controllers/billSummaryController');

router.post('/', createBillSummary);
router.get('/', getBillSummaries);
router.get('/customer/:customerId', getBillsByCustomerId);
router.get('/:id', getBillSummaryById);
router.put('/:id', updateBillSummary);
router.delete('/:id', deleteBillSummary);

module.exports = router;
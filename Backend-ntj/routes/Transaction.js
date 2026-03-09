const express = require('express');
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  getLastTransaction,
  updateTransaction,
} = require('../controllers/transactionController');

router.get("/", getTransactions);
router.post("/", createTransaction);
router.put("/:id", updateTransaction);
router.get("/last", getLastTransaction);

module.exports = router;

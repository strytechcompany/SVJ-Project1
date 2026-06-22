const express = require('express');
const router = express.Router();
const { getStocks, createStock, updateStock, deleteStock, getStockByBarcode } = require('../controllers/stockMasterController');

router.get('/barcode/:barcode', getStockByBarcode);
router.get('/', getStocks);
router.post('/', createStock);
router.put('/:id', updateStock);
router.delete('/:id', deleteStock);

module.exports = router;
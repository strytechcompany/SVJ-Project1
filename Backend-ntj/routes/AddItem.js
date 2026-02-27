const express = require('express');
const router = express.Router();
const {
    createAddItem,
    getAddItems,
    getAddItemsByCustomer,
    getAddItemsByInvoice,
    deleteAddItem
} = require('../controllers/addItemController');

router.post('/', createAddItem);
router.get('/', getAddItems);
router.get('/customer/:customerName', getAddItemsByCustomer);
router.get('/invoice/:invoiceNo', getAddItemsByInvoice);
router.delete('/:id', deleteAddItem);

module.exports = router;
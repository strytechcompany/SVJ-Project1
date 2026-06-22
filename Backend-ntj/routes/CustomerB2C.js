const express = require('express');
const router = express.Router();
const {
    createCustomerB2C,
    getCustomersB2C,
    getCustomerB2CById,
    updateCustomerB2C,
    patchB2CBalances,
    deleteCustomerB2C
} = require('../controllers/customerB2CController');

router.post('/', createCustomerB2C);
router.get('/', getCustomersB2C);
router.get('/:id', getCustomerB2CById);
router.put('/:id', updateCustomerB2C);
router.patch('/:id/balances', patchB2CBalances);
router.delete('/:id', deleteCustomerB2C);

module.exports = router;

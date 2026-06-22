const express = require('express');
const router = express.Router();
const { createChit, getChits, getChitById, addPayment, updateChit, deleteChit } = require('../controllers/chitController');

router.get('/', getChits);
router.post('/', createChit);
router.get('/:id', getChitById);
router.post('/:id/payment', addPayment);
router.put('/:id', updateChit);
router.delete('/:id', deleteChit);

module.exports = router;

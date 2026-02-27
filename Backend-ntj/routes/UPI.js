const express = require('express');
const router = express.Router();
const {
  getUPIs,
  createUPI,
  selectPrimaryUPI,
  updateUPI,
  deleteUPI
} = require('../controllers/upiController');

router.get('/', getUPIs);
router.post('/', createUPI);
router.put('/select', selectPrimaryUPI);
router.put('/:id', updateUPI);
router.delete('/:id', deleteUPI);

module.exports = router;

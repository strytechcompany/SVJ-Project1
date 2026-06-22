const express = require("express");
const {
  getGstCustomers,
  createGstCustomer,
  updateGstCustomer,
  deleteGstCustomer,
} = require("../controllers/gstCustomerController");

const router = express.Router();

router.get("/", getGstCustomers);
router.post("/", createGstCustomer);
router.put("/:id", updateGstCustomer);
router.delete("/:id", deleteGstCustomer);

module.exports = router;

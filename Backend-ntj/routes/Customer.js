const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerBalanceByPhone,
  deleteCustomer,
  deleteAllB2BCustomers
} = require("../controllers/customerController");

router.get("/", getCustomers);
router.put("/update-balance", updateCustomerBalanceByPhone);
router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.delete("/", deleteAllB2BCustomers);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;

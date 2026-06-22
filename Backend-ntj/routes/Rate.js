const express = require("express");
const router = express.Router();
const { getRate, createRate, updateRate } = require("../controllers/rateController");

router.get("/", getRate);
router.post("/", createRate);
router.put("/", updateRate);

module.exports = router;

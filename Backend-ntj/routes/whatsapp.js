const express = require("express");
const { upload, sendBillPdf } = require("../controllers/whatsappController");

const router = express.Router();

// multipart/form-data:
// - phone: E.164 digits (e.g. 919876543210)
// - pdf: file field (application/pdf)
// - filename (optional)
// - caption (optional)
router.post("/send-bill-pdf", upload.single("pdf"), sendBillPdf);

module.exports = router;


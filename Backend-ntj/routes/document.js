const express = require("express");
const router = express.Router();
const {
  upload,
  uploadDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  downloadDocument,
} = require("../controllers/documentController");

router.get("/", listDocuments);
router.post("/upload", upload.single("file"), uploadDocument);
router.put("/:id", upload.single("file"), updateDocument);
router.delete("/:id", deleteDocument);
router.get("/:id/download", downloadDocument);

module.exports = router;

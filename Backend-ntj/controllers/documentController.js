const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Document = require("../models/Document");

const uploadDir = path.join(__dirname, "..", "uploads", "documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const sanitizeFileName = (name = "") =>
  String(name)
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "document", ext);
    const safeBase = sanitizeFileName(base) || "document";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const fileFilter = (_req, file, cb) => {
  if (allowedMimeTypes.has(String(file.mimetype || "").toLowerCase())) {
    return cb(null, true);
  }
  return cb(new Error("Only PDF, JPG, and PNG files are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const documentName =
      String(req.body.documentName || "").trim() ||
      path.basename(req.file.originalname || req.file.filename, path.extname(req.file.originalname || req.file.filename));

    const relativeUrl = `/uploads/documents/${req.file.filename}`;
    const doc = await Document.create({
      documentName,
      fileType: req.file.mimetype,
      fileUrl: relativeUrl,
      filePath: req.file.path,
      fileSize: Number(req.file.size || 0),
      uploadedAt: new Date(),
    });

    return res.status(201).json(doc);
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload document.", error: error.message });
  }
};

const listDocuments = async (_req, res) => {
  try {
    const rows = await Document.find().sort({ uploadedAt: -1, createdAt: -1 });
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch documents.", error: error.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const row = await Document.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Document not found." });

    const documentName = String(req.body.documentName || "").trim();
    if (documentName) {
      row.documentName = documentName;
    }

    if (req.file) {
      const relativeUrl = `/uploads/documents/${req.file.filename}`;

      if (row.filePath && fs.existsSync(row.filePath)) {
        try {
          fs.unlinkSync(row.filePath);
        } catch (_e) {
          // non-blocking cleanup
        }
      }

      row.fileType = req.file.mimetype;
      row.fileUrl = relativeUrl;
      row.filePath = req.file.path;
      row.fileSize = Number(req.file.size || 0);
      row.uploadedAt = new Date();
    }

    await row.save();
    return res.json(row);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update document.", error: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const row = await Document.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Document not found." });

    await Document.findByIdAndDelete(req.params.id);
    if (row.filePath && fs.existsSync(row.filePath)) {
      fs.unlinkSync(row.filePath);
    }

    return res.json({ message: "Document deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete document.", error: error.message });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const row = await Document.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Document not found." });
    if (!row.filePath || !fs.existsSync(row.filePath)) {
      return res.status(404).json({ message: "File not found on server." });
    }
    return res.download(row.filePath, path.basename(row.filePath));
  } catch (error) {
    return res.status(500).json({ message: "Failed to download document.", error: error.message });
  }
};

module.exports = {
  upload,
  uploadDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  downloadDocument,
};

const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "whatsapp");
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
    const ext = path.extname(file.originalname || "") || ".pdf";
    const base = path.basename(file.originalname || "bill", ext);
    const safeBase = sanitizeFileName(base) || "bill";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    if (mime === "application/pdf") return cb(null, true);
    return cb(new Error("Only PDF files are allowed."));
  },
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const getWhatsAppConfig = () => {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_FROM_PHONE_NUMBER_ID || "";
  const apiBase = process.env.WHATSAPP_API_BASE || "https://graph.facebook.com";
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";
  return { token, phoneNumberId, apiBase, version };
};

const normalizeToE164Digits = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits;
};

const sendBillPdf = async (req, res) => {
  const { token, phoneNumberId, apiBase, version } = getWhatsAppConfig();

  if (!token || !phoneNumberId) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_e) {}
    }
    return res.status(501).json({
      message:
        "WhatsApp Cloud API is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Backend-ntj/.env.",
    });
  }

  if (typeof fetch !== "function") {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_e) {}
    }
    return res.status(500).json({
      message:
        "Server runtime does not support fetch(). Please run the backend on Node.js 18+ (or add a fetch polyfill).",
    });
  }

  try {
    const to = normalizeToE164Digits(req.body.phone || req.body.to || "");
    if (!to) {
      return res.status(400).json({ message: "Customer WhatsApp number is required." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required (field name: pdf)." });
    }

    const filename =
      sanitizeFileName(String(req.body.filename || "").trim()) ||
      sanitizeFileName(req.file.originalname || "") ||
      "bill.pdf";
    const caption = String(req.body.caption || "").trim();

    const pdfBuffer = fs.readFileSync(req.file.path);
    const mediaForm = new FormData();
    mediaForm.append("messaging_product", "whatsapp");
    mediaForm.append(
      "file",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      filename.endsWith(".pdf") ? filename : `${filename}.pdf`
    );

    const mediaResp = await fetch(`${apiBase}/${version}/${phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: mediaForm,
    });

    const mediaText = await mediaResp.text();
    const mediaJson = mediaText ? (() => { try { return JSON.parse(mediaText); } catch { return null; } })() : null;
    if (!mediaResp.ok) {
      return res.status(502).json({
        message: "Failed to upload PDF to WhatsApp Cloud API.",
        error: mediaJson || mediaText,
      });
    }

    const mediaId = mediaJson?.id;
    if (!mediaId) {
      return res.status(502).json({ message: "WhatsApp media upload succeeded but no media id returned." });
    }

    const msgPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: {
        id: mediaId,
        filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
        ...(caption ? { caption } : {}),
      },
    };

    const msgResp = await fetch(`${apiBase}/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msgPayload),
    });

    const msgText = await msgResp.text();
    const msgJson = msgText ? (() => { try { return JSON.parse(msgText); } catch { return null; } })() : null;
    if (!msgResp.ok) {
      return res.status(502).json({
        message: "Failed to send WhatsApp message.",
        error: msgJson || msgText,
      });
    }

    return res.json({
      ok: true,
      mediaId,
      response: msgJson || msgText,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send bill PDF via WhatsApp.", error: error.message });
  } finally {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_e) {}
    }
  }
};

module.exports = { upload, sendBillPdf };


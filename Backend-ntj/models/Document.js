const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    documentName: { type: String, required: true, trim: true },
    fileType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Document || mongoose.model("Document", documentSchema);


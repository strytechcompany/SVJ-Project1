const express = require("express");
const router = express.Router();
const Dealer = require("../models/Dealer");
const Transaction = require("../models/transaction");
const { getBillSummaryModel, getLegacyBillSummaryModel } = require("../models/BillSummary");
const { resolveImageFields, storeImage, isHttpUrl } = require("../utils/imageStorage");

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object") {
    if (value.$oid) return String(value.$oid).trim();
    if (value._id) return normalizeId(value._id);
    if (value.id) return normalizeId(value.id);
  }
  return String(value).trim();
};

const normalizeName = (value) => String(value || "").trim().toLowerCase();
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const isInvalidImageToken = (raw) => {
  const token = String(raw || "").trim().toLowerCase();
  return (
    !token ||
    token === "null" ||
    token === "undefined" ||
    token === "n/a" ||
    token === "[object object]"
  );
};
const readImageField = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isInvalidImageToken(trimmed)) return "";
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const nested = readImageField(parsed);
        if (nested) return nested;
      } catch (_) {}
    }
    return isInvalidImageToken(trimmed) ? "" : trimmed;
  }
  if (Array.isArray(value)) {
    for (const row of value) {
      const nested = readImageField(row);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const candidates = [
    value.uri,
    value.url,
    value.path,
    value.src,
    value.fileUri,
    value.sourceURL,
    value.receiptImage,
    value.proofImage,
    value.image,
    value.base64,
    value.data,
    value.assets,
    value.images,
    value.files,
  ];
  for (const candidate of candidates) {
    const nested = readImageField(candidate);
    if (nested) return nested;
  }
  return "";
};
const rowImage = (row) =>
  readImageField(row?.receiptImage) ||
  readImageField(row?.proofImage) ||
  readImageField(row?.image) ||
  "";

const getDealerImageRows = async () => {
  const dealerTxRows = await Transaction.find({
    $or: [
      { customerType: { $in: ["DEALER", "SUPPLIER"] } },
      { type: { $in: ["DEALER", "SUPPLIER"] } },
      { dealerType: { $in: ["Dealer", "Supplier", "DEALER", "SUPPLIER"] } },
    ],
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select("customerId customerName phone phoneNumber customerNumber receiptImage proofImage image updatedAt createdAt date")
    .lean();

  const BillSummaryB2B = getBillSummaryModel("B2B");
  const dealerBillRows = await BillSummaryB2B.find({
    dealerType: { $in: ["Dealer", "Supplier", "DEALER", "SUPPLIER"] },
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select("customerId customerName phone phoneNumber customerNumber receiptImage proofImage image updatedAt createdAt date")
    .lean();

  let legacyRows = [];
  try {
    const Legacy = getLegacyBillSummaryModel();
    legacyRows = await Legacy.find({
      dealerType: { $in: ["Dealer", "Supplier", "DEALER", "SUPPLIER"] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select("customerId customerName phone phoneNumber customerNumber receiptImage proofImage image updatedAt createdAt date")
      .lean();
  } catch (_) {
    legacyRows = [];
  }

  return [...dealerTxRows, ...dealerBillRows, ...legacyRows];
};

const findLatestImageForDealer = (dealer, imageRows = []) => {
  const dealerIds = new Set(
    [dealer.customerId, dealer._id, dealer.id].map((v) => normalizeId(v)).filter(Boolean),
  );
  const dealerName = normalizeName(dealer.customerName || dealer.name || "");
  const dealerPhone = normalizePhone(
    dealer.customerNumber || dealer.phoneNumber || dealer.phone || "",
  );

  for (const row of imageRows) {
    const img = rowImage(row);
    if (!img) continue;

    const rowIds = [row.customerId, row._id, row.id].map((v) => normalizeId(v)).filter(Boolean);
    const rowName = normalizeName(row.customerName || row.name || "");
    const rowPhone = normalizePhone(row.customerNumber || row.phoneNumber || row.phone || "");

    const idMatch = rowIds.some((id) => dealerIds.has(id));
    const nameMatch = dealerName && rowName && dealerName === rowName;
    const phoneMatch = dealerPhone && rowPhone && dealerPhone === rowPhone;
    if (idMatch || nameMatch || phoneMatch) {
      return {
        image: img,
        row,
      };
    }
  }

  return {
    image: "",
    row: null,
  };
};

// Create a new Dealer
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      phoneNumber,
      emailId,
      shopName,
      gstin,
      address,
      oldBalance,
      advanceBalance,
      customerType,
      workerName,
      image,
      receiptImage,
      proofImage,
    } = req.body;

    // Validate required fields
    if (!customerName || !phoneNumber) {
      return res.status(400).json({ message: "Customer name and phone number are required." });
    }

    const cloudImageFields = await resolveImageFields(req.body, { folder: "ntj/dealers" });
    const newDealer = new Dealer({
      customerName,
      phoneNumber,
      gstin,
      address,
      oldBalance: oldBalance || 0,
      advanceBalance: advanceBalance || 0,
      customerType: customerType || "Dealer",
      workerName: workerName || "",
      image: cloudImageFields.image || image || null,
      receiptImage: cloudImageFields.receiptImage || receiptImage || image || null,
      proofImage: cloudImageFields.proofImage || proofImage || receiptImage || image || null,
    });

    const savedDealer = await newDealer.save();
    res.status(201).json(savedDealer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while creating dealer" });
  }
});

// Get all Dealers
router.get("/", async (req, res) => {
  try {
    const dealers = await Dealer.find().sort({ createdAt: -1 }).lean();
    if (!dealers.length) return res.json([]);
    const imageRows = await getDealerImageRows();
    const withLatestImage = dealers.map((dealer) => {
      const hit = findLatestImageForDealer(dealer, imageRows);
      const latestTransactionImage = hit.image || "";
      const latestTransaction = hit.row || null;
      const resolvedImage =
        readImageField(dealer?.receiptImage) ||
        readImageField(dealer?.proofImage) ||
        readImageField(dealer?.image) ||
        latestTransactionImage;

      return {
        ...dealer,
        image: resolvedImage || "",
        receiptImage: readImageField(dealer?.receiptImage) || resolvedImage || "",
        proofImage: readImageField(dealer?.proofImage) || resolvedImage || "",
        updatedAt:
          latestTransaction?.updatedAt ||
          latestTransaction?.createdAt ||
          dealer?.updatedAt ||
          dealer?.createdAt ||
          new Date().toISOString(),
        latestTransactionImage: latestTransactionImage || "",
        lastTransaction: latestTransaction
          ? {
              _id: latestTransaction._id || null,
              customerId: latestTransaction.customerId || null,
              customerName: latestTransaction.customerName || "",
              date: latestTransaction.date || "",
              createdAt: latestTransaction.createdAt || null,
              updatedAt: latestTransaction.updatedAt || null,
              receiptImage: latestTransaction.receiptImage || latestTransaction.proofImage || latestTransaction.image || "",
              image: latestTransaction.image || latestTransaction.receiptImage || latestTransaction.proofImage || "",
              proofImage: latestTransaction.proofImage || latestTransaction.receiptImage || latestTransaction.image || "",
            }
          : null,
      };
    });

    res.json(withLatestImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching dealers" });
  }
});

// Backfill dealer image fields from latest transactions/bills
router.post("/sync-images", async (req, res) => {
  try {
    const force = String(req.query.force || req.body?.force || "").toLowerCase() === "true";
    const dealers = await Dealer.find().lean();
    if (!dealers.length) return res.json({ ok: true, updated: 0, total: 0 });

    const imageRows = await getDealerImageRows();
    let updated = 0;

    for (const dealer of dealers) {
      const existingImage =
        readImageField(dealer?.receiptImage) ||
        readImageField(dealer?.proofImage) ||
        readImageField(dealer?.image) ||
        "";
      const hit = findLatestImageForDealer(dealer, imageRows);
      const sourceImage = existingImage || String(hit?.image || "").trim();
      if (!sourceImage) continue;
      const resolvedImage = await storeImage(sourceImage, { folder: "ntj/dealers" });
      if (!resolvedImage) continue;
      if (!force && existingImage && isHttpUrl(existingImage) && existingImage === resolvedImage) continue;

      await Dealer.findByIdAndUpdate(
        dealer._id,
        {
          $set: {
            image: resolvedImage,
            receiptImage: resolvedImage,
            proofImage: resolvedImage,
            updatedAt: new Date(),
          },
        },
        { new: false },
      );
      updated += 1;
    }

    return res.json({
      ok: true,
      total: dealers.length,
      updated,
      force,
      message: updated
        ? `Updated ${updated} dealer image record(s)`
        : "No dealer image fields needed update",
    });
  } catch (error) {
    console.error("Dealer image backfill error:", error);
    res.status(500).json({ ok: false, message: "Failed to sync dealer images", error: error.message });
  }
});

// Get a single Dealer by ID
router.get("/:id", async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }
    res.json(dealer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching dealer" });
  }
});

// Update a Dealer by ID
router.put("/:id", async (req, res) => {
  try {
    const cloudImageFields = await resolveImageFields(req.body, { folder: "ntj/dealers" });
    const updatedDealer = await Dealer.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...cloudImageFields,
      },
      { new: true, runValidators: true }
    );

    if (!updatedDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    res.json(updatedDealer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while updating dealer" });
  }
});

// Delete a Dealer by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedDealer = await Dealer.findByIdAndDelete(req.params.id);
    if (!deletedDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }
    res.json({ message: "Dealer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while deleting dealer" });
  }
});

module.exports = router;

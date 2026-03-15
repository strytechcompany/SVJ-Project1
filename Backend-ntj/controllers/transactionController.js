const Transaction = require('../models/transaction.js');
const Dealer = require('../models/Dealer');
const { resolveImageFields } = require("../utils/imageStorage");

const normalize = (v) => String(v || "").trim().toUpperCase();
const pickImage = (body = {}) =>
  (typeof body.receiptImage === "string" && body.receiptImage.trim()) ||
  (typeof body.proofImage === "string" && body.proofImage.trim()) ||
  (typeof body.image === "string" && body.image.trim()) ||
  "";

const syncDealerLatestImage = async (body = {}) => {
  const typeTag = normalize(body.dealerType || body.customerType || body.type);
  if (typeTag !== "DEALER" && typeTag !== "SUPPLIER") return;
  const image = pickImage(body);
  if (!image) return;

  const update = {
    receiptImage: image,
    proofImage: image,
    image,
    updatedAt: new Date(),
  };
  const customerId = String(body.customerId || "").trim();
  const customerName = String(body.customerName || "").trim();

  let updated = null;
  if (/^[0-9a-fA-F]{24}$/.test(customerId)) {
    updated = await Dealer.findByIdAndUpdate(customerId, { $set: update }, { new: true });
  }
  if (!updated && customerName) {
    updated = await Dealer.findOneAndUpdate(
      { customerName: customerName },
      { $set: update },
      { new: true },
    );
  }
};

// @desc    Fetch all transactions
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ updatedAt: -1, createdAt: -1 });
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Create a transaction
// @route   POST /api/transactions
const createTransaction = async (req, res) => {
    try {
        const cloudImageFields = await resolveImageFields(req.body, {
            folder: "ntj/dealer-transactions",
        });
        const transaction = new Transaction({
            customerName: req.body.customerName,
            customerId: req.body.customerId,
            customerType: req.body.customerType || req.body.type || "B2B",
            type: req.body.type || req.body.customerType || "B2B",
            dealerType: req.body.dealerType || "",
            receiptImage:
              typeof cloudImageFields.receiptImage === "string"
                ? cloudImageFields.receiptImage
                : (typeof req.body.receiptImage === "string"
                  ? req.body.receiptImage
                  : (typeof req.body.proofImage === "string"
                    ? req.body.proofImage
                    : (typeof req.body.image === "string" ? req.body.image : null))),
            proofImage:
              typeof cloudImageFields.proofImage === "string"
                ? cloudImageFields.proofImage
                : (typeof req.body.proofImage === "string"
                  ? req.body.proofImage
                  : (typeof req.body.receiptImage === "string" ? req.body.receiptImage : null)),
            image:
              typeof cloudImageFields.image === "string"
                ? cloudImageFields.image
                : (typeof req.body.image === "string"
                  ? req.body.image
                  : (typeof req.body.receiptImage === "string" ? req.body.receiptImage : null)),
            issueTotal: req.body.issueTotal,
            issuePure: req.body.issuePure,
            oldBalance: req.body.oldBalance,
            receiptPure: req.body.receiptPure,
            cashPure: req.body.cashPure,
            balance: req.body.balance,
            advBal: req.body.advBal,
            date: req.body.date || "",
            description: req.body.description || "",
        });

        const saved = await transaction.save();
        try {
            await syncDealerLatestImage({
                customerId: saved?.customerId || req.body.customerId,
                customerName: saved?.customerName || req.body.customerName,
                dealerType: saved?.dealerType || req.body.dealerType,
                customerType: saved?.customerType || req.body.customerType,
                type: saved?.type || req.body.type,
                receiptImage: saved?.receiptImage || req.body.receiptImage,
                proofImage: saved?.proofImage || req.body.proofImage,
                image: saved?.image || req.body.image,
            });
        } catch (syncErr) {
            console.warn("Dealer image sync failed:", syncErr?.message || syncErr);
        }
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// @desc    Fetch the last transaction
// @route   GET /api/transactions/last
const getLastTransaction = async (req, res) => {
    try {
        const lastTransaction = await Transaction.findOne().sort({ updatedAt: -1, createdAt: -1 });
        if (!lastTransaction) {
            return res.status(404).json({ error: "No transactions found" });
        }
        res.status(200).json(lastTransaction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
    try {
        const existing = await Transaction.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        const cloudImageFields = await resolveImageFields(req.body, {
            folder: "ntj/dealer-transactions",
        });

        const patch = {
            customerName: req.body.customerName ?? existing.customerName,
            customerId: req.body.customerId ?? existing.customerId,
            customerType: req.body.customerType ?? req.body.type ?? existing.customerType,
            type: req.body.type ?? req.body.customerType ?? existing.type,
            dealerType: req.body.dealerType ?? existing.dealerType,
            receiptImage:
              typeof cloudImageFields.receiptImage === "string"
                ? cloudImageFields.receiptImage
                : (typeof req.body.receiptImage === "string"
                  ? req.body.receiptImage
                  : (typeof req.body.proofImage === "string"
                    ? req.body.proofImage
                    : (typeof req.body.image === "string" ? req.body.image : existing.receiptImage))),
            proofImage:
              typeof cloudImageFields.proofImage === "string"
                ? cloudImageFields.proofImage
                : (typeof req.body.proofImage === "string"
                  ? req.body.proofImage
                  : (typeof req.body.receiptImage === "string" ? req.body.receiptImage : existing.proofImage)),
            image:
              typeof cloudImageFields.image === "string"
                ? cloudImageFields.image
                : (typeof req.body.image === "string"
                  ? req.body.image
                  : (typeof req.body.receiptImage === "string" ? req.body.receiptImage : existing.image)),
            receiptImageShowInBill:
              typeof req.body.receiptImageShowInBill === "boolean"
                ? req.body.receiptImageShowInBill
                : existing.receiptImageShowInBill,
            issueTotal: req.body.issueTotal ?? existing.issueTotal,
            issuePure: req.body.issuePure ?? existing.issuePure,
            oldBalance: req.body.oldBalance ?? existing.oldBalance,
            receiptPure: req.body.receiptPure ?? existing.receiptPure,
            cashPure: req.body.cashPure ?? existing.cashPure,
            balance: req.body.balance ?? existing.balance,
            advBal: req.body.advBal ?? existing.advBal,
            date: req.body.date ?? existing.date,
            description: req.body.description ?? existing.description,
        };

        const updated = await Transaction.findByIdAndUpdate(
            req.params.id,
            { $set: patch },
            { new: true, runValidators: true },
        );

        try {
            await syncDealerLatestImage({
                customerId: updated?.customerId,
                customerName: updated?.customerName,
                dealerType: updated?.dealerType,
                customerType: updated?.customerType,
                type: updated?.type,
                receiptImage: updated?.receiptImage,
                proofImage: updated?.proofImage,
                image: updated?.image,
            });
        } catch (syncErr) {
            console.warn("Dealer image sync failed on transaction update:", syncErr?.message || syncErr);
        }

        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    getTransactions,
    createTransaction,
    getLastTransaction,
    updateTransaction,
};

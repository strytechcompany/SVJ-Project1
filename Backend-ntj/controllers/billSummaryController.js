const Customer = require('../models/Customer');
const CustomerB2C = require('../models/CustomerB2C');
const Dealer = require('../models/Dealer');
const BillCounter = require('../models/BillCounter');
const { getBillSummaryModel, getLegacyBillSummaryModel, normalizeBillType } = require('../models/BillSummary');
const { resolveImageFields } = require("../utils/imageStorage");

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toIdString = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const pickCustomerId = (body = {}) => {
    // Priority: custom numeric ID property, then explicit MongoDB _id, then nested customer props
    const raw = body.customerId || body.customerMongoId || body.id || body._id || body.customer?._id || body.customer?.id || body.customer?.customerId;
    return toIdString(raw);
};

const formatMainBillNo = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    const n = Number.parseInt(digits, 10);
    if (!Number.isFinite(n) || n <= 0) return '';
    return String(n).padStart(5, '0');
};

const getNextBillNoFromCounter = async () => {
    const doc = await BillCounter.findOneAndUpdate(
        { key: 'global' },
        { $inc: { counter: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return String(doc.counter).padStart(5, '0');
};

const pickBillNo = (body = {}) => formatMainBillNo(body.billNo || body.invoiceNo);

const getUniqueNextBillNo = async () => {
    // Global uniqueness across B2B and B2C collections.
    for (let attempts = 0; attempts < 20; attempts += 1) {
        const next = await getNextBillNoFromCounter();
        const B2BModel = getBillSummaryModel('B2B');
        const B2CModel = getBillSummaryModel('B2C');
        const [existsInB2B, existsInB2C] = await Promise.all([
            B2BModel.exists({ billNo: next }),
            B2CModel.exists({ billNo: next }),
        ]);
        if (!existsInB2B && !existsInB2C) return next;
    }
    throw new Error('Failed to allocate a unique bill number');
};

const serializeBillForClient = (bill) => {
    const plain = typeof bill?.toObject === 'function' ? bill.toObject() : { ...(bill || {}) };
    const normalizedBillNo = formatMainBillNo(plain.billNo || plain.invoiceNo) || '00000';
    return {
        ...plain,
        billNo: normalizedBillNo,
        invoiceNo: normalizedBillNo,
    };
};

const buildBillPayload = (body = {}) => {
    const billType = normalizeBillType(body.billType || body.customerType || body.type);
    const issueItems = toArray(body.issueItems);
    const receiptItems = toArray(body.receiptItems);
    const cashTable = toArray(body.cashTable);
    const items = toArray(body.items);

    const totalIssueWeight = toNumber(
        body.totalIssueWeight ?? body.issuePure ?? body.issueTotal ?? body.summary?.issue,
    );
    const totalReceiptWeight = toNumber(
        body.totalReceiptWeight ?? body.receiptPure ?? body.summary?.receipt,
    );
    const cashAmount = toNumber(
        body.cashAmount ??
        body.cashPure ??
        body.summary?.cash ??
        cashTable.reduce((sum, row) => sum + toNumber(row.rupees), 0),
    );
    const kadaiAmount = toNumber(body.kadaiAmount);
    const oldBalance = toNumber(body.oldBalance ?? body.ob ?? body.summary?.ob);
    const advanceBalance = toNumber(body.advanceBalance ?? body.advBal ?? body.summary?.ab);
    const availableBalance = toNumber(
        body.availableBalance ??
        body.currentBalance ??
        body.summary?.current ??
        (oldBalance - advanceBalance) + totalIssueWeight - totalReceiptWeight - cashAmount,
    );

    return {
        customerId: pickCustomerId(body),
        customerName: String(body.customerName || '').trim() || 'Unknown',
        billNo: pickBillNo(body),
        billType,
        dealerType: String(body.dealerType || body.type || body.customerType || '').trim(),
        issueItems,
        receiptItems,
        cashTable,
        items,
        totalIssueWeight,
        totalReceiptWeight,
        cashAmount,
        kadaiAmount,
        advanceBalance,
        oldBalance,
        availableBalance,
        customerType: billType,
        invoiceNo: formatMainBillNo(body.invoiceNo || body.billNo) || 'N/A',
        date: body.date || '',
        ob: oldBalance,
        issuePure: totalIssueWeight,
        receiptPure: totalReceiptWeight,
        cashPure: cashAmount,
        gstPure: toNumber(body.gstPure ?? body.summary?.gstPure),
        advBal: advanceBalance,
        currentBalance: availableBalance,
        receiptImage:
            typeof body.receiptImage === 'string'
                ? body.receiptImage
                : (typeof body.proofImage === 'string'
                    ? body.proofImage
                    : (typeof body.image === 'string' ? body.image : null)),
        proofImage:
            typeof body.proofImage === 'string'
                ? body.proofImage
                : (typeof body.receiptImage === 'string' ? body.receiptImage : null),
        image:
            typeof body.image === 'string'
                ? body.image
                : (typeof body.receiptImage === 'string' ? body.receiptImage : null),
        gst: body.gst || null,
    };
};

const findCustomerAndUpdateOverview = async (billDoc) => {
    // Determine the correct model based on billType and dealerType/customerType
    const rawType = String(billDoc.dealerType || billDoc.customerType || "").toUpperCase();
    let customerModel;
    if (rawType === "DEALER" || rawType === "SUPPLIER") {
        customerModel = Dealer;
    } else {
        customerModel = billDoc.billType === 'B2C' ? CustomerB2C : Customer;
    }

    const customerId = toIdString(billDoc.customerId);
    if (!customerId) return null;

    const updatePayload = {
        lastTransactionDate: billDoc.createdAt || new Date(),
        lastTransactionType: billDoc.billType,
        oldBalance: billDoc.oldBalance,
        advanceBalance: billDoc.advanceBalance,
        availableBalance: billDoc.availableBalance,
        billCurrentBalance: billDoc.availableBalance,
    };

    let updated = null;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(customerId);

    // Try Mongo _id first if it looks like one (24-char hex)
    if (isObjectId) {
        updated = await customerModel.findByIdAndUpdate(customerId, updatePayload, { new: true });
    } 

    if (!updated && !isObjectId) {
        // Fallback to custom numeric/string customerId field (only if NOT an ObjectId)
        // Dealer doesn't have a numeric customerId field, so skip querying it.
        if (customerModel !== Dealer) {
            updated = await customerModel.findOneAndUpdate({ customerId: customerId }, updatePayload, { new: true });
        }
    }

    // Final fallback for Dealers by name
    if (!updated && customerModel === Dealer && billDoc.customerName) {
        updated = await Dealer.findOneAndUpdate(
            { customerName: String(billDoc.customerName).trim() },
            updatePayload,
            { new: true }
        );
    }

    return updated;
};

const addDateRangeToQuery = (query, reqQuery = {}) => {
    if (reqQuery.fromDate || reqQuery.toDate) {
        query.createdAt = {};
        if (reqQuery.fromDate) query.createdAt.$gte = new Date(`${reqQuery.fromDate}T00:00:00.000Z`);
        if (reqQuery.toDate) query.createdAt.$lte = new Date(`${reqQuery.toDate}T23:59:59.999Z`);
    }
    return query;
};

const syncDealerImageFromBill = async (bill = {}) => {
    const dealerType = String(bill?.dealerType || bill?.customerType || "").toUpperCase();
    if (dealerType !== "DEALER" && dealerType !== "SUPPLIER") return;
    const image = String(bill?.receiptImage || bill?.proofImage || bill?.image || "").trim();
    if (!image) return;

    const update = {
        receiptImage: image,
        proofImage: image,
        image,
        updatedAt: new Date(),
    };
    const customerId = toIdString(bill?.customerId);
    const customerName = String(bill?.customerName || "").trim();

    let updated = null;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(customerId);
    if (isObjectId) {
        updated = await Dealer.findByIdAndUpdate(customerId, { $set: update }, { new: true });
    }
    if (!updated && customerName) {
        await Dealer.findOneAndUpdate(
            { customerName },
            { $set: update },
            { new: true },
        );
    }
};

const createBillSummary = async (req, res) => {
    try {
        const cloudImageFields = await resolveImageFields(req.body, { folder: "ntj/bills" });
        const payload = buildBillPayload({ ...req.body, ...cloudImageFields });
        if (!payload.customerId || !payload.customerName) {
            return res.status(400).json({ message: 'customerId and customerName are required' });
        }

        const BillSummary = getBillSummaryModel(payload.billType);
        const requestedBillNo = pickBillNo(req.body);
        const existingForRequestedNo = requestedBillNo
            ? await BillSummary.findOne({ customerId: payload.customerId, billNo: requestedBillNo })
            : null;

        // New bill creation must always be auto-numbered by backend.
        // Only preserve requested billNo when it refers to an existing bill for this customer (idempotent re-save).
        if (existingForRequestedNo) {
            payload.billNo = requestedBillNo;
        } else {
            payload.billNo = await getUniqueNextBillNo();
        }
        payload.invoiceNo = payload.billNo;
        const saved = await BillSummary.findOneAndUpdate(
            { customerId: payload.customerId, billNo: payload.billNo },
            { $set: payload },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );

        await findCustomerAndUpdateOverview(saved);
        try {
            await syncDealerImageFromBill(saved);
        } catch (syncErr) {
            console.warn("Dealer image sync from bill failed:", syncErr?.message || syncErr);
        }
        res.status(201).json(serializeBillForClient(saved));
    } catch (error) {
        res.status(500).json({ message: 'Failed to save bill summary', error: error.message });
    }
};

const getBillSummaries = async (req, res) => {
    try {
        const billType = normalizeBillType(req.query.billType || req.query.customerType);
        const BillSummary = getBillSummaryModel(billType);
        const query = addDateRangeToQuery({}, req.query);
        const bills = await BillSummary.find(query).sort({ updatedAt: -1, createdAt: -1 });
        res.json((Array.isArray(bills) ? bills : []).map(serializeBillForClient));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bill summaries', error: error.message });
    }
};

const getBillsByCustomerId = async (req, res) => {
    try {
        const billType = normalizeBillType(req.query.billType || req.query.customerType);
        const BillSummary = getBillSummaryModel(billType);
        const requestedId = toIdString(req.params.customerId);
        const lookupCustomerId = toIdString(req.query.lookupCustomerId);
        const query = addDateRangeToQuery({ customerId: requestedId }, req.query);
        const bills = await BillSummary.find(query).sort({ updatedAt: -1, createdAt: -1 });
        if (bills.length > 0) return res.json((Array.isArray(bills) ? bills : []).map(serializeBillForClient));

        // Backward compatibility: fetch legacy billSummary collection entries.
        const idSet = new Set([requestedId]);
        if (lookupCustomerId) idSet.add(lookupCustomerId);

        if (/^[0-9a-fA-F]{24}$/.test(requestedId)) {
            const customerModel = billType === 'B2C' ? CustomerB2C : Customer;
            const customer = await customerModel.findById(requestedId).lean();
            if (customer?.customerId !== undefined && customer?.customerId !== null) {
                idSet.add(String(customer.customerId));
            }
        }

        const LegacyBillSummary = getLegacyBillSummaryModel();
        const legacyQuery = addDateRangeToQuery({ customerId: { $in: Array.from(idSet) } }, req.query);
        const legacyBills = await LegacyBillSummary.find(legacyQuery).sort({ updatedAt: -1, createdAt: -1 });
        return res.json((Array.isArray(legacyBills) ? legacyBills : []).map(serializeBillForClient));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch customer bills', error: error.message });
    }
};

const getBillSummaryById = async (req, res) => {
    try {
        const billType = normalizeBillType(req.query.billType || req.query.customerType);
        const BillSummary = getBillSummaryModel(billType);
        const bill = await BillSummary.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        res.json(serializeBillForClient(bill));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bill summary', error: error.message });
    }
};

const updateBillSummary = async (req, res) => {
    try {
        const billType = normalizeBillType(req.query.billType || req.body.billType || req.body.customerType);
        const BillSummary = getBillSummaryModel(billType);
        const existingBill = await BillSummary.findById(req.params.id);
        if (!existingBill) return res.status(404).json({ message: 'Bill not found' });

        const existingBillNo = formatMainBillNo(existingBill.billNo || existingBill.invoiceNo) || '';
        const incomingBillNo = formatMainBillNo(req.body.billNo || req.body.invoiceNo) || '';
        const lockedBillNo = incomingBillNo || existingBillNo;

        const cloudImageFields = await resolveImageFields(req.body, { folder: "ntj/bills" });
        const payload = buildBillPayload({
            ...req.body,
            ...cloudImageFields,
            billType,
            customerId: req.body.customerId || existingBill.customerId,
            customerName: req.body.customerName || existingBill.customerName,
            billNo: lockedBillNo,
            invoiceNo: lockedBillNo,
        });
        payload.billNo = lockedBillNo;
        payload.invoiceNo = lockedBillNo;

        const updated = await BillSummary.findByIdAndUpdate(
            req.params.id,
            { $set: payload },
            { new: true, runValidators: true }
        );

        await findCustomerAndUpdateOverview({
            ...updated.toObject(),
            billType: normalizeBillType(updated.billType || updated.customerType),
        });
        try {
            await syncDealerImageFromBill(updated);
        } catch (syncErr) {
            console.warn("Dealer image sync from bill failed:", syncErr?.message || syncErr);
        }

        res.json(serializeBillForClient(updated));
    } catch (error) {
        res.status(500).json({ message: 'Failed to update bill summary', error: error.message });
    }
};

const deleteBillSummary = async (req, res) => {
    try {
        const billType = normalizeBillType(req.query.billType || req.query.customerType);
        const BillSummary = getBillSummaryModel(billType);
        const deleted = await BillSummary.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Bill not found' });
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete bill summary', error: error.message });
    }
};

/**
 * GET /api/billSummary/nextBillNo
 * Returns the next sequential zero-padded bill number.
 * Uses MongoDB findOneAndUpdate with $inc for atomicity — safe even under concurrent requests.
 */
const getNextBillNo = async (req, res) => {
    try {
        const sequence = String(req.query.sequence || 'main').toLowerCase();
        const key = sequence === 'order' ? 'order' : 'global';
        const padLength = sequence === 'order' ? 2 : 5;

        const doc = await BillCounter.findOneAndUpdate(
            { key },
            { $inc: { counter: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const formatted = String(doc.counter).padStart(padLength, '0');
        res.json({ billNo: formatted, counter: doc.counter });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get next bill number', error: error.message });
    }
};

module.exports = {
    createBillSummary,
    getBillSummaries,
    getBillsByCustomerId,
    getBillSummaryById,
    updateBillSummary,
    deleteBillSummary,
    getNextBillNo,
};

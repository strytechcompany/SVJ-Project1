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

const toSafeDate = (value) => {
    if (!value) return null;
    
    let d;
    if (value instanceof Date) {
        d = value;
    } else {
        // Handle common frontend string "Invalid Date"
        if (typeof value === 'string' && value.toLowerCase().includes('invalid')) return null;
        
        d = new Date(value);
        if (isNaN(d.getTime()) && typeof value === 'string') {
            // Try parsing DD/MM/YYYY
            const parts = value.split(/[/-]/);
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const fullYear = year < 100 ? 2000 + year : year;
                const alt = new Date(fullYear, month, day);
                if (!isNaN(alt.getTime())) d = alt;
            }
        }
    }

    if (!d || isNaN(d.getTime())) return null;
    return d;
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

const formatB2CInvoiceNo = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    
    // If it already starts with A2026, extract digits after it
    if (/^A2026/i.test(raw)) {
        const digits = raw.replace(/A2026/i, '').replace(/\D/g, '');
        return `A2026${digits.padStart(2, '0')}`;
    }
    
    // Strip all non-digits
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    // If it's just digits like 202601, handle it
    if (digits.startsWith('2026') && digits.length >= 5) {
        return `A${digits}`;
    }

    // Default: pad to 2 digits and add A2026
    return `A2026${digits.padStart(2, '0')}`;
};

const getNextBillNoFromCounter = async (key = 'global', padLength = 5, prefix = '') => {
    const doc = await BillCounter.findOneAndUpdate(
        { key },
        { $inc: { counter: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const formattedCounter = String(doc.counter).padStart(padLength, '0');
    return `${prefix}${formattedCounter}`;
};

const pickBillNo = (body = {}) => {
    const type = normalizeBillType(body.billType || body.customerType);
    const raw = body.billNo || body.invoiceNo;
    if (!raw) return '';
    if (type === 'B2C') return formatB2CInvoiceNo(raw);
    return formatMainBillNo(raw);
};

const getUniqueNextBillNo = async (billType = 'B2B') => {
    const type = normalizeBillType(billType);
    const isB2C = type === 'B2C';
    const key = isB2C ? 'b2c_invoice' : 'global';
    const padLength = isB2C ? 2 : 5;
    const prefix = isB2C ? 'A2026' : '';

    for (let attempts = 0; attempts < 20; attempts += 1) {
        const next = await getNextBillNoFromCounter(key, padLength, prefix);
        const BillModel = getBillSummaryModel(type);
        const exists = await BillModel.exists({ billNo: next });
        if (!exists) return next;
    }
    throw new Error(`Failed to allocate a unique ${isB2C ? 'invoice' : 'bill'} number`);
};

const serializeBillForClient = (bill) => {
    const plain = typeof bill?.toObject === 'function' ? bill.toObject() : { ...(bill || {}) };
    const type = normalizeBillType(plain.billType || plain.customerType);
    const rawNo = plain.billNo || plain.invoiceNo || '';
    
    let normalizedBillNo;
    if (type === 'B2C') {
        normalizedBillNo = formatB2CInvoiceNo(rawNo) || 'A202600';
    } else {
        normalizedBillNo = formatMainBillNo(rawNo) || '00000';
    }

    return {
        ...plain,
        billNo: normalizedBillNo,
        invoiceNo: normalizedBillNo,
    };
};

const buildBillPayload = (body = {}) => {
    const hasSnapshot = body?.previewSnapshot && typeof body.previewSnapshot === 'object';
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
    const openingOldBalance = toNumber(
        body.previousOldBalance ?? body.ob ?? body.summary?.ob ?? body.oldBalance,
    );
    const openingAdvanceBalance = toNumber(
        body.previousAdvanceBalance ?? body.advBal ?? body.summary?.ab ?? body.advanceBalance,
    );
    const explicitBalanceType = String(
        body.balanceType || body.summary?.balanceType || '',
    ).trim().toUpperCase();
    const explicitBalanceValue = toNumber(
        body.balanceValue ?? body.summary?.balanceValue,
        NaN,
    );
    const explicitSignedBalance = Number.isFinite(explicitBalanceValue)
        ? (explicitBalanceType === 'AB' ? -explicitBalanceValue : explicitBalanceValue)
        : NaN;
    const availableBalance = toNumber(
        body.availableBalance ??
        body.currentBalance ??
        body.summary?.current ??
        (Number.isFinite(explicitSignedBalance) ? explicitSignedBalance : undefined) ??
        body.finalBalance ??
        (openingOldBalance - openingAdvanceBalance) +
            totalIssueWeight +
            toNumber(body.gstPure ?? body.summary?.gstPure) -
            totalReceiptWeight -
            cashAmount,
    );
    let oldBalance = toNumber(body.oldBalance ?? openingOldBalance);
    let advanceBalance = toNumber(body.advanceBalance ?? openingAdvanceBalance);
    if (Number.isFinite(explicitBalanceValue) && explicitBalanceType) {
        oldBalance = explicitBalanceType === 'OB' ? explicitBalanceValue : 0;
        advanceBalance = explicitBalanceType === 'AB' ? explicitBalanceValue : 0;
    }
    if (!hasSnapshot && billType === "B2B" && Number.isFinite(availableBalance)) {
        const isDealerLike = String(body.dealerType || body.customerType || body.type || "").toUpperCase();
        if (isDealerLike === "DEALER" || isDealerLike === "SUPPLIER") {
            // Dealer/Supplier uses receipt - (issue + cash)
            oldBalance = availableBalance > 0 ? availableBalance : 0;
            advanceBalance = availableBalance < 0 ? Math.abs(availableBalance) : 0;
        } else {
            // Standard B2B: (OB - AB) + issue + gst - receipt - cash
            oldBalance = availableBalance > 0 ? availableBalance : 0;
            advanceBalance = availableBalance < 0 ? Math.abs(availableBalance) : 0;
        }
    }

    const rawCustomerType = String(body.customerType || body.type || '').trim();
    const rawDealerType = String(body.dealerType || body.type || body.customerType || '').trim();
    const effectiveCustomerType = rawDealerType || rawCustomerType || billType;

    return {
        customerId: pickCustomerId(body),
        customerName: String(body.customerName || '').trim() || 'Unknown',
        phoneNumber: String(body.phoneNumber || body.phone || body.customerNumber || body.customerPhone || '').trim(),
        address: String(body.address || body.customerAddress || '').trim(),
        gstin: String(body.gstin || body.gstNo || body.gst || '').trim(),
        billNo: pickBillNo(body),
        billType,
        dealerType: rawDealerType,
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
        customerType: effectiveCustomerType,
        invoiceNo: formatMainBillNo(body.invoiceNo || body.billNo) || 'N/A',
        date: body.date || '',
        description: String(body.description || '').trim(),
        nilMode: String(body.nilMode || body.summary?.nilMode || '').trim(),
        ob: openingOldBalance,
        issuePure: totalIssueWeight,
        receiptPure: totalReceiptWeight,
        cashPure: cashAmount,
        gstPure: toNumber(body.gstPure ?? body.summary?.gstPure),
        advBal: openingAdvanceBalance,
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
        previewSnapshot: body.previewSnapshot || null,
        previousOldBalance: toNumber(body.previousOldBalance ?? openingOldBalance),
        previousAdvanceBalance: toNumber(body.previousAdvanceBalance ?? openingAdvanceBalance),
        finalBalance: toNumber(body.finalBalance ?? availableBalance),
        balanceType: String(body.balanceType || '').trim(),
        balanceValue: toNumber(
            body.balanceValue ??
            body.summary?.balanceValue ??
            (String(body.balanceType || '').trim().toUpperCase() === 'AB'
                ? Math.max(0, advanceBalance)
                : Math.max(0, oldBalance)),
        ),
        totals: body.totals || null,
    };
};

const findCustomerAndUpdateOverview = async (billDoc) => {
    // 1. Determine model more robustly
    const rawType = String(billDoc.dealerType || billDoc.customerType || billDoc.billType || "").toUpperCase();
    let customerModel;
    if (rawType.includes("DEALER") || rawType.includes("SUPPLIER")) {
        customerModel = Dealer;
    } else if (rawType === "B2C") {
        customerModel = CustomerB2C;
    } else {
        customerModel = Customer;
    }

    const customerId = toIdString(billDoc.customerId);
    if (!customerId) return null;

    const netBalance = toNumber(
        billDoc.availableBalance ?? billDoc.currentBalance ?? billDoc.finalBalance,
    );
    const lastAmount = toNumber(billDoc.gst?.finalAmount || billDoc.gst?.amount || billDoc.totalAmount || billDoc.cashAmount || 0);
    const lastWeight = toNumber(billDoc.totalIssueWeight || billDoc.issuePure || 0);
    const lastPure = toNumber(billDoc.issuePure || billDoc.totalIssueWeight || 0);

    const updatePayload = {
        lastTransactionDate: toSafeDate(billDoc.createdAt) || new Date(),
        lastTransactionType: billDoc.billType,
        oldBalance: netBalance > 0 ? netBalance : 0,
        advanceBalance: netBalance < 0 ? Math.abs(netBalance) : 0,
        availableBalance: netBalance,
        billCurrentBalance: netBalance,

        // Last Bill Tracking
        lastBillNo: billDoc.billNo || billDoc.invoiceNo || "",
        lastBillDate: toSafeDate(billDoc.date) || toSafeDate(billDoc.createdAt) || new Date(),
        lastBillAmount: lastAmount,
        lastBillWeight: lastWeight,
        lastBillPureWeight: lastPure,
    };

    // Hard validation to prevent "Invalid Date" from ever reaching MongoDB
    if (!updatePayload.lastBillDate || isNaN(updatePayload.lastBillDate.getTime())) {
        console.log("⚠️ fixing invalid lastBillDate");
        updatePayload.lastBillDate = new Date();
    }
    if (!updatePayload.lastTransactionDate || isNaN(updatePayload.lastTransactionDate.getTime())) {
        console.log("⚠️ fixing invalid lastTransactionDate");
        updatePayload.lastTransactionDate = new Date();
    }

    console.log("🔍 [Debug] updatePayload:", JSON.stringify({
        ...updatePayload,
        lastBillDate: updatePayload.lastBillDate?.toISOString(),
        lastTransactionDate: updatePayload.lastTransactionDate?.toISOString()
    }, null, 2));

    let updated = null;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(customerId);

    // Try Mongo _id first
    if (isObjectId) {
        updated = await customerModel.findByIdAndUpdate(customerId, updatePayload, { new: true });
        
        // If not found in primary model, try alternate models (common if billType was mislabeled)
        if (!updated) {
            const alternateModel = (customerModel === CustomerB2C) ? Customer : CustomerB2C;
            updated = await alternateModel.findByIdAndUpdate(customerId, updatePayload, { new: true });
        }
    } 

    // ONLY try numeric customerId if it's NOT a hex ObjectId string
    if (!updated && !isObjectId) {
        // Only attempt if it looks like a number or custom ID
        if (customerModel !== Dealer && /^\d+$/.test(customerId)) {
            updated = await customerModel.findOneAndUpdate({ customerId: Number(customerId) }, updatePayload, { new: true });
        }
        
        // Final fallback for Dealers by name
        if (!updated && customerModel === Dealer && billDoc.customerName) {
            updated = await Dealer.findOneAndUpdate(
                { customerName: String(billDoc.customerName).trim() },
                updatePayload,
                { new: true }
            );
        }
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
            ? await BillSummary.findOne({ billNo: requestedBillNo })
            : null;

        const existingMatchesCustomer = existingForRequestedNo &&
            toIdString(existingForRequestedNo.customerId) === toIdString(payload.customerId);

        if (existingMatchesCustomer) {
            payload.billNo = requestedBillNo;
            payload.invoiceNo = requestedBillNo;
            const updatedExisting = await BillSummary.findByIdAndUpdate(
                existingForRequestedNo._id,
                { $set: payload },
                { new: true, runValidators: true }
            );

            await findCustomerAndUpdateOverview(updatedExisting);
            try {
                await syncDealerImageFromBill(updatedExisting);
            } catch (syncErr) {
                console.warn("Dealer image sync from bill failed:", syncErr?.message || syncErr);
            }

            return res.status(200).json(serializeBillForClient(updatedExisting));
        }

        // If the client already reserved a billNo (via /nextBillNo) and it's unused, keep it.
        if (requestedBillNo && !existingForRequestedNo) {
            payload.billNo = requestedBillNo;
        } else {
            payload.billNo = await getUniqueNextBillNo(payload.billType);
        }
        payload.invoiceNo = payload.billNo;
        const saved = await BillSummary.create(payload);

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

        const idSet = new Set([requestedId]);
        if (lookupCustomerId) idSet.add(lookupCustomerId);

        if (/^[0-9a-fA-F]{24}$/.test(requestedId)) {
            const customerModel = billType === 'B2C' ? CustomerB2C : Customer;
            const customer = await customerModel.findById(requestedId).lean();
            if (customer && (customer.customerId !== undefined && customer.customerId !== null)) {
                idSet.add(String(customer.customerId));
            }
        }

        const query = addDateRangeToQuery({ customerId: { $in: Array.from(idSet) } }, req.query);
        const bills = await BillSummary.find(query).sort({ updatedAt: -1, createdAt: -1 });
        if (bills.length > 0) return res.json((Array.isArray(bills) ? bills : []).map(serializeBillForClient));

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

        const duplicateBill = await BillSummary.findOne({
            customerId: payload.customerId,
            billNo: lockedBillNo,
            _id: { $ne: existingBill._id },
        });
        const targetBillId = duplicateBill?._id || existingBill._id;

        const updated = await BillSummary.findByIdAndUpdate(
            targetBillId,
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
        const billType = normalizeBillType(req.query.billType || req.query.customerType);
        
        let key, padLength, prefix;
        if (billType === 'B2C') {
            key = 'b2c_invoice';
            padLength = 2;
            prefix = 'A2026';
        } else if (sequence === 'order') {
            key = 'order';
            padLength = 2;
            prefix = '';
        } else {
            key = 'global';
            padLength = 5;
            prefix = '';
        }

        const doc = await BillCounter.findOneAndUpdate(
            { key },
            { $inc: { counter: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const formatted = `${prefix}${String(doc.counter).padStart(padLength, '0')}`;
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

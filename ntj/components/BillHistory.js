import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Share,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const readImageField = (value) => {
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

  if (!value) return "";
  if (typeof value === "string") {
    let trimmed = value.trim();
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
const normalizeImageUri = (raw, baseUrl = "") => {
  const uriRaw = readImageField(raw);
  if (!uriRaw) return "";
  let uri = uriRaw.trim();

  try {
    if (uri.includes("%2F") || uri.includes("%3A") || uri.includes("%2B")) {
      uri = decodeURIComponent(uri);
    }
  } catch (_) {}

  const compact = uri.replace(/\s+/g, "");
  if (compact.startsWith("data:image/")) return compact;
  if (compact.startsWith("data:") && compact.includes(";base64,")) {
    const base64Part = compact.split(";base64,")[1] || "";
    return base64Part ? `data:image/jpeg;base64,${base64Part}` : "";
  }
  if (
    uri.startsWith("http://") ||
    uri.startsWith("https://") ||
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://")
  ) {
    return uri;
  }
  if (/^[A-Za-z0-9+/_=\r\n-]+$/.test(compact) && compact.length > 100) {
    return `data:image/jpeg;base64,${compact}`;
  }
  const cleanBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const cleanPath = uri.replace(/^\/+/, "");
  return cleanBaseUrl ? `${cleanBaseUrl}/${cleanPath}` : uri;
};
const getRecordImage = (row = {}) =>
  normalizeImageUri(
    readImageField(row?.receiptImage) ||
      readImageField(row?.proofImage) ||
      readImageField(row?.image) ||
      "",
    base_url,
  );

const formatMainBillNo = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n).padStart(5, "0");
};

const ensureFiveDigitBillNo = (value) => formatMainBillNo(value) || "00000";

const getBillTimestamp = (bill = {}) => {
  const d = new Date(bill?.updatedAt || bill?.createdAt || bill?.date || 0);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
};

const resolveBillTypeFromContext = (bill = {}, customer = {}) => {
  const contextType = String(customer?.customerType || customer?.type || "").toUpperCase();
  if (contextType === "B2C") return "B2C";
  if (contextType === "B2B") return "B2B";
  return resolveBillType(bill);
};

const resolveDisplayTypeFromContext = (bill = {}, customer = {}) => {
  const contextType = String(customer?.customerType || customer?.type || "").toUpperCase();
  if (contextType === "DEALER" || contextType === "SUPPLIER") {
    return contextType === "DEALER" ? "Dealer" : "Supplier";
  }
  if (contextType === "B2C") return "B2C";
  if (contextType === "B2B") return "B2B";
  const billDealerType = String(bill?.dealerType || "").toUpperCase();
  if (billDealerType === "DEALER" || billDealerType === "SUPPLIER") {
    return billDealerType === "DEALER" ? "Dealer" : "Supplier";
  }
  return resolveBillType(bill);
};

/** Resolve the correct API billType (B2B or B2C) from a customer or bill record */
const resolveBillType = (source = {}) => {
  const raw = String(
    source?.billType || source?.customerType || source?.type || "B2B"
  ).toUpperCase();
  // Dealer / Supplier transactions are stored as B2B
  if (raw === "B2C") return "B2C";
  return "B2B";
};

const getBalanceFromBill = (bill = {}, fallbackBalance = null) => {
  const rawCurrent = Number(bill?.currentBalance ?? bill?.availableBalance);
  const rawOB = Number(bill?.oldBalance ?? bill?.ob);
  const rawAB = Number(bill?.advanceBalance ?? bill?.advBal);

  const hasCurrent = Number.isFinite(rawCurrent);
  const hasOB = Number.isFinite(rawOB);
  const hasAB = Number.isFinite(rawAB);

  const hasAnyBalanceField = hasCurrent || hasOB || hasAB;
  if (!hasAnyBalanceField && fallbackBalance) {
    return fallbackBalance;
  }

  let current = hasCurrent ? rawCurrent : NaN;
  if (!Number.isFinite(current)) {
    if (hasOB && rawOB > 0) current = rawOB;
    else if (hasAB && rawAB > 0) current = -Math.abs(rawAB);
    else current = 0;
  }

  const ob = hasOB && rawOB > 0 ? rawOB : (current > 0 ? current : 0);
  const ab = hasAB && rawAB > 0 ? rawAB : (current < 0 ? Math.abs(current) : 0);

  if (current < 0 || ab > 0) return { label: "AB", value: Math.abs(current || ab), current, ob, ab };
  if (current > 0 || ob > 0) return { label: "OB", value: current || ob, current, ob, ab };
  return { label: null, value: 0, current: 0, ob: 0, ab: 0 };
};

const normalizeBills = (rows = []) => {
  const ordered = [...(Array.isArray(rows) ? rows : [])].sort(
    (a, b) => getBillTimestamp(b) - getBillTimestamp(a),
  );
  const seen = new Set();
  const unique = ordered.filter((bill) => {
    const compositeKey = [
      String(bill?.customerId || "").trim(),
      ensureFiveDigitBillNo(bill?.billNo || bill?.invoiceNo),
      String(bill?.date || "").trim(),
      String(num(bill?.oldBalance ?? bill?.ob, 0)),
      String(num(bill?.issuePure ?? bill?.totalIssueWeight, 0)),
      String(num(bill?.receiptPure ?? bill?.totalReceiptWeight, 0)),
      String(num(bill?.cashPure ?? bill?.cashAmount, 0)),
    ].join("|");
    const key = compositeKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const sorted = unique;
  const latestFallback = sorted.length > 0 ? getBalanceFromBill(sorted[0], null) : null;
  return sorted.map((bill) => {
    const bal = getBalanceFromBill(bill, latestFallback);
    const normalizedBillNo = ensureFiveDigitBillNo(bill?.billNo || bill?.invoiceNo);
    return {
      ...bill,
      billNo: normalizedBillNo,
      invoiceNo: normalizedBillNo,
      currentBalance: bal.current,
      availableBalance: bal.current,
      oldBalance: bal.ob,
      ob: bal.ob,
      advanceBalance: bal.ab,
      advBal: bal.ab,
    };
  });
};

const enrichBillsWithTransactionImage = (billRows = [], allTx = [], ctxCustomer = {}) => {
  const txRows = Array.isArray(allTx) ? allTx : [];
  const ctxIds = [
    ctxCustomer?._id,
    ctxCustomer?.id,
    ctxCustomer?.customerId,
  ]
    .filter(Boolean)
    .map((v) => String(v));
  const ctxName = String(ctxCustomer?.customerName || ctxCustomer?.name || "").trim().toLowerCase();

  return (Array.isArray(billRows) ? billRows : []).map((bill) => {
    if (getRecordImage(bill)) return bill;
    const billId = String(bill?.customerId || "");
    const billName = String(bill?.customerName || "").trim().toLowerCase();
    const billTs = getBillTimestamp(bill);

    let bestTx = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (const tx of txRows) {
      const img = getRecordImage(tx);
      if (!img) continue;

      const txId = String(tx?.customerId || "");
      const txName = String(tx?.customerName || "").trim().toLowerCase();
      const idMatch = (billId && txId && billId === txId) || (txId && ctxIds.includes(txId));
      const nameMatch = (billName && txName && billName === txName) || (ctxName && txName && ctxName === txName);
      if (!idMatch && !nameMatch) continue;

      const txTs = new Date(tx?.updatedAt || tx?.createdAt || tx?.date || 0).getTime() || 0;
      const diff = Math.abs((billTs || 0) - txTs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestTx = tx;
      }
    }

    if (!bestTx) return bill;
    const fallbackImage = getRecordImage(bestTx);
    return {
      ...bill,
      receiptImage: fallbackImage,
      proofImage: bill?.proofImage || fallbackImage,
      image: bill?.image || fallbackImage,
      receiptImageShowInBill:
        typeof bill?.receiptImageShowInBill === "boolean"
          ? bill.receiptImageShowInBill
          : (typeof bestTx?.receiptImageShowInBill === "boolean" ? bestTx.receiptImageShowInBill : true),
    };
  });
};

const buildSummaryForPreview = (bill = {}, bal = { ob: 0, ab: 0, current: 0 }) => {
  const issueFromRows = (Array.isArray(bill?.issueItems) ? bill.issueItems : [])
    .reduce((sum, row) => sum + num(row?.pure, 0), 0);
  const receiptFromRows = (Array.isArray(bill?.receiptItems) ? bill.receiptItems : [])
    .reduce((sum, row) => sum + num(row?.pure, num(row?.result, num(row?.netWeight, 0))), 0);
  const cashFromTable = (Array.isArray(bill?.cashTable) ? bill.cashTable : [])
    .reduce((sum, row) => sum + num(row?.pure, 0), 0);

  const issue = num(
    bill?.issuePure,
    num(bill?.totalIssueWeight, num(bill?.summary?.issue, issueFromRows)),
  );
  const receipt = num(
    bill?.receiptPure,
    num(bill?.totalReceiptWeight, num(bill?.summary?.receipt, receiptFromRows)),
  );
  const cash = num(
    bill?.cashPure,
    num(bill?.cashAmount, num(bill?.summary?.cash, cashFromTable)),
  );
  const gstPure = num(bill?.gstPure, num(bill?.summary?.gstPure, 0));

  return {
    ob: num(bal?.ob, 0).toFixed(3),
    ab: num(bal?.ab, 0).toFixed(3),
    issue: issue.toFixed(3),
    receipt: receipt.toFixed(3),
    cash: cash.toFixed(3),
    gstPure: gstPure.toFixed(3),
    receiptPlusCash: (receipt + cash).toFixed(3),
    current: num(bal?.current, num(bill?.currentBalance, num(bill?.availableBalance, 0))).toFixed(3),
  };
};

export default function BillHistory({ navigation, route }) {
  const { customer } = route.params || {};
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [sharingBillId, setSharingBillId] = useState(null);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    setFromDate(startStr);
    setToDate(endStr);

    const unsubscribe = navigation.addListener("focus", () => {
      fetchBills(startStr, endStr);
    });
    fetchBills(startStr, endStr);
    return unsubscribe;
  }, [navigation]);

  // ── FETCH ──────────────────────────────────────────────────────────
  const fetchBills = async (start = fromDate, end = toDate) => {
    try {
      if (!customer) { setBills([]); setLoading(false); return; }

      const billType = resolveBillType(customer);
      const customerId =
        customer?._id || customer?.id || customer?.customerId || "";

      if (!customerId) { setBills([]); setLoading(false); return; }

      const legacyCustomerId = customer?.customerId || "";
      let url = `${base_url}/billSummary/customer/${customerId}?billType=${billType}&lookupCustomerId=${legacyCustomerId}`;
      if (start) url += `&fromDate=${start}`;
      if (end) url += `&toDate=${end}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) { setBills([]); return; }

      const data = await response.json();
      const txResForImage = await fetch(`${base_url}/transactions`);
      const txRowsForImage = txResForImage.ok ? await txResForImage.json() : [];
      const primary = normalizeBills(
        enrichBillsWithTransactionImage(Array.isArray(data) ? data : [], txRowsForImage, customer),
      );
      if (primary.length > 0) { setBills(primary); return; }

      // Fallback 1: fetch bill summary list and match by customerName
      // (covers old records stored with wrong customerId like "N/A")
      let byNameUrl = `${base_url}/billSummary?billType=${billType}`;
      if (start) byNameUrl += `&fromDate=${start}`;
      if (end) byNameUrl += `&toDate=${end}`;
      const byNameRes = await fetch(byNameUrl);
      if (byNameRes.ok) {
        const byNameRows = await byNameRes.json();
        const ctxName = String(customer?.customerName || customer?.name || "").trim().toLowerCase();
        const ctxType = String(customer?.customerType || customer?.type || "").toUpperCase();
        const nameMatchedRows = (Array.isArray(byNameRows) ? byNameRows : []).filter(
            (row) => {
              if (String(row?.customerName || "").trim().toLowerCase() !== ctxName) return false;
              if (ctxType === "DEALER" || ctxType === "SUPPLIER") {
                const rowDealerType = String(row?.dealerType || "").toUpperCase();
                return !rowDealerType || rowDealerType === ctxType;
              }
              return true;
            },
        );
        const nameMatched = normalizeBills(
          enrichBillsWithTransactionImage(nameMatchedRows, txRowsForImage, customer),
        );
        if (nameMatched.length > 0) { setBills(nameMatched); return; }
      }
      // ── Fallback: scan transactions collection ──
      const txRes = await fetch(`${base_url}/transactions`);
      if (!txRes.ok) { setBills([]); return; }

      const allTx = await txRes.json();
      const candidateCustomerIds = [
        customer?._id,
        customer?.id,
        customer?.customerId,
      ]
        .filter(Boolean)
        .map((v) => String(v));
      const custLegacyId = String(customer?.customerId || "");
      const custName = String(customer?.customerName || "").toLowerCase();

      const filtered = (Array.isArray(allTx) ? allTx : [])
        .filter((t) => {
          const txId = String(t?.customerId || "");
          const txName = String(t?.customerName || "").toLowerCase();
          const txType = String(t?.customerType || t?.type || "").toUpperCase();
          const idMatch =
            (txId && candidateCustomerIds.includes(txId)) ||
            (custLegacyId && txId === custLegacyId);
          const nameMatch = custName && txName && txName === custName;
          const typeMatch =
            !txType ||
            txType === billType ||
            (billType === "B2B" && (txType === "DEALER" || txType === "SUPPLIER"));
          return (idMatch || nameMatch) && typeMatch;
        })
        .map((t) => ({
          ...t,
          receiptImage: t?.receiptImage || t?.proofImage || t?.image || "",
          proofImage: t?.proofImage || t?.receiptImage || t?.image || "",
          image: t?.image || t?.receiptImage || t?.proofImage || "",
          receiptImageShowInBill:
            typeof t?.receiptImageShowInBill === "boolean" ? t.receiptImageShowInBill : true,
          billType: resolveBillType(t),
          billNo: ensureFiveDigitBillNo(t?.billNo || t?.invoiceNo),
          invoiceNo: ensureFiveDigitBillNo(t?.invoiceNo || t?.billNo),
          totalIssueWeight: num(t?.issuePure, num(t?.issueTotal, 0)),
          totalReceiptWeight: num(t?.receiptPure, 0),
          cashAmount: num(t?.cashPure, 0),
          availableBalance: num(t?.balance, 0),
          oldBalance: num(t?.oldBalance, 0),
          advanceBalance: num(t?.advBal, 0),
          createdAt: t?.createdAt || t?.date || new Date().toISOString(),
        }));

      setBills(normalizeBills(filtered));
    } catch (error) {
      console.error("Error fetching bills:", error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  // ── CLIENT-SIDE SEARCH ─────────────────────────────────────────────
  const filteredBills = billSearch.trim()
    ? bills.filter((b) => {
      const bn = String(ensureFiveDigitBillNo(b.billNo || b.invoiceNo)).toLowerCase();
      return bn.includes(billSearch.trim().toLowerCase());
    })
    : bills;

  const normalizeB2CReceiptItems = (rows = [], bill = {}) =>
    (Array.isArray(rows) ? rows : []).map((row) => {
      const weight = num(row?.weight, 0);
      const sub = num(row?.sub, 0);
      const netWeight = num(
        row?.netWeight,
        num(row?.netWt, num(row?.result, num(row?.pure, weight - sub))),
      );
      const rate = num(
        row?.rate,
        num(row?.ftRate, num(row?.goldRate, num(row?.goldrate, num(bill?.cashTable?.[0]?.goldRate, 0)))),
      );
      const amount = num(row?.amount, num(row?.amt, num(row?.total, netWeight * rate)));
      return {
        name: row?.name || "",
        weight: weight.toFixed(3),
        sub: sub.toFixed(3),
        netWeight: netWeight.toFixed(3),
        rate: rate ? rate.toFixed(2) : String(row?.rate || "0"),
        amount: amount.toFixed(2),
        // compatibility fields
        result: netWeight.toFixed(3),
        calc: row?.calc ?? 0,
        pure: netWeight.toFixed(3),
      };
    });

  const normalizeB2CItems = (bill = {}) => {
    const rateFallback =
      num(bill?.cashTable?.[0]?.goldRate, 0) ||
      num(bill?.receiptItems?.[0]?.rate, 0) ||
      0;
    const rows =
      Array.isArray(bill.items) && bill.items.length > 0
        ? bill.items
        : (Array.isArray(bill.issueItems) ? bill.issueItems : []);

    return rows.map((row) => {
      const weight = num(row?.weight, num(row?.gross, 0));
      const touch = num(row?.touch, num(row?.calc, 0));
      const wastage = num(row?.wastage, num(row?.m, 0));
      const rate = num(row?.rate, num(row?.goldRate, num(row?.goldrate, num(row?.ftRate, rateFallback))));
      const computedTotal = (weight + wastage) * rate;
      const total = num(row?.total, num(row?.netAmount, num(row?.amount, num(row?.final, computedTotal))));
      const gst = num(row?.gst, num(row?.gstAmount, num(row?.gst_value, 0)));
      const final = num(
        row?.final,
        num(row?.totalAmount, num(row?.finalAmount, total + gst)),
      );
      return {
        itemName: row?.itemName || row?.displayItemName || row?.name || "",
        displayItemName: row?.displayItemName || row?.itemName || row?.name || "",
        weight,
        touch,
        wastage,
        rate,
        total,
        gst,
        final,
        pure: num(row?.pure, (weight * touch) / 100),
      };
    });
  };

  const buildB2CReport = (bill = {}, b2cItems = [], b2cReceiptItems = []) => {
    if (bill?.report) return bill.report;
    const totalFinal = b2cItems.reduce(
      (sum, it) => sum + num(it?.final, num(it?.total, 0) + num(it?.gst, 0)),
      0,
    );
    const oldGoldAmount = b2cReceiptItems.reduce((sum, it) => sum + num(it?.amount, 0), 0);
    return {
      cash: (totalFinal - oldGoldAmount).toFixed(2),
      totalReceiptPure: num(bill?.issuePure ?? bill?.totalIssueWeight, 0).toFixed(3),
      oldGoldAmount: oldGoldAmount.toFixed(2),
    };
  };

  // ── VIEW ────────────────────────────────────────────────────────────
  const handleViewBill = (bill) => {
    const billType = resolveBillTypeFromContext(bill, customer);
    const displayType = resolveDisplayTypeFromContext(bill, customer);
    const bal = getBalanceFromBill(bill);
    const isB2C = billType === "B2C";
    const b2cItems = isB2C ? normalizeB2CItems(bill) : (bill.items || []);
    const b2cReceiptItems = isB2C ? normalizeB2CReceiptItems(bill.receiptItems || [], bill) : (bill.receiptItems || []);
    const resolvedReport = isB2C ? buildB2CReport(bill, b2cItems, b2cReceiptItems) : (bill.report || null);
    const resolvedSummary = buildSummaryForPreview(bill, bal);
    const previewImage =
      getRecordImage(bill) ||
      normalizeImageUri(customer?.receiptImage, base_url) ||
      normalizeImageUri(customer?.proofImage, base_url) ||
      normalizeImageUri(customer?.image, base_url) ||
      normalizeImageUri(customer?.latestTransactionImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.receiptImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.proofImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.image, base_url) ||
      "";
    navigation.navigate("BillPreview", {
      customer: {
        name: bill.customerName || customer?.customerName || "Unknown",
        phone:
          bill?.phone ||
          bill?.phoneNumber ||
          bill?.customerNumber ||
          customer?.customerNumber ||
          customer?.phoneNumber ||
          customer?.phone ||
          "",
        address: bill?.address || customer?.address || "",
        gstin: bill?.gstin || customer?.gstin || "",
        type: displayType,
        image: previewImage,
        proofImage: previewImage,
        receiptImage: previewImage,
        receiptImageShowInBill:
          typeof bill?.receiptImageShowInBill === "boolean" ? bill.receiptImageShowInBill : true,
        date:
          bill.date ||
          (bill.createdAt
            ? new Date(bill.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString()),
        oldBalance: bal.ob,
        advanceBalance: bal.ab,
        balance: bal.current,
        id: customer?.id || customer?._id || customer?.customerId || "",
        customerId: customer?.id || customer?._id || customer?.customerId || "",
        billNo: formatMainBillNo(bill.billNo || bill.invoiceNo) || "",
        invoiceNo: formatMainBillNo(bill.billNo || bill.invoiceNo) || "",
      },
      issueItems: bill.issueItems || [],
      receiptItems: b2cReceiptItems,
      cashTable: bill.cashTable || [],
      summary: resolvedSummary,
      report: resolvedReport,
      transactions: [bill],
      items: b2cItems,
      gst: bill.gst || null,
      estimate: bill.estimate || null,
    });
  };

  // ── EDIT ────────────────────────────────────────────────────────────
  const handleEditBill = (bill) => {
    if (!bill?._id) {
      Alert.alert("Error", "This bill cannot be edited because its bill record ID is missing.");
      return;
    }
    const billType = resolveBillTypeFromContext(bill, customer);
    const custType = String(
      customer?.customerType || customer?.type || ""
    ).toUpperCase();

    if (billType === "B2C") {
      // B2C → B2CCalculationPage
      const normalizedEditBill = {
        ...bill,
        items: normalizeB2CItems(bill),
        receiptItems: normalizeB2CReceiptItems(bill.receiptItems || [], bill),
      };
      navigation.navigate("B2CCalculationPage", {
        editTransaction: normalizedEditBill,
        editCustomer: customer,
      });
    } else if (custType === "SUPPLIER" || custType === "DEALER") {
      // Dealer / Supplier → SD (CreateTransaction / dealer transaction page)
      navigation.navigate("SD", {
        editTransaction: bill,
        editCustomer: customer,
      });
    } else {
      // B2B → B2BCalculationPage
      navigation.navigate("B2BCalculationPage", {
        editTransaction: bill,
        editCustomer: customer,
      });
    }
  };

  // ── DELETE ──────────────────────────────────────────────────────────
  const handleDeleteBill = (bill) => {
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this bill? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!bill._id) {
                throw new Error("This record has no bill ID and cannot be deleted safely.");
              }
              const billType = resolveBillType(bill);
              const forcedBillType = resolveBillTypeFromContext(bill, customer);
              const res = await fetch(
                `${base_url}/billSummary/${bill._id}?billType=${forcedBillType}`,
                { method: "DELETE" }
              );
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Server error");
              }
              // Immediately remove from local state
              setBills((prev) => normalizeBills(prev.filter((b) => b._id !== bill._id)));
              await fetchBills(fromDate, toDate);
              Alert.alert("Deleted", "Bill deleted successfully.");
            } catch (error) {
              console.error("Delete failed:", error);
              Alert.alert("Error", `Failed to delete bill: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // ── PRINT ───────────────────────────────────────────────────────────
  const handlePrintBill = (bill) => {
    // Navigate to BillPreview with printAgain flag so it auto-opens print dialog
    const billType = resolveBillTypeFromContext(bill, customer);
    const displayType = resolveDisplayTypeFromContext(bill, customer);
    const bal = getBalanceFromBill(bill);
    const isB2C = billType === "B2C";
    const b2cItems = isB2C ? normalizeB2CItems(bill) : (bill.items || []);
    const b2cReceiptItems = isB2C ? normalizeB2CReceiptItems(bill.receiptItems || [], bill) : (bill.receiptItems || []);
    const resolvedReport = isB2C ? buildB2CReport(bill, b2cItems, b2cReceiptItems) : (bill.report || null);
    const resolvedSummary = buildSummaryForPreview(bill, bal);
    const previewImage =
      getRecordImage(bill) ||
      normalizeImageUri(customer?.receiptImage, base_url) ||
      normalizeImageUri(customer?.proofImage, base_url) ||
      normalizeImageUri(customer?.image, base_url) ||
      normalizeImageUri(customer?.latestTransactionImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.receiptImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.proofImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.image, base_url) ||
      "";
    navigation.navigate("BillPreview", {
      customer: {
        name: bill.customerName || customer?.customerName || "Unknown",
        phone:
          bill?.phone ||
          bill?.phoneNumber ||
          bill?.customerNumber ||
          customer?.customerNumber ||
          customer?.phoneNumber ||
          customer?.phone ||
          "",
        address: bill?.address || customer?.address || "",
        gstin: bill?.gstin || customer?.gstin || "",
        type: displayType,
        image: previewImage,
        proofImage: previewImage,
        receiptImage: previewImage,
        receiptImageShowInBill:
          typeof bill?.receiptImageShowInBill === "boolean" ? bill.receiptImageShowInBill : true,
        date:
          bill.date ||
          (bill.createdAt
            ? new Date(bill.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString()),
        oldBalance: bal.ob,
        advanceBalance: bal.ab,
        balance: bal.current,
        id: customer?.id || customer?._id || customer?.customerId || "",
        customerId: customer?.id || customer?._id || customer?.customerId || "",
        billNo: formatMainBillNo(bill.billNo || bill.invoiceNo) || "",
        invoiceNo: formatMainBillNo(bill.billNo || bill.invoiceNo) || "",
      },
      issueItems: bill.issueItems || [],
      receiptItems: b2cReceiptItems,
      cashTable: bill.cashTable || [],
      summary: resolvedSummary,
      report: resolvedReport,
      transactions: [bill],
      items: b2cItems,
      gst: bill.gst || null,
      estimate: bill.estimate || null,
      printAgain: true,
    });
  };

  // ── SHARE ───────────────────────────────────────────────────────────
  const getCustomerPhoneForBill = async (bill) => {
    const fallbackPhone =
      bill?.phone ||
      customer?.customerNumber ||
      customer?.phone ||
      customer?.phoneNumber ||
      "";
    try {
      const forcedBillType = resolveBillTypeFromContext(bill, customer);
      const custType = String(
        customer?.customerType || customer?.type || bill?.dealerType || ""
      ).toUpperCase();
      const customerId =
        customer?._id || customer?.id || customer?.customerId || bill?.customerId || "";
      if (!customerId) return fallbackPhone;
      let endpoint = `${base_url}/customers/${customerId}`;
      if (forcedBillType === "B2C") endpoint = `${base_url}/customersB2C/${customerId}`;
      else if (custType === "DEALER" || custType === "SUPPLIER") endpoint = `${base_url}/customersDealer/${customerId}`;
      const res = await fetch(endpoint);
      if (!res.ok) return fallbackPhone;
      const data = await res.json();
      return data?.phoneNumber || data?.phone || data?.customerNumber || fallbackPhone;
    } catch {
      return fallbackPhone;
    }
  };
  const handleWhatsAppShare = async (bill) => {
    setSharingBillId(bill._id);
    try {
      const billType = resolveDisplayTypeFromContext(bill, customer);
      const custName = bill.customerName || customer?.customerName || "Customer";
      const billNo = formatMainBillNo(bill.billNo || bill.invoiceNo) || "N/A";
      const date = bill.date || (bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : "N/A");
      const bal = getBalanceFromBill(bill);
      const issue = num(bill.issuePure ?? bill.totalIssueWeight);
      const receipt = num(bill.receiptPure ?? bill.totalReceiptWeight);

      const balanceLine =
        bal.label === "OB"
          ? `Old Balance  : ${bal.value.toFixed(3)} g`
          : bal.label === "AB"
            ? `Adv Balance  : ${bal.value.toFixed(3)} g`
            : "Balance      : 0.000 g";

      const message = [
        "NTJ Jewellery Bill Summary",
        `Customer     : ${custName}` ,
        `Bill No      : ${billNo}` ,
        `Date         : ${date}` ,
        `Type         : ${billType}` ,
        `Issue Pure   : ${issue.toFixed(3)} g` ,
        `Receipt Pure : ${receipt.toFixed(3)} g` ,
        balanceLine,
      ].join("\n");

      const html = `<html><body style="font-family:Arial;padding:20px;font-size:14px;">
        <h2 style="text-align:center;">NTJ Jewellery Bill Summary</h2>
        <hr/>
        <p><b>Customer:</b> ${custName}</p>
        <p><b>Bill No:</b> ${billNo}</p>
        <p><b>Date:</b> ${date}</p>
        <p><b>Type:</b> ${billType}</p>
        <hr/>
        <p><b>Issue Pure:</b> ${issue.toFixed(3)} g</p>
        <p><b>Receipt Pure:</b> ${receipt.toFixed(3)} g</p>
        <p><b>${balanceLine}</b></p>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, width: 204, height: 842 });
      const phone = await getCustomerPhoneForBill(bill);
      if (!phone) throw new Error("Customer WhatsApp number not found.");

      const cleanPhone = String(phone).replace(/[^0-9]/g, "");
      const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const waUrl = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`;
      await Linking.openURL(waUrl).catch(async () => {
        const webUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Bill ${billNo}`,
          UTI: ".pdf",
        });
      } else {
        await Share.share({ message, title: `Bill ${billNo}` });
      }
    } catch (error) {
      console.error("WhatsApp share failed:", error);
      Alert.alert("Error", `Failed to open WhatsApp share: ${error.message || "Unknown error"}`);
    } finally {
      setSharingBillId(null);
    }
  };

  // ── BALANCE DISPLAY HELPER ─────────────────────────────────────────
  const getBalanceDisplay = (item) => {
    const bal = getBalanceFromBill(item);
    return bal.label ? { label: bal.label, value: bal.value } : null;
  };

  // ── RENDER CARD ─────────────────────────────────────────────────────
  const renderBillItem = ({ item }) => {
    const activityDate = item.updatedAt || item.createdAt || null;
    const activityDateObj = activityDate ? new Date(activityDate) : null;
    const createdDate = activityDateObj
      ? activityDateObj.toLocaleDateString()
      : item.date || "N/A";
    const createdTime = activityDateObj
      ? activityDateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "N/A";
    const itemType = resolveDisplayTypeFromContext(item, customer);
    const billNumber = ensureFiveDigitBillNo(item.billNo || item.invoiceNo);
    const balanceDisplay = getBalanceDisplay(item);
    const isSharing = sharingBillId === item._id;

    return (
      <View style={styles.billCard}>
        {/* ── Tappable area (view full bill) ── */}
        <TouchableOpacity onPress={() => handleViewBill(item)} activeOpacity={0.8}>
          <View style={styles.billHeader}>
            <Text style={styles.billDate}>Date: {createdDate}  Time: {createdTime}</Text>
            <Text style={styles.billType}>{itemType}</Text>
            <View style={styles.billNoBadge}>
              <Text style={styles.billNoText}>
                Bill No: {billNumber}
              </Text>
            </View>
          </View>

          {balanceDisplay ? (
            <View style={styles.balanceRow}>
              <Text
                style={[
                  styles.balanceLabel,
                  balanceDisplay.label === "OB" ? styles.obLabel : styles.abLabel,
                ]}
              >
                {balanceDisplay.label === "OB" ? "Old Balance" : "Advance Balance"}
              </Text>
              <Text
                style={[
                  styles.balanceValue,
                  balanceDisplay.label === "OB" ? styles.obValue : styles.abValue,
                ]}
              >
                {balanceDisplay.value.toFixed(3)} g
              </Text>
            </View>
          ) : null}

          <Text style={styles.billDescription}>
            {item.description ||
              (item.issueItems?.length > 0
                ? `${item.issueItems.length} item(s)`
                : "Transaction details")}
          </Text>
        </TouchableOpacity>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          {/* Edit */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditBill(item)}
          >
            <Icon name="pencil" size={16} color="#2196F3" />
            <Text style={[styles.actionText, { color: "#2196F3" }]}>Edit</Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteBill(item)}
          >
            <Icon name="delete" size={16} color="#F44336" />
            <Text style={[styles.actionText, { color: "#F44336" }]}>Delete</Text>
          </TouchableOpacity>

          {/* Print */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePrintBill(item)}
          >
            <Icon name="printer" size={16} color="#FF6F00" />
            <Text style={[styles.actionText, { color: "#FF6F00" }]}>Print</Text>
          </TouchableOpacity>

          {/* WhatsApp */}
          <TouchableOpacity
            style={[styles.actionButton, isSharing && { opacity: 0.6 }]}
            onPress={() => !isSharing && handleWhatsAppShare(item)}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size={16} color="#25D366" />
            ) : (
              <Icon name="whatsapp" size={16} color="#25D366" />
            )}
            <Text style={[styles.actionText, { color: "#2E7D32" }]}>
              {isSharing ? "..." : "WhatsApp"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── LOADING STATE ──────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1B4D1B" />
          <Text style={{ marginTop: 10, color: "#666" }}>
            Loading bill history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <CommonHeader
      title="Bill History"
      subtitle={customer?.customerName || "Unknown Customer"}
      onBack={() => navigation.goBack()}
      backgroundColor="#1B4D1B"
      insideSafeArea
      right={
      <TouchableOpacity onPress={() => navigation.navigate("Home")}>
      <Icon name="home-outline" size={26} color="#fff" />
      </TouchableOpacity>
      }
      />

      {/* Bill Number Search Bar */}
      <View style={styles.searchBarWrapper}>
        <Icon name="magnify" size={20} color="#666" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchBarInput}
          placeholder="Search by bill number..."
          placeholderTextColor="#999"
          value={billSearch}
          onChangeText={setBillSearch}
          clearButtonMode="while-editing"
        />
        {billSearch.length > 0 && (
          <TouchableOpacity onPress={() => setBillSearch("")}>
            <Icon name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Date Filter Card */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Filter by Date</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowFromPicker(true)}
            >
              <Icon
                name="calendar"
                size={20}
                color="#666"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.dateText, !fromDate && { color: "#999" }]}>
                {fromDate
                  ? new Date(fromDate).toLocaleDateString()
                  : "DD-MM-YYYY"}
              </Text>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={fromDate ? new Date(fromDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate)
                    setFromDate(selectedDate.toISOString().split("T")[0]);
                }}
              />
            )}
          </View>

          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowToPicker(true)}
            >
              <Icon
                name="calendar"
                size={20}
                color="#666"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.dateText, !toDate && { color: "#999" }]}>
                {toDate
                  ? new Date(toDate).toLocaleDateString()
                  : "DD-MM-YYYY"}
              </Text>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={toDate ? new Date(toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate)
                    setToDate(selectedDate.toISOString().split("T")[0]);
                }}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => {
            setLoading(true);
            fetchBills();
          }}
        >
          <Icon
            name="magnify"
            size={20}
            color="#fff"
            style={{ marginRight: 5 }}
          />
          <Text style={styles.searchBtnText}>Search History</Text>
        </TouchableOpacity>
      </View>

      {filteredBills.length === 0 ? (
        <View style={styles.noBills}>
          <Icon name="file-document-outline" size={48} color="#ccc" />
          <Text style={styles.noBillsText}>
            {billSearch.trim()
              ? `No bills found for "#${billSearch}".`
              : "No bills found for this customer."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={(item, index) =>
            item?._id?.toString() || index.toString()
          }
          renderItem={renderBillItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F6" },
  header: {
    backgroundColor: "#1B4D1B",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  fileTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  customerName: { color: "#FFD54F", fontSize: 14, marginTop: 4 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  noBills: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  noBillsText: { fontSize: 15, color: "#666", textAlign: "center", paddingHorizontal: 30 },
  listContainer: { padding: 10, paddingBottom: 30 },

  // ── Search Bar ──
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 14,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchBarInput: { flex: 1, fontSize: 14, color: "#333" },

  // ── Card ──
  billCard: {
    backgroundColor: "#fff",
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  billHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  billDate: { fontSize: 13, color: "#666" },
  billType: { fontSize: 13, fontWeight: "bold", color: "#2E7D32" },
  billNoBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  billNoText: { fontSize: 11, fontWeight: "bold", color: "#1B4D1B" },

  // ── Balance Row ──
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  balanceLabel: { fontSize: 13, fontWeight: "600" },
  balanceValue: { fontSize: 16, fontWeight: "bold" },
  obLabel: { color: "#C62828" },
  obValue: { color: "#C62828" },
  abLabel: { color: "#1565C0" },
  abValue: { color: "#1565C0" },

  billDescription: { fontSize: 13, color: "#666", marginTop: 2 },

  // ── Action Row ──
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    paddingHorizontal: 9,
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: "600" },

  // ── Filter Card ──
  filterCard: {
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 10,
  },
  dateRow: { flexDirection: "row", justifyContent: "space-between", gap: 15 },
  dateField: { flex: 1 },
  dateLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 5,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateText: { flex: 1, fontSize: 14, color: "#333" },
  searchBtn: {
    backgroundColor: "#1B4D1B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});


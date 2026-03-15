import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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

const formatB2CInvoiceNo = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "N/A" || raw === "00000") return "A202600";
  // If it already starts with A, just return it (maybe pad the numbers at the end)
  if (raw.toUpperCase().startsWith("A")) {
    const digits = raw.replace(/\D/g, "");
    return `A2026${digits.padStart(2, "0")}`;
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "A202600";
  return `A2026${digits.padStart(2, "0")}`;
};

const formatMainBillNo = (value) => {
  const raw = String(value ?? "").trim();
  if (raw.toUpperCase().startsWith("A")) return formatB2CInvoiceNo(value);
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n).padStart(5, "0");
};

const resolveBillNoForDisplay = (bill = {}, customer = {}) => {
  const type = resolveBillTypeFromContext(bill, customer);
  const raw = bill?.billNo || bill?.invoiceNo || "";
  if (type === "B2C") return formatB2CInvoiceNo(raw);
  return formatMainBillNo(raw) || "00000";
};

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

const isGstBill = (bill = {}) => {
  const gst = bill?.gst || {};
  const gstAmount = Number(gst?.amount || 0);
  const gstPure = Number(bill?.gstPure || 0);
  return Boolean(gst?.enabled) || gstAmount > 0 || gstPure > 0;
};

const resolveBillTotalAmount = (bill = {}) => {
  const gstFinal = Number(bill?.gst?.finalAmount || 0);
  if (Number.isFinite(gstFinal) && gstFinal > 0) return gstFinal;
  const gstTaxable = Number(bill?.gst?.taxableAmount || 0);
  if (Number.isFinite(gstTaxable) && gstTaxable > 0) return gstTaxable;
  const directAmount = Number(bill?.totalAmount ?? bill?.finalAmount ?? bill?.netAmount ?? bill?.cashAmount);
  if (Number.isFinite(directAmount) && directAmount > 0) return directAmount;
  const items = Array.isArray(bill?.items) ? bill.items : [];
  const sum = items.reduce((acc, row) => {
    const v = Number(row?.final ?? row?.totalAmount ?? row?.amount ?? row?.total);
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
  return sum > 0 ? sum : 0;
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

const normalizeBills = (rows = [], ctxCustomer = {}) => {
  const ordered = [...(Array.isArray(rows) ? rows : [])].sort(
    (a, b) => getBillTimestamp(b) - getBillTimestamp(a),
  );
  const seen = new Set();
  const unique = ordered.filter((bill) => {
    const rawNo = bill?.billNo || bill?.invoiceNo || "";
    const isB2C = String(bill?.billType || bill?.customerType || "").toUpperCase() === "B2C";
    const formattedNo = isB2C ? formatB2CInvoiceNo(rawNo) : (formatMainBillNo(rawNo) || "00000");

    const compositeKey = [
      String(bill?.customerId || "").trim(),
      formattedNo,
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
  return sorted.map((bill) => {
    const bal = getBalanceFromBill(bill, null);
    const normalizedBillNo = resolveBillNoForDisplay(bill, ctxCustomer);
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
  const [customer, setCustomer] = useState(route.params?.customer || {});
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      let start = fromDate;
      let end = toDate;
      if (!start || !end) {
        const d = new Date();
        const s = new Date();
        s.setDate(d.getDate() - 30);
        start = s.toISOString().split("T")[0];
        end = d.toISOString().split("T")[0];
      }
      fetchCustomerDetails();
      fetchBills(start, end);
    }, [fromDate, toDate])
  );

  // ── FETCH CUSTOMER ────────────────────────────────────────────────
  const fetchCustomerDetails = async () => {
    try {
      const cid = customer?._id || customer?.id || customer?.customerId;
      if (!cid) return;
      const type = resolveBillType(customer);
      const isDealer = String(customer?.customerType || customer?.type || "").toUpperCase() === "DEALER";
      
      let url = `${base_url}/customers/${cid}`;
      if (type === "B2C") url = `${base_url}/customersB2C/${cid}`;
      else if (isDealer) url = `${base_url}/customersDealer/${cid}`;

      const res = await fetch(url);
      if (res.ok) {
        const fresh = await res.json();
        setCustomer(prev => ({ ...prev, ...fresh, ob: fresh.oldBalance || 0, ab: fresh.advanceBalance || 0 }));
      }
    } catch (error) {
      console.warn("Failed to refresh customer details in BillHistory:", error);
    }
  };

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
        customer
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
          customer
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
        .map((t) => {
          const formattedNo = resolveBillNoForDisplay(t, customer);
          return {
            ...t,
            receiptImage: t?.receiptImage || t?.proofImage || t?.image || "",
            proofImage: t?.proofImage || t?.receiptImage || t?.image || "",
            image: t?.image || t?.receiptImage || t?.proofImage || "",
            receiptImageShowInBill:
              typeof t?.receiptImageShowInBill === "boolean" ? t.receiptImageShowInBill : true,
            billType: resolveBillType(t),
            billNo: formattedNo,
            invoiceNo: formattedNo,
            totalIssueWeight: num(t?.issuePure, num(t?.issueTotal, 0)),
            totalReceiptWeight: num(t?.receiptPure, 0),
            cashAmount: num(t?.cashPure, 0),
            availableBalance: num(t?.balance, 0),
            oldBalance: num(t?.oldBalance, 0),
            advanceBalance: num(t?.advBal, 0),
            createdAt: t?.createdAt || t?.date || new Date().toISOString(),
          };
        });

      setBills(normalizeBills(filtered, customer));
    } catch (error) {
      console.error("Error fetching bills:", error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  // ── CLIENT-SIDE SEARCH ─────────────────────────────────────────────
  const filteredBills = (billSearch.trim()
    ? bills.filter((b) => {
      const bn = String(b.billNo || b.invoiceNo).toLowerCase();
      return bn.includes(billSearch.trim().toLowerCase());
    })
    : bills
  ).slice().sort((a, b) => getBillTimestamp(b) - getBillTimestamp(a));

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
        billNo: resolveBillNoForDisplay(bill, customer),
        invoiceNo: resolveBillNoForDisplay(bill, customer),
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
        billNo: resolveBillNoForDisplay(bill, customer),
        invoiceNo: resolveBillNoForDisplay(bill, customer),
      },
      issueItems: bill.issueItems || [],
      receiptItems: b2cReceiptItems,
      cashTable: bill.cashTable || [],
      summary: resolvedSummary,
      report: resolvedReport,
      transactions: [bill],
      items: b2cIt

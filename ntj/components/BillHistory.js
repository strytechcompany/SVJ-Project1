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
import {
  buildBalanceSummary,
  deriveBalanceStateFromNet,
  normalizeBalanceState,
  toBalanceNumber,
} from "./balanceUtils";

const num = (value, fallback = 0) => toBalanceNumber(value, fallback);
const formatCurrencyValue = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(num(value, 0)),
  );
const appendOthersSuffix = (name, ...sources) => {
  const baseName = String(name || "").trim();
  if (!baseName || baseName.includes("(Others)")) return baseName || "";
  const hasOthersFlag = sources.some((src) => {
    if (!src) return false;
    const shop = String(
      src?.shopName || src?.companyName || src?.company || src?.customer?.shopName || ""
    )
      .trim()
      .toLowerCase();
    return shop === "others";
  });
  return hasOthersFlag ? `${baseName} (Others)` : baseName;
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

const isNilSheetBill = (bill = {}) =>
  String(bill?.nilMode || bill?.previewSnapshot?.summary?.nilMode || "").trim() === "NIL Sheet";

  const resolveBillTypeFromContext = (bill = {}, customer = {}) => {
    const contextType = String(customer?.customerType || customer?.type || "").toUpperCase();
    if (contextType === "B2C") return "B2C";
    if (contextType === "B2B") return "B2B";
    return resolveBillType(bill);
  };

  const resolveHeaderBalance = (cust = {}) => {
    const rawCurrent = num(cust?.balance ?? cust?.currentBalance ?? cust?.availableBalance, NaN);
    const rawOB = num(cust?.ob ?? cust?.oldBalance, 0);
    const rawAB = num(cust?.ab ?? cust?.advanceBalance, 0);
    if (Number.isFinite(rawCurrent)) {
      const derived = deriveBalanceStateFromNet(rawCurrent);
      return {
        label: derived.advanceBalance > 0 ? "AB" : "OB",
        value: derived.advanceBalance > 0 ? derived.advanceBalance : derived.oldBalance,
      };
    }
    const normalized = normalizeBalanceState({ oldBalance: rawOB, advanceBalance: rawAB });
    if (normalized.advanceBalance > 0) return { label: "AB", value: normalized.advanceBalance };
    if (normalized.oldBalance > 0) return { label: "OB", value: normalized.oldBalance };
    return { label: "OB", value: 0 };
  };

	  const getLatestBillFromList = (billList = []) => {
	    if (!Array.isArray(billList) || billList.length === 0) return null;
	    return [...billList]
        .filter((bill) => !isNilSheetBill(bill))
        .sort((a, b) => getBillTimestamp(b) - getBillTimestamp(a))[0] || null;
	  };

  const resolveHeaderBalanceFromLatestBill = (billList = [], cust = {}) => {
    const latest = getLatestBillFromList(billList);
    if (!latest) return resolveHeaderBalance(cust);
    const finalBalance = num(
      latest?.finalBalance ?? latest?.summary?.current ?? latest?.availableBalance,
      NaN,
    );
    if (Number.isFinite(finalBalance)) {
      const derived = deriveBalanceStateFromNet(finalBalance);
      return {
        label: derived.advanceBalance > 0 ? "AB" : "OB",
        value: derived.advanceBalance > 0 ? derived.advanceBalance : derived.oldBalance,
      };
    }
    return resolveHeaderBalance(cust);
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

const getSavedTotalAmount = (bill = {}) => {
  const snapshot = bill?.previewSnapshot || null;
  const snapValue = Number(
    snapshot?.report?.cash ??
    snapshot?.totals?.totalCashPure ??
    snapshot?.summary?.cash
  );
  if (Number.isFinite(snapValue) && snapValue !== 0) return snapValue;
  const directAmount = Number(
    bill?.gst?.finalAmount ??
    bill?.gst?.taxableAmount ??
    bill?.totalAmount ??
    bill?.finalAmount ??
    bill?.netAmount ??
    bill?.cashAmount
  );
  return Number.isFinite(directAmount) ? directAmount : 0;
};

const getBalanceFromBill = (bill = {}, fallbackBalance = null) => {
  const savedBalanceType = String(
    bill?.balanceType ?? bill?.summary?.balanceType ?? bill?.previewSnapshot?.summary?.balanceType ?? "",
  ).toUpperCase();
  const savedBalanceValue = num(
    bill?.balanceValue ?? bill?.summary?.balanceValue ?? bill?.previewSnapshot?.summary?.balanceValue ?? bill?.finalBalance,
    NaN,
  );
  if (Number.isFinite(savedBalanceValue) && savedBalanceType) {
    return {
      label: savedBalanceType,
      value: savedBalanceValue,
      current: num(bill?.summary?.current ?? bill?.currentBalance ?? bill?.availableBalance, 0),
      ob: savedBalanceType === "OB" ? savedBalanceValue : 0,
      ab: savedBalanceType === "AB" ? savedBalanceValue : 0,
    };
  }
  const snapshot = bill?.previewSnapshot || null;
  if (snapshot) {
    const ob = num(snapshot?.summary?.ob, 0);
    const ab = num(snapshot?.summary?.ab, 0);
    const current = num(snapshot?.summary?.current, NaN);
    const state = Number.isFinite(current)
      ? deriveBalanceStateFromNet(current)
      : normalizeBalanceState({ oldBalance: ob, advanceBalance: ab });
    if (state.advanceBalance > 0) return { label: "AB", value: state.advanceBalance, current, ob, ab };
    if (state.oldBalance > 0) return { label: "OB", value: state.oldBalance, current, ob, ab };
  }
  const summaryOb = num(bill?.summary?.ob, 0);
  const summaryAb = num(bill?.summary?.ab, 0);
  const summaryCurrent = num(bill?.summary?.current, NaN);
  const state = Number.isFinite(summaryCurrent)
    ? deriveBalanceStateFromNet(summaryCurrent)
    : normalizeBalanceState({ oldBalance: summaryOb, advanceBalance: summaryAb });
  if (state.advanceBalance > 0) return { label: "AB", value: state.advanceBalance, current: summaryCurrent, ob: summaryOb, ab: summaryAb };
  if (state.oldBalance > 0) return { label: "OB", value: state.oldBalance, current: summaryCurrent, ob: summaryOb, ab: summaryAb };
  if (fallbackBalance) return fallbackBalance;
  return { label: null, value: 0, current: 0, ob: 0, ab: 0 };
};

const normalizeBills = (rows = [], ctxCustomer = {}) => {
  const ordered = [...(Array.isArray(rows) ? rows : [])].sort(
    (a, b) => getBillTimestamp(b) - getBillTimestamp(a),
  );
  const selectPreferredDuplicate = (current, candidate) => {
    const currentNo = Number.parseInt(String(current?.billNo || current?.invoiceNo || "").replace(/\D/g, ""), 10);
    const candidateNo = Number.parseInt(String(candidate?.billNo || candidate?.invoiceNo || "").replace(/\D/g, ""), 10);
    if (Number.isFinite(candidateNo) && Number.isFinite(currentNo) && candidateNo !== currentNo) {
      return candidateNo < currentNo ? candidate : current;
    }
    return getBillTimestamp(candidate) <= getBillTimestamp(current) ? candidate : current;
  };

  const grouped = new Map();
  for (const bill of ordered) {
    const contentKey = [
      String(bill?.customerId || "").trim(),
      String(bill?.date || "").trim(),
      String(num(bill?.oldBalance ?? bill?.ob, 0)),
      String(num(bill?.issuePure ?? bill?.totalIssueWeight, 0)),
      String(num(bill?.receiptPure ?? bill?.totalReceiptWeight, 0)),
      String(num(bill?.cashPure ?? bill?.cashAmount, 0)),
      String(num(bill?.gstPure ?? bill?.summary?.gstPure, 0)),
      String(num(bill?.finalBalance ?? bill?.summary?.current, 0)),
    ].join("|");
    const existing = grouped.get(contentKey);
    grouped.set(contentKey, existing ? selectPreferredDuplicate(existing, bill) : bill);
  }

  const sorted = [...grouped.values()].sort((a, b) => getBillTimestamp(b) - getBillTimestamp(a));
  return sorted.map((bill) => ({
    ...bill,
    description:
      String(
        bill?.description ??
          bill?.previewSnapshot?.header?.description ??
          "",
      ).trim(),
    nilMode: String(
      bill?.nilMode ??
        bill?.summary?.nilMode ??
        bill?.previewSnapshot?.summary?.nilMode ??
        bill?.previewSnapshot?.header?.nilMode ??
        ""
    ).trim(),
    isConvertedToGold: bill.isConvertedToGold || false,
  }));
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
      description: String(bill?.description || bestTx?.description || "").trim(),
      nilMode: String(
        bill?.nilMode ||
          bestTx?.nilMode ||
          bill?.summary?.nilMode ||
          bill?.previewSnapshot?.summary?.nilMode ||
          ""
      ).trim(),
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

  const openingOb = num(bill?.summary?.ob, num(bill?.ob, num(bill?.oldBalance, num(bal?.ob, 0))));
  const openingAb = num(bill?.summary?.ab, num(bill?.advBal, num(bill?.advanceBalance, num(bal?.ab, 0))));
  const computedSummary = buildBalanceSummary({
    oldBalance: openingOb,
    advanceBalance: openingAb,
    issue,
    receipt,
    cash,
  });

  return {
    ob: openingOb.toFixed(3),
    ab: openingAb.toFixed(3),
    issue: issue.toFixed(3),
    receipt: receipt.toFixed(3),
    cash: cash.toFixed(3),
    gstPure: gstPure.toFixed(3),
    receiptPlusCash: (receipt + cash).toFixed(3),
    current: num(
      bal?.current,
      num(bill?.currentBalance, num(bill?.availableBalance, computedSummary.netBalance)),
    ).toFixed(3),
  };
};

export default function BillHistory({ navigation, route }) {
  const routeCustomer = route.params?.customer || null;
  const routeCustomerId =
    route.params?.customerId ||
    routeCustomer?._id ||
    routeCustomer?.id ||
    routeCustomer?.customerId ||
    "";
  const [customer, setCustomer] = useState(
    routeCustomer ||
      (routeCustomerId
        ? {
            _id: routeCustomerId,
            id: routeCustomerId,
            customerId: routeCustomerId,
            customerType: route.params?.customerType || "B2B",
            type: route.params?.customerType || "B2B",
          }
        : {})
  );
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [sharingBillId, setSharingBillId] = useState(null);

  useEffect(() => {
    if (routeCustomer) {
      setCustomer(routeCustomer);
      return;
    }
    if (!routeCustomerId) return;
    setCustomer((prev) => ({
      ...prev,
      _id: prev?._id || routeCustomerId,
      id: prev?.id || routeCustomerId,
      customerId: prev?.customerId || routeCustomerId,
      customerType: prev?.customerType || route.params?.customerType || "B2B",
      type: prev?.type || route.params?.customerType || "B2B",
    }));
  }, [route.params, routeCustomer, routeCustomerId]);

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
            isConvertedToGold: t?.isConvertedToGold || false,
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
      const bn = String(b?.previewSnapshot?.header?.billNo || b.billNo || b.invoiceNo).toLowerCase();
      return bn.includes(billSearch.trim().toLowerCase());
    })
    : bills
  ).slice().sort((a, b) => getBillTimestamp(b) - getBillTimestamp(a));
  const latestEditableBill = getLatestBillFromList(bills);
  const latestEditableBillId = latestEditableBill?._id || latestEditableBill?.id || null;

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
  const handleViewBill = async (bill) => {
    const billType = resolveBillTypeFromContext(bill, customer);
    const displayType = resolveDisplayTypeFromContext(bill, customer);

    // If we have an ID, fetch the latest record so the preview reflects any post-save updates.
    let freshBill = bill;
    if (bill?._id) {
      try {
        const forcedBillType = billType === "B2C" ? "B2C" : "B2B";
        const res = await fetch(`${base_url}/billSummary/${bill._id}?billType=${forcedBillType}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object") {
            freshBill = data;
          }
        }
      } catch (e) {
        console.warn("BillHistory: failed to refresh bill before preview:", e?.message || e);
      }
    }

    const snapshot = freshBill?.previewSnapshot || bill?.previewSnapshot || null;
    const isB2B = String(billType || "").toUpperCase() === "B2B";
    const isDealerLike = String(freshBill?.dealerType || freshBill?.customerType || freshBill?.type || "").toUpperCase();
    const prevOB = Number(freshBill?.previousOldBalance);
    const prevAB = Number(freshBill?.previousAdvanceBalance);
    const savedFinal = Number(freshBill?.finalBalance);
    const previewImage =
      getRecordImage(freshBill) ||
      normalizeImageUri(customer?.receiptImage, base_url) ||
      normalizeImageUri(customer?.proofImage, base_url) ||
      normalizeImageUri(customer?.image, base_url) ||
      normalizeImageUri(customer?.latestTransactionImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.receiptImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.proofImage, base_url) ||
      normalizeImageUri(customer?.lastTransaction?.image, base_url) ||
      "";
    if (snapshot) {
	      navigation.navigate("BillPreview", {
	        fromHistory: true,
	        isReadOnly: true,
	        savedBillId: freshBill?._id || freshBill?.id || bill?._id || bill?.id || "",
        billId: freshBill?._id || freshBill?.id || bill?._id || bill?.id || "",
        description: freshBill?.description || bill?.description || "",
        customer: {
          name: snapshot?.header?.customerName || freshBill.customerName || customer?.customerName || "Unknown",
          phone: snapshot?.header?.phoneNumber || freshBill?.phone || freshBill?.phoneNumber || freshBill?.customerNumber || customer?.customerNumber || customer?.phoneNumber || customer?.phone || "",
          address: snapshot?.header?.address || freshBill?.address || customer?.address || "",
          gstin: snapshot?.header?.gstin || freshBill?.gstin || customer?.gstin || "",
          type: snapshot?.header?.type || displayType,
          image: previewImage,
          proofImage: previewImage,
          receiptImage: previewImage,
          receiptImageShowInBill:
            typeof freshBill?.receiptImageShowInBill === "boolean" ? freshBill.receiptImageShowInBill : true,
          date: snapshot?.header?.date || freshBill.date || (freshBill.createdAt ? new Date(freshBill.createdAt).toLocaleDateString() : new Date().toLocaleDateString()),
          oldBalance: snapshot?.header?.oldBalance,
          advanceBalance: snapshot?.header?.advanceBalance,
          balance: snapshot?.summary?.current,
          id: customer?.id || customer?._id || customer?.customerId || "",
          customerId: customer?.id || customer?._id || customer?.customerId || "",
          billNo: snapshot?.header?.billNo || freshBill.billNo || freshBill.invoiceNo || "",
          invoiceNo: snapshot?.header?.billNo || freshBill.billNo || freshBill.invoiceNo || "",
          description: freshBill?.description || bill?.description || "",
        },
        issueItems: snapshot?.issue?.items || freshBill.issueItems || [],
        receiptItems: snapshot?.receipt?.items || freshBill.receiptItems || [],
        cashTable: snapshot?.cash?.rows || freshBill.cashTable || [],
        summary: snapshot?.summary || freshBill.summary || null,
        report: snapshot?.report || freshBill.report || null,
        transactions: [freshBill],
        items: snapshot?.items || freshBill.items || [],
        gst: snapshot?.gst ?? freshBill.gst ?? null,
        estimate: freshBill.estimate || null,
      });
      return;
    }
    if (isB2B && !["DEALER", "SUPPLIER"].includes(isDealerLike) && (Number.isFinite(prevOB) || Number.isFinite(savedFinal))) {
	      navigation.navigate("BillPreview", {
	        fromHistory: true,
	        isReadOnly: true,
	        savedBillId: freshBill?._id || freshBill?.id || bill?._id || bill?.id || "",
        billId: freshBill?._id || freshBill?.id || bill?._id || bill?.id || "",
        description: freshBill?.description || "",
        customer: {
          name: freshBill.customerName || customer?.customerName || "Unknown",
          phone:
            freshBill?.phone ||
            freshBill?.phoneNumber ||
            freshBill?.customerNumber ||
            customer?.customerNumber ||
            customer?.phoneNumber ||
            customer?.phone ||
            "",
          address: freshBill?.address || customer?.address || "",
          gstin: freshBill?.gstin || customer?.gstin || "",
          type: displayType,
          image: previewImage,
          proofImage: previewImage,
          receiptImage: previewImage,
          receiptImageShowInBill:
            typeof freshBill?.receiptImageShowInBill === "boolean" ? freshBill.receiptImageShowInBill : true,
          date:
            freshBill.date ||
            (freshBill.createdAt
              ? new Date(freshBill.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString()),
          oldBalance: Number.isFinite(prevOB) ? prevOB : (freshBill?.summary?.ob ?? freshBill?.oldBalance ?? freshBill?.ob),
          advanceBalance: Number.isFinite(prevAB) ? prevAB : (freshBill?.summary?.ab ?? freshBill?.advanceBalance ?? freshBill?.advBal),
          balance: Number.isFinite(savedFinal) ? savedFinal : (freshBill?.summary?.current ?? freshBill?.currentBalance ?? freshBill?.availableBalance),
          id: customer?.id || customer?._id || customer?.customerId || "",
          customerId: customer?.id || customer?._id || customer?.customerId || "",
          billNo: freshBill.billNo || freshBill.invoiceNo || "",
          invoiceNo: freshBill.billNo || freshBill.invoiceNo || "",
          description: freshBill?.description || "",
        },
        issueItems: freshBill.issueItems || [],
        receiptItems: freshBill.receiptItems || [],
        cashTable: freshBill.cashTable || [],
        summary: {
          ...(freshBill.summary || {}),
          ob: Number.isFinite(prevOB) ? prevOB : (freshBill?.summary?.ob ?? freshBill?.oldBalance ?? freshBill?.ob ?? 0),
          ab: Number.isFinite(prevAB) ? prevAB : (freshBill?.summary?.ab ?? freshBill?.advanceBalance ?? freshBill?.advBal ?? 0),
          current: Number.isFinite(savedFinal) ? savedFinal : (freshBill?.summary?.current ?? freshBill?.currentBalance ?? freshBill?.availableBalance ?? 0),
        },
        report: freshBill.report || null,
        transactions: [freshBill],
        items: freshBill.items || [],
        gst: freshBill.gst || null,
        estimate: freshBill.estimate || null,
      });
      return;
    }
	    navigation.navigate("BillPreview", {
	      fromHistory: true,
	      isReadOnly: true,
	      savedBillId: freshBill?._id || freshBill?.id || bill?._id || bill?.id || "",
      billId: freshBill?._id || freshBill?.id || bill?._id || bill?.id || "",
      description: freshBill?.description || "",
      customer: {
        name: freshBill.customerName || customer?.customerName || "Unknown",
        phone:
          freshBill?.phone ||
          freshBill?.phoneNumber ||
          freshBill?.customerNumber ||
          customer?.customerNumber ||
          customer?.phoneNumber ||
          customer?.phone ||
          "",
        address: freshBill?.address || customer?.address || "",
        gstin: freshBill?.gstin || customer?.gstin || "",
        type: displayType,
        image: previewImage,
        proofImage: previewImage,
        receiptImage: previewImage,
        receiptImageShowInBill:
          typeof freshBill?.receiptImageShowInBill === "boolean" ? freshBill.receiptImageShowInBill : true,
        date:
          freshBill.date ||
          (freshBill.createdAt
            ? new Date(freshBill.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString()),
        oldBalance: freshBill?.summary?.ob ?? freshBill?.oldBalance ?? freshBill?.ob,
        advanceBalance: freshBill?.summary?.ab ?? freshBill?.advanceBalance ?? freshBill?.advBal,
        balance: freshBill?.summary?.current ?? freshBill?.currentBalance ?? freshBill?.availableBalance,
        id: customer?.id || customer?._id || customer?.customerId || "",
        customerId: customer?.id || customer?._id || customer?.customerId || "",
        billNo: freshBill.billNo || freshBill.invoiceNo || "",
        invoiceNo: freshBill.billNo || freshBill.invoiceNo || "",
        description: freshBill?.description || "",
      },
      issueItems: freshBill.issueItems || [],
      receiptItems: freshBill.receiptItems || [],
      cashTable: freshBill.cashTable || [],
      summary: freshBill.summary || null,
      report: freshBill.report || null,
      transactions: [freshBill],
      items: freshBill.items || [],
      gst: freshBill.gst || null,
      estimate: freshBill.estimate || null,
    });
  };

  // ── EDIT ────────────────────────────────────────────────────────────
	  const handleEditBill = (bill) => {
    if (isNilSheetBill(bill)) {
      Alert.alert("Edit Blocked", "This bill was closed through Nil Sheet and cannot be edited.");
      return;
    }
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
    const snapshot = bill?.previewSnapshot || null;
    const isB2B = String(billType || "").toUpperCase() === "B2B";
    const isDealerLike = String(bill?.dealerType || bill?.customerType || bill?.type || "").toUpperCase();
    const prevOB = Number(bill?.previousOldBalance);
    const prevAB = Number(bill?.previousAdvanceBalance);
    const savedFinal = Number(bill?.finalBalance);
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
    if (snapshot) {
      navigation.navigate("BillPreview", {
        fromHistory: true,
        isReadOnly: true,
        savedBillId: bill?._id || bill?.id || "",
        billId: bill?._id || bill?.id || "",
        description: bill?.description || "",
        customer: {
          name: snapshot?.header?.customerName || bill.customerName || customer?.customerName || "Unknown",
          phone:
            snapshot?.header?.phoneNumber ||
            bill?.phone ||
            bill?.phoneNumber ||
            bill?.customerNumber ||
            customer?.customerNumber ||
            customer?.phoneNumber ||
            customer?.phone ||
            "",
          address: snapshot?.header?.address || bill?.address || customer?.address || "",
          gstin: snapshot?.header?.gstin || bill?.gstin || customer?.gstin || "",
          type: snapshot?.header?.type || displayType,
          image: previewImage,
          proofImage: previewImage,
          receiptImage: previewImage,
          receiptImageShowInBill:
            typeof bill?.receiptImageShowInBill === "boolean" ? bill.receiptImageShowInBill : true,
          date:
            snapshot?.header?.date ||
            bill.date ||
            (bill.createdAt
              ? new Date(bill.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString()),
          oldBalance: snapshot?.header?.oldBalance,
          advanceBalance: snapshot?.header?.advanceBalance,
          balance: snapshot?.summary?.current,
          id: customer?.id || customer?._id || customer?.customerId || "",
          customerId: customer?.id || customer?._id || customer?.customerId || "",
          billNo: snapshot?.header?.billNo || bill.billNo || bill.invoiceNo || "",
          invoiceNo: snapshot?.header?.billNo || bill.billNo || bill.invoiceNo || "",
          description: bill?.description || "",
        },
        issueItems: snapshot?.issue?.items || bill.issueItems || [],
        receiptItems: snapshot?.receipt?.items || bill.receiptItems || [],
        cashTable: snapshot?.cash?.rows || bill.cashTable || [],
        summary: snapshot?.summary || bill.summary || null,
        report: snapshot?.report || bill.report || null,
        transactions: [bill],
        items: snapshot?.items || bill.items || [],
        gst: snapshot?.gst ?? bill.gst ?? null,
        estimate: bill.estimate || null,
        printAgain: true,
      });
      return;
    }
    if (isB2B && !["DEALER", "SUPPLIER"].includes(isDealerLike) && (Number.isFinite(prevOB) || Number.isFinite(savedFinal))) {
      navigation.navigate("BillPreview", {
        fromHistory: true,
        isReadOnly: true,
        savedBillId: bill?._id || bill?.id || "",
        billId: bill?._id || bill?.id || "",
        description: bill?.description || "",
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
          oldBalance: Number.isFinite(prevOB) ? prevOB : (bill?.summary?.ob ?? bill?.oldBalance ?? bill?.ob),
          advanceBalance: Number.isFinite(prevAB) ? prevAB : (bill?.summary?.ab ?? bill?.advanceBalance ?? bill?.advBal),
          balance: Number.isFinite(savedFinal) ? savedFinal : (bill?.summary?.current ?? bill?.currentBalance ?? bill?.availableBalance),
          id: customer?.id || customer?._id || customer?.customerId || "",
          customerId: customer?.id || customer?._id || customer?.customerId || "",
          billNo: bill.billNo || bill.invoiceNo || "",
          invoiceNo: bill.billNo || bill.invoiceNo || "",
          description: bill?.description || "",
        },
        issueItems: bill.issueItems || [],
        receiptItems: bill.receiptItems || [],
        cashTable: bill.cashTable || [],
        summary: {
          ...(bill.summary || {}),
          ob: Number.isFinite(prevOB) ? prevOB : (bill?.summary?.ob ?? bill?.oldBalance ?? bill?.ob ?? 0),
          ab: Number.isFinite(prevAB) ? prevAB : (bill?.summary?.ab ?? bill?.advanceBalance ?? bill?.advBal ?? 0),
          current: Number.isFinite(savedFinal) ? savedFinal : (bill?.summary?.current ?? bill?.currentBalance ?? bill?.availableBalance ?? 0),
        },
        report: bill.report || null,
        transactions: [bill],
        items: bill.items || [],
        gst: bill.gst || null,
        estimate: bill.estimate || null,
        printAgain: true,
      });
      return;
    }
    navigation.navigate("BillPreview", {
      fromHistory: true,
      isReadOnly: true,
      savedBillId: bill?._id || bill?.id || "",
      billId: bill?._id || bill?.id || "",
      description: bill?.description || "",
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
        oldBalance: bill?.summary?.ob ?? bill?.oldBalance ?? bill?.ob,
        advanceBalance: bill?.summary?.ab ?? bill?.advanceBalance ?? bill?.advBal,
        balance: bill?.summary?.current ?? bill?.currentBalance ?? bill?.availableBalance,
        id: customer?.id || customer?._id || customer?.customerId || "",
        customerId: customer?.id || customer?._id || customer?.customerId || "",
        billNo: bill.billNo || bill.invoiceNo || "",
        invoiceNo: bill.billNo || bill.invoiceNo || "",
        description: bill?.description || "",
      },
      issueItems: bill.issueItems || [],
      receiptItems: bill.receiptItems || [],
      cashTable: bill.cashTable || [],
      summary: bill.summary || null,
      report: bill.report || null,
      transactions: [bill],
      items: bill.items || [],
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
      const snapshot = bill?.previewSnapshot || null;
      const custName = bill.customerName || customer?.customerName || "Customer";
      const billNo = snapshot?.header?.billNo || bill.billNo || bill.invoiceNo || "N/A";
      const date = snapshot?.header?.date || bill.date || (bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : "N/A");
      const bal = getBalanceFromBill(bill);
      const issue = num(snapshot?.issue?.totals?.pure ?? bill.issuePure ?? bill.totalIssueWeight);
      const receipt = num(snapshot?.receipt?.totals?.pure ?? bill.receiptPure ?? bill.totalReceiptWeight);

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
  const getBalanceDisplay = (item, isLatest = false) => {
    const savedBalanceType = String(item?.balanceType ?? item?.summary?.balanceType ?? "").toUpperCase();
    const savedBalanceValue = num(item?.balanceValue ?? item?.summary?.balanceValue ?? item?.finalBalance, NaN);
    if (Number.isFinite(savedBalanceValue) && savedBalanceType) {
      return { label: savedBalanceType, value: savedBalanceValue };
    }
    const finalBalance = num(item?.finalBalance ?? item?.summary?.current ?? item?.availableBalance, NaN);
    if (Number.isFinite(finalBalance)) {
      const derived = deriveBalanceStateFromNet(finalBalance);
      return {
        label: derived.advanceBalance > 0 ? "AB" : "OB",
        value: derived.advanceBalance > 0 ? derived.advanceBalance : derived.oldBalance,
      };
    }
    if (isLatest) {
      return resolveHeaderBalanceFromLatestBill([item], customer);
    }
    const prevOB = num(item?.previousOldBalance, NaN);
    const prevAB = num(item?.previousAdvanceBalance, NaN);
    const previousState = normalizeBalanceState({
      oldBalance: Number.isFinite(prevOB) ? prevOB : 0,
      advanceBalance: Number.isFinite(prevAB) ? prevAB : 0,
    });
    if (previousState.advanceBalance > 0) return { label: "AB", value: previousState.advanceBalance };
    if (previousState.oldBalance > 0) return { label: "OB", value: previousState.oldBalance };
    return null;
  };

  const getBalanceComparison = (item, isLatest = false) => {
    const currentBalance = getBalanceDisplay(item, isLatest);
    const previousOldBalance = num(
      item?.previousOldBalance ??
        item?.previewSnapshot?.summary?.previousOldBalance ??
        item?.previewSnapshot?.header?.oldBalance ??
        item?.summary?.ob ??
        item?.oldBalance ??
        item?.ob,
      0,
    );
    const previousAdvanceBalance = num(
      item?.previousAdvanceBalance ??
        item?.previewSnapshot?.summary?.previousAdvanceBalance ??
        item?.previewSnapshot?.header?.advanceBalance ??
        item?.summary?.ab ??
        item?.advanceBalance ??
        item?.advBal,
      0,
    );
    const normalizedPrevious = normalizeBalanceState({
      oldBalance: previousOldBalance,
      advanceBalance: previousAdvanceBalance,
    });
    const previousBalance =
      normalizedPrevious.advanceBalance > 0
        ? { label: "AB", value: normalizedPrevious.advanceBalance }
        : { label: "OB", value: normalizedPrevious.oldBalance };

    return {
      previous: previousBalance,
      current:
        currentBalance ||
        (previousBalance.label === "AB"
          ? { label: "AB", value: 0 }
          : { label: "OB", value: 0 }),
    };
  };

  // ── RENDER CARD ─────────────────────────────────────────────────────
		  const renderBillItem = ({ item }) => {
		    const snapshot = item?.previewSnapshot || null;
		    const normalizedBillType = resolveBillTypeFromContext(item, customer);
		    const isB2BRecord = normalizedBillType === "B2B";
        const isNilSheet = isNilSheetBill(item);
		    const isNilBalance = Boolean(
	      item?.isNilBalance ??
	        snapshot?.summary?.isNilBalance ??
	        (String(item?.nilMode || snapshot?.summary?.nilMode || "").trim() === "NIL Balance")
	    );
	    const isNilFT = Boolean(
	      item?.isNilFT ??
	        snapshot?.summary?.isNilFT ??
	        (String(item?.nilMode || snapshot?.summary?.nilMode || "").trim() === "NIL FT")
	    );
	    const isNilIssue = Boolean(
	      item?.isNilIssue ??
	        snapshot?.summary?.isNilIssue
	    );
	    const nilFtValue = num(
	      item?.returnValue ??
	        snapshot?.summary?.returnValue ??
	        item?.finalValue ??
	        snapshot?.summary?.finalValue ??
	        item?.nilFtValue ??
	        snapshot?.summary?.nilFtValue,
	      0
	    );
	    const baseBalance = num(
	      item?.baseBalance ??
	        snapshot?.summary?.baseBalance ??
	        snapshot?.summaryData?.baseBalance ??
	        item?.summaryData?.baseBalance,
	      0
	    );
	    const returnAmount = num(
	      item?.returnAmount ??
	        snapshot?.summary?.returnAmount,
	      0
	    );
	    const finalAmount = num(
	      item?.finalAmount ??
	        snapshot?.summary?.finalAmount ??
	        item?.finalValue ??
	        snapshot?.summary?.finalValue,
	      0
	    );
	    const previousOldBalance = num(
	      item?.previousOldBalance ??
	        snapshot?.summary?.previousOldBalance ??
	        snapshot?.header?.oldBalance ??
	        item?.summary?.ob,
	      0
	    );
	    const previousAdvanceBalance = num(
	      item?.previousAdvanceBalance ??
	        snapshot?.summary?.previousAdvanceBalance ??
	        snapshot?.header?.advanceBalance ??
	        item?.summary?.ab,
	      0
	    );
	    const nilBalanceBasisValue = previousOldBalance > 0 ? previousOldBalance : previousAdvanceBalance;
	    const ftRateValue = num(
	      item?.ftRate ??
	        item?.resultFtRate ??
	        snapshot?.summary?.ftRate ??
	        snapshot?.summary?.resultFtRate ??
	        snapshot?.header?.ftRate,
	      0
	    );
	    const nilBalanceAmount = num(
	      item?.resultValue ??
	        snapshot?.summary?.resultValue ??
	        item?.nilBalanceAmount ??
	        snapshot?.summary?.nilBalanceAmount,
	      nilBalanceBasisValue * ftRateValue
	    );
	    const nilIssueAmount = num(
	      item?.nilIssueAmount ??
	        snapshot?.summary?.nilIssueAmount,
	      0
	    );
	    const storedNilResultType = String(
	      item?.nilResultType ??
	        snapshot?.summary?.nilResultType ??
	        ""
	    ).trim();
	    const storedNilResultValue = num(
	      item?.nilResultValue ??
	        snapshot?.summary?.nilResultValue,
	      NaN
	    );
		    const nilBadgeText = storedNilResultType === "NIL Sheet"
          ? "NIL Sheet"
		      : storedNilResultType && Number.isFinite(storedNilResultValue)
		      ? (storedNilResultType === "NIL FT"
		          ? `NIL FT : ${storedNilResultValue.toFixed(3)}`
	          : storedNilResultType === "NIL Issue"
	            ? `NIL Issue : \u20B9 ${formatCurrencyValue(storedNilResultValue)}`
	            : storedNilResultType === "NIL Balance"
	              ? `Nil Balance : \u20B9 ${formatCurrencyValue(storedNilResultValue)}`
	              : "")
	      : isNilIssue
	        ? `NIL Issue : \u20B9 ${formatCurrencyValue(nilIssueAmount)}`
	        : isNilBalance
	          ? `Nil Balance : \u20B9 ${formatCurrencyValue(nilBalanceAmount)}`
		        : isNilFT
		            ? `NIL FT : ${nilFtValue.toFixed(3)}`
		            : "";
	    const activityDate = item.updatedAt || item.createdAt || null;
    const activityDateObj = activityDate ? new Date(activityDate) : null;
    const createdDate = snapshot?.header?.date ||
      (activityDateObj ? activityDateObj.toLocaleDateString() : item.date || "N/A");
    const createdTime = activityDateObj
      ? activityDateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "N/A";
    const gstBill = isGstBill(item);
    const itemType = gstBill ? "GST" : (snapshot?.header?.type || resolveDisplayTypeFromContext(item, customer));
    const billNumber = snapshot?.header?.billNo || item.billNo || item.invoiceNo || "00000";
    const itemId = item?._id || item?.id || null;
	    const isLatest = Boolean(!isNilSheet && latestEditableBillId && itemId && latestEditableBillId === itemId);
    const balanceComparison = getBalanceComparison(item, isLatest);
    const isSharing = sharingBillId === item._id;
    const displayCustomerNameRaw = snapshot?.header?.customerName || item.customerName || customer?.customerName || customer?.name || "N/A";
    const displayCustomerName = appendOthersSuffix(displayCustomerNameRaw, item, snapshot?.header, customer);
    const displayPhone = snapshot?.header?.phoneNumber || item.phoneNumber || item.phone || customer?.phoneNumber || customer?.phone || "N/A";
    const displayGstin = snapshot?.header?.gstin || item.gstin || customer?.gstin || "N/A";
    const displayTotalAmount = getSavedTotalAmount(item);
    const previewSummary = buildSummaryForPreview(item, {
      ob: balanceComparison.previous.label === "OB" ? balanceComparison.previous.value : 0,
      ab: balanceComparison.previous.label === "AB" ? balanceComparison.previous.value : 0,
      current:
        balanceComparison.current.label === "AB"
          ? -Math.abs(balanceComparison.current.value)
          : Math.abs(balanceComparison.current.value),
    });
    const issuePure = num(previewSummary?.issue, 0);
    const receiptPure = num(previewSummary?.receipt, 0);

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

          {gstBill ? (
            <View style={styles.gstInfoBox}>
              <Text style={styles.gstInfoText}>Customer: {displayCustomerName}</Text>
              <Text style={styles.gstInfoText}>Phone: {displayPhone}</Text>
              <Text style={styles.gstInfoText}>GST No: {displayGstin}</Text>
              <Text style={styles.gstInfoText}>
                Total Amount: ₹{Number(displayTotalAmount || 0).toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.balanceComparisonRow}>
            <View style={styles.balanceComparisonColumn}>
              <Text style={styles.balanceCaption}>Previous Balance</Text>
              <Text
                style={[
                  styles.balanceLabel,
                  balanceComparison.previous.label === "OB" ? styles.obLabel : styles.abLabel,
                ]}
              >
                {balanceComparison.previous.label === "OB"
                  ? "Previous Old Balance"
                  : "Previous Advance Balance"}
              </Text>
              <Text
                style={[
                  styles.balanceValue,
                  balanceComparison.previous.label === "OB" ? styles.obValue : styles.abValue,
                ]}
              >
                {balanceComparison.previous.value.toFixed(3)} g
              </Text>
            </View>

            <View style={[styles.balanceComparisonColumn, styles.balanceComparisonColumnRight]}>
              {/* <Text style={[styles.balanceCaption, styles.balanceTextRight]}>Current Balance</Text> */}
              <Text
                style={[
                  styles.balanceLabel,
                  styles.balanceTextRight,
                  balanceComparison.current.label === "OB" ? styles.obLabel : styles.abLabel,
                ]}
              >
                {balanceComparison.current.label === "OB"
                  ? "Current Old Balance"
                  : "Current Advance Balance"}
              </Text>
              <Text
                style={[
                  styles.balanceValue,
                  styles.balanceTextRight,
                  balanceComparison.current.label === "OB" ? styles.obValue : styles.abValue,
                ]}
              >
                {balanceComparison.current.value.toFixed(3)} g
              </Text>
            </View>
          </View>
          <View style={styles.pureTotalsRow}>
            <Text style={styles.issuePureText}>Total Issued Pure: {issuePure.toFixed(3)} g</Text>
            <Text style={styles.receiptPureText}>Total Receipt Pure: {receiptPure.toFixed(3)} g</Text>
          </View>

	          <Text style={styles.billDescription}>
	            {item.description ||
	              (item.issueItems?.length > 0
	                ? `${item.issueItems.length} item(s)`
	                : "Transaction details")}
	          </Text>
	          {isB2BRecord && nilBadgeText ? (
	            <View style={styles.nilModeBadge}>
	              <Text style={styles.nilModeBadgeText}>{nilBadgeText}</Text>
	            </View>
	          ) : null}
	        </TouchableOpacity>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          {isLatest ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditBill(item)}
            >
              <Icon name="pencil" size={16} color="#2E7D32" />
              <Text style={[styles.actionText, { color: "#2E7D32" }]}>Edit</Text>
            </TouchableOpacity>
          ) : null}

          {/* View */}
          {/* <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewBill(item)}
          >
            <Icon name="eye" size={16} color="#2196F3" />
            <Text style={[styles.actionText, { color: "#2196F3" }]}>View</Text>
          </TouchableOpacity> */}

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

          {/* Share */}
          <TouchableOpacity
            style={[styles.actionButton, isSharing && { opacity: 0.6 }]}
            onPress={() => !isSharing && handleWhatsAppShare(item)}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size={16} color="#25D366" />
            ) : (
              <Icon name="share-variant" size={16} color="#25D366" />
            )}
            <Text style={[styles.actionText, { color: "#2E7D32" }]}>
              {isSharing ? "..." : "Share"}
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

      {/* Customer Balance Summary Card */}
      <View style={styles.customerBalanceCard}>
        <View style={styles.balanceInfo}>
          <Text style={styles.customerNameMain}>
            {customer?.customerName || customer?.name || "N/A"}
          </Text>
          <Text style={styles.shopNameText}>
            {customer?.shopName || customer?.companyName || "No Shop Name"}
          </Text>
        </View>
        <View style={styles.balanceBadgeContainer}>
          {(() => {
            const latestBill = getLatestBillFromList(filteredBills);
            const latestFinal = num(
              latestBill?.finalBalance ??
              latestBill?.summary?.current ??
              latestBill?.availableBalance,
              NaN,
            );
            const derived = Number.isFinite(latestFinal)
              ? deriveBalanceStateFromNet(latestFinal)
              : normalizeBalanceState({
                  oldBalance: customer?.oldBalance ?? customer?.ob,
                  advanceBalance: customer?.advanceBalance ?? customer?.ab,
                });
            const label = derived.advanceBalance > 0 ? "AB" : "OB";
            const value = derived.advanceBalance > 0 ? derived.advanceBalance : derived.oldBalance;
            return (
              <View style={[styles.balanceBadge, label === "AB" ? styles.abBadge : styles.obBadge]}>
                <Text style={styles.badgeLabel}>{label}</Text>
                <Text style={styles.badgeValue}>{Number(value || 0).toFixed(3)}g</Text>
              </View>
            );
          })()}
        </View>
      </View>

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

  gstInfoBox: {
    backgroundColor: "#F7FBFF",
    borderWidth: 1,
    borderColor: "#E3F2FD",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  gstInfoText: { fontSize: 12, color: "#455A64", marginBottom: 2 },

  // ── Balance Row ──
  balanceComparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  balanceComparisonColumn: {
    flex: 1,
  },
  balanceComparisonColumnRight: {
    alignItems: "flex-end",
  },
  balanceCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: "#607D8B",
    marginBottom: 3,
  },
  balanceLabel: { fontSize: 13, fontWeight: "600" },
  balanceValue: { fontSize: 16, fontWeight: "bold" },
  balanceTextRight: { textAlign: "right" },
  obLabel: { color: "#C62828" },
  obValue: { color: "#C62828" },
  abLabel: { color: "#2E7D32" },
  abValue: { color: "#2E7D32" },
  pureTotalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  issuePureText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#1565C0",
  },
  receiptPureText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
    textAlign: "right",
  },

  billDescription: { fontSize: 13, color: "#455A64", marginTop: 2 },
  nilModeBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nilModeBadgeText: {
    color: "#E65100",
    fontSize: 12,
    fontWeight: "700",
  },

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

  // ── Customer Balance Card ──
  customerBalanceCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceInfo: { flex: 1 },
  customerNameMain: { fontSize: 18, fontWeight: "bold", color: "#1B4D1B" },
  shopNameText: { fontSize: 12, color: "#455A64", marginTop: 2 },
  balanceBadgeContainer: { marginLeft: 15 },
  balanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 80,
  },
  obBadge: { backgroundColor: "#FFEBEE" },
  abBadge: { backgroundColor: "#E8F5E9" },
  badgeLabel: { fontSize: 10, fontWeight: "bold", color: "#455A64" },
  badgeValue: { fontSize: 16, fontWeight: "bold", color: "#333" },
});

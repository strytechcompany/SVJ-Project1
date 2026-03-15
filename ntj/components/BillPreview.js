// ntj/components/BillPreview.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Linking } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { base_url } from "./config";

// Format numbers in Indian comma style: 1,230 / 12,035 / 1,23,456
const formatIndianNumber = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  // Use Math.round for whole rupees display
  const rounded = Math.round(num);
  const str = rounded.toString();
  // Indian number system: last 3 digits, then groups of 2
  const lastThree = str.slice(-3);
  const rest = str.slice(0, str.length - 3);
  const formatted = rest.length > 0
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return formatted;
};

const formatMainBillNo = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n).padStart(5, "0");
};

const DEFAULT_THIRUKKURAL = "அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு.";
const TAMIL_FONT_STACK = '"Noto Sans Tamil", "Nirmala UI", "Latha", "Tamil Sangam MN", "Arial Unicode MS", sans-serif';
const tamilFontFamily = Platform.select({
  ios: "Tamil Sangam MN",
  android: "Noto Sans Tamil",
  default: "Noto Sans Tamil",
});

export default function BillPreview({ route, navigation }) {
  const { issueItems, receiptItems, cashTable, summary, report, transactions, items, gst, estimate, suspense, order, printAgain } = route.params || {};
  const customer = route.params?.customer || {};
const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeImageUri = (rawValue, baseUrl = "") => {
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

  if (rawValue === null || rawValue === undefined) return "";
  let uri = readImageField(rawValue);
  if (!uri) return "";

  try {
    if (uri.includes("%2F") || uri.includes("%3A") || uri.includes("%2B")) {
      uri = decodeURIComponent(uri);
    }
  } catch (_) {
    // keep original
  }

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
  const safeIssueItems = Array.isArray(issueItems) ? issueItems : [];
  const safeReceiptItems = Array.isArray(receiptItems) ? receiptItems : [];
  const safeCashTable = Array.isArray(cashTable) ? cashTable : [];

  const isB2C = customer?.type === 'B2C';
  console.log("DEBUG: Customer in Preview ðŸ‘‰", customer);

  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [showUpi, setShowUpi] = useState(false);
  const [b2cConversion, setB2cConversion] = useState({
    applied: false,
    goldWeight: 0,
    updatedOB: 0,
    updatedAB: 0,
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const isSharingRef = useRef(false);
  const hasAutoPrintedRef = useRef(false);
  const hasAutoSharedRef = useRef(false);
  const preparedPdfUriRef = useRef("");

  const [upiId, setUpiId] = useState("kaliyamoorthirengaraj@okaxis");
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [additionalCash, setAdditionalCash] = useState('');
  const [kadaiAmount, setKadaiAmount] = useState(() => {
    const existing = transactions?.[0]?.kadaiAmount ?? customer?.kadaiAmount ?? "";
    return existing === null || existing === undefined || String(existing).trim() === ""
      ? ""
      : String(existing);
  });
  const [thirukkural, setThirukkural] = useState(DEFAULT_THIRUKKURAL);

  useFocusEffect(
    useCallback(() => {
      const loadSelectedUpiId = async () => {
        try {
          const stored = await AsyncStorage.getItem('selectedUpiId');
          if (stored) {
            setUpiId(stored);
          }
        } catch (error) {
          console.error('Error loading selected UPI ID:', error);
        }
      };
      const loadThirukkural = async () => {
        try {
          const response = await axios.get(`${base_url}/thirukkural`);
          const latestKural = response?.data?.kural || "";
          if (String(latestKural).trim()) {
            setThirukkural(latestKural);
            await AsyncStorage.setItem('thirukkural_quote', latestKural);
            return;
          }
          const storedKural = await AsyncStorage.getItem('thirukkural_quote');
          if (storedKural && String(storedKural).trim()) {
            setThirukkural(storedKural);
            return;
          }
          setThirukkural(DEFAULT_THIRUKKURAL);
        } catch (error) {
          console.error('Error loading Thirukkural:', error);
          const storedKural = await AsyncStorage.getItem('thirukkural_quote');
          if (storedKural && String(storedKural).trim()) {
            setThirukkural(storedKural);
            return;
          }
          setThirukkural(DEFAULT_THIRUKKURAL);
        }
      };
      loadSelectedUpiId();
      loadThirukkural();
    }, [])
  );
  const [qrDataURL, setQrDataURL] = useState('');
  const [qrReady, setQrReady] = useState(false);

  const qrRef = useRef(null);

  const totalAmount = report ? parseFloat(report.cash) : 0;

  useEffect(() => {
    if (!printAgain || hasAutoPrintedRef.current) return;
    hasAutoPrintedRef.current = true;
    const timer = setTimeout(() => {
      handlePrint();
    }, 350);
    return () => clearTimeout(timer);
  }, [printAgain]);

  const finalBalance = toNum(summary?.current, 0);
  const summaryOB = toNum(summary?.ob, toNum(customer?.oldBalance, 0));
  const summaryAB = toNum(summary?.ab, toNum(customer?.advanceBalance, 0));


  // Calculate separate totals for issue and receipt
  const totalIssuePure = safeIssueItems.reduce((sum, item) => sum + toNum(item?.pure, 0), 0).toFixed(3);
  const totalReceiptPure = safeReceiptItems.reduce((sum, item) => sum + toNum(item?.pure, 0), 0).toFixed(3);

  // Calculate TW (Total Weight) and NW (Net Weight) totals for Issue and Receipt
  const totalIssueTW = safeIssueItems.reduce((sum, item) => sum + toNum(item?.gross, 0), 0).toFixed(3);
  const totalIssueNW = safeIssueItems.reduce((sum, item) => sum + toNum(item?.net, 0), 0).toFixed(3);
  const totalReceiptTW = safeReceiptItems.reduce((sum, item) => sum + toNum(item?.weight, 0), 0).toFixed(3);
  const totalReceiptNW = safeReceiptItems.reduce((sum, item) => sum + toNum(item?.result, 0), 0).toFixed(3);
  const showIssueMColumn = safeIssueItems.some((item) => toNum(item?.m, 0) !== 0);
  const showIssueNetWeightColumn = safeIssueItems.some((item) => toNum(item?.net, 0) !== 0);
  const issueFromRows = safeIssueItems.reduce((sum, row) => sum + toNum(row?.pure, 0), 0);
  const receiptFromRows = safeReceiptItems.reduce(
    (sum, row) => sum + toNum(row?.pure, toNum(row?.result, toNum(row?.netWeight, 0))),
    0,
  );
  const cashFromRows = safeCashTable.reduce((sum, row) => sum + toNum(row?.pure, 0), 0);
  const summaryIssueRaw = toNum(summary?.issue, 0);
  const summaryReceiptRaw = toNum(summary?.receipt, 0);
  const summaryCashRaw = toNum(summary?.cash, 0);
  const summaryGstPureRaw = toNum(summary?.gstPure, 0);
  const summaryIssue = Math.abs(summaryIssueRaw) < 0.0001 && Math.abs(issueFromRows) > 0.0001 ? issueFromRows : summaryIssueRaw;
  const summaryReceipt = Math.abs(summaryReceiptRaw) < 0.0001 && Math.abs(receiptFromRows) > 0.0001 ? receiptFromRows : summaryReceiptRaw;
  const summaryCash = Math.abs(summaryCashRaw) < 0.0001 && Math.abs(cashFromRows) > 0.0001 ? cashFromRows : summaryCashRaw;
  const summaryGstPure = summaryGstPureRaw;
  const displaySummary = {
    issue: summaryIssue.toFixed(3),
    receipt: summaryReceipt.toFixed(3),
    cash: summaryCash.toFixed(3),
    gstPure: summaryGstPure.toFixed(3),
    receiptPlusCash: (summaryReceipt + summaryCash).toFixed(3),
    ob: summaryOB.toFixed(3),
    ab: summaryAB.toFixed(3),
    current: toNum(summary?.current, (summaryOB - summaryAB) + summaryIssue + summaryGstPure - summaryReceipt - summaryCash).toFixed(3),
  };
  const b2cRateFallback =
    toNum(safeCashTable?.[0]?.goldRate, 0) ||
    toNum(safeReceiptItems?.[0]?.rate, 0) ||
    toNum(summary?.goldRate, 0);
  const normalizedB2CItems = (Array.isArray(items) ? items : []).map((row) => {
    const weight = toNum(row?.weight, toNum(row?.gross, 0));
    const touch = toNum(row?.touch, toNum(row?.calc, 0));
    const wastage = toNum(row?.wastage, toNum(row?.m, 0));
    const rate = toNum(row?.rate, toNum(row?.goldRate, toNum(row?.goldrate, b2cRateFallback)));
    const computedTotal = (weight + wastage) * rate;
    const total = toNum(row?.total, toNum(row?.netAmount, toNum(row?.amount, computedTotal)));
    const gstValue = toNum(row?.gst, toNum(row?.gstAmount, 0));
    const final = toNum(row?.final, toNum(row?.totalAmount, total + gstValue));
    return {
      ...row,
      itemName: row?.itemName || row?.name || "",
      displayItemName: row?.displayItemName || row?.itemName || row?.name || "",
      weight,
      touch,
      wastage,
      rate,
      total,
      gst: gstValue,
      final,
      pure: toNum(row?.pure, (weight * touch) / 100),
    };
  });
  const normalizedB2CReceiptItems = safeReceiptItems.map((row) => {
    const weight = toNum(row?.weight, 0);
    const sub = toNum(row?.sub, 0);
    const netWeight = toNum(row?.netWeight, toNum(row?.netWt, toNum(row?.result, toNum(row?.pure, weight - sub))));
    const rate = toNum(row?.rate, toNum(row?.ftRate, toNum(row?.goldRate, toNum(row?.goldrate, b2cRateFallback))));
    const amount = toNum(row?.amount, toNum(row?.amt, toNum(row?.total, netWeight * rate)));
    return {
      ...row,
      name: row?.name || "",
      weight: weight.toFixed(3),
      sub: sub.toFixed(3),
      netWeight: netWeight.toFixed(3),
      rate: rate.toFixed(2),
      amount: amount.toFixed(2),
      result: netWeight.toFixed(3),
      pure: netWeight.toFixed(3),
    };
  });
  const totalB2CItemFinal = normalizedB2CItems.reduce((sum, item) => sum + toNum(item?.final, 0), 0);
  const totalB2COldGoldAmount = normalizedB2CReceiptItems.reduce((sum, item) => sum + toNum(item?.amount, 0), 0);
  const computedB2CTotalAmount = totalB2CItemFinal - totalB2COldGoldAmount;
  const reportCash = toNum(report?.cash, NaN);
  const displayB2CTotalAmount =
    Number.isFinite(reportCash) && !(Math.abs(reportCash) < 0.0001 && Math.abs(computedB2CTotalAmount) > 0.0001)
      ? reportCash
      : computedB2CTotalAmount;
  const displayB2COldBalance = toNum(summary?.ob, toNum(customer?.oldBalance, 0));
  const displayB2CAdvanceBalance = toNum(summary?.ab, toNum(customer?.advanceBalance, 0));
  const currentB2CGoldRate =
    toNum(customer?.goldRate, 0) ||
    toNum(normalizedB2CItems?.[0]?.rate, 0) ||
    b2cRateFallback;
  const hasManualCashForB2C = isB2C && String(cashAmount || "").trim() !== "";
  const parsedCashAmount = hasManualCashForB2C ? Math.max(0, toNum(cashAmount, 0)) : 0;
  const parsedUpiAmount = hasManualCashForB2C ? Math.max(0, toNum(upiAmount, 0)) : 0;
  const savedB2CConvertedGold = toNum(transactions?.[0]?.b2cUpiGoldValue, 0);
  const b2cUpiGoldValue = b2cConversion.applied ? b2cConversion.goldWeight : 0;
  const displayConvertedGoldValue = b2cConversion.applied ? b2cUpiGoldValue : savedB2CConvertedGold;
  const effectiveB2COldBalance = b2cConversion.applied
    ? b2cConversion.updatedOB
    : displayB2COldBalance;
  const effectiveB2CAdvanceBalance = b2cConversion.applied
    ? b2cConversion.updatedAB
    : displayB2CAdvanceBalance;
  const estimateItems = Array.isArray(estimate?.items) ? estimate.items : [];
  const estimateGSTEnabled = Boolean(estimate?.enableGST);
  const estimateSubTotal = estimateItems.length > 0
    ? estimateItems.reduce((sum, it) => sum + toNum(it?.netAmount, 0), 0)
    : toNum(estimate?.netAmount, 0);
  const estimateFinalTotal = estimateItems.length > 0
    ? estimateItems.reduce((sum, it) => sum + toNum(it?.totalAmount, 0), 0)
    : toNum(estimate?.totalAmount, 0);
  const estimateGstFromItems = estimateItems.reduce((sum, it) => sum + toNum(it?.gst, 0), 0);
  const estimateGstAmount = estimateGSTEnabled
    ? toNum(
      estimate?.gst,
      estimateGstFromItems > 0 ? estimateGstFromItems : Math.max(0, estimateFinalTotal - estimateSubTotal),
    )
    : 0;
  const estimateGstPercent = estimateGSTEnabled && estimateSubTotal > 0
    ? (estimateGstAmount / estimateSubTotal) * 100
    : 0;

  useEffect(() => {
    if (!isB2C) return;
    const rawCash = String(cashAmount || "").trim();
    if (!rawCash) {
      if (upiAmount !== "") setUpiAmount("");
      if (b2cConversion.applied) setB2cConversion((prev) => ({ ...prev, applied: false, goldWeight: 0 }));
      setShowUpi(false);
      return;
    }

    const cash = Math.max(0, toNum(rawCash, 0));
    const remaining = Math.max(0, displayB2CTotalAmount - cash);
    const nextUpi = remaining.toFixed(2);
    if (nextUpi !== upiAmount) {
      setUpiAmount(nextUpi);
      setB2cConversion((prev) => ({ ...prev, applied: false, goldWeight: 0 }));
    }
  }, [b2cConversion.applied, cashAmount, displayB2CTotalAmount, isB2C, upiAmount]);

  useEffect(() => {
    if (!isB2C || !b2cConversion.applied) return;
    setB2cConversion((prev) => ({ ...prev, applied: false, goldWeight: 0 }));
  }, [isB2C, upiAmount]);

  function generateHTML() {
    if (estimate) {
      const enableGST = estimate.enableGST !== false && estimate.enableGST !== undefined ? estimate.enableGST : false;
      const estimateItems = estimate.items && estimate.items.length > 0 ? estimate.items : null;
      const subTotal = estimateItems
        ? estimateItems.reduce((sum, i) => sum + toNum(i?.netAmount, 0), 0)
        : toNum(estimate?.netAmount, 0);
      const grandTotal = estimateItems
        ? estimateItems.reduce((sum, i) => sum + i.totalAmount, 0)
        : parseFloat(estimate.totalAmount || 0);
      const gstAmount = enableGST
        ? (estimateItems
          ? estimateItems.reduce((sum, i) => sum + toNum(i?.gst, 0), 0)
          : toNum(estimate?.gst, Math.max(0, grandTotal - subTotal)))
        : 0;
      const gstPercent = enableGST && subTotal > 0 ? (gstAmount / subTotal) * 100 : 0;
      return `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 2mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
              h2 { margin-top: 5px; font-size: 11px; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 2px 1px; text-align: center; font-size: 8px; word-wrap: break-word; overflow: hidden; }
              th { background-color: #f2f2f2; }
              p { margin: 2px 0; font-size: 9px; }
              .tamil-text { font-family: ${TAMIL_FONT_STACK}; }
              .total-row { font-weight: bold; background-color: #e8f5e9; }
            </style>
          </head>
          <body>
            <h1>ESTIMATE BILL</h1>
            <div>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>GST No:</strong> ${estimate.gstin || 'N/A'}</p>
            </div>
            <h2>ESTIMATE DETAILS:</h2>
            <table>
              <tr>
                <th>Item Name</th>
                <th>Wt (g)</th>
                <th>W%</th>
                <th>Gross Wt</th>
                <th>Rate</th>
                <th>Net Amt</th>
                ${enableGST ? '<th>GST</th>' : ''}
                <th>Total</th>
              </tr>
              ${estimateItems
          ? estimateItems.map(item => `
                  <tr>
                    <td>${item.itemName}</td>
                    <td>${item.weight}</td>
                    <td>${item.wastagePercent}</td>
                    <td>${item.grossWeight}</td>
                    <td>${item.goldRate}</td>
                    <td>\u20b9${item.netAmount}</td>
                    ${enableGST ? `<td>\u20b9${item.gst}</td>` : ''}
                    <td>\u20b9${Math.round(item.totalAmount)}</td>
                  </tr>
                `).join('')
          : `
                  <tr>
                    <td>${estimate.itemName}</td>
                    <td>${estimate.weight}</td>
                    <td>${estimate.wastagePercent || 0}</td>
                    <td>${estimate.grossWeight}</td>
                    <td>${estimate.goldRate}</td>
                    <td>\u20b9${estimate.netAmount}</td>
                    ${enableGST ? `<td>\u20b9${parseFloat(estimate.gst || 0).toFixed(2)}</td>` : ''}
                    <td>\u20b9${Math.round(parseFloat(estimate.totalAmount))}</td>
                  </tr>
                `
        }
              <tr class="total-row">
                <td colspan="${enableGST ? 7 : 6}" style="text-align:right;">TOTAL ESTIMATE AMOUNT:</td>
                <td>\u20b9${Math.round(grandTotal)}</td>
              </tr>
            </table>

            ${enableGST ? `
              <h2 style="margin-bottom: 5px;">GST SUMMARY:</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <tr>
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Subtotal</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">\u20b9${subTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Percentage</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">${gstPercent.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Amount</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">\u20b9${gstAmount.toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #f2f2f2;">
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Final Total (Incl. GST)</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">\u20b9${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
            ` : ''}

            ${!estimate && gst && (gst.enabled || parseFloat(gst.amount || 0) > 0) ? `
              <h2 style="margin-bottom: 5px;">GST BREAKDOWN:</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                ${parseFloat(gst.igst || 0) > 0 ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">IGST (${gst.igst}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount}</td>
                  </tr>
                ` : (parseFloat(gst.sgst || 0) > 0 || parseFloat(gst.cgst || 0) > 0) ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">SGST (${gst.sgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">CGST (${gst.cgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Percentage</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">${gst.percentage || 0}%</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Amount</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                  </tr>
                `}
                <tr style="font-weight: bold; background-color: #f2f2f2;">
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Total GST Amount</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                </tr>
              </table>
            ` : ''}
          </body>
        </html>
      `;
    } else if (order) {
      return `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 2mm; font-size: 10px; }
              h1 { text-align: center; color: #1B4D1B; margin-bottom: 10px; font-size: 14px; }
              .order-details { margin-bottom: 10px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; }
              .order-details p { margin: 2px 0; font-size: 9px; }
              .photo-container { text-align: center; margin: 5px 0; }
              .order-photo { max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; }
              table { width: 100%; border-collapse: collapse; margin-top: 5px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 2px 1px; text-align: center; font-size: 8px; word-wrap: break-word; overflow: hidden; }
              th { background-color: #f2f2f2; }
              .footer { text-align: center; margin-top: 15px; font-style: italic; color: #666; font-size: 9px; }
            </style>
          </head>
          <body>
            <h1>ORDER RECEIPT</h1>
            <div class="order-details" style="display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px;">
              <div style="flex: 1;">
                <p><strong>Order No:</strong> ${order.orderNo}</p>
                <p><strong>Name:</strong> ${order.customer}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
                <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
                <p><strong>GST No:</strong> ${order.gstin || 'N/A'}</p>
              </div>
              <div style="text-align: right; width: 100px;">
                <p><strong>Type:</strong> Order</p>
                <p><strong>Date:</strong> ${order.date || '-'}</p>
              </div>
            </div>
            <div style="border: 1px solid #000; margin-top: 10px; padding: 10px;">
               <p><strong>ORDER DETAILS :</strong></p>
               <div style="margin-top: 5px;">
                  <p><strong>Order No:</strong> ${order.orderNo}</p>
                  <p><strong>Item:</strong> ${order.type}</p>
                  <p><strong>Weight:</strong> ${order.weight} GMS</p>
                  <p><strong>Payment:</strong> ${order.payment}</p>
                  <p><strong>Pending Balance:</strong> â‚¹${order.balance}</p>
               </div>
            </div>

            ${order.image ? `
              <div class="photo-container">
                <p><strong>Item Photo:</strong></p>
                <img src="${order.image.startsWith('data:') ? order.image : `${base_url}/${order.image}`}" style="width: 100%; border-radius: 5px;" />
              </div>
            ` : ''}

            ${gst && (gst.enabled || parseFloat(gst.amount || 0) > 0) ? `
              <h2 style="margin-bottom: 5px;">GST BREAKDOWN:</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                ${parseFloat(gst.igst || 0) > 0 ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">IGST (${gst.igst}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount}</td>
                  </tr>
                ` : (parseFloat(gst.sgst || 0) > 0 || parseFloat(gst.cgst || 0) > 0) ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">SGST (${gst.sgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">CGST (${gst.cgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Percentage</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">${gst.percentage || 0}%</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Amount</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                  </tr>
                `}
                <tr style="font-weight: bold; background-color: #f2f2f2;">
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Total GST Amount</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                </tr>
              </table>
            ` : ''}

            <div class="footer" style="text-align: center; margin-top: 20px;">
              <p class="tamil-text">${thirukkural}</p>
              <p>Thank you for choosing NJT Jewellery!</p>
            </div>
          </body>
        </html>
      `;
    } else if (suspense) {
      return `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 2mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
              h2 { margin-top: 8px; font-size: 11px; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 2px 1px; text-align: center; font-size: 8px; word-wrap: break-word; overflow: hidden; }
              th { background-color: #f2f2f2; }
              p { margin: 2px 0; font-size: 9px; }
              .total-row { font-weight: bold; background-color: #e0e0e0; }
            </style>
          </head>
          <body>
            <h1>SUSPENSE BILL</h1>
            <div>
              <p><strong>Name:</strong> ${customer.name}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
              <p><strong>GST No:</strong> ${customer.gstin || 'N/A'}</p>
              <p><strong>Date:</strong> ${customer.date}</p>
              <p><strong>Gold Rate:</strong> â‚¹${suspense.goldRate}</p>
            </div>

            <h2>ISSUE ITEMS:</h2>
            <table>
              <tr>
                <th>Item Name</th>
                <th>Weight (g)</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Pure (g)</th>
                <th>Amount</th>
              </tr>
              ${suspense.issueItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.weight.toFixed(3)}</td>
                  <td>${item.count}</td>
                  <td>${item.rate}</td>
                  <td>${item.pure.toFixed(3)}</td>
                  <td>${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">Total Issue</td>
                <td>${suspense.totalIssuePure.toFixed(3)}</td>
                <td>â‚¹${suspense.totalIssueAmount.toFixed(2)}</td>
              </tr>
            </table>

            <h2>RECEIPT ITEMS:</h2>
            <table>
              <tr>
                <th>Item Name</th>
                <th>Weight (g)</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Pure (g)</th>
                <th>Amount</th>
              </tr>
              ${suspense.receiptItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.weight.toFixed(3)}</td>
                  <td>${item.count}</td>
                  <td>${item.rate}</td>
                  <td>${item.pure.toFixed(3)}</td>
                  <td>${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">Total Receipt</td>
                <td>${suspense.totalReceiptPure.toFixed(3)}</td>
                <td>â‚¹${suspense.totalReceiptAmount.toFixed(2)}</td>
              </tr>
            </table>

            <h2>SUMMARY:</h2>
            <table>
              <tr>
                 <th>Description</th>
                 <th>Pure Gold (g)</th>
                 <th>Amount (â‚¹)</th>
              </tr>
              <tr>
                <td>Net Balance</td>
                <td style="color: ${suspense.netPure >= 0 ? 'red' : 'green'}">${suspense.netPure.toFixed(3)}</td>
                <td>â‚¹${suspense.netAmount.toFixed(2)}</td>
              </tr>
            </table>

            ${gst && (gst.enabled || parseFloat(gst.amount || 0) > 0) ? `
              <h2 style="margin-bottom: 5px;">GST BREAKDOWN:</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                ${parseFloat(gst.igst || 0) > 0 ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">IGST (${gst.igst}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount}</td>
                  </tr>
                ` : (parseFloat(gst.sgst || 0) > 0 || parseFloat(gst.cgst || 0) > 0) ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">SGST (${gst.sgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">CGST (${gst.cgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Percentage</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">${gst.percentage || 0}%</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Amount</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                  </tr>
                `}
                <tr style="font-weight: bold; background-color: #f2f2f2;">
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Total GST Amount</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                </tr>
              </table>
            ` : ''}
          </body>
        </html >
    `;
    } else if (isB2C) {
      return `
    <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 2mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
              h2 { margin-top: 8px; font-size: 11px; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 2px 1px; text-align: center; font-size: 7px; word-wrap: break-word; overflow: hidden; }
              th { background-color: #f2f2f2; }
              p { margin: 2px 0; font-size: 9px; }
            </style>
          </head>
          <body>
            <h1>BILL</h1>
            <div>
              <p><strong>Bill No:</strong> ${currentBillNo || 'N/A'}</p>
              <p><strong>Name:</strong> ${customer.name}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
              <p><strong>GST No:</strong> ${customer.gstin || 'N/A'}</p>
              <p><strong>Type:</strong> ${customer.type}</p>
              <p><strong>Date:</strong> ${customer.date}</p>
              <p><strong>Balance:</strong> ${customer.balance}</p>
              <p><strong>Advance:</strong> ${customer.advanceBalance || 0}</p>
            </div>
            <h2>ITEMS:</h2>
            <table>
              <tr>
                <th>Item</th>
                <th>Weight</th>
                <th>Touch</th>
                <th>W/M</th>
                <th>Rate</th>
                <th>Total</th>
                <th>GST</th>
                <th>Final</th>
              </tr>
              ${normalizedB2CItems.length > 0 ? normalizedB2CItems.map(item => `
                <tr>
                  <td>${item.displayItemName || item.itemName}</td>
                  <td>${item.weight}</td>
                  <td>${item.touch}</td>
                  <td>${item.wastage}</td>
                  <td>${item.rate}</td>
                  <td>${item.total}</td>
                  <td>${item.gst}</td>
                  <td>${item.final}</td>
                </tr>
              `).join('') : '<tr><td colspan="8">No items</td></tr>'}
            </table>

    ${normalizedB2CReceiptItems.length > 0 ? `
              <h2>RECEIPT / OLD GOLD:</h2>
              <table>
                <tr>
                  <th>Item</th>
                  <th>Weight</th>
                  <th>Sub</th>
                  <th>Net Wt</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
                ${normalizedB2CReceiptItems.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.weight}</td>
                    <td>${item.sub}</td>
                    <td>${item.netWeight}</td>
                    <td>${item.rate}</td>
                    <td>${item.amount}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="5" style="text-align: right; font-weight: bold;">Total Old Gold Amount:</td>
                  <td style="font-weight: bold;">â‚¹${totalB2COldGoldAmount.toFixed(2)}</td>
                </tr>
              </table>
            ` : ''
        }
            <h2>CASH RECEIVED:</h2>
            <table>
              <tr>
                <th>Rupees</th>
                <th>FT Rate</th>
                <th>Pure</th>
              </tr>
              ${safeCashTable && safeCashTable.length > 0
          ? safeCashTable.map(c => `
                  <tr>
                    <td>${c.rupees}</td>
                    <td>${c.goldRate}</td>
                    <td>${c.pure}</td>
                  </tr>
                `).join('')
          : '<tr><td colspan="3">No cash entries</td></tr>'
        }
              <tr>
                <td colspan="2" style="text-align: right; font-weight: bold;">Total Cash Pure:</td>
                <td style="font-weight: bold;">${safeCashTable.reduce((sum, c) => sum + toNum(c?.pure, 0), 0).toFixed(3)}</td>
              </tr>
            </table>
            <h2>TOTAL:</h2>
            <p><strong>Total Amount:</strong> ${displayB2CTotalAmount.toFixed(2)}</p>
            <p><strong>Old Balance:</strong> ${effectiveB2COldBalance.toFixed(3)}</p>
            <p><strong>Advance Balance:</strong> ${effectiveB2CAdvanceBalance.toFixed(3)}</p>
            ${displayConvertedGoldValue > 0 ? `<p><strong>Converted Gold:</strong> ${displayConvertedGoldValue.toFixed(3)} g</p>` : ''}
            ${gst && (gst.enabled || parseFloat(gst.amount || 0) > 0) ? `
              <h2 style="margin-bottom: 5px;">GST BREAKDOWN:</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                ${parseFloat(gst.igst || 0) > 0 ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">IGST (${gst.igst}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount}</td>
                  </tr>
                ` : (parseFloat(gst.sgst || 0) > 0 || parseFloat(gst.cgst || 0) > 0) ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">SGST (${gst.sgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">CGST (${gst.cgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount || 0) / 2).toFixed(2)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Percentage</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">${gst.percentage || 0}%</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Amount</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                  </tr>
                `}
                <tr style="font-weight: bold; background-color: #f2f2f2;">
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Total GST Amount</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                </tr>
              </table>
            ` : ''}

            ${cashAmount ? `<p><strong>Cash Amount:</strong> â‚¹${cashAmount}</p>` : ''}
            ${upiAmount && parseFloat(upiAmount) > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <div>
                  <h2>UPI Payment</h2>
                  <p>Amount: â‚¹${upiAmount}</p>
                  <p>Please scan the QR code for payment.</p>
                </div>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent("NTJ Jewellery")}&am=${upiAmount}&cu=INR`)}" style="width:200px;height:200px;" />
              </div>
            ` : ''
        }
  <div style="text-align: center; margin-top: 20px;">
  <p class="tamil-text" style="font-weight: bold; font-style: italic; margin-top: 10px;">${thirukkural}</p>
    <p>Thank you for your visit. Please visit again.</p>
  </div>
          </body>
        </html>
    `;
    } else {
      return `
    <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 2mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
              h2 { margin-top: 8px; font-size: 11px; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 2px 1px; text-align: center; font-size: 8px; word-wrap: break-word; overflow: hidden; }
              th { background-color: #f2f2f2; }
              p { margin: 2px 0; font-size: 9px; }
            </style>
          </head>
          <body>
            <h1>BILL</h1>
            <div>
              <p><strong>Bill No:</strong> ${currentBillNo || 'N/A'}</p>
              <p><strong>Name:</strong> ${customer.name}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
              <p><strong>GST No:</strong> ${customer.gstin || 'N/A'}</p>
              <p><strong>Type:</strong> ${customer.type}</p>
              <p><strong>Date:</strong> ${customer.date}</p>
              <p><strong>Old Balance:</strong> ${customer.oldBalance}</p>
              <p><strong>Advance Balance:</strong> ${customer.advanceBalance || 0}</p>
            </div>
            ${isDealerPreview && dealerProofImageShowInBill && dealerProofImageUri ? `
              <div style="text-align:center; margin: 8px 0;">
                <p><strong>Receipt Proof:</strong></p>
                <img src="${dealerProofImageUri}" style="width:100%; max-height:160px; object-fit:cover; border:1px solid #ddd; border-radius:6px;" />
              </div>
            ` : ""}
            <h2>ISSUE:</h2>
            <table>
              <tr>
                <th>Name</th>
                <th>G.Weight</th>
                ${showIssueMColumn ? '<th>M</th>' : ''}
                ${showIssueNetWeightColumn ? '<th>N.Weight</th>' : ''}
                <th>Calc</th>
                <th>Pure</th>
              </tr>
                ${issueItems.map(row => `
                  <tr>
                    <td>${row.name}</td>
                    <td>${row.gross}</td>
                    ${showIssueMColumn ? `<td>${row.m}</td>` : ''}
                    ${showIssueNetWeightColumn ? `<td>${row.net}</td>` : ''}
                    <td>${parseFloat(row.calc || 0).toFixed(2)}</td>
                    <td><strong>${row.pure}</strong></td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td style="text-align: right; padding-right: 5px;">Totals:</td>
                  <td>TW: ${totalIssueTW}</td>
                  ${showIssueMColumn ? '<td>-</td>' : ''}
                  ${showIssueNetWeightColumn ? `<td>N.W: ${totalIssueNW}</td>` : ''}
                  <td>-</td>
                  <td><strong>Pure: ${totalIssuePure}</strong></td>
                </tr>
              </table>
            <h2>RECEIPT:</h2>
            <table>
              <tr>
                <th>Name</th>
                <th>Weight</th>
                <th>Result</th>
                <th>Calc</th>
                <th>Pure</th>
              </tr>
                ${receiptItems && receiptItems.length > 0 ? receiptItems.map(row => `
                  <tr>
                    <td>${row.name}</td>
                    <td>${row.weight}</td>
                    <td>${row.result}</td>
                    <td>${parseFloat(row.calc || 0).toFixed(2)}</td>
                    <td>${row.pure}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5">No receipt items</td></tr>'}
                ${receiptItems && receiptItems.length > 0 ? `
                <tr class="total-row">
                  <td style="text-align: right; padding-right: 5px;">Totals:</td>
                  <td>TW: ${totalReceiptTW}</td>
                  <td>N.W: ${totalReceiptNW}</td>
                  <td>-</td>
                  <td><Strong>Pure: ${totalReceiptPure}</Strong></td>
                </tr>` : ''}
              </table>
            <h2>CASH:</h2>
            <p>${cashTable && cashTable.length > 0
          ? cashTable.map(c => `${c.rupees} / ${c.goldRate} â†’ ${c.pure}`).join('<br/>')
          : 'N/A'
        }</p>
            ${gst && (gst.enabled || (parseFloat(gst.amount) > 0)) ? `
              <h2 style="margin-bottom: 5px;">GST BREAKDOWN:</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                ${parseFloat(gst.igst || 0) > 0 ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">IGST (${gst.igst}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount}</td>
                  </tr>
                ` : (parseFloat(gst.sgst || 0) > 0 || parseFloat(gst.cgst || 0) > 0) ? `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">SGST (${gst.sgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount) / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">CGST (${gst.cgst || 0}%)</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${(parseFloat(gst.amount) / 2).toFixed(2)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Percentage</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">${gst.percentage || 0}%</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 4px; border: 1px solid black;">GST Amount</td>
                    <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                  </tr>
                `}
                <tr style="font-weight: bold; background-color: #f2f2f2;">
                  <td style="text-align: left; padding: 4px; border: 1px solid black;">Total GST Amount</td>
                  <td style="text-align: right; padding: 4px; border: 1px solid black;">â‚¹${gst.amount || '0.00'}</td>
                </tr>
              </table>
            ` : ''}

            <h2>SUMMARY:</h2>
            <table>
              ${summaryOB !== 0 ? `
                <!-- OB exists: Show Old Balance | ISSUE | RECEIPT | CASH | Old Balance -->
                <tr>
                  <th>Old Balance</th>
                  <th>ISSUE</th>
                  <th>GST (g)</th>
                  <th>RECEIPT</th>
                  <th>CASH</th>
                  <th>Old Balance</th>
                </tr>
                <tr>
                  <td>${summaryOB.toFixed(3)}</td>
                  <td>${displaySummary.issue}</td>
                  <td>${displaySummary.gstPure}</td>
                  <td>${displaySummary.receipt}</td>
                  <td>${displaySummary.cash}</td>
                  <td>${displaySummary.current}</td>
                </tr>
                <tr>
                  <td>${(summaryOB + toNum(displaySummary.issue) + toNum(displaySummary.gstPure)).toFixed(3)}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>${displaySummary.receiptPlusCash}</td>
                  <td>=</td>
                  <td><strong>${toNum(displaySummary.current).toFixed(3)}</strong></td>
                </tr>
              ` : `
                <!-- AB exists: Show ISSUE | Advance Balance | RECEIPT | CASH | Advance Balance -->
                <tr>
                  <th>ISSUE</th>
                  <th>GST (g)</th>
                  <th>Advance Balance</th>
                  <th>RECEIPT</th>
                  <th>CASH</th>
                  <th>Advance Balance</th>
                </tr>
                <tr>
                  <td>${displaySummary.issue}</td>
                  <td>${displaySummary.gstPure}</td>
                  <td>${summaryAB.toFixed(3)}</td>
                  <td>${displaySummary.receipt}</td>
                  <td>${displaySummary.cash}</td>
                  <td>${(summaryAB + toNum(displaySummary.receipt) + toNum(displaySummary.cash) - (toNum(displaySummary.issue) + toNum(displaySummary.gstPure))).toFixed(3)}</td>
                </tr>
                <tr>
                  <td colspan="4" style="text-align: right; padding-right: 10px;">${summaryAB.toFixed(3)} + ${displaySummary.receipt} + ${displaySummary.cash} - (${displaySummary.issue} + ${displaySummary.gstPure})</td>
                  <td>=</td>
                  <td><strong>${(summaryAB + toNum(displaySummary.receipt) + toNum(displaySummary.cash) - (toNum(displaySummary.issue) + toNum(displaySummary.gstPure))).toFixed(3)}</strong></td>
                </tr>
              `}
            </table>
            ${cashAmount ? `<p><strong>Cash Amount:</strong> â‚¹${cashAmount}</p>` : ''}
          </body>
        </html>
    `;
    }
  }


  const getCustomerPhone = () => {
    return (
      order?.phone ||
      customer?.phone ||
      customer?.phoneNumber ||
      customer?.mobileNumber ||
      customer?.mobile ||
      customer?.customerNumber ||
      customer?.customerPhone ||
      ""
    );
  };

  const getCustomerIdForLookup = () =>
    customer?.id ||
    customer?._id ||
    customer?.customerId ||
    transactions?.[0]?.customerId ||
    "";

  const currentBillNo = formatMainBillNo(
    customer?.billNo ||
    transactions?.[0]?.billNo ||
    customer?.invoiceNo ||
    transactions?.[0]?.invoiceNo
  );
  const previewTx = transactions?.[0] || {};
  const previewType = String(
    customer?.type || customer?.customerType || previewTx?.dealerType || previewTx?.customerType || ""
  ).toUpperCase();
  const isDealerPreview = previewType === "DEALER" || previewType === "SUPPLIER";
  const resolveFirstValidImageUri = (candidates = []) => {
    for (const candidate of candidates) {
      const uri = normalizeImageUri(candidate, base_url);
      if (uri) return uri;
    }
    return "";
  };
  const dealerProofImageShowInBill =
    previewTx?.receiptImageShowInBill ??
    customer?.receiptImageShowInBill ??
    true;
  const dealerProofImageUri = resolveFirstValidImageUri([
    previewTx?.receiptImage,
    previewTx?.proofImage,
    previewTx?.image,
    customer?.receiptImage,
    customer?.proofImage,
    customer?.image,
  ]);

  const normalizePhoneWithCountryCode = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
    return digits;
  };

  const generateBillPdf = async () => {
    const html = generateHTML();
    const tryPrint = async (payload, useFixedPage = true) => {
      if (useFixedPage) {
        return Print.printToFileAsync({
          html: payload,
          width: 204,
          height: 842,
        });
      }
      return Print.printToFileAsync({ html: payload });
    };

    try {
      const { uri } = await tryPrint(html, true);
      return uri;
    } catch (firstErr) {
      console.warn("printToFileAsync failed with fixed page size, retrying default size.", firstErr);
      try {
        const { uri } = await tryPrint(html, false);
        return uri;
      } catch (secondErr) {
        console.warn("printToFileAsync failed with full HTML, retrying without images.", secondErr);
        // Some devices fail writing PDF when very large/unsupported images are embedded.
        const htmlWithoutImages = String(html).replace(/<img\b[^>]*>/gi, "");
        try {
          const { uri } = await tryPrint(htmlWithoutImages, false);
          return uri;
        } catch (thirdErr) {
          const finalErr = new Error(
            "Failed to generate PDF. Please try again or reduce heavy bill content/images."
          );
          finalErr.cause = thirdErr;
          throw finalErr;
        }
      }
    }
  };

  const prepareBillPdf = async ({ force = false } = {}) => {
    if (!force && preparedPdfUriRef.current) return preparedPdfUriRef.current;
    const uri = await generateBillPdf();
    preparedPdfUriRef.current = uri;
    return uri;
  };

  const openWhatsAppChat = async (waPhone) => {
    const appUrl = `whatsapp://send?phone=${waPhone}`;
    const webUrl = `https://wa.me/${waPhone}`;

    const canOpenApp = await Linking.canOpenURL(appUrl);
    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return true;
    }

    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return true;
    }

    return false;
  };

  const fetchRegisteredCustomerPhone = async () => {
    const customerId = getCustomerIdForLookup();
    if (!customerId) return "";

    const rawType = String(customer?.type || customer?.customerType || "").toUpperCase();
    const endpoint = rawType === "B2C"
      ? `${base_url}/customersB2C/${customerId}`
      : rawType === "DEALER" || rawType === "SUPPLIER"
        ? `${base_url}/customersDealer/${customerId}`
        : `${base_url}/customers/${customerId}`;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) return "";
      const data = await res.json();
      return (
        data?.phoneNumber ||
        data?.phone ||
        data?.mobileNumber ||
        data?.mobile ||
        data?.customerNumber ||
        ""
      );
    } catch {
      return "";
    }
  };

	  const resolveCustomerWhatsAppPhone = async () => {
	    const registeredPhone = await fetchRegisteredCustomerPhone();
	    return normalizePhoneWithCountryCode(registeredPhone || getCustomerPhone());
	  };

	  const sharePdfViaDeviceWhatsApp = async ({ waPhone, pdfUri, isAuto = false } = {}) => {
	    const opened = await openWhatsAppChat(waPhone);
	    if (!opened) {
	      throw new Error("WhatsApp is not installed on this device.");
	    }

	    const canShare = await Sharing.isAvailableAsync();
	    if (canShare) {
	      await Sharing.shareAsync(pdfUri, {
	        mimeType: "application/pdf",
	        dialogTitle: "Send Bill on WhatsApp",
	        UTI: "com.adobe.pdf",
	      });
	    } else if (!isAuto) {
	      throw new Error("File sharing is not available on this device.");
	    }
	  };

	  const sendBillPdfViaWhatsAppCloudApi = async ({ waPhone, pdfUri } = {}) => {
	    const billNoHint =
	      currentBillNo ||
	      formatMainBillNo(order?.orderNo) ||
	      formatMainBillNo(estimate?.estimateNo) ||
	      formatMainBillNo(suspense?.suspenseNo) ||
	      "";
	    const filename = `NTJ_Bill_${billNoHint || Date.now()}.pdf`;
	    const caption = billNoHint ? `Bill No: ${billNoHint}` : "NTJ Bill";

	    const form = new FormData();
	    form.append("phone", waPhone);
	    form.append("filename", filename);
	    form.append("caption", caption);
	    form.append("pdf", {
	      uri: pdfUri,
	      name: filename,
	      type: "application/pdf",
	    });

	    const response = await fetch(`${base_url}/whatsapp/send-bill-pdf`, {
	      method: "POST",
	      body: form,
	    });

	    const text = await response.text();
	    let json = null;
	    try {
	      json = text ? JSON.parse(text) : null;
	    } catch (_e) {}

	    if (!response.ok) {
	      const message =
	        json?.message ||
	        (typeof json?.error === "string" ? json.error : "") ||
	        text ||
	        "Failed to send bill via WhatsApp.";
	      const err = new Error(message);
	      err.status = response.status;
	      err.payload = json || text;
	      throw err;
	    }

	    return json || { ok: true };
	  };

	  const shareBillToCustomerWhatsApp = async ({ isAuto = false } = {}) => {
	    if (isSharingRef.current) return;

	    try {
	      isSharingRef.current = true;
	      setIsSharing(true);

	      const waPhone = await resolveCustomerWhatsAppPhone();
	      if (!waPhone) {
	        throw new Error("Customer mobile number is missing or invalid.");
	      }

	      const pdfUri = await prepareBillPdf();
	      await sharePdfViaDeviceWhatsApp({ waPhone, pdfUri, isAuto });
	    } catch (error) {
	      if (!isAuto || !(error?.message || "").toLowerCase().includes("cancel")) {
	        Alert.alert("Error", error?.message || "Failed to share bill on WhatsApp.");
	      }
	      console.error("WhatsApp share error:", error);
    } finally {
      setIsSharing(false);
      isSharingRef.current = false;
    }
  };

  useEffect(() => {
    preparedPdfUriRef.current = "";
    const timer = setTimeout(() => {
      prepareBillPdf().catch(() => { });
    }, 250);
    return () => clearTimeout(timer);
  }, [customer?.billNo, customer?.invoiceNo, order?.orderNo, suspense?.netAmount, estimate?.totalAmount, safeIssueItems.length, safeReceiptItems.length]);

  useEffect(() => {
    const shouldAutoShare = Boolean(route.params?.customer?.autoShare || route.params?.autoShare);
    const isBillReady = Boolean(customer?.billNo || customer?.invoiceNo || order || suspense || estimate);
    if (!shouldAutoShare || hasAutoSharedRef.current || !isBillReady) return;

    hasAutoSharedRef.current = true;
    const timer = setTimeout(() => {
      shareBillToCustomerWhatsApp({ isAuto: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [route.params?.customer?.autoShare, route.params?.autoShare, customer?.billNo, customer?.invoiceNo, order, suspense, estimate]);

  const handleDownload = async () => {
    try {
      const uri = await prepareBillPdf();
      setIsPrinting(false);
      Alert.alert('Download Successful', `PDF saved to: ${uri} `);
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Error', 'Failed to download PDF');
      console.error(error);
    }
  };

	  const handleShare = async () => {
	    await shareBillToCustomerWhatsApp({ isAuto: false });
	  };

  const handleTransferToB2B = () => {
    if (estimate) {
      navigation.navigate("B2BCalculationPage", {
        previewData: {
          itemName: estimate.itemName,
          weight: estimate.weight,
          touch: estimate.wastagePercent,
          ftRate: estimate.goldRate,
          items: estimate.items // Pass if it's a multi-item estimate
        }
      });
    }
  };

  const handleTransferToB2C = () => {
    if (estimate) {
      navigation.navigate("B2CCalculationPage", {
        estimate: {
          itemName: estimate.itemName,
          weight: estimate.weight,
          wastagePercent: estimate.wastagePercent,
          goldRate: estimate.goldRate,
          items: estimate.items // Pass if it's a multi-item estimate
        }
      });
      return;
    }

    navigation.navigate("B2CCalculationPage", {
      printAgain: true,
      lastBill: route.params,
    });
  };

	  const openDirectWhatsApp = async () => {
	    if (isSharingRef.current) return;

	    try {
	      isSharingRef.current = true;
	      setIsSharing(true);

	      const waPhone = await resolveCustomerWhatsAppPhone();
	      if (!waPhone) {
	        throw new Error("Customer mobile number is missing or invalid.");
	      }

	      const pdfUri = await prepareBillPdf();
	      try {
	        await sendBillPdfViaWhatsAppCloudApi({ waPhone, pdfUri });
	        Alert.alert("Success", "Bill sent to customer's WhatsApp.");
		      } catch (directError) {
		        const status = directError?.status;
		        const directMessage = directError?.message || "Direct WhatsApp send failed.";

		        // 501: backend not configured; 404/405: backend not deployed with this route yet
		        if (status === 501 || status === 404 || status === 405) {
		          await sharePdfViaDeviceWhatsApp({ waPhone, pdfUri, isAuto: false });
		          return;
		        }

	        throw new Error(directMessage);
	      }
	    } catch (error) {
	      Alert.alert("Error", error?.message || "Failed to send bill on WhatsApp.");
	      console.error("Direct WhatsApp send error:", error);
	    } finally {
	      setIsSharing(false);
	      isSharingRef.current = false;
	    }
	  };

	  async function handleWhatsAppShare() {
	    await shareBillToCustomerWhatsApp({ isAuto: false });
	  }

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const html = generateHTML();
      await Print.printAsync({
        html,
        width: 204,
        height: 842,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to process bill');
      console.error("General bill processing error:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintQR = async () => {
    try {
      setIsPrinting(true);
      if (qrRef.current) {
        qrRef.current.toDataURL(async (dataURL) => {
          const html = `
    < html >
              <head>
                <style>
                  @page { margin: 0; }
                  body { font-family: Arial, sans-serif; width: 72mm; margin: 0 auto; padding: 2mm; text-align: center; font-size: 10px; }
                  h1 { margin-bottom: 10px; font-size: 14px; }
                  img { max-width: 60mm; height: auto; }
                </style>
              </head>
              <body>
                <h1>UPI QR Code</h1>
                <p>Amount: â‚¹${upiAmount}</p>
                <img src="${dataURL}" alt="UPI QR Code" />
              </body>
            </html >
    `;
          await Print.printAsync({
            html,
            width: 204,
            height: 842,
          });
          setIsPrinting(false);
        });
      } else {
        setIsPrinting(false);
        Alert.alert('Error', 'QR Code not available');
      }
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Error', 'Failed to print QR Code');
      console.error(error);
    }
  };

  const handleConvertToGold = () => {
    if (!isB2C) return;

    const upi = Math.max(0, toNum(upiAmount, 0));
    if (upi <= 0) {
      Alert.alert("Invalid UPI Amount", "UPI Amount must be greater than 0 to convert.");
      return;
    }

    if (currentB2CGoldRate <= 0) {
      Alert.alert("Invalid Gold Rate", "Current gold rate is invalid for conversion.");
      return;
    }

    const convertedGold = upi / currentB2CGoldRate;
    const baseOB = toNum(displayB2COldBalance, 0);
    const baseAB = toNum(displayB2CAdvanceBalance, 0);

    let updatedOB = baseOB;
    let updatedAB = baseAB;

    if (baseAB > 0) {
      if (convertedGold <= baseAB) {
        updatedAB = baseAB - convertedGold;
      } else {
        updatedAB = 0;
        updatedOB = baseOB + (convertedGold - baseAB);
      }
    } else {
      updatedOB = baseOB + convertedGold;
    }

    setB2cConversion({
      applied: true,
      goldWeight: convertedGold,
      updatedOB,
      updatedAB,
    });
    Alert.alert("Converted", `UPI â‚¹${upi.toFixed(2)} = ${convertedGold.toFixed(3)}g`);
  };

  const handleSaveBill = async () => {
    try {
      const billType = String(customer?.type || customer?.customerType || "B2B").toUpperCase() === "B2C" ? "B2C" : "B2B";
      const isB2BBill = billType === "B2B";
      const isB2CBill = billType === "B2C";
      const customerId =
        customer?.id ||
        customer?._id ||
        customer?.customerId ||
        transactions?.[0]?.customerId ||
        "";

      if (!customerId) {
        Alert.alert("Error", "Customer ID is missing. Please select a valid customer and try again.");
        return;
      }

      const billNo = formatMainBillNo(
        customer?.billNo ||
        transactions?.[0]?.billNo ||
        customer?.invoiceNo ||
        transactions?.[0]?.invoiceNo
      );

      const b2cItems = normalizedB2CItems;
      const b2cIssueRows = b2cItems.map((it) => {
        const weight = toNum(it?.weight, 0);
        const touch = toNum(it?.touch, 0);
        const wastage = toNum(it?.wastage, 0);
        const rate = toNum(it?.rate, 0);
        const total = toNum(it?.total, 0);
        const gstValue = toNum(it?.gst, 0);
        const finalValue = toNum(it?.final, total);
        const pure = toNum(it?.pure, (weight * touch) / 100);
        const displayName = it?.displayItemName || it?.itemName || "";
        return {
          name: displayName,
          itemName: it?.itemName || displayName,
          displayItemName: displayName,
          weight,
          touch,
          wastage,
          rate,
          total,
          gst: gstValue,
          final: finalValue,
          gross: weight.toFixed(3),
          m: wastage.toFixed(3),
          net: weight.toFixed(3),
          calc: touch.toFixed(3),
          pure: pure.toFixed(3),
        };
      });
      const b2cReceiptRows = normalizedB2CReceiptItems.map((it) => ({
        name: it?.name || "",
        weight: toNum(it?.weight, 0).toFixed(3),
        sub: toNum(it?.sub, 0).toFixed(3),
        netWeight: toNum(it?.netWeight, toNum(it?.result, toNum(it?.pure, 0))).toFixed(3),
        rate: toNum(it?.rate, 0).toFixed(2),
        amount: toNum(it?.amount, 0).toFixed(2),
        // compatibility
        result: toNum(it?.netWeight, toNum(it?.result, toNum(it?.pure, 0))).toFixed(3),
        calc: toNum(it?.calc, 0).toFixed(3),
        pure: toNum(it?.netWeight, toNum(it?.result, toNum(it?.pure, 0))).toFixed(3),
      }));
      const issueRowsToSave = isB2BBill ? safeIssueItems : b2cIssueRows;
      const receiptRowsToSave = isB2BBill ? safeReceiptItems : b2cReceiptRows;
      const totalIssueWeightToSave = isB2BBill
        ? toNum(summary?.issue, toNum(totalIssuePure, 0))
        : b2cIssueRows.reduce((sum, row) => sum + toNum(row?.pure, 0), 0);
      const totalReceiptWeightToSave = isB2BBill
        ? toNum(summary?.receipt, toNum(totalReceiptPure, 0))
        : b2cReceiptRows.reduce((sum, row) => sum + toNum(row?.netWeight, 0), 0);
      const oldBalanceForSave = isB2CBill
        ? effectiveB2COldBalance
        : toNum(customer?.oldBalance, summaryOB);
      const advanceBalanceForSave = isB2CBill
        ? effectiveB2CAdvanceBalance
        : toNum(customer?.advanceBalance, summaryAB);
      const availableBalanceForSave = isB2CBill
        ? toNum(oldBalanceForSave, 0) - toNum(advanceBalanceForSave, 0)
        : toNum(summary?.current, toNum(displaySummary?.current, finalBalance));

      const payload = {
        customerId: String(customerId),
        customerName: customer?.name || customer?.customerName || "Unknown",
        ...(billNo ? { billNo: String(billNo) } : {}),
        billType,
        dealerType: isDealerPreview ? (customer?.type || customer?.customerType || previewTx?.dealerType || "Dealer") : "",
        receiptImage: dealerProofImageUri || null,
        proofImage: dealerProofImageUri || null,
        image: dealerProofImageUri || null,
        issueItems: issueRowsToSave,
        receiptItems: receiptRowsToSave,
        ...(isB2BBill ? {} : { items: b2cItems }),
        totalIssueWeight: totalIssueWeightToSave,
        totalReceiptWeight: totalReceiptWeightToSave,
        cashAmount: toNum(report?.cash, toNum(displaySummary?.cash, toNum(summary?.cash, 0))),
        kadaiAmount: isB2CBill ? Math.max(0, toNum(kadaiAmount, 0)) : 0,
        manualCashAmount: hasManualCashForB2C ? parsedCashAmount.toFixed(2) : "",
        upiAmount: hasManualCashForB2C ? parsedUpiAmount.toFixed(2) : "",
        b2cUpiGoldValue: b2cConversion.applied ? b2cUpiGoldValue.toFixed(3) : "",
        goldRate: toNum(customer?.goldRate, currentB2CGoldRate),
        advanceBalance: advanceBalanceForSave,
        oldBalance: oldBalanceForSave,
        availableBalance: availableBalanceForSave,
        currentBalance: availableBalanceForSave,
        createdAt: new Date().toISOString(),
        cashTable: safeCashTable,
        summary,
        gst,
        ...(!isB2BBill && billNo ? { invoiceNo: String(billNo) } : {}),
        date: customer?.date || new Date().toLocaleDateString(),
      };

      if (isB2CBill && b2cConversion.applied) {
        const customerEndpoint = `${base_url}/customersB2C/${customerId}`;
        const currentRes = await fetch(customerEndpoint);
        const currentData = currentRes.ok ? await currentRes.json() : {};
        const updatedCustomer = {
          ...currentData,
          oldBalance: toNum(oldBalanceForSave, 0).toFixed(3),
          advanceBalance: toNum(advanceBalanceForSave, 0).toFixed(3),
          currentBalance: toNum(availableBalanceForSave, 0).toFixed(3),
          availableBalance: toNum(availableBalanceForSave, 0).toFixed(3),
        };
        const updateRes = await fetch(customerEndpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCustomer),
        });
        if (!updateRes.ok) {
          const err = await updateRes.text();
          throw new Error(err || "Failed to update B2C customer old balance");
        }
      }

      const res = await fetch(`${base_url}/billSummary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to save bill");
      }

      Alert.alert("Success", "Bill saved successfully");
    } catch (error) {
      console.error("Save Bill error:", error);
      Alert.alert("Error", `Failed to save bill: ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: '#fff' }}
    >
      <View style={{ flex: 1 }}>
        {/* FIXED HEADER BAR */}
        {!isPrinting && (
          <View style={styles.buttonContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => {
                if (customer && (customer.customerId || customer.id) && !items) {
                  navigation.navigate("BillHistory", { customer: customer });
                } else {
                  navigation.navigate(order ? "Order" : estimate ? "Estimate" : isB2C ? "B2CCalculationPage" : "B2BCalculationPage" );
                }
              }}>
                <Icon name="arrow-left" size={22} color="#1E88E5" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate("Home")}>
                <Icon name="home" size={22} color="#1E88E5" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.headerBtn} onPress={handlePrint}>
                <Icon name="printer" size={22} color="#1E88E5" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.actionIcon, isSharing && { opacity: 0.5 }]}
                onPress={openDirectWhatsApp}
                disabled={isSharing}
              >
                <Icon name="whatsapp" size={24} color="#25D366" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIcon, isSharing && { opacity: 0.5 }]}
                onPress={handleWhatsAppShare}
                disabled={isSharing}
              >
                <Icon name="share-variant" size={24} color="#1E88E5" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIcon, isSharing && { opacity: 0.5 }]}
                onPress={handleDownload}
                disabled={isSharing}
              >
                <Icon name="download" size={24} color="#1E88E5" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          style={styles.page}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          bounces={true}
        >
          {/* TRANSFER BUTTONS FOR ESTIMATE */}
          {estimate && (
            <View style={styles.transferContainer}>
              <TouchableOpacity style={styles.transferBtnB2B} onPress={handleTransferToB2B}>
                <Icon name="swap-horizontal" size={20} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.transferBtnText}>Transfer to B2B</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.transferBtnB2C} onPress={handleTransferToB2C}>
                <Icon name="swap-horizontal" size={20} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.transferBtnText}>Transfer to B2C</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.headerBox}>
            <Text style={styles.billTitle}>{estimate ? 'ESTIMATE BILL' : suspense ? 'SUSPENSE BILL' : order ? 'ORDER RECEIPT' : 'BILL'}</Text>

            <View style={styles.headerRow}>
              <View>
                {!estimate && !suspense && !order && <Text>Bill No : {currentBillNo || 'N/A'}</Text>}
                {order && <Text>Order No : {order.orderNo}</Text>}
                <Text>Name : {estimate ? (estimate.itemName || "Estimate Customer") : order ? order.customer : customer.name}</Text>
                {!estimate && <Text>Phone : {order ? order.phone : (customer.phone || customer.phoneNumber || customer.customerNumber || 'N/A')}</Text>}
                <Text>Address : {customer?.address || 'N/A'}</Text>
                <Text>GST No : {customer?.gstin || 'N/A'}</Text>
              </View>

              <View>
                <Text>Type : {estimate ? 'Estimate' : order ? 'Order' : customer.type}</Text>
                <Text>Date : {estimate ? new Date().toLocaleDateString() : order ? order.date : customer.date}</Text>
                {estimate ? (
                  <Text>OD : N/A</Text>
                ) : (
                  <>
                    {customer.oldBalance && parseFloat(customer.oldBalance) !== 0 ? (
                      <Text>Old Balance : {customer.oldBalance}</Text>
                    ) : null}
                    {customer.advanceBalance && parseFloat(customer.advanceBalance) !== 0 ? (
                      <Text>Advance Balance : {customer.advanceBalance}</Text>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          </View>

          {!estimate && !suspense && !order && !isB2C && isDealerPreview && dealerProofImageUri ? (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>RECEIPT PROOF :</Text>
              <Image
                source={{ uri: dealerProofImageUri }}
                style={{ width: "100%", height: 170, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" }}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {estimate ? (
            <>
              {/* ESTIMATE DETAILS */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>ESTIMATE DETAILS :</Text>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, { flex: 2 }]}>Item Name</Text>
                  <Text style={styles.cell}>Wt (g)</Text>
                  <Text style={styles.cell}>W%</Text>
                  <Text style={styles.cell}>Gross Wt</Text>
                  <Text style={styles.cell}>Rate</Text>
                  <Text style={styles.cell}>Net Amt</Text>
                  {estimate.enableGST && <Text style={styles.cell}>GST</Text>}
                  <Text style={styles.cell}>Total</Text>
                </View>

                {/* Multi-item list OR single-item fallback */}
                {estimate.items && estimate.items.length > 0
                  ? estimate.items.map((item, idx) => (
                    <View key={item.id || idx} style={styles.tableRow}>
                      <Text style={[styles.cell, { flex: 2 }]}>{item.itemName}</Text>
                      <Text style={styles.cell}>{item.weight}</Text>
                      <Text style={styles.cell}>{item.wastagePercent}</Text>
                      <Text style={styles.cell}>{item.grossWeight}</Text>
                      <Text style={styles.cell}>{formatIndianNumber(item.goldRate)}</Text>
                      <Text style={styles.cell}>â‚¹{formatIndianNumber(item.netAmount)}</Text>
                      {estimate.enableGST && <Text style={styles.cell}>â‚¹{formatIndianNumber(item.gst)}</Text>}
                      <Text style={[styles.cell, { fontWeight: 'bold' }]}>â‚¹{formatIndianNumber(item.totalAmount)}</Text>
                    </View>
                  ))
                  : (
                    <View style={styles.tableRow}>
                      <Text style={[styles.cell, { flex: 2 }]}>{estimate.itemName}</Text>
                      <Text style={styles.cell}>{estimate.weight}</Text>
                      <Text style={styles.cell}>{estimate.wastagePercent || 0}</Text>
                      <Text style={styles.cell}>{estimate.grossWeight}</Text>
                      <Text style={styles.cell}>{formatIndianNumber(estimate.goldRate)}</Text>
                      <Text style={styles.cell}>â‚¹{formatIndianNumber(estimate.netAmount)}</Text>
                      {estimate.enableGST && <Text style={styles.cell}>â‚¹{formatIndianNumber(estimate.gst || 0)}</Text>}
                      <Text style={[styles.cell, { fontWeight: 'bold' }]}>â‚¹{formatIndianNumber(estimate.totalAmount)}</Text>
                    </View>
                  )
                }
              </View>

              {estimateGSTEnabled && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>GST SUMMARY :</Text>
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2 }]}>Subtotal</Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{"\u20B9"}{estimateSubTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2 }]}>GST Percentage</Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{estimateGstPercent.toFixed(2)}%</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2 }]}>GST Amount</Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{"\u20B9"}{estimateGstAmount.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                    <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Final Total (Incl. GST)</Text>
                    <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>{"\u20B9"}{estimateFinalTotal.toFixed(2)}</Text>
                  </View>
                </View>
              )}
              {/* ESTIMATE GRAND TOTAL */}
              <View style={styles.estimateTotalBox}>
                <Text style={styles.estimateTotalLabel}>TOTAL ESTIMATE AMOUNT</Text>
                <Text style={styles.estimateTotalValue}>
                  {"\u20B9"}{formatIndianNumber(estimateFinalTotal)}
                </Text>
              </View>
            </>
          ) : suspense ? (
            <>
              {/* SUSPENSE DETAILS */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>ISSUE ITEMS :</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, { flex: 2 }]}>Item</Text>
                  <Text style={styles.cell}>Wght</Text>
                  <Text style={styles.cell}>Qty</Text>
                  <Text style={styles.cell}>Rate</Text>
                  <Text style={styles.cell}>Pure</Text>
                  <Text style={styles.cell}>Amt</Text>
                </View>
                {suspense.issueItems.map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
                    <Text style={styles.cell}>{item.weight.toFixed(3)}</Text>
                    <Text style={styles.cell}>{item.count}</Text>
                    <Text style={styles.cell}>{item.rate}</Text>
                    <Text style={styles.cell}>{item.pure.toFixed(3)}</Text>
                    <Text style={styles.cell}>{item.amount.toFixed(2)}</Text>
                  </View>
                ))}
                <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                  <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Total</Text>
                  <Text style={styles.cell}></Text>
                  <Text style={styles.cell}></Text>
                  <Text style={styles.cell}></Text>
                  <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalIssuePure.toFixed(3)}</Text>
                  <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalIssueAmount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>RECEIPT ITEMS :</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, { flex: 2 }]}>Item</Text>
                  <Text style={styles.cell}>Wght</Text>
                  <Text style={styles.cell}>Qty</Text>
                  <Text style={styles.cell}>Rate</Text>
                  <Text style={styles.cell}>Pure</Text>
                  <Text style={styles.cell}>Amt</Text>
                </View>
                {suspense.receiptItems.map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
                    <Text style={styles.cell}>{item.weight.toFixed(3)}</Text>
                    <Text style={styles.cell}>{item.count}</Text>
                    <Text style={styles.cell}>{item.rate}</Text>
                    <Text style={styles.cell}>{item.pure.toFixed(3)}</Text>
                    <Text style={styles.cell}>{item.amount.toFixed(2)}</Text>
                  </View>
                ))}
                <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                  <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Total</Text>
                  <Text style={styles.cell}></Text>
                  <Text style={styles.cell}></Text>
                  <Text style={styles.cell}></Text>
                  <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalReceiptPure.toFixed(3)}</Text>
                  <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalReceiptAmount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.cashBox}>
                <Text style={styles.sectionTitle}>SUMMARY :</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontWeight: 'bold' }}>Net Pure Gold:</Text>
                  <Text style={{ fontWeight: 'bold', color: suspense.netPure >= 0 ? '#D32F2F' : '#2E7D32' }}>{suspense.netPure.toFixed(3)} g</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: 'bold' }}>Net Amount:</Text>
                  <Text style={{ fontWeight: 'bold' }}>â‚¹{suspense.netAmount.toFixed(2)}</Text>
                </View>
              </View>
            </>
          ) : order ? (
            <>
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>ORDER DETAILS :</Text>
                <View style={{ padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Order No: {order.orderNo}</Text>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Item: {order.type}</Text>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Weight: {order.weight} GMS</Text>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Payment: {order.payment}</Text>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Pending Balance: â‚¹{order.balance}</Text>
                  </View>
                  {order.image && (
                    <View style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' }}>
                      <Image
                        source={{ uri: order.image.startsWith('data:') || order.image.startsWith('http') ? order.image : `${base_url}/${order.image}` }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              </View>



              <View style={styles.kuralContainer}>
                <Text style={styles.kuralText}>{thirukkural}</Text>
                <Text style={styles.visitAgainText}>Thank you for choosing NJT Jewellery!</Text>
              </View>
            </>
          ) : isB2C ? (
            <>
              {/* B2C ITEMS */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>ITEMS :</Text>

                <View style={styles.tableHeader}>
                  <Text style={styles.cell}>Item</Text>
                  <Text style={styles.cell}>Weight</Text>
                  <Text style={styles.cell}>Touch</Text>
                  <Text style={styles.cell}>W/M</Text>
                  <Text style={styles.cell}>Rate</Text>
                  <Text style={styles.cell}>Total</Text>
                  <Text style={styles.cell}>GST</Text>
                  <Text style={styles.cell}>Final</Text>
                </View>

                {normalizedB2CItems.length > 0 ? (
                  normalizedB2CItems.map((item, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.cell}>{item.displayItemName || item.itemName}</Text>
                      <Text style={styles.cell}>{item.weight}</Text>
                      <Text style={styles.cell}>{item.touch}</Text>
                      <Text style={styles.cell}>{item.wastage}</Text>
                      <Text style={styles.cell}>{item.rate}</Text>
                      <Text style={styles.cell}>{item.total}</Text>
                      <Text style={styles.cell}>{item.gst}</Text>
                      <Text style={styles.cell}>{item.final}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noData}>No items</Text>
                )}
              </View>

              {/* B2C RECEIPT / OLD GOLD ITEMS */}
              {normalizedB2CReceiptItems.length > 0 && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>RECEIPT / OLD GOLD :</Text>

                  <View style={styles.tableHeader}>
                    <Text style={styles.cell}>Item</Text>
                    <Text style={styles.cell}>Wt</Text>
                    <Text style={styles.cell}>Sub</Text>
                    <Text style={styles.cell}>Net Wt</Text>
                    <Text style={styles.cell}>Rate</Text>
                    <Text style={styles.cell}>Amt</Text>
                  </View>

                  {normalizedB2CReceiptItems.map((item, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.cell}>{item.name}</Text>
                      <Text style={styles.cell}>{item.weight}</Text>
                      <Text style={styles.cell}>{item.sub}</Text>
                      <Text style={styles.cell}>{item.netWeight}</Text>
                      <Text style={styles.cell}>{item.rate}</Text>
                      <Text style={styles.cell}>{item.amount}</Text>
                    </View>
                  ))}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalCell}>Total Old Gold Amount:</Text>
                    <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>
                      â‚¹{totalB2COldGoldAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* B2C CASH RECEIVED */}
              {safeCashTable && safeCashTable.length > 0 && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>CASH RECEIVED :</Text>

                  <View style={styles.tableHeader}>
                    <Text style={styles.cell}>Rupees</Text>
                    <Text style={styles.cell}>FT Rate</Text>
                    <Text style={styles.cell}>Pure</Text>
                  </View>

                  {safeCashTable.map((entry, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.cell}>{entry.rupees}</Text>
                      <Text style={styles.cell}>{entry.goldRate}</Text>
                      <Text style={styles.cell}>{entry.pure}</Text>
                    </View>
                  ))}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalCell}>Total Cash Pure:</Text>
                    <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>
                      {safeCashTable.reduce((sum, c) => sum + toNum(c?.pure, 0), 0).toFixed(3)} g
                    </Text>
                  </View>
                </View>
              )}

              {/* GST */}
              {gst && gst.enabled && (
                <View style={styles.cashBox}>
                  <Text style={styles.sectionTitle}>GST :</Text>
                  <Text>GST Percentage: {gst.percentage}%</Text>
                  <Text>GST Amount: â‚¹{gst.amount}</Text>
                </View>
              )}

              {/* B2C TOTAL */}
              <View style={styles.cashBox}>
                <Text style={styles.sectionTitle}>TOTAL :</Text>
                <Text>Total Amount: {displayB2CTotalAmount.toFixed(2)}</Text>
                <Text>Cash Received Amount: {safeCashTable.reduce((sum, c) => sum + toNum(c?.rupees, 0), 0).toFixed(2)}</Text>
                <Text>Total Cash Pure: {safeCashTable.reduce((sum, c) => sum + toNum(c?.pure, 0), 0).toFixed(3)}</Text>
                <Text>Old Balance: {effectiveB2COldBalance.toFixed(3)}</Text>
                <Text>Advance Balance: {effectiveB2CAdvanceBalance.toFixed(3)}</Text>
                <Text>Current OD: {isB2C ? (Math.max(0, displayB2CTotalAmount - effectiveB2CAdvanceBalance).toFixed(2)) : '0.00'}</Text>
                <Text>Current AB: {isB2C ? (Math.max(0, effectiveB2CAdvanceBalance - displayB2CTotalAmount).toFixed(2)) : '0.00'}</Text>
                {displayConvertedGoldValue > 0 ? <Text>Converted Gold: {displayConvertedGoldValue.toFixed(3)}g</Text> : null}
                {cashAmount ? (
                  <>
                    <Text>Cash Amount: â‚¹{cashAmount}</Text>
                    <Text>UPI Amount: â‚¹{upiAmount}</Text>
                  </>
                ) : null}
              </View>

              {/* CASH INPUT */}
              <View style={styles.row}>
                <Text style={styles.label}>Phone Number</Text>
                <Text style={styles.input}>
                  {customer.phone || customer.phoneNumber || customer.mobileNumber || customer.mobile || 'N/A'}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Kadai Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Kadai Amount"
                  keyboardType="decimal-pad"
                  value={kadaiAmount}
                  onChangeText={setKadaiAmount}
                />
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Cash Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter cash amount"
                  keyboardType="numeric"
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
              </View>

              {/* UPI INPUT */}
              {cashAmount && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>UPI Amount</Text>
                    <View style={styles.upiRow}>
                      <TextInput
                        style={[styles.input, styles.upiInput]}
                        placeholder="Enter UPI amount"
                        keyboardType="numeric"
                        value={upiAmount}
                        editable={false}
                      />
                      <TouchableOpacity style={styles.convertBtn} onPress={handleConvertToGold}>
                        <Text style={styles.convertBtnText}>Convert to Gold</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter Phone Number"
                      keyboardType="phone-pad"
                      value={additionalPhone}
                      onChangeText={setAdditionalPhone}
                    />
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Cash</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter Cash"
                      keyboardType="numeric"
                      value={additionalCash}
                      onChangeText={setAdditionalCash}
                    />
                  </View>
                </>
              )}

              {/* SUBMIT BUTTON */}
              {cashAmount && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => setShowUpi(true)}>
                  <Text style={styles.submitText}>Generate QR Code</Text>
                </TouchableOpacity>
              )}

              {/* QR CODE */}
              {showUpi && upiAmount > 0 && (
                <View style={styles.qrContainer}>
                  <Text style={styles.qrLabel}>UPI QR Code for â‚¹{upiAmount}</Text>
                  <Text style={styles.upiIdText}>UPI ID: {upiId}</Text>
                  <TouchableOpacity style={styles.changeUpiBtn} onPress={() => navigation.navigate('UPIControl')}>
                    <Text style={styles.changeUpiText}>Change UPI ID</Text>
                  </TouchableOpacity>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent("NTJ Jewellery")}&am=${upiAmount}&cu=INR`)}` }}
                    style={{ width: 200, height: 200 }
                    }
                  />
                  < TouchableOpacity style={styles.printQrBtn} onPress={handlePrintQR} >
                    <Text style={styles.printQrText}>Print QR Code</Text>
                  </TouchableOpacity >
                </View >
              )}

              {/* Thirukkural Quote for B2C */}
              <View style={styles.kuralContainer}>
                <Text style={styles.kuralText}>{thirukkural}</Text>
                <Text style={styles.visitAgainText}>Thank you for your visit. Please visit again.</Text>
              </View>
            </>
          ) : (
            <>
              {/* ISSUE */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>ISSUE :</Text>

                <View style={styles.tableHeader}>
                  <Text style={styles.cell}>Name</Text>
                  <Text style={styles.cell}>G.Weight</Text>
                  {showIssueMColumn && <Text style={styles.cell}>M</Text>}
                  {showIssueNetWeightColumn && <Text style={styles.cell}>N.Weight</Text>}
                  <Text style={styles.cell}>Calc</Text>
                  <Text style={styles.cell}>Pure</Text>
                </View>

                {issueItems.map((row, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.cell}>{row.name}</Text>
                    <Text style={styles.cell}>{row.gross}</Text>
                    {showIssueMColumn && <Text style={styles.cell}>{row.m}</Text>}
                    {showIssueNetWeightColumn && <Text style={styles.cell}>{row.net}</Text>}
                    <Text style={styles.cell}>{parseFloat(row.calc || 0).toFixed(2)}</Text>
                    <Text style={styles.cell}>{row.pure}</Text>
                  </View>
                ))}

                {/* ISSUE TOTAL */}
                <View style={[styles.totalRow, { paddingHorizontal: 10, backgroundColor: '#f9f9f9', borderTopWidth: 1 }]}>
                  <Text style={[styles.totalCell, { fontSize: 13, flex: 1, left: 0 }]}>TW: {totalIssueTW}</Text>
                  {showIssueNetWeightColumn && (
                    <Text style={[styles.totalCell, { fontSize: 13, flex: 1, left: 0 }]}>N.W: {totalIssueNW}</Text>
                  )}
                  <Text style={[styles.totalCell, { fontSize: 13, flex: 1.5, textAlign: 'right', left: 0 }]}>Pure: {totalIssuePure}</Text>
                </View>
              </View>

              {/* RECEIPT */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>RECEIPT :</Text>

                <View style={styles.tableHeader}>
                  <Text style={styles.cell}>Name</Text>
                  <Text style={styles.cell}>Weight</Text>
                  <Text style={styles.cell}>Result</Text>
                  <Text style={styles.cell}>Calc</Text>
                  <Text style={styles.cell}>Pure</Text>
                </View>

                {receiptItems && receiptItems.length > 0 ? (
                  receiptItems.map((row, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.cell}>{row.name}</Text>
                      <Text style={styles.cell}>{row.weight}</Text>
                      <Text style={styles.cell}>{row.result}</Text>
                      <Text style={styles.cell}>{parseFloat(row.calc || 0).toFixed(2)}</Text>
                      <Text style={styles.cell}>{row.pure}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noData}>No receipt items</Text>
                )}

                {/* RECEIPT TOTAL */}
                <View style={[styles.totalRow, { paddingHorizontal: 10, backgroundColor: '#f9f9f9', borderTopWidth: 1 }]}>
                  <Text style={[styles.totalCell, { fontSize: 13, flex: 1, left: 0 }]}>TW: {totalReceiptTW}</Text>
                  <Text style={[styles.totalCell, { fontSize: 13, flex: 1, left: 0 }]}>N.W: {totalReceiptNW}</Text>
                  <Text style={[styles.totalCell, { fontSize: 13, flex: 1.5, textAlign: 'right', left: 0 }]}>Pure: {totalReceiptPure}</Text>
                </View>
              </View>

              {/* CASH */}
              <View style={styles.cashBox}>
                <Text style={styles.sectionTitle}>CASH :</Text>
                {cashTable && cashTable.length > 0 ? (
                  <View>
                    <View style={styles.tableHeader}>
                      <Text style={styles.cell}>Amount</Text>
                      <Text style={styles.cell}>Rate</Text>
                      <Text style={styles.cell}>Pure</Text>
                    </View>
                    {cashTable.map((cashEntry, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.cell}>{cashEntry.rupees}</Text>
                        <Text style={styles.cell}>{cashEntry.goldRate}</Text>
                        <Text style={styles.cell}>{cashEntry.pure}</Text>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalCell}>Total Cash Pure:</Text>
                      <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>
                        {cashTable.reduce((sum, c) => sum + parseFloat(c.pure || 0), 0).toFixed(3)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text>N/A</Text>
                )}
              </View>

              {/* GST */}
              {gst && gst.enabled && gst.showInBill !== false && (gst.igst > 0 || gst.cgst > 0 || gst.sgst > 0) && (
                <View style={styles.cashBox}>
                  <Text style={styles.sectionTitle}>GST BREAKDOWN :</Text>

                  {/* Dynamic Display Logic */}
                  {parseFloat(gst.igst) > 0 ? (
                    // IGST Case
                    <View>
                      <Text>IGST {gst.igst}% : â‚¹{gst.amount}</Text>
                    </View>
                  ) : (parseFloat(gst.sgst) > 0 || parseFloat(gst.cgst) > 0) ? (
                    // SGST + CGST Case
                    <View>
                      <Text>SGST {gst.sgst || 0}% : â‚¹{(parseFloat(gst.amount) / 2).toFixed(2)}</Text>
                      <Text>CGST {gst.cgst || 0}% : â‚¹{(parseFloat(gst.amount) / 2).toFixed(2)}</Text>
                    </View>
                  ) : (
                    // Fallback (Legacy or Total only)
                    <View>
                      <Text>GST Percentage: {gst.percentage}%</Text>
                      <Text>GST Amount: â‚¹{gst.amount}</Text>
                    </View>
                  )}

                  {(parseFloat(gst.igst) > 0 || parseFloat(gst.sgst) > 0) && (
                    <Text style={{ marginTop: 4, fontWeight: 'bold' }}>Total GST Amount: â‚¹{gst.amount}</Text>
                  )}
                </View>
              )}

              {/* SUMMARY */}
              <View style={styles.summaryBox}>
                <Text style={styles.sectionTitle}>SUMMARY :</Text>

                {/* Conditional rendering based on OB or AB */}
                {summaryOB !== 0 ? (
                  // OB exists: Show Old Balance | ISSUE | RECEIPT | CASH | [Old Balance or Advance Balance]
                  <>
                    <View style={styles.summaryHeader}>
                      <Text style={styles.sumCell}>Old Balance</Text>
                      <Text style={styles.sumCell}>ISSUE</Text>
                      <Text style={styles.sumCell}>RECEIPT</Text>
                      <Text style={styles.sumCell}>CASH</Text>
                      <Text style={styles.sumCell}>{toNum(displaySummary.current) >= 0 ? "Old Balance" : "Advance Balance"}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.sumCell}>{summaryOB.toFixed(3)}</Text>
                      <Text style={styles.sumCell}>{displaySummary.issue}</Text>
                      <Text style={styles.sumCell}>{displaySummary.receipt}</Text>
                      <Text style={styles.sumCell}>{displaySummary.cash}</Text>
                      <Text style={styles.sumCell}>{toNum(displaySummary.current) >= 0 ? toNum(displaySummary.current).toFixed(3) : Math.abs(toNum(displaySummary.current)).toFixed(3)}</Text>
                    </View>

                    <View style={styles.finalSummaryRow}>
                      <Text style={styles.sumCell}>
                        {(summaryOB + toNum(displaySummary.issue)).toFixed(3)}
                      </Text>
                      <Text style={styles.sumCell}>-</Text>
                      <Text style={styles.sumCell}>{displaySummary.receiptPlusCash}</Text>
                      <Text style={styles.sumCell}>=</Text>
                      <Text style={styles.sumCell}>{toNum(displaySummary.current) >= 0 ? toNum(displaySummary.current).toFixed(3) : Math.abs(toNum(displaySummary.current)).toFixed(3)}</Text>
                    </View>
                  </>
                ) : (
                  // AB exists: Show ISSUE | Advance Balance | RECEIPT | CASH | [Advance Balance or Old Balance]
                  <>
                    <View style={styles.summaryHeader}>
                      <Text style={styles.sumCell}>ISSUE</Text>
                      <Text style={styles.sumCell}>Advance Balance</Text>
                      <Text style={styles.sumCell}>RECEIPT</Text>
                      <Text style={styles.sumCell}>CASH</Text>
                      <Text style={styles.sumCell}>{(summaryAB + toNum(displaySummary.receipt) + toNum(displaySummary.cash) - toNum(displaySummary.issue)) >= 0 ? "Advance Balance" : "Old Balance"}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.sumCell}>{displaySummary.issue}</Text>
                      <Text style={styles.sumCell}>
                        {summaryAB.toFixed(3)}
                      </Text>
                      <Text style={styles.sumCell}>{displaySummary.receipt}</Text>
                      <Text style={styles.sumCell}>{displaySummary.cash}</Text>
                      <Text style={styles.sumCell}>
                        {(() => {
                          const val = summaryAB + toNum(displaySummary.receipt) + toNum(displaySummary.cash) - toNum(displaySummary.issue);
                          return Math.abs(val).toFixed(3);
                        })()}
                      </Text>
                    </View>

                    <View style={styles.finalSummaryRow}>
                      <Text style={[styles.sumCell, { flex: 2.5 }]}>
                        {summaryAB.toFixed(3)} + {displaySummary.receipt} + {displaySummary.cash} - {displaySummary.issue}
                      </Text>
                      <Text style={[styles.sumCell, { flex: 0.5 }]}>=</Text>
                      <Text style={[styles.sumCell, { flex: 1 }]}>
                        {(() => {
                          const val = summaryAB + toNum(displaySummary.receipt) + toNum(displaySummary.cash) - toNum(displaySummary.issue);
                          return Math.abs(val).toFixed(3);
                        })()}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </>
          )}

          {/* B2B / B2C and Print Again Buttons */}
          <View style={styles.transferContainer}>
            {customer?.type === "B2B" ? (
              <TouchableOpacity
                style={styles.transferBtnB2B}
                onPress={() => navigation.navigate("B2BCalculationPage", { printAgain: true, lastBill: route.params })}
              >
                <Icon name="file-document-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.transferBtnText}>B2B</Text>
              </TouchableOpacity>
            ) : customer?.type === "B2C" ? (
              <TouchableOpacity
                style={styles.transferBtnB2C}
                onPress={handleTransferToB2C}
              >
                <Icon name="file-document-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.transferBtnText}>Transfer to B2C</Text>
              </TouchableOpacity>
            ) : customer?.type === "Estimate" ? (
              <>
                <TouchableOpacity
                  style={styles.transferBtnB2B}
                  onPress={handleTransferToB2B}
                >
                  <Icon name="swap-horizontal" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.transferBtnText}>Transfer to B2B</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.transferBtnB2C}
                  onPress={handleTransferToB2C}
                >
                  <Icon name="swap-horizontal" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.transferBtnText}>Transfer to B2C</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.transferBtnB2B, { backgroundColor: '#17a2b8' }]} // Teal for Print Again
              onPress={handlePrint}
            >
              <Icon name="printer" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.transferBtnText}>Print Again</Text>
            </TouchableOpacity>
          </View>
          

          {/* Save Button */}
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveBill}
              activeOpacity={0.8}
            >
              <Icon name="content-save-outline" size={22} color="#fff" />
              <Text style={styles.homeButtonText}>Save Bill</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Home Button */}
          <View style={styles.homeButtonWrapper}>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Icon name="home-outline" size={22} color="#fff" />
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 10, backgroundColor: "#fff", flex: 1, alignSelf: 'center', width: '100%', maxWidth: 350 },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 25,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 10,
  },

  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    top: 15,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    top: 15,
  },

  actionIcon: {
    padding: 8,
  },

  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 10, borderRadius: 5 },

  buttonText: { color: '#fff', marginLeft: 5, fontWeight: 'bold' },

  billTitle: { textAlign: "center", fontWeight: "bold", marginBottom: 5, fontSize: 14, textTransform: 'uppercase' },

  headerBox: { padding: 5, marginBottom: 8, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000' },

  headerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },

  sectionBox: { marginBottom: 8 },

  sectionTitle: { marginVertical: 4, fontWeight: "bold", fontSize: 11, alignSelf: 'flex-start', borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000' },

  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#000' },

  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: '#000' },

  cell: { flex: 1, textAlign: "center", paddingVertical: 4, paddingHorizontal: 1, fontSize: 8 },

  cashBox: { padding: 5, marginBottom: 8, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000' },

  summaryBox: { padding: 5, marginBottom: 8, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#000' },

  finalSummaryRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: '#000', justifyContent: 'center' },

  summaryHeader: { flexDirection: "row", borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#000' },

  summaryRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: '#000' },

  sumCell: { flex: 1, textAlign: "center", padding: 4, paddingHorizontal: 1, fontWeight: "bold", fontSize: 9 },

  totalRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: '#000', justifyContent: "space-between" },

  totalCell: { paddingVertical: 4, fontSize: 13, fontWeight: 'bold', left: 5, top: 2 },

  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  kadaiInputWrap: {
    marginTop: 4,
    marginBottom: 2,
  },
  kadaiLabel: {
    fontSize: 12,
    marginBottom: 3,
  },
  kadaiInput: {
    minWidth: 150,
    maxWidth: 200,
    height: 34,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  upiInput: {
    flex: 1,
  },
  convertBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  convertBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  toggleBtn: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  toggleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  submitBtn: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
    bottom: 10,
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  upiIdText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  changeUpiBtn: {
    backgroundColor: "#ffc107",
    padding: 6,
    borderRadius: 4,
    marginBottom: 10,
  },
  changeUpiText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "bold",
  },
  printQrBtn: {
    backgroundColor: "#17a2b8",
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  printQrText: {
    color: "#fff",
    fontWeight: "bold",
  },
  kuralContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginBottom: 20,
  },
  visitAgainText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  kuralText: {
    fontSize: 14,
    color: "#1B4D1B",
    fontWeight: "bold",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
    fontFamily: tamilFontFamily,
  },
  estimateTotalBox: {
    backgroundColor: '#1b5e20',
    borderRadius: 10,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateTotalLabel: {
    color: '#c8e6c9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  estimateTotalValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  homeButtonWrapper: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B4D1B',
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0056b3', // Premium Blue
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  transferContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    gap: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  transferBtnB2B: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e3d59',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  transferBtnB2C: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#135F25',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  transferBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});




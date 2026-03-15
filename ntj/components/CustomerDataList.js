import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";
import { buildReminderAlerts, loadReminderSettings } from "./reminderService";

import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import CommonHeader from "./CommonHeader";

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
    const trimmed = value.trim();
    if (isInvalidImageToken(trimmed)) return "";
    // Some rows store image payload as JSON string: {"uri":"..."} / {"image":"..."}
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const nested = readImageField(parsed);
        if (nested) return nested;
      } catch (_) {
        // keep raw string fallback
      }
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
    value.image,
    value.proofImage,
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
  if (uri.startsWith("\"") && uri.endsWith("\"")) {
    try {
      uri = JSON.parse(uri);
    } catch (_) {}
  }

  // Some payloads arrive URL-encoded.
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

  // plain/base64url payload without data prefix
  if (/^[A-Za-z0-9+/_=\r\n-]+$/.test(compact) && compact.length > 100) {
    return `data:image/jpeg;base64,${compact}`;
  }

  const cleanBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const cleanPath = uri.replace(/^\/+/, "");
  return cleanBaseUrl ? `${cleanBaseUrl}/${cleanPath}` : uri;
};

const pickFirstImageFromList = (rows) => {
  if (!Array.isArray(rows)) return "";
  for (const row of rows) {
    const img =
      readImageField(row?.receiptImage) ||
      readImageField(row?.proofImage) ||
      readImageField(row?.image);
    if (img) return img;
  }
  return "";
};

const getRowImageRaw = (row) =>
  readImageField(row?.latestTransactionImage) ||
  readImageField(row?.receiptImage) ||
  readImageField(row?.proofImage) ||
  readImageField(row?.image) ||
  readImageField(row?.customer?.receiptImage) ||
  readImageField(row?.customer?.proofImage) ||
  readImageField(row?.customer?.image) ||
  readImageField(row?.transaction?.receiptImage) ||
  readImageField(row?.transaction?.proofImage) ||
  readImageField(row?.transaction?.image) ||
  readImageField(row?.latestTransaction?.receiptImage) ||
  readImageField(row?.latestTransaction?.proofImage) ||
  readImageField(row?.latestTransaction?.image) ||
  pickFirstImageFromList(row?.transactions) ||
  pickFirstImageFromList(row?.txs) ||
  pickFirstImageFromList(row?.items) ||
  "";

  const CustomerCard = ({
    item,
    handleViewBill,
    handlePhonePress,
    handleWhatsApp,
    handleEdit,
    handleDelete,
    isOverdue,
  }) => {
  const opacityValue = useRef(new Animated.Value(1)).current;
  const isDealerCard = String(item.customerType || "").toUpperCase() === "DEALER";

  const oldBalance = Number(item.oldBalance || 0);
  const advanceBalance = Number(item.advanceBalance || 0);
  const updatedAt = item.updatedAt;

  const getBalanceInfo = () => {
    if (advanceBalance > 0) return { color: "#2E7D32", blinking: false }; // Green for Advance
    if (oldBalance > 0) {
      if (!updatedAt) return { color: "#000", blinking: false };
      const lastDate = new Date(updatedAt);
      const now = new Date();
      const diffTime = Math.abs(now - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) return { color: "#2196F3", blinking: false }; // Blue (1st day)
      if (diffDays === 2) return { color: "#000000", blinking: false }; // Black (2nd day)
      if (diffDays === 3 || diffDays === 4)
        return { color: "#F44336", blinking: false }; // Red (3rd/4th day)
      if (diffDays >= 5) return { color: "#F44336", blinking: true }; // Red + Blinking (5th day+)
    }
    return { color: "#000", blinking: false };
  };

  const { color: valueColor, blinking } = getBalanceInfo();

  useEffect(() => {
    let animation;
    if (blinking) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else {
      opacityValue.stopAnimation();
      opacityValue.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [blinking]);

  const customerId = item.customerId || item.id;
  const phoneNumber = item.customerNumber || item.phone || "";
  const imageUri = "";

  // 🔍 Debug: show imageUri for dealer card
  if (isDealerCard) {
    console.log(`📷 CustomerCard "${item.customerName || item.name}" imageUri length: ${imageUri?.length || 0} | item.image: ${item.image?.length || 0} | item.receiptImage: ${item.receiptImage?.length || 0}`);
  }

  if (isDealerCard) {
    return (
      <>
        <View style={styles.customerDataCard} >
          <TouchableOpacity
            style={styles.customerDataCardTouchable}
            onPress={() => handleViewBill(item)}
          >
            <View style={styles.customerDataCardHeader}>
              <Text style={styles.customerDataName}>{item.customerName || item.name}</Text>
              <View style={styles.customerDataIconRow}>
                <TouchableOpacity onPress={() => handlePhonePress(phoneNumber)}>
                  <Icon name="phone" size={22} color="#000000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleWhatsApp(phoneNumber)}>
                  <Icon name="whatsapp" size={22} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Icon name="pencil" size={22} color="#2D89EF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Icon name="delete" size={22} color="#E53935" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.customerDataBottomRow}>
              <View style={styles.customerDataBalanceArea}>
                <Text style={styles.customerDataSub}>Phone: {phoneNumber || "-"}</Text>
                <Text style={styles.customerDataSub}>ID: {customerId}</Text>
                
                {/* Last Bill Subsection */}
                {item.lastBillNo ? (
                  <View style={styles.lastBillDetailBox}>
                    <Text style={styles.lastBillLabel}>
                      Last Bill: <Text style={styles.lastBillValue}>{item.lastBillNo}</Text>
                    </Text>
                    <Text style={styles.lastBillLabel}>
                      Amt: <Text style={styles.lastBillValue}>₹{Number(item.lastBillAmount || 0).toFixed(2)}</Text>
                      {item.lastBillWeight > 0 && (
                        <> | Wt: <Text style={styles.lastBillValue}>{Number(item.lastBillWeight).toFixed(3)}g</Text></>
                      )}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.customerDataBalanceRow}>
                  <View>
                    <Text style={styles.customerDataBalanceTitle}>Old Balance</Text>
                    <Animated.Text
                      style={[
                        styles.customerDataBalanceValue,
                        { color: valueColor, opacity: blinking ? opacityValue : 1 },
                      ]}
                    >
                      {parseFloat(oldBalance).toFixed(3)}
                    </Animated.Text>
                  </View>

                  <View style={styles.customerDataLine} />

                  <View>
                    <Text style={styles.customerDataBalanceTitle}>Advance Bal</Text>
                    <Animated.Text
                      style={[
                        styles.customerDataBalanceValue,
                        { color: advanceBalance > 0 ? "#2E7D32" : "#FF6F00" },
                      ]}
                    >
                      {parseFloat(advanceBalance).toFixed(3)}
                    </Animated.Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.lastPaidText}>
              Last Activity: {new Date(item.updatedAt).toLocaleDateString()}{" "}
              {new Date(item.updatedAt).toLocaleTimeString()}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => handleViewBill(item)}
      >
        <View style={styles.cardHeader}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
            />
          ) : (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.customerType}</Text>
            </View>
          )}

          <Text style={[styles.name, isOverdue && styles.overdueName]}>
            {item.customerName || item.name}
          </Text>

          <View style={styles.iconRow}>
            <TouchableOpacity
              onPress={() => handlePhonePress(item.customerNumber || item.phone)}
            >
              <Icon name="phone" size={22} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleWhatsApp(item.customerNumber || item.phone)}
            >
              <Icon name="whatsapp" size={22} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <Icon name="pencil" size={22} color="#2D89EF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Icon name="delete" size={22} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sub}>ID: {customerId}</Text>
        <Text style={styles.sub}>{item.shopName || item.company}</Text>

        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceTitle}>Old Balance</Text>
            <Animated.Text
              style={[
                styles.balanceValue,
                { color: valueColor, opacity: blinking ? opacityValue : 1 },
              ]}
            >
              {parseFloat(oldBalance).toFixed(3)}
            </Animated.Text>
          </View>

          <View style={styles.line} />

          <View>
            <Text style={styles.balanceTitle}>Advance Bal</Text>
            <Animated.Text
              style={[
                styles.balanceValue,
                {
                  color: advanceBalance > 0 ? "#2E7D32" : "#FF6F00",
                },
              ]}
            >
              {parseFloat(advanceBalance).toFixed(3)}
            </Animated.Text>
          </View>
        </View>

        {/* Last Bill Section */}
        {item.lastBillNo ? (
          <View style={styles.lastBillSectionB2B}>
            <View style={styles.lastBillRowB2B}>
               <Icon name="file-document-outline" size={14} color="#666" />
               <Text style={styles.lastBillTextB2B}>Bill: {item.lastBillNo}</Text>
               <Text style={styles.lastBillTextB2B}> • </Text>
               <Text style={styles.lastBillTextB2B}>Amt: ₹{Number(item.lastBillAmount || 0).toFixed(2)}</Text>
            </View>
            {item.lastBillWeight > 0 && (
              <Text style={styles.lastBillWeightB2B}>Pure/Weight: {Number(item.lastBillWeight).toFixed(3)}g</Text>
            )}
          </View>
        ) : null}

        <Text style={styles.lastPaidText}>
          Last Activity: {new Date(item.updatedAt).toLocaleDateString()}{" "}
          {new Date(item.updatedAt).toLocaleTimeString()}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CustomerMasterList({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [reminderCount, setReminderCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, []),
  );

  const fetchCustomers = async () => {
    try {
      const toArray = (value) => {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== "object") return [];
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.rows)) return value.rows;
        if (Array.isArray(value.results)) return value.results;
        if (Array.isArray(value.transactions)) return value.transactions;
        if (Array.isArray(value.bills)) return value.bills;
        return [];
      };
      const toTs = (value) => {
        if (!value) return 0;
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        const raw = String(value).trim();
        if (!raw) return 0;
        const direct = new Date(raw).getTime();
        if (Number.isFinite(direct)) return direct;
        const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(.*))?$/);
        if (m) {
          const dd = m[1].padStart(2, "0");
          const mm = m[2].padStart(2, "0");
          const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
          const hhmmss = (m[4] || "00:00:00").trim();
          const parsed = new Date(`${yyyy}-${mm}-${dd}T${hhmmss}`).getTime();
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };
      const normalizeId = (value) => {
        if (value === null || value === undefined) return "";
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
      const isValidEntityId = (value) => {
        const v = String(value || "").trim().toLowerCase();
        return !!v && v !== "n/a" && v !== "na" && v !== "null" && v !== "undefined";
      };
      const isDealerLikeRow = (row) => {
        const dealerType = String(row?.dealerType || "").toUpperCase();
        const customerType = String(row?.customerType || "").toUpperCase();
        const type = String(row?.type || "").toUpperCase();
        return (
          dealerType === "DEALER" ||
          dealerType === "SUPPLIER" ||
          customerType === "DEALER" ||
          customerType === "SUPPLIER" ||
          type === "DEALER" ||
          type === "SUPPLIER"
        );
      };

      const [b2bResponse, b2cResponse, dealerResponse, txResponse, billResponse, reminderSettings] = await Promise.all([
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/customersB2C`),
        fetch(`${base_url}/customersDealer`),
        fetch(`${base_url}/transactions`),
        fetch(`${base_url}/billSummary`),
        loadReminderSettings(),
      ]);
      const b2bData = b2bResponse.ok ? await b2bResponse.json() : [];
      const b2cData = b2cResponse.ok ? await b2cResponse.json() : [];
      const dealerData = dealerResponse.ok ? await dealerResponse.json() : [];
      const txPayload = txResponse.ok ? await txResponse.json() : [];
      const billPayload = billResponse.ok ? await billResponse.json() : [];
      const txData = toArray(txPayload);
      const billData = toArray(billPayload);
      const allTxRows = txData
        .map((row) => ({ ...row, __source: "tx" }))
        .sort(
          (a, b) =>
            toTs(b.updatedAt || b.createdAt || b.date || 0) -
            toTs(a.updatedAt || a.createdAt || a.date || 0),
        );
      const allBillRows = billData
        .map((row) => ({ ...row, __source: "bill" }))
        .sort(
          (a, b) =>
            toTs(b.updatedAt || b.createdAt || b.date || 0) -
            toTs(a.updatedAt || a.createdAt || a.date || 0),
        );
      const getLatestDealerSnapshot = (dealer) => {
        const dealerIds = new Set(
          [dealer.customerId, dealer._id, dealer.id].map((v) => normalizeId(v)).filter(Boolean),
        );
        const dealerName = normalizeName(dealer.customerName || dealer.name || "");
        const dealerPhone = normalizePhone(
          dealer.customerNumber || dealer.phoneNumber || dealer.phone || "",
        );
        const allRows = [...allTxRows, ...allBillRows].sort(
          (a, b) =>
            toTs(b.updatedAt || b.createdAt || b.date || 0) -
            toTs(a.updatedAt || a.createdAt || a.date || 0),
        );
        const parseMaybeNumber = (v) => {
          if (v === null || v === undefined) return NaN;
          const raw = String(v).trim();
          if (!raw) return NaN;
          const n = Number(raw);
          return Number.isFinite(n) ? n : NaN;
        };
        const pickFirstNumber = (...vals) => {
          for (const v of vals) {
            const n = parseMaybeNumber(v);
            if (Number.isFinite(n)) return n;
          }
          return NaN;
        };
        const hasAnyBalance = (row) =>
          Number.isFinite(parseMaybeNumber(row?.oldBalance)) ||
          Number.isFinite(parseMaybeNumber(row?.ob)) ||
          Number.isFinite(parseMaybeNumber(row?.advanceBalance)) ||
          Number.isFinite(parseMaybeNumber(row?.advBal));
        const hasNonZeroBalance = (row) => {
          const ob = pickFirstNumber(row?.oldBalance, row?.ob);
          const ab = pickFirstNumber(row?.advanceBalance, row?.advBal);
          return (Number.isFinite(ob) && Math.abs(ob) > 0) || (Number.isFinite(ab) && Math.abs(ab) > 0);
        };
        const rowBelongsToDealer = (row) => {
          const rowIds = [
            normalizeId(row.customerId),
            normalizeId(row.customer?._id),
            normalizeId(row.customer?.id),
            normalizeId(row.customer?.customerId),
          ].filter(Boolean);
          const rowName = normalizeName(row.customerName || row.name || "");
          const rowPhone = normalizePhone(
            row.phone ||
            row.phoneNumber ||
            row.customerNumber ||
            row.customer?.phone ||
            row.customer?.phoneNumber ||
            row.customer?.customerNumber ||
            "",
          );

          const idMatch = rowIds.some((id) => dealerIds.has(id));
          const nameMatch = dealerName && rowName && dealerName === rowName;
          const phoneMatch = dealerPhone && rowPhone && dealerPhone === rowPhone;
          // Prefer strict identity match for dealer resolution.
          if (dealerIds.size > 0) {
            const rowHasValidId = rowIds.some((id) => isValidEntityId(id));
            if (rowHasValidId) return idMatch;
            return phoneMatch || nameMatch || idMatch;
          }
          if (dealerPhone) return phoneMatch || idMatch;
          return nameMatch || phoneMatch || idMatch;
        };
        const matchedRows = allRows.filter((row) => rowBelongsToDealer(row));
        const matchedBalanceRows = matchedRows.filter((row) => isDealerLikeRow(row));
        const balanceRows = matchedBalanceRows.length > 0 ? matchedBalanceRows : matchedRows;
        if (matchedRows.length === 0) {
          return {
            oldBalance: Number(dealer.oldBalance || 0),
            advanceBalance: Number(dealer.advanceBalance || 0),
            updatedAt: dealer.updatedAt || dealer.createdAt || new Date().toISOString(),
          };
        }
        const billBalanceRow =
          balanceRows.find((row) => row.__source === "bill" && hasNonZeroBalance(row)) ||
          balanceRows.find((row) => row.__source === "bill" && hasAnyBalance(row));
        const latestBalanceRow =
          billBalanceRow ||
          balanceRows.find((row) => hasNonZeroBalance(row)) ||
          balanceRows.find((row) => hasAnyBalance(row)) ||
          balanceRows[0] ||
          matchedRows[0];
        const resolvedOB = pickFirstNumber(
          latestBalanceRow.oldBalance,
          latestBalanceRow.ob,
          dealer.oldBalance,
          0,
        );
        const resolvedAB = pickFirstNumber(
          latestBalanceRow.advanceBalance,
          latestBalanceRow.advBal,
          dealer.advanceBalance,
          0,
        );
        return {
          oldBalance: Number.isFinite(resolvedOB) ? resolvedOB : 0,
          advanceBalance: Number.isFinite(resolvedAB) ? resolvedAB : 0,
          updatedAt:
            latestBalanceRow.updatedAt ||
            latestBalanceRow.createdAt ||
            latestBalanceRow.date ||
            dealer.updatedAt ||
            dealer.createdAt ||
            new Date().toISOString(),
        };
      };

      const enrichWithLatestBill = (customer) => {
        const ids = new Set(
          [customer.customerId, customer._id, customer.id].map((v) => normalizeId(v)).filter(Boolean),
        );
        const name = normalizeName(customer.customerName || customer.name || "");
        
        // allBillRows is already sorted descending by date/createdAt
        const latestBill = allBillRows.find((bill) => {
          const billCustId = normalizeId(bill.customerId);
          const billCustName = normalizeName(bill.customerName);
          return ids.has(billCustId) || (name && billCustName === name);
        });

        if (!latestBill) return customer;

        const billNo = latestBill.billNo || latestBill.invoiceNo || "";
        const billAmount = latestBill.gst?.finalAmount || latestBill.gst?.amount || latestBill.totalAmount || latestBill.cashAmount || 0;
        const billWeight = latestBill.totalIssueWeight || latestBill.issuePure || 0;

        return {
          ...customer,
          lastBillNo: billNo || customer.lastBillNo,
          lastBillAmount: Number.isFinite(billAmount) && billAmount > 0 ? billAmount : customer.lastBillAmount,
          lastBillWeight: Number.isFinite(billWeight) && billWeight > 0 ? billWeight : customer.lastBillWeight,
          lastBillDate: latestBill.createdAt || latestBill.date || customer.lastBillDate,
        };
      };

      const b2bCustomers = b2bData.map((customer) => enrichWithLatestBill({
        ...customer,
        customerType: "B2B",
        customerNumber: customer.phoneNumber,
        shopName: customer.shopName || customer.companyName || "No Shop Name",
        oldBalance: customer.oldBalance || "0.000",
        advanceBalance: customer.advanceBalance || "0.000",
        billCurrentBalance: customer.billCurrentBalance || "0.000",
        updatedAt: customer.updatedAt || new Date().toISOString(),
      }));

      const b2cCustomers = b2cData.map((customer) => enrichWithLatestBill({
        ...customer,
        customerType: "B2C",
        customerNumber: customer.phoneNumber,
        shopName: "No Shop Name",
        oldBalance: customer.oldBalance || "0.000",
        advanceBalance: customer.advanceBalance || "0.000",
        updatedAt: customer.updatedAt || new Date().toISOString(),
      }));

      const supplierCustomers = dealerData.map((dealer) => {
        const latestSnapshot = getLatestDealerSnapshot(dealer);
        const dealerOB = Number(dealer?.oldBalance);
        const dealerAB = Number(dealer?.advanceBalance);
        const snapOB = Number(latestSnapshot?.oldBalance);
        const snapAB = Number(latestSnapshot?.advanceBalance);
        const dealerTs = toTs(dealer?.updatedAt || dealer?.createdAt || 0);
        const snapTs = toTs(latestSnapshot?.updatedAt || 0);
        const snapshotHasBalance =
          (Number.isFinite(snapOB) && Math.abs(snapOB) >= 0) ||
          (Number.isFinite(snapAB) && Math.abs(snapAB) >= 0);
        const preferSnapshot = snapTs >= dealerTs && snapshotHasBalance;
        const resolvedOldBalance = preferSnapshot
          ? (Number.isFinite(snapOB) ? snapOB : (Number.isFinite(dealerOB) ? dealerOB : 0))
          : (Number.isFinite(dealerOB) ? dealerOB : (Number.isFinite(snapOB) ? snapOB : 0));
        const resolvedAdvanceBalance = preferSnapshot
          ? (Number.isFinite(snapAB) ? snapAB : (Number.isFinite(dealerAB) ? dealerAB : 0))
          : (Number.isFinite(dealerAB) ? dealerAB : (Number.isFinite(snapAB) ? snapAB : 0));

        return enrichWithLatestBill({
          ...dealer,
          id: dealer._id || dealer.id || dealer.customerId,
          customerId: dealer.customerId || dealer._id || dealer.id,
          customerType: dealer.customerType || "Dealer",
          customerName: dealer.customerName,
          customerNumber: dealer.customerNumber || dealer.phoneNumber,
          shopName: dealer.shopName || "No Shop Name",
          oldBalance: resolvedOldBalance.toFixed(3),
          advanceBalance: resolvedAdvanceBalance.toFixed(3),
          updatedAt: latestSnapshot.updatedAt || dealer.updatedAt || new Date().toISOString(),
        });
      });

      const allCustomers = [...b2bCustomers, ...b2cCustomers, ...supplierCustomers];
      const reminders = buildReminderAlerts({
        customers: allCustomers,
        transactions: Array.isArray(txData) ? txData : [],
        settings: reminderSettings,
      });
      const reminderMap = new Map(reminders.map((r) => [String(r.customerId || r.customerName), r]));
      const decoratedCustomers = allCustomers.map((customer) => {
        const key = String(customer.customerId || customer.id || customer._id || customer.customerName || customer.name);
        const reminder = reminderMap.get(key);
        return {
          ...customer,
          isOverdueReminder: Boolean(reminder),
          reminder,
        };
      });
      setReminderCount(reminders.length);
      setCustomers(decoratedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const filteredData = customers.filter((item) => {
    const custName = (item.customerName || item.name || "").toLowerCase();
    const matchesSearch = custName.includes(search.toLowerCase());

    const matchesType =
      filter === "ALL" ||
      item.customerType === filter ||
      (filter === "Supplier" && (item.customerType === "Dealer" || item.customerType === "Supplier"));

    return matchesSearch && matchesType;
  });

  const handleEdit = (customer) => {
    navigation.navigate("EditCustomerMaster", { customer });
  };

  const handleDelete = async (customer) => {
    Alert.alert("Delete Customer", `Delete ${customer.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            let endpoint = "";
            if (customer.customerType === "B2B") endpoint = "/customers";
            else if (customer.customerType === "B2C") endpoint = "/customersB2C";
            else if (customer.customerType === "Supplier" || customer.customerType === "Dealer") endpoint = "/customersDealer";

            const response = await fetch(
              `${base_url}${endpoint}/${customer.customerId || customer.id || customer._id}`,
              {
                method: "DELETE",
              },
            );

            if (response.ok) {
              setCustomers(
                customers.filter(
                  (c) =>
                    (c.customerId || c.id) !==
                    (customer.customerId || customer.id),
                ),
              );
              Alert.alert("Success", "Customer deleted successfully");
            } else {
              Alert.alert("Error", "Failed to delete customer");
            }
          } catch (error) {
            console.error("Error deleting customer:", error);
            Alert.alert("Error", "Failed to delete customer");
          }
        },
      },
    ]);
  };

  const handlePhonePress = (phone) => {
    if (!phone) {
      Alert.alert("Error", "Phone number not available");
      return;
    }

    // Clean the phone number: remove spaces, dashes, and other non-numeric characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const url = `tel:${cleanPhone}`;

    Linking.openURL(url).catch((err) => {
      console.error("Error opening dialer:", err);
      Alert.alert("Error", "Unable to open dialer");
    });
  };

  const handleWhatsApp = (phone) => {
    if (!phone) {
      Alert.alert("Error", "WhatsApp number not available");
      return;
    }

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // Add country code if it's just a 10-digit number
    let finalPhone = cleanPhone;
    if (finalPhone.length === 10) {
      finalPhone = "+91" + finalPhone;
    }

    Linking.openURL(`whatsapp://send?phone=${finalPhone}`).catch(() => {
      Alert.alert("Error", "Make sure WhatsApp is installed on your device");
    });
  };

  const handleAdd = () => {
    navigation.navigate("CreateCustomerMaster", { customers });
  };

  const handleViewBill = (customer) => {
    // Dealer/Supplier SD bills are now viewed through the same Bill History flow.
    navigation.navigate("BillHistory", { customer });
  };

  const renderItem = ({ item }) => {
    return (
      <CustomerCard
        item={item}
        handleViewBill={handleViewBill}
        handlePhonePress={handlePhonePress}
        handleWhatsApp={handleWhatsApp}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        isOverdue={Boolean(item.isOverdueReminder)}
      />
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <CommonHeader
        title="Customer Data List"
        subtitle={`Total Customers: ${filteredData.length}`}
        onBack={() => navigation.goBack()}
        backgroundColor="#1B4D1B"
        insideSafeArea
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminNotifications")}
            style={styles.notificationBtn}
          >
            <Icon name="bell-outline" size={24} color="#fff" />
            {reminderCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{reminderCount > 99 ? "99+" : reminderCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      >
        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#888" />
          <TextInput
            placeholder="Search Customer..."
            style={styles.search}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </CommonHeader>

      {/* COLOR LEGEND */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
          <Text style={styles.legendText}>1st Day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#000000" }]} />
          <Text style={styles.legendText}>2nd Day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F44336" }]} />
          <Text style={styles.legendText}>3rd Day+</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2E7D32" }]} />
          <Text style={styles.legendText}>Advance</Text>
        </View>
      </View>

      {/* FILTER BUTTONS */}
      <View style={styles.filterRow}>
        {["ALL", "B2B", "B2C", "Supplier"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterBtn, filter === item && styles.filterActive]}
          >
            <Text
              style={[styles.filterText, filter === item && { color: "#fff" }]}
            >
              {item === "Supplier" ? "Dealers" : item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
      />

      {/* FLOATING ADD BUTTON */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F6" },

  header: {
    backgroundColor: "#1B4D1B",
    paddingTop: Platform.OS === "ios" ? 65 : 25,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  headerRow: { flexDirection: "row", alignItems: "center" },

  fileTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  totalText: { color: "#FFD54F", fontSize: 14, marginTop: 4 },

  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  search: { marginLeft: 10, flex: 1 },

  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 10,
    paddingHorizontal: 10,
  },

  filterBtn: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  filterActive: { backgroundColor: "#2E7D32" },

  filterText: { fontWeight: "bold", color: "#333" },

  card: {
    backgroundColor: "#fff",
    margin: 10,
    borderRadius: 15,
    padding: 15,
  },
  customerDataCard: {
    backgroundColor: "#fff",
    margin: 10,
    borderRadius: 15,
    padding: 12,
  },
  customerDataCardTouchable: {
    flex: 1,
  },
  customerDataCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerDataName: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  customerDataIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerDataBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
  },
  customerDataBalanceArea: {
    flex: 1,
    paddingRight: 12,
  },
  customerDataSub: {
    color: "#666",
    marginTop: 4,
  },
  customerDataBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  customerDataBalanceTitle: {
    color: "#000",
    fontSize: 14,
  },
  customerDataBalanceValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  customerDataLine: {
    width: 1,
    height: 40,
    backgroundColor: "#ddd",
    marginHorizontal: 14,
  },
  customerDataRightImageWrap: {
    width: 100,
    height: 100,
    alignItems: "flex-end",
  },
  customerDataRightImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  customerDataRightImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },

  cardHeader: { flexDirection: "row", alignItems: "center" },

  tag: {
    backgroundColor: "#222",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { color: "#fff", fontSize: 12 },

  name: { fontSize: 16, fontWeight: "bold", flex: 1, marginLeft: 10 },
  overdueName: { color: "#D32F2F" },

  iconRow: { flexDirection: "row", gap: 10 },

  sub: { color: "#666", marginTop: 4 },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  balanceTitle: { color: "#000", fontSize: 14 },
  balanceValue: { fontSize: 16, fontWeight: "bold" },
  lastPaidText: {
    fontSize: 11,
    color: "#e87911ff",
    marginTop: 8,
    fontStyle: "italic",
    textAlign: "right",
  },

  line: { width: 1, backgroundColor: "#ddd" },

  addBtn: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2E7D32",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  cardTouchable: {
    flex: 1,
  },

  paymentSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopColor: "#eee",
  },

  paymentInput: {
    backgroundColor: "#F1F3F6",
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },

  paymentBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  paymentBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 10,
    borderRadius: 15,
    elevation: 2,
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  notificationBtn: {
    padding: 4,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#E53935",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  dealerImagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  dealerImagePreviewImage: {
    width: "100%",
    height: "100%",
  },
  dealerImagePreviewCloseBtn: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Last Bill Styles ──
  lastBillDetailBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#2E7D32",
  },
  lastBillLabel: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  lastBillValue: {
    fontWeight: "bold",
    color: "#333",
  },
  lastBillSectionB2B: {
    marginTop: 10,
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  lastBillRowB2B: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastBillTextB2B: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
    marginLeft: 4,
  },
  lastBillWeightB2B: {
    fontSize: 11,
    color: "#777",
    marginTop: 2,
    marginLeft: 18,
  },
});

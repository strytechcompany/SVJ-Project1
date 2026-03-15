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
            

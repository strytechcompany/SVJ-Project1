import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
  Animated,
  Image,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";
import { buildReminderAlerts, loadReminderSettings } from "./reminderService";
import {
  deriveBalanceStateFromNet,
  normalizeBalanceState,
} from "./balanceUtils";

import { useFocusEffect } from "@react-navigation/native";
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

const getSafeCustomerName = (value) => {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return normalized || "";
};

const extractCustomerDisplayName = (row = {}) =>
  getSafeCustomerName(row?.displayName) ||
  getSafeCustomerName(row?.customerName) ||
  getSafeCustomerName(row?.customer_name) ||
  getSafeCustomerName(row?.partyName) ||
  getSafeCustomerName(row?.party_name) ||
  getSafeCustomerName(row?.userName) ||
  getSafeCustomerName(row?.user_name) ||
  getSafeCustomerName(row?.fullName) ||
  getSafeCustomerName(row?.full_name) ||
  getSafeCustomerName(row?.selectedCustomer) ||
  getSafeCustomerName(row?.selectedDealer) ||
  getSafeCustomerName(row?.name) ||
  getSafeCustomerName(row?.customer?.name) ||
  getSafeCustomerName(row?.customer?.customerName) ||
  getSafeCustomerName(row?.customer?.customer_name) ||
  getSafeCustomerName(row?.customer?.fullName) ||
  getSafeCustomerName(row?.customer?.full_name) ||
  getSafeCustomerName(row?.dealer?.name) ||
  getSafeCustomerName(row?.dealer?.customerName) ||
  getSafeCustomerName(row?.dealer?.customer_name) ||
  "Unknown";

const getDisplayNameWithOthers = (row = {}) => {
  const baseName = extractCustomerDisplayName(row);
  if (!baseName) return baseName;
  if (baseName.includes("(Others)")) return baseName;
  const shop = String(
    row?.shopName || row?.companyName || row?.company || row?.customer?.shopName || ""
  )
    .trim()
    .toLowerCase();
  const hasActivity =
    Boolean(row?.lastBillNo || row?.lastBillDate) ||
    Number(row?.__latestVisibleActivityTs || 0) > 0;
  return shop === "others" && hasActivity ? `${baseName} (Others)` : baseName;
};

const CustomerCard = memo(({
    item,
    handleViewBill,
    handlePhonePress,
    handleWhatsApp,
    handleEdit,
    handleDelete,
    isOverdue,
    handleImageClick,
  }) => {
  const opacityValue = useRef(new Animated.Value(1)).current;
  const isDealerCard = ["DEALER", "SUPPLIER"].includes(String(item.customerType || "").toUpperCase());

  const oldBalance = Number(item.oldBalance || 0);
  const advanceBalance = Number(item.advanceBalance || 0);
  const updatedAt = item.__latestVisibleActivityTs || item.updatedAt;

  const balanceInfo = useMemo(() => {
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
  }, [advanceBalance, oldBalance, updatedAt]);

  const { color: valueColor, blinking } = balanceInfo;

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
  const imageUri = useMemo(() => normalizeImageUri(getRowImageRaw(item)), [item]);

  if (isDealerCard) {
    return (
      <>
        <View style={styles.customerDataCard} >
          <TouchableOpacity
            style={styles.customerDataCardTouchable}
            onPress={() => handleViewBill(item)}
          >
            <View style={styles.customerDataCardHeader}>
              <Text style={styles.customerDataName}>{getDisplayNameWithOthers(item)}</Text>
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

              {/* Dealer Image Display */}
              <View style={styles.customerDataRightImageWrap}>
                {imageUri ? (
                  <TouchableOpacity onPress={() => handleImageClick?.(imageUri)}>
                    <Image source={{ uri: imageUri }} style={styles.customerDataRightImage} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.customerDataRightImagePlaceholder}>
                    <Icon name="image-off-outline" size={32} color="#ccc" />
                  </View>
                )}
              </View>
            </View>

	            <Text style={styles.lastPaidText}>
	              Last Activity: {new Date(updatedAt).toLocaleDateString()}{" "}
	              {new Date(updatedAt).toLocaleTimeString()}
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
            {getDisplayNameWithOthers(item)}
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
	          Last Activity: {new Date(updatedAt).toLocaleDateString()}{" "}
	          {new Date(updatedAt).toLocaleTimeString()}
	        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default function CustomerMasterList({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [activityRows, setActivityRows] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [reminderCount, setReminderCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [fromDateObj, setFromDateObj] = useState(null);
  const [toDateObj, setToDateObj] = useState(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const cacheRef = useRef({ data: [], activityRows: [], ts: 0 });
  const isFetchingRef = useRef(false);

  const PAGE_SIZE = 20;
  const CACHE_TTL_MS = 2 * 60 * 1000;

  const toTs = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const raw = String(value).trim();
    if (!raw) return 0;
    const direct = new Date(raw).getTime();
    if (Number.isFinite(direct)) return direct;
    const m = raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(.*))?$/
    );
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

  const formatDateLabel = (value) => {
    if (!value) return "Select Date";
    return new Date(value).toLocaleDateString();
  };

  const getDayBounds = (value) => {
    const date = new Date(value);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  };

  const getTodayBounds = () => getDayBounds(new Date());

  const handleImageClick = (uri) => {
    setSelectedImage(uri);
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, customers.length, fromDateObj, toDateObj]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [route?.params?.refresh]),
  );

  const fetchCustomers = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
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
        const savedBalanceType = String(
          latestBalanceRow.balanceType || latestBalanceRow.summary?.balanceType || "",
        ).toUpperCase();
        const savedBalanceValue = pickFirstNumber(
          latestBalanceRow.balanceValue,
          latestBalanceRow.summary?.balanceValue,
          latestBalanceRow.finalBalance,
        );
        const currentFromRow = pickFirstNumber(
          latestBalanceRow.currentBalance,
          latestBalanceRow.availableBalance,
          latestBalanceRow.balance,
        );
        const resolvedState =
          Number.isFinite(savedBalanceValue) && savedBalanceType
            ? {
                oldBalance: savedBalanceType === "OB" ? savedBalanceValue : 0,
                advanceBalance: savedBalanceType === "AB" ? savedBalanceValue : 0,
              }
            : Number.isFinite(currentFromRow)
          ? deriveBalanceStateFromNet(currentFromRow)
          : normalizeBalanceState({
              oldBalance: pickFirstNumber(
                latestBalanceRow.oldBalance,
                latestBalanceRow.ob,
                dealer.oldBalance,
                0,
              ),
              advanceBalance: pickFirstNumber(
                latestBalanceRow.advanceBalance,
                latestBalanceRow.advBal,
                dealer.advanceBalance,
                0,
              ),
            });
        const latestImageRow = matchedRows.find(
          (row) => row.receiptImage || row.image || row.proofImage,
        );

        return {
          oldBalance: resolvedState.oldBalance,
          advanceBalance: resolvedState.advanceBalance,
          latestTransactionImage: latestImageRow
            ? latestImageRow.receiptImage || latestImageRow.image || latestImageRow.proofImage
            : "",
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
        const name = normalizeName(extractCustomerDisplayName(customer));
        
        // allBillRows is already sorted descending by date/createdAt
        const latestBill = allBillRows.find((bill) => {
          const billCustId = normalizeId(bill.customerId);
          const billCustName = normalizeName(extractCustomerDisplayName(bill));
          return ids.has(billCustId) || (name && billCustName === name);
        });

        if (!latestBill) return customer;

        const customerUpdatedTs = toTs(customer.updatedAt || customer.createdAt || 0);
        const latestBillTs = toTs(latestBill.updatedAt || latestBill.createdAt || latestBill.date || 0);

        // If the customer master row was updated after the latest bill, prefer the DB balance.
        if (customerUpdatedTs && latestBillTs && customerUpdatedTs >= latestBillTs) {
          return customer;
        }

        const latestBillBalanceType = String(
          latestBill.balanceType || latestBill.summary?.balanceType || "",
        ).toUpperCase();
        const latestBillBalanceValue = pickFirstNumber(
          latestBill.balanceValue,
          latestBill.summary?.balanceValue,
          latestBill.finalBalance,
        );
        const latestBalanceState =
          Number.isFinite(latestBillBalanceValue) && latestBillBalanceType
            ? {
                oldBalance: latestBillBalanceType === "OB" ? latestBillBalanceValue : 0,
                advanceBalance: latestBillBalanceType === "AB" ? latestBillBalanceValue : 0,
              }
            : (() => {
                const currentFromBill = pickFirstNumber(
                  latestBill.currentBalance,
                  latestBill.availableBalance,
                  latestBill.summary?.current,
                );
                return Number.isFinite(currentFromBill)
                  ? deriveBalanceStateFromNet(currentFromBill)
                  : normalizeBalanceState({
                      oldBalance: pickFirstNumber(
                        latestBill.oldBalance,
                        latestBill.ob,
                        latestBill.summary?.ob,
                        customer.oldBalance,
                        0,
                      ),
                      advanceBalance: pickFirstNumber(
                        latestBill.advanceBalance,
                        latestBill.advBal,
                        latestBill.summary?.ab,
                        customer.advanceBalance,
                        0,
                      ),
                    });
              })();

        const billNo = latestBill.billNo || latestBill.invoiceNo || "";
        const billAmount = latestBill.gst?.finalAmount || latestBill.gst?.amount || latestBill.totalAmount || latestBill.cashAmount || 0;
        const billWeight = latestBill.totalIssueWeight || latestBill.issuePure || 0;

        return {
          ...customer,
          oldBalance: latestBalanceState.oldBalance,
          advanceBalance: latestBalanceState.advanceBalance,
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
        oldBalance: Number.isFinite(Number(customer.oldBalance)) ? customer.oldBalance : "0.000",
        advanceBalance: Number.isFinite(Number(customer.advanceBalance)) ? customer.advanceBalance : "0.000",
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

      const supplierCustomers = dealerData.map((dealer) =>
        enrichWithLatestBill({
          ...dealer,
          id: dealer._id || dealer.id || dealer.customerId,
          customerId: dealer.customerId || dealer._id || dealer.id,
          customerType: String(dealer.customerType || "DEALER").toUpperCase(),
          customerName: dealer.customerName,
          customerNumber: dealer.customerNumber || dealer.phoneNumber,
          shopName: dealer.shopName || "No Shop Name",
          oldBalance: Number(dealer?.oldBalance || 0).toFixed(3),
          advanceBalance: Number(dealer?.advanceBalance || 0).toFixed(3),
          latestTransactionImage: dealer.latestTransactionImage || "",
          updatedAt: dealer.updatedAt || dealer.createdAt || new Date().toISOString(),
        }),
      );

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
      const sortedCustomers = [...decoratedCustomers].sort(
        (a, b) => toTs(b.updatedAt || b.createdAt || 0) - toTs(a.updatedAt || a.createdAt || 0),
      );
      setReminderCount(reminders.length);
      setCustomers(sortedCustomers);
      setActivityRows([...allTxRows, ...allBillRows]);
      cacheRef.current = { data: sortedCustomers, activityRows: [...allTxRows, ...allBillRows], ts: Date.now() };
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  const visibleCustomers = useMemo(() => {
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

    const getCustomerLatestActivityTs = (customer) => {
      const customerIds = new Set(
        [customer.customerId, customer._id, customer.id].map((value) => normalizeId(value)).filter(Boolean),
      );
      const customerName = normalizeName(extractCustomerDisplayName(customer));
      const customerPhone = normalizePhone(customer.customerNumber || customer.phoneNumber || customer.phone || "");

      const matchedTs = activityRows
        .filter((row) => {
          const rowType = String(row.customerType || row.dealerType || row.type || "").toUpperCase();
          const customerType = String(customer.customerType || "").toUpperCase();
          if (customerType === "B2B" && rowType === "B2C") return false;
          if (customerType === "B2C" && rowType === "B2B") return false;
          if (
            (customerType === "DEALER" || customerType === "SUPPLIER") &&
            rowType &&
            rowType !== "DEALER" &&
            rowType !== "SUPPLIER"
          ) {
            return false;
          }

          const rowIds = [
            normalizeId(row.customerId),
            normalizeId(row.customer?._id),
            normalizeId(row.customer?.id),
            normalizeId(row.customer?.customerId),
          ].filter(Boolean);
          const rowName = normalizeName(
            row.customerName || row.name || row.customer?.customerName || row.customer?.name || "",
          );
          const rowPhone = normalizePhone(
            row.phone ||
              row.phoneNumber ||
              row.customerNumber ||
              row.customer?.phone ||
              row.customer?.phoneNumber ||
              row.customer?.customerNumber ||
              "",
          );

          const idMatch = rowIds.some((id) => customerIds.has(id));
          const nameMatch = customerName && rowName && customerName === rowName;
          const phoneMatch = customerPhone && rowPhone && customerPhone === rowPhone;
          return idMatch || nameMatch || phoneMatch;
        })
        .map((row) => toTs(row.updatedAt || row.createdAt || row.date || 0))
        .filter((value) => Number.isFinite(value) && value > 0);

      return matchedTs.length > 0 ? Math.max(...matchedTs) : 0;
    };

    const hasSearch = Boolean(search.trim());
    if (hasSearch) {
      return customers;
    }

    const hasCustomRange = Boolean(fromDateObj && toDateObj);
    const bounds = hasCustomRange
      ? {
          start: getDayBounds(fromDateObj).start,
          end: getDayBounds(toDateObj).end,
        }
      : getTodayBounds();

    return customers
      .map((customer) => {
        const latestActivityTs = getCustomerLatestActivityTs(customer);
        return {
          ...customer,
          __latestVisibleActivityTs: latestActivityTs,
        };
      })
      .filter((customer) => {
        const latestActivityTs = Number(customer.__latestVisibleActivityTs || 0);
        return latestActivityTs >= bounds.start && latestActivityTs <= bounds.end;
      })
      .sort((a, b) => {
        const activityDiff =
          Number(b.__latestVisibleActivityTs || 0) - Number(a.__latestVisibleActivityTs || 0);
        if (activityDiff !== 0) return activityDiff;
        return toTs(b.updatedAt || b.createdAt || 0) - toTs(a.updatedAt || a.createdAt || 0);
      });
  }, [activityRows, customers, fromDateObj, search, toDateObj]);

  const filteredData = useMemo(() => {
      const lowered = search.toLowerCase();
      const filtered = visibleCustomers.filter((item) => {
      const custName = getDisplayNameWithOthers(item).toLowerCase();
      const matchesSearch = custName.includes(lowered);
      const normalizedType = String(item.customerType || "").toUpperCase();

      const matchesType =
        filter === "ALL" ||
        normalizedType === filter ||
        (filter === "Supplier" &&
          (normalizedType === "DEALER" || normalizedType === "SUPPLIER"));

      return matchesSearch && matchesType;
    });
    return filtered.sort(
      (a, b) =>
        Number(b.__latestVisibleActivityTs || 0) - Number(a.__latestVisibleActivityTs || 0) ||
        toTs(b.updatedAt || b.createdAt || 0) - toTs(a.updatedAt || a.createdAt || 0),
    );
  }, [filter, search, toTs, visibleCustomers]);

  const displayData = useMemo(() => {
    return filteredData;
  }, [filteredData]);

  const pagedData = useMemo(() => {
    return displayData.slice(0, page * PAGE_SIZE);
  }, [displayData, page]);

  const handleEdit = (customer) => {
    navigation.navigate("EditCustomerMaster", { customer });
  };

  const handleDelete = async (customer) => {
    const displayName = extractCustomerDisplayName(customer) || "this customer";
    Alert.alert("Delete Customer", `Delete ${displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const normalizedType = String(customer.customerType || "").trim().toUpperCase();
            let endpoint = "";
            if (normalizedType === "B2B") endpoint = "/customers";
            else if (normalizedType === "B2C") endpoint = "/customersB2C";
            else if (normalizedType === "DEALER" || normalizedType === "SUPPLIER") endpoint = "/customersDealer";

            if (!endpoint) {
              Alert.alert("Error", "Unknown customer type. Unable to delete.");
              return;
            }

            const customerId =
              customer._id || customer.id || customer.customerId;

            if (!customerId) {
              Alert.alert("Error", "Missing customer ID. Unable to delete.");
              return;
            }

            const response = await fetch(
              `${base_url}${endpoint}/${customerId}`,
              {
                method: "DELETE",
              },
            );

	            if (response.ok) {
	              const nextCustomers = customers.filter(
	                (c) =>
	                  (c.customerId || c.id || c._id) !== customerId,
	              );
	              setCustomers(nextCustomers);
	              cacheRef.current = {
	                ...cacheRef.current,
	                data: nextCustomers,
	              };
	              Alert.alert("Success", "Customer deleted successfully");
            } else {
                  let errorMessage = "Failed to delete customer";
                  try {
                    const body = await response.json();
                    if (body?.message) errorMessage = body.message;
                  } catch (_) {}
                  Alert.alert("Error", errorMessage);
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
    const type =
      filter === "B2B"
        ? "B2B"
        : filter === "B2C"
          ? "B2C"
          : filter === "Supplier"
            ? "Dealer"
            : undefined;
    navigation.navigate("CreateCustomerMaster", { customers, type });
  };

  const handleRefresh = async () => {
    await fetchCustomers();
  };

  const clearDateRange = () => {
    setFromDateObj(null);
    setToDateObj(null);
  };

  const handleFromDateChange = (_, selectedDate) => {
    setShowFromDatePicker(Platform.OS === "ios");
    if (!selectedDate) return;
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    setFromDateObj(normalizedDate);
    if (toDateObj && normalizedDate > toDateObj) {
      setToDateObj(normalizedDate);
    }
  };

  const handleToDateChange = (_, selectedDate) => {
    setShowToDatePicker(Platform.OS === "ios");
    if (!selectedDate) return;
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    if (fromDateObj && normalizedDate < fromDateObj) {
      Alert.alert("Invalid Selection", "To Date cannot be earlier than From Date.");
      setToDateObj(fromDateObj);
      return;
    }
    setToDateObj(normalizedDate);
  };

  const dateFilterLabel = search.trim()
    ? "Search Results"
    : fromDateObj && toDateObj
      ? `${formatDateLabel(fromDateObj)} - ${formatDateLabel(toDateObj)}`
      : "Today Transactions";

  const emptyStateText = search.trim()
    ? "No saved customers match your search"
    : fromDateObj && toDateObj
      ? "No customer transactions found in this date range"
      : "No customer transactions found for today";

  const handleViewBill = (customer) => {
    // Dealer/Supplier SD bills are now viewed through the same Bill History flow.
    navigation.navigate("BillHistory", { customer });
  };

  const renderItem = useCallback(
    ({ item }) => (
      <CustomerCard
        item={item}
        handleViewBill={handleViewBill}
        handlePhonePress={handlePhonePress}
        handleWhatsApp={handleWhatsApp}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        isOverdue={Boolean(item.isOverdueReminder)}
        handleImageClick={handleImageClick}
      />
    ),
    [handleViewBill, handlePhonePress, handleWhatsApp, handleEdit, handleDelete, handleImageClick],
  );

  const keyExtractor = useCallback((item, index) => {
    return String(item.customerId || item._id || item.id || item.customerNumber || index);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (page * PAGE_SIZE >= displayData.length) return;
    setPage((p) => p + 1);
  }, [displayData.length, page]);


  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <CommonHeader
        title="Customer Data List"
        subtitle={`${dateFilterLabel}: ${displayData.length}`}
        onBack={() => navigation.goBack()}
        backgroundColor="#1B4D1B"
        insideSafeArea
        right={
          <View style={styles.headerRightActions}>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
              <Icon name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
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
          </View>
        }
      >
        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#888" />
          <TextInput
            placeholder="Search Customer..."
            placeholderTextColor="#666"
            style={styles.search}
            value={searchInput}
            onChangeText={setSearchInput}
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

      <View style={styles.dateFilterSection}>
        <TouchableOpacity
          style={styles.dateCard}
          onPress={() => setShowFromDatePicker(true)}
        >
          <Text style={styles.dateTitle}>From Date</Text>
          <Text style={[styles.dateValue, !fromDateObj && styles.datePlaceholder]}>
            {formatDateLabel(fromDateObj)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateCard}
          onPress={() => setShowToDatePicker(true)}
        >
          <Text style={styles.dateTitle}>To Date</Text>
          <Text style={[styles.dateValue, !toDateObj && styles.datePlaceholder]}>
            {formatDateLabel(toDateObj)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearDateBtn} onPress={clearDateRange}>
          <Text style={styles.clearDateText}>Today</Text>
        </TouchableOpacity>
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
        data={pagedData}
        extraData={customers}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2E7D32" />
            </View>
	          ) : (
	            <View style={styles.emptyWrap}>
	              <Text style={styles.emptyText}>{emptyStateText}</Text>
	            </View>
	          )
	        }
	      />

      {showFromDatePicker && (
        <DateTimePicker
          value={fromDateObj || new Date()}
          mode="date"
          display="default"
          onChange={handleFromDateChange}
          maximumDate={toDateObj || undefined}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={toDateObj || fromDateObj || new Date()}
          mode="date"
          display="default"
          onChange={handleToDateChange}
          minimumDate={fromDateObj || undefined}
        />
      )}

      {/* FLOATING ADD BUTTON */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <Modal
          visible={!!selectedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.dealerImagePreviewOverlay}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.dealerImagePreviewImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.dealerImagePreviewCloseBtn}
              onPress={() => setSelectedImage(null)}
            >
              <Icon name="close" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
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

  search: { marginLeft: 10, flex: 1, color: "#000" },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
  },
  dateFilterSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E3E7EA",
  },
  dateTitle: {
    fontSize: 12,
    color: "#5F6B76",
    marginBottom: 4,
    fontWeight: "700",
  },
  dateValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  datePlaceholder: {
    color: "#94A3B8",
  },
  clearDateBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  clearDateText: {
    color: "#fff",
    fontWeight: "700",
  },

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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshBtn: {
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

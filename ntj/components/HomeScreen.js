import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Animated,
  Alert,
  Linking,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";
import {
  buildReminderAlerts,
  loadReminderDismissed,
  loadReminderSnoozes,
} from "./reminderService";
import {
  deriveBalanceStateFromNet,
  normalizeBalanceState,
  toBalanceNumber,
} from "./balanceUtils";

const OLD_BALANCE_REMINDER_SHOWN_KEY = "old_balance_reminder_shown_v2";
const REMINDER_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
const REMINDER_AUTO_HIDE_MS = 5000; // 5 seconds
const FETCH_TIMEOUT_MS = 8000; // 8-second timeout prevents infinite loading

// Fetch with abort-controller timeout — prevents Expo Go from hanging when
// the backend IP is wrong or the phone is off the local Wi-Fi network.
const fetchWithTimeout = (url, options = {}, timeout = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

export default function HomeScreen({ route }) {
  const navigation = useNavigation();
  const user = route?.params?.user || null;

  const getCurrentDate = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const [goldRate, setGoldRate] = useState("11500");
  const [goldDate, setGoldDate] = useState(getCurrentDate());
  const [ftRate, setFtRate] = useState("150");
  const [ftDate, setFtDate] = useState(getCurrentDate());
  const [modalVisible, setModalVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-250))[0];
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [quickAccessCounts, setQuickAccessCounts] = useState({
    b2b: 0,
    b2c: 0,
    cash: 0,
    suspense: 0,
    estimate: 0,
    customer: 0,
  });
  const [balanceLookup, setBalanceLookup] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [reminderBanner, setReminderBanner] = useState(null);
  const shownReminderStateRef = useRef({});
  const reminderStateLoadedRef = useRef(false);
  const reminderBannerRef = useRef(null);
  const reminderAutoHideRef = useRef(null);
  const reminderSlideY = useRef(new Animated.Value(-36)).current;
  const reminderOpacity = useRef(new Animated.Value(0)).current;
  const reminderDragX = useRef(new Animated.Value(0)).current;

  const getSafeCustomerName = (value) => {
    if (value === null || value === undefined) return "";
    const name = String(value).trim();
    return name ? name : "";
  };

  const extractCustomerName = (row = {}) => {
    const direct =
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
      getSafeCustomerName(row?.name);
    if (direct) return direct;
    const nested =
      getSafeCustomerName(row?.customer?.name) ||
      getSafeCustomerName(row?.customer?.customerName) ||
      getSafeCustomerName(row?.customer?.customer_name) ||
      getSafeCustomerName(row?.customer?.fullName) ||
      getSafeCustomerName(row?.customer?.full_name) ||
      getSafeCustomerName(row?.dealer?.name) ||
      getSafeCustomerName(row?.dealer?.customerName) ||
      getSafeCustomerName(row?.dealer?.customer_name);
    return nested || "";
  };

  const appendOthersSuffix = (name, row = {}) => {
    const baseName = String(name || "").trim();
    if (!baseName || baseName.includes("(Others)")) return baseName || "";
    const shop = String(
      row?.shopName ||
        row?.companyName ||
        row?.company ||
        row?.customer?.shopName ||
        row?.customer?.companyName ||
        row?.customer?.company ||
        ""
    )
      .trim()
      .toLowerCase();
    return shop === "others" ? `${baseName} (Others)` : baseName;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const formatDateTime = (date) => {
    const d = date || new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = String(hours).padStart(2, "0");

    return `${day}-${month}-${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  const isSameLocalCalendarDay = (value, referenceDate = new Date()) => {
    if (!value) return false;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(parsed.getTime())) return false;
    return (
      parsed.getFullYear() === referenceDate.getFullYear() &&
      parsed.getMonth() === referenceDate.getMonth() &&
      parsed.getDate() === referenceDate.getDate()
    );
  };

  const getRowDateCandidates = (row = {}) => [
    row?.createdAt,
    row?.updatedAt,
    row?.date,
    row?.transactionDate,
    row?.billDate,
    row?.lastTransactionDate,
    row?.customer?.date,
    row?.summary?.date,
  ].filter(Boolean);

  const isTodayTransactionRow = (row = {}) =>
    getRowDateCandidates(row).some((value) => isSameLocalCalendarDay(value));

  const renderQuickCountBadge = (count) => (
    <View style={styles.quickTileBadge}>
      <Text style={styles.quickTileBadgeText}>{Number(count || 0)}</Text>
    </View>
  );

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem("userSession");
      if (session) {
        setCurrentUser(JSON.parse(session));
      }
    } catch (error) {
      console.error("Failed to load user session:", error);
    }
  };

  const loadRates = useCallback(async () => {
    try {
      console.log("Fetching rates from:", `${base_url}/rates`);
      const response = await fetchWithTimeout(`${base_url}/rates`);
      console.log("Rates response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Rates loaded from DB:", data);
        setGoldRate(data.goldRate);
        setGoldDate(data.goldDate);
        setFtRate(data.ftRate);
        setFtDate(data.ftDate);
        return;
      } else {
        console.log("No rates in DB yet, using defaults/AsyncStorage");
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Rates fetch timed out — falling back to AsyncStorage.");
      } else {
        console.log("DB fetch failed, falling back to AsyncStorage. Error:", error.message);
      }
    }

    // Fallback to AsyncStorage
    try {
      const savedGoldRate = await AsyncStorage.getItem("goldRate");
      if (savedGoldRate) setGoldRate(savedGoldRate);
      const savedFtRate = await AsyncStorage.getItem("ftRate");
      if (savedFtRate) setFtRate(savedFtRate);
    } catch (error) {
      console.error("AsyncStorage error:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const CASH_HISTORY_KEY = "cashpage_history";
      const toTs = (value) => {
        if (!value) return 0;
        const t = new Date(value).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      const normalizeName = (value) => String(value || "").trim().toLowerCase();
      const normalizeType = (row = {}) => {
        const dealerTag = String(row.dealerType || "").toUpperCase();
        if (dealerTag === "DEALER") return "DEALER";
        if (dealerTag === "SUPPLIER") return "SUPPLIER";
        const raw = String(row.type || row.customerType || "").toUpperCase();
        if (raw === "B2C") return "B2C";
        if (raw === "B2B") return "B2B";
        if (raw === "DEALER") return "DEALER";
        if (raw === "SUPPLIER") return "SUPPLIER";
        if (raw === "RETAIL") return "B2C";
        return "B2B";
      };
      const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

      const [
        b2bResponse,
        b2cResponse,
        suspenseRes,
        estimateRes,
        dealersRes,
        customersRes,
        b2cCustomersRes,
        billB2BRes,
        billB2CRes,
        cashHistoryRaw,
      ] = await Promise.all([
        fetchWithTimeout(`${base_url}/transactions`),
        fetchWithTimeout(`${base_url}/retail`),
        fetchWithTimeout(`${base_url}/suspense`),
        fetchWithTimeout(`${base_url}/estimates`),
        fetchWithTimeout(`${base_url}/customersDealer`),
        fetchWithTimeout(`${base_url}/customers`),
        fetchWithTimeout(`${base_url}/customersB2C`),
        fetchWithTimeout(`${base_url}/billSummary?billType=B2B`),
        fetchWithTimeout(`${base_url}/billSummary?billType=B2C`),
        AsyncStorage.getItem(CASH_HISTORY_KEY),
      ]);

      const b2bData = b2bResponse.ok ? await b2bResponse.json() : [];
      const b2cData = b2cResponse.ok ? await b2cResponse.json() : [];
      const suspenseRaw = suspenseRes.ok ? await suspenseRes.json() : [];
      const estimateData = estimateRes.ok ? await estimateRes.json() : [];
      const dealers = dealersRes.ok ? await dealersRes.json() : [];
      const customers = customersRes.ok ? await customersRes.json() : [];
      const b2cCustomers = b2cCustomersRes.ok ? await b2cCustomersRes.json() : [];
      const billB2BRows = billB2BRes.ok ? await billB2BRes.json() : [];
      const billB2CRows = billB2CRes.ok ? await billB2CRes.json() : [];
      const cashHistoryRows = (() => {
        try {
          const parsed = cashHistoryRaw ? JSON.parse(cashHistoryRaw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error("Failed to parse cash history for quick access:", error);
          return [];
        }
      })();
      const billRows = [
        ...(Array.isArray(billB2BRows) ? billB2BRows : []),
        ...(Array.isArray(billB2CRows) ? billB2CRows : []),
      ];
      const suspenseRows = Array.isArray(suspenseRaw?.transactions)
        ? suspenseRaw.transactions
        : Array.isArray(suspenseRaw)
          ? suspenseRaw
          : [];

      const todayB2BCount = (Array.isArray(b2bData) ? b2bData : []).filter(isTodayTransactionRow).length;
      const todayB2CCount = (Array.isArray(b2cData) ? b2cData : []).filter(isTodayTransactionRow).length;
      const todayCashCount = cashHistoryRows.filter(isTodayTransactionRow).length;
      const todaySuspenseCount = suspenseRows.filter(isTodayTransactionRow).length;
      const todayEstimateCount = (Array.isArray(estimateData) ? estimateData : []).filter(isTodayTransactionRow).length;

      const todayCustomerKeys = new Set();
      [...(Array.isArray(b2bData) ? b2bData : []), ...(Array.isArray(b2cData) ? b2cData : [])].forEach((row) => {
        if (!isTodayTransactionRow(row)) return;
        const rowId = row?.customerId || row?._id || row?.id;
        const phoneKey = normalizePhone(
          row?.phone || row?.phoneNumber || row?.customerNumber || row?.customer?.phone || "",
        );
        const nameKey = normalizeName(extractCustomerName(row));
        const identityKey = rowId
          ? `id:${String(rowId).trim().toLowerCase()}`
          : phoneKey
            ? `p:${phoneKey}`
            : nameKey
              ? `n:${nameKey}`
              : "";
        if (identityKey) todayCustomerKeys.add(identityKey);
      });

      setQuickAccessCounts({
        b2b: todayB2BCount,
        b2c: todayB2CCount,
        cash: todayCashCount,
        suspense: todaySuspenseCount,
        estimate: todayEstimateCount,
        customer: todayCustomerKeys.size,
      });

      const lookup = {};
      const setBal = (key, ob, ab) => {
        if (!key) return;
        const normalized = normalizeBalanceState({
          oldBalance: ob,
          advanceBalance: ab,
        });
        lookup[String(key).toLowerCase()] = {
          ob: normalized.oldBalance,
          ab: normalized.advanceBalance,
        };
      };

      customers.forEach((c) => {
        setBal(c._id, c.oldBalance, c.advanceBalance);
        setBal(c.customerId, c.oldBalance, c.advanceBalance);
        setBal(c.customerName, c.oldBalance, c.advanceBalance);
        setBal(c.phoneNumber, c.oldBalance, c.advanceBalance);
      });

      b2cCustomers.forEach((c) => {
        setBal(c._id, c.oldBalance, c.advanceBalance);
        setBal(c.customerId, c.oldBalance, c.advanceBalance);
        setBal(c.customerName, c.oldBalance, c.advanceBalance);
        setBal(c.phoneNumber, c.oldBalance, c.advanceBalance);
      });

      dealers.forEach((d) => {
        const dOb = Number(d.oldBalance ?? d.ob ?? 0);
        const dAb = Number(d.advanceBalance ?? d.advBal ?? 0);
        setBal(d._id, dOb, dAb);
        setBal(d.customerId, dOb, dAb);
        setBal(d.id, dOb, dAb);
        setBal(d.customerName, dOb, dAb);
        setBal(d.phoneNumber, dOb, dAb);
        setBal(d.customerNumber, dOb, dAb);
      });
      setBalanceLookup(lookup);

      const customerMap = {};
      dealers.forEach(d => { customerMap[d.customerName] = normalizeType(d); });
      customers.forEach(c => { customerMap[c.customerName] = normalizeType(c); });
      const dealerIdentitySet = new Set();
      dealers.forEach((d) => {
        const keys = [
          d._id,
          d.id,
          d.customerId,
          d.customerName,
          d.phoneNumber,
          d.customerNumber,
        ]
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase());
        const phoneKeys = [d.phoneNumber, d.customerNumber]
          .filter(Boolean)
          .map((v) => normalizePhone(v))
          .filter(Boolean);
        keys.forEach((k) => dealerIdentitySet.add(k));
        phoneKeys.forEach((k) => dealerIdentitySet.add(k));
      });
      const isDealerRecord = (row = {}) => {
        const keys = [
          row.customerId,
          row._id,
          row.id,
          row.customerName,
          row.name,
          row.phone,
          row.phoneNumber,
          row.customerNumber,
        ]
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase());
        const phoneKeys = [row.phone, row.phoneNumber, row.customerNumber]
          .filter(Boolean)
          .map((v) => normalizePhone(v))
          .filter(Boolean);
        return [...keys, ...phoneKeys].some((k) => dealerIdentitySet.has(k));
      };

      const b2bMapped = (Array.isArray(b2bData) ? b2bData : [])
        .map((t) => {
          const name = extractCustomerName(t);
          const derivedType = normalizeType({ ...t, customerType: t.customerType || customerMap[name] || t.type });
          const dealerHit = isDealerRecord(t);
          return {
            ...t,
            type: dealerHit ? "DEALER" : derivedType,
            isDealer: dealerHit,
            displayName: name,
            _sourcePriority: 2,
            _sortTs: toTs(t.updatedAt || t.createdAt || t.date || 0),
          };
        });

      const b2cMapped = (Array.isArray(b2cData) ? b2cData : [])
        .map((t) => ({
          ...t,
          type: "B2C",
          displayName: extractCustomerName(t),
          _sourcePriority: 1,
          _sortTs: toTs(t.updatedAt || t.createdAt || t.date || 0),
        }));

	      const billMapped = (Array.isArray(billRows) ? billRows : [])
	        .map((t) => {
	          const savedBillType = normalizeType(t);
	          const dealerHit = savedBillType === "B2B" || savedBillType === "B2C" ? false : isDealerRecord(t);
	          const summaryCurrent = toBalanceNumber(t?.summary?.current, NaN);
	          const summaryOb = toBalanceNumber(t?.summary?.ob, NaN);
	          const summaryAb = toBalanceNumber(t?.summary?.ab, NaN);
          const hasSummaryCurrent = Number.isFinite(summaryCurrent);
          const balanceStateFromSummary = hasSummaryCurrent
            ? deriveBalanceStateFromNet(summaryCurrent)
            : normalizeBalanceState({
                oldBalance: summaryOb,
                advanceBalance: summaryAb,
              });
	          return {
	            ...t,
	            type: dealerHit ? "DEALER" : savedBillType,
	            isDealer: dealerHit,
	            displayName: extractCustomerName(t),
	            _sourcePriority: 3,
            _sortTs: toTs(t.updatedAt || t.createdAt || t.date || 0),
            currentBalance: hasSummaryCurrent ? summaryCurrent : (t.currentBalance ?? t.availableBalance),
            availableBalance: hasSummaryCurrent ? summaryCurrent : (t.availableBalance ?? t.currentBalance),
            oldBalance: t.oldBalance ?? t.ob ?? balanceStateFromSummary.oldBalance ?? 0,
            advanceBalance: t.advanceBalance ?? t.advBal ?? balanceStateFromSummary.advanceBalance ?? 0,
            advBal: t.advBal ?? t.advanceBalance ?? balanceStateFromSummary.advanceBalance ?? 0,
            balance: hasSummaryCurrent ? summaryCurrent : (t.currentBalance ?? t.availableBalance ?? t.balance),
          };
        });

      const buildIdentityKey = (txn) => {
        const id = txn.customerId || txn._id || txn.id;
        if (id) return `id:${String(id).trim().toLowerCase()}`;
        const phoneKey = normalizePhone(
          txn.phone || txn.phoneNumber || txn.customerNumber || txn.mobileNumber || "",
        );
        if (phoneKey) return `p:${phoneKey}`;
        const name = normalizeName(txn.displayName);
        if (name) return `n:${name}`;
        return "";
      };

      const uniqueLatestTransactions = [];
      const seenCustomers = new Set();

      const candidateLists = [billMapped, b2bMapped, b2cMapped];
      for (const list of candidateLists) {
        const ordered = [...list].sort((a, b) => (b._sortTs || 0) - (a._sortTs || 0));
        for (const txn of ordered) {
          const key = buildIdentityKey(txn);
          if (!key || seenCustomers.has(key)) continue;
          seenCustomers.add(key);
          uniqueLatestTransactions.push(txn);
          if (uniqueLatestTransactions.length >= 10) break;
        }
        if (uniqueLatestTransactions.length >= 10) break;
      }

      setTransactions(uniqueLatestTransactions.slice(0, 10));
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    loadRates();
  }, [fetchData, loadRates]);

  const normalizeWhatsAppPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
    return digits;
  };

  const openReminderWhatsApp = useCallback(async (alertItem) => {
    const waPhone = normalizeWhatsAppPhone(alertItem?.customerPhone || "");
    if (!waPhone) {
      Alert.alert("Missing Number", "Customer phone number is not available.");
      return;
    }

    const msg = [
      "SVJ Jewellery Payment Reminder",
      `Customer: ${alertItem.customerName || "-"}`,
      `Old Balance: ${Number(alertItem.pendingBalance || 0).toFixed(3)} g`,
      `Pending Days: ${Number(alertItem.overdueDays || 0)}`,
    ].join("\n");

    const appUrl = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error("Failed to open WhatsApp from reminder:", error);
      Alert.alert("Error", "Unable to open WhatsApp for this customer.");
    }
  }, []);

  const getReminderSignature = useCallback((alertItem) => {
    const customerId = String(alertItem?.id || "");
    const pendingBalance = Number(alertItem?.pendingBalance || 0).toFixed(3);
    const lastTx = String(alertItem?.lastTransactionDate || "");
    return `${customerId}|${pendingBalance}|${lastTx}`;
  }, []);

  const loadShownReminderSignatures = useCallback(async () => {
    if (reminderStateLoadedRef.current) return;
    try {
      const raw = await AsyncStorage.getItem(OLD_BALANCE_REMINDER_SHOWN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        shownReminderStateRef.current =
          parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } else {
        shownReminderStateRef.current = {};
      }
    } catch (error) {
      console.error("Failed to load shown old-balance reminders:", error);
      shownReminderStateRef.current = {};
    } finally {
      reminderStateLoadedRef.current = true;
    }
  }, []);

  const canShowReminderNow = useCallback((alertItem) => {
    const id = String(alertItem?.id || "");
    if (!id) return false;
    const signature = getReminderSignature(alertItem);
    if (!signature) return false;

    const state = shownReminderStateRef.current[id];
    if (!state) return true;

    // Backward compatibility with older string-only stored format.
    if (typeof state === "string") {
      return state !== signature;
    }

    if (state.signature !== signature) return true;
    const lastShownAt = Number(state.lastShownAt || 0);
    return !lastShownAt || Date.now() - lastShownAt >= REMINDER_COOLDOWN_MS;
  }, [getReminderSignature]);

  const markReminderAsShown = useCallback(
    async (alertItem) => {
      const id = String(alertItem?.id || "");
      if (!id) return;
      const signature = getReminderSignature(alertItem);
      if (!signature) return;

      const updatedMap = {
        ...shownReminderStateRef.current,
        [id]: {
          signature,
          lastShownAt: Date.now(),
        },
      };
      shownReminderStateRef.current = updatedMap;
      try {
        await AsyncStorage.setItem(
          OLD_BALANCE_REMINDER_SHOWN_KEY,
          JSON.stringify(updatedMap)
        );
      } catch (error) {
        console.error("Failed to persist shown old-balance reminders:", error);
      }
    },
    [getReminderSignature]
  );

  const dismissReminderBanner = useCallback((markAsSeen = true) => {
    const currentBanner = reminderBannerRef.current;
    if (reminderAutoHideRef.current) {
      clearTimeout(reminderAutoHideRef.current);
      reminderAutoHideRef.current = null;
    }
    Animated.parallel([
      Animated.timing(reminderSlideY, {
        toValue: -36,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(reminderOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      reminderDragX.setValue(0);
      if (markAsSeen && currentBanner) {
        markReminderAsShown(currentBanner);
      }
      setReminderBanner((prev) => (prev?.reminderKey === currentBanner?.reminderKey ? null : prev));
    });
  }, [reminderSlideY, reminderOpacity, reminderDragX, markReminderAsShown]);

  const reminderPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        reminderDragX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 45 || Math.abs(gestureState.vx) > 0.55) {
          dismissReminderBanner(true);
        } else {
          Animated.spring(reminderDragX, {
            toValue: 0,
            bounciness: 4,
            speed: 20,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const checkOldBalanceReminders = useCallback(async () => {
    try {
      await loadShownReminderSignatures();

      const [b2bRes, b2cRes, txRes, retailRes] = await Promise.all([
        fetchWithTimeout(`${base_url}/customers`),
        fetchWithTimeout(`${base_url}/customersB2C`),
        fetchWithTimeout(`${base_url}/transactions`),
        fetchWithTimeout(`${base_url}/retail`),
      ]);

      const [b2bRows, b2cRows, txRows, retailRows] = await Promise.all([
        b2bRes.ok ? b2bRes.json() : [],
        b2cRes.ok ? b2cRes.json() : [],
        txRes.ok ? txRes.json() : [],
        retailRes.ok ? retailRes.json() : [],
      ]);

      const customers = [
        ...(Array.isArray(b2bRows) ? b2bRows.map((c) => ({ ...c, customerType: "B2B" })) : []),
        ...(Array.isArray(b2cRows) ? b2cRows.map((c) => ({ ...c, customerType: "B2C" })) : []),
      ];
      const transactionsForReminder = [
        ...(Array.isArray(txRows) ? txRows : []),
        ...(Array.isArray(retailRows) ? retailRows : []),
      ];

      const [snoozes, dismissed] = await Promise.all([
        loadReminderSnoozes(),
        loadReminderDismissed(),
      ]);
      const allAlerts = buildReminderAlerts({
        customers,
        transactions: transactionsForReminder,
        settings: { enabled: true, days: 3, inAppOnly: true },
        snoozes,
        dismissed,
        now: new Date(),
      });

      const pendingOldBalanceAlerts = allAlerts.filter(
        (a) => Number(a.pendingBalance || 0) > 0 && a.notificationActive
      );
      if (pendingOldBalanceAlerts.length === 0) {
        setReminderBanner(null);
        return;
      }

      const unshownAlerts = pendingOldBalanceAlerts.filter((alertItem) => canShowReminderNow(alertItem));

      if (unshownAlerts.length === 0) {
        if (!reminderBannerRef.current) {
          setReminderBanner(null);
        }
        return;
      }

      const primary = unshownAlerts[0];
      const reminderKey = getReminderSignature(primary);
      const extraCount = Math.max(0, unshownAlerts.length - 1);
      setReminderBanner({
        ...primary,
        reminderKey,
        extraCount,
      });

      // Treat first display as "viewed" so the same condition does not keep reappearing.
      await markReminderAsShown(primary);
    } catch (error) {
      console.error("Failed to check old balance reminders:", error);
    }
  }, [loadShownReminderSignatures, canShowReminderNow, getReminderSignature, markReminderAsShown]);

  // Refresh data when screen focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
      loadRates();
      checkOldBalanceReminders();
    }, [fetchData, loadRates, checkOldBalanceReminders])
  );

  useEffect(() => {
    checkOldBalanceReminders();
  }, [checkOldBalanceReminders]);

  useEffect(() => {
    reminderBannerRef.current = reminderBanner;
  }, [reminderBanner]);

  useEffect(() => {
    if (!reminderBanner) return;
    reminderSlideY.setValue(-36);
    reminderOpacity.setValue(0);
    reminderDragX.setValue(0);
    Animated.parallel([
      Animated.spring(reminderSlideY, {
        toValue: 0,
        bounciness: 7,
        speed: 18,
        useNativeDriver: true,
      }),
      Animated.timing(reminderOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reminderBanner, reminderSlideY, reminderOpacity, reminderDragX]);

  useEffect(() => {
    if (reminderAutoHideRef.current) {
      clearTimeout(reminderAutoHideRef.current);
      reminderAutoHideRef.current = null;
    }
    if (!reminderBanner) return;
    reminderAutoHideRef.current = setTimeout(() => {
      dismissReminderBanner(false);
    }, REMINDER_AUTO_HIDE_MS);
    return () => {
      if (reminderAutoHideRef.current) {
        clearTimeout(reminderAutoHideRef.current);
        reminderAutoHideRef.current = null;
      }
    };
  }, [reminderBanner, dismissReminderBanner]);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(["adminLoggedIn", "adminData", "userSession"]);
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("Logout error", error);
          }
        }
      },
    ]);
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setMenuOpen(false));
  };

  const handleMenuNavigation = async (screenName) => {
    if (screenName === "Settings") {
      navigation.navigate(screenName, { user });
    } else if (screenName === "Logout") {
      handleLogout();
    } else {
      navigation.navigate(screenName);
    }
    closeMenu();
  };

  const handleSave = async () => {
    const payload = { goldRate, goldDate, ftRate, ftDate };
    console.log("Save pressed. Payload:", payload);
    console.log("Saving to:", `${base_url}/rates`);

    try {
      const response = await fetch(`${base_url}/rates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Save response status:", response.status);
      const result = await response.json();
      console.log("Save result:", result);

      if (response.ok) {
        await AsyncStorage.setItem("goldRate", goldRate);
        await AsyncStorage.setItem("ftRate", ftRate);
        Alert.alert("Success", "Rates saved successfully!");
      } else {
        Alert.alert("Error", `Failed to save: ${result.message}`);
      }
    } catch (error) {
      console.error("Save error:", error.message);
      Alert.alert("Error", `Network error: ${error.message}`);
    }

    setModalVisible(false);
  };


  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchData();
      await loadRates();
      console.log("Success", "Data refreshed successfully!");
    } catch (error) {
      console.error("Refresh error:", error);
      console.log("Error", "Failed to refresh data.");
    } finally {
      setLoading(false);
    }
  };

	  const resolveDisplayType = (txn = {}) => {
	    const raw = String(txn.type || txn.customerType || txn.dealerType || "").toUpperCase();
	    if (raw === "B2B") return "B2B";
	    if (raw === "B2C") return "B2C";
	    if (txn.isDealer || raw === "DEALER" || raw === "SUPPLIER") return "Dealer";
	    if (raw) return raw;
	    return "B2B";
	  };

  const resolveDisplayName = (txn = {}) => {
    const name = extractCustomerName(txn);
    return appendOthersSuffix(name, txn) || "Unknown";
  };

  const filteredTransactions = transactions.filter((txn) => {
    const name = resolveDisplayName(txn);
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const displayType = resolveDisplayType(txn);
    const matchesFilter =
      filterType === "All" ||
      displayType === filterType ||
      txn.customerType === filterType ||
      txn.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const resolveBalance = (item) => {
    const savedBalanceType = String(item.balanceType ?? item.summary?.balanceType ?? "").toUpperCase();
    const savedBalanceValue = toBalanceNumber(
      item.balanceValue ?? item.summary?.balanceValue ?? item.finalBalance,
      NaN,
    );
    if (Number.isFinite(savedBalanceValue) && savedBalanceType) {
      return {
        ob: savedBalanceType === "OB" ? savedBalanceValue : 0,
        ab: savedBalanceType === "AB" ? savedBalanceValue : 0,
      };
    }

    const keys = [
      item.customerId,
      item._id,
      item.id,
      item.customerName,
      item.displayName,
      item?.customer?.name,
      item?.customer?.customerName,
      item?.customer?.fullName,
      item.phone,
      item.phoneNumber,
      item.customerNumber,
      item.mobileNumber,
    ]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase());

    // Priority 1: Always show the latest live customer balance from lookup
    for (const k of keys) {
      if (balanceLookup[k]) return balanceLookup[k];
    }

    // Priority 2: Fallback to embedded balance only when lookup is missing
    const itemCurrent = toBalanceNumber(
      item.currentBalance ?? item.availableBalance ?? item.balance,
      NaN,
    );
    const itemOb = toBalanceNumber(item.oldBalance ?? item.ob, NaN);
    const itemAb = toBalanceNumber(item.advBal ?? item.advanceBalance, NaN);
    if (Number.isFinite(itemCurrent)) {
      const normalized = deriveBalanceStateFromNet(itemCurrent);
      return {
        ob: normalized.oldBalance,
        ab: normalized.advanceBalance,
      };
    }
    if (Number.isFinite(itemOb) || Number.isFinite(itemAb)) {
      const normalized = normalizeBalanceState({
        oldBalance: itemOb,
        advanceBalance: itemAb,
      });
      return {
        ob: normalized.oldBalance,
        ab: normalized.advanceBalance,
      };
    }

    return { ob: 0, ab: 0 };
  };

  const formatRecentTransactionDate = (value) => {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(raw)) {
      return raw.replace(/\//g, "-");
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const buildCustomerForHistory = (item = {}) => {
    const name = extractCustomerName(item) || "";
    const rawType = String(item.customerType || item.type || "").toUpperCase();
    let customerType = "B2B";
    if (rawType === "B2C") customerType = "B2C";
    else if (rawType === "DEALER") customerType = "DEALER";
    else if (rawType === "SUPPLIER") customerType = "SUPPLIER";
    else if (rawType === "B2B") customerType = "B2B";

    return {
      ...item,
      customerName: name,
      name: item.name || name,
      customerType,
      type: item.type || customerType,
      customerId: item.customerId || item._id || item.id || "",
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8E1" }}>
      {menuOpen && (
        <TouchableOpacity style={styles.overlay} onPress={closeMenu} />
      )}

      {/* SIDE MENU */}
      <Animated.View style={[styles.sideMenu, { left: slideAnim }]}>
        <View style={styles.sideMenuHeader}>
          <Icon name="diamond-stone" size={28} color="#FFD700" />
          <Text style={styles.menuTitle}>SVJ Menu</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {[
            { icon: "view-dashboard-outline", label: "Dashboard", screen: "Home" },
            { icon: "currency-inr", label: "Payment", screen: "Payments" },
            { icon: "account-tie-outline", label: "B2D", screen: "SD" },
            { icon: "piggy-bank-outline", label: "Chit Fund", screen: "Chit" },
            { icon: "database-outline", label: "Customer Data List", screen: "CustomerDataList" },
            { icon: "cash-register", label: "Retail Transaction", screen: "RetailTransaction" },
            { icon: "alert-circle-outline", label: "Suspense Transaction", screen: "SuspenseTransaction" },
            { icon: "file-chart-outline", label: "Mini Statement", screen: "MiniStatement" },
            { icon: "package-variant-closed", label: "Stock Master", screen: "StockMaster" },
            { icon: "cart-outline", label: "Purchase", screen: "Purchase" },
            { icon: "account-hard-hat-outline", label: "Worker List", screen: "WorkerList" },
            { icon: "clipboard-list-outline", label: "Order", screen: "Order" },
            { icon: "qrcode-scan", label: "UPI Control", screen: "UPIControl" },
            { icon: "file-percent-outline", label: "GST Page", screen: "GSTPage" },
            { icon: "account-check-outline", label: "GST Customers", screen: "CustomerGstPage" },
            { icon: "file-document-outline", label: "Documents", screen: "Document" },
            { icon: "cash-multiple", label: "Daily Expense", screen: "DailyExpense" },
            { icon: "account-group-outline", label: "Dealer List", screen: "Dealer" },
            { icon: "cog-outline", label: "Settings", screen: "Settings" },
            { icon: "logout", label: "Logout", screen: "Logout" },
          ].map(({ icon, label, screen }) => (
            <TouchableOpacity key={screen} style={styles.menuItem} onPress={() => handleMenuNavigation(screen)}>
              <Icon name={icon} size={22} color="#FFD700" />
              <Text style={styles.menuText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <CommonHeader
          backgroundColor="#7A5C00"
          center={
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.headerCenterText}>Hey! {currentUser?.role || "Super Admin"}</Text>
            </TouchableOpacity>
          }
          left={
            <TouchableOpacity onPress={openMenu}>
              <Icon name="menu" size={30} color="#FFD700" />
            </TouchableOpacity>
          }
          right={
            <TouchableOpacity onPress={handleLogout}>
              <Icon name="logout" size={26} color="#FFD700" />
            </TouchableOpacity>
          }
        />

        {reminderBanner ? (
          <Animated.View
            style={[
              styles.reminderBannerWrap,
              {
                opacity: reminderOpacity,
                transform: [
                  { translateY: reminderSlideY },
                  { translateX: reminderDragX },
                ],
              },
            ]}
          >
            <View style={styles.reminderBanner} {...reminderPanResponder.panHandlers}>
              <TouchableOpacity
                style={styles.reminderBannerMain}
                activeOpacity={0.85}
                onPress={async () => {
                  await openReminderWhatsApp(reminderBanner);
                  dismissReminderBanner(true);
                }}
              >
                <Icon name="bell-ring-outline" size={22} color="#B8860B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderTitle}>Old Balance Reminder</Text>
                  <Text style={styles.reminderText}>Name: {reminderBanner.customerName || "-"}</Text>
                  <Text style={styles.reminderText}>Phone: {reminderBanner.customerPhone || "-"}</Text>
                  <Text style={styles.reminderAmount}>
                    Old Balance: {Number(reminderBanner.pendingBalance || 0).toFixed(3)} g
                  </Text>
                  {reminderBanner.extraCount > 0 ? (
                    <Text style={styles.reminderExtra}>
                      +{reminderBanner.extraCount} more customer(s) overdue
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reminderCloseBtn}
                onPress={() => dismissReminderBanner(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}

        {/* Gold + FT Card */}
        <View style={styles.goldCard}>
          <TouchableOpacity
            style={styles.cardEditIcon}
            onPress={() => setModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="pencil" size={20} color="#FFD700" />
          </TouchableOpacity>

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.goldLabel}>GOLD PRICE</Text>
              <Text style={styles.goldRate}>₹{goldRate}</Text>
            </View>
            <View style={styles.dividerLine} />
            <View style={{ alignItems: "flex-start" }}>
              <Text style={styles.goldLabel}>FT RATE</Text>
              <Text style={styles.goldRate}>₹{ftRate}</Text>
            </View>
          </View>

          <View style={styles.cardBottomRow}>
            <Icon name="clock-outline" size={14} color="#FFD700" style={{ marginRight: 6 }} />
            <Text style={styles.clockTextInside}>{formatDateTime(currentDateTime)}</Text>
          </View>
        </View>

        {/* Quick Access 4x2 Grid */}
        <Text style={styles.sectionTitle}>Quick Access</Text>

        <View style={styles.quickGrid}>
          {[
            { label: "B2B", icon: "handshake-outline", color: "#7A5C00", bg: "#FFF3CD", nav: () => navigation.navigate("B2BCalculationPage", { ftRate }), badge: quickAccessCounts.b2b },
            { label: "B2C", icon: "account-multiple-outline", color: "#5C3A00", bg: "#FFE0B2", nav: () => navigation.navigate("B2CCalculationPage", { goldRate }), badge: quickAccessCounts.b2c },
            { label: "B2D", icon: "account-tie-outline", color: "#4E342E", bg: "#EFEBE9", nav: () => navigation.navigate("SD"), badge: 0 },
            { label: "SD", icon: "safe-square-outline", color: "#37474F", bg: "#ECEFF1", nav: () => navigation.navigate("SD"), badge: 0 },
            { label: "Chit Fund", icon: "piggy-bank-outline", color: "#6A1B00", bg: "#FFCCBC", nav: () => navigation.navigate("Chit"), badge: 0 },
            { label: "Cash", icon: "cash-multiple", color: "#1B5E20", bg: "#E8F5E9", nav: () => navigation.navigate("CashPage"), badge: quickAccessCounts.cash },
            { label: "Estimate", icon: "calculator-variant-outline", color: "#1A237E", bg: "#E8EAF6", nav: () => navigation.navigate("Estimate", { goldRate }), badge: quickAccessCounts.estimate },
            { label: "Customers", icon: "account-group-outline", color: "#880E4F", bg: "#FCE4EC", nav: () => navigation.navigate("CustomerDataList"), badge: quickAccessCounts.customer },
          ].map(({ label, icon, color, bg, nav, badge }) => (
            <TouchableOpacity key={label} style={[styles.quickGridTile, { backgroundColor: bg }]} onPress={nav} activeOpacity={0.8}>
              <View style={[styles.quickGridIconCircle, { backgroundColor: color }]}>
                <Icon name={icon} size={22} color="#FFD700" />
              </View>
              <Text style={[styles.quickGridLabel, { color }]}>{label}</Text>
              {badge > 0 && (
                <View style={styles.quickTileBadge}>
                  <Text style={styles.quickTileBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Report Button */}
        <TouchableOpacity
          style={styles.dailyReportBtn}
          onPress={() => navigation.navigate("DailyIssueReport")}
          activeOpacity={0.82}
        >
          <View style={styles.dailyReportIconWrap}>
            <Ionicons name="bar-chart-outline" size={22} color="#3D2800" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyReportTitle}>Daily Issue Report</Text>
            <Text style={styles.dailyReportSub}>B2B · Dealer · Suspense — combined totals</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#B8860B" />
        </TouchableOpacity>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        <FlatList
          data={filteredTransactions.slice(0, 10)}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "#B8860B" }}>
              {loading ? "Loading transactions..." : "No transactions found"}
            </Text>
          }
          renderItem={({ item }) => {
            if (!item || typeof item !== "object") return null;
            const displayType = resolveDisplayType(item);
            const name = resolveDisplayName(item);
            const { ob, ab } = resolveBalance(item);
            const displayDate = formatRecentTransactionDate(
              item.date || item.createdAt || item.updatedAt || item.lastTransactionDate
            );

            let balanceLabel = "OB";
            let balanceValue = 0;
            let balanceColor = "#C62828";
            if (ab > 0) {
              balanceLabel = "AB";
              balanceValue = Math.abs(ab);
              balanceColor = "#1B7A00";
            } else if (ob > 0) {
              balanceLabel = "OB";
              balanceValue = ob;
              balanceColor = "#C62828";
            } else {
              balanceLabel = displayType === "B2C" ? "AB" : "OB";
              balanceValue = 0;
              balanceColor = "#999";
            }

            const typeColors = {
              B2B: { bg: "#FFF3CD", text: "#7A5C00" },
              B2C: { bg: "#FFE0B2", text: "#5C3A00" },
              Dealer: { bg: "#EFEBE9", text: "#4E342E" },
            };
            const typeColor = typeColors[displayType] || { bg: "#FFF8E1", text: "#B8860B" };

            return (
              <TouchableOpacity
                style={styles.transactionCard}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("BillHistory", {
                    customer: buildCustomerForHistory(item),
                  })
                }
              >
                <View style={[styles.txnAccent, { backgroundColor: typeColor.text }]} />
                <View style={{ flex: 1, paddingLeft: 12, paddingVertical: 12 }}>
                  <Text style={styles.txnName}>{name}</Text>
                  {displayDate ? (
                    <Text style={styles.txnDate}>{displayDate}</Text>
                  ) : null}
                  <Text style={[styles.txnBalance, { color: balanceColor }]}>
                    {balanceLabel}: {Number(balanceValue).toFixed(3)} g
                  </Text>
                </View>
                <View style={[styles.customerTag, { backgroundColor: typeColor.bg }]}>
                  <Text style={[styles.customerText, { color: typeColor.text }]}>{displayType}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.bottomNavItem}>
          <Icon name="home" size={26} color="#FFD700" />
          <Text style={styles.bottomNavLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ReportScreen")} style={styles.bottomNavItem}>
          <Ionicons name="document-text-outline" color="#FFE082" size={26} />
          <Text style={styles.bottomNavLabel}>Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("B2BCalculationPage")}
        >
          <Icon name="plus" size={32} color="#3D2800" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Order")} style={styles.bottomNavItem}>
          <FontAwesome name="money" color="#FFE082" size={24} />
          <Text style={styles.bottomNavLabel}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Settings", { user })} style={styles.bottomNavItem}>
          <FontAwesome name="cog" color="#FFE082" size={24} />
          <Text style={styles.bottomNavLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Rate Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Rates & Dates</Text>

            <Text style={styles.modalLabel}>Gold Rate</Text>
            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={setGoldRate}
              keyboardType="numeric"
              placeholder="Enter Gold Rate"
              placeholderTextColor="#B8860B88"
            />

            <Text style={styles.modalLabel}>Gold Date</Text>
            <TextInput
              style={styles.input}
              value={goldDate}
              onChangeText={setGoldDate}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#B8860B88"
            />

            <Text style={styles.modalLabel}>FT Rate</Text>
            <TextInput
              style={styles.input}
              value={ftRate}
              onChangeText={setFtRate}
              keyboardType="numeric"
              placeholder="Enter FT Rate"
              placeholderTextColor="#B8860B88"
            />

            <Text style={styles.modalLabel}>FT Date</Text>
            <TextInput
              style={styles.input}
              value={ftDate}
              onChangeText={setFtDate}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#B8860B88"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 1,
  },

  sideMenu: {
    position: "absolute",
    width: 255,
    height: "100%",
    backgroundColor: "#3D2800",
    paddingTop: 55,
    paddingHorizontal: 18,
    zIndex: 2,
    elevation: 10,
  },
  sideMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#FFD70033",
    paddingBottom: 14,
  },
  menuTitle: { color: "#FFD700", fontSize: 19, fontWeight: "bold", marginLeft: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#FFD70020",
  },
  menuText: { color: "#FFF8E1", fontSize: 15, marginLeft: 14 },

  headerCenterText: { color: "#FFD700", fontSize: 16, fontWeight: "bold" },

  reminderBannerWrap: { marginHorizontal: 15, marginTop: 10, marginBottom: 2, zIndex: 6 },
  reminderBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 11,
    elevation: 5,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  reminderBannerMain: { flexDirection: "row", alignItems: "flex-start", flex: 1, paddingRight: 8 },
  reminderTitle: { fontSize: 13, fontWeight: "700", color: "#3D2800", marginBottom: 3 },
  reminderText: { fontSize: 12, color: "#7A5C00", marginBottom: 1 },
  reminderAmount: { fontSize: 13, fontWeight: "700", color: "#C62828", marginTop: 2 },
  reminderExtra: { fontSize: 11, color: "#B8860B", marginTop: 2 },
  reminderCloseBtn: { paddingTop: 2, paddingLeft: 4 },

  goldCard: {
    backgroundColor: "#3D2800",
    marginHorizontal: 15,
    marginTop: 18,
    borderRadius: 22,
    padding: 22,
    elevation: 6,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  dividerLine: { width: 1, height: 50, backgroundColor: "#FFD70040" },
  goldLabel: { color: "#FFD700", fontSize: 12, fontWeight: "bold", letterSpacing: 1.2 },
  goldRate: { color: "#FFFFFF", fontSize: 30, fontWeight: "bold", marginTop: 4 },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,215,0,0.2)",
    paddingTop: 12,
  },
  clockTextInside: { color: "#FFE082", fontSize: 13, fontWeight: "600", letterSpacing: 0.4 },
  cardEditIcon: { position: "absolute", top: 14, right: 15, padding: 5, zIndex: 5 },

  sectionTitle: {
    marginLeft: 18,
    marginTop: 22,
    marginBottom: 4,
    fontSize: 17,
    fontWeight: "bold",
    color: "#7A5C00",
    letterSpacing: 0.3,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 4,
  },
  quickGridTile: {
    width: "48%",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    position: "relative",
  },
  quickGridIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    elevation: 2,
  },
  quickGridLabel: { fontSize: 11, fontWeight: "700", textAlign: "center", letterSpacing: 0.2 },
  quickTileBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#B8860B",
    alignItems: "center",
    justifyContent: "center",
  },
  quickTileBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  transactionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    overflow: "hidden",
    minHeight: 80,
  },
  txnAccent: { width: 5, alignSelf: "stretch" },
  txnName: { fontSize: 15, fontWeight: "bold", color: "#3D2800" },
  txnDate: { color: "#B8860B", marginTop: 3, fontSize: 12 },
  txnBalance: { fontSize: 13, fontWeight: "700", marginTop: 5 },
  customerTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "center",
    marginRight: 12,
  },
  customerText: { fontWeight: "bold", fontSize: 12 },

  fab: {
    width: 56,
    height: 56,
    backgroundColor: "#FFD700",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    marginBottom: 10,
  },
  bottomNav: {
    height: 80,
    backgroundColor: "#3D2800",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1.5,
    borderColor: "#FFD70033",
    paddingBottom: 8,
    elevation: 8,
  },
  bottomNavItem: { alignItems: "center", justifyContent: "center" },
  bottomNavLabel: { color: "#FFE082", fontSize: 10, marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#FFF8E1",
    padding: 22,
    width: "88%",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3D2800",
    marginBottom: 16,
    textAlign: "center",
  },
  modalLabel: { color: "#7A5C00", marginBottom: 4, fontWeight: "600", fontSize: 13 },
  input: {
    borderWidth: 1.5,
    borderColor: "#FFD700",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
    color: "#3D2800",
    backgroundColor: "#fff",
  },
  saveBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
  },
  saveBtnText: { color: "#3D2800", fontWeight: "bold", fontSize: 15 },
  cancelBtn: {
    backgroundColor: "#EFEBE9",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7CCC8",
  },
  cancelBtnText: { color: "#4E342E", fontWeight: "bold", fontSize: 14 },

  dailyReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    marginHorizontal: 15,
    marginTop: 18,
    marginBottom: 4,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },
  dailyReportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 1,
  },
  dailyReportTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#3D2800",
    letterSpacing: 0.2,
  },
  dailyReportSub: {
    fontSize: 11,
    color: "#7A5C00",
    marginTop: 2,
  },
});

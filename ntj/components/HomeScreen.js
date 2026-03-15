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
import { buildReminderAlerts } from "./reminderService";

const OLD_BALANCE_REMINDER_SHOWN_KEY = "old_balance_reminder_shown_v2";
const REMINDER_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
const REMINDER_AUTO_HIDE_MS = 5000; // 5 seconds

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
  const [balanceLookup, setBalanceLookup] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [reminderBanner, setReminderBanner] = useState(null);
  const shownReminderStateRef = useRef({});
  const reminderStateLoadedRef = useRef(false);
  const reminderBannerRef = useRef(null);
  const reminderAutoHideRef = useRef(null);
  const reminderSlideY = useRef(new Animated.Value(-36)).current;
  const reminderOpacity = useRef(new Animated.Value(0)).current;
  const reminderDragX = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    fetchData();
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      console.log("Fetching rates from:", `${base_url}/rates`);
      const response = await fetch(`${base_url}/rates`);
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
      console.log("DB fetch failed, falling back to AsyncStorage. Error:", error.message);
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
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const toTs = (value) => {
        if (!value) return 0;
        const t = new Date(value).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      const normalizeName = (value) => String(value || "").trim().toLowerCase();
      const normalizeType = (row = {}) => {
        const dealerTag = String(row.dealerType || "").toUpperCase();
        if (dealerTag === "DEALER") return "Dealer";
        if (dealerTag === "SUPPLIER") return "Supplier";
        const raw = String(row.type || row.customerType || "").toUpperCase();
        if (raw === "B2C") return "B2C";
        if (raw === "B2B") return "B2B";
        if (raw === "DEALER") return "Dealer";
        if (raw === "SUPPLIER") return "Supplier";
        if (raw === "RETAIL") return "B2C";
        return "B2B";
      };
      const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

      const [b2bResponse, b2cResponse, dealersRes, customersRes, b2cCustomersRes, billRes] = await Promise.all([
        fetch(`${base_url}/transactions`),
        fetch(`${base_url}/retail`),
        fetch(`${base_url}/customersDealer`),
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/customersB2C`),
        fetch(`${base_url}/billSummary`),
      ]);

      const b2bData = b2bResponse.ok ? await b2bResponse.json() : [];
      const b2cData = b2cResponse.ok ? await b2cResponse.json() : [];
      const dealers = dealersRes.ok ? await dealersRes.json() : [];
      const customers = customersRes.ok ? await customersRes.json() : [];
      const b2cCustomers = b2cCustomersRes.ok ? await b2cCustomersRes.json() : [];
      const billRows = billRes.ok ? await billRes.json() : [];

      const lookup = {};
      const setBal = (key, ob, ab) => {
        if (!key) return;
        lookup[String(key).toLowerCase()] = {
          ob: parseFloat(ob || 0),
          ab: parseFloat(ab || 0),
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
        setBal(d._id, d.oldBalance, d.advanceBalance);
        setBal(d.customerId, d.oldBalance, d.advanceBalance);
        setBal(d.id, d.oldBalance, d.advanceBalance);
        setBal(d.customerName, d.oldBalance, d.advanceBalance);
        setBal(d.phoneNumber, d.oldBalance, d.advanceBalance);
        setBal(d.customerNumber, d.oldBalance, d.advanceBalance);
      });
      setBalanceLookup(lookup);

      const customerMap = {};
      dealers.forEach(d => { customerMap[d.customerName] = d.customerType || 'Dealer'; });
      customers.forEach(c => { customerMap[c.customerName] = c.customerType || 'B2B'; });
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
        .filter((t) => t.customerName || t.name)
        .map((t) => {
          const name = t.customerName || t.name;
          const derivedType = normalizeType({ ...t, customerType: t.customerType || customerMap[name] || t.type });
          const dealerHit = isDealerRecord(t);
          return {
            ...t,
            type: dealerHit ? "Dealer" : derivedType,
            isDealer: dealerHit,
            displayName: name,
            _sourcePriority: 2,
            _sortTs: toTs(t.updatedAt || t.createdAt || t.date || 0),
          };
        });

      const b2cMapped = (Array.isArray(b2cData) ? b2cData : [])
        .filter((t) => t.customerName || t.name)
        .map((t) => ({
          ...t,
          type: "B2C",
          displayName: t.customerName || t.name,
          _sourcePriority: 1,
          _sortTs: toTs(t.updatedAt || t.createdAt || t.date || 0),
        }));

      const billMapped = (Array.isArray(billRows) ? billRows : [])
        .filter((t) => t.customerName || t.name)
        .map((t) => {
          const dealerHit = isDealerRecord(t);
          return {
            ...t,
            type: dealerHit ? "Dealer" : normalizeType(t),
            isDealer: dealerHit,
            displayName: t.customerName || t.name,
            _sourcePriority: 3,
            _sortTs: toTs(t.updatedAt || t.createdAt || t.date || 0),
            oldBalance: t.oldBalance ?? t.ob ?? 0,
            advanceBalance: t.advanceBalance ?? t.advBal ?? 0,
            advBal: t.advBal ?? t.advanceBalance ?? 0,
          };
        });

      const merged = [...b2bMapped, ...billMapped, ...b2cMapped].sort(
        (a, b) =>
          ((b._sortTs || 0) - (a._sortTs || 0)) ||
          ((b._sourcePriority || 0) - (a._sourcePriority || 0)),
      );

      const uniqueLatestTransactions = [];
      const seenCustomers = new Set();

      for (const txn of merged) {
        const name = normalizeName(txn.displayName);
        const phoneKey = normalizePhone(
          txn.phone || txn.phoneNumber || txn.customerNumber || txn.mobileNumber || "",
        );
        // Use stable person-level identity to avoid id-shape mismatches between tx/bill collections.
        const dedupeKey = phoneKey || name;
        if (!seenCustomers.has(dedupeKey)) {
          seenCustomers.add(dedupeKey);
          uniqueLatestTransactions.push(txn);
        }
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
  }, [fetchData]);

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
      "NTJ Jewellery Payment Reminder",
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
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/customersB2C`),
        fetch(`${base_url}/transactions`),
        fetch(`${base_url}/retail`),
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

      const allAlerts = buildReminderAlerts({
        customers,
        transactions: transactionsForReminder,
        settings: { enabled: true, days: 3, inAppOnly: true },
        now: new Date(),
      });

      const pendingOldBalanceAlerts = allAlerts.filter(
        (a) => Number(a.pendingBalance || 0) > 0 && Number(a.overdueDays || 0) > 3
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
    }, [fetchData, checkOldBalanceReminders])
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
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("userSession");
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

  const filteredTransactions = transactions.filter((txn) => {
    const name = txn.customerName || txn.name || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "All" ||
      txn.type === filterType ||
      txn.customerType === filterType;
    return matchesSearch && matchesFilter;
  });

  const resolveBalance = (item) => {
    const itemCurrent = Number(item.currentBalance ?? item.availableBalance ?? item.balance);
    const itemOb = Number(item.oldBalance ?? item.ob);
    const itemAb = Number(item.advBal ?? item.advanceBalance);
    if (Number.isFinite(itemCurrent)) {
      return {
        ob: itemCurrent > 0 ? itemCurrent : 0,
        ab: itemCurrent < 0 ? Math.abs(itemCurrent) : (Number.isFinite(itemAb) ? itemAb : 0),
      };
    }
    if (Number.isFinite(itemOb) || Number.isFinite(itemAb)) {
      return {
        ob: Number.isFinite(itemOb) ? itemOb : 0,
        ab: Number.isFinite(itemAb) ? itemAb : 0,
      };
    }

    const keys = [
      item.customerId,
      item._id,
      item.id,
      item.customerName,
      item.displayName,
      item.phone,
      item.phoneNumber,
      item.customerNumber,
      item.mobileNumber,
    ]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase());

    for (const k of keys) {
      if (balanceLookup[k]) return balanceLookup[k];
    }

    return {
      ob: 0,
      ab: 0,
    };
  };

  const buildCustomerForHistory = (item = {}) => {
    const name = item.customerName || item.name || item.displayName || "";
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
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {menuOpen && (
        <TouchableOpacity style={styles.overlay} onPress={closeMenu} />
      )}

      {/* SIDE MENU */}
      <Animated.View style={[styles.sideMenu, { left: slideAnim }]}>
        <Text style={styles.menuTitle}>Menu</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Home")}
          >
            <Icon name="view-dashboard-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Dashboard</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Payments")}
          >
            <Icon name="view-dashboard-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("SD")}
          >
            <Icon name="view-dashboard-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>SD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("CustomerDataList")}
          >
            <Foundation name="database" color="#fff" size={24} />
            <Text style={styles.menuText}>Customer Data List</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("RetailTransaction")}
          >
            <Icon name="cash-register" size={25} color="#fff" />
            <Text style={styles.menuText}>Retail Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("SuspenseTransaction")}
          >
            <Icon name="alert-circle-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Suspense Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("StockMaster")}
          >
            <Icon name="alert-circle-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Stock Master</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Purchase")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("WorkerList")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Worker List</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Order")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("UPIControl")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>UPI Control</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("GSTPage")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>GST Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("CustomerGstPage")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>GST Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Document")}
          >
            <Icon name="file-document-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("DailyExpense")}
          >
            <Icon name="cash-multiple" size={25} color="#fff" />
            <Text style={styles.menuText}>Daily Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Dealer")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Dealer List</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Settings")}
          >
            <Icon name="account-group-outline" size={25} color="#fff" />
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuNavigation("Logout")}
          >
            <Icon name="logout" size={25} color="#fff" />
            <Text style={styles.menuText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <CommonHeader
        title="Hey! Super Admin"
        backgroundColor="#1B4D1B"
        left={
        <TouchableOpacity onPress={openMenu}>
        <Icon name="menu" size={30} color="#fff" />
        </TouchableOpacity>
        }
        right={
        <TouchableOpacity onPress={handleRefresh}>
        <Icon name="refresh" size={28} color="#fff" />
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
                <Icon name="bell-ring-outline" size={22} color="#C62828" style={{ marginRight: 10 }} />
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
                <Icon name="close" size={18} color="#666" />
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
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.goldLabel}>FT RATE</Text>
              <Text style={styles.goldRate}>₹{ftRate}</Text>
            </View>
          </View>

          <View style={styles.cardBottomRow}>
            <Icon name="clock-outline" size={14} color="#FFD700" style={{ marginRight: 6 }} />
            <Text style={styles.clockTextInside}>{formatDateTime(currentDateTime)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Access</Text>

        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() =>
              navigation.navigate("B2BCalculationPage", { ftRate })
            }
          >
            <Text style={styles.quickTileText}>B2B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() =>
              navigation.navigate("B2CCalculationPage", { goldRate })
            }
          >
            <Text style={styles.quickTileText}>B2C</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("StockMaster")}
          >
            <Text style={styles.quickTileText}>StockMaster</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("ItemEntry")}
          >
            <Text style={styles.quickTileText}>Item Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("Estimate", { goldRate })}
          >
            <Text style={styles.quickTileText}>Estimate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("CustomerDataList")}
          >
            <Text style={styles.quickTileText}>Customer</Text>
            <Text style={styles.quickTileText}>Data List</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        <FlatList
          data={filteredTransactions.slice(0, 10)}
          keyExtractor={(item) =>
            item._id || item.id || Math.random().toString()
          }
          scrollEnabled={false}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", marginTop: 20, color: "#999" }}
            >
              {loading ? "Loading transactions..." : "No transactions found"}
            </Text>
          }
          renderItem={({ item }) => {
            const displayType = item.isDealer ? "Dealer" : item.type;
            const isB2C = displayType === "B2C";
            const name = item.displayName;
            const { ob, ab } = resolveBalance(item);

            let balanceLabel = "OB";
            let balanceValue = 0;
            let balanceColor = "#D32F2F";
            if (ab > 0) {
              balanceLabel = "AB";
              balanceValue = Math.abs(ab);
              balanceColor = "#2E7D32";
            } else if (ob > 0) {
              balanceLabel = "OB";
              balanceValue = ob;
              balanceColor = "#D32F2F";
            } else {
              balanceLabel = isB2C ? "AB" : "OB";
              balanceValue = 0;
            }

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
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnName}>{name}</Text>
                  <Text
                    style={[
                      styles.txnWeight,
                      { color: balanceColor, fontWeight: "700", marginTop: 5 },
                    ]}
                  >
                    {balanceLabel}: {Number(balanceValue).toFixed(3)}g
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={[
                      styles.customerTag,
                      {
                        backgroundColor: displayType === "B2C" ? "#E3F2FD" : displayType === "B2B" ? "#E2FBE8" : "#FFF3E0",
                        marginLeft: 10,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.customerText,
                        { color: displayType === "B2C" ? "#1565C0" : displayType === "B2B" ? "#1B4D1B" : "#E65100" },
                      ]}
                    >
                      {displayType}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="home-outline" size={28} color="#2E7D32" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ReportScreen")}>
          <Ionicons name="document-outline" color="#000" size={28} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("B2BCalculationPage")}
        >
          <Icon name="plus" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Order")}>
          <FontAwesome
            name="money"
            color="#555"
            size={28}
            style={{ bottom: -1, marginLeft: 20 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Settings", { user })}>
          <FontAwesome
            name="cog"
            color="#555"
            size={28}
            style={{ bottom: -1, marginLeft: 5 }}
          />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Rates & Dates</Text>

            <Text style={{ color: "#666", marginBottom: 4 }}>Gold Rate</Text>
            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={setGoldRate}
              keyboardType="numeric"
              placeholder="Enter Gold Rate"
            />

            <Text style={{ color: "#666", marginBottom: 4 }}>Gold Date</Text>
            <TextInput
              style={styles.input}
              value={goldDate}
              onChangeText={setGoldDate}
              placeholder="DD-MM-YYYY"
            />

            <Text style={{ color: "#666", marginBottom: 4 }}>FT Rate</Text>
            <TextInput
              style={styles.input}
              value={ftRate}
              onChangeText={setFtRate}
              keyboardType="numeric"
              placeholder="Enter FT Rate"
            />

            <Text style={{ color: "#666", marginBottom: 4 }}>FT Date</Text>
            <TextInput
              style={styles.input}
              value={ftDate}
              onChangeText={setFtDate}
              placeholder="DD-MM-YYYY"
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
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1,
  },
  sideMenu: {
    position: "absolute",
    width: 250,
    height: "100%",
    backgroundColor: "#1B4D1B",
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  menuTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  menuText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
  header: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 45,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    height: 120,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 10,
    top: 25,
  },
  reminderBannerWrap: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 2,
    zIndex: 6,
  },
  reminderBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 11,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  reminderBannerMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    paddingRight: 8,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  reminderText: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 1,
  },
  reminderAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    marginTop: 2,
  },
  reminderExtra: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  reminderCloseBtn: {
    paddingTop: 2,
    paddingLeft: 4,
  },
  goldCard: {
    backgroundColor: "#1B4D1B",
    marginHorizontal: 15,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  goldLabel: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  goldRate: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.2)",
    paddingTop: 12,
  },
  clockTextInside: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  liveRate: {
    display: 'none',
  },
  liveDate: {
    display: 'none',
  },
  cardEditIcon: {
    position: "absolute",
    top: 80,
    right: 15,
    padding: 5,
    zIndex: 5,
  },
  dateTimeContainer: {
    display: 'none',
  },
  editBtn: {
    display: 'none',
  },
  sectionTitle: {
    marginLeft: 20,
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
    bottom: 5,
  },
  quickAccessRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 15,
  },
  quickTile: {
    backgroundColor: "#F4F4F4",
    width: 110,
    height: 90,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  quickTileText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  transactionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 3,
  },
  txnName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  txnWeight: {
    color: "#444",
    marginTop: 3,
  },
  customerTag: {
    backgroundColor: "#E2FBE8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "center",
  },
  customerText: {
    color: "#1B4D1B",
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    bottom: 70,
    right: "43%",
    width: 60,
    height: 60,
    backgroundColor: "#1B4D1B",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  bottomNav: {
    height: 100,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    width: "85%",
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#000",
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterBtnText: {
    fontWeight: "bold",
    color: "#1B4D1B",
    marginRight: 5,
  },
  dropdown: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    elevation: 3,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
});

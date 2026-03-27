import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Platform,
  Alert,
  Linking,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import Icon from "react-native-vector-icons/Feather";
import { base_url } from "./config";

export default function ReportScreen({ navigation }) {

  // ================= STATES =================
  const [fromDateObj, setFromDateObj] = useState(null);
  const [toDateObj, setToDateObj] = useState(null);

  // Separate states for the actively filtering dates (updated ONLY on Search click)
  const [appliedFromDateObj, setAppliedFromDateObj] = useState(null);
  const [appliedToDateObj, setAppliedToDateObj] = useState(null);
  const [hasAppliedDateRange, setHasAppliedDateRange] = useState(false);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Real Database States
  const [b2bData, setB2bData] = useState([]);
  const [b2cData, setB2cData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [cashData, setCashData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [itemTouchMap, setItemTouchMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Current balance lookup maps
  const [b2bBalances, setB2bBalances] = useState({});
  const [b2cBalances, setB2cBalances] = useState({});
  const [dealerBalances, setDealerBalances] = useState({});
  const [b2bPhones, setB2bPhones] = useState({});
  const [b2cPhones, setB2cPhones] = useState({});
  const [dealerPhones, setDealerPhones] = useState({});

  // Individual search and filter states for each table
  const [b2bSearch, setB2bSearch] = useState("");
  const [dealerSearch, setDealerSearch] = useState("");
  const [b2cSearch, setB2cSearch] = useState("");
  const [kadaiSearch, setKadaiSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [cashSearch, setCashSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const [selectedB2bItem, setSelectedB2bItem] = useState("");
  const [selectedB2cItem, setSelectedB2cItem] = useState("");
  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState("");
  const [selectedReceiptItem, setSelectedReceiptItem] = useState("");
  const [selectedCashItem, setSelectedCashItem] = useState("");
  const [selectedStockItem, setSelectedStockItem] = useState("");

  const [showB2bDropdown, setShowB2bDropdown] = useState(false);
  const [showB2cDropdown, setShowB2cDropdown] = useState(false);
  const [showPurchaseDropdown, setShowPurchaseDropdown] = useState(false);
  const [showReceiptDropdown, setShowReceiptDropdown] = useState(false);
  const [showCashDropdown, setShowCashDropdown] = useState(false);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // ================= HELPER FUNCTION =================
  const reportTabs = useMemo(() => {
    const tabs = ["B2B", "Dealer", "B2C", "Kadai", "Purchase", "Receipt", "Cash", "Expense", "Stock", "All"];
    const seen = new Set();
    return tabs.filter((t) => {
      const key = String(t || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return "N/A";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const formatDateTime = (date) => {
    if (!date || isNaN(date.getTime())) return "N/A";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${year}-${month}-${day} ${time}`;
  };
  const formatApiDate = (date) => {
    if (!date || isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const getStartOfDay = (value = new Date()) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const getEndOfDay = (value = new Date()) => {
    const d = new Date(value);
    d.setHours(23, 59, 59, 999);
    return d;
  };
  const getEffectiveAppliedRange = () => {
    if (hasAppliedDateRange && appliedFromDateObj && appliedToDateObj) {
      return {
        from: getStartOfDay(appliedFromDateObj),
        to: getEndOfDay(appliedToDateObj),
        isCustom: true,
      };
    }
    const now = new Date();
    return {
      from: getStartOfDay(now),
      to: getEndOfDay(now),
      isCustom: false,
    };
  };
  const displayPhone = (value) => {
    const raw = value === undefined || value === null ? "" : String(value).trim();
    return raw ? raw : "-";
  };
  const formatMainBillNo = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "-";
    const n = Number.parseInt(digits, 10);
    if (!Number.isFinite(n) || n <= 0) return "-";
    return String(n).padStart(5, "0");
  };
  const getReportApiId = (row = {}) =>
    String(row?._id || row?.id || "").trim();
  const getReportBillNo = (row = {}) => {
    const direct = formatMainBillNo(
      row?.billNo || row?.invoiceNo || row?.billNumber || row?.mainBillNo
    );
    if (direct !== "-") return direct;
    const apiId = getReportApiId(row);
    return apiId ? apiId.slice(-6).toUpperCase() : "-";
  };
  const parseRecordDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === "object" && value.$date) {
      const d = new Date(value.$date);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === "number") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === "string") {
      const raw = value.trim();

      // DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
      if (raw.includes("/")) {
        const [datePart, timePart] = raw.split(" ");
        const parts = datePart.split("/");
        if (parts.length === 3) {
          const [dd, mm, yy] = parts.map(Number);
          const dt = new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
          if (timePart) {
            const [h = 0, m = 0, s = 0] = timePart.split(":").map(Number);
            dt.setHours(h || 0, m || 0, s || 0, 0);
          }
          if (!isNaN(dt.getTime())) return dt;
        }
      }

      // DD-MM-YYYY or DD-MM-YYYY HH:mm:ss
      if (raw.includes("-")) {
        const [datePart, timePart] = raw.split(" ");
        const parts = datePart.split("-");
        if (parts.length === 3 && parts[0].length <= 2) {
          const [dd, mm, yy] = parts.map(Number);
          const dt = new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
          if (timePart) {
            const [h = 0, m = 0, s = 0] = timePart.split(":").map(Number);
            dt.setHours(h || 0, m || 0, s || 0, 0);
          }
          if (!isNaN(dt.getTime())) return dt;
        }
      }

      // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
      if (raw.includes("-")) {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) return parsed;
        const datePart = raw.split("T")[0];
        const parts = datePart.split("-");
        if (parts.length === 3) {
          const [yy, mm, dd] = parts.map(Number);
          const local = new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
          if (!isNaN(local.getTime())) return local;
        }
      }

      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // ================= FETCH ALL DATA =================
  const fetchBillRows = async (billType, query) => {
    const primaryUrl = `${base_url}/billSummary?billType=${billType}${query ? `&${query}` : ""}`;
    console.log(`[ReportScreen] Fetching ${billType} -> ${primaryUrl}`);
    let res = await fetch(primaryUrl);
    let rows = [];
    if (res.ok) {
      rows = await res.json();
      console.log(`[ReportScreen] ${billType} primary response count:`, Array.isArray(rows) ? rows.length : 0);
    } else {
      console.log(`[ReportScreen] ${billType} primary response failed with status:`, res.status);
    }

    // Backend date parsing differences can occasionally return empty rows.
    // Fallback to type-only fetch and keep strict date filtering on frontend.
    if (!Array.isArray(rows) || rows.length === 0) {
      const fallbackUrl = `${base_url}/billSummary?billType=${billType}`;
      console.log(`[ReportScreen] ${billType} fallback fetch -> ${fallbackUrl}`);
      res = await fetch(fallbackUrl);
      if (res.ok) {
        rows = await res.json();
        console.log(`[ReportScreen] ${billType} fallback response count:`, Array.isArray(rows) ? rows.length : 0);
      } else {
        console.log(`[ReportScreen] ${billType} fallback response failed with status:`, res.status);
      }
    }

    const normalizedRows = Array.isArray(rows)
      ? rows.map((row) => ({
          ...row,
          id: row?.id || row?._id || "",
        }))
      : [];
    return normalizedRows;
  };

  const fetchBillDataByType = async (tabToFetch, fromDate, toDate) => {
    const effectiveRange =
      hasAppliedDateRange && fromDate && toDate
        ? { from: getStartOfDay(fromDate), to: getEndOfDay(toDate) }
        : { from: getStartOfDay(new Date()), to: getEndOfDay(new Date()) };
    const fromDateParam = formatApiDate(effectiveRange.from);
    const toDateParam = formatApiDate(effectiveRange.to);
    const hasDates = Boolean(fromDateParam && toDateParam);
    const query = hasDates
      ? `fromDate=${encodeURIComponent(fromDateParam)}&toDate=${encodeURIComponent(toDateParam)}`
      : "";
    const fromStart = effectiveRange.from;
    const toEnd = effectiveRange.to;
    console.log("[ReportScreen] Fetch params:", {
      selectedType: tabToFetch,
      fromDate: fromDateParam || null,
      toDate: toDateParam || null,
      fromStart: fromStart ? fromStart.toISOString() : null,
      toEnd: toEnd ? toEnd.toISOString() : null,
    });

    if (tabToFetch === "B2B") {
      const b2b = await fetchBillRows("B2B", query);
      setB2bData(Array.isArray(b2b) ? b2b : []);
      setB2cData([]);
      console.log("[ReportScreen] B2B state updated:", Array.isArray(b2b) ? b2b.length : 0);
      return;
    }

    if (tabToFetch === "Dealer") {
      const dealerRows = await fetchBillRows("B2B", query);
      setB2bData(Array.isArray(dealerRows) ? dealerRows : []);
      setB2cData([]);
      console.log("[ReportScreen] Dealer state updated:", Array.isArray(dealerRows) ? dealerRows.length : 0);
      return;
    }

    if (tabToFetch === "B2C") {
      const b2c = await fetchBillRows("B2C", query);
      setB2bData([]);
      setB2cData(Array.isArray(b2c) ? b2c : []);
      console.log("[ReportScreen] B2C state updated:", Array.isArray(b2c) ? b2c.length : 0);
      return;
    }

    if (tabToFetch === "Kadai") {
      const b2c = await fetchBillRows("B2C", query);
      setB2bData([]);
      setB2cData(Array.isArray(b2c) ? b2c : []);
      console.log("[ReportScreen] Kadai state updated from B2C rows:", Array.isArray(b2c) ? b2c.length : 0);
      return;
    }

    // All / other tabs: fetch both so All report can render combined data.
    const [b2b, b2c] = await Promise.all([
      fetchBillRows("B2B", query),
      fetchBillRows("B2C", query),
    ]);
    setB2bData(Array.isArray(b2b) ? b2b : []);
    setB2cData(Array.isArray(b2c) ? b2c : []);
    console.log("[ReportScreen] ALL state updated:", {
      b2b: Array.isArray(b2b) ? b2b.length : 0,
      b2c: Array.isArray(b2c) ? b2c.length : 0,
    });
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        purchaseRes,
        paymentsRes,
        cashRes,
        stockRes,
        itemsRes,
        b2bCustRes,
        b2cCustRes,
        dealerCustRes,
      ] = await Promise.all([
        fetch(`${base_url}/purchases`),
        fetch(`${base_url}/payments`),
        fetch(`${base_url}/cashReceived`),
        fetch(`${base_url}/stockMaster`),
        fetch(`${base_url}/items`),
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/customersB2C`),
        fetch(`${base_url}/customersDealer`),
        fetch(`${base_url}/dailyExpenses`),
      ]);

      if (purchaseRes.ok) setPurchaseData(await purchaseRes.json());
      if (paymentsRes.ok) setPaymentData(await paymentsRes.json());
      if (cashRes.ok) setCashData(await cashRes.json());
      const dailyRes = await fetch(`${base_url}/dailyExpenses`);
      if (dailyRes.ok) setExpenseData(await dailyRes.json());
      if (stockRes.ok) {
        const stockRows = await stockRes.json();
        console.log("[ReportScreen] Stock response count:", Array.isArray(stockRows) ? stockRows.length : 0);
        setStocks(Array.isArray(stockRows) ? stockRows : []);
      }
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        const map = {};
        (Array.isArray(items) ? items : []).forEach((it) => {
          const touchValues = {
            buyingTouch: it?.buyingTouch,
            sellingTouch: it?.sellingTouch,
          };
          if (it?.stockName) map[it.stockName] = touchValues;
          if (it?.itemName) map[it.itemName] = touchValues;
          if (it?.name) map[it.name] = touchValues;
        });
        setItemTouchMap(map);
      }

      // Build customer current balance maps
      if (b2bCustRes.ok) {
        const b2bCusts = await b2bCustRes.json();
        const bMap = {};
        const pMap = {};
        b2bCusts.forEach(c => {
          const bal = { ob: parseFloat(c.oldBalance || 0), ab: parseFloat(c.advanceBalance || 0) };
          const phone = c.phone || c.phoneNumber || c.mobileNumber || c.mobile || "";
          if (c.customerName) bMap[c.customerName] = bal;
          if (c.name) bMap[c.name] = bal;
          if (c._id) bMap[c._id] = bal;
          if (c.customerId) bMap[c.customerId] = bal;
          if (c.customerName) pMap[c.customerName] = phone;
          if (c.name) pMap[c.name] = phone;
          if (c._id) pMap[c._id] = phone;
          if (c.customerId) pMap[c.customerId] = phone;
        });
        setB2bBalances(bMap);
        setB2bPhones(pMap);
      }
      if (b2cCustRes.ok) {
        const b2cCusts = await b2cCustRes.json();
        const cMap = {};
        const pMap = {};
        b2cCusts.forEach(c => {
          const bal = { ob: parseFloat(c.oldBalance || 0), ab: parseFloat(c.advanceBalance || 0) };
          const phone = c.phone || c.phoneNumber || c.mobileNumber || c.mobile || "";
          if (c.customerName) cMap[c.customerName] = bal;
          if (c.phoneNumber) cMap[c.phoneNumber] = bal;
          if (c.mobileNumber) cMap[c.mobileNumber] = bal;
          if (c.customerName) pMap[c.customerName] = phone;
          if (c.phoneNumber) pMap[c.phoneNumber] = phone;
          if (c.mobileNumber) pMap[c.mobileNumber] = phone;
        });
        setB2cBalances(cMap);
        setB2cPhones(pMap);
      }
      if (dealerCustRes.ok) {
        const dealerCusts = await dealerCustRes.json();
        const dMap = {};
        const pMap = {};
        (Array.isArray(dealerCusts) ? dealerCusts : []).forEach((c) => {
          const bal = {
            ob: parseFloat(c.oldBalance || 0),
            ab: parseFloat(c.advanceBalance || 0),
          };
          const phone = c.phone || c.phoneNumber || c.customerNumber || "";
          const keys = [
            c._id,
            c.id,
            c.customerId,
            c.customerName,
            c.name,
          ].filter(Boolean);
          keys.forEach((k) => {
            dMap[String(k)] = bal;
            pMap[String(k)] = phone;
          });
        });
        setDealerBalances(dMap);
        setDealerPhones(pMap);
      }

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ================= UPDATE DATE TIME =================
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchAllData();
      fetchBillDataByType(activeTab, appliedFromDateObj, appliedToDateObj).catch((e) =>
        console.error("Failed to refresh report data on focus:", e)
      );
    });
    return unsubscribe;
  }, [navigation, activeTab, appliedFromDateObj, appliedToDateObj]);

  useEffect(() => {
    fetchBillDataByType(activeTab, appliedFromDateObj, appliedToDateObj).catch((e) => {
      console.error("Failed to fetch filtered bill data:", e);
      Alert.alert("Error", "Failed to load report data for selected date range.");
    });
  }, [activeTab, appliedFromDateObj, appliedToDateObj]);

  // Replaced sample data with fetching from database

  // ================= DATE PICKER (FIXED) =================

  const onFromDateChange = (event, selectedDate) => {
    if (event?.type === 'dismissed') {
      setShowFromPicker(false);
      return;
    }

    if (selectedDate) {
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0);
      setFromDateObj(d);
    }

    setShowFromPicker(false);
  };

  const onToDateChange = (event, selectedDate) => {
    if (event?.type === 'dismissed') {
      setShowToPicker(false);
      return;
    }

    if (selectedDate) {
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0);

      if (fromDateObj && d < fromDateObj) {
        Alert.alert("Invalid Selection", "The 'To Date' cannot be earlier than the 'From Date'.");
      } else {
        setToDateObj(d);
      }
    }

    setShowToPicker(false);
  };

  const validateDateRangeOrAlert = () => {
    const hasFrom = Boolean(fromDateObj);
    const hasTo = Boolean(toDateObj);
    if (!hasFrom && !hasTo) return true;
    if (hasFrom !== hasTo) {
      Alert.alert("Validation", "Please select both From Date and To Date to apply date filtering.");
      return false;
    }
    if (toDateObj < fromDateObj) {
      Alert.alert("Validation", "To Date cannot be earlier than From Date.");
      return false;
    }
    return true;
  };

  // ================= DATE FILTER =================
  const filterByDate = (list) => {
    if (!list || !Array.isArray(list)) return [];
    const effectiveRange = getEffectiveAppliedRange();
    return list.filter(item => {
      const dateToCheck = item?.createdAt || item?.date;
      if (!dateToCheck) return false;

      const itemDate = parseRecordDate(dateToCheck);
      if (!itemDate) return false;

      return itemDate >= effectiveRange.from && itemDate <= effectiveRange.to;
    });
  };

  const getB2BItems = (r) => [
    ...(r.issueItems || []).map(it => it?.name || it?.item || ""),
    ...(r.receiptItems || []).map(it => it?.name || it?.item || ""),
  ].filter(Boolean);

  const getB2CItems = (r) => {
    const fromItems = (r.items || []).map(it => it.displayItemName || it.itemName || it.name || "");
    if (fromItems.length > 0) return fromItems.filter(Boolean);
    return (r.issueItems || []).map(it => it.name || it.item || "").filter(Boolean);
  };

  const getB2BPhone = (r = {}) =>
    displayPhone(
      r.phone ||
      r.phoneNumber ||
      r.mobile ||
      r.mobileNumber ||
      b2bPhones[r.customerId] ||
      b2bPhones[r.customerName]
    );

  const getB2CPhone = (r = {}) =>
    displayPhone(
      r.phone ||
      r.phoneNumber ||
      r.mobile ||
      r.mobileNumber ||
      b2cPhones[r.mobileNumber] ||
      b2cPhones[r.phone] ||
      b2cPhones[r.customerName]
    );

  const getKadaiAmountValue = (r = {}) => {
    const n = Number(r?.kadaiAmount);
    return Number.isFinite(n) ? n : 0;
  };

  const getGenericPhone = (r = {}) =>
    displayPhone(
      r.phone ||
      r.phoneNumber ||
      r.mobile ||
      r.mobileNumber ||
      r.customerPhone ||
      r.supplierPhone ||
      r.selectedDealerPhone ||
      b2bPhones[r.customerName] ||
      b2cPhones[r.customerName] ||
      b2bPhones[r.supplierName] ||
      b2bPhones[r.selectedDealer]
    );

  const getFilteredB2B = () =>
    filterByDate(b2bData).filter(r => {
      const nameMatch = (r.customerName || "").toLowerCase().includes(b2bSearch.toLowerCase());
      const itemMatch = selectedB2bItem ? getB2BItems(r).includes(selectedB2bItem) : true;
      return nameMatch && itemMatch;
    });

  const getDealerPhone = (r = {}) =>
    displayPhone(
      r.phone ||
      r.phoneNumber ||
      r.mobile ||
      r.mobileNumber ||
      dealerPhones[String(r.customerId || "")] ||
      dealerPhones[String(r.customerName || "")] ||
      b2bPhones[r.customerId] ||
      b2bPhones[r.customerName]
    );

  const getDealerBalanceLabel = (r = {}) => {
    const keyById = String(r.customerId || "");
    const keyByName = String(r.customerName || "");
    const mapped = dealerBalances[keyById] || dealerBalances[keyByName] || {
      ob: parseFloat(r.oldBalance || 0),
      ab: parseFloat(r.advBal || 0),
    };
    const ob = Number(mapped.ob || 0);
    const ab = Number(mapped.ab || 0);
    if (ab > 0) return { label: `AB: ${ab.toFixed(3)}`, color: "#2E7D32" };
    if (ob > 0) return { label: `OB: ${ob.toFixed(3)}`, color: "#D32F2F" };
    return { label: "-", color: "#666" };
  };

  const getFilteredDealer = () =>
    filterByDate(b2bData).filter((r) => {
      const billType = String(r?.billType || r?.customerType || r?.type || "").toUpperCase();
      const dealerType = String(r?.dealerType || "").toUpperCase();
      const isDealerRow =
        dealerType === "DEALER" ||
        dealerType === "SUPPLIER" ||
        billType === "DEALER" ||
        billType === "SUPPLIER" ||
        Boolean(
          dealerBalances[String(r?.customerId || "")] ||
          dealerBalances[String(r?.customerName || "")]
        );
      const search = dealerSearch.toLowerCase();
      const name = String(r?.customerName || "").toLowerCase();
      const phone = String(getDealerPhone(r) || "").toLowerCase();
      return isDealerRow && (name.includes(search) || phone.includes(search));
    });

  const getFilteredB2C = () =>
    filterByDate(b2cData).filter(r => {
      const nameMatch = (r.customerName || "").toLowerCase().includes(b2cSearch.toLowerCase());
      const phoneMatch = (r.phone || r.mobileNumber || "").includes(b2cSearch);
      const itemFilter = selectedB2cItem ? getB2CItems(r).includes(selectedB2cItem) : true;
      return (nameMatch || phoneMatch) && itemFilter;
    });

  const getFilteredKadai = () =>
    filterByDate(b2cData).filter((r) => {
      if (getKadaiAmountValue(r) <= 0) return false;
      const q = String(kadaiSearch || "").toLowerCase();
      if (!q) return true;
      const name = String(r.customerName || "").toLowerCase();
      const phone = String(getB2CPhone(r) || "").toLowerCase();
      const amount = getKadaiAmountValue(r).toFixed(2);
      return name.includes(q) || phone.includes(q) || amount.includes(q);
    });

  const getFilteredPurchase = () =>
    filterByDate(purchaseData).filter(p =>
      (p.supplierName || "").toLowerCase().includes(purchaseSearch.toLowerCase())
    );

  const getFilteredReceipt = () =>
    filterByDate(
      paymentData.filter(
        p => !receiptSearch || (p.selectedItems || []).some(si => si.toLowerCase().includes(receiptSearch.toLowerCase()))
      )
    );

  const deriveCashCategory = (r = {}, fallbackType = "B2B") => {
    const dealerType = String(r?.dealerType || "").toUpperCase();
    const customerType = String(r?.customerType || r?.type || "").toUpperCase();
    const billType = String(r?.billType || fallbackType || "").toUpperCase();
    if (dealerType === "DEALER" || dealerType === "SUPPLIER" || customerType === "DEALER" || customerType === "SUPPLIER") {
      return "Dealer";
    }
    if (billType === "B2C" || customerType === "B2C") return "B2C";
    return "B2B";
  };

  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const cashReportRows = useMemo(() => {
    const rows = [];
    const pushFromBill = (billRow, fallbackType) => {
      const category = deriveCashCategory(billRow, fallbackType);
      const createdAt = billRow?.createdAt || billRow?.date || null;
      const cashTableRows = Array.isArray(billRow?.cashTable) ? billRow.cashTable : [];

      if (cashTableRows.length > 0) {
        cashTableRows.forEach((c, idx) => {
          const amount = parseNum(c?.rupees ?? c?.cashAmount);
          const pure = parseNum(c?.pure ?? c?.cashPure);
          if (amount <= 0 && pure <= 0) return;
          rows.push({
            id: `${billRow?._id || billRow?.id || billRow?.invoiceNo || "bill"}-cash-${idx}`,
            cashAmount: amount,
            pureValue: pure,
            category,
            createdAt,
            date: createdAt,
            customerName: billRow?.customerName || "",
          });
        });
        return;
      }

      const amountFallback = parseNum(billRow?.cashAmount);
      const pureFallback = parseNum(billRow?.cashPure);
      if (amountFallback <= 0 && pureFallback <= 0) return;
      rows.push({
        id: `${billRow?._id || billRow?.id || billRow?.invoiceNo || "bill"}-cash-fallback`,
        cashAmount: amountFallback,
        pureValue: pureFallback,
        category,
        createdAt,
        date: createdAt,
        customerName: billRow?.customerName || "",
      });
    };

    (Array.isArray(b2bData) ? b2bData : []).forEach((r) => pushFromBill(r, "B2B"));
    (Array.isArray(b2cData) ? b2cData : []).forEach((r) => pushFromBill(r, "B2C"));

    return rows.sort(
      (a, b) =>
        (parseRecordDate(b?.createdAt || b?.date)?.getTime() || 0) -
        (parseRecordDate(a?.createdAt || a?.date)?.getTime() || 0)
    );
  }, [b2bData, b2cData]);

  const getFilteredCash = () =>
    filterByDate(cashReportRows).filter(r => {
      const q = cashSearch.toLowerCase();
      return (
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q)
      );
    });

  const getFilteredExpense = () =>
    filterByDate(expenseData).filter((r) => {
      const q = expenseSearch.toLowerCase();
      return (
        (r.expenseName || "").toLowerCase().includes(q) ||
        (r.workerName || "").toLowerCase().includes(q) ||
        (r.phoneNumber || "").includes(q)
      );
    });

  const getStockItemName = (r = {}) =>
    r.itemName || r.stockName || r.name || "";

  const parseOptionalNumber = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    let n = Number(value);
    if (!Number.isFinite(n) && typeof value === "string") {
      // Supports persisted values like "50.475 g"
      const cleaned = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      n = cleaned ? Number(cleaned[0]) : NaN;
    }
    return Number.isFinite(n) ? n : null;
  };

  const getStockItemWeightValue = (r = {}) => {
    const candidates = [r.availableWeight, r.netWeight, r.weight];
    for (const c of candidates) {
      const n = parseOptionalNumber(c);
      if (n !== null) return n;
    }
    return null;
  };

  const getStockItemWeight = (r = {}) =>
    Number(getStockItemWeightValue(r) || 0);

  const getStockItemWeightDisplay = (r = {}) => {
    const n = getStockItemWeightValue(r);
    return n === null ? "-" : `${n.toFixed(3)} g`;
  };

  const getStockItemPurityValue = (r = {}) => {
    // 1) Direct stored purity fields from stock master
    const directCandidates = [r.pure, r.purity, r.itemPurity, r.pureWeight, r.totalPure];
    let direct = null;
    for (const c of directCandidates) {
      const n = parseOptionalNumber(c);
      if (n !== null) {
        direct = n;
        break;
      }
    }

    // 2) Compute like StockMaster card (touch * netWeight / 100)
    const wt = getStockItemWeightValue(r);
    const calcFromRow = parseOptionalNumber(r.calculation);
    const calcFromItems = parseOptionalNumber(itemTouchMap[getStockItemName(r)]?.buyingTouch);
    const calc = calcFromRow ?? calcFromItems;
    const computed = wt !== null && calc !== null ? (calc * wt) / 100 : null;

    // If stored purity is 0 but computed purity exists, prefer computed value (handles stale pure=0 rows).
    if (direct !== null) {
      if (direct === 0 && computed !== null && computed !== 0) return computed;
      return direct;
    }
    return computed;
  };

  const getStockItemPurity = (r = {}) => {
    const n = getStockItemPurityValue(r);
    if (n !== null) return n.toFixed(3);
    const purityRaw = r.pure ?? r.purity ?? r.itemPurity ?? r.pureWeight ?? r.totalPure;
    return purityRaw ? String(purityRaw) : "-";
  };

  const getStockBuyingTouch = (r = {}) => {
    const rowValue = r.buyingTouch ?? r.buyTouch ?? r.buy;
    if (rowValue !== null && rowValue !== undefined && String(rowValue).trim() !== "") {
      return String(rowValue);
    }
    const byItem = itemTouchMap[getStockItemName(r)]?.buyingTouch;
    return byItem !== null && byItem !== undefined && String(byItem).trim() !== "" ? String(byItem) : "-";
  };

  const getStockSellingTouch = (r = {}) => {
    const rowValue = r.sellingTouch ?? r.sellTouch ?? r.sell;
    if (rowValue !== null && rowValue !== undefined && String(rowValue).trim() !== "") {
      return String(rowValue);
    }
    const byItem = itemTouchMap[getStockItemName(r)]?.sellingTouch;
    return byItem !== null && byItem !== undefined && String(byItem).trim() !== "" ? String(byItem) : "-";
  };

  const getFilteredStock = (forceAllCategories = false) => {
    const source = Array.isArray(stocks) ? stocks : [];
    const base = forceAllCategories
      ? source
      : source.filter(r =>
        getStockItemName(r).toLowerCase().includes(stockSearch.toLowerCase()) &&
        (selectedStockItem ? getStockItemName(r) === selectedStockItem : true)
      );
    return base;
  };

  useEffect(() => {
    console.log("[ReportScreen] State counts:", {
      activeTab,
      b2bFetched: Array.isArray(b2bData) ? b2bData.length : 0,
      b2cFetched: Array.isArray(b2cData) ? b2cData.length : 0,
      stockFetched: Array.isArray(stocks) ? stocks.length : 0,
      b2bFiltered: getFilteredB2B().length,
      b2cFiltered: getFilteredB2C().length,
      kadaiFiltered: getFilteredKadai().length,
      stockFiltered: getFilteredStock(false).length,
      from: appliedFromDateObj ? formatDate(appliedFromDateObj) : null,
      to: appliedToDateObj ? formatDate(appliedToDateObj) : null,
    });
  }, [activeTab, b2bData, b2cData, stocks, appliedFromDateObj, appliedToDateObj, b2bSearch, b2cSearch, kadaiSearch, stockSearch, selectedB2bItem, selectedB2cItem, selectedStockItem]);

  useEffect(() => {
    if (!selectedB2bItem) return;
    const available = new Set((b2bData || []).flatMap(getB2BItems).filter(Boolean));
    if (!available.has(selectedB2bItem)) setSelectedB2bItem("");
  }, [b2bData, selectedB2bItem]);

  useEffect(() => {
    if (!selectedB2cItem) return;
    const available = new Set((b2cData || []).flatMap(getB2CItems).filter(Boolean));
    if (!available.has(selectedB2cItem)) setSelectedB2cItem("");
  }, [b2cData, selectedB2cItem]);

  useEffect(() => {
    if (!selectedStockItem) return;
    const available = new Set((stocks || []).map(getStockItemName).filter(Boolean));
    if (!available.has(selectedStockItem)) setSelectedStockItem("");
  }, [stocks, selectedStockItem]);

  const sumBy = (arr, key) => arr.reduce((s, x) => s + parseNum(x?.[key]), 0);
  const getB2BTotalValue = (rows = []) => sumBy(rows, "issuePure");
  const getDealerTotalValue = (rows = []) =>
    rows.reduce((sum, row) => sum + parseNum(row?.issuePure ?? row?.issueTotal), 0);
  const getB2CTotalValue = (rows = []) => sumBy(rows, "totalAmount");
  const getCashTotalValue = (rows = []) => sumBy(rows, "cashAmount");
  const sumBalanceBuckets = (rows = [], resolver) =>
    rows.reduce(
      (acc, row) => {
        const current = resolver(row) || {};
        const ob = parseNum(current.ob);
        const ab = parseNum(current.ab);
        if (ob > 0) acc.ob += ob;
        if (ab > 0) acc.ab += ab;
        return acc;
      },
      { ob: 0, ab: 0 }
    );

  const buildSelectedReportHtml = () => {
    const showAll = activeTab === "All";
    const includeStockAllCategories = showAll;

    const filteredB2b = getFilteredB2B();
    const filteredDealer = getFilteredDealer();
    const filteredB2c = getFilteredB2C();
    const filteredKadai = getFilteredKadai();
    const filteredPurchase = getFilteredPurchase();
    const filteredReceipts = getFilteredReceipt();
    const filteredCash = getFilteredCash();
    const filteredExpense = getFilteredExpense();
    const filteredStock = getFilteredStock(includeStockAllCategories);
    const b2bTotalValue = getB2BTotalValue(filteredB2b);
    const b2cTotalValue = getB2CTotalValue(filteredB2c);
    const dealerTotalValue = getDealerTotalValue(filteredDealer);
    const cashTotalValue = getCashTotalValue(filteredCash);
    const allTotalValue = b2bTotalValue + b2cTotalValue + dealerTotalValue + cashTotalValue;

    const b2bSummary = {
      totalValue: b2bTotalValue.toFixed(3),
      issuePure: sumBy(filteredB2b, "issuePure").toFixed(3),
      receiptPure: sumBy(filteredB2b, "receiptPure").toFixed(3),
      cashPure: sumBy(filteredB2b, "cashPure").toFixed(3),
      oldBalance: sumBy(filteredB2b, "oldBalance").toFixed(3),
      availableBalance: sumBy(filteredB2b, "balance").toFixed(3),
    };
    const b2cSummary = {
      totalValue: b2cTotalValue.toFixed(2),
      issueTotal: filteredB2c
        .reduce((s, r) => {
          if ((r.items || []).length > 0) {
            return s + (r.items || []).reduce((t, it) => t + Number(it.weight || 0), 0);
          }
          return s + (r.issueItems || []).reduce((t, it) => t + Number(it.gross || it.weight || 0), 0);
        }, 0)
        .toFixed(3),
      issuePure: sumBy(filteredB2c, "issuePure").toFixed(3),
      receiptPure: sumBy(filteredB2c, "receiptPure").toFixed(3),
      cashPure: sumBy(filteredB2c, "cashPure").toFixed(3),
      oldBalance: sumBy(filteredB2c, "oldBalance").toFixed(3),
      availableBalance: sumBy(filteredB2c, "balance").toFixed(3),
    };
    const expenseSummary = {
      total: sumBy(filteredExpense, "amount").toFixed(2),
    };
    const dealerSummary = {
      totalValue: dealerTotalValue.toFixed(3),
      issuePure: sumBy(filteredDealer, "issuePure").toFixed(3),
      receiptPure: sumBy(filteredDealer, "receiptPure").toFixed(3),
      cashPure: sumBy(filteredDealer, "cashPure").toFixed(3),
      oldBalance: sumBy(filteredDealer, "oldBalance").toFixed(3),
      availableBalance: sumBy(filteredDealer, "balance").toFixed(3),
    };
    const cashSummary = {
      totalValue: cashTotalValue.toFixed(2),
    };

    let b2bRows = "";
    let dealerRows = "";
    let b2cRows = "";
    let kadaiRows = "";
    let purchaseRows = "";
    let receiptRows = "";
    let cashRows = "";
    let expenseRows = "";
    let stockRows = "";

    if (showAll || activeTab === "B2B") {
      b2bRows = filteredB2b.map(r => {
        const tBal = b2bBalances[r.customerId] || b2bBalances[r.customerName] || { ob: parseFloat(r.oldBalance || 0), ab: parseFloat(r.advBal || 0) };
        const ob = tBal.ob;
        const ab = tBal.ab;
        const bal = ab > 0 ? `Adv: ${ab.toFixed(3)}` : ob > 0 ? `OB: ${ob.toFixed(3)}` : "-";
        return `<tr><td>${r.customerName || ""}<br/><span style="font-size:10px;color:#555;">${getB2BPhone(r)}</span></td><td>${parseFloat(r.issuePure || 0).toFixed(3)}</td><td>${parseFloat(r.receiptPure || 0).toFixed(3)}</td><td>${parseFloat(r.cashPure || 0).toFixed(3)}</td><td>${parseFloat(r.oldBalance || 0).toFixed(3)}</td><td>${parseFloat(r.balance || 0).toFixed(3)}</td><td>${bal}</td><td>${getReportBillNo(r)}</td><td>${formatDateTime(new Date(r.createdAt || r.date))}</td></tr>`;
      }).join("");
    }

    if (showAll || activeTab === "B2C") {
      b2cRows = filteredB2c.map(r => {
        const tBal = b2cBalances[r.phone] || b2cBalances[r.mobileNumber] || b2cBalances[r.customerName] || { ob: parseFloat(r.oldBalance || 0), ab: parseFloat(r.advBal || 0) };
        const ob = tBal.ob;
        const ab = tBal.ab;
        const bal = ab > 0 ? `Adv: ${ab.toFixed(3)}` : ob > 0 ? `OB: ${ob.toFixed(3)}` : "-";
        const totalWt = ((r.items || []).length > 0
          ? (r.items || []).reduce((s, it) => s + Number(it.weight || 0), 0)
          : (r.issueItems || []).reduce((s, it) => s + Number(it.gross || it.weight || 0), 0)
        ).toFixed(3);
        const itemNames = getB2CItems(r).join(", ") || "-";
        return `<tr><td>${r.customerName || ""}<br/><span style="font-size:10px;color:#555;">${getB2CPhone(r)}</span></td><td>${itemNames}</td><td>${totalWt}</td><td>${parseFloat(r.totalAmount || 0).toFixed(2)}</td><td>${parseFloat(r.oldBalance || 0).toFixed(3)}</td><td>${parseFloat(r.balance || 0).toFixed(3)}</td><td>${bal}</td><td>${getReportBillNo(r)}</td><td>${formatDateTime(new Date(r.createdAt || r.date))}</td></tr>`;
      }).join("");
    }

    if (activeTab === "Kadai") {
      kadaiRows = filteredKadai
        .map(
          (r) =>
            `<tr><td>${r.customerName || ""}<br/><span style="font-size:10px;color:#555;">${getB2CPhone(r)}</span></td><td>${getKadaiAmountValue(r).toFixed(2)}</td><td>${formatDateTime(new Date(r.createdAt || r.date))}</td></tr>`,
        )
        .join("");
    }

    if (activeTab === "Dealer") {
      dealerRows = filteredDealer.map((r) => {
        const tBal = b2bBalances[r.customerId] || b2bBalances[r.customerName] || {
          ob: parseFloat(r.oldBalance || 0),
          ab: parseFloat(r.advBal || 0),
        };
        const ob = tBal.ob;
        const ab = tBal.ab;
        const bal = ab > 0 ? `Adv: ${ab.toFixed(3)}` : ob > 0 ? `OB: ${ob.toFixed(3)}` : "-";
        return `<tr><td>${r.customerName || ""}<br/><span style="font-size:10px;color:#555;">${getB2BPhone(r)}</span></td><td>${String(r?.dealerType || "Dealer")}</td><td>${parseFloat(r.issueTotal || 0).toFixed(3)}</td><td>${parseFloat(r.issuePure || 0).toFixed(3)}</td><td>${parseFloat(r.receiptPure || 0).toFixed(3)}</td><td>${parseFloat(r.cashPure || 0).toFixed(3)}</td><td>${parseFloat(r.oldBalance || 0).toFixed(3)}</td><td>${parseFloat(r.balance || 0).toFixed(3)}</td><td>${bal}</td><td>${getReportBillNo(r)}</td><td>${formatDateTime(new Date(r.createdAt || r.date))}</td></tr>`;
      }).join("");
    }

    if (showAll || activeTab === "Purchase") {
      purchaseRows = filteredPurchase.flatMap(p => [
        ...(p.issueEntries || []).map(e => `<tr><td>Issue</td><td>${p.supplierName || ""}</td><td>${getGenericPhone(p)}</td><td>${e.itemName || e.item || ""}</td><td>${parseFloat(e.weight || 0).toFixed(3)}</td><td>${formatDate(new Date(p.date || p.createdAt))}</td></tr>`),
        ...(p.receiptEntries || []).map(e => `<tr><td>Receipt</td><td>${p.supplierName || ""}</td><td>${getGenericPhone(p)}</td><td>${e.itemName || e.item || ""}</td><td>${parseFloat(e.weight || 0).toFixed(3)}</td><td>${formatDate(new Date(p.date || p.createdAt))}</td></tr>`),
      ]).join("");
    }

    if (showAll || activeTab === "Receipt") {
      receiptRows = filteredReceipts.map(r =>
        `<tr><td>${r.selectedDealer || ""}</td><td>${getGenericPhone(r)}</td><td>${r.type === "dealerTransfer" ? "Issue" : "Receipt"}</td><td>${(r.selectedItems || []).join(", ") || "-"}</td><td>${parseFloat(r.transferWeight || 0).toFixed(3)}</td><td>${formatDate(new Date(r.date || r.createdAt))}</td></tr>`
      ).join("");
    }

    if (showAll || activeTab === "Cash") {
      cashRows = filteredCash.map(r =>
        `<tr><td>${parseFloat(r.cashAmount || 0).toFixed(2)}</td><td>${parseFloat(r.pureValue || 0).toFixed(3)}</td><td>${r.category || ""}</td><td>${formatDateTime(new Date(r.date || r.createdAt))}</td></tr>`
      ).join("");
    }

    if (showAll || activeTab === "Expense") {
      expenseRows = filteredExpense.map(r =>
        `<tr><td>${r.expenseName || ""}</td><td>${r.workerName || ""}</td><td>${r.phoneNumber || "-"}</td><td>${parseFloat(r.amount || 0).toFixed(2)}</td><td>${formatDateTime(new Date(r.expenseDate || r.createdAt))}</td></tr>`
      ).join("");
    }

    const stockGrandTotal = filteredStock.reduce(
      (sum, r) => sum + Number(getStockItemWeightValue(r) || 0),
      0
    );
    const stockPurityGrandTotal = filteredStock.reduce(
      (sum, r) => sum + Number(getStockItemPurityValue(r) || 0),
      0
    );

    if (showAll || activeTab === "Stock") {
      stockRows = filteredStock.map(r =>
        `<tr><td>${getStockItemName(r)}</td><td>${getStockItemWeightValue(r) === null ? "-" : getStockItemWeight(r).toFixed(3)}</td><td>${getStockItemPurity(r)}</td><td>${getStockBuyingTouch(r)}</td><td>${getStockSellingTouch(r)}</td></tr>`
      ).join("");
    }

    const filterLabel = showAll ? "All Type" : activeTab;
    const stockLabel = showAll
      ? "All Categories"
      : (selectedStockItem || "Filtered Category");
    const effectiveRange = getEffectiveAppliedRange();
    const dateLabel = effectiveRange.isCustom
      ? `From: ${formatDate(effectiveRange.from)} To: ${formatDate(effectiveRange.to)}`
      : `Today: ${formatDate(effectiveRange.from)}`;

    return `
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 10px; }
          h2, h3 { text-align: center; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
          th, td { border: 1px solid #000; padding: 5px 7px; text-align: center; }
          th { background: #1b5e20; color: white; }
          .section-title { background: #e8f5e9; font-weight: bold; padding: 6px; margin-top: 12px; }
        </style>
      </head>
      <body>
        <h2>REPORT SUMMARY</h2>
        <h3>Filter: ${filterLabel} | ${dateLabel}</h3>
        ${showAll ? `<p><b>All Total:</b> ${allTotalValue.toFixed(2)}</p>` : ""}

        ${b2bRows ? `
          <p class="section-title">B2B Transactions</p>
          <p><b>Totals:</b> Total=${b2bSummary.totalValue}, Issue Pure=${b2bSummary.issuePure}, Receipt Pure=${b2bSummary.receiptPure}, Cash=${b2bSummary.cashPure}, OB=${b2bSummary.oldBalance}, Available=${b2bSummary.availableBalance}</p>
          <table>
            <tr><th>Customer</th><th>Issue Pure</th><th>Receipt Pure</th><th>Cash</th><th>Old Balance</th><th>Available</th><th>Current Balance</th><th>Bill No</th><th>Date & Time</th></tr>
            ${b2bRows}
          </table>` : ""}

        ${b2cRows ? `
          <p class="section-title">B2C Transactions</p>
          <p><b>Totals:</b> Total=${b2cSummary.totalValue}, Issue=${b2cSummary.issueTotal}, Issue Pure=${b2cSummary.issuePure}, Receipt Pure=${b2cSummary.receiptPure}, Cash=${b2cSummary.cashPure}, OB=${b2cSummary.oldBalance}, Available=${b2cSummary.availableBalance}</p>
          <table>
            <tr><th>Customer</th><th>Items</th><th>Total Wt(g)</th><th>Final Amount</th><th>Old Balance</th><th>Available</th><th>Current Balance</th><th>Bill No</th><th>Date & Time</th></tr>
            ${b2cRows}
          </table>` : ""}

        ${kadaiRows ? `
          <p class="section-title">Kadai Report</p>
          <table>
            <tr><th>Customer</th><th>Cash / Amount</th><th>Date & Time</th></tr>
            ${kadaiRows}
          </table>` : ""}

        ${dealerRows ? `
          <p class="section-title">Dealer Transactions</p>
          <p><b>Totals:</b> Total=${dealerSummary.totalValue}, Issue Pure=${dealerSummary.issuePure}, Receipt Pure=${dealerSummary.receiptPure}, Cash=${dealerSummary.cashPure}, OB=${dealerSummary.oldBalance}, Available=${dealerSummary.availableBalance}</p>
          <table>
            <tr><th>Dealer</th><th>Type</th><th>Issue Total</th><th>Issue Pure</th><th>Receipt Pure</th><th>Cash</th><th>Old Balance</th><th>Available</th><th>Current Balance</th><th>Bill No</th><th>Date & Time</th></tr>
            ${dealerRows}
          </table>` : ""}

        ${purchaseRows ? `
          <p class="section-title">Purchase Transactions</p>
          <table>
            <tr><th>Type</th><th>Supplier</th><th>Phone</th><th>Item</th><th>Weight(g)</th><th>Date</th></tr>
            ${purchaseRows}
          </table>` : ""}

        ${receiptRows ? `
          <p class="section-title">Receipt Transactions</p>
          <table>
            <tr><th>Dealer</th><th>Phone</th><th>Type</th><th>Items</th><th>Weight(g)</th><th>Date</th></tr>
            ${receiptRows}
          </table>` : ""}

        ${cashRows ? `
          <p class="section-title">Cash Entries</p>
          <p><b>Total Amount:</b> ${cashSummary.totalValue}</p>
          <table>
            <tr><th>Cash Amount</th><th>Pure Value</th><th>Category</th><th>Date & Time</th></tr>
            ${cashRows}
          </table>` : ""}

        ${expenseRows ? `
          <p class="section-title">Daily Expenses</p>
          <p><b>Total Amount:</b> ₹${expenseSummary.total}</p>
          <table>
            <tr><th>Expense Name</th><th>Worker</th><th>Phone</th><th>Amount</th><th>Date & Time</th></tr>
            ${expenseRows}
          </table>` : ""}

        ${stockRows ? `
          <p class="section-title">Stock Report - ${stockLabel}</p>
          <table>
            <tr><th>Item Name</th><th>Item Weight</th><th>Item Purity</th><th>Buying Touch</th><th>Selling Touch</th></tr>
            ${stockRows}
            <tr><td><b>Total Stock Weight</b></td><td><b>${Number(stockGrandTotal || 0).toFixed(3)}</b></td><td><b>Total Purity: ${Number(stockPurityGrandTotal || 0).toFixed(3)}</b></td><td>-</td><td>-</td></tr>
          </table>` : ""}
      </body>
      </html>
    `;
  };

  const createReportPdf = async () => {
    const html = buildSelectedReportHtml();
    return Print.printToFileAsync({ html });
  };

  // ================= FILTERED PRINT (respects activeTab) =================
  const generateFilteredPDF = async () => {
    try {
      const file = await createReportPdf();
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      if (error.message && error.message.includes("rejected")) {
        console.log("Print cancelled by user");
      } else {
        console.error("Print error:", error);
      }
    }
  };

  // ================= PDF EXPORT =================
  const generatePDF = async () => {
    try {
      const file = await createReportPdf();
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      if (error.message && error.message.includes("rejected")) {
        console.log("PDF share cancelled by user");
      } else {
        console.error("PDF share error:", error);
      }
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      const file = await createReportPdf();
      const label = activeTab === "All" ? "All Type" : activeTab;
      const effectiveRange = getEffectiveAppliedRange();
      const msg = effectiveRange.isCustom
        ? `NTJ Report (${label}) From ${formatDate(effectiveRange.from)} To ${formatDate(effectiveRange.to)}`
        : `NTJ Report (${label}) - Today ${formatDate(effectiveRange.from)}`;
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(async () => {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Report PDF",
          UTI: ".pdf",
        });
      }
    } catch (error) {
      console.error("WhatsApp share error:", error);
      Alert.alert("Error", "Failed to share report on WhatsApp.");
    }
  };

  // ================= MAIL EXPORT =================
  const sendMail = async () => {
    const file = await createReportPdf();
    await MailComposer.composeAsync({
      subject: "Report",
      body: "Report attached",
      attachments: [file.uri],
    });
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      await Promise.all([
        fetchAllData(),
        fetchBillDataByType(activeTab, appliedFromDateObj, appliedToDateObj),
      ]);
    } catch (error) {
      console.error("Refresh failed:", error);
      Alert.alert("Error", "Failed to refresh report data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredB2bRows = getFilteredB2B();
  const filteredB2cRows = getFilteredB2C();
  const filteredDealerRows = getFilteredDealer();
  const filteredCashRows = getFilteredCash();
  const b2bCategoryTotal = getB2BTotalValue(filteredB2bRows);
  const b2cCategoryTotal = getB2CTotalValue(filteredB2cRows);
  const dealerCategoryTotal = getDealerTotalValue(filteredDealerRows);
  const cashCategoryTotal = getCashTotalValue(filteredCashRows);
  const allCategoryTotal =
    b2bCategoryTotal + b2cCategoryTotal + dealerCategoryTotal + cashCategoryTotal;
  const b2bBalanceSummary = sumBalanceBuckets(filteredB2bRows, (r) =>
    b2bBalances[r.customerId] ||
    b2bBalances[r.customerName] || {
      ob: parseFloat(r.oldBalance || 0),
      ab: parseFloat(r.advBal || 0),
    }
  );
  const dealerBalanceSummary = sumBalanceBuckets(filteredDealerRows, (r) =>
    dealerBalances[String(r.customerId || "")] ||
    dealerBalances[String(r.customerName || "")] ||
    b2bBalances[r.customerId] ||
    b2bBalances[r.customerName] || {
      ob: parseFloat(r.oldBalance || 0),
      ab: parseFloat(r.advBal || 0),
    }
  );
  const b2cBalanceSummary = sumBalanceBuckets(filteredB2cRows, (r) =>
    b2cBalances[r.phone] ||
    b2cBalances[r.mobileNumber] ||
    b2cBalances[r.customerName] || {
      ob: parseFloat(r.oldBalance || 0),
      ab: parseFloat(r.advBal || 0),
    }
  );
  const b2bReceiptTotal = sumBy(filteredB2bRows, "receiptPure");
  const dealerReceiptTotal = sumBy(filteredDealerRows, "receiptPure");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1b5e20"
      />
      {showActionsMenu ? (
        <TouchableOpacity
          style={styles.actionsBackdrop}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View style={styles.actionsMenu}>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setShowActionsMenu(false);
                generateFilteredPDF();
              }}
            >
              <Icon name="printer" size={16} color="#1565C0" />
              <Text style={styles.actionsMenuText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setShowActionsMenu(false);
                handleWhatsAppShare();
              }}
            >
              <Icon name="message-circle" size={16} color="#25D366" />
              <Text style={styles.actionsMenuText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setShowActionsMenu(false);
                sendMail();
              }}
            >
              <Icon name="mail" size={16} color="#ff9800" />
              <Text style={styles.actionsMenuText}>Mail</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionsMenuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowActionsMenu(false);
                generatePDF();
              }}
            >
              <Icon name="file-text" size={16} color="#43a047" />
              <Text style={styles.actionsMenuText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reports</Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.actionsBtn}
            onPress={() => setShowActionsMenu((prev) => !prev)}
          >
            <Icon name="more-vertical" size={16} color="#fff" />
            <Text style={styles.headerActionText}>Actions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Icon
              name={isRefreshing ? "loader" : "refresh-cw"}
              size={16}
              color="#fff"
            />
            <Text style={styles.headerActionText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={true}
      >
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        )}

        {/* DATE PICKER UI */}
        <View style={styles.dateCard}>
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => {
              setShowToPicker(false);
              setShowFromPicker(true);
            }}
          >
            <Text style={styles.dateTitle}>From Date</Text>
            <Text style={styles.dateValue}>{fromDateObj ? formatDate(fromDateObj) : "Select Date"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => {
              setShowFromPicker(false);
              setShowToPicker(true);
            }}
          >
            <Text style={styles.dateTitle}>To Date</Text>
            <Text style={styles.dateValue}>{toDateObj ? formatDate(toDateObj) : "Select Date"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dateSearchBtn}
          onPress={() => {
            setShowFromPicker(false);
            setShowToPicker(false);
            if (!validateDateRangeOrAlert()) return;
            const hasFrom = Boolean(fromDateObj);
            const hasTo = Boolean(toDateObj);
            const from = hasFrom ? new Date(fromDateObj) : null;
            const to = hasTo ? new Date(toDateObj) : null;
            const fromStart = from ? new Date(from) : null;
            if (fromStart) fromStart.setHours(0, 0, 0, 0);
            const toEnd = to ? new Date(to) : null;
            if (toEnd) toEnd.setHours(23, 59, 59, 999);
            console.log("[ReportScreen] Search clicked:", {
              selectedType: activeTab,
              fromDate: from ? formatApiDate(from) : null,
              toDate: to ? formatApiDate(to) : null,
              fromStart: fromStart ? fromStart.toISOString() : null,
              toEnd: toEnd ? toEnd.toISOString() : null,
            });
            if (hasFrom && hasTo) {
              setAppliedFromDateObj(from);
              setAppliedToDateObj(to);
              setHasAppliedDateRange(true);
            } else {
              setAppliedFromDateObj(null);
              setAppliedToDateObj(null);
              setHasAppliedDateRange(false);
            }
          }}
        >
          <Icon name="search" size={18} color="#fff" />
          <Text style={styles.dateSearchBtnText}>Search</Text>
        </TouchableOpacity>

        {/* SEARCH */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or item..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* TABS */}
        <View style={styles.tabRow}>
          {reportTabs.map((t) => (
            <TouchableOpacity
              key={`report-tab-${t}`}
              style={[styles.tabBtn, activeTab === t && styles.activeTabBtn]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={styles.tabText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "All" && (
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableTitle}>All Report</Text>
            <Text style={styles.tableTotalText}>Total: {allCategoryTotal.toFixed(2)}</Text>
          </View>
        )}

        {/* ================= B2B TABLE ================= */}
        {(activeTab === "All" || activeTab === "B2B") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>B2B Report</Text>
              <Text style={styles.tableTotalText}>Total: {b2bCategoryTotal.toFixed(3)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by name..."
                  value={b2bSearch}
                  onChangeText={setB2bSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowB2bDropdown(!showB2bDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.summaryCardRed]}>
                <Text style={styles.summaryLabel}>Total OB</Text>
                <Text style={[styles.summaryValue, styles.summaryValueRed]}>OB: {b2bBalanceSummary.ob.toFixed(3)}</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardGreen]}>
                <Text style={styles.summaryLabel}>Total Adv</Text>
                <Text style={[styles.summaryValue, styles.summaryValueGreen]}>Adv: {b2bBalanceSummary.ab.toFixed(3)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Issued Pure</Text>
                <Text style={styles.summaryValue}>{b2bCategoryTotal.toFixed(3)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Receipt Pure</Text>
                <Text style={styles.summaryValue}>{b2bReceiptTotal.toFixed(3)}</Text>
              </View>
            </View>
            {showB2bDropdown && (
              <View style={styles.tableDropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedB2bItem("");
                    setShowB2bDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>All Items</Text>
                </TouchableOpacity>
                {[...new Set(b2bData.flatMap(getB2BItems))].filter(Boolean).map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedB2bItem(item);
                      setShowB2bDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Customer</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Balance</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Issue Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Receipt Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Cash Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Bill No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>

                {(() => {
                  const rows = filteredB2bRows;
                  if (rows.length === 0) {
                    return (
                      <View style={styles.tableRow}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#2E7D32" />
                        ) : (
                          <Text style={[styles.tCell, styles.noDataText]}>No Data Found</Text>
                        )}
                      </View>
                    );
                  }
                  return rows.map((r, i) => {
                    const tBal = b2bBalances[r.customerId] || b2bBalances[r.customerName] || { ob: parseFloat(r.oldBalance || 0), ab: parseFloat(r.advBal || 0) };
                    const ob = tBal.ob;
                    const ab = tBal.ab;
                    return (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.tCell}>{i + 1}</Text>
                        <View style={styles.customerCell}>
                          <Text style={styles.customerPrimaryText}>{r.customerName || "-"}</Text>
                          <Text style={styles.customerSecondaryText}>{getB2BPhone(r)}</Text>
                        </View>
                        <Text style={[styles.tCell, { color: ab > 0 ? '#2E7D32' : ob > 0 ? '#D32F2F' : '#666', fontWeight: 'bold' }]}>
                          {ab > 0 ? `Adv: ${ab.toFixed(3)}` : ob > 0 ? `OB: ${ob.toFixed(3)}` : "-"}
                        </Text>
                        <Text style={styles.tCell}>{r.issuePure}</Text>
                        <Text style={styles.tCell}>{r.receiptPure}</Text>
                        <Text style={styles.tCell}>{r.cashPure}</Text>
                        <Text style={styles.tCell}>{getReportBillNo(r)}</Text>
                        <Text style={styles.tCell}>{formatDateTime(new Date(r.createdAt || r.date))}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= B2C TABLE ================= */}
        {(activeTab === "All" || activeTab === "B2C") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>B2C Report</Text>
              <Text style={styles.tableTotalText}>Total: {b2cCategoryTotal.toFixed(2)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by name or phone..."
                  value={b2cSearch}
                  onChangeText={setB2cSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowB2cDropdown(!showB2cDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.summaryCardRed]}>
                <Text style={styles.summaryLabel}>Total OB</Text>
                <Text style={[styles.summaryValue, styles.summaryValueRed]}>OB: {b2cBalanceSummary.ob.toFixed(3)}</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardGreen]}>
                <Text style={styles.summaryLabel}>Total Adv</Text>
                <Text style={[styles.summaryValue, styles.summaryValueGreen]}>Adv: {b2cBalanceSummary.ab.toFixed(3)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Final Amt</Text>
                <Text style={styles.summaryValue}>{b2cCategoryTotal.toFixed(2)}</Text>
              </View>
            </View>
            {showB2cDropdown && (
              <View style={styles.tableDropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => { setSelectedB2cItem(""); setShowB2cDropdown(false); }}
                >
                  <Text style={styles.dropdownItemText}>All Items</Text>
                </TouchableOpacity>
                {[...new Set(b2cData.flatMap(getB2CItems).filter(Boolean))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedB2cItem(item);
                      setShowB2cDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Customer</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Balance</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Items</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Total Wt (g)</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Final Amt (Rs)</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Bill No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>

                {(() => {
                  const rows = filteredB2cRows;
                  if (rows.length === 0) {
                    return (
                      <View style={styles.tableRow}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#2E7D32" />
                        ) : (
                          <Text style={[styles.tCell, styles.noDataText]}>No Data Found</Text>
                        )}
                      </View>
                    );
                  }
                  return rows.map((r, i) => {
                    const totalWeight = ((r.items || []).length > 0
                      ? (r.items || []).reduce((s, it) => s + Number(it.weight || 0), 0)
                      : (r.issueItems || []).reduce((s, it) => s + Number(it.gross || it.weight || 0), 0)
                    ).toFixed(3);
                    const itemNames = getB2CItems(r).join(", ") || "-";
                    const tBal = b2cBalances[r.phone] || b2cBalances[r.mobileNumber] || b2cBalances[r.customerName] || { ob: parseFloat(r.oldBalance || 0), ab: parseFloat(r.advBal || 0) };
                    const ob = tBal.ob;
                    const ab = tBal.ab;
                    return (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.tCell}>{i + 1}</Text>
                        <View style={styles.customerCell}>
                          <Text style={styles.customerPrimaryText}>{r.customerName || "-"}</Text>
                          <Text style={styles.customerSecondaryText}>{getB2CPhone(r)}</Text>
                        </View>
                        <Text style={[styles.tCell, { color: ab > 0 ? '#2E7D32' : ob > 0 ? '#D32F2F' : '#666', fontWeight: 'bold' }]}>
                          {ab > 0 ? `Adv: ${ab.toFixed(3)}` : ob > 0 ? `OB: ${ob.toFixed(3)}` : "-"}
                        </Text>
                        <Text style={[styles.tCell, { minWidth: 120 }]}>{itemNames}</Text>
                        <Text style={styles.tCell}>{totalWeight}</Text>
                        <Text style={styles.tCell}>Rs.{parseFloat(r.totalAmount || 0).toFixed(2)}</Text>
                        <Text style={styles.tCell}>{getReportBillNo(r)}</Text>
                        <Text style={styles.tCell}>{formatDateTime(new Date(r.createdAt || r.date))}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= KADAI TABLE ================= */}
        {activeTab === "Kadai" && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Kadai Report</Text>
              <TextInput
                style={styles.tableSearchInput}
                placeholder="Search by name or phone..."
                value={kadaiSearch}
                onChangeText={setKadaiSearch}
              />
            </View>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Customer</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Cash / Amount</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>

                {(() => {
                  const rows = getFilteredKadai();
                  if (rows.length === 0) {
                    return (
                      <View style={styles.tableRow}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#2E7D32" />
                        ) : (
                          <Text style={[styles.tCell, styles.noDataText]}>No Data Found</Text>
                        )}
                      </View>
                    );
                  }
                  return rows.map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{i + 1}</Text>
                      <View style={styles.customerCell}>
                        <Text style={styles.customerPrimaryText}>{r.customerName || "-"}</Text>
                        <Text style={styles.customerSecondaryText}>{getB2CPhone(r)}</Text>
                      </View>
                      <Text style={styles.tCell}>₹{getKadaiAmountValue(r).toFixed(2)}</Text>
                      <Text style={styles.tCell}>{formatDateTime(new Date(r.createdAt || r.date))}</Text>
                    </View>
                  ));
                })()}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= DEALER TABLE ================= */}
        {activeTab === "Dealer" && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Dealer Report</Text>
              <Text style={styles.tableTotalText}>Total: {dealerCategoryTotal.toFixed(3)}</Text>
              <TextInput
                style={styles.tableSearchInput}
                placeholder="Search dealer / phone..."
                value={dealerSearch}
                onChangeText={setDealerSearch}
              />
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.summaryCardRed]}>
                <Text style={styles.summaryLabel}>Total OB</Text>
                <Text style={[styles.summaryValue, styles.summaryValueRed]}>OB: {dealerBalanceSummary.ob.toFixed(3)}</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardGreen]}>
                <Text style={styles.summaryLabel}>Total Adv</Text>
                <Text style={[styles.summaryValue, styles.summaryValueGreen]}>Adv: {dealerBalanceSummary.ab.toFixed(3)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Issued Pure</Text>
                <Text style={styles.summaryValue}>{dealerCategoryTotal.toFixed(3)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Receipt Pure</Text>
                <Text style={styles.summaryValue}>{dealerReceiptTotal.toFixed(3)}</Text>
              </View>
            </View>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Dealer Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Balance</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Issue</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Receipt</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>
                {(() => {
                  const rows = filteredDealerRows;
                  if (rows.length === 0) {
                    return (
                      <View style={styles.tableRow}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#2E7D32" />
                        ) : (
                          <Text style={[styles.tCell, styles.noDataText]}>No Data Found</Text>
                        )}
                      </View>
                    );
                  }
                  return rows.map((r, i) => {
                    const bal = getDealerBalanceLabel(r);
                    return (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.tCell}>{i + 1}</Text>
                        <View style={styles.customerCell}>
                          <Text style={styles.customerPrimaryText}>{r.customerName || "-"}</Text>
                          <Text style={styles.customerSecondaryText}>{getDealerPhone(r)}</Text>
                        </View>
                        <Text style={[styles.tCell, { color: bal.color, fontWeight: "bold" }]}>
                          {bal.label}
                        </Text>
                        <Text style={styles.tCell}>{Number(r.issuePure || r.issueTotal || 0).toFixed(3)}</Text>
                        <Text style={styles.tCell}>{Number(r.receiptPure || 0).toFixed(3)}</Text>
                        <Text style={styles.tCell}>{formatDateTime(new Date(r.createdAt || r.date))}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= PURCHASE TABLE ================= */}
        {(activeTab === "All" || activeTab === "Purchase") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Purchase Report - Issues</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search supplier..."
                  value={purchaseSearch}
                  onChangeText={setPurchaseSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowPurchaseDropdown(!showPurchaseDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showPurchaseDropdown && (
              <View style={styles.tableDropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedPurchaseItem("");
                    setShowPurchaseDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>All Items</Text>
                </TouchableOpacity>
                {[...new Set(
                  purchaseData.flatMap(p => [
                    ...(p.issueEntries || []).map(e => e.itemName || e.item),
                    ...(p.receiptEntries || []).map(e => e.itemName || e.item)
                  ])
                )].filter(Boolean).map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedPurchaseItem(item);
                      setShowPurchaseDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ISSUES TABLE */}
            <Text style={styles.subTableTitle}>Issue Transactions</Text>
            <ScrollView horizontal style={styles.tableMargin}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Supplier</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Phone</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight (g)</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>
                {(() => {
                  let idx = 0;
                  return filterByDate(purchaseData)
                    .filter(p => (p.supplierName || "").toLowerCase().includes(purchaseSearch.toLowerCase()))
                    .flatMap(p => (p.issueEntries || []).map(e => ({ ...e, supplier: p.supplierName, phone: getGenericPhone(p), date: p.date || p.createdAt })))
                    .filter(e => !selectedPurchaseItem || e.itemName === selectedPurchaseItem || e.item === selectedPurchaseItem)
                    .map((e, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.tCell}>{i + 1}</Text>
                        <Text style={styles.tCell}>{e.supplier || "N/A"}</Text>
                        <Text style={styles.tCell}>{e.phone || "-"}</Text>
                        <Text style={styles.tCell}>{e.itemName || e.item || "-"}</Text>
                        <Text style={[styles.tCell, { color: '#D32F2F', fontWeight: 'bold' }]}>{e.weight}</Text>
                        <Text style={styles.tCell}>{e.date}</Text>
                      </View>
                    ));
                })()}
              </View>
            </ScrollView>

            {/* RECEIPTS TABLE */}
            <Text style={styles.subTableTitle}>Receipt Transactions</Text>
            <ScrollView horizontal style={styles.tableMargin}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Supplier</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Phone</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight (g)</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>
                {(() => {
                  return filterByDate(purchaseData)
                    .filter(p => (p.supplierName || "").toLowerCase().includes(purchaseSearch.toLowerCase()))
                    .flatMap(p => (p.receiptEntries || []).map(e => ({ ...e, supplier: p.supplierName, phone: getGenericPhone(p), date: p.date || p.createdAt })))
                    .filter(e => !selectedPurchaseItem || e.itemName === selectedPurchaseItem || e.item === selectedPurchaseItem)
                    .map((e, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.tCell}>{i + 1}</Text>
                        <Text style={styles.tCell}>{e.supplier || "N/A"}</Text>
                        <Text style={styles.tCell}>{e.phone || "-"}</Text>
                        <Text style={styles.tCell}>{e.itemName || e.item || "-"}</Text>
                        <Text style={[styles.tCell, { color: '#2E7D32', fontWeight: 'bold' }]}>{e.weight}</Text>
                        <Text style={styles.tCell}>{e.date}</Text>
                      </View>
                    ));
                })()}
              </View>
            </ScrollView>

            {/* CASH TABLE */}
            <Text style={styles.subTableTitle}>Cash Entries</Text>
            <ScrollView horizontal style={styles.tableMargin}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Supplier</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Phone</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Amount</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>
                {filterByDate(purchaseData)
                  .filter(p => (p.supplierName || "").toLowerCase().includes(purchaseSearch.toLowerCase()) && p.cash > 0)
                  .map((p, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{i + 1}</Text>
                      <Text style={styles.tCell}>{p.supplierName || "N/A"}</Text>
                      <Text style={styles.tCell}>{getGenericPhone(p)}</Text>
                      <Text style={[styles.tCell, { fontWeight: 'bold' }]}>₹{p.cash}</Text>
                      <Text style={styles.tCell}>{p.date || formatDateTime(new Date(p.createdAt))}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= RECEIPT TABLE ================= */}
        {(activeTab === "All" || activeTab === "Receipt") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Receipt Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by item..."
                  value={receiptSearch}
                  onChangeText={setReceiptSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowReceiptDropdown(!showReceiptDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Dealer</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Type</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item(s)</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date</Text>
                </View>

                {filterByDate(paymentData.filter(p => !receiptSearch || (p.selectedItems || []).some(si => si.toLowerCase().includes(receiptSearch.toLowerCase()))))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{i + 1}</Text>
                      <View style={styles.customerCell}>
                        <Text style={styles.customerPrimaryText}>{r.selectedDealer || "-"}</Text>
                        <Text style={styles.customerSecondaryText}>{getGenericPhone(r)}</Text>
                      </View>
                      <Text style={styles.tCell}>{r.type === 'dealerTransfer' ? 'Issue' : 'Receipt'}</Text>
                      <Text style={styles.tCell}>{(r.selectedItems || []).join(", ") || "-"}</Text>
                      <Text style={styles.tCell}>{r.transferWeight}</Text>
                      <Text style={styles.tCell}>{formatDate(new Date(r.date || r.createdAt))}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= CASH TABLE ================= */}
        {(activeTab === "All" || activeTab === "Cash") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Cash Report</Text>
              <Text style={styles.tableTotalText}>Total: {cashCategoryTotal.toFixed(2)}</Text>
              <TextInput
                style={styles.tableSearchInput}
                placeholder="Search category/name..."
                value={cashSearch}
                onChangeText={setCashSearch}
              />
            </View>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Cash Amount</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Pure Value</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Category</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>

                {getFilteredCash().map((r, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tCell}>{i + 1}</Text>
                    <Text style={styles.tCell}>₹{parseFloat(r.cashAmount || 0).toFixed(2)}</Text>
                    <Text style={styles.tCell}>{parseFloat(r.pureValue || 0).toFixed(3)}</Text>
                    <Text style={styles.tCell}>{r.category || "-"}</Text>
                    <Text style={styles.tCell}>{formatDateTime(new Date(r.date || r.createdAt))}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= EXPENSE TABLE ================= */}
        {(activeTab === "All" || activeTab === "Expense") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Daily Expense Report</Text>
              <TextInput
                style={styles.tableSearchInput}
                placeholder="Search expense/worker..."
                value={expenseSearch}
                onChangeText={setExpenseSearch}
              />
            </View>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Expense Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Worker</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Phone</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Amount</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date & Time</Text>
                </View>

                {getFilteredExpense().map((r, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tCell}>{i + 1}</Text>
                    <Text style={styles.tCell}>{r.expenseName || "-"}</Text>
                    <Text style={styles.tCell}>{r.workerName || "-"}</Text>
                    <Text style={styles.tCell}>{r.phoneNumber || "-"}</Text>
                    <Text style={[styles.tCell, { fontWeight: 'bold' }]}>₹{parseFloat(r.amount || 0).toFixed(2)}</Text>
                    <Text style={styles.tCell}>{formatDateTime(new Date(r.expenseDate || r.createdAt))}</Text>
                  </View>
                ))}
                <View style={styles.tableRow}>
                  <Text style={[styles.tCell, { fontWeight: 'bold' }]}>Total Expense</Text>
                  <Text style={styles.tCell}></Text>
                  <Text style={styles.tCell}></Text>
                  <Text style={styles.tCell}></Text>
                  <Text style={[styles.tCell, { fontWeight: 'bold' }]}>
                    ₹{getFilteredExpense().reduce((s, r) => s + parseFloat(r.amount || 0), 0).toFixed(2)}
                  </Text>
                  <Text style={styles.tCell}></Text>
                </View>
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= STOCK TABLE ================= */}
        {activeTab === "Stock" && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Stock Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by name..."
                  value={stockSearch}
                  onChangeText={setStockSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowStockDropdown(!showStockDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showStockDropdown && (
              <View style={styles.tableDropdown}>
                {[...new Set(stocks.map(item => getStockItemName(item)).filter(Boolean))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedStockItem(item);
                      setShowStockDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>Item Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item Weight</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item Purity</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Buying Touch</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Selling Touch</Text>
                </View>

                {(() => {
                  const rows = getFilteredStock(false);
                  if (rows.length === 0) {
                    return (
                      <View style={styles.tableRow}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#2E7D32" />
                        ) : (
                          <Text style={[styles.tCell, styles.noDataText]}>No Data Found</Text>
                        )}
                      </View>
                    );
                  }
                  return rows.map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{getStockItemName(r)}</Text>
                      <Text style={styles.tCell}>{getStockItemWeightDisplay(r)}</Text>
                      <Text style={styles.tCell}>{getStockItemPurity(r)}</Text>
                      <Text style={styles.tCell}>{getStockBuyingTouch(r)}</Text>
                      <Text style={styles.tCell}>{getStockSellingTouch(r)}</Text>
                    </View>
                  ));
                })()}
                <View style={styles.tableRow}>
                  <Text style={[styles.tCell, { fontWeight: "bold" }]}>Total Stock Weight</Text>
                  <Text style={[styles.tCell, { fontWeight: "bold" }]}>
                    {getFilteredStock(false)
                      .reduce((sum, r) => sum + Number(getStockItemWeightValue(r) || 0), 0)
                      .toFixed(3)} g
                  </Text>
                  <Text style={[styles.tCell, { fontWeight: "bold" }]}>
                    Total Purity: {getFilteredStock(false)
                      .reduce((sum, r) => sum + Number(getStockItemPurityValue(r) || 0), 0)
                      .toFixed(3)}
                  </Text>
                  <Text style={styles.tCell}> </Text>
                  <Text style={styles.tCell}> </Text>
                </View>
              </View>
            </ScrollView>
          </>
        )}

        {/* Add bottom padding for scrolling */}
        <View style={{ height: 50 }} />

      </ScrollView>

      {/* DATE PICKERS (FIXED - Using Date objects directly) */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDateObj || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onFromDateChange}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDateObj || fromDateObj || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onToDateChange}
          minimumDate={fromDateObj || undefined}
        />
      )}
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1b5e20",
  },
  header: {
    position: "relative",
    height: 126,
    backgroundColor: "#1b5e20",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 12 : (StatusBar.currentHeight || 0) + 8,
    zIndex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerIconButton: {
    marginTop: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginTop: 2,
    paddingHorizontal: 8,
  },
  headerTitle: { color: "#fff", fontSize: 21, fontWeight: "800", textAlign: "center" },
  dateTimeText: { color: "rgba(255,255,255,0.92)", fontSize: 12, textAlign: "center", marginTop: 4 },
  headerButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionsBtn: {
    backgroundColor: "#264238",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 64,
    borderWidth: 1,
    borderColor: "#5D8A74",
  },
  printBtn: { backgroundColor: "#1565C0", padding: 8, borderRadius: 6, alignItems: "center", minWidth: 48 },
  whatsappBtn: { backgroundColor: "#25D366", padding: 8, borderRadius: 6, alignItems: "center", minWidth: 48 },
  mailBtn: { backgroundColor: "#ff9800", padding: 8, borderRadius: 6 },
  exportBtn: { backgroundColor: "#43a047", padding: 8, borderRadius: 6 },
  refreshBtn: {
    backgroundColor: "#355E4B",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 64,
    borderWidth: 1,
    borderColor: "#70A88B",
  },
  headerActionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  actionsBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  actionsMenu: {
    position: "absolute",
    top: 122,
    right: 12,
    width: 170,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    overflow: "hidden",
  },
  actionsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  actionsMenuText: {
    fontSize: 14,
    color: "#263238",
    fontWeight: "600",
  },

  container: { padding: 16, backgroundColor: "#f4f6f8" },
  loadingWrap: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 6,
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600",
  },

  dateCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 10,
  },
  dateBox: {
    width: "48%",
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1b5e20",
  },
  dateTitle: { fontSize: 12, color: "#1b5e20" },
  dateValue: { fontSize: 16, fontWeight: "bold", color: "#000" },

  dateSearchBtn: {
    backgroundColor: "#1b5e20",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  dateSearchBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },

  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  tabBtn: { backgroundColor: "#1b5e20", padding: 8, borderRadius: 6 },
  activeTabBtn: { backgroundColor: "#000" },
  tabText: { color: "#fff", fontWeight: "bold" },

  tableTitle: { fontSize: 16, fontWeight: "bold", marginVertical: 10, color: "#1b5e20" },
  tableTotalText: { fontSize: 14, fontWeight: "bold", color: "#1b5e20", marginHorizontal: 8 },
  tableHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  summaryCard: {
    minWidth: 120,
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  summaryCardRed: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F2B8BE",
  },
  summaryCardGreen: {
    backgroundColor: "#F1FBF3",
    borderColor: "#B7E4C7",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    color: "#222",
    fontWeight: "bold",
  },
  summaryValueRed: { color: "#D32F2F" },
  summaryValueGreen: { color: "#2E7D32" },
  tableSearchInput: { backgroundColor: "#fff", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#ccc", width: 150 },
  tableFilterBtn: { backgroundColor: "#1b5e20", padding: 8, borderRadius: 6, marginLeft: 10 },
  tableFilterBtnText: { color: "#fff", fontWeight: "bold" },
  tableDropdown: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#1b5e20",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1000,
    maxHeight: 200,
    minWidth: 140,
    paddingVertical: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    marginHorizontal: 5,
    marginVertical: 2,
    borderRadius: 5,
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  tableHeader: { flexDirection: "row", backgroundColor: "#1b5e20", paddingVertical: 5, paddingHorizontal: 4, borderRadius: 4 },
  tableRow: { flexDirection: "row", backgroundColor: "#e8f5e9", borderBottomWidth: 1, borderBottomColor: "#c8e6c9", paddingVertical: 3, paddingHorizontal: 4 },

  tCell: { width: 86, textAlign: "center", color: "#000", paddingVertical: 1 },
  customerCell: { width: 86, alignItems: "center", justifyContent: "center", paddingVertical: 1 },
  customerPrimaryText: { color: "#000", fontWeight: "bold", textAlign: "center" },
  customerSecondaryText: { color: "#555", fontSize: 11, textAlign: "center" },
  headerCell: { color: "#fff", fontWeight: "bold" },
  noDataText: { width: 180, color: "#666", fontWeight: "bold" },
  subTableTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 15,
    marginBottom: 5,
    backgroundColor: "#E8F5E9",
    padding: 6,
    borderRadius: 4,
    width: "100%",
  },
  tableMargin: {
    marginBottom: 20,
  },
});

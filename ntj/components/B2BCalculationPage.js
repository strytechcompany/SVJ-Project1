import React, { memo, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import { CameraView, useCameraPermissions } from "expo-camera";
import { styles } from "./B2BCalculationPageStyles";
import CommonHeader from "./CommonHeader";
import {
  buildBalanceSummary,
  deriveBalanceStateFromNet,
  normalizeBalanceState,
} from "./balanceUtils";

const B2B_HOLD_STORAGE_KEY = "B2B_HELD_TRANSACTIONS";

/**
 * CreateTransaction (Full)
 * - Customer select
 * - Issue / Receipt / Cash entries
 * - Product list table (showing both issue & receipt items)
 * - Transaction summary (horizontal scroll)
 *
 * Option C: includes product table & summary
 */

const CustomerSelectItem = memo(function CustomerSelectItem({
  item,
  highlight = false,
  onPress,
}) {
  let currentBalance = Number(item.ob || 0);
  let advanceBalance = Number(item.ab || 0);
  if (currentBalance < 0) {
    advanceBalance += Math.abs(currentBalance);
    currentBalance = 0;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={[
        styles.listItem,
        highlight && { borderLeftWidth: 4, borderLeftColor: "#B8860B" },
      ]}
    >
      <View>
        <Text style={styles.listItemText}>
          <Text style={{ fontWeight: "bold", color: "#000" }}>{item.name}</Text>{" "}
          | P : {item.phone}
        </Text>
        <Text style={styles.balanceText}>
          OB: {Number(currentBalance || 0).toFixed(3)}g{" "}
          {advanceBalance > 0
            ? `| AB: ${Number(advanceBalance || 0).toFixed(3)}g`
            : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const DropdownItem = memo(function DropdownItem({
  item,
  onPress,
  textStyle,
  weightStyle,
  containerStyle,
  weightText,
}) {
  return (
    <TouchableOpacity
      style={[styles.listItem, containerStyle]}
      onPress={() => onPress(item)}
    >
      <Text style={textStyle}>{item.itemName}</Text>
      <Text style={weightStyle}>{weightText}</Text>
    </TouchableOpacity>
  );
});

export default function CreateTransaction({ navigation }) {
  const route = useRoute();

  // ── ALL useState FIRST ──────────────────────────────────────
  const [weight, setWeight] = useState("");
  const [stone, setStone] = useState("0");
  const [touch, setTouch] = useState("");
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptStone, setReceiptStone] = useState("0");
  const [receiptTouch, setReceiptTouch] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [itemsStock, setItemsStock] = useState({});
  const [buyingCost, setBuyingCost] = useState("");
  const [sellingCost, setSellingCost] = useState("");
  const [plusValue, setPlusValue] = useState(0);

  const [issueItems, setIssueItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [cashTable, setCashTable] = useState([]);

  const [rupees, setRupees] = useState("");
  const [goldRate, setGoldRate] = useState("");
  const [cashPureInput, setCashPureInput] = useState("0.000");

  const [gstEnabled, setGstEnabled] = useState(false);
  const [description, setDescription] = useState("");
  const [sgst, setSgst] = useState("");
  const [cgst, setCgst] = useState("");
  const [igst, setIgst] = useState("");
  const [gstPercentage, setGstPercentage] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [showGstInBill, setShowGstInBill] = useState(true);
  const [isSgstEnabled, setIsSgstEnabled] = useState(false);
  const [isCgstEnabled, setIsCgstEnabled] = useState(false);
  const [isIgstEnabled, setIsIgstEnabled] = useState(false);
  const [savedGstList, setSavedGstList] = useState([]);
  const [showSavedGstModal, setShowSavedGstModal] = useState(false);
  const [latestB2BGstRecord, setLatestB2BGstRecord] = useState(null);

  const [itemsList, setItemsList] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIssueItem, setSelectedIssueItem] = useState(null);
  const [issueItemDropdownOpen, setIssueItemDropdownOpen] = useState(false);
  const [customIssueItem, setCustomIssueItem] = useState("");
  const [selectedReceiptItem, setSelectedReceiptItem] = useState(null);
  const [receiptItemDropdownOpen, setReceiptItemDropdownOpen] = useState(false);
  const [customReceiptItem, setCustomReceiptItem] = useState("");
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [issueItemSearch, setIssueItemSearch] = useState("");
  const [receiptItemSearch, setReceiptItemSearch] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [previousReceiptWeight, setPreviousReceiptWeight] = useState(0);

  const [search, setSearch] = useState("");
  const [cartSearch, setCartSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentNames, setRecentNames] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [billTypeLabel, setBillTypeLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [showOthersInput, setShowOthersInput] = useState(false);
  const [othersName, setOthersName] = useState("");
  const [heldTransactions, setHeldTransactions] = useState([]);
  const [activeHoldId, setActiveHoldId] = useState("");

  const [issueBarcode, setIssueBarcode] = useState("");
  const [issueScannerVisible, setIssueScannerVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ── NEW Issue Entry fields ───────────────────────────────────
  const [issueBillNo, setIssueBillNo] = useState("");      // auto-generated from backend
  const [issueItemNumber, setIssueItemNumber] = useState(""); // from barcode scan
  const [issueCount, setIssueCount] = useState("1");        // manual count
  const [sriCost, setSriCost] = useState("");               // SRI COST ₹
  const [sriBill, setSriBill] = useState("");               // SRI BILL ₹

  // ── NEW Receipt Entry fields ─────────────────────────────────
  const [receiptBillNo, setReceiptBillNo] = useState("");     // manual
  const [receiptType, setReceiptType] = useState("");          // manual text
  const [receiptLess, setReceiptLess] = useState("");          // grams, manual
  const [receiptActualTouch, setReceiptActualTouch] = useState(""); // %, manual
  const [receiptTakenTouch, setReceiptTakenTouch] = useState("");   // %, manual
  const [receiptGoldRate, setReceiptGoldRate] = useState("");  // ₹, informational
  const [receiptAmount, setReceiptAmount] = useState("");      // ₹, informational

  // ── NEW Cash Received field ──────────────────────────────────
  const [cashPaymentMode, setCashPaymentMode] = useState("Cash"); // GPay/Cash/Card/Debt

  const normalizeCustomerType = (value, fallback = "B2B") => {
    const raw = String(value || fallback || "").toUpperCase();
    if (raw === "B2C") return "B2C";
    if (raw === "DEALER") return "DEALER";
    return "B2B";
  };

  const resolveCustomerRecordId = (customer) =>
    customer?.id || customer?._id || customer?.customerId || "";

  const openSelectedCustomerHistory = useCallback(() => {
    if (!selectedCustomer) return;
    const resolvedCustomerId = resolveCustomerRecordId(selectedCustomer);
    if (!resolvedCustomerId) return;

    const normalizedType = normalizeCustomerType(selectedCustomer?.customerType, "B2B");
    navigation.navigate("BillHistory", {
      customerId: resolvedCustomerId,
      customerType: normalizedType,
      customer: {
        ...selectedCustomer,
        _id: selectedCustomer?._id || resolvedCustomerId,
        id: selectedCustomer?.id || resolvedCustomerId,
        customerId: selectedCustomer?.customerId || resolvedCustomerId,
        customerType: normalizedType,
        type: normalizedType,
        name: selectedCustomer?.name || selectedCustomer?.customerName || "",
        customerName: selectedCustomer?.customerName || selectedCustomer?.name || "",
        phone:
          selectedCustomer?.phone ||
          selectedCustomer?.phoneNumber ||
          selectedCustomer?.customerNumber ||
          "",
      },
    });
  }, [navigation, selectedCustomer]);

  const openSelectedCustomerMiniStatement = useCallback(() => {
    if (!selectedCustomer) return;
    navigation.navigate("MiniStatement", {
      customer: {
        ...selectedCustomer,
        id: selectedCustomer?.id || selectedCustomer?._id || selectedCustomer?.customerId || "",
        customerId:
          selectedCustomer?.customerId || selectedCustomer?.id || selectedCustomer?._id || "",
        name: selectedCustomer?.name || selectedCustomer?.customerName || "",
        customerName: selectedCustomer?.customerName || selectedCustomer?.name || "",
        phone:
          selectedCustomer?.phone ||
          selectedCustomer?.phoneNumber ||
          selectedCustomer?.customerNumber ||
          "",
      },
    });
  }, [navigation, selectedCustomer]);

  const loadHeldTransactions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(B2B_HOLD_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      setHeldTransactions(
        (Array.isArray(parsed) ? parsed : []).sort(
          (a, b) => Number(b?.updatedAtMs || 0) - Number(a?.updatedAtMs || 0)
        )
      );
    } catch (error) {
      console.error("Failed to load held transactions:", error);
      setHeldTransactions([]);
    }
  }, []);

  const persistHeldTransactions = useCallback(async (updater) => {
    const raw = await AsyncStorage.getItem(B2B_HOLD_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    const current = Array.isArray(parsed) ? parsed : [];
    const next = updater(current);
    await AsyncStorage.setItem(B2B_HOLD_STORAGE_KEY, JSON.stringify(next));
    setHeldTransactions(
      next.sort((a, b) => Number(b?.updatedAtMs || 0) - Number(a?.updatedAtMs || 0))
    );
    return next;
  }, []);

  const clearDraftInputsOnly = useCallback(() => {
    setWeight("");
    setStone("0");
    setTouch("");
    setReceiptWeight("");
    setReceiptStone("0");
    setReceiptTouch("");
    setIssueItemSearch("");
    setReceiptItemSearch("");
    setSelectedIssueItem(null);
    setSelectedReceiptItem(null);
    setIssueDetails("");
    setIssueItemDropdownOpen(false);
    setReceiptItemDropdownOpen(false);
    setEditingIssueId(null);
    setEditingReceiptId(null);
    setRupees("");
    setCashPureInput("0.000");
  }, []);

  const resetHeldWorkingProcess = useCallback(() => {
    setSelectedCustomer(null);
    setSearch("");
    setPhone("");
    setIssueItems([]);
    setReceiptItems([]);
    setCashTable([]);
    setDescription("");
    setGoldRate("");
    setDate(new Date().toLocaleDateString("en-GB"));
    setSgst("");
    setCgst("");
    setIgst("");
    setGstPercentage("");
    setGstAmount("");
    setGstEnabled(false);
    setShowGstInBill(true);
    setIsSgstEnabled(false);
    setIsCgstEnabled(false);
    setIsIgstEnabled(false);
    setActiveHoldId("");
    clearDraftInputsOnly();
  }, [clearDraftInputsOnly]);

  const applyHeldTransaction = useCallback((draft = {}) => {
    const draftCustomer = draft?.selectedCustomer || null;
    if (draftCustomer) {
      const customerId =
        draftCustomer?.id || draftCustomer?._id || draftCustomer?.customerId || "";
      const foundCustomer =
        customers.find((cust) => String(cust.id || cust._id || cust.customerId) === String(customerId)) ||
        customers.find((cust) => String(cust.name || "").trim() === String(draftCustomer.name || "").trim());
      const resolvedCustomer = foundCustomer || draftCustomer;
      setSelectedCustomer(resolvedCustomer);
      setSearch(resolvedCustomer?.name || "");
      setPhone(
        resolvedCustomer?.phone ||
          resolvedCustomer?.phoneNumber ||
          resolvedCustomer?.customerNumber ||
          ""
      );
    }

    setDate(draft?.date || new Date().toLocaleDateString("en-GB"));
    setIssueItems(Array.isArray(draft?.issueItems) ? draft.issueItems : []);
    setReceiptItems(Array.isArray(draft?.receiptItems) ? draft.receiptItems : []);
    setCashTable(Array.isArray(draft?.cashTable) ? draft.cashTable : []);
    setDescription(String(draft?.description || ""));
    setGoldRate(String(draft?.goldRate || ""));
    setCashPureInput(String(draft?.cashPureInput || "0.000"));
    setRupees(String(draft?.rupees || ""));
    setWeight(String(draft?.weight || ""));
    setStone(String(draft?.stone ?? "0"));
    setTouch(String(draft?.touch || ""));
    setReceiptWeight(String(draft?.receiptWeight || ""));
    setReceiptStone(String(draft?.receiptStone ?? "0"));
    setReceiptTouch(String(draft?.receiptTouch || ""));
    setIssueItemSearch(String(draft?.issueItemSearch || ""));
    setReceiptItemSearch(String(draft?.receiptItemSearch || ""));
    setSelectedIssueItem(draft?.selectedIssueItem || null);
    setSelectedReceiptItem(draft?.selectedReceiptItem || null);
    setIssueDetails(String(draft?.issueDetails || ""));
    setGstEnabled(Boolean(draft?.gstEnabled));
    setShowGstInBill(draft?.showInBill !== false);
    setSgst(String(draft?.sgst || ""));
    setCgst(String(draft?.cgst || ""));
    setIgst(String(draft?.igst || ""));
    setGstPercentage(String(draft?.gstPercentage || ""));
    setGstAmount(String(draft?.gstAmount || ""));
    setIsSgstEnabled(Boolean(draft?.isSgstEnabled));
    setIsCgstEnabled(Boolean(draft?.isCgstEnabled));
    setIsIgstEnabled(Boolean(draft?.isIgstEnabled));
    setActiveHoldId(String(draft?.id || ""));
    setIssueItemDropdownOpen(false);
    setReceiptItemDropdownOpen(false);
  }, [customers]);

  const removeHeldTransaction = useCallback(async (holdId) => {
    if (!holdId) return;
    await persistHeldTransactions((current) =>
      current.filter((item) => String(item?.id || "") !== String(holdId))
    );
    if (String(activeHoldId || "") === String(holdId)) {
      setActiveHoldId("");
    }
  }, [activeHoldId, persistHeldTransactions]);

  const handleHoldTransaction = useCallback(async () => {
    if (!selectedCustomer) {
      Alert.alert("Select Customer", "Please select a customer before holding the process.");
      return;
    }
    if (!issueItems.length && !receiptItems.length && !cashTable.length && !description.trim()) {
      Alert.alert("No Process", "Add at least one entry before holding this transaction.");
      return;
    }

    const holdId = String(activeHoldId || `${Date.now()}`);
    const holdPayload = {
      id: holdId,
      customerId: resolveCustomerRecordId(selectedCustomer),
      customerName: selectedCustomer?.name || selectedCustomer?.customerName || "Unknown",
      phone:
        selectedCustomer?.phone ||
        selectedCustomer?.phoneNumber ||
        selectedCustomer?.customerNumber ||
        "",
      selectedCustomer,
      issueItems,
      receiptItems,
      cashTable,
      description: String(description || ""),
      date,
      goldRate: String(goldRate || ""),
      rupees: String(rupees || ""),
      cashPureInput: String(cashPureInput || "0.000"),
      weight: String(weight || ""),
      stone: String(stone ?? "0"),
      touch: String(touch || ""),
      receiptWeight: String(receiptWeight || ""),
      receiptStone: String(receiptStone ?? "0"),
      receiptTouch: String(receiptTouch || ""),
      issueItemSearch: String(issueItemSearch || ""),
      receiptItemSearch: String(receiptItemSearch || ""),
      selectedIssueItem,
      selectedReceiptItem,
      issueDetails: String(issueDetails || ""),
      gstEnabled,
      showInBill: showGstInBill,
      sgst: String(sgst || ""),
      cgst: String(cgst || ""),
      igst: String(igst || ""),
      gstPercentage: String(gstPercentage || ""),
      gstAmount: String(gstAmount || ""),
      isSgstEnabled,
      isCgstEnabled,
      isIgstEnabled,
      updatedAtMs: Date.now(),
    };

    await persistHeldTransactions((current) => {
      const filtered = current.filter((item) => String(item?.id || "") !== holdId);
      return [holdPayload, ...filtered];
    });
    resetHeldWorkingProcess();
    Alert.alert("Held", "Process saved temporarily. You can resume it from the held list.");
  }, [
    activeHoldId,
    cashPureInput,
    cashTable,
    cgst,
    date,
    description,
    gstAmount,
    gstEnabled,
    gstPercentage,
    goldRate,
    igst,
    isCgstEnabled,
    isIgstEnabled,
    isSgstEnabled,
    issueDetails,
    issueItemSearch,
    issueItems,
    persistHeldTransactions,
    receiptItemSearch,
    receiptItems,
    receiptStone,
    receiptTouch,
    receiptWeight,
    rupees,
    selectedCustomer,
    selectedIssueItem,
    selectedReceiptItem,
    sgst,
    showGstInBill,
    stone,
    touch,
    weight,
    resetHeldWorkingProcess,
  ]);

  const handleResumeHeldTransaction = useCallback((draft) => {
    applyHeldTransaction(draft);
    Alert.alert("Resumed", "Held process loaded successfully.");
  }, [applyHeldTransaction]);

  // ── TOTALS (after useState, before useEffect) ───────────────
  const totals = useMemo(() => {
    const totalIssuePure = issueItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0,
    );
    const totalIssueWeight = issueItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0,
    );
    const totalIssueStone = issueItems.reduce(
      (acc, it) => acc + Number(it.stone || 0),
      0,
    );
    const totalIssueTouch = issueItems.reduce(
      (acc, it) => acc + Number(it.touch || 0),
      0,
    );
    const totalReceiptPure = receiptItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0,
    );
    const totalReceiptWeight = receiptItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0,
    );
    const totalReceiptStone = receiptItems.reduce(
      (acc, it) => acc + Number(it.stone || 0),
      0,
    );
    const totalReceiptTouch = receiptItems.reduce(
      (acc, it) => acc + Number(it.touch || 0),
      0,
    );
    const totalCashPure = cashTable.reduce(
      (acc, it) => acc + Math.abs(Number(it.pure || 0)),
      0,
    );
    const positiveCashPureTotal = cashTable.reduce((acc, it) => {
      const pure = Math.abs(Number(it.pure || 0));
      return Number(it.rupees || 0) >= 0 ? acc + pure : acc;
    }, 0);
    const negativeCashPureTotal = cashTable.reduce((acc, it) => {
      const pure = Math.abs(Number(it.pure || 0));
      return Number(it.rupees || 0) < 0 ? acc - pure : acc;
    }, 0);

    return {
      totalIssuePure,
      totalIssueWeight,
      totalIssueStone,
      totalIssueTouch,
      totalReceiptPure,
      totalReceiptWeight,
      totalReceiptStone,
      totalReceiptTouch,
      totalCashPure,
      positiveCashPureTotal,
      negativeCashPureTotal,
      totalCartItems: issueItems.length + receiptItems.length,
      totalCartPure: totalIssuePure + totalReceiptPure,
    };
  }, [issueItems, receiptItems, cashTable]);
  const {
    totalIssuePure,
    totalIssueWeight,
    totalIssueStone,
    totalIssueTouch,
    totalReceiptPure,
    totalReceiptWeight,
    totalReceiptStone,
    totalReceiptTouch,
    totalCashPure,
    positiveCashPureTotal,
    negativeCashPureTotal,
    totalCartItems,
    totalCartPure,
  } = totals;
  const ftRateNum = Number(goldRate);
  const ftRateValue = Number.isFinite(ftRateNum) ? ftRateNum : 0;
  const issueFtAmount = totalIssuePure * ftRateValue;
  const receiptFtAmount = totalReceiptPure * ftRateValue;
  const netBillPure = Math.max(0, totalIssuePure - totalReceiptPure - positiveCashPureTotal);
  const taxableBillAmount = netBillPure * ftRateValue;
  const sgstPercentValue = gstEnabled && isSgstEnabled ? (Number(sgst) || 0) : 0;
  const cgstPercentValue = gstEnabled && isCgstEnabled ? (Number(cgst) || 0) : 0;
  const sgstAmountValue = (taxableBillAmount * sgstPercentValue) / 100;
  const cgstAmountValue = (taxableBillAmount * cgstPercentValue) / 100;
  const totalGstValue = sgstAmountValue + cgstAmountValue;
  const finalBillAmountWithGst = taxableBillAmount + totalGstValue;

  // ── useEffects AFTER totals ──────────────────────────────────
  useEffect(() => {
    saveStock();
  }, [itemsStock]);

  // Handle customer name change for searchable dropdown
  const handleCustomerNameChange = (text) => {
    setSearch(text);
    if (text) {
      const filtered = customers.filter(
        (customer) =>
          customer.name &&
          customer.name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearch(customer.name);
    setPhone(customer.phone || "");
    setShowDropdown(false);
  };

  const fetchLatestB2BGstSettings = useCallback(async ({ applyEnabled = false } = {}) => {
    try {
      const response = await fetch(`${base_url}/gst`);
      const data = await response.json();
      const latestB2B = Array.isArray(data)
        ? data.find((item) => item.type === "B2B")
        : null;

      if (!latestB2B) return false;

      const nextSgst = String(latestB2B.sgst ?? "0");
      const nextCgst = String(latestB2B.cgst ?? "0");
      setLatestB2BGstRecord(latestB2B);

      setSgst(nextSgst);
      setCgst(nextCgst);
      setIgst("0");
      setIsSgstEnabled((Number(nextSgst) || 0) > 0);
      setIsCgstEnabled((Number(nextCgst) || 0) > 0);
      setIsIgstEnabled(false);

      if (applyEnabled) {
        setGstEnabled(Boolean(latestB2B.enabled));
      }
      return true;
    } catch (error) {
      console.error("Failed to fetch GST settings in B2B", error);
      return false;
    }
  }, []);
  // Load latest B2B GST settings from DB on mount
  useEffect(() => {
    fetchLatestB2BGstSettings();
  }, [fetchLatestB2BGstSettings]);


  // ✅ Load latest B2B GST settings from DB whenever page is focused
  useFocusEffect(
    useCallback(() => {
      fetchLatestB2BGstSettings({ applyEnabled: true });
      fetchItems(); // ✅ Refresh items from database when page is focused
      loadHeldTransactions();
    }, [fetchLatestB2BGstSettings, loadHeldTransactions])
  );

  useEffect(() => {
    if (gstEnabled) {
      // 1. Calculate Total Percentage from GST page values (B2B SGST+CGST only)
      const s = isSgstEnabled ? parseNum(sgst) : 0;
      const c = isCgstEnabled ? parseNum(cgst) : 0;
      const totalPct = s + c;
      const pctString = totalPct.toFixed(2);

      if (gstPercentage !== pctString) {
        setGstPercentage(pctString);
      }

      // 2. Calculate Rupee Amount from live bill amount (net pure * FT rate)
      const rate = parseNum(goldRate);
      const netPure = Math.max(
        0,
        Number(totalIssuePure || 0) -
          Number(totalReceiptPure || 0) -
          Number(totalCashPure || 0),
      );
      const billAmount = netPure * rate;
      const calculatedAmount = (billAmount * totalPct) / 100;

      // Update amount state if different
      const amountString = calculatedAmount.toFixed(2);
      if (gstAmount !== amountString) {
        setGstAmount(amountString);
      }

      console.log(
        `📊 B2B GST Sync: NetPure=${netPure.toFixed(3)}, Rate=${rate}, Bill=₹${billAmount.toFixed(2)}, Pct=${totalPct}% -> GST=₹${amountString}`,
      );
    } else {
      if (gstPercentage !== "0.00") setGstPercentage("0.00");
      if (gstAmount !== "0.00") setGstAmount("0.00");
    }
  }, [
    gstEnabled,
    isSgstEnabled,
    isCgstEnabled,
    isIgstEnabled,
    sgst,
    cgst,
    igst,
    goldRate,
    totalIssuePure,
    totalReceiptPure,
    totalCashPure,
  ]);

  // Handler for stock update on receipt weight blur
  const updateReceiptStock = async (newWeight) => {
    if (!selectedReceiptItem || !itemsStock[selectedReceiptItem]?._id) return;

    const newW = parseNum(newWeight);
    const delta = newW - parseNum(previousReceiptWeight);

    if (delta !== 0) {
      // Update local stock
      setItemsStock((prev) => ({
        ...prev,
        [selectedReceiptItem]: {
          ...prev[selectedReceiptItem],
          weight: (
            Number(prev[selectedReceiptItem]?.weight || 0) + delta
          ).toFixed(3),
        },
      }));

      // Update stock in database
      try {
        const currentStock = Number(
          itemsStock[selectedReceiptItem]?.weight || 0,
        );
        const updatedWeight = Number((currentStock + delta).toFixed(3));

        const stockResponse = await fetch(
          `${base_url}/stockMaster/${itemsStock[selectedReceiptItem]?._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemName: selectedReceiptItem,
              grossWeight: updatedWeight,
              netWeight: updatedWeight,
            }),
          },
        );

        if (!stockResponse.ok) {
          console.error("Failed to update stock in database on blur");
        } else {
          console.log("✅ Stock updated in database on blur");
        }
      } catch (stockError) {
        console.error("Error updating stock on blur:", stockError);
      }
    }

    setPreviousReceiptWeight(newWeight);
  };

  const recentCustomers = useMemo(() => {
    const recentCustomerSet = new Set(recentNames);
    return customers.filter((c) => recentCustomerSet.has(c.name));
  }, [customers, recentNames]);
  const filteredCartCustomers = useMemo(() => {
    if (!cartSearch.trim()) return recentCustomers;
    const normalizedSearch = cartSearch.toLowerCase();
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(normalizedSearch)) ||
        (c.phone && String(c.phone).includes(cartSearch)),
    );
  }, [cartSearch, customers, recentCustomers]);

  const visibleReceiptItems = useMemo(
    () =>
      itemsList
        .filter(
          (it) =>
            it.itemName.toLowerCase().includes(receiptItemSearch.toLowerCase()) &&
            (it.type === "receipt" || it.receipt),
        )
        .slice(0, 3),
    [itemsList, receiptItemSearch],
  );

  const handleSelectCustomer = useCallback((cust) => {
    setSelectedCustomer(cust);
  }, []);
  const handleOthersConfirm = useCallback(async () => {
    const value = String(othersName || "").trim();
    if (!value) {
      Alert.alert("Invalid Name", "Please enter a customer name.");
      return;
    }

    const existing = customers.find(
      (cust) =>
        String(cust?.name || "").trim().toLowerCase() === value.toLowerCase() &&
        String(cust?.company || cust?.shopName || "").trim().toLowerCase() === "others",
    );
    if (existing) {
      setSelectedCustomer(existing);
      setSearch(existing.name || value);
      setCartSearch("");
      setPhone(existing.phone || "");
      setShowOthersInput(false);
      setOthersName("");
      return;
    }

      try {
        const payload = {
          customerName: value,
          phoneNumber: "0000000000",
          shopName: "Others",
          address: "Others",
          oldBalance: 0,
          advanceBalance: 0,
          gstin: "",
          customerType: "B2B",
        };
      const response = await fetch(`${base_url}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to save Others entry");
      }
      const saved = await response.json();
      const newCustomer = {
        ...saved,
        customerType: normalizeCustomerType(saved.customerType, "B2B"),
        customerNumber: saved.phoneNumber,
        customerId: saved.customerId,
        id: saved._id,
        name: saved.customerName,
        ob: Number(saved.oldBalance || 0),
        ab: Number(saved.advanceBalance || 0),
        company: saved.shopName || "",
        phone: saved.phoneNumber || "",
        email: saved.emailId || "",
        address: saved.address || "",
        gst: saved.gstin || "",
        customerName: saved.customerName,
        shopName: saved.shopName || "Others",
        oldBalance: Number(saved.oldBalance || 0) || 0,
        advanceBalance: Number(saved.advanceBalance || 0) || 0,
        billCurrentBalance:
          (Number(saved.oldBalance || 0) || 0) - (Number(saved.advanceBalance || 0) || 0),
        updatedAt: saved.updatedAt || new Date().toISOString(),
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      setSelectedCustomer(newCustomer);
      setSearch(newCustomer.name || value);
      setCartSearch("");
      setPhone(newCustomer.phone || "");
      setShowOthersInput(false);
      setOthersName("");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to save Others entry");
    }
  }, [customers, normalizeCustomerType, othersName]);

  const handleSelectReceiptDropdownItem = useCallback((it) => {
    const buyingValue = it?.buyingTouch;
    const sellingValue = it?.sellingTouch;

    setSelectedReceiptItem(it.itemName);
    setReceiptItemDropdownOpen(false);
    setReceiptItemSearch(it.itemName);
    setReceiptStone(
      buyingValue === null || buyingValue === undefined ? "" : String(buyingValue),
    );
    setReceiptTouch(
      sellingValue === null || sellingValue === undefined ? "" : String(sellingValue),
    );
  }, []);

  const customerListData = useMemo(() => {
    if (!cartSearch && recentNames.length > 0) {
      return recentCustomers.map((cust, index) => ({
        ...cust,
        __listKey: `recent-${cust.id || index}`,
        __highlight: true,
      }));
    }
    return filteredCartCustomers.map((cust, index) => ({
      ...cust,
      __listKey: String(cust.id || index),
      __highlight: false,
    }));
  }, [cartSearch, recentNames.length, recentCustomers, filteredCartCustomers]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const [b2bResponse, billResponse] = await Promise.all([
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/billSummary?billType=B2B`),
      ]);
      const b2bData = await b2bResponse.json();
      const billRows = billResponse.ok ? await billResponse.json() : [];
      const normalizeId = (value) => String(value || "").trim().toLowerCase();
      const normalizeName = (value) => String(value || "").trim().toLowerCase();
      const getRowTs = (row) =>
        new Date(row?.updatedAt || row?.createdAt || row?.date || 0).getTime() || 0;
      const latestBillRows = [...(Array.isArray(billRows) ? billRows : [])]
        .filter((row) => {
          const dealerType = String(row?.dealerType || "").toUpperCase();
          return dealerType !== "DEALER" && dealerType !== "SUPPLIER";
        })
        .sort((a, b) => getRowTs(b) - getRowTs(a));
      const resolveLatestBalanceState = (customer) => {
        const customerIds = new Set(
          [customer?._id, customer?.customerId, customer?.id]
            .map((value) => normalizeId(value))
            .filter(Boolean),
        );
        const customerName = normalizeName(customer?.customerName || customer?.name);
        const latestBill = latestBillRows.find((row) => {
          const billCustomerId = normalizeId(row?.customerId);
          const billCustomerName = normalizeName(row?.customerName);
          return customerIds.has(billCustomerId) || (customerName && billCustomerName === customerName);
        });
        if (!latestBill) {
          return {
            oldBalance: Number(customer?.oldBalance || 0),
            advanceBalance: Number(customer?.advanceBalance || 0),
          };
        }

        const customerUpdatedTs =
          new Date(customer?.updatedAt || customer?.createdAt || 0).getTime() || 0;
        const latestBillTs =
          new Date(latestBill?.updatedAt || latestBill?.createdAt || latestBill?.date || 0).getTime() || 0;

        // If customer master was updated after the latest bill, keep the fresh DB balance.
        if (customerUpdatedTs && latestBillTs && customerUpdatedTs >= latestBillTs) {
          return {
            oldBalance: Number(customer?.oldBalance || 0),
            advanceBalance: Number(customer?.advanceBalance || 0),
          };
        }

        const latestBalanceType = String(
          latestBill.balanceType || latestBill.summary?.balanceType || "",
        ).toUpperCase();
        const latestBalanceValue = Number(
          latestBill.balanceValue ?? latestBill.summary?.balanceValue ?? latestBill.finalBalance,
        );
        if (Number.isFinite(latestBalanceValue) && latestBalanceType) {
          return {
            oldBalance: latestBalanceType === "OB" ? latestBalanceValue : 0,
            advanceBalance: latestBalanceType === "AB" ? latestBalanceValue : 0,
          };
        }
        const currentBalance = Number(
          latestBill.currentBalance ?? latestBill.availableBalance ?? latestBill.summary?.current,
        );
        return Number.isFinite(currentBalance)
          ? deriveBalanceStateFromNet(currentBalance)
          : {
              oldBalance: Number(latestBill.oldBalance ?? latestBill.ob ?? customer?.oldBalance ?? 0),
              advanceBalance: Number(
                latestBill.advanceBalance ?? latestBill.advBal ?? customer?.advanceBalance ?? 0,
              ),
            };
      };

      const b2bCustomers = b2bData
        .filter((customer) => {
          if (!customer.customerName) return false;
          const normalizedType = normalizeCustomerType(customer.customerType, "B2B");
          return normalizedType === "B2B";
        })
        .map((customer) => {
          const latestBalanceState = resolveLatestBalanceState(customer);
          return {
            ...customer,
            customerType: normalizeCustomerType(customer.customerType, "B2B"),
            customerNumber: customer.phoneNumber,
            customerId: customer.customerId,
            id: customer._id, // ✅ MongoDB _id for API calls
            // ✅ These are what the UI uses in filteredCartCustomers & display
            name: customer.customerName,
            ob: latestBalanceState.oldBalance,
            ab: latestBalanceState.advanceBalance,
            company: customer.shopName || "",
            phone: customer.phoneNumber || "",
            email: customer.emailId || "",
            address: customer.address || "",
            gst: customer.gstin || "",
            // ✅ Keep these too for CustomerMasterList
            customerName: customer.customerName,
            shopName: customer.shopName || customer.companyName || "No Shop Name",
            oldBalance: latestBalanceState.oldBalance,
            advanceBalance: latestBalanceState.advanceBalance,
            billCurrentBalance:
              latestBalanceState.oldBalance - latestBalanceState.advanceBalance,
            updatedAt: customer.updatedAt || new Date().toISOString(),
          };
        });

      setCustomers(b2bCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      Alert.alert("Error", "Failed to load customers from database");
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchRecentNames = async () => {
    try {
      const resp = await fetch(`${base_url}/transactions`);
      if (resp.ok) {
        const data = await resp.json();
        // Extract last 15 unique customer names
        const names = [
          ...new Set(
            data
              .filter(
                (t) =>
                  normalizeCustomerType(t?.customerType || t?.type, "B2B") === "B2B"
              )
              .map((t) => t.customerName)
              .filter(Boolean),
          ),
        ].slice(0, 15);
        setRecentNames(names);
      }
    } catch (err) {
      console.error("Recent names error:", err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const stockResponse = await fetch(`${base_url}/stockMaster`);

      if (!stockResponse.ok) {
        throw new Error("Failed to fetch stock");
      }

      const stockData = await stockResponse.json();
      const safeStockData = Array.isArray(stockData) ? stockData : [];
      
      const itemsList = safeStockData.map((item) => ({
        itemName: item.itemName || "",
        buyingTouch: item.buyingTouch || 0,
        sellingTouch: item.sellingTouch || 0,
        type: "receipt", // Default for B2B dropdowns if needed
        receipt: true,
        issue: true,
        grossWeight: item.grossWeight || 0,
        itemNumber: item.itemNumber || "",
        id: item._id
      })).filter(it => it.itemName);

      setItemsList(itemsList);

      let stockObj = {};
      safeStockData.forEach((item) => {
        const name = item.itemName;
        const weight = Number(item.grossWeight || 0);
        if (stockObj[name]) {
          stockObj[name].weight += weight;
        } else {
          stockObj[name] = { weight: weight, _id: item._id };
        }
      });
      setItemsStock(stockObj);
    } catch (error) {
      console.error("Error fetching items:", error);
      Alert.alert("Error", "Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchRecentNames();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, []),
  );

  useEffect(() => {
    if (!selectedCustomer?.isGstCustomer) {
      setBillTypeLabel("");
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const selectedPhone = String(
      selectedCustomer?.phone || selectedCustomer?.customerNumber || selectedCustomer?.phoneNumber || ""
    ).trim();

    if (!selectedPhone || !Array.isArray(customers) || customers.length === 0) return;

    const latestCustomer = customers.find(
      (item) =>
        String(item?.phone || item?.customerNumber || item?.phoneNumber || "").trim() ===
        selectedPhone
    );

    if (!latestCustomer) return;

    const prevOb = Number(parseNum(selectedCustomer?.ob ?? selectedCustomer?.oldBalance));
    const prevAb = Number(parseNum(selectedCustomer?.ab ?? selectedCustomer?.advanceBalance));
    const nextOb = Number(parseNum(latestCustomer?.ob ?? latestCustomer?.oldBalance));
    const nextAb = Number(parseNum(latestCustomer?.ab ?? latestCustomer?.advanceBalance));

    if (prevOb === nextOb && prevAb === nextAb) return;

    setSelectedCustomer((prev) => ({
      ...prev,
      ...latestCustomer,
      phone:
        latestCustomer?.phone ||
        latestCustomer?.customerNumber ||
        latestCustomer?.phoneNumber ||
        prev?.phone ||
        "",
      ob: nextOb,
      ab: nextAb,
      oldBalance: nextOb,
      advanceBalance: nextAb,
    }));
  }, [customers, selectedCustomer]);

  // Handle new customer from CreateCustomerMaster
  useFocusEffect(
    useCallback(() => {
      if (route.params?.newCustomer) {
        const newCust = {
          ...route.params.newCustomer,
          customerType: normalizeCustomerType(
            route.params.newCustomer?.customerType,
            "B2B",
          ),
        };
        setCustomers((prev) => [...prev, newCust]);
        setSelectedCustomer(newCust);
        setPhone(newCust.phone || "");
        // Clear the param to avoid re-adding
        navigation.setParams({ newCustomer: undefined });
      }
    }, [route.params?.newCustomer, navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.gstCustomer) {
        const gstCustomer = route.params.gstCustomer;
        setSelectedCustomer(gstCustomer);
        setSearch(gstCustomer.name || "");
        setPhone(gstCustomer.phone || "");
        if (route.params?.billTypeLabel) {
          setBillTypeLabel(route.params.billTypeLabel);
        }
        if (route.params?.forceGstEnabled) {
          setGstEnabled(true);
          const sgstNum = Number(sgst) || 0;
          const cgstNum = Number(cgst) || 0;
          const igstNum = Number(igst) || 0;
          setIsSgstEnabled(sgstNum > 0);
          setIsCgstEnabled(cgstNum > 0);
          setIsIgstEnabled(igstNum > 0);
        }
        navigation.setParams({
          gstCustomer: undefined,
          billTypeLabel: undefined,
          forceGstEnabled: undefined,
        });
      }
    }, [route.params?.gstCustomer, route.params?.billTypeLabel, route.params?.forceGstEnabled, navigation, sgst, cgst, igst]),
  );

  // Load gold rate from route params or AsyncStorage on focus
  useFocusEffect(
    useCallback(() => {
      const loadGoldRate = async () => {
        try {
          // First check if goldRate is passed via route params
          if (route.params?.goldRate) {
            setGoldRate(route.params.goldRate);
            // Also save to AsyncStorage for consistency
            await AsyncStorage.setItem("goldRate", route.params.goldRate);
          } else {
            // Fallback to AsyncStorage
            const storedGoldRate = await AsyncStorage.getItem("goldRate");
            if (storedGoldRate) {
              setGoldRate(storedGoldRate);
            }
          }
        } catch (error) {
          console.error("Error loading gold rate:", error);
        }
      };
      loadGoldRate();
    }, [route.params?.goldRate]),
  );

  // Function to refresh all data
  const handleRefresh = async () => {
    console.log("🔄 Refreshing data...");
    await fetchCustomers();
    await fetchItems();
    await fetchRecentNames();
    await refreshGoldRate();
    console.log("Success", "Data refreshed from database");
  };

  // Handle previewData or estimate from route params
  useEffect(() => {
    if (route.params?.previewData) {
      const data = route.params.previewData;
      console.log("📥 Received previewData:", data);

      // 1. Handle Customer Context
      if (data.customerName) {
        const cust = customers.find((c) => c.name === data.customerName);
        if (cust) {
          setSelectedCustomer(cust);
          setSearch(cust.name);
          setPhone(cust.phone || "");
        } else {
          setSelectedCustomer({
            name: data.customerName,
            id: data.customerId || "N/A",
            phone: data.phone || "",
            ob: data.oldBalance || 0,
            ab: data.advBal || 0,
          });
          setSearch(data.customerName);
          setPhone(data.phone || "");
        }
      }

      // 2. Handle Item(s)
      if (data.items && Array.isArray(data.items)) {
        // Multi-item transfer
        const mappedItems = data.items.map((it) => {
          const w = it.weight || 0;
          const t = it.touch || it.wastagePercent || 0;
          const s = it.stone || 0;
          const purity = calcIssuePure(w, s, t);
          return {
            id: Date.now() + Math.random(),
            item: it.itemName || it.item,
            weight: Number(w),
            stone: Number(s),
            touch: Number(t),
            purity: purity,
            type: "issue",
          };
        });
        setIssueItems((prev) => [...prev, ...mappedItems]);
      } else if (data.itemName) {
        // Single item transfer
        const w = data.weight || 0;
        const t = data.touch || 0;
        const s = data.stone || 0;
        const purity = calcIssuePure(w, s, t);

        setIssueItems((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            item: data.itemName,
            weight: Number(w),
            stone: Number(s),
            touch: Number(t),
            purity: purity,
            type: "issue",
          },
        ]);
      }

      // 3. Handle FT Rate
      if (data.ftRate) {
        setGoldRate(data.ftRate.toString());
      }

      // Reset parameters to prevent re-processing on re-mounts
      navigation.setParams({ previewData: undefined });
    }
  }, [route.params?.previewData, customers, navigation]);

  useEffect(() => {
    if (!route.params?.editTransaction) return;
    const t = route.params.editTransaction;
    const c = route.params.editCustomer || {};

    const customerId = c.id || c._id || c.customerId || t.customerId;
    const foundCustomer =
      customers.find((cust) => String(cust.id) === String(customerId)) ||
      customers.find((cust) => cust.name === (c.customerName || c.name || t.customerName));

    if (foundCustomer) {
      setSelectedCustomer(foundCustomer);
      setSearch(foundCustomer.name || "");
      setPhone(foundCustomer.phone || "");
    } else {
      setSelectedCustomer({
        id: customerId,
        name: c.customerName || c.name || t.customerName || "Unknown",
        phone: c.customerNumber || c.phone || c.phoneNumber || "",
        customerType: normalizeCustomerType(c.customerType || c.type, "B2B"),
        gst: c.gstin || "",
        address: c.address || "",
      });
      setSearch(c.customerName || c.name || t.customerName || "");
      setPhone(c.customerNumber || c.phone || c.phoneNumber || "");
    }

    setDate(
      t.date ||
      (t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"))
    );

    setIssueItems(
      (Array.isArray(t.issueItems) ? t.issueItems : []).map((item, idx) => ({
        id: Date.now() + idx,
        item: item.name || item.item || "",
        weight: Number(item.gross ?? item.weight ?? 0),
        stone: Number(item.m ?? item.stone ?? 0),
        touch: Number(item.calc ?? item.touch ?? 0),
        purity: Number(item.pure ?? item.purity ?? 0),
        type: "issue",
      }))
    );

    setReceiptItems(
      (Array.isArray(t.receiptItems) ? t.receiptItems : []).map((item, idx) => ({
        id: Date.now() + idx + 1000,
        item: item.name || item.item || "",
        weight: Number(item.weight ?? 0),
        stone: Number(item.result ?? item.stone ?? 0),
        touch: Number(item.calc ?? item.touch ?? 0),
        purity: Number(item.pure ?? item.purity ?? 0),
        type: "receipt",
      }))
    );

    setCashTable(
      (Array.isArray(t.cashTable) ? t.cashTable : []).map((item, idx) => ({
        id: Date.now() + idx + 2000,
        rupees: Number(item.rupees ?? 0),
        goldRate: Number(item.goldRate ?? 0),
        pure: Number(item.pure ?? 0),
      }))
    );
    setDescription(String(t.description || ""));
  }, [route.params?.editTransaction, route.params?.editCustomer, customers]);

  // Function to refresh gold rate
  const refreshGoldRate = async () => {
    try {
      const storedGoldRate = await AsyncStorage.getItem("goldRate");
      if (storedGoldRate) {
        setGoldRate(storedGoldRate);
        setCashPureInput(fmt(computeCashPure(rupees || 0, storedGoldRate)));
      }
    } catch (error) {
      console.error("Error refreshing gold rate:", error);
    }
  };

  // -----------------------
  // Utilities & Calculators
  // -----------------------
  const parseNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // Issue purity: weight × plus / 100  (plus = sriBill - sriCost)
  const calcIssuePure = (w, plus) => {
    const W = parseNum(w);
    const P = parseNum(plus);
    return Number((W * (P / 100)).toFixed(3));
  };

  // Receipt purity: (weight - less) × takenTouch / 100
  const calcReceiptPure = (w, less, takenTouch) => {
    const W = parseNum(w);
    const L = parseNum(less);
    const T = parseNum(takenTouch);
    return Number(((W - L) * (T / 100)).toFixed(3));
  };

  // Cash pure from rupees and goldRate
  const computeCashPure = (r, rate) => {
    const R = parseNum(r);
    const G = parseNum(rate);
    if (G <= 0) return 0;
    return Number((Math.abs(R) / G).toFixed(3));
  };

  // Format helper
  const fmt = (n) => Number(n || 0).toFixed(3);
  const fmt2 = (n) => Number(n || 0).toFixed(2);

  const fetchStockByBarcode = async (barcodeValue) => {
    const code = String(barcodeValue || "").trim();
    if (!code) return;
    try {
      const response = await fetch(`${base_url}/stockMaster/barcode/${encodeURIComponent(code)}`);
      if (response.ok) {
        const stock = await response.json();
        setSelectedIssueItem(stock.itemName);
        setIssueItemSearch(stock.itemName);
        setWeight(stock.grossWeight?.toString() || "");
        setIssueItemNumber(stock.itemNumber || "");
        setBuyingCost(stock.buyingTouch?.toString() || "0");
        setSriCost(stock.buyingTouch?.toString() || "0");
        setIssueBarcode(code);
      } else {
        Alert.alert("Not Found", "No stock item found for this barcode.");
      }
    } catch {
      Alert.alert("Error", "Failed to fetch item by barcode.");
    }
  };

  const openIssueScanner = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera permission is needed to scan barcodes.");
        return;
      }
    }
    setIssueScannerVisible(true);
  };

  const clearIssueEntryInputs = () => {
    setWeight("");
    setBuyingCost("");
    setSellingCost("");
    setPlusValue(0);
    setSriCost("");
    setSriBill("");
    setIssueCount("1");
    setIssueItemNumber("");
    setIssueBillNo("");
    setIssueDetails("");
    setSelectedIssueItem(null);
    setIssueItemSearch("");
    setIssueBarcode("");
    setEditingIssueId(null);
  };

  const clearReceiptEntryInputs = () => {
    setReceiptWeight("");
    setReceiptStone("0");
    setReceiptTouch("");
    setReceiptBillNo("");
    setReceiptType("");
    setReceiptLess("");
    setReceiptActualTouch("");
    setReceiptTakenTouch("");
    setReceiptGoldRate("");
    setReceiptAmount("");
    setSelectedReceiptItem(null);
    setReceiptItemSearch("");
    setEditingReceiptId(null);
  };

  const adjustLocalStock = (itemName, delta) => {
    if (!itemName || !Number.isFinite(Number(delta))) return;
    setItemsStock((prev) => ({
      ...prev,
      [itemName]: {
        ...prev[itemName],
        weight: Number((((prev[itemName]?.weight || 0) + Number(delta))).toFixed(3)),
      },
    }));
  };

  // -----------------------
  // Add / Remove operations
  // -----------------------
  const addIssueItem = async () => {
    console.log("🔵 addIssueItem called");

    if (!selectedIssueItem) {
      Alert.alert("Select Item", "Please choose an issue item before adding.");
      return;
    }

    if (!selectedCustomer) {
      Alert.alert("Select Customer", "Please select a customer first.");
      return;
    }

    const issueWeight = parseNum(weight);
    // Use new calculation with sriCost and sriBill via plusValue which is already set
    const currentPlus = parseNum(sriBill) - parseNum(sriCost);
    const purity = calcIssuePure(weight, currentPlus);

    if (editingIssueId) {
      const existingItem = issueItems.find((item) => item.id === editingIssueId);
      if (!existingItem) {
        setEditingIssueId(null);
      } else {
        adjustLocalStock(existingItem.item, existingItem.weight);
        adjustLocalStock(selectedIssueItem, -issueWeight);
        setIssueItems((prev) =>
          prev.map((item) =>
            item.id === editingIssueId
              ? {
                  ...item,
                  item: selectedIssueItem,
                  itemNumber: issueItemNumber,
                  weight: issueWeight,
                  count: parseNum(issueCount),
                  sriCost: parseNum(sriCost),
                  sriBill: parseNum(sriBill),
                  plus: currentPlus,
                  purity,
                  details: issueDetails,
                  type: "issue",
                }
              : item,
          ),
        );
        clearIssueEntryInputs();
        return;
      }
    }

    console.log("📊 Calculated purity:", purity);

    const issueEntryData = {
      itemName: selectedIssueItem,
      itemNumber: issueItemNumber,
      weight: issueWeight,
      count: parseNum(issueCount),
      sriCost: parseNum(sriCost),
      sriBill: parseNum(sriBill),
      plus: currentPlus,
      purity: purity,
      // Sending optional old fields as zero
      buyingCost: 0,
      sellingCost: 0,
    };

    console.log("📤 Sending to backend:", issueEntryData);
    console.log("🌐 URL:", `${base_url}/issueEntries`);

    try {
      const response = await fetch(`${base_url}/issueEntries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(issueEntryData),
      });

      console.log("📥 Response status:", response.status);

      const responseText = await response.text();
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedEntry = JSON.parse(responseText);
      console.log("✅ Saved successfully:", savedEntry);

      // Store the generated bill number locally
      const generatedBillNo = savedEntry?.issueEntry?.billNo || savedEntry?.billNo || "";

      // Update stock in database
      try {
        const currentStock = Number(itemsStock[selectedIssueItem]?.weight || 0);
        const newWeight = Number((currentStock - issueWeight).toFixed(3));

        const stockResponse = await fetch(
          `${base_url}/stockMaster/${itemsStock[selectedIssueItem]?._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemName: selectedIssueItem,
              weight: newWeight,
              less: 0,
              netWeight: newWeight,
              calculation: 0,
              pure: 0,
            }),
          },
        );

        if (!stockResponse.ok) {
          console.error("Failed to update stock in database");
        } else {
          console.log("✅ Stock updated in database");
        }
      } catch (stockError) {
        console.error("Error updating stock:", stockError);
      }

      // Update local stock
      adjustLocalStock(selectedIssueItem, -issueWeight);

      // Add to issue items
      setIssueItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          billNo: generatedBillNo,
          item: selectedIssueItem,
          itemNumber: issueItemNumber,
          weight: issueWeight,
          count: parseNum(issueCount),
          sriCost: parseNum(sriCost),
          sriBill: parseNum(sriBill),
          plus: currentPlus,
          purity,
          cost: parseFloat((issueWeight * parseFloat(goldRate || 0)).toFixed(2)),
          details: issueDetails,
          type: "issue",
        },
      ]);

      // Clear inputs
      clearIssueEntryInputs();

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const addReceiptItem = async () => {
    console.log("🟢 addReceiptItem called");

    // We no longer strict-require a pre-selected item from dropdown if they just type receiptType
    // But to keep it simple, we use `receiptType` as `itemName` if they don't select one.
    const finalItemName = selectedReceiptItem || receiptType || "Old Gold";

    if (!selectedCustomer) {
      Alert.alert("Select Customer", "Please select a customer first.");
      return;
    }

    const receiptW = parseNum(receiptWeight);

    if (receiptW <= 0) {
      Alert.alert(
        "Invalid Weight",
        "Please enter a valid weight greater than 0",
      );
      return;
    }

    const purity = calcReceiptPure(receiptWeight, receiptLess, receiptTakenTouch);

    if (editingReceiptId) {
      const existingItem = receiptItems.find((item) => item.id === editingReceiptId);
      if (!existingItem) {
        setEditingReceiptId(null);
      } else {
        adjustLocalStock(existingItem.item, -existingItem.weight);
        adjustLocalStock(finalItemName, receiptW);
        setReceiptItems((prev) =>
          prev.map((item) =>
            item.id === editingReceiptId
              ? {
                  ...item,
                  billNo: receiptBillNo,
                  item: finalItemName,
                  typeText: receiptType,
                  weight: Number(receiptW.toFixed(3)),
                  less: Number(parseNum(receiptLess).toFixed(3)),
                  actualTouch: Number(parseNum(receiptActualTouch).toFixed(3)),
                  takenTouch: Number(parseNum(receiptTakenTouch).toFixed(3)),
                  goldRate: Number(parseNum(receiptGoldRate).toFixed(2)),
                  amount: Number(parseNum(receiptAmount).toFixed(2)),
                  purity,
                  type: "receipt",
                }
              : item,
          ),
        );
        clearReceiptEntryInputs();
        return;
      }
    }

    console.log("📊 Calculated purity:", purity);

    const receiptEntryData = {
      billNo: receiptBillNo,
      receiptType: receiptType,
      itemName: finalItemName,
      weight: receiptW,
      less: parseNum(receiptLess),
      actualTouch: parseNum(receiptActualTouch),
      takenTouch: parseNum(receiptTakenTouch),
      goldRate: parseNum(receiptGoldRate),
      amount: parseNum(receiptAmount),
      purity: purity,
    };

    console.log("📤 Sending to backend:", receiptEntryData);
    console.log("🌐 URL:", `${base_url}/receiptEntries`);

    try {
      const response = await fetch(`${base_url}/receiptEntries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(receiptEntryData),
      });

      console.log("📥 Response status:", response.status);

      const responseText = await response.text();
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedEntry = JSON.parse(responseText);
      console.log("✅ Saved successfully:", savedEntry);

      // Update stock in database (only if we have an item id, might be manual text)
      if (itemsStock[finalItemName]?._id) {
        try {
          const currentStock = Number(
            itemsStock[finalItemName]?.weight || 0,
          );
          const newWeight = Number((currentStock + receiptW).toFixed(3));

          const stockResponse = await fetch(
            `${base_url}/stockMaster/${itemsStock[finalItemName]?._id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                itemName: finalItemName,
                weight: newWeight,
                less: 0,
                netWeight: newWeight,
                calculation: 0,
                pure: 0,
              }),
            },
          );

          if (!stockResponse.ok) {
            console.error("Failed to update stock in database");
          } else {
            console.log("✅ Stock updated in database");
          }
        } catch (stockError) {
          console.error("Error updating stock:", stockError);
        }
      }

      // ➕ Increase item stock locally
      adjustLocalStock(finalItemName, receiptW);

      // Add to receipt items
      setReceiptItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          billNo: receiptBillNo,
          item: finalItemName,
          typeText: receiptType,
          weight: Number(receiptW.toFixed(3)),
          less: Number(parseNum(receiptLess).toFixed(3)),
          actualTouch: Number(parseNum(receiptActualTouch).toFixed(3)),
          takenTouch: Number(parseNum(receiptTakenTouch).toFixed(3)),
          goldRate: Number(parseNum(receiptGoldRate).toFixed(2)),
          amount: Number(parseNum(receiptAmount).toFixed(2)),
          purity,
          type: "receipt",
        },
      ]);

      // Clear inputs
      clearReceiptEntryInputs();

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const addCashEntry = async () => {
    console.log("🟢 addCashEntry called");

    const r = rupees || "0";
    const rate = goldRate || "0";

    if (parseNum(r) === 0) {
      Alert.alert("Invalid Amount", "Please enter a value other than 0");
      return;
    }

    if (parseNum(rate) <= 0) {
      Alert.alert(
        "Invalid Rate",
        "Please enter a valid gold rate greater than 0",
      );
      return;
    }

    const pure = computeCashPure(r, rate);

    console.log("📊 Computed Pure:", pure);

    const cashEntryData = {
      rupees: parseNum(r),
      goldrate: parseNum(rate),
      pure,
      paymentMode: cashPaymentMode,
    };

    console.log("📤 Sending to backend:", cashEntryData);
    console.log("🌐 URL:", `${base_url}/cashReceived`);

    try {
      const response = await fetch(`${base_url}/cashReceived`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cashEntryData),
      });

      const responseText = await response.text();
      console.log("📥 Response status:", response.status);
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedEntry = JSON.parse(responseText);
      console.log("✅ Cash entry saved:", savedEntry);

      setCashTable((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          rupees: Number(parseNum(r).toFixed(2)),
          goldRate: Number(parseNum(rate).toFixed(2)),
          pure,
          paymentMode: cashPaymentMode,
        },
      ]);

      
      setRupees("");
      setCashPureInput("0.000");

      

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const removeIssueItem = (id) => {
    const itemToRemove = issueItems.find((item) => item.id === id);
    if (itemToRemove) {
      adjustLocalStock(itemToRemove.item, itemToRemove.weight);
    }
    setIssueItems((prev) => prev.filter((p) => p.id !== id));
    if (editingIssueId === id) {
      clearIssueEntryInputs();
    }
  };

  const removeReceiptItem = (id) => {
    const itemToRemove = receiptItems.find((item) => item.id === id);
    if (itemToRemove) {
      adjustLocalStock(itemToRemove.item, -itemToRemove.weight);
    }
    setReceiptItems((prev) => prev.filter((p) => p.id !== id));
    if (editingReceiptId === id) {
      clearReceiptEntryInputs();
    }
  };

  const editIssueItem = (row) => {
    setEditingIssueId(row.id);
    setSelectedIssueItem(row.item);
    setIssueItemSearch(row.item || "");
    setWeight(String(row.weight ?? ""));
    setSriCost(String(row.sriCost ?? ""));
    setSriBill(String(row.sriBill ?? ""));
    setIssueItemNumber(row.itemNumber || "");
    setIssueCount(String(row.count ?? "1"));
    setIssueBillNo(row.billNo || "");
    setIssueDetails(row.details || "");
  };

  const editReceiptItem = (row) => {
    setEditingReceiptId(row.id);
    setReceiptBillNo(row.billNo || "");
    setReceiptType(row.typeText || "");
    setSelectedReceiptItem(row.item);
    setReceiptItemSearch(row.item || "");
    setReceiptWeight(String(row.weight ?? ""));
    setReceiptLess(String(row.less ?? ""));
    setReceiptActualTouch(String(row.actualTouch ?? ""));
    setReceiptTakenTouch(String(row.takenTouch ?? ""));
    setReceiptGoldRate(String(row.goldRate ?? ""));
    setReceiptAmount(String(row.amount ?? ""));
  };

  const removeCashEntry = (id) => {
    setCashTable((prev) => prev.filter((p) => p.id !== id));
  };

  const customerOldBalance = selectedCustomer
    ? Number(parseNum(selectedCustomer.ob ?? selectedCustomer.oldBalance))
    : 0;
  const customerAdvanceBalance = selectedCustomer
    ? Number(parseNum(selectedCustomer.ab ?? selectedCustomer.advanceBalance))
    : 0;
  const saveAdjustedOpeningBalanceState = (() => {
    const normalizedState = normalizeBalanceState({
      oldBalance: customerOldBalance,
      advanceBalance: customerAdvanceBalance,
    });
    if (negativeCashPureTotal >= 0) {
      return normalizedState;
    }

    let nextOld = normalizedState.oldBalance;
    let nextAdvance = normalizedState.advanceBalance;

    if (nextOld > 0) {
      nextOld += negativeCashPureTotal;
    } else if (nextAdvance > 0) {
      nextAdvance -= negativeCashPureTotal;
    } else {
      nextOld += negativeCashPureTotal;
    }

    return normalizeBalanceState({
      oldBalance: nextOld,
      advanceBalance: nextAdvance,
    });
  })();
  const saveEffectiveOldBalance = saveAdjustedOpeningBalanceState.oldBalance;
  const saveEffectiveAdvanceBalance = saveAdjustedOpeningBalanceState.advanceBalance;

  const gstPureValue = gstEnabled
    ? (totalIssuePure * (parseFloat(gstPercentage) || 0)) / 100
    : 0;

  const liveBalanceSummary = buildBalanceSummary({
    oldBalance: customerOldBalance,
    advanceBalance: customerAdvanceBalance,
    issue: totalIssuePure,
    receipt: totalReceiptPure,
    cash: 0,
  });
  const saveBalanceSummary = buildBalanceSummary({
    oldBalance: saveEffectiveOldBalance,
    advanceBalance: saveEffectiveAdvanceBalance,
    issue: totalIssuePure,
    receipt: totalReceiptPure,
    cash: positiveCashPureTotal,
  });
  const liveAdvanceBalance = liveBalanceSummary.advanceBalance;
  const balance = liveBalanceSummary.netBalance;

  // Save stock to AsyncStorage
  const saveStock = async () => {
    try {
      await AsyncStorage.setItem("STOCK_MASTER", JSON.stringify(itemsStock));
    } catch (error) {
      console.error("Error saving stock:", error);
    }
  };

  // Combined products for product table (issue + receipt)
  const productList = [
    ...issueItems.map((it) => ({ ...it, kind: "Issue" })),
    ...receiptItems.map((it) => ({ ...it, kind: "Receipt" })),
  ];

  const calculateReport = () => {
    const totalIssue = issueItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0,
    );
    const totalIssuePure = issueItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0,
    );
    const totalReceipt = receiptItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0,
    );
    const totalReceiptPure = receiptItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0,
    );
    const cash = cashTable.reduce((sum, c) => sum + Number(c.rupees || 0), 0);
    const cashPure = cashTable.reduce((sum, c) => sum + Number(c.pure || 0), 0);

    return {
      totalIssue: totalIssue.toFixed(3),
      totalIssuePure: totalIssuePure.toFixed(3),
      totalReceipt: totalReceipt.toFixed(3),
      totalReceiptPure: totalReceiptPure.toFixed(3),
      cash: cash.toFixed(2),
      cashPure: cashPure.toFixed(3),
    };
  };

  const formatTransactions = () => {
    const txns = [];

    // Issue transactions
    issueItems.forEach((item) => {
      txns.push({
        date,
        issue: item.weight.toFixed(3),
        issuePure: item.purity.toFixed(3),
        receipt: "0.000",
        receiptPure: "0.000",
        cashPure: "0.000",
      });
    });

    // Receipt transactions
    receiptItems.forEach((item) => {
      txns.push({
        date,
        issue: "0.000",
        issuePure: "0.000",
        receipt: item.weight.toFixed(3),
        receiptPure: item.purity.toFixed(3),
        cashPure: "0.000",
      });
    });

    // Cash transactions
    cashTable.forEach((cash) => {
      txns.push({
        date,
        issue: "0.000",
        issuePure: "0.000",
        receipt: "0.000",
        receiptPure: "0.000",
        cashPure: cash.pure.toFixed(3),
      });
    });

    return txns;
  };

  const syncCustomerToGstPage = async (generatedBillNo = "") => {
    if (!gstEnabled || !selectedCustomer) {
      return;
    }

    const gstWeightValue = Math.max(0, netBillPure);
    const gstRateFromCashTable = [...cashTable]
      .reverse()
      .map((item) => Number(item?.goldRate) || 0)
      .find((value) => value > 0);
    const gstRateValue = gstRateFromCashTable || ftRateValue;
    const gstTaxableValue = gstWeightValue * gstRateValue;
    const gstCgstValue = (gstTaxableValue * cgstPercentValue) / 100;
    const gstSgstValue = (gstTaxableValue * sgstPercentValue) / 100;
    const gstRowTotalValue = gstTaxableValue + gstCgstValue + gstSgstValue;

    const primaryRow = {
      sno: "1",
      particular: "New Gold Ornaments",
      hsnCode: String(
        latestB2BGstRecord?.hsnCode ||
        latestB2BGstRecord?.hsn ||
        "",
      ).trim(),
      weight: gstWeightValue.toFixed(3),
      rate: gstRateValue.toFixed(2),
      taxableValue: gstTaxableValue.toFixed(2),
      cgst: gstCgstValue.toFixed(2),
      sgst: gstSgstValue.toFixed(2),
      total: gstRowTotalValue.toFixed(2),
    };

    const payload = {
      customerName: String(selectedCustomer.name || "").trim(),
      phoneNumber: String(
        selectedCustomer.phone ||
        selectedCustomer.customerNumber ||
        selectedCustomer.phoneNumber ||
        "",
      ).trim(),
      address: String(selectedCustomer.address || "").trim(),
      gstin: String(selectedCustomer.gst || selectedCustomer.gstin || "").trim(),
      date: String(date || "").trim(),
      invoiceNo: String(generatedBillNo || "").trim(),
      totalInvoiceValue: gstRowTotalValue.toFixed(2),
      billRows: [
        primaryRow,
        { sno: "2", particular: "", hsnCode: "", weight: "", rate: "", taxableValue: "", cgst: "", sgst: "", total: "" },
        { sno: "3", particular: "", hsnCode: "", weight: "", rate: "", taxableValue: "", cgst: "", sgst: "", total: "" },
      ],
      bankDetails: {
        accountName: "",
        accountNo: "",
        ifsc: "",
        branch: "",
      },
    };

    if (!payload.customerName || !payload.phoneNumber || !payload.address) {
      return;
    }

    try {
      const listResponse = await fetch(`${base_url}/gstCustomers`);
      if (!listResponse.ok) {
        throw new Error("Failed to load GST customers");
      }

      const existingCustomers = await listResponse.json();
      const matchedCustomer = Array.isArray(existingCustomers)
        ? existingCustomers.find((item) => {
          const samePhone =
            String(item?.phoneNumber || "").trim() === payload.phoneNumber;
          const sameName =
            String(item?.customerName || "").trim().toLowerCase() ===
            payload.customerName.toLowerCase();
          return samePhone || sameName;
        })
        : null;

      if (matchedCustomer) {
        const preservedRows =
          Array.isArray(matchedCustomer.billRows) && matchedCustomer.billRows.length > 1
            ? matchedCustomer.billRows.slice(1, 3)
            : payload.billRows.slice(1);
        const preservedTotal = preservedRows.reduce(
          (sum, row) => sum + (Number(row?.total) || 0),
          0,
        );

        payload.billRows = [
          primaryRow,
          ...preservedRows,
        ];
        payload.bankDetails = matchedCustomer.bankDetails || payload.bankDetails;
        payload.totalInvoiceValue = (gstRowTotalValue + preservedTotal).toFixed(2);
      }

      const saveUrl = matchedCustomer?._id
        ? `${base_url}/gstCustomers/${matchedCustomer._id}`
        : `${base_url}/gstCustomers`;
      const saveMethod = matchedCustomer?._id ? "PUT" : "POST";

      const saveResponse = await fetch(saveUrl, {
        method: saveMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save GST customer");
      }
    } catch (gstCustomerError) {
      console.warn("GST customer sync failed:", gstCustomerError);
    }
  };

  const saveCompleteTransaction = async () => {
    console.log("💾 saveCompleteTransaction called");

    if (!selectedCustomer) {
      Alert.alert("Error", "Please select a customer first");
      return;
    }

    if (
      issueItems.length === 0 &&
      receiptItems.length === 0 &&
      cashTable.length === 0
    ) {
      Alert.alert("Error", "No items added to transaction");
      return;
    }

    // Cost-based remaining balance: Issue cost + GST − Receipt amounts − Cash amounts, stored in grams
    const goldRateNum = parseFloat(goldRate || 0);
    const issueCostTotal = issueItems.reduce((s, r) => s + (r.cost || (parseFloat(r.weight || 0) * goldRateNum)), 0);
    const gstTotalRupees = gstEnabled
      ? (((parseFloat(sgst) || 0) + (parseFloat(cgst) || 0)) / 100) * issueCostTotal
      : 0;
    const receiptAmtTotal = receiptItems.reduce((s, r) => s + Number(r.amount || 0), 0);
    const cashAmtTotal = cashTable.reduce((s, r) => s + Number(r.rupees || 0), 0);
    const remBalRupees = issueCostTotal + gstTotalRupees - receiptAmtTotal - cashAmtTotal;
    const remBalGrams = goldRateNum > 0 ? remBalRupees / goldRateNum : 0;
    const final_OB = remBalGrams >= 0 ? parseFloat(remBalGrams.toFixed(3)) : 0;
    const final_AB = remBalGrams < 0 ? parseFloat(Math.abs(remBalGrams).toFixed(3)) : 0;
    const finalDistinctBalance = remBalGrams;

    const baseCustomerName = String(selectedCustomer.name || "").trim();
    const isOthersCustomer = String(
      selectedCustomer.shopName || selectedCustomer.company || "",
    )
      .trim()
      .toLowerCase() === "others";
    const customerNameForSave =
      isOthersCustomer && baseCustomerName && !baseCustomerName.includes("(Others)")
        ? `${baseCustomerName} (Others)`
        : baseCustomerName;
    const transactionData = {
      customerName: customerNameForSave,
      customerId: resolveCustomerRecordId(selectedCustomer),
      customerType: normalizeCustomerType(selectedCustomer.customerType, "B2B"),
      type: normalizeCustomerType(selectedCustomer.customerType, "B2B"),
      issueTotal: Number(totalIssueWeight.toFixed(3)),
      issuePure: Number(totalIssuePure.toFixed(3)),
      oldBalance: Number(customerOldBalance.toFixed(3)),
      receiptPure: Number(totalReceiptPure.toFixed(3)),
      cashPure: Number(totalCashPure.toFixed(3)),
      balance: finalDistinctBalance,
      advBal: Number(customerAdvanceBalance.toFixed(3)),
      description: String(description || "").trim(),
    };

    try {
      const editBill = route.params?.editTransaction;
      const isEditMode = Boolean(editBill?._id);
      let savedTransaction = editBill || null;

      if (!isEditMode) {
        const response = await fetch(`${base_url}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        savedTransaction = await response.json();
        console.log("✅ Transaction saved:", savedTransaction);
      }

      const customerRecordId = resolveCustomerRecordId(selectedCustomer);
      const customerType = normalizeCustomerType(selectedCustomer.customerType, "B2B");
      const isB2C = customerType === "B2C";
      const updateEndpoint = isB2C
        ? `${base_url}/customersB2C/${customerRecordId}`
        : `${base_url}/customers/${customerRecordId}`;

      const newNet = remBalGrams;
      const finalBalanceType = final_AB > 0 ? "AB" : "OB";
      const finalBalanceValue = final_AB > 0 ? final_AB : final_OB;

      if (!selectedCustomer.isGstCustomer) {
        const customerUpdateRes = await fetch(updateEndpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billCurrentBalance: newNet,
            oldBalance: final_OB.toFixed(3),
            advanceBalance: final_AB.toFixed(3),
            ...(gstEnabled && {
              gstin: selectedCustomer.gst || "",
              gstPercentage: gstPercentage,
              gstAmount: gstAmount,
              sgst: isSgstEnabled ? sgst : "0",
              cgst: isCgstEnabled ? cgst : "0",
              igst: isIgstEnabled ? igst : "0",
            }),
          }),
        });

        if (!customerUpdateRes.ok) {
          const errText = await customerUpdateRes.text().catch(() => "");
          throw new Error(
            errText
              ? `Failed to update customer balance in master: ${errText}`
              : "Failed to update customer balance in master.",
          );
        }
      }

      const billSummaryData = {
        customerId: customerRecordId,
        customerName: customerNameForSave,
        phoneNumber: String(
          phone ||
          selectedCustomer?.phone ||
          selectedCustomer?.customerNumber ||
          selectedCustomer?.phoneNumber ||
          ""
        ).trim(),
        customerType: customerType,
        billType: customerType === "B2C" ? "B2C" : "B2B",
        date: date,
        oldBalance: Number(final_OB.toFixed(3)),
        ob: Number(customerOldBalance.toFixed(3)),
        issuePure: Number(totalIssuePure.toFixed(3)),
        receiptPure: Number(totalReceiptPure.toFixed(3)),
        cashPure: Number(totalCashPure.toFixed(3)),
        gstPure: Number((gstEnabled ? gstPureValue : 0).toFixed(3)),
        advanceBalance: Number(final_AB.toFixed(3)),
        advBal: Number(customerAdvanceBalance.toFixed(3)),
        currentBalance: newNet,
        finalBalance: newNet,
        balanceType: finalBalanceType,
        balanceValue: Number(finalBalanceValue.toFixed(3)),
        previousOldBalance: Number(customerOldBalance.toFixed(3)),
        previousAdvanceBalance: Number(customerAdvanceBalance.toFixed(3)),
        description: String(description || "").trim(),
        issueItems: issueItems.map((item) => ({
          name: item.item,
          gross: fmt(item.weight),
          m: fmt(0),
          net: fmt(item.weight),
          calc: fmt(item.plus),
          pure: fmt(item.purity),
          buyingCost: item.buyingCost,
          sellingCost: item.sellingCost,
          cost: item.cost || parseFloat((parseFloat(item.weight || 0) * parseFloat(goldRate || 0)).toFixed(2)),
          goldRate: parseFloat(goldRate || 0),
          count: item.count || 1,
          itemNumber: item.itemNumber || "",
          billNo: item.billNo || "",
        })),
        receiptItems: receiptItems.map((item) => ({
          name: item.item || item.itemName || item.displayItemName || "",
          itemName: item.item || item.itemName || item.displayItemName || "",
          displayItemName: item.displayItemName || item.itemName || item.item || "",
          weight: fmt(item.weight),
          result: fmt(item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
          amount: Number(item.amount || 0),
          less: Number(item.less || 0),
          type: item.typeText || item.type || "",
          billNo: item.billNo || "",
        })),
        cashTable: cashTable,
        gst: gstEnabled
          ? {
            enabled: true,
            percentage: (
              (isSgstEnabled ? parseFloat(sgst) || 0 : 0) +
              (isCgstEnabled ? parseFloat(cgst) || 0 : 0)
            ).toString(),
            amount: gstAmount,
            sgst: isSgstEnabled ? sgst : "0",
            cgst: isCgstEnabled ? cgst : "0",
            igst: isIgstEnabled ? igst : "0",
            taxableAmount: taxableBillAmount.toFixed(2),
            finalAmount: finalBillAmountWithGst.toFixed(2),
          }
          : null,
      };

      // AFTER
      const billTypeForSave = customerType === "B2C" ? "B2C" : "B2B";
      const billEndpoint = isEditMode
        ? `${base_url}/billSummary/${editBill._id}?billType=${billTypeForSave}`
        : `${base_url}/billSummary`;
      const billMethod = isEditMode ? "PUT" : "POST";

      if (isEditMode) {
        billSummaryData.billNo = editBill.billNo || editBill.invoiceNo || "";
        billSummaryData.invoiceNo = editBill.billNo || editBill.invoiceNo || "";
      }

      const billRes = await fetch(billEndpoint, {
        method: billMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billSummaryData),
      });

      if (!billRes.ok) {
        const billErrText = await billRes.text(); // ← reveals actual server error
        throw new Error(`Failed to save full bill summary: ${billErrText}`);
      }
      const savedBillSummary = await billRes.json();
      const generatedBillNo = savedBillSummary?.billNo || savedBillSummary?.invoiceNo || "N/A";

      console.log("✅ Entire bill saved successfully");

      await syncCustomerToGstPage(generatedBillNo);

	      const commonPreviewPayload = {
	        savedBillId: savedBillSummary?._id || savedBillSummary?.id || "",
	        ftRate: ftRateValue,
	        description: String(description || "").trim(),
	        customer: {
          name: selectedCustomer.name,
          id: selectedCustomer.id || selectedCustomer._id,
          customerId: customerRecordId,
          customerType: customerType,
          billNo: generatedBillNo,
          ...(customerType === "B2C" ? { invoiceNo: generatedBillNo } : {}),
          phone: selectedCustomer.phone || "",
          type: billTypeLabel || customerType, // ✅ GST label support
          address: selectedCustomer.address || "",
          gstin: selectedCustomer.gst || "",
          date,
          oldBalance: fmt(customerOldBalance),
          advanceBalance: fmt(customerAdvanceBalance),
          description: String(description || "").trim(),
          transactionId: savedTransaction?._id || "",
          autoShare: true,
        },
        issueItems: issueItems.map((item) => ({
          name: item.item,
          gross: fmt(item.weight),
          m: fmt(0),
          net: fmt(item.weight),
          calc: fmt(item.plus),
          pure: fmt(item.purity),
          buyingCost: item.buyingCost,
          sellingCost: item.sellingCost,
          cost: item.cost || parseFloat((parseFloat(item.weight || 0) * parseFloat(goldRate || 0)).toFixed(2)),
          goldRate: parseFloat(goldRate || 0),
          count: item.count || 1,
          itemNumber: item.itemNumber || "",
          billNo: item.billNo || "",
        })),
        receiptItems: receiptItems.map((item) => ({
          name: item.item || item.itemName || item.displayItemName || "",
          itemName: item.item || item.itemName || item.displayItemName || "",
          displayItemName: item.displayItemName || item.itemName || item.item || "",
          weight: fmt(item.weight),
          result: fmt(item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
          amount: Number(item.amount || 0),
          less: Number(item.less || 0),
          type: item.typeText || item.type || "",
          billNo: item.billNo || "",
        })),
        cashTable: cashTable,
        gst: gstEnabled
          ? {
            enabled: gstEnabled,
            percentage: (
              (isSgstEnabled ? parseFloat(sgst) || 0 : 0) +
              (isCgstEnabled ? parseFloat(cgst) || 0 : 0)
            ).toString(),
            amount: gstAmount,
            sgst: isSgstEnabled ? sgst : "0",
            cgst: isCgstEnabled ? cgst : "0",
            igst: isIgstEnabled ? igst : "0",
            taxableAmount: taxableBillAmount.toFixed(2),
            finalAmount: finalBillAmountWithGst.toFixed(2),
            showInBill: true,
          }
          : {
            enabled: false,
            sgst: "0",
            cgst: "0",
            igst: "0"
          },
	        summary: {
	          ob: fmt(customerOldBalance),
	          issue: fmt(totalIssuePure),
	          gstPure: fmt(gstPureValue),
	          receipt: fmt(totalReceiptPure),
	          cash: fmt(totalCashPure),
	          ftRate: ftRateValue,
	          current: fmt(newNet),
	          obPlusIssue: fmt(customerOldBalance + totalIssuePure + gstPureValue),
	          receiptPlusCash: fmt(totalReceiptPure + totalCashPure),
	        },
      };

      if (activeHoldId) {
        await removeHeldTransaction(activeHoldId);
      }
      navigation.navigate("BillPreview", commonPreviewPayload);
    } catch (error) {
      console.error("❌ Error saving transaction:", error);
      Alert.alert("Error", `Failed to save transaction: ${error.message}`);
    }
  };

  // -----------------------
  // UI rendering
  // -----------------------
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      <CommonHeader
        title="Create Transaction"
        backgroundColor="#F7F7F7"
        titleColor="#000"
        statusBarStyle="dark-content"
        left={
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Icon name="arrow-left" size={32} color="#000" />
          </TouchableOpacity>
        }
        right={
          <View style={styles.headerIcons}>
            {route.params?.printAgain && route.params?.lastBill && (
              <TouchableOpacity
                onPress={() => navigation.navigate("BillPreview", route.params.lastBill)}
                style={{ marginRight: 15 }}
              >
                <Icon name="printer-refresh" color="#007bff" size={30} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{ marginRight: 15 }}
            >
              <Icon name="home-outline" color="#000" size={30} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateCustomerMaster", { type: "B2B" })
              }
            >
              <Feather name="user-plus" color="#000" size={30} />
            </TouchableOpacity>
          </View>
        }
      />

      {selectedCustomer && (
        <View style={styles.stickyIssueReceiptBar}>
          <Text style={styles.stickyIssueReceiptLine}>
            Issue: {totalIssuePure.toFixed(3)}g
          </Text>
          <Text style={styles.stickyIssueReceiptLine}>
            Receipt: {totalReceiptPure.toFixed(3)}g
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 300 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* CUSTOMER CART */}
        {!selectedCustomer && !loadingCustomers && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="account-group" size={24} />
                <Text style={styles.sectionTitle}>All Customers</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.searchBtn, { paddingVertical: 6, paddingHorizontal: 10 }]}
                  onPress={() => setShowOthersInput((prev) => !prev)}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Others</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRefresh}>
                  <Icon name="refresh" color="#000" size={30} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                placeholder="Customers Name and Phone No...."
                style={styles.searchBox}
                value={cartSearch}
                onChangeText={setCartSearch}
              />
            </View>

            <ScrollView
              style={{ maxHeight: 200 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {!cartSearch && recentNames.length > 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: "#888",
                    marginBottom: 10,
                    marginLeft: 5,
                    fontWeight: "bold",
                  }}
                >
                  RECENT TRANSACTIONS
                </Text>
              ) : null}
              {customerListData.length > 0 ? (
                customerListData.map((item) => (
                  <CustomerSelectItem
                    key={item.__listKey}
                    item={item}
                    highlight={item.__highlight}
                    onPress={handleSelectCustomer}
                  />
                ))
              ) : cartSearch.trim() ? (
                <Text style={styles.infoText}>No customers found</Text>
              ) : null}
            </ScrollView>
            {showOthersInput ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter customer name"
                  value={othersName}
                  onChangeText={setOthersName}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleOthersConfirm}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* CUSTOMER INFO */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="account-circle" size={24} />
                <Text style={styles.sectionTitle}>Customer Info</Text>
              </View>
	              <TouchableOpacity
	                style={styles.changeButton}
	                onPress={() => {
	                  setSelectedCustomer(null);
	                  setSearch("");
	                  setPhone("");
	                  setCartSearch("");
	                }}
	              >
                <Icon name="account-switch" size={20} color="#1E88E5" />
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.customerInfoRow}>
              <View style={styles.customerDetails}>
                <TouchableOpacity onPress={openSelectedCustomerMiniStatement} disabled={!selectedCustomer}>
                  <Text style={[styles.infoText, styles.customerLinkText]}>{selectedCustomer.name}</Text>
                </TouchableOpacity>
                {/* <Text style={styles.infoText}>
                  Company: {selectedCustomer.company}
                </Text> */}
                <Text style={styles.infoText}>
                  Phone: {selectedCustomer.phone}
                </Text>
                {/* <Text style={styles.infoText}>
                  Address: {selectedCustomer.address || "N/A"}
                </Text>
                <Text style={styles.infoText}>
                  GST No: {selectedCustomer.gst || "N/A"}
                </Text> */}
              </View>

              <View style={styles.balanceContainer}>
                <Pressable onPress={openSelectedCustomerHistory} disabled={!selectedCustomer}>
                  <Text style={[styles.balanceText, styles.balanceLinkText]}>Old: {fmt(customerOldBalance)}g</Text>
                </Pressable>
                <Pressable onPress={openSelectedCustomerHistory} disabled={!selectedCustomer}>
                  <Text style={[styles.balanceText, styles.balanceLinkText]}>Adv: {fmt(customerAdvanceBalance)}g</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {!selectedCustomer && heldTransactions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="pause-circle-outline" size={24} />
                <Text style={styles.sectionTitle}>Held Processes</Text>
              </View>
            </View>
            {heldTransactions.map((item) => (
              <View key={item.id} style={styles.heldProcessCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => handleResumeHeldTransaction(item)}
                >
                  <Text style={styles.heldProcessName}>{item.customerName || "Unknown Customer"}</Text>
                  <Text style={styles.heldProcessMeta}>
                    Issue: {Number(item?.issueItems?.reduce((sum, row) => sum + Number(row?.purity || 0), 0) || 0).toFixed(3)}g | Receipt: {Number(item?.receiptItems?.reduce((sum, row) => sum + Number(row?.purity || 0), 0) || 0).toFixed(3)}g
                  </Text>
                  <Text style={styles.heldProcessMeta}>
                    Updated: {new Date(item.updatedAtMs || Date.now()).toLocaleString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeHeldTransaction(item.id)}
                  style={styles.heldDeleteBtn}
                >
                  <Icon name="delete-outline" size={20} color="#C62828" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ISSUE ENTRY */}
        {selectedCustomer && (
          <View style={[styles.card, styles.issueEntryCard]}>
            <View style={styles.issueHeader}>
              <View style={styles.greenDot} />
              <Text style={styles.sectionTitle}>Issue Entry</Text>
              <View style={styles.cartContainer}>
                <View style={{ position: "relative" }}>
                  <Icon name="cart" size={28} color="#000" />
                  {issueItems.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{issueItems.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cartText}>{totalIssuePure.toFixed(3)}g</Text>
                <Text style={styles.cartText}>
                  {"\u20B9"}
                  <Text style={{ fontWeight: "bold" }}>{issueFtAmount.toFixed(2)}</Text>
                </Text>
              </View>
            </View>

            {/* SEARCH BOX */}
            <TextInput
              placeholder="Search items..."
              placeholderTextColor="#9E9E9E"
              style={styles.searchBox}
              value={issueItemSearch}
              onChangeText={(text) => {
                setIssueItemSearch(text);
                setIssueItemDropdownOpen(true);
              }}
              onFocus={() => setIssueItemDropdownOpen(true)}
              onBlur={() =>
                setTimeout(() => setIssueItemDropdownOpen(false), 200)
              }
            />

            {/* BARCODE INPUT ROW */}
            <View style={localStyles.issueBarcodeRow}>
              <TextInput
                style={[styles.searchBox, localStyles.issueBarcodeInput]}
                placeholder="Enter barcode number..."
                placeholderTextColor="#9E9E9E"
                value={issueBarcode}
                onChangeText={setIssueBarcode}
                onSubmitEditing={() => fetchStockByBarcode(issueBarcode)}
                returnKeyType="search"
                keyboardType="default"
              />
              <TouchableOpacity style={localStyles.issueScanBtn} onPress={openIssueScanner}>
                <Icon name="barcode-scan" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {issueItemDropdownOpen && !loadingItems && (
              <View style={styles.dropdownFloating}>
                {itemsList.length > 0 ? (
                  itemsList
                    .filter(
                      (it) =>
                        // Filter by search
                        it.itemName
                          .toLowerCase()
                          .includes(issueItemSearch.toLowerCase()) &&
                        // Filter by required type
                        (it.type === "issue" || it.issue),
                    )
                    .slice(0, 3)
                    .map((it, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.listItem,
                          styles.dropdownItemContentIssue,
                        ]}
                        onPress={() => {
                          setSelectedIssueItem(it.itemName);
                          setIssueItemDropdownOpen(false);
                          setIssueItemSearch(it.itemName);
                          setTouch(it.sellingTouch?.toString() || ""); // Auto-fill touch
                          setWeight(it.grossWeight?.toString() || "");
                          setIssueItemNumber(it.itemNumber || "");
                          setBuyingCost(it.buyingTouch?.toString() || "0");
                          setSriCost(it.buyingTouch?.toString() || "0");
                        }}
                      >
                        <Text style={styles.dropdownItemTextIssue}>
                          {it.itemName}
                        </Text>
                        <Text style={styles.dropdownItemWeightIssue}>
                          Weight: {itemsStock[it.itemName]?.weight || 0} g
                        </Text>
                      </TouchableOpacity>
                    ))
                ) : (
                  <Text style={styles.infoText}>No items in stock master</Text>
                )}
              </View>
            )}

            {/* New B2B Inputs */}
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Bill No</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  value={issueBillNo || "Auto Gen"}
                  editable={false}
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Item Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  value={issueItemNumber}
                  editable={false}
                  placeholder="Auto from barcode"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Item Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  value={selectedIssueItem}
                  editable={false}
                  placeholder="Item Name"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Weight (g)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  value={weight}
                  editable={false}
                  placeholder="0.000"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Count</Text>
                <TextInput
                  style={styles.input}
                  value={issueCount}
                  onChangeText={setIssueCount}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#9E9E9E"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>SRI COST (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  value={sriCost}
                  editable={false}
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>SRI BILL (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={sriBill}
                  onChangeText={setSriBill}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9E9E9E"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Plus</Text>
                <View style={[styles.purityBox, { backgroundColor: '#FFF9C4' }]}>
                  <Text style={[styles.purityText, { color: '#B8860B' }]}>
                    {(parseNum(sriBill) - parseNum(sriCost)).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Purity (g)</Text>
                <View style={[styles.purityBox, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.purityText, { color: '#E65100' }]}>
                    {fmt(calcIssuePure(weight || 0, (parseNum(sriBill) - parseNum(sriCost))))} g
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={addIssueItem}>
              <Text style={styles.addBtnText}>
                {editingIssueId ? "UPDATE ISSUE" : "ISSUE"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.holdBtn} onPress={handleHoldTransaction}>
              <Text style={styles.holdBtnText}>
                {activeHoldId ? "Update Hold" : "Hold Process"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ISSUE TABLE */}
        {issueItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Issue Entry Table</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.productTable}>
                <View style={styles.productTableHeader}>
                  <Text style={[styles.productHeaderCell, { width: 80 }]}>Action</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Bill No</Text>
                  <Text style={[styles.productHeaderCell, { width: 140 }]}>Item Name</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Weight (g)</Text>
                  <Text style={[styles.productHeaderCell, { width: 60 }]}>Count</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Purity (g)</Text>
                  <Text style={[styles.productHeaderCell, { width: 110 }]}>Cost (₹)</Text>
                </View>

                {issueItems.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <View style={{ width: 80, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => editIssueItem(row)}>
                        <Icon name="pencil-outline" size={20} color="#B8860B" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeIssueItem(row.id)}>
                        <Icon name="delete-outline" size={20} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.productCell, { width: 100 }]}>{row.billNo}</Text>
                    <Text style={[styles.productCell, { width: 140 }]}>{row.item}</Text>
                    <Text style={[styles.productCell, { width: 100 }]}>{fmt(row.weight)}</Text>
                    <Text style={[styles.productCell, { width: 60 }]}>{row.count}</Text>
                    <Text style={[styles.productCell, { width: 100, fontWeight: 'bold' }]}>{fmt(row.purity)}</Text>
                    <Text style={[styles.productCell, { width: 110, color: '#B8860B', fontWeight: 'bold' }]}>
                      ₹{Number(row.cost || (parseFloat(row.weight || 0) * parseFloat(goldRate || 0))).toFixed(2)}
                    </Text>
                  </View>
                ))}

                {/* Issue totals */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderTopWidth: 1, borderColor: '#ddd', marginTop: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>
                    Total Wt: {issueItems.reduce((s, r) => s + parseFloat(r.weight || 0), 0).toFixed(3)} g
                  </Text>
                  <Text style={{ fontWeight: 'bold', color: '#B8860B' }}>
                    Issue Total: ₹{issueItems.reduce((s, r) => s + (r.cost || (parseFloat(r.weight || 0) * parseFloat(goldRate || 0))), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* RECEIPT ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.issueHeader}>
              <View style={[styles.greenDot, { backgroundColor: "#0aa76a" }]} />
              <Text style={styles.sectionTitle}>Receipt Entry</Text>
              <View style={styles.cartContainer}>
                <View style={{ position: "relative" }}>
                  <Icon name="cart" size={28} color="#000" />
                  {receiptItems.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{receiptItems.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cartText}>{totalReceiptPure.toFixed(3)}g</Text>
                <Text style={styles.cartText}>
                  {"\u20B9"}
                  <Text style={{ fontWeight: "bold" }}>{receiptFtAmount.toFixed(2)}</Text>
                </Text>
              </View>
            </View>

            {/* SEARCH BOX */}
            <TextInput
              placeholder="Search items..."
              placeholderTextColor="#9E9E9E"
              style={styles.searchBox}
              value={receiptItemSearch}
              onChangeText={(text) => {
                setReceiptItemSearch(text);
                setReceiptItemDropdownOpen(true);
              }}
              onFocus={() => setReceiptItemDropdownOpen(true)}
              onBlur={() =>
                setTimeout(() => setReceiptItemDropdownOpen(false), 200)
              }
            />

            {receiptItemDropdownOpen && !loadingItems && (
              <View style={styles.dropdownFloating}>
                {itemsList.length > 0 ? (
                  visibleReceiptItems.map((item, index) => (
                    <DropdownItem
                      key={`${item.itemName}-${index}`}
                      item={item}
                      containerStyle={styles.dropdownItemContentReceipt}
                      textStyle={styles.dropdownItemTextReceipt}
                      weightStyle={styles.dropdownItemWeightReceipt}
                      weightText={`Weight: ${itemsStock[item.itemName]?.weight || 0} g`}
                      onPress={handleSelectReceiptDropdownItem}
                    />
                  ))
                ) : (
                  <Text style={styles.infoText}>No items in stock master</Text>
                )}
              </View>
            )}

            {/* INPUTS */}
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Bill No</Text>
                <TextInput
                  style={styles.input}
                  value={receiptBillNo}
                  onChangeText={setReceiptBillNo}
                  placeholder="Manual Bill No"
                  placeholderTextColor="#9E9E9E"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Receipt Type</Text>
                <TextInput
                  style={styles.input}
                  value={receiptType}
                  onChangeText={setReceiptType}
                  placeholder="e.g. Old Gold"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Weight (g)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptWeight}
                  onChangeText={setReceiptWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                  placeholderTextColor="#9E9E9E"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Less (g)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptLess}
                  onChangeText={setReceiptLess}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Actual Touch (%)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptActualTouch}
                  onChangeText={setReceiptActualTouch}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor="#9E9E9E"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Taken Touch (%)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptTakenTouch}
                  onChangeText={setReceiptTakenTouch}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Pure (g)</Text>
                <View style={[styles.purityBox, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.purityText, { color: '#E65100' }]}>
                    {fmt(calcReceiptPure(receiptWeight || 0, receiptLess || 0, receiptTakenTouch || 0))} g
                  </Text>
                </View>
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Gold Rate (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptGoldRate}
                  onChangeText={setReceiptGoldRate}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptAmount}
                  onChangeText={setReceiptAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#C9F8D0" }]}
              onPress={addReceiptItem}
            >
              <Text style={[styles.addBtnText, { color: "#135F25" }]}>
                {editingReceiptId ? "Update Receipt Item" : "+ Add Receipt Item"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECEIPT TABLE */}
        {receiptItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Receipt Entry Table</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.productTable}>
                <View style={styles.productTableHeader}>
                  <Text style={[styles.productHeaderCell, { width: 80 }]}>Action</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Bill No</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Type</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Weight (g)</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Less (g)</Text>
                  <Text style={[styles.productHeaderCell, { width: 100 }]}>Purity (g)</Text>
                  <Text style={[styles.productHeaderCell, { width: 110 }]}>Amount (₹)</Text>
                </View>

                {receiptItems.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <View style={{ width: 80, alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <TouchableOpacity onPress={() => editReceiptItem(row)}>
                        <Icon name="pencil-outline" size={20} color="#B8860B" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeReceiptItem(row.id)}>
                        <Icon name="delete-outline" size={20} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.productCell, { width: 100 }]}>{row.billNo}</Text>
                    <Text style={[styles.productCell, { width: 100 }]}>{row.typeText}</Text>
                    <Text style={[styles.productCell, { width: 100 }]}>{Number(row.weight).toFixed(3)}</Text>
                    <Text style={[styles.productCell, { width: 100 }]}>{Number(row.less).toFixed(3)}</Text>
                    <Text style={[styles.productCell, { width: 100, fontWeight: 'bold' }]}>{Number(row.purity).toFixed(3)}</Text>
                    <Text style={[styles.productCell, { width: 110, color: '#0aa76a', fontWeight: 'bold' }]}>₹{Number(row.amount).toFixed(2)}</Text>
                  </View>
                ))}

                {/* Receipt totals */}
                <View style={{ padding: 10, borderTopWidth: 1, borderColor: '#ddd', marginTop: 4, alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: 'bold', color: '#0aa76a' }}>
                    Receipt Total: ₹{receiptItems.reduce((s, r) => s + Number(r.amount || 0), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* PRODUCT LIST (combined) */}
        {productList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Products (Combined)</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.productTable}>
                <View style={styles.productTableHeader}>
                  <Text style={styles.productHeaderCell}>#</Text>
                  <Text style={styles.productHeaderCell}>Kind</Text>
                  <Text style={styles.productHeaderCell}>Item</Text>
                  <Text style={styles.productHeaderCell}>Weight (g)</Text>
                  <Text style={styles.productHeaderCell}>Result (g)</Text>
                  <Text style={styles.productHeaderCell}>Touch (%)</Text>
                  <Text style={styles.productHeaderCell}>Pure (g)</Text>
                </View>

                {productList.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <Text style={styles.productCell}>{idx + 1}</Text>
                    <Text style={styles.productCell}>{row.kind}</Text>
                    <Text style={styles.productCell}>{row.item}</Text>
                    <Text style={styles.productCell}>
                      {Number(row.weight).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {row.kind === 'Issue' ? Number(row.plus || 0).toFixed(2) + '%' : Number(row.stone || 0).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {row.kind === 'Issue' ? 'Margin' : Number(row.touch || 0).toFixed(3) + '%'}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.purity).toFixed(3)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* CASH ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.issueHeader}>
              <View style={[styles.greenDot, { backgroundColor: "#1e88e5" }]} />
              <Text style={styles.sectionTitle}>Cash Received</Text>
              <View style={styles.cartContainer}>
                <Icon name="cart" size={24} color="#000" />
                <Text style={styles.cartText}>{totalCashPure.toFixed(3)}g</Text>
                {cashTable.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cashTable.length}</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.subLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={rupees}
              onChangeText={(val) => {
                setRupees(val);
                setCashPureInput(fmt(computeCashPure(val, goldRate || 0)));
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9E9E9E"
            />

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Payment Mode</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              {["GPay", "Cash", "Card", "Debt"].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: "center",
                    borderRadius: 6,
                    backgroundColor: cashPaymentMode === mode ? "#1e88e5" : "#E0E0E0",
                  }}
                  onPress={() => setCashPaymentMode(mode)}
                >
                  <Text style={{ 
                    color: cashPaymentMode === mode ? "#FFF" : "#000",
                    fontWeight: cashPaymentMode === mode ? "bold" : "normal"
                  }}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Gold Rate ₹</Text>
            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={async (val) => {
                setGoldRate(val);
                setCashPureInput(fmt(computeCashPure(rupees || 0, val)));
                await AsyncStorage.setItem("goldRate", val);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9E9E9E"
            />

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Pure (g)</Text>
            <View style={styles.purityBox}>
              <Text style={styles.purityText}>{cashPureInput} g</Text>
            </View>

            <TouchableOpacity style={styles.addBtn2} onPress={addCashEntry}>
              <Text style={styles.addBtnText2}>Add Cash</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CASH TABLE */}
        {cashTable.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cash Received Table</Text>

            <View style={styles.secondTableHeader}>
              <Text style={[styles.secondTableHeaderText, { flex: 2 }]}>Amount (₹)</Text>
              <Text style={[styles.secondTableHeaderText, { flex: 2 }]}>Payment Type</Text>
              <Text style={[styles.secondTableHeaderText, { flex: 1 }]}>Action</Text>
            </View>

            {cashTable.map((row, idx) => (
              <View key={row.id} style={styles.secondTableRow}>
                <Text style={[styles.secondTableCell, { flex: 2, fontWeight: 'bold' }]}>₹{fmt2(row.rupees)}</Text>
                <Text style={[styles.secondTableCell, { flex: 2 }]}>{row.paymentMode || "Cash"}</Text>
                <TouchableOpacity style={{ flex: 1, alignItems: "center" }} onPress={() => removeCashEntry(row.id)}>
                  <Icon name="delete-outline" size={20} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ borderTopWidth: 1, borderColor: '#ddd', marginTop: 8, paddingTop: 8, alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 14 }}>
                Cash Total: ₹{cashTable.reduce((s, r) => s + Number(r.rupees || 0), 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* GST ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <TouchableOpacity
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              onPress={() => {
                const newState = !gstEnabled;
                setGstEnabled(newState);
                if (!newState) { setSgst(""); setCgst(""); setIsSgstEnabled(false); setIsCgstEnabled(false); }
              }}
            >
              <Text style={styles.sectionTitle}>GST</Text>
              <View style={{ backgroundColor: gstEnabled ? '#B8860B' : '#e0e0e0', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ color: gstEnabled ? '#fff' : '#555', fontWeight: 'bold', fontSize: 13 }}>
                  {gstEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            {gstEnabled && (
              <View style={{ marginTop: 12 }}>
                <View style={styles.row}>
                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>SGST (%)</Text>
                    <TextInput
                      style={styles.input}
                      value={sgst}
                      onChangeText={(val) => { setSgst(val); setIsSgstEnabled((Number(val) || 0) > 0); }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#9E9E9E"
                    />
                  </View>
                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>CGST (%)</Text>
                    <TextInput
                      style={styles.input}
                      value={cgst}
                      onChangeText={(val) => { setCgst(val); setIsCgstEnabled((Number(val) || 0) > 0); }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#9E9E9E"
                    />
                  </View>
                </View>
                {(() => {
                  const issTotal = issueItems.reduce((s, r) => s + (r.cost || (parseFloat(r.weight || 0) * parseFloat(goldRate || 0))), 0);
                  const sgstAmt = ((parseFloat(sgst) || 0) / 100) * issTotal;
                  const cgstAmt = ((parseFloat(cgst) || 0) / 100) * issTotal;
                  const gstTotal = sgstAmt + cgstAmt;
                  return (
                    <View style={{ marginTop: 10, backgroundColor: '#FFF8E1', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F9A825' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#555' }}>Issued Amount</Text>
                        <Text style={{ fontWeight: 'bold' }}>\u20B9{issTotal.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#555' }}>SGST ({sgst || 0}%)</Text>
                        <Text style={{ fontWeight: 'bold' }}>\u20B9{sgstAmt.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#555' }}>CGST ({cgst || 0}%)</Text>
                        <Text style={{ fontWeight: 'bold' }}>\u20B9{cgstAmt.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#F9A825', paddingTop: 8, marginTop: 4 }}>
                        <Text style={{ fontWeight: 'bold', color: '#B8860B' }}>Total GST</Text>
                        <Text style={{ fontWeight: 'bold', color: '#B8860B' }}>\u20B9{gstTotal.toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        )}

        {/* Saved GST Selection Modal */}
        {showSavedGstModal && (
          <Modal
            visible={showSavedGstModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowSavedGstModal(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 20,
                  maxHeight: 500,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}
                >
                  Select a Saved GST Record
                </Text>

                <ScrollView>
                  {savedGstList.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: "#eee",
                        paddingVertical: 12,
                      }}
                      onPress={() => {
                        setSgst(item.sgst || "");
                        setCgst(item.cgst || "");
                        setIgst(item.igst || "");

                        setShowSavedGstModal(false);
                      }}
                    >
                      <Text style={{ fontWeight: "bold" }}>
                        {item.type} - HSN: {item.hsn}
                      </Text>
                      <View
                        style={{ flexDirection: "row", gap: 10, marginTop: 4 }}
                      >
                        <Text>SGST: {item.sgst || 0}%</Text>
                        <Text>CGST: {item.cgst || 0}%</Text>
                        <Text>IGST: {item.igst || 0}%</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {savedGstList.length === 0 && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#888",
                        marginVertical: 20,
                      }}
                    >
                      No saved records found.
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={{ marginTop: 20, alignSelf: "center", padding: 10 }}
                  onPress={() => setShowSavedGstModal(false)}
                >
                  <Text style={{ color: "red", fontWeight: "bold" }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* TRANSACTION SUMMARY (HORIZONTAL SCROLL) */}
        {selectedCustomer && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Transaction Summary</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryHeaderRow}>
                  <Text style={styles.summaryHeaderText}>Issue Total (g)</Text>
                  <Text style={styles.summaryHeaderText}>Issue Pure (g)</Text>
                  {gstEnabled && (
                    <Text style={styles.summaryHeaderText}>GST Pure (g)</Text>
                  )}
                  <Text style={styles.summaryHeaderText}>Old Balance (g)</Text>
                  <Text style={styles.summaryHeaderText}>Receipt Pure (g)</Text>
                  <Text style={styles.summaryHeaderText}>Cash Pure (g)</Text>
                  <Text style={styles.summaryHeaderText}>Balance (g)</Text>
                  <Text style={styles.summaryHeaderText}>Adv.Bal (g)</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryCell}>
                    {fmt(totalIssueWeight)}
                  </Text>
	                  <Text style={styles.summaryCell}>{fmt(totalIssuePure)}</Text>
                  {gstEnabled && (
                    <Text style={styles.summaryCell}>{fmt(gstPureValue)}</Text>
                  )}
                  <Text style={styles.summaryCell}>{fmt(customerOldBalance)}</Text>
                  <Text style={styles.summaryCell}>
                    {fmt(totalReceiptPure)}
                  </Text>
                  <Text style={styles.summaryCell}>{fmt(totalCashPure)}</Text>
                  <Text style={styles.summaryCell}>{fmt(balance)}</Text>
                  <Text style={styles.summaryCell}>{fmt(liveAdvanceBalance)}</Text>
                </View>
              </View>
            </ScrollView>
            {/* BALANCE SUMMARY */}
            {(issueItems.length > 0 || receiptItems.length > 0 || cashTable.length > 0) && (() => {
              const issueCostTotal = issueItems.reduce((s, r) => s + (r.cost || (parseFloat(r.weight || 0) * parseFloat(goldRate || 0))), 0);
              const sgstAmt = gstEnabled ? ((parseFloat(sgst) || 0) / 100) * issueCostTotal : 0;
              const cgstAmt = gstEnabled ? ((parseFloat(cgst) || 0) / 100) * issueCostTotal : 0;
              const gstTotal = sgstAmt + cgstAmt;
              const receiptAmtTotal = receiptItems.reduce((s, r) => s + Number(r.amount || 0), 0);
              const cashAmtTotal = cashTable.reduce((s, r) => s + Number(r.rupees || 0), 0);
              const remBalRupees = issueCostTotal + gstTotal - receiptAmtTotal - cashAmtTotal;
              const goldRateNum = parseFloat(goldRate || 0);
              const remBalGrams = goldRateNum > 0 ? remBalRupees / goldRateNum : 0;
              return (
                <View style={{ marginTop: 16, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#F9A825' }}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#B8860B', marginBottom: 10 }}>Bill Summary</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#333' }}>Issue Total</Text>
                    <Text style={{ fontWeight: 'bold' }}>₹{issueCostTotal.toFixed(2)}</Text>
                  </View>
                  {gstEnabled && gstTotal > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: '#333' }}>GST (SGST {sgst||0}% + CGST {cgst||0}%)</Text>
                      <Text style={{ fontWeight: 'bold', color: '#E65100' }}>+ ₹{gstTotal.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#333' }}>Receipt Total</Text>
                    <Text style={{ fontWeight: 'bold', color: '#0aa76a' }}>- ₹{receiptAmtTotal.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: '#333' }}>Cash Received</Text>
                    <Text style={{ fontWeight: 'bold', color: '#1565C0' }}>- ₹{cashAmtTotal.toFixed(2)}</Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderColor: '#F9A825', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#B8860B' }}>Remaining Balance</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: remBalRupees > 0 ? '#D32F2F' : '#2E7D32' }}>
                        ₹{remBalRupees.toFixed(2)}
                      </Text>
                      {goldRateNum > 0 && (
                        <Text style={{ fontSize: 12, color: '#666' }}>
                          ({remBalGrams.toFixed(3)} g @ ₹{goldRateNum}/g)
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })()}

            <TouchableOpacity
              style={styles.addBtn2}
              onPress={saveCompleteTransaction}
            >
              <Text style={styles.addBtnText2}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* BARCODE SCANNER MODAL – Issue Entry */}
      <Modal
        visible={issueScannerVisible}
        animationType="slide"
        onRequestClose={() => setIssueScannerVisible(false)}
      >
        <View style={localStyles.issueScannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "pdf417", "datamatrix", "itf14"],
            }}
            onBarcodeScanned={({ data }) => {
              setIssueScannerVisible(false);
              fetchStockByBarcode(data);
            }}
          />
          <View style={localStyles.issueScannerOverlay}>
            <View style={localStyles.issueScannerFrame} />
            <Text style={localStyles.issueScannerHint}>Point camera at barcode</Text>
            <TouchableOpacity
              style={localStyles.issueScannerClose}
              onPress={() => setIssueScannerVisible(false)}
            >
              <Text style={localStyles.issueScannerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  issueBarcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 6,
  },
  issueBarcodeInput: {
    flex: 1,
    marginBottom: 0,
  },
  issueScanBtn: {
    backgroundColor: "#2E5B17",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  issueScannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  issueScannerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  issueScannerFrame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  issueScannerHint: {
    color: "#fff",
    marginTop: 20,
    fontSize: 16,
  },
  issueScannerClose: {
    marginTop: 30,
    backgroundColor: "#d9534f",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  issueScannerCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

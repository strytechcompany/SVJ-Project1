import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import { styles } from "./B2BCalculationPageStyles";
import CommonHeader from "./CommonHeader";

/**
 * CreateTransaction (Full)
 * - Customer select
 * - Issue / Receipt / Cash entries
 * - Product list table (showing both issue & receipt items)
 * - Transaction summary (horizontal scroll)
 *
 * Option C: includes product table & summary
 */

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

  const [issueItems, setIssueItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [cashTable, setCashTable] = useState([]);

  const [rupees, setRupees] = useState("");
  const [goldRate, setGoldRate] = useState("");
  const [cashPureInput, setCashPureInput] = useState("0.000");

  const [gstEnabled, setGstEnabled] = useState(false);
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

  const [itemsList, setItemsList] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIssueItem, setSelectedIssueItem] = useState(null);
  const [issueItemDropdownOpen, setIssueItemDropdownOpen] = useState(false);
  const [customIssueItem, setCustomIssueItem] = useState("");
  const [selectedReceiptItem, setSelectedReceiptItem] = useState(null);
  const [receiptItemDropdownOpen, setReceiptItemDropdownOpen] = useState(false);
  const [customReceiptItem, setCustomReceiptItem] = useState("");
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

  // ── TOTALS (after useState, before useEffect) ───────────────
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
  const ftRateNum = Number(goldRate);
  const ftRateValue = Number.isFinite(ftRateNum) ? ftRateNum : 0;
  const issueFtAmount = totalIssuePure * ftRateValue;
  const receiptFtAmount = totalReceiptPure * ftRateValue;
  const totalCartItems = issueItems.length + receiptItems.length;
  const totalCartPure = totalIssuePure + totalReceiptPure;
  const totalCashPure = cashTable.reduce(
    (acc, it) => acc + Number(it.pure || 0),
    0,
  );
  const netBillPure = Math.max(0, totalIssuePure - totalReceiptPure - totalCashPure);
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

  // ✅ Load latest B2B GST settings from DB whenever page is focused
  useFocusEffect(
    useCallback(() => {
      fetchLatestB2BGstSettings({ applyEnabled: true });
      fetchItems(); // ✅ Refresh items from database when page is focused
    }, [fetchLatestB2BGstSettings])
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
              weight: updatedWeight,
              less: 0,
              netWeight: updatedWeight,
              calculation: 0,
              pure: 0,
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

  const filteredCartCustomers = customers.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(cartSearch.toLowerCase())) ||
      (c.phone && String(c.phone).includes(cartSearch)),
  );

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const b2bResponse = await fetch(`${base_url}/customers`);
      const b2bData = await b2bResponse.json();

      

      const b2bCustomers = b2bData
        .filter((customer) => customer.customerName) // ✅ filter empty names
        .map((customer) => ({
          ...customer,
          customerType: "B2B",
          customerNumber: customer.phoneNumber,
          customerId: customer.customerId,
          id: customer._id, // ✅ MongoDB _id for API calls
          // ✅ These are what the UI uses in filteredCartCustomers & display
          name: customer.customerName,
          ob: customer.oldBalance || 0,
          ab: customer.advanceBalance || 0,
          company: customer.shopName || "",
          phone: customer.phoneNumber || "",
          email: customer.emailId || "",
          address: customer.address || "",
          gst: customer.gstin || "",
          // ✅ Keep these too for CustomerMasterList
          customerName: customer.customerName,
          shopName: customer.shopName || customer.companyName || "No Shop Name",
          oldBalance: customer.oldBalance || 0,
          advanceBalance: customer.advanceBalance || 0,
          billCurrentBalance: customer.billCurrentBalance || 0,
          updatedAt: customer.updatedAt || new Date().toISOString(),
        }));

      

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
        // Extract last 5 unique customer names
        const names = [
          ...new Set(data.map((t) => t.customerName).filter(Boolean)),
        ].slice(0, 5);
        setRecentNames(names);
      }
    } catch (err) {
      console.error("Recent names error:", err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const response = await fetch(`${base_url}/items`);

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const rawData = await response.json();
      const data = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.items)
          ? rawData.items
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];

      console.log("Fetched items:", data);

      // Create items list from schema
      const itemsList = data
        .map((item) => {
          const src = item?.item && typeof item.item === "object" ? item.item : item;
          return {
            itemName: src?.stockName || src?.itemName || "", // normalize name keys
            itemDetails: src?.itemDetails || "",
            buyingTouch:
              src?.buyingTouch ??
              src?.buyTouch ??
              src?.buy ??
              src?.result ??
              "",
            sellingTouch:
              src?.sellingTouch ??
              src?.sellTouch ??
              src?.sell ??
              src?.touch ??
              "",
            percentage: src?.percentage,
            type: src?.type,
            issue: src?.issue, // Include issue flag
            receipt: src?.receipt, // Include receipt flag
            date: src?.date,
          };
        })
        .filter((item) => item.itemName); // ensure stockName exists

      console.log("Items list:", itemsList);
      setItemsList(itemsList);

      // Build stock object by fetching from stock master
      const fetchStock = async () => {
        try {
          const response = await fetch(`${base_url}/stockMaster`);
          if (!response.ok) {
            throw new Error("Failed to fetch stock");
          }
          const stockData = await response.json();
          const stockObj = {};
          stockData.forEach((item) => {
            const name = item.itemName;
            const weight = Number(item.weight);
            if (stockObj[name]) {
              stockObj[name].weight += weight;
            } else {
              stockObj[name] = { weight: weight, _id: item._id };
            }
          });
          setItemsStock(stockObj);
        } catch (error) {
          console.error("Error fetching stock:", error);
          // Fallback to 0 for each item
          const stockObj = {};
          itemsList.forEach((item) => {
            if (item.itemName) {
              stockObj[item.itemName] = { weight: 0, _id: null };
            }
          });
          setItemsStock(stockObj);
        }
      };

      fetchStock();
    } catch (error) {
      console.error("Error fetching items:", error);
      Alert.alert("Error", "Failed to load items from stock master");
      setItemsList([]);
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

  useEffect(() => {
    if (!selectedCustomer?.isGstCustomer) {
      setBillTypeLabel("");
    }
  }, [selectedCustomer]);

  // Handle new customer from CreateCustomerMaster
  useFocusEffect(
    useCallback(() => {
      if (route.params?.newCustomer) {
        const newCust = route.params.newCustomer;
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

  // Load ft rate from route params or AsyncStorage on focus
  useFocusEffect(
    useCallback(() => {
      const loadFtRate = async () => {
        try {
          // First check if ftRate is passed via route params
          if (route.params?.ftRate) {
            setGoldRate(route.params.ftRate);
            // Also save to AsyncStorage for consistency
            await AsyncStorage.setItem("ftRate", route.params.ftRate);
          } else {
            // Fallback to AsyncStorage
            const storedFtRate = await AsyncStorage.getItem("ftRate");
            if (storedFtRate) {
              setGoldRate(storedFtRate);
            }
          }
        } catch (error) {
          console.error("Error loading ft rate:", error);
        }
      };
      loadFtRate();
    }, [route.params?.ftRate]),
  );

  // Function to refresh all data
  const handleRefresh = async () => {
    console.log("🔄 Refreshing data...");
    await fetchCustomers();
    await fetchItems();
    await fetchRecentNames();
    await refreshFtRate();
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
        customerType: c.customerType || c.type || "B2B",
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
  }, [route.params?.editTransaction, route.params?.editCustomer, customers]);

  // Function to refresh FT rate
  const refreshFtRate = async () => {
    try {
      const storedFtRate = await AsyncStorage.getItem("ftRate");
      if (storedFtRate) {
        setGoldRate(storedFtRate);
        setCashPureInput(fmt(computeCashPure(rupees || 0, storedFtRate)));
      }
    } catch (error) {
      console.error("Error refreshing ft rate:", error);
    }
  };

  // -----------------------
  // Utilities & Calculators
  // -----------------------
  const parseNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // Pure calculation for Issue Table entries
  const calcIssuePure = (w, s, t) => {
    const W = parseNum(w);
    const S = parseNum(s);
    const T = parseNum(t);
    const net = Math.max(0, W - S);
    const pure = net * (T / 100);
    return Number(pure.toFixed(3));
  };

  // Pure calculation for Receipt Table entries
  const calcReceiptPure = (w, s, t) => {
    const W = parseNum(w);
    const S = parseNum(s);
    const T = parseNum(t);
    const pure = W * (S / 100) * (T / 100);
    return Number(pure.toFixed(3));
  };

  // Cash pure from rupees and goldRate
  const computeCashPure = (r, rate) => {
    const R = parseNum(r);
    const G = parseNum(rate);
    if (G <= 0) return 0;
    return Number((R / G).toFixed(3));
  };

  // Format helper
  const fmt = (n) => Number(n || 0).toFixed(3);
  const fmt2 = (n) => Number(n || 0).toFixed(2);

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

    if (issueWeight <= 0) {
      Alert.alert(
        "Invalid Weight",
        "Please enter a valid weight greater than 0",
      );
      return;
    }

    const purity = calcIssuePure(weight, stone, touch);

    console.log("📊 Calculated purity:", purity);

    const issueEntryData = {
      itemName: selectedIssueItem,
      weight: issueWeight,
      stone: parseNum(stone),
      touch: parseNum(touch),
      purity: purity,
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
              less: 0, // Assuming less remains the same, adjust if needed
              netWeight: newWeight, // Assuming netWeight = weight - less
              calculation: 0, // Adjust based on your schema
              pure: 0, // Adjust based on your schema
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
      setItemsStock((prev) => ({
        ...prev,
        [selectedIssueItem]: {
          ...prev[selectedIssueItem],
          weight: Number(
            ((prev[selectedIssueItem]?.weight || 0) - issueWeight).toFixed(3),
          ),
        },
      }));

      // Add to issue items
      setIssueItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          item: selectedIssueItem,
          weight: issueWeight,
          stone: parseNum(stone),
          touch: parseNum(touch),
          purity,
          details: issueDetails,
          type: "issue",
        },
      ]);

      // Clear inputs
      setWeight("");
      setStone("0");
      setTouch("");
      setIssueDetails("");
      setSelectedIssueItem(null);
      setIssueItemSearch("");

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const addReceiptItem = async () => {
    console.log("🟢 addReceiptItem called");

    if (!selectedReceiptItem) {
      Alert.alert("Select Item", "Please choose a receipt item before adding.");
      return;
    }

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

    const purity = calcReceiptPure(receiptWeight, receiptStone, receiptTouch);

    console.log("📊 Calculated purity:", purity);

    const receiptEntryData = {
      itemName: selectedReceiptItem,
      weight: receiptW,
      stone: parseNum(receiptStone),
      touch: parseNum(receiptTouch),
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

      // Update stock in database
      try {
        const currentStock = Number(
          itemsStock[selectedReceiptItem]?.weight || 0,
        );
        const newWeight = Number((currentStock + receiptW).toFixed(3));

        const stockResponse = await fetch(
          `${base_url}/stockMaster/${itemsStock[selectedReceiptItem]?._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemName: selectedReceiptItem,
              weight: newWeight,
              less: 0, // Assuming less remains the same, adjust if needed
              netWeight: newWeight, // Assuming netWeight = weight - less
              calculation: 0, // Adjust based on your schema
              pure: 0, // Adjust based on your schema
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

      // ➕ Increase item stock locally
      setItemsStock((prev) => ({
        ...prev,
        [selectedReceiptItem]: {
          ...prev[selectedReceiptItem],
          weight: (
            Number(prev[selectedReceiptItem]?.weight || 0) + receiptW
          ).toFixed(3),
        },
      }));

      // Add to receipt items
      setReceiptItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          item: selectedReceiptItem,
          weight: Number(receiptW.toFixed(3)),
          stone: Number(parseNum(receiptStone).toFixed(3)),
          touch: Number(parseNum(receiptTouch).toFixed(3)),
          purity,
          type: "receipt",
        },
      ]);

      // Clear inputs
      setReceiptWeight("");
      setReceiptStone("0");
      setReceiptTouch("");
      setSelectedReceiptItem(null);
      setReceiptItemSearch("");

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

    if (parseNum(r) <= 0) {
      Alert.alert("Invalid Amount", "Please enter rupees greater than 0");
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
      goldrate: parseNum(rate), // <<< IMPORTANT FIX
      pure,
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
      // ➕ Add back the weight to stock
      setItemsStock((prev) => ({
        ...prev,
        [itemToRemove.item]: {
          ...prev[itemToRemove.item],
          weight: Number(
            (
              (prev[itemToRemove.item]?.weight || 0) + itemToRemove.weight
            ).toFixed(3),
          ),
        },
      }));
    }
    setIssueItems((prev) => prev.filter((p) => p.id !== id));
  };

  const removeReceiptItem = (id) => {
    const itemToRemove = receiptItems.find((item) => item.id === id);
    if (itemToRemove) {
      // 🔻 Subtract the weight from stock
      setItemsStock((prev) => ({
        ...prev,
        [itemToRemove.item]: {
          ...prev[itemToRemove.item],
          weight: Number(
            (
              (prev[itemToRemove.item]?.weight || 0) - itemToRemove.weight
            ).toFixed(3),
          ),
        },
      }));
    }
    setReceiptItems((prev) => prev.filter((p) => p.id !== id));
  };

  const removeCashEntry = (id) => {
    setCashTable((prev) => prev.filter((p) => p.id !== id));
  };

  let oldBalance = selectedCustomer ? Number(parseNum(selectedCustomer.ob)) : 0;

  let advBalance = selectedCustomer ? Number(parseNum(selectedCustomer.ab)) : 0;

  // Convert negative old balance to advance balance
  if (oldBalance < 0) {
    advBalance += Math.abs(oldBalance);
    oldBalance = 0;
  }

  const gstPureValue = gstEnabled
    ? (totalIssuePure * (parseFloat(gstPercentage) || 0)) / 100
    : 0;

  const balance = Number(
    (
      oldBalance +
      totalIssuePure +
      gstPureValue -
      (totalReceiptPure + totalCashPure)
    ).toFixed(3),
  );

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

    // ✅ FIX 1: Remove - advBalance from formula
    const finalDistinctBalance = Number(
      (
        oldBalance +
        totalIssuePure +
        (gstEnabled ? gstPureValue : 0) -
        totalReceiptPure -
        totalCashPure
      )
        // ✅ NO - advBalance here
        .toFixed(3),
    );

    const transactionData = {
      customerName: selectedCustomer.name,
      customerId: selectedCustomer.id,
      issueTotal: Number(totalIssueWeight.toFixed(3)),
      issuePure: Number(totalIssuePure.toFixed(3)),
      oldBalance: Number(oldBalance.toFixed(3)),
      receiptPure: Number(totalReceiptPure.toFixed(3)),
      cashPure: Number(totalCashPure.toFixed(3)),
      balance: finalDistinctBalance,
      advBal: Number(advBalance.toFixed(3)),
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

      const isB2C = selectedCustomer.customerType === "B2C";
      const updateEndpoint = isB2C
        ? `${base_url}/customersB2C/${selectedCustomer.id}`
        : `${base_url}/customers/${selectedCustomer.id}`;

      // Calculate updated balances to save back to master record
      const currentNet = oldBalance - advBalance;
      const newNet = Number(
        (
          currentNet +
          totalIssuePure +
          (gstEnabled ? gstPureValue : 0) -
          totalReceiptPure -
          totalCashPure
        ).toFixed(3),
      );

      let final_OB = 0;
      let final_AB = 0;

      if (newNet >= 0) {
        final_OB = newNet;
        final_AB = 0;
      } else {
        final_OB = 0;
        final_AB = Math.abs(newNet);
      }

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
          throw new Error("Failed to update customer balance in master.");
        }
      }

      const customerType = selectedCustomer.customerType || "B2B";

      const billSummaryData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerType: customerType,
        date: date,
        ob: Number(oldBalance.toFixed(3)),
        issuePure: Number(totalIssuePure.toFixed(3)),
        receiptPure: Number(totalReceiptPure.toFixed(3)),
        cashPure: Number(totalCashPure.toFixed(3)),
        gstPure: Number((gstEnabled ? gstPureValue : 0).toFixed(3)),
        advBal: Number(advBalance.toFixed(3)),
        currentBalance: newNet,
        issueItems: issueItems.map((item) => ({
          name: item.item,
          gross: fmt(item.weight),
          m: fmt(item.stone),
          net: fmt(item.weight - item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
        })),
        receiptItems: receiptItems.map((item) => ({
          name: item.item,
          weight: fmt(item.weight),
          result: fmt(item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
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

      navigation.navigate("BillPreview", {
        customer: {
          name: selectedCustomer.name,
          id: selectedCustomer.id,
          customerId: selectedCustomer.id,
          billNo: generatedBillNo,
          ...(customerType === "B2C" ? { invoiceNo: generatedBillNo } : {}),
          phone: selectedCustomer.phone || "",
          type: billTypeLabel || customerType, // ✅ GST label support
          address: selectedCustomer.address || "",
          gstin: selectedCustomer.gst || "",
          date,
          oldBalance: fmt(oldBalance),
          advanceBalance: fmt(advBalance),
          transactionId: savedTransaction?._id || "",
          autoShare: true,
        },
        issueItems: issueItems.map((item) => ({
          name: item.item,
          gross: fmt(item.weight),
          m: fmt(item.stone),
          net: fmt(item.weight - item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
        })),
        receiptItems: receiptItems.map((item) => ({
          name: item.item,
          weight: fmt(item.weight),
          result: fmt(item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
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
          ob: fmt(oldBalance),
          issue: fmt(totalIssuePure),
          gstPure: fmt(gstPureValue),
          receipt: fmt(totalReceiptPure),
          cash: fmt(totalCashPure),
          current: fmt(newNet),
          obPlusIssue: fmt(oldBalance + totalIssuePure + gstPureValue),
          receiptPlusCash: fmt(totalReceiptPure + totalCashPure),
        },
      });
    } catch (error) {
      console.error("❌ Error saving transaction:", error);
      Alert.alert("Error", `Failed to save transaction: ${error.message}`);
    }
  };

  // -----------------------
  // UI rendering
  // -----------------------
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F7F7F7" }}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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

      <View style={{ paddingHorizontal: 16, paddingBottom: 300 }}>

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
              <TouchableOpacity onPress={handleRefresh}>
                <Icon name="refresh" color="#000" size={30} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                placeholder="Customers Name and Phone No...."
                style={styles.searchBox}
                value={cartSearch}
                onChangeText={setCartSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 200 }}>
              {!cartSearch && recentNames.length > 0 && (
                <View>
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
                  {customers
                    .filter((c) => recentNames.includes(c.name))
                    .map((cust, index) => {
                      let currentBalance = Number(cust.ob || 0);
                      let advanceBalance = Number(cust.ab || 0);
                      if (currentBalance < 0) {
                        advanceBalance += Math.abs(currentBalance);
                        currentBalance = 0;
                      }
                      return (
                        <TouchableOpacity
                          key={`recent-${cust.id || index}`}
                          onPress={() => setSelectedCustomer(cust)}
                          style={[
                            styles.listItem,
                            { borderLeftWidth: 4, borderLeftColor: "#2E7D32" },
                          ]}
                        >
                          <View>
                            <Text style={styles.listItemText}>
                              <Text
                                style={{ fontWeight: "bold", color: "#000" }}
                              >
                                {cust.name}
                              </Text>{" "}
                              | P : {cust.phone}
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
                    })}
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#888",
                      marginVertical: 10,
                      marginLeft: 5,
                      fontWeight: "bold",
                    }}
                  >
                    ALL CUSTOMERS
                  </Text>
                </View>
              )}
              {filteredCartCustomers.length > 0 ? (
                filteredCartCustomers.map((cust, index) => {
                  // Calculate balances: if old balance (ob) is negative, convert to advance balance
                  let currentBalance = Number(cust.ob || 0);
                  let advanceBalance = Number(cust.ab || 0);

                  if (currentBalance < 0) {
                    advanceBalance += Math.abs(currentBalance);
                    currentBalance = 0;
                  }

                  return (
                    <TouchableOpacity
                      key={cust.id || index}
                      onPress={() => setSelectedCustomer(cust)}
                      style={styles.listItem}
                    >
                      <View>
                        <Text style={styles.listItemText}>
                          <Text style={{ fontWeight: "bold", color: "#000" }}>
                            {cust.name}
                          </Text>{" "}
                          | P : {cust.phone}
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
                })
              ) : (
                <Text style={styles.infoText}>No customers found</Text>
              )}
            </ScrollView>
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
                <TouchableOpacity onPress={() => {navigation.navigate('CustomerDataList', { customerId: selectedCustomer.id })}}>
                  <Text style={styles.infoText}>{selectedCustomer.name}</Text>
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
                <Text style={styles.balanceText}>Old: {fmt(oldBalance)}g</Text>
                <Text style={styles.balanceText}>Adv: {fmt(advBalance)}g</Text>
              </View>
            </View>
          </View>
        )}

        {/* ISSUE ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.issueHeader}>
              <View style={styles.greenDot} />
              <Text style={styles.sectionTitle}>Issue Entry</Text>
              <View style={styles.cartContainer}>
                <View style={{ position: 'relative' }}>
                  <Icon name="cart" size={28} color="#000" />
                  {totalCartItems > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{totalCartItems}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cartText}>{totalIssuePure.toFixed(3)}g</Text>
                <Text style={styles.cartText}>
                  {"\u20B9"}<Text style={{ fontWeight: "bold" }}>{issueFtAmount.toFixed(2)}</Text> 
                  {/* <Text style={{ fontSize: 12 }}>( {totalIssuePure.toFixed(3)} x {ftRateValue.toFixed(2)})</Text> */}
                </Text>
              </View>
            </View>

            {/* SEARCH BOX */}
            <TextInput
              placeholder="Search items..."
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

            {/* Inputs */}
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Weight (g)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Stone (g)</Text>
                <TextInput
                  style={styles.input}
                  value={stone}
                  onChangeText={setStone}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Touch (%)</Text>
                <TextInput
                  style={styles.input}
                  value={touch}
                  onChangeText={setTouch}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Purity</Text>
                <View style={styles.purityBox}>
                  <Text style={styles.purityText}>
                    {fmt(calcIssuePure(weight || 0, stone || 0, touch || 0))} g
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={addIssueItem}>
              <Text style={styles.addBtnText}>+ Add New Item (Issue)</Text>
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
                  <Text style={styles.productHeaderCell}>#</Text>
                  <Text style={styles.productHeaderCell}>Kind</Text>
                  <Text style={styles.productHeaderCell}>Item</Text>
                  <Text style={styles.productHeaderCell}>Weight (g)</Text>
                  <Text style={styles.productHeaderCell}>Stone (g)</Text>
                  <Text style={styles.productHeaderCell}>Touch (%)</Text>
                  <Text style={styles.productHeaderCell}>Pure (g)</Text>
                  <Text style={styles.productHeaderCell}>Action</Text>
                </View>

                {issueItems.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <Text style={styles.productCell}>{idx + 1}</Text>
                    <Text style={styles.productCell}>Issue</Text>
                    <Text style={styles.productCell}>{row.item}</Text>
                    <Text style={styles.productCell}>
                      {Number(row.weight).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.stone).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.touch).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.purity).toFixed(3)}
                    </Text>
                    <TouchableOpacity onPress={() => removeIssueItem(row.id)}>
                      <Text style={[styles.actionText, { color: "#d9534f" }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
                <View style={{ position: 'relative' }}>
                  <Icon name="cart" size={28} color="#000" />
                  {totalCartItems > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{totalCartItems}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cartText}>{totalReceiptPure.toFixed(3)}g</Text>
                <Text style={styles.cartText}>
                  {"\u20B9"}<Text style={{ fontWeight: "bold" }}>{receiptFtAmount.toFixed(2)}</Text> 
                  {/* <Text style={{ fontSize: 12 }}>( {totalReceiptPure.toFixed(3)} x {ftRateValue.toFixed(2)})</Text> */}
                </Text>
              </View>
            </View>

            {/* SEARCH BOX */}
            <TextInput
              placeholder="Search items..."
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
                  itemsList
                    .filter(
                      (it) =>
                        // Filter by search input
                        it.itemName
                          .toLowerCase()
                          .includes(receiptItemSearch.toLowerCase()) &&
                        // Filter by required type
                        (it.type === "receipt" || it.receipt),
                    )
                    .slice(0, 3)
                    .map((it, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.listItem,
                          styles.dropdownItemContentReceipt,
                        ]}
                        onPress={() => {
                          const selectedName = it.itemName;
                          const matchedItem = itemsList.find(
                            (entry) => entry.itemName === selectedName,
                          );
                          const buyingValue = matchedItem?.buyingTouch ?? it.buyingTouch;
                          const sellingValue = matchedItem?.sellingTouch ?? it.sellingTouch;

                          setSelectedReceiptItem(selectedName);
                          setReceiptItemDropdownOpen(false);
                          setReceiptItemSearch(selectedName);
                          setReceiptStone(
                            buyingValue === null || buyingValue === undefined
                              ? ""
                              : String(buyingValue),
                          ); // Buying Touch -> Result
                          setReceiptTouch(
                            sellingValue === null || sellingValue === undefined
                              ? ""
                              : String(sellingValue),
                          ); // Selling Touch -> Touch
                        }}
                      >
                        <Text style={styles.dropdownItemTextReceipt}>
                          {it.itemName}
                        </Text>
                        <Text style={styles.dropdownItemWeightReceipt}>
                          Weight: {itemsStock[it.itemName]?.weight || 0} g
                        </Text>
                      </TouchableOpacity>
                    ))
                ) : (
                  <Text style={styles.infoText}>No items in stock master</Text>
                )}
              </View>
            )}

            {/* INPUTS */}
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Weight (g)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptWeight}
                  onChangeText={setReceiptWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Result (g)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptStone}
                  onChangeText={setReceiptStone}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Touch (%)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptTouch}
                  onChangeText={setReceiptTouch}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Pure</Text>
                <View style={styles.purityBox}>
                  <Text style={styles.purityText}>
                    {fmt(
                      calcReceiptPure(
                        receiptWeight || 0,
                        receiptStone || 0,
                        receiptTouch || 0,
                      ),
                    )}{" "}
                    g
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#C9F8D0" }]}
              onPress={addReceiptItem}
            >
              <Text style={[styles.addBtnText, { color: "#135F25" }]}>
                + Add Receipt Item
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
                  <Text style={styles.productHeaderCell}>#</Text>
                  <Text style={styles.productHeaderCell}>Kind</Text>
                  <Text style={styles.productHeaderCell}>Item</Text>
                  <Text style={styles.productHeaderCell}>Weight (g)</Text>
                  <Text style={styles.productHeaderCell}>Result (g)</Text>
                  <Text style={styles.productHeaderCell}>Touch (%)</Text>
                  <Text style={styles.productHeaderCell}>Pure (g)</Text>
                  <Text style={styles.productHeaderCell}>Action</Text>
                </View>

                {receiptItems.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <Text style={styles.productCell}>{idx + 1}</Text>
                    <Text style={styles.productCell}>Receipt</Text>
                    <Text style={styles.productCell}>{row.item}</Text>
                    <Text style={styles.productCell}>
                      {Number(row.weight).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.stone).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.touch).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.purity).toFixed(3)}
                    </Text>
                    <TouchableOpacity onPress={() => removeReceiptItem(row.id)}>
                      <Text style={[styles.actionText, { color: "#d9534f" }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
                      {Number(row.stone).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.touch).toFixed(3)}
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

            <Text style={styles.subLabel}>Rupees ₹</Text>
            <TextInput
              style={styles.input}
              value={rupees}
              onChangeText={(val) => {
                setRupees(val);
                setCashPureInput(fmt(computeCashPure(val, goldRate || 0)));
              }}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <Text style={[styles.subLabel, { marginTop: 12 }]}>FT Rate ₹</Text>
            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={async (val) => {
                setGoldRate(val);
                setCashPureInput(fmt(computeCashPure(rupees || 0, val)));
                await AsyncStorage.setItem("ftRate", val);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
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
              <Text style={styles.secondTableHeaderText}>Rupees</Text>
              <Text style={styles.secondTableHeaderText}>FT Rate</Text>
              <Text style={styles.secondTableHeaderText}>Pure</Text>
              <Text style={styles.secondTableHeaderText}>Action</Text>
            </View>

            {cashTable.map((row, idx) => (
              <View key={row.id} style={styles.secondTableRow}>
                <Text style={styles.secondTableCell}>{fmt2(row.rupees)}</Text>
                <Text style={styles.secondTableCell}>{fmt2(row.goldRate)}</Text>
                <Text style={styles.secondTableCell}>{fmt(row.pure)}</Text>
                <TouchableOpacity onPress={() => removeCashEntry(row.id)}>
                  <Text style={[styles.actionText, { color: "#d9534f" }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* GST ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={async () => {
                  const newState = !gstEnabled;
                  setGstEnabled(newState);
                  if (newState) {
                    await fetchLatestB2BGstSettings();
                  } else {
                    setIsSgstEnabled(false);
                    setIsCgstEnabled(false);
                    setIsIgstEnabled(false);
                  }
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    gstEnabled && styles.checkboxChecked,
                  ]}
                >
                  {gstEnabled && <Icon name="check" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Enable GST</Text>
              </TouchableOpacity>
            </View>

            {gstEnabled && (
              <View style={{ marginTop: 8 }}>
                <View style={styles.row}>
                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>SGST ({sgstPercentValue.toFixed(2)}%)</Text>
                    <View style={styles.purityBox}>
                      <Text style={styles.purityText}>{"\u20B9"}{sgstAmountValue.toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>CGST ({cgstPercentValue.toFixed(2)}%)</Text>
                    <View style={styles.purityBox}>
                      <Text style={styles.purityText}>{"\u20B9"}{cgstAmountValue.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.subLabel, { marginTop: 12 }]}>Total GST</Text>
                <View style={styles.purityBox}>
                  <Text style={styles.purityText}>{"\u20B9"}{totalGstValue.toFixed(2)}</Text>
                </View>
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
                  <Text style={styles.summaryCell}>{fmt(oldBalance)}</Text>
                  <Text style={styles.summaryCell}>
                    {fmt(totalReceiptPure)}
                  </Text>
                  <Text style={styles.summaryCell}>{fmt(totalCashPure)}</Text>
                  <Text style={styles.summaryCell}>{fmt(balance)}</Text>
                  <Text style={styles.summaryCell}>{fmt(advBalance)}</Text>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.addBtn2}
              onPress={saveCompleteTransaction}
            >
              <Text style={styles.addBtnText2}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

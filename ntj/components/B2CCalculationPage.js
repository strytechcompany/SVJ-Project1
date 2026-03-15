import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { base_url } from "./config";
import { useFocusEffect } from "@react-navigation/native";
import { styles } from "./B2CCalculationpageStyles";
import CommonHeader from "./CommonHeader";

export default function CreateTransaction({ navigation, route }) {
  const transactionType = route?.params?.type || "B2C";
  const passedGoldRate = route?.params?.goldRate;
  const estimate = route?.params?.estimate;

  // ---------------- UTILITY FUNCTIONS FOR CALCULATIONS ----------------
  const parseNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const calcTotal = (weight, wastage, rate) => {
    const W = parseNum(weight);
    const WM = parseNum(wastage);
    const R = parseNum(rate);
    const total = (W + WM) * R;
    return Number(total.toFixed(2));
  };

  const calcGST = (total, gstPercentage, gstEnabled) => {
    if (!gstEnabled) return 0;
    const T = parseNum(total);
    const P = parseNum(gstPercentage);
    const gst = T * (P / 100);
    return Number(gst.toFixed(2));
  };


  const calcFinal = (total, gst) => {
    const T = parseNum(total);
    const G = parseNum(gst);
    const final = T + G;
    return Number(final.toFixed(2));
  };

  // Calculate Pure Weight: (Weight * Touch) / 100
  const calcPure = (weight, touch) => {
    const W = parseNum(weight);
    const T = parseNum(touch);
    const pure = (W * T) / 100;
    return Number(pure.toFixed(3));
  };

  // Calculate Receipt Pure: (Weight * Result/100 * Touch/100)
  const calcReceiptPure = (w, s, t) => {
    const W = parseNum(w);
    const S = parseNum(s);
    const T = parseNum(t);
    const pure = (W * (S / 100) * (T / 100));
    return Number(pure.toFixed(3));
  };

  // Cash pure from rupees and goldRate
  const computeCashPure = (rupeesValue, rateValue) => {
    const r = parseNum(rupeesValue);
    const g = parseNum(rateValue);
    if (r <= 0 || g <= 0) return 0;
    return Number((r / g).toFixed(3));
  };

  const [b2cCustomers, setB2cCustomers] = useState([]);

  // ---------------- CUSTOMER STATES ----------------
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [oldBalance, setOldBalance] = useState("");
  const [advanceBalance, setAdvanceBalance] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomersByPhone, setFilteredCustomersByPhone] = useState([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [cartSearch, setCartSearch] = useState("");
  const [recentNames, setRecentNames] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const filteredCartCustomers = b2cCustomers.filter(
    (c) =>
      (c.customerName && c.customerName.toLowerCase().includes(cartSearch.toLowerCase())) ||
      (c.phone && String(c.phone).includes(cartSearch))
  );

  // ---------------- RECEIPT ENTRY STATES ----------------
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptTouch, setReceiptTouch] = useState("");
  const [receiptResult, setReceiptResult] = useState("");
  const [receiptPure, setReceiptPure] = useState("");
  const [receiptEntries, setReceiptEntries] = useState([]);

  const [itemName, setItemName] = useState("");
  const [displayItemName, setDisplayItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [touch, setTouch] = useState("");
  const [wastage, setWastage] = useState("");
  const [rate, setRate] = useState("11500");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercentage, setGstPercentage] = useState("");
  const [gstAmount, setGstAmount] = useState("");

  // Individual GST component states
  const [sgst, setSgst] = useState("");
  const [cgst, setCgst] = useState("");
  const [igst, setIgst] = useState("");
  const [isSgstEnabled, setIsSgstEnabled] = useState(false);
  const [isCgstEnabled, setIsCgstEnabled] = useState(false);
  const [isIgstEnabled, setIsIgstEnabled] = useState(false);
  const [savedGstList, setSavedGstList] = useState([]);
  const [showSavedGstModal, setShowSavedGstModal] = useState(false);

  // âœ… Load latest B2C GST settings from DB whenever page is focused
  useFocusEffect(
    useCallback(() => {
      const fetchLatestGstSettings = async () => {
        try {
          const response = await fetch(`${base_url}/gst`);
          const data = await response.json();
          const latestB2C = data.find((item) => item.type === "B2C");

          if (latestB2C) {
            setGstEnabled(latestB2C.enabled || false);
            setSgst(latestB2C.sgst || "");
            setCgst(latestB2C.cgst || "");
            setIgst(latestB2C.igst || "");

            // âœ… Load saved checkbox states from AsyncStorage
            const savedSgst = await AsyncStorage.getItem("b2c_sgst_enabled");
            const savedCgst = await AsyncStorage.getItem("b2c_cgst_enabled");
            const savedIgst = await AsyncStorage.getItem("b2c_igst_enabled");

            setIsSgstEnabled(
              savedSgst !== null
                ? savedSgst === "true"
                : !!latestB2C.sgst && latestB2C.sgst !== "0",
            );
            setIsCgstEnabled(
              savedCgst !== null
                ? savedCgst === "true"
                : !!latestB2C.cgst && latestB2C.cgst !== "0",
            );
            setIsIgstEnabled(
              savedIgst !== null
                ? savedIgst === "true"
                : !!latestB2C.igst && latestB2C.igst !== "0",
            );
          }
        } catch (error) {
          console.error("Failed to fetch GST settings in B2C", error);
        }
      };

      const fetchNextInvoiceNo = async () => {
        try {
          const res = await fetch(`${base_url}/billSummary/nextBillNo?billType=B2C`);
          if (res.ok) {
            const data = await res.json();
            if (data.nextBillNo) {
              setInvoiceNo(data.nextBillNo);
            }
          }
        } catch (error) {
          console.error("Failed to fetch next invoice number:", error);
        }
      };

      fetchLatestGstSettings();
      fetchNextInvoiceNo();
    }, [])
  );

  // âœ… Auto-calculate Total GST %
  useEffect(() => {
    if (gstEnabled) {
      const s = parseFloat(sgst) || 0;
      const c = parseFloat(cgst) || 0;
      const i = parseFloat(igst) || 0;
      setGstPercentage((s + c + i).toString());
    } else {
      setGstPercentage("0");
    }
  }, [gstEnabled, sgst, cgst, igst]);

  // Load gold rate from AsyncStorage
  // Load gold rate from navigation or AsyncStorage
  useEffect(() => {
    const loadGoldRate = async () => {
      try {
        // Priority 1: Use rate passed from navigation
        if (passedGoldRate) {
          console.log("âœ… Using gold rate from HomeScreen:", passedGoldRate);
          setRate(passedGoldRate);
          return;
        }

        // Priority 2: Load from AsyncStorage
        const storedRate = await AsyncStorage.getItem("goldRate");
        if (storedRate) {
          console.log("âœ… Using stored gold rate:", storedRate);
          setRate(storedRate);
        }
      } catch (error) {
        console.error("Error loading gold rate:", error);
      }
    };
    loadGoldRate();
  }, [passedGoldRate]);


  const [items, setItems] = useState([]);

  useEffect(() => {
    console.log("ðŸŸ¢ ITEMS STATE:", items);
  }, [items]);

  // ---------------- ITEM LIST STATES ----------------
  const [itemList, setItemList] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ---------------- ITEM ENTRY ITEMS (from ItemEntry.js) ----------------
  const [itemEntryItems, setItemEntryItems] = useState([]);

  // ---------------- MODIFIED WEIGHT STATE ----------------
  const [modifiedWeight, setModifiedWeight] = useState("");
  const [hasProcessedEstimate, setHasProcessedEstimate] = useState(false);

  // ---------------- HANDLE ESTIMATE PARAMS ----------------
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const estimate = route?.params?.estimate;
      if (estimate) {
        console.log("ðŸ“¥ Received estimate:", estimate);

        if (estimate.items && Array.isArray(estimate.items) && estimate.items.length > 0) {
          // Handle multiple items
          const mappedItems = estimate.items.map(item => ({
            itemName: item.itemName,
            displayItemName: item.itemName,
            weight: parseFloat(item.weight) || 0,
            touch: parseFloat(item.wastagePercent) || 0,
            wastage: ((parseFloat(item.weight) * parseFloat(item.wastagePercent)) / 100).toFixed(3),
            rate: item.goldRate,
            total: item.totalAmount,
            gst: item.gst || 0,
            final: item.totalAmount,
            modifiedWeight: 0,
            gstEnabled: item.enableGST || false,
          }));
          setItems(mappedItems);

          // Populate inputs with the first item's data
          const first = estimate.items[0];
          setItemName(first.itemName);
          setWeight(first.weight.toString());
          setTouch(first.wastagePercent.toString());
          setWastage(((first.weight * first.wastagePercent) / 100).toFixed(3));
          setRate(first.goldRate.toString());
        } else {
          // Handle single item
          const wt = parseFloat(estimate.weight) || 0;
          const touch = parseFloat(estimate.wastagePercent) || 0;
          const rate = parseFloat(estimate.goldRate) || 0;
          const wastage = (wt * touch) / 100;
          const total = (wt + wastage) * rate;
          const gst = total * 0.03;
          const final = total + gst;

          const estimateItem = {
            itemName: estimate.itemName,
            weight: wt,
            touch: touch,
            wastage: wastage.toFixed(3),
            rate: estimate.goldRate,
            total: total,
            gst: gst,
            final: final,
            modifiedWeight: 0,
            gstEnabled: true,
          };

          setItems([estimateItem]);
          setItemName(estimate.itemName);
          setWeight(wt.toString());
          setTouch(touch.toString());
          setWastage(wastage.toFixed(3));
          setRate(estimate.goldRate.toString());
        }

        setShowItems(true);
        console.log("âœ… Estimate items handled");
      }
    });
    return unsubscribe;
  }, [route.params?.estimate]);

  // ---------------- HANDLE EDIT TRANSACTION PARAMS ----------------
  useEffect(() => {
    if (route.params?.editTransaction) {
      const t = route.params.editTransaction;
      const c = route.params.editCustomer;

      console.log("ðŸ“ Editing Transaction:", t);

      // Populate Customer
      if (c) {
        setCustomerName(c.customerName || c.name || "");
        setPhone(c.customerNumber || c.phone || c.phoneNumber || "");
        setAddress(c.address || "");
        setGstNumber(c.gstin || "");
      }

      if (t.invoiceNo) setInvoiceNo(t.invoiceNo);

      // Populate Items
      if (Array.isArray(t.items) && t.items.length > 0) {
        setItems(t.items);
        setShowItems(true);
      } else if (Array.isArray(t.issueItems) && t.issueItems.length > 0) {
        const mappedIssueItems = t.issueItems.map((it, idx) => {
          const gross = parseFloat(it.gross ?? it.weight ?? 0) || 0;
          const touchVal = parseFloat(it.calc ?? it.touch ?? 0) || 0;
          const rateVal = parseFloat(rate || 0) || 0;
          const wm = (gross * touchVal) / 100;
          const total = (gross + wm) * rateVal;
          return {
            id: Date.now() + idx,
            itemName: it.name || it.item || "",
            displayItemName: it.name || it.item || "",
            weight: gross,
            touch: touchVal,
            wastage: wm.toFixed(3),
            rate: rateVal,
            total: total,
            gst: 0,
            final: total,
            modifiedWeight: 0,
            pure: parseFloat(it.pure ?? 0) || 0,
          };
        });
        setItems(mappedIssueItems);
        setShowItems(true);
      }

      // Populate Receipt Items
      if (t.receiptItems && Array.isArray(t.receiptItems)) {
        setB2cReceiptItems(
          t.receiptItems.map((it, idx) => ({
            id: it.id || Date.now() + idx,
            name: it.name || "",
            weight: Number(it.weight ?? 0).toFixed(3),
            sub: Number(it.sub ?? 0).toFixed(3),
            touch: Number(it.calc ?? it.touch ?? 0),
            netWeight: Number(it.netWeight ?? it.result ?? it.pure ?? 0).toFixed(3),
            rate: Number(it.rate ?? 0).toFixed(2),
            amount: Number(it.amount ?? 0).toFixed(2),
          }))
        );
      }

      if (Array.isArray(t.cashTable)) {
        setCashTable(
          t.cashTable.map((it, idx) => ({
            id: it.id || Date.now() + idx,
            rupees: Number(it.rupees ?? 0),
            goldRate: Number(it.goldRate ?? it.goldrate ?? 0),
            pure: Number(it.pure ?? 0),
          }))
        );
      }

      // Populate GST
      if (t.gst) {
        setGstEnabled(true);
        if (t.gst.sgst) {
          setIsSgstEnabled(true);
          setSgst(t.gst.sgst.toString());
        }
        if (t.gst.cgst) {
          setIsCgstEnabled(true);
          setCgst(t.gst.cgst.toString());
        }
        if (t.gst.igst) {
          setIsIgstEnabled(true);
          setIgst(t.gst.igst.toString());
        }
        setGstAmount(t.gst.amount ? t.gst.amount.toString() : "");
        setGstPercentage(t.gst.total ? t.gst.total.toString() : "");
      }
    }
  }, [route.params?.editTransaction]);

  // âœ… Fetch B2C customers from API
  useEffect(() => {
    fetchB2CCustomers();
    fetchRecentNames();
  }, []);

  // âœ… Handle navigation params to update customers list after creating new customer
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const updatedCustomers = route.params?.customers;
      if (updatedCustomers) {
        setB2cCustomers(updatedCustomers);
      }
    });
    return unsubscribe;
  }, [navigation, route.params]);

  const fetchB2CCustomers = async () => {
    try {
      console.log("ðŸ” Fetching from:", `${base_url}/customersB2C`);

      const response = await fetch(`${base_url}/customersB2C`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const formattedCustomers = data.map((customer) => ({
        id: customer._id || customer.id,
        customerName: customer.customerName,
        phone: customer.phoneNumber || customer.phone,
        address: customer.address || "",
        oldBalance: parseFloat(customer.oldBalance || 0),
        advanceBalance: parseFloat(customer.advanceBalance || 0),
        gstin: customer.gstin || "",
      }));

      setB2cCustomers(formattedCustomers);
      console.log("âœ… Fetched B2C Customers:", formattedCustomers);
    } catch (error) {
      console.error("âŒ Error fetching B2C customers:", error);
      Alert.alert(
        "Error",
        `Failed to load customers: ${error.message}\n\nMake sure:\n1. Backend server is running\n2. Check base_url in config.js`
      );
    }
  };

  const fetchRecentNames = async () => {
    try {
      setLoadingRecent(true);
      const [transResp, b2cResp] = await Promise.all([
        fetch(`${base_url}/transactions`),
        fetch(`${base_url}/B2Ccal`)
      ]);

      let allData = [];
      if (transResp.ok) {
        const transData = await transResp.json();
        allData = [...allData, ...transData];
      }
      if (b2cResp.ok) {
        const b2cData = await b2cResp.json();
        allData = [...allData, ...b2cData];
      }

      // Reverse to get most recent first, then take unique names
      const names = [...new Set(allData.reverse().map(t => t.customerName).filter(Boolean))].slice(0, 5);
      setRecentNames(names);
    } catch (err) {
      console.error("Recent names error:", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleRefresh = async () => {
    console.log("ðŸ”„ Refreshing data...");
    await fetchB2CCustomers();
    await fetchRecentNames();
    console.log("Success", "Data refreshed from database");
  };

  // âœ… Fetch Stock Master from API
  const fetchStockMaster = async () => {
    try {
      console.log("ðŸ” Fetching stock from:", `${base_url}/stockMaster`);

      const response = await fetch(`${base_url}/stockMaster`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const formattedStock = data.map((item) => ({
        id: item._id,
        itemName: item.itemName,
        weight: parseFloat(item.weight || 0),
        less: parseFloat(item.less || 0),
        netWeight: parseFloat(item.netWeight || 0),
        calculation: item.calculation || "",
        pure: parseFloat(item.pure || 0),
      }));

      setItemList(formattedStock);
      console.log("âœ… Fetched Stock Master:", formattedStock);
    } catch (error) {
      console.error("âŒ Error fetching stock master:", error);
      Alert.alert("Error", `Failed to load stock: ${error.message}`);
    }
  };

  // ---------------- LOAD STOCK MASTER ----------------
  useEffect(() => {
    if (showItems) {
      fetchStockMaster();
      fetchItemEntryItems();
    }
  }, [showItems]);

  // âœ… Fetch Item Entry Items from API
  const fetchItemEntryItems = async () => {
    try {
      console.log("ðŸ” Fetching item entry items from:", `${base_url}/items`);

      const response = await fetch(`${base_url}/items`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const formattedItems = data.map((item) => ({
        id: item._id || item.id,
        stockName: item.stockName,
        itemDetails: item.itemDetails,
        buyingTouch: parseFloat(item.buyingTouch || 0),
        sellingTouch: parseFloat(item.sellingTouch || 0),
        percentage: parseFloat(item.percentage || 0),
        date: item.date,
        issue: item.issue,
        receipt: item.receipt,
      }));

      setItemEntryItems(formattedItems);
      console.log("âœ… Fetched Item Entry Items:", formattedItems);
    } catch (error) {
      console.error("âŒ Error fetching item entry items:", error);
      Alert.alert("Error", `Failed to load item entry items: ${error.message}`);
    }
  };

  // âœ… AUTO CALCULATE MODIFIED WEIGHT - Runs when weight changes
  useEffect(() => {
    if (selectedItem && weight) {
      const wt = parseFloat(weight) || 0;
      const remaining = selectedItem.weight - wt;
      setModifiedWeight(remaining.toFixed(3));
    } else {
      setModifiedWeight("");
    }
  }, [weight, selectedItem]);

  // ðŸ”¢ Auto calculate W/M = Weight Ã— Touch
  useEffect(() => {
    const wt = parseFloat(weight) || 0;
    const t = parseFloat(touch) || 0;

    if (wt > 0 && t > 0) {
      const wmValue = ((wt * t) / 100).toFixed(3);
      setWastage(wmValue);
    } else {
      setWastage("");
    }
  }, [weight, touch]);

  // âœ… Auto-calculate GST Amount for the current item
  useEffect(() => {
    if (gstEnabled) {
      const wt = parseFloat(weight) || 0;
      const w = parseFloat(wastage) || 0;
      const r = parseFloat(rate) || 0;
      const p = parseFloat(gstPercentage) || 0;

      const total = (wt + w) * r;
      const gst = total * (p / 100);
      setGstAmount(gst.toFixed(2));
    } else {
      setGstAmount("0.00");
    }
  }, [weight, wastage, rate, gstPercentage, gstEnabled]);

  // ðŸ”¢ Auto calculate Receipt Pure = Weight Ã— Result Ã— Touch
  useEffect(() => {
    const wt = parseFloat(receiptWeight) || 0;
    const r = parseFloat(receiptResult) || 0;
    const t = parseFloat(receiptTouch) || 0;

    if (wt > 0 && r > 0 && t > 0) {
      const pureValue = calcReceiptPure(wt, r, t);
      setReceiptPure(pureValue.toString());
    } else {
      setReceiptPure("");
    }
  }, [receiptWeight, receiptResult, receiptTouch]);
  // ---------------- RECEIPT TABLE STATE ----------------
  const [b2cReceiptItems, setB2cReceiptItems] = useState([]);
  const [rName, setRName] = useState("");
  const [rWeight, setRWeight] = useState("");
  const [rSub, setRSub] = useState("");
  const [rRate, setRRate] = useState("");
  const [cashTable, setCashTable] = useState([]);
  const [rupees, setRupees] = useState("");
  const [cashGoldRate, setCashGoldRate] = useState("");
  const [cashPureInput, setCashPureInput] = useState("0.000");
  const totalReceiptCartItems = b2cReceiptItems.length;
  const totalReceiptCartAmount = b2cReceiptItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0,
  );

  // Sync rRate with main rate initially or when rate changes if rRate is empty
  useEffect(() => {
    if (passedGoldRate) {
      setRRate(passedGoldRate);
    } else if (rate && !rRate) {
      setRRate(rate);
    }
  }, [rate, passedGoldRate]);

  useEffect(() => {
    if (passedGoldRate) {
      setCashGoldRate(passedGoldRate);
    } else if (rate && !cashGoldRate) {
      setCashGoldRate(rate);
    }
  }, [rate, passedGoldRate]);

  // ---------------- RECEIPT TABLE FUNCTIONS ----------------
  const addB2CReceiptItem = () => {
    if (!rName) {
      Alert.alert("Error", "Please enter Item Name");
      return;
    }
    const valWeight = parseFloat(rWeight);
    if (isNaN(valWeight) || valWeight <= 0) {
      Alert.alert("Error", "Please enter valid Weight");
      return;
    }
    const valSub = parseFloat(rSub) || 0;
    const valNetWeight = valWeight - valSub;
    const valRate = parseFloat(rRate);

    if (isNaN(valRate) || valRate <= 0) {
      Alert.alert("Error", "Please enter valid Rate");
      return;
    }

    const valAmount = valNetWeight * valRate;

    const newItem = {
      name: rName,
      weight: valWeight.toFixed(3),
      sub: valSub.toFixed(3),
      netWeight: valNetWeight.toFixed(3),
      rate: valRate.toFixed(2),
      amount: valAmount.toFixed(2),
    };

    setB2cReceiptItems([...b2cReceiptItems, newItem]);

    // Clear inputs
    setRName("");
    setRWeight("");
    setRSub("");
    // Keep rate as is
  };

  const deleteB2CReceiptItem = (index) => {
    const updated = [...b2cReceiptItems];
    updated.splice(index, 1);
    setB2cReceiptItems(updated);
  };

  const addCashEntry = async () => {
    const r = rupees || "0";
    const gr = cashGoldRate || "0";

    if (parseNum(r) <= 0) {
      Alert.alert("Invalid Amount", "Please enter rupees greater than 0");
      return;
    }
    if (parseNum(gr) <= 0) {
      Alert.alert("Invalid Rate", "Please enter a valid FT Rate greater than 0");
      return;
    }

    const pure = computeCashPure(r, gr);
    const cashEntryData = {
      rupees: parseNum(r),
      goldrate: parseNum(gr),
      pure,
    };

    try {
      const response = await fetch(`${base_url}/cashReceived`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cashEntryData),
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      setCashTable((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          rupees: Number(parseNum(r).toFixed(2)),
          goldRate: Number(parseNum(gr).toFixed(2)),
          pure,
        },
      ]);

      setRupees("");
      setCashPureInput("0.000");
    } catch (error) {
      console.error("Error saving cash entry:", error);
      Alert.alert("Error", `Failed to save cash entry: ${error.message}`);
    }
  };

  const removeCashEntry = (id) => {
    setCashTable((prev) => prev.filter((row) => row.id !== id));
  };


  // ---------------- ADD ITEM (FIXED VERSION) ----------------
  const addRow = async () => {
    console.log("ðŸ”µ ADD ITEM - Function called");
    console.log("ðŸ” Current values:", {
      itemName,
      weight,
      rate,
      touch,
      wastage,
    });

    // âœ… FIX 1: Better validation
    if (!itemName || !itemName.trim()) {
      console.log("âŒ ADD ITEM - Missing item name");
      Alert.alert("Required", "Enter Item Name");
      return;
    }

    if (!weight || parseFloat(weight) <= 0) {
      console.log("âŒ ADD ITEM - Invalid weight");
      Alert.alert("Required", "Enter valid Weight");
      return;
    }

    if (!rate || parseFloat(rate) <= 0) {
      console.log("âŒ ADD ITEM - Invalid rate");
      Alert.alert("Required", "Enter valid Rate");
      return;
    }

    // âœ… FIX 2: Check if item is selected
    if (!selectedItem) {
      console.log("âŒ ADD ITEM - No item selected from stock");
      Alert.alert("Error", "Please select an item from the stock list");
      return;
    }

    const wt = parseFloat(weight);
    const t = parseFloat(touch || 0);
    const w = parseFloat(wastage || 0);
    const r = parseFloat(rate);

    // Use separated calculation functions for better understanding
    const total = calcTotal(wt, w, r);
    const gst = calcGST(total, gstPercentage, gstEnabled);
    const final = calcFinal(total, gst);

    console.log("ðŸ“Š ADD ITEM - Calculated values:", {
      weight: wt,
      touch: t,
      wastage: w,
      rate: r,
      total,
      gst,
      final,
    });

    console.log("ðŸ” ADD ITEM - Selected item:", selectedItem);

    if (selectedItem.weight < wt) {
      console.log(
        `âŒ ADD ITEM - Insufficient stock. Available: ${selectedItem.weight}, Required: ${wt}`
      );
      Alert.alert(
        "Insufficient Stock",
        `Available: ${selectedItem.weight.toFixed(3)} g\nRequired: ${wt.toFixed(
          3
        )} g`
      );
      return;
    }

    const newWeight = selectedItem.weight - wt;
    console.log(
      `ðŸ“‰ ADD ITEM - Stock will be updated from ${selectedItem.weight
      }g to ${newWeight.toFixed(3)}g`
    );

    try {
      console.log("ðŸš€ ADD ITEM - Starting API calls...");

      // 1ï¸âƒ£ SAVE ITEM TO AddItem DATABASE
      const addItemPayload = {
        customerName: customerName,
        invoiceNo: invoiceNo || "N/A",
        itemName: itemName,
        weight: wt,
        touch: t,
        wm: w,
        rate: r,
        total: total,
        gst: gst,
        final: final,
        modifiedWeight: parseFloat(modifiedWeight || 0),
        stockMasterId: selectedItem.id,
        date: date.split("/").reverse().join("-"),
      };

      console.log("ðŸ“¤ ADD ITEM - Saving to AddItem DB:", addItemPayload);

      const addItemResponse = await fetch(`${base_url}/addItem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addItemPayload),
      });

      if (!addItemResponse.ok) {
        const errorText = await addItemResponse.text();
        console.error(
          `âŒ ADD ITEM - Failed to save. Status: ${addItemResponse.status}`,
          errorText
        );
        throw new Error(
          `Failed to save item: ${addItemResponse.status} - ${errorText}`
        );
      }

      const savedItem = await addItemResponse.json();
      console.log("âœ… ADD ITEM - Item saved to AddItem DB:", savedItem);

      // 2ï¸âƒ£ UPDATE STOCK IN DATABASE
      const stockUpdatePayload = {
        itemName: selectedItem.itemName,
        weight: parseFloat(newWeight.toFixed(3)),
        less: selectedItem.less,
        netWeight: selectedItem.netWeight,
        calculation: selectedItem.calculation,
        pure: selectedItem.pure,
      };

      console.log("ðŸ“¤ ADD ITEM - Updating stock:", stockUpdatePayload);

      const stockResponse = await fetch(
        `${base_url}/stockMaster/${selectedItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stockUpdatePayload),
        }
      );

      if (!stockResponse.ok) {
        const errorText = await stockResponse.text();
        console.error(
          `âŒ ADD ITEM - Failed to update stock. Status: ${stockResponse.status}`,
          errorText
        );
        throw new Error(
          `Failed to update stock: ${stockResponse.status} - ${errorText}`
        );
      }

      const updatedStock = await stockResponse.json();
      console.log("âœ… ADD ITEM - Stock updated in DB:", updatedStock);

      const newItem = {
        itemName,
        displayItemName: displayItemName || itemName,
        weight: wt,
        touch: t,
        wastage: w,
        rate: r,
        total,
        gst,
        final,
        pure: Number(((wt * t) / 100).toFixed(3)),
        modifiedWeight: parseFloat(modifiedWeight || 0),
        gstEnabled,
      };

      console.log("ðŸ“ ADD ITEM - Adding to local state:", newItem);

      setItems((prev) => {
        const updated = [...prev, newItem];
        console.log(
          "âœ… ADD ITEM - Items state updated. Total items:",
          updated.length
        );
        console.log("âœ… ADD ITEM - Current items:", updated);
        return updated;
      });

      setItemList((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, weight: parseFloat(newWeight.toFixed(3)) }
            : item
        )
      );

      // 4ï¸âƒ£ CLEAR FORM - âœ… FIX 3: Keep previous rate
      console.log("ðŸ§¹ ADD ITEM - Clearing form fields");
      setItemName("");
      setDisplayItemName("");
      setWeight("");
      setTouch("");
      setWastage("");
      // Keep the previous rate value, don't change it
      setSelectedItem(null);
      setModifiedWeight("");
      setShowItemDropdown(false);

      // Save the rate to AsyncStorage so HomeScreen reflects it
      await AsyncStorage.setItem("goldRate", r.toString());

      console.log("âœ… ADD ITEM - Process completed successfully!");
      console.log("Success", "Item added successfully!");
    } catch (error) {
      console.error("âŒ ADD ITEM - Error occurred:", error);
      console.error("âŒ ADD ITEM - Error details:", {
        message: error.message,
        stack: error.stack,
      });
      Alert.alert("Error", `Failed to save item: ${error.message}`);
    }
  };

  // ---------------- DELETE ITEM ----------------
  const deleteRow = async (index) => {
    const itemToDelete = items[index];

    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This will restore the stock.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Find the original stock item
              const stockItem = itemList.find(
                (item) => item.itemName === itemToDelete.itemName
              );

              if (stockItem) {
                // Restore the stock
                const restoredWeight = stockItem.weight + itemToDelete.weight;

                const response = await fetch(
                  `${base_url}/stockMaster/${stockItem.id}`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      itemName: stockItem.itemName,
                      weight: restoredWeight,
                      less: stockItem.less,
                      netWeight: stockItem.netWeight,
                      calculation: stockItem.calculation,
                      pure: stockItem.pure,
                    }),
                  }
                );

                if (response.ok) {
                  // Update local state
                  const updated = [...items];
                  updated.splice(index, 1);
                  setItems(updated);

                  // Update item list
                  setItemList((prev) =>
                    prev.map((item) =>
                      item.id === stockItem.id
                        ? { ...item, weight: restoredWeight }
                        : item
                    )
                  );

                  Alert.alert("Success", "Item deleted and stock restored");
                }
              }
            } catch (error) {
              console.error("âŒ Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // ---------------- CUSTOMER NAME HANDLING ----------------
  const handleCustomerNameChange = (text) => {
    setCustomerName(text);
    if (text) {
      const filtered = b2cCustomers.filter((customer) =>
        (customer.customerName?.toLowerCase() || "").includes(text.toLowerCase()) ||
        (customer.phone?.toLowerCase() || "").includes(text.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
      setPhone("");
      setAddress("");
      setGstNumber("");
      setOldBalance("");
      setAdvanceBalance("");
    }
  };

  const selectCustomer = (customer) => {
    setCustomerName(customer.customerName);
    setPhone(customer.phone);
    setAddress(customer.address || "");
    setGstNumber(customer.gstin || "");

    let ob = Number(customer.oldBalance || 0);
    let ab = Number(customer.advanceBalance || 0);
    if (ob < 0) {
      ab += Math.abs(ob);
      ob = 0;
    }
    setOldBalance(ob.toFixed(3));
    setAdvanceBalance(ab > 0 ? ab.toFixed(3) : "");

    setDate(new Date().toLocaleDateString("en-GB"));
    setSelectedCust(customer);
    setShowDropdown(false);
    setShowItems(true);
    setCartSearch("");
  };

  // ---------------- PHONE HANDLING ----------------
  const handlePhoneChange = (text) => {
    setPhone(text);
    if (text) {
      const filtered = b2cCustomers.filter((customer) =>
        customer.phone.startsWith(text)
      );
      setFilteredCustomersByPhone(filtered);
      setShowPhoneDropdown(true);

      // Auto-fill customer details when exact phone match found
      const customer = b2cCustomers.find((customer) => customer.phone === text);
      if (customer) {
        setCustomerName(customer.customerName);
        setAddress(customer.address || "");
        setGstNumber(customer.gstin || "");

        let ob = Number(customer.oldBalance || 0);
        let ab = Number(customer.advanceBalance || 0);
        if (ob < 0) {
          ab += Math.abs(ob);
          ob = 0;
        }
        setOldBalance(ob.toFixed(3));
        setAdvanceBalance(ab > 0 ? ab.toFixed(3) : "");

        setDate(new Date().toLocaleDateString("en-GB"));
      }
    } else {
      setFilteredCustomersByPhone([]);
      setShowPhoneDropdown(false);
      setCustomerName("");
      setAddress("");
      setGstNumber("");
      setOldBalance("");
      setAdvanceBalance("");
    }
  };

  const selectCustomerByPhone = (customer) => {
    setCustomerName(customer.customerName);
    setPhone(customer.phone);
    setAddress(customer.address || "");
    setGstNumber(customer.gstin || "");

    let ob = Number(customer.oldBalance || 0);
    let ab = Number(customer.advanceBalance || 0);
    if (ob < 0) {
      ab += Math.abs(ob);
      ob = 0;
    }
    setOldBalance(ob.toFixed(3));
    setAdvanceBalance(ab > 0 ? ab.toFixed(3) : "");

    setDate(new Date().toLocaleDateString("en-GB"));
    setSelectedCust(customer);
    setShowPhoneDropdown(false);
    setShowItems(true);
  };

  // ---------------- ITEM NAME HANDLING ----------------
  const handleItemNameChange = (text) => {
    setItemName(text);
    // Only show ite

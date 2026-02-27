
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

  // ✅ Load latest B2C GST settings from DB whenever page is focused
  useFocusEffect(
    useCallback(() => {
      const fetchLatestGstSettings = async () => {
        try {
          const response = await fetch(`${base_url}/gst`);
          const data = await response.json();
          const latestB2C = data.filter((item) => item.type === "B2C")[0];

          if (latestB2C) {
            setGstEnabled(latestB2C.enabled || false);
            setSgst(latestB2C.sgst || "");
            setCgst(latestB2C.cgst || "");
            setIgst(latestB2C.igst || "");

            // ✅ Load saved checkbox states from AsyncStorage
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
      fetchLatestGstSettings();
    }, [])
  );

  // ✅ Auto-calculate Total GST %
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
          console.log("✅ Using gold rate from HomeScreen:", passedGoldRate);
          setRate(passedGoldRate);
          return;
        }

        // Priority 2: Load from AsyncStorage
        const storedRate = await AsyncStorage.getItem("goldRate");
        if (storedRate) {
          console.log("✅ Using stored gold rate:", storedRate);
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
    console.log("🟢 ITEMS STATE:", items);
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
        console.log("📥 Received estimate:", estimate);

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
        console.log("✅ Estimate items handled");
      }
    });
    return unsubscribe;
  }, [route.params?.estimate]);

  // ---------------- HANDLE EDIT TRANSACTION PARAMS ----------------
  useEffect(() => {
    if (route.params?.editTransaction) {
      const t = route.params.editTransaction;
      const c = route.params.editCustomer;

      console.log("📝 Editing Transaction:", t);

      // Populate Customer
      if (c) {
        setCustomerName(c.customerName || c.name || "");
        setPhone(c.customerNumber || c.phone || c.phoneNumber || "");
        setAddress(c.address || "");
        setGstNumber(c.gstin || "");
      }

      if (t.invoiceNo) setInvoiceNo(t.invoiceNo);

      // Populate Items
      if (t.items && Array.isArray(t.items)) {
        setItems(t.items);
        setShowItems(true);
      }

      // Populate Receipt Items
      if (t.receiptItems && Array.isArray(t.receiptItems)) {
        setB2cReceiptItems(t.receiptItems);
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

  // ✅ Fetch B2C customers from API
  useEffect(() => {
    fetchB2CCustomers();
    fetchRecentNames();
    generateInvoiceNo();
  }, []);

  // ✅ Handle navigation params to update customers list after creating new customer
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
      console.log("🔍 Fetching from:", `${base_url}/customersB2C`);

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
      console.log("✅ Fetched B2C Customers:", formattedCustomers);
    } catch (error) {
      console.error("❌ Error fetching B2C customers:", error);
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
    console.log("🔄 Refreshing data...");
    await fetchB2CCustomers();
    await fetchRecentNames();
    await generateInvoiceNo();
    console.log("Success", "Data refreshed from database");
  };

  const generateInvoiceNo = async () => {
    try {
      const response = await fetch(`${base_url}/retail`);
      if (response.ok) {
        const transactions = await response.json();
        if (transactions.length > 0) {
          // Find the highest numeric part from all invoices starting with NTJ
          const ntjInvoices = transactions
            .map(t => t.invoiceNo)
            .filter(inv => inv && inv.startsWith("NTJ"))
            .map(inv => parseInt(inv.replace("NTJ", ""), 10))
            .filter(num => !isNaN(num));

          const lastNo = ntjInvoices.length > 0 ? Math.max(...ntjInvoices) : 0;
          const nextNo = lastNo + 1;
          setInvoiceNo(`NTJ${nextNo.toString().padStart(4, "0")}`);
        } else {
          setInvoiceNo("NTJ0001");
        }
      } else {
        setInvoiceNo("NTJ0001");
      }
    } catch (error) {
      console.error("Error generating invoice number:", error);
      setInvoiceNo("NTJ0001");
    }
  };

  // ✅ Fetch Stock Master from API
  const fetchStockMaster = async () => {
    try {
      console.log("🔍 Fetching stock from:", `${base_url}/stockMaster`);

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
      console.log("✅ Fetched Stock Master:", formattedStock);
    } catch (error) {
      console.error("❌ Error fetching stock master:", error);
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

  // ✅ Fetch Item Entry Items from API
  const fetchItemEntryItems = async () => {
    try {
      console.log("🔍 Fetching item entry items from:", `${base_url}/items`);

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
      console.log("✅ Fetched Item Entry Items:", formattedItems);
    } catch (error) {
      console.error("❌ Error fetching item entry items:", error);
      Alert.alert("Error", `Failed to load item entry items: ${error.message}`);
    }
  };

  // ✅ AUTO CALCULATE MODIFIED WEIGHT - Runs when weight changes
  useEffect(() => {
    if (selectedItem && weight) {
      const wt = parseFloat(weight) || 0;
      const remaining = selectedItem.weight - wt;
      setModifiedWeight(remaining.toFixed(3));
    } else {
      setModifiedWeight("");
    }
  }, [weight, selectedItem]);

  // 🔢 Auto calculate W/M = Weight × Touch
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

  // ✅ Auto-calculate GST Amount for the current item
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

  // 🔢 Auto calculate Receipt Pure = Weight × Result × Touch
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

  // Sync rRate with main rate initially or when rate changes if rRate is empty
  useEffect(() => {
    if (passedGoldRate) {
      setRRate(passedGoldRate);
    } else if (rate && !rRate) {
      setRRate(rate);
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


  // ---------------- ADD ITEM (FIXED VERSION) ----------------
  const addRow = async () => {
    console.log("🔵 ADD ITEM - Function called");
    console.log("🔍 Current values:", {
      itemName,
      weight,
      rate,
      touch,
      wastage,
    });

    // ✅ FIX 1: Better validation
    if (!itemName || !itemName.trim()) {
      console.log("❌ ADD ITEM - Missing item name");
      Alert.alert("Required", "Enter Item Name");
      return;
    }

    if (!weight || parseFloat(weight) <= 0) {
      console.log("❌ ADD ITEM - Invalid weight");
      Alert.alert("Required", "Enter valid Weight");
      return;
    }

    if (!rate || parseFloat(rate) <= 0) {
      console.log("❌ ADD ITEM - Invalid rate");
      Alert.alert("Required", "Enter valid Rate");
      return;
    }

    // ✅ FIX 2: Check if item is selected
    if (!selectedItem) {
      console.log("❌ ADD ITEM - No item selected from stock");
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

    console.log("📊 ADD ITEM - Calculated values:", {
      weight: wt,
      touch: t,
      wastage: w,
      rate: r,
      total,
      gst,
      final,
    });

    console.log("🔍 ADD ITEM - Selected item:", selectedItem);

    if (selectedItem.weight < wt) {
      console.log(
        `❌ ADD ITEM - Insufficient stock. Available: ${selectedItem.weight}, Required: ${wt}`
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
      `📉 ADD ITEM - Stock will be updated from ${selectedItem.weight
      }g to ${newWeight.toFixed(3)}g`
    );

    try {
      console.log("🚀 ADD ITEM - Starting API calls...");

      // 1️⃣ SAVE ITEM TO AddItem DATABASE
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

      console.log("📤 ADD ITEM - Saving to AddItem DB:", addItemPayload);

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
          `❌ ADD ITEM - Failed to save. Status: ${addItemResponse.status}`,
          errorText
        );
        throw new Error(
          `Failed to save item: ${addItemResponse.status} - ${errorText}`
        );
      }

      const savedItem = await addItemResponse.json();
      console.log("✅ ADD ITEM - Item saved to AddItem DB:", savedItem);

      // 2️⃣ UPDATE STOCK IN DATABASE
      const stockUpdatePayload = {
        itemName: selectedItem.itemName,
        weight: parseFloat(newWeight.toFixed(3)),
        less: selectedItem.less,
        netWeight: selectedItem.netWeight,
        calculation: selectedItem.calculation,
        pure: selectedItem.pure,
      };

      console.log("📤 ADD ITEM - Updating stock:", stockUpdatePayload);

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
          `❌ ADD ITEM - Failed to update stock. Status: ${stockResponse.status}`,
          errorText
        );
        throw new Error(
          `Failed to update stock: ${stockResponse.status} - ${errorText}`
        );
      }

      const updatedStock = await stockResponse.json();
      console.log("✅ ADD ITEM - Stock updated in DB:", updatedStock);

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

      console.log("📝 ADD ITEM - Adding to local state:", newItem);

      setItems((prev) => {
        const updated = [...prev, newItem];
        console.log(
          "✅ ADD ITEM - Items state updated. Total items:",
          updated.length
        );
        console.log("✅ ADD ITEM - Current items:", updated);
        return updated;
      });

      setItemList((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, weight: parseFloat(newWeight.toFixed(3)) }
            : item
        )
      );

      // 4️⃣ CLEAR FORM - ✅ FIX 3: Keep previous rate
      console.log("🧹 ADD ITEM - Clearing form fields");
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

      console.log("✅ ADD ITEM - Process completed successfully!");
      console.log("Success", "Item added successfully!");
    } catch (error) {
      console.error("❌ ADD ITEM - Error occurred:", error);
      console.error("❌ ADD ITEM - Error details:", {
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
              console.error("❌ Error deleting item:", error);
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
    // Only show items marked as 'issue' type in the Item Entry list
    const issueStockNames = new Set(
      itemEntryItems.filter((e) => e.issue === true).map((e) => e.stockName)
    );
    const issueOnlyItems = itemList.filter((item) => issueStockNames.has(item.itemName));

    if (text) {
      const filtered = issueOnlyItems.filter((item) =>
        item.itemName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowItemDropdown(true);
    } else {
      setFilteredItems(issueOnlyItems);
      setShowItemDropdown(true);
      setSelectedItem(null);
      setModifiedWeight("");
      setTouch("");
    }
  };

  const selectItem = (item) => {
    setItemName(item.itemName);
    setSelectedItem({ ...item, weight: Number(item.weight) });
    setWeight("");

    // Find matching item in itemEntryItems by stockName
    const matchingItemEntry = itemEntryItems.find(
      (entry) => entry.stockName === item.itemName
    );

    // Auto-fill TOUCH with percentage from ItemEntry if found, else use pure value
    const touchValue = matchingItemEntry
      ? matchingItemEntry.percentage.toString()
      : item.pure.toString();

    const detailValue = matchingItemEntry ? matchingItemEntry.itemDetails : item.itemName;

    setTouch(touchValue);
    setDisplayItemName(detailValue);
    setModifiedWeight("");
    setShowItemDropdown(false);
  };

  // ---------------- CUSTOMER SUBMIT ----------------
  const handleCustomerSubmit = async () => {
    if (!customerName || !phone) {
      Alert.alert("Required", "Enter Customer Name & Phone");
      return;
    }

    try {
      console.log("Submitting customer...", {
        customerName,
        phone,
        address,
        date,
        invoiceNo,
      });

      const response = await fetch(`${base_url}/B2Ccal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          Address: address,
          Phone: phone,
          Date: date.split("/").reverse().join("-"),
          InvoiceNumber: invoiceNo || "N/A",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const savedCustomer = await response.json();
      console.log("✅ Customer saved:", savedCustomer);

      // Show items section after successful save
      setShowItems(true);
    } catch (error) {
      console.error("❌ Error saving customer:", error);
      Alert.alert("Error", `Failed to save customer: ${error.message}`);
    }
  };

  const calculateReport = () => {
    let totalReceipt = 0;
    let totalReceiptPure = 0;

    items.forEach((item) => {
      totalReceipt += Number(item.weight || 0);
      totalReceiptPure +=
        (Number(item.weight || 0) * Number(item.touch || 0)) / 100;
    });

    const totalOldGoldAmount = b2cReceiptItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalItemFinal = items.reduce((sum, i) => sum + Number(i.final || 0), 0);

    return {
      totalIssue: "0.000",
      totalIssuePure: "0.000",
      totalReceipt: totalReceipt.toFixed(3),
      totalReceiptPure: totalReceiptPure.toFixed(3),
      cash: (totalItemFinal - totalOldGoldAmount).toFixed(2),
      cashPure: totalReceiptPure.toFixed(3),
      oldGoldAmount: totalOldGoldAmount.toFixed(2), // Added for reference
    };
  };

  const formatTransactions = () =>
    items.map((item) => ({
      date,
      issue: "0.000",
      issuePure: "0.000",
      receipt: item.weight.toFixed(3),
      receiptPure: ((item.weight * item.touch) / 100).toFixed(3),
      cashPure: ((item.weight * item.touch) / 100).toFixed(3),
    }));

  // ---------------- FINAL SUBMIT ----------------
  const handleFinalSubmit = async () => {
    if (items.length === 0) {
      Alert.alert("Error", "No items added");
      return;
    }

    const reportData = calculateReport();
    const transactionData = formatTransactions();

    console.log("FINAL ITEMS 👉", items);
    console.log("FINAL REPORT 👉", reportData);
    console.log("FINAL TXNS 👉", transactionData);

    // Unified Transactional Save
    try {
      const customer = b2cCustomers.find(c => (c.customerName === customerName || c.name === customerName) && (c.phone === phone || c.customerNumber === phone));

      // Pre-calculate all values at top level so they are in scope for transactionRecord
      const ob = parseFloat(customer?.oldBalance || 0);
      const ab = parseFloat(customer?.advanceBalance || 0);
      const issuePureTotal = items.reduce((sum, it) => sum + ((parseFloat(it.weight || 0) * parseFloat(it.touch || 0)) / 100), 0);
      const issueTotalWeight = items.reduce((sum, it) => sum + parseFloat(it.weight || 0), 0);
      const receiptPureValue = b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.netWeight || 0), 0);
      const goldRateValue = parseFloat(passedGoldRate || rate || 0) || 1;
      const cashPureVal = parseFloat(reportData.cash || 0) / goldRateValue;
      let finalBalanceForRecord = 0;
      const savedCustomerId = customer?.id || customer?._id || "N/A";

      // 1. Update Customer Balance
      if (customer) {
        const currentNet = ob - ab;
        const newNet = currentNet + issuePureTotal - receiptPureValue - cashPureVal;

        let newCustomerOB = 0, newCustomerAB = 0;
        if (newNet >= 0) { newCustomerOB = newNet; newCustomerAB = 0; }
        else { newCustomerOB = 0; newCustomerAB = Math.abs(newNet); }

        finalBalanceForRecord = newNet;

        const updateResponse = await fetch(`${base_url}/customersB2C/${customer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldBalance: newCustomerOB.toFixed(3),
            advanceBalance: newCustomerAB.toFixed(3),
          }),
        });

        if (!updateResponse.ok) throw new Error("Failed to update customer balance.");
        console.log("✅ Customer balance updated successfully");
      }

      // 2. Save Transaction History — all required schema fields included
      const transactionRecord = {
        customerName,
        customerId: savedCustomerId,
        customerType: 'B2C',
        type: 'B2C',
        // Required by Transaction MongoDB schema:
        issueTotal: Number(issueTotalWeight.toFixed(3)),
        issuePure: Number(issuePureTotal.toFixed(3)),
        oldBalance: Number(ob.toFixed(3)),
        receiptPure: Number(receiptPureValue.toFixed(3)),
        cashPure: Number(cashPureVal.toFixed(3)),
        balance: Number(finalBalanceForRecord.toFixed(3)),
        advBal: Number(ab.toFixed(3)),
        // Extra B2C fields:
        date: date.split("/").reverse().join("-"),
        totalAmount: parseFloat(reportData.cash || 0),
        items: items,
        receiptItems: b2cReceiptItems,
        gst: gstEnabled ? {
          sgst, cgst, igst,
          total: ((isSgstEnabled ? parseFloat(sgst) || 0 : 0) + (isCgstEnabled ? parseFloat(cgst) || 0 : 0) + (isIgstEnabled ? parseFloat(igst) || 0 : 0)).toString(),
          amount: items.reduce((sum, item) => sum + (parseFloat(item.gst) || 0), 0).toFixed(2)
        } : null,
        invoiceNo: invoiceNo || "N/A",
        description: `B2C Bill - ${items.length} items`
      };

      const saveResponse = await fetch(`${base_url}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionRecord),
      });

      if (!saveResponse.ok) {
        const errText = await saveResponse.text();
        throw new Error(`Failed to save transaction history: ${errText}`);
      }
      const savedTxn = await saveResponse.json();

      // 3. Save Full Bill Summary
      const customerObj = b2cCustomers.find(c => c.customerName === customerName && c.phone === phone);
      const billSummaryData = {
        customerId: customerObj?.id || "N/A",
        customerName: customerName,
        customerType: "B2C",
        invoiceNo: invoiceNo || savedTxn._id || "N/A",
        date: date,
        ob: parseFloat(customerObj?.oldBalance || 0),
        advBal: parseFloat(customerObj?.advanceBalance || 0),
        issuePure: parseFloat(reportData.totalReceiptPure),
        receiptPure: b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.netWeight || 0), 0),
        cashPure: parseFloat(reportData.cash) / (parseFloat(passedGoldRate || 0) || 1),
        currentBalance: (() => {
          const ob = parseFloat(customerObj?.oldBalance || 0);
          const ab = parseFloat(customerObj?.advanceBalance || 0);
          const issue = parseFloat(reportData.totalReceiptPure);
          const receipt = b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.netWeight || 0), 0);
          const cashPure = parseFloat(reportData.cash) / (parseFloat(passedGoldRate || 0) || 1);
          return (ob - ab) + issue - receipt - cashPure;
        })(),
        issueItems: items.map(it => ({
          name: it.displayItemName || it.itemName,
          gross: it.weight,
          m: '-',
          net: it.weight,
          calc: it.touch,
          pure: it.pure
        })),
        receiptItems: b2cReceiptItems.map(it => ({
          name: it.name, weight: it.weight, result: it.netWeight, calc: it.touch, pure: it.netWeight
        })),
        cashTable: [],
        gst: gstEnabled ? {
          enabled: true,
          percentage: (transactionRecord.gst?.total || "0"),
          amount: (transactionRecord.gst?.amount || "0"),
          sgst, cgst, igst
        } : null,
      };

      const billRes = await fetch(`${base_url}/billSummary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billSummaryData),
      });

      if (!billRes.ok) throw new Error("Failed to save full bill summary.");
      console.log("✅ Entire B2C bill saved successfully");

    } catch (error) {
      console.error("❌ Error during final save:", error);
      Alert.alert("Save Error", error.message);
      return;
    }

    const currentCustomer = b2cCustomers.find(c => c.customerName === customerName && c.phone === phone);

    navigation.navigate("BillPreview", {
      customer: {
        name: customerName,
        shop: "Easy-gold",
        id: invoiceNo || "-",
        invoiceNo: invoiceNo || "-",
        phone,
        oldBalance: currentCustomer ? currentCustomer.oldBalance.toFixed(3) : "0.000",
        advanceBalance: currentCustomer ? currentCustomer.advanceBalance.toFixed(3) : "0.000",
        type: transactionType,
        email: "-",
        date: date,
        goldRate: rate,
        autoShare: true,
      },
      report: reportData,
      transactions: transactionData,
      items: items, // Pass items for B2C bill preview
      receiptItems: b2cReceiptItems, // Pass Old Gold items
      gst: gstEnabled ? {
        enabled: gstEnabled,
        percentage: (
          (isSgstEnabled ? (parseFloat(sgst) || 0) : 0) +
          (isCgstEnabled ? (parseFloat(cgst) || 0) : 0) +
          (isIgstEnabled ? (parseFloat(igst) || 0) : 0)
        ).toString(),
        amount: items.reduce((sum, item) => sum + (parseFloat(item.gst) || 0), 0).toFixed(2),
        sgst: isSgstEnabled ? sgst : "0",
        cgst: isCgstEnabled ? cgst : "0",
        igst: isIgstEnabled ? igst : "0",
        showInBill: true,
      } : {
        enabled: false,
        sgst: "0",
        cgst: "0",
        igst: "0"
      },
      summary: (() => {
        const customer = b2cCustomers.find(c => c.customerName === customerName && c.phone === phone);
        const ob = parseFloat(customer?.oldBalance || 0);
        const ab = parseFloat(customer?.advanceBalance || 0);
        const issue = parseFloat(reportData.totalReceiptPure);
        const receipt = b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.netWeight || 0), 0);
        const cashPure = parseFloat(reportData.cash) / (parseFloat(passedGoldRate || 0) || 1);
        const current = (ob - ab) + issue - receipt - cashPure;

        return {
          ob: ob.toFixed(3),
          ab: ab.toFixed(3),
          issue: issue.toFixed(3),
          receipt: receipt.toFixed(3),
          cash: cashPure.toFixed(3),
          current: current.toFixed(3)
        };
      })()
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      {/* ✅ HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.appHeaderTitle}>B2C Cal Page</Text>
        <View style={{ width: 30 }} />
        <View style={{ flexDirection: 'row', position: "absolute", right: 20, bottom: 15, alignItems: 'center', gap: 15 }}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Icon name="home-outline" color="#fff" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("CreateCustomerMaster", { type: "B2C", customers: b2cCustomers })
            }
          >
            <Feather name="user-plus" color="#fff" size={25} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 160 }}
          style={styles.container}
        >
          {/* ---------------- CUSTOMER SELECTION (Hide when customer is selected) ---------------- */}
          {!showItems && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="account-group" size={24} />
                  <Text style={styles.articleTitle}>Customer Details</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <View style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#555' }}>Inv: {invoiceNo}</Text>
                  </View>
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

              <ScrollView style={{ maxHeight: 200, marginBottom: 20 }}>
                {!cartSearch && recentNames.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 13, color: '#888', marginBottom: 10, marginLeft: 5, fontWeight: 'bold' }}>RECENT TRANSACTIONS</Text>
                    {b2cCustomers
                      .filter(c => recentNames.includes(c.customerName))
                      .map((cust, index) => {
                        let currentBalance = Number(cust.oldBalance || 0);
                        let advanceBalance = Number(cust.advanceBalance || 0);
                        if (currentBalance < 0) {
                          advanceBalance += Math.abs(currentBalance);
                          currentBalance = 0;
                        }
                        return (
                          <TouchableOpacity
                            key={`recent-${cust.id || index}`}
                            onPress={() => selectCustomer(cust)}
                            style={[styles.listItem, { borderLeftWidth: 4, borderLeftColor: '#2E7D32' }]}
                          >
                            <View>
                              <Text style={styles.listItemText}>
                                <Text style={{ fontWeight: 'bold', color: '#000' }}>{cust.customerName}</Text> | P : {cust.phone}
                              </Text>
                              <Text style={styles.balanceText}>
                                OB: {currentBalance.toFixed(3)}g {advanceBalance > 0 ? `| AB: ${advanceBalance.toFixed(3)}g` : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    <Text style={{ fontSize: 13, color: '#888', marginVertical: 10, marginLeft: 5, fontWeight: 'bold' }}>ALL CUSTOMERS</Text>
                  </View>
                )}
                {filteredCartCustomers.length > 0 ? (
                  filteredCartCustomers.map((cust, index) => {
                    let currentBalance = Number(cust.oldBalance || 0);
                    let advanceBalance = Number(cust.advanceBalance || 0);

                    if (currentBalance < 0) {
                      advanceBalance += Math.abs(currentBalance);
                      currentBalance = 0;
                    }

                    return (
                      <TouchableOpacity
                        key={cust.id || index}
                        onPress={() => selectCustomer(cust)}
                        style={styles.listItem}
                      >
                        <View>
                          <Text style={styles.listItemText}>
                            <Text style={{ fontWeight: 'bold', color: '#000' }}>{cust.customerName}</Text> | P : {cust.phone}
                          </Text>
                          <Text style={styles.balanceText}>
                            OB: {currentBalance.toFixed(3)}g {advanceBalance > 0 ? `| AB: ${advanceBalance.toFixed(3)}g` : ''}
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

          {/* ---------------- SELECTED CUSTOMER INFO (Show when customer is selected) ---------------- */}
          {showItems && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="account-check" size={24} color="#2E7D32" />
                  <Text style={[styles.articleTitle, { color: '#2E7D32' }]}>Selected Customer</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => {
                    setShowItems(false);
                    setSelectedCust(null);
                    setCustomerName("");
                    setPhone("");
                    setAddress("");
                    setOldBalance("");
                    setAdvanceBalance("");
                    setCartSearch("");
                  }}
                >
                  <Icon name="account-switch" size={20} color="#1E88E5" />
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginVertical: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{customerName}</Text>
                <Text style={{ color: '#666', marginTop: 4 }}>Phone: {phone}</Text>
                {address ? <Text style={{ color: '#666' }}>Address: {address}</Text> : null}
                {oldBalance ? <Text style={{ color: '#666' }}>OB: {oldBalance}</Text> : null}
                {advanceBalance ? <Text style={{ color: '#666' }}>AB: {advanceBalance}</Text> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                  <Text style={{ fontWeight: 'bold' }}>Inv: {invoiceNo}</Text>
                  <Text style={{ fontWeight: 'bold' }}>Date: {date}</Text>
                  <TouchableOpacity onPress={handleRefresh}>
                    <Icon name="refresh" color="#000" size={30} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ---------------- ITEM SECTION ---------------- */}

          {showItems && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Add Item</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ position: 'relative' }}>
                    <Icon name="cart" size={26} color="#000" />
                    {items.length > 0 && (
                      <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'red', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{items.length}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ marginLeft: 12, fontSize: 12, fontWeight: 'bold', color: '#555' }}>
                    {items.reduce((sum, item) => sum + (parseFloat(item.pure) || 0), 0).toFixed(3)}g
                  </Text>
                </View>
              </View>

              {/* ITEM NAME */}
              <Text style={styles.label}>Item</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                value={itemName}
                onChangeText={handleItemNameChange}
                onFocus={() => {
                  // Only show issue-type items in the dropdown
                  if (itemList.length > 0) {
                    const issueStockNames = new Set(
                      itemEntryItems.filter((e) => e.issue === true).map((e) => e.stockName)
                    );
                    setFilteredItems(itemList.filter((item) => issueStockNames.has(item.itemName)));
                    setShowItemDropdown(true);
                  }
                }}
              />
              {showItemDropdown &&
                Array.isArray(filteredItems) &&
                filteredItems.length > 0 && (
                  <View style={styles.dropdown}>
                    {filteredItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.dropdownItem}
                        onPress={() => selectItem(item)}
                      >
                        <Text>
                          {item.itemName} - {item.weight}g
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}



              {/* WEIGHT WITH INLINE MODIFIED WEIGHT */}
              <Text style={styles.label}>Weight (g)</Text>
              <View style={styles.weightInputContainer}>
                <TextInput
                  style={styles.weightInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="Enter weight"
                />
                {modifiedWeight && (
                  <Text style={styles.modifiedWeightText}>
                    Modified Weight: {modifiedWeight} g
                  </Text>
                )}
              </View>

              {/* TOUCH */}
              <Text style={styles.label}>Touch</Text>
              <TextInput
                style={styles.input}
                value={touch}
                onChangeText={setTouch}
                keyboardType="decimal-pad"
              />

              {/* WASTAGE */}
              <Text style={styles.label}>W/M</Text>
              <TextInput
                style={styles.input}
                value={wastage}
                editable={false}
                placeholder="Auto"
              />
              {/* RATE */}
              <Text style={styles.label}>Rate</Text>
              <TextInput
                style={styles.input}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
              />

              {/* ITEM NAME (FOR BILL) */}


              {/* GST CHECKBOX */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={async () => {
                    const newState = !gstEnabled;
                    setGstEnabled(newState);
                    if (newState) {
                      setIsSgstEnabled(true);
                      setIsCgstEnabled(true);
                      setIsIgstEnabled(true);

                      // Auto-load last saved GST record
                      try {
                        const stored = await AsyncStorage.getItem("gstSavedList");
                        if (stored) {
                          const list = JSON.parse(stored);
                          if (list.length > 0) {
                            const lastRecord = list[0]; // Assuming newest is first
                            const s = lastRecord.sgst || "";
                            const c = lastRecord.cgst || "";
                            const i = lastRecord.igst || "";

                            setSgst(s);
                            setCgst(c);
                            setIgst(i);

                            // Calculate Total GST %
                            const sVal = parseFloat(s) || 0;
                            const cVal = parseFloat(c) || 0;
                            const iVal = parseFloat(i) || 0;
                            setGstPercentage((sVal + cVal + iVal).toString());
                          }
                        }
                      } catch (error) {
                        console.error("Failed to auto-load GST record", error);
                      }
                    } else {
                      setIsSgstEnabled(false);
                      setIsCgstEnabled(false);
                      setIsIgstEnabled(false);
                    }
                  }}
                >
                  <Icon
                    name={gstEnabled ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={24}
                    color={gstEnabled ? "#2E7D32" : "#ccc"}
                  />
                  <Text style={styles.checkboxLabel}>Enable GST</Text>
                </TouchableOpacity>
              </View>

              {/* GST INPUT FIELDS */}
              {gstEnabled && (
                <View>
                  <View style={styles.rowBetween}>
                    <View style={{ width: "48%" }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            const newState = !isSgstEnabled;
                            setIsSgstEnabled(newState);
                            await AsyncStorage.setItem(
                              "b2c_sgst_enabled",
                              newState.toString(),
                            );
                          }}
                        >
                          <Icon
                            name={isSgstEnabled ? "checkbox-marked" : "checkbox-blank-outline"}
                            size={20}
                            color={isSgstEnabled ? "#2E7D32" : "#666"}
                          />
                        </TouchableOpacity>
                        <Text style={[styles.label, { marginBottom: 0, marginLeft: 8 }]}>SGST (%)</Text>
                      </View>
                      <TextInput
                        style={[styles.input, !isSgstEnabled && { backgroundColor: '#f0f0f0', color: '#999' }]}
                        value={sgst}
                        editable={isSgstEnabled}
                        onChangeText={(val) => {
                          setSgst(val);
                          const s = parseFloat(val) || 0;
                          const c = parseFloat(cgst) || 0;
                          const i = parseFloat(igst) || 0;
                          setGstPercentage((s + c + i).toString());
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                      />
                    </View>

                    <View style={{ width: "48%" }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            const newState = !isCgstEnabled;
                            setIsCgstEnabled(newState);
                            await AsyncStorage.setItem(
                              "b2c_cgst_enabled",
                              newState.toString(),
                            );
                          }}
                        >
                          <Icon
                            name={isCgstEnabled ? "checkbox-marked" : "checkbox-blank-outline"}
                            size={20}
                            color={isCgstEnabled ? "#2E7D32" : "#666"}
                          />
                        </TouchableOpacity>
                        <Text style={[styles.label, { marginBottom: 0, marginLeft: 8 }]}>CGST (%)</Text>
                      </View>
                      <TextInput
                        style={[styles.input, !isCgstEnabled && { backgroundColor: '#f0f0f0', color: '#999' }]}
                        value={cgst}
                        editable={isCgstEnabled}
                        onChangeText={(val) => {
                          setCgst(val);
                          const s = parseFloat(sgst) || 0;
                          const c = parseFloat(val) || 0;
                          const i = parseFloat(igst) || 0;
                          setGstPercentage((s + c + i).toString());
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                      />
                    </View>
                  </View>

                  <View style={styles.rowBetween}>
                    <View style={{ width: "48%" }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            const newState = !isIgstEnabled;
                            setIsIgstEnabled(newState);
                            await AsyncStorage.setItem(
                              "b2c_igst_enabled",
                              newState.toString(),
                            );
                          }}
                        >
                          <Icon
                            name={isIgstEnabled ? "checkbox-marked" : "checkbox-blank-outline"}
                            size={20}
                            color={isIgstEnabled ? "#2E7D32" : "#666"}
                          />
                        </TouchableOpacity>
                        <Text style={[styles.label, { marginBottom: 0, marginLeft: 8 }]}>IGST (%)</Text>
                      </View>
                      <TextInput
                        style={[styles.input, !isIgstEnabled && { backgroundColor: '#f0f0f0', color: '#999' }]}
                        value={igst}
                        editable={isIgstEnabled}
                        onChangeText={(val) => {
                          setIgst(val);
                          const s = parseFloat(sgst) || 0;
                          const c = parseFloat(cgst) || 0;
                          const i = parseFloat(val) || 0;
                          setGstPercentage((s + c + i).toString());
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                      />
                    </View>

                    <View style={{ width: "48%" }}>
                      <Text style={styles.label}>Total GST %</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: '#e0e0e0' }]}
                        value={gstPercentage}
                        editable={false}
                        placeholder="0.0"
                      />
                    </View>
                  </View>

                  <Text style={[styles.label, { marginTop: 12 }]}>GST Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={gstAmount}
                    onChangeText={setGstAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
              )}

              {/* ADD ITEM BUTTON */}
              <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
                <Text style={styles.addRowText}>+ ADD ITEM</Text>
              </TouchableOpacity>

              {/* ---------------- ITEM LIST TABLE ---------------- */}
              {items.length > 0 && (
                <>
                  <Text style={[styles.cardTitle, { marginTop: 20 }]}>
                    Item List
                  </Text>

                  <ScrollView horizontal>
                    <View>
                      {/* TABLE HEADER */}
                      <View style={styles.tableHeader}>
                        {[
                          "Item",
                          "Wt",
                          "Touch",
                          "Rate",
                          "Total",
                          "GST",
                          "GST Check",
                          "Final",
                          "Mod.Wt",
                          "X",
                        ].map((h, i) => (
                          <Text key={i} style={styles.th}>
                            {h}
                          </Text>
                        ))}
                      </View>

                      {/* TABLE ROWS */}
                      {items.map((row, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={styles.td}>{row.displayItemName || row.itemName}</Text>
                          <Text style={styles.td}>{row.weight}</Text>
                          <Text style={styles.td}>{row.touch}</Text>
                          <Text style={styles.td}>{row.rate}</Text>
                          <Text style={styles.td}>{Number(row.total || 0).toFixed(2)}</Text>
                          <Text style={styles.td}>{Number(row.gst || 0).toFixed(2)}</Text>
                          <View style={styles.td}>
                            <Icon
                              name={row.gstEnabled ? "checkbox-marked" : "checkbox-blank-outline"}
                              size={20}
                              color={row.gstEnabled ? "#2E7D32" : "#ccc"}
                            />
                          </View>
                          <Text style={styles.td}>{Number(row.final || 0).toFixed(2)}</Text>
                          <Text style={styles.td}>{row.modifiedWeight}</Text>

                          <TouchableOpacity onPress={() => deleteRow(index)}>
                            <Text style={[styles.td, { color: "red" }]}>
                              ❌
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* ---------------- RECEIPT ENTRY SECTION ---------------- */}
              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.cardTitle}>Receipt Entry (Old Gold)</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#1B4D1B",
                      paddingHorizontal: 15,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                    onPress={() => navigation.navigate("Payments", { receiptItems: b2cReceiptItems })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Move to Payments</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
                    <Text style={styles.label}>Item Name</Text>
                    <TextInput
                      style={styles.input}
                      value={rName}
                      onChangeText={setRName}
                      placeholder="Item Name"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Weight</Text>
                    <TextInput
                      style={styles.input}
                      value={rWeight}
                      onChangeText={setRWeight}
                      keyboardType="numeric"
                      placeholder="0.000"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Sub</Text>
                    <TextInput
                      style={styles.input}
                      value={rSub}
                      onChangeText={setRSub}
                      keyboardType="numeric"
                      placeholder="0.000"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Net Wt</Text>
                    <View style={[styles.input, { backgroundColor: "#eee", justifyContent: "center" }]}>
                      <Text>{(parseFloat(rWeight || 0) - parseFloat(rSub || 0)).toFixed(3)}</Text>
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Rate</Text>
                    <TextInput
                      style={styles.input}
                      value={rRate}
                      onChangeText={setRRate}
                      keyboardType="numeric"
                      placeholder="Rate"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1.5 }]}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={[styles.input, { backgroundColor: "#eee", justifyContent: "center" }]}>
                      <Text style={{ fontWeight: "bold" }}>
                        {((parseFloat(rWeight || 0) - parseFloat(rSub || 0)) * parseFloat(rRate || 0)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.addRowBtn} onPress={addB2CReceiptItem}>
                  <Text style={styles.addRowText}>Add Receipt Item</Text>
                </TouchableOpacity>

                {/* RECEIPT TABLE */}
                {b2cReceiptItems.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ gap: 5 }}>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.th, { flex: 0, textAlign: "left" }]}>
                            Name
                          </Text>
                          <Text style={styles.th}>Wt</Text>
                          <Text style={styles.th}>Sub</Text>
                          <Text style={styles.th}>NW</Text>
                          <Text style={styles.th}>Rate</Text>
                          <Text style={styles.th}>Amt</Text>
                          <Text style={styles.th}>X</Text>
                        </View>
                        {b2cReceiptItems.map((item, index) => (
                          <View key={index} style={styles.tableRow}>
                            <Text style={[styles.td, { flex: 0, textAlign: "left" }]}>
                              {item.name}
                            </Text>
                            <Text style={styles.td}>{item.weight}</Text>
                            <Text style={styles.td}>{item.sub}</Text>
                            <Text style={styles.td}>{item.netWeight}</Text>
                            <Text style={styles.td}>{item.rate}</Text>
                            <Text style={styles.td}>{item.amount}</Text>
                            <TouchableOpacity onPress={() => deleteB2CReceiptItem(index)}>
                              <Text style={[styles.td, { color: "red" }]}>❌</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                    <View
                      style={[
                        styles.tableRow,
                        {
                          marginTop: 10,
                          borderTopWidth: 1,
                          borderColor: "#ddd",
                          paddingTop: 10,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "right",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        Total Receipt Amount: ₹
                        {b2cReceiptItems
                          .reduce((acc, item) => acc + parseFloat(item.amount), 0)
                          .toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.finalSubmitBtn,
                  items.length === 0 && { opacity: 0.5 },
                ]}
                disabled={items.length === 0}
                onPress={handleFinalSubmit}
              >
                <Text style={styles.finalSubmitText}>
                  SUBMIT & PREVIEW BILL
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
}


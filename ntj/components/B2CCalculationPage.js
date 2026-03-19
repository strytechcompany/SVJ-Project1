import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { base_url } from "./config";
import { useFocusEffect } from "@react-navigation/native";
import { styles } from "./B2CCalculationpageStyles";
import CommonHeader from "./CommonHeader";

const CustomerListItem = memo(({ item, onPress, highlight }) => {
  let currentBalance = Number(item.oldBalance || 0);
  let advanceBalance = Number(item.advanceBalance || 0);
  if (currentBalance < 0) {
    advanceBalance += Math.abs(currentBalance);
    currentBalance = 0;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={[
        styles.listItem,
        highlight && { borderLeftWidth: 4, borderLeftColor: "#2E7D32" },
      ]}
    >
      <View>
        <Text style={styles.listItemText}>
          <Text style={{ fontWeight: "bold", color: "#000" }}>
            {item.customerName}
          </Text>{" "}
          | P : {item.phone}
        </Text>
        <Text style={styles.balanceText}>
          Inv: {item.lastBillNo || "None"} | OB:{" "}
          {Number(currentBalance || 0).toFixed(3)}g{" "}
          {advanceBalance > 0
            ? `| AB: ${Number(advanceBalance || 0).toFixed(3)}g`
            : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

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
  const [loadingCustomers, setLoadingCustomers] = useState(true);

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

  const filteredCartCustomers = useMemo(() => {
    const search = cartSearch.toLowerCase();
    return b2cCustomers.filter(
      (c) =>
        (c.customerName && c.customerName.toLowerCase().includes(search)) ||
        (c.phone && String(c.phone).includes(search))
    );
  }, [b2cCustomers, cartSearch]);

  const recentCustomers = useMemo(() => {
    if (!recentNames.length) return [];
    const recentSet = new Set(recentNames);
    return b2cCustomers.filter((c) => recentSet.has(c.customerName));
  }, [b2cCustomers, recentNames]);

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
            if (data.billNo) {
              setInvoiceNo(data.billNo);
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
    setLoadingCustomers(true);
    try {
      console.log("ðŸ” Fetching from:", `${base_url}/customersB2C`);

      const response = await fetch(`${base_url}/customersB2C`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const formattedCustomers = data
        .filter((customer) => {
          if (!customer.customerName) return false;
          const normalizedType = String(customer.customerType || "B2C").toUpperCase();
          return normalizedType === "B2C";
        })
        .map((customer) => ({
          id: customer._id || customer.id,
          customerName: customer.customerName,
          customerType: "B2C",
          phone: customer.phoneNumber || customer.phone,
          address: customer.address || "",
          oldBalance: parseFloat(customer.oldBalance || 0),
          advanceBalance: parseFloat(customer.advanceBalance || 0),
          gstin: customer.gstin || "",
          lastBillNo: customer.lastBillNo || customer.billNo || customer.invoiceNo || "",
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
    setLoadingCustomers(false);
  };

  const fetchRecentNames = async () => {
    try {
      setLoadingRecent(true);
      const b2cResp = await fetch(`${base_url}/B2Ccal`);

      let allData = [];
      if (b2cResp.ok) {
        const b2cData = await b2cResp.json();
        allData = [...b2cData];
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
    
    // Refresh next invoice number
    try {
      const res = await fetch(`${base_url}/billSummary/nextBillNo?billType=B2C`);
      if (res.ok) {
        const data = await res.json();
        if (data.billNo) {
          setInvoiceNo(data.billNo);
        }
      }
    } catch (error) {
      console.error("Failed to refresh next invoice number:", error);
    }

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
    let gr = cashGoldRate || rate || "0";
    
    if (parseNum(gr) <= 0 && parseNum(rate) > 0) {
      gr = rate.toString();
      setCashGoldRate(gr);
    }

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

  const handleAddFromDropdown = async (item) => {
    // Determine touch for this specific item
    const matchingItemEntry = itemEntryItems.find(
      (entry) => entry.stockName === item.itemName
    );
    const touchVal = matchingItemEntry
      ? matchingItemEntry.percentage
      : parseFloat(item.pure || 0);

    // Basic validation for weight and rate as they are external to the item object
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Required", "Please enter weight first");
      return;
    }
    if (!rate || parseFloat(rate) <= 0) {
      Alert.alert("Required", "Please enter rate");
      return;
    }

    // Set states so addRow can proceed with correct item context
    setItemName(item.itemName);
    setSelectedItem({ ...item, weight: Number(item.weight) });
    setTouch(touchVal.toString());
    setDisplayItemName(matchingItemEntry ? matchingItemEntry.itemDetails : item.itemName);

    // Since setState is async, we call addRow with a small delay or refactor it.
    // To keep it simple and reliable, we'll trigger it next tick.
    setTimeout(() => {
      addRow();
    }, 100);
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
      console.log("âœ… Customer saved:", savedCustomer);

      // Show items section after successful save
      setShowItems(true);
    } catch (error) {
      console.error("âŒ Error saving customer:", error);
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
    const totalCashAmount = cashTable.reduce((sum, c) => sum + Number(c.rupees || 0), 0);
    const totalCashPure = cashTable.reduce((sum, c) => sum + Number(c.pure || 0), 0);

    return {
      totalIssue: "0.000",
      totalIssuePure: "0.000",
      totalReceipt: totalReceipt.toFixed(3),
      totalReceiptPure: totalReceiptPure.toFixed(3),
      cash: (totalItemFinal - totalOldGoldAmount).toFixed(2), // bill amount
      cashReceived: totalCashAmount.toFixed(2),
      cashPure: totalCashPure.toFixed(3),
      oldGoldAmount: totalOldGoldAmount.toFixed(2), // Added for reference
    };
  };

  const formatTransactions = () => {
    const txns = items.map((item) => ({
      date,
      issue: "0.000",
      issuePure: "0.000",
      receipt: item.weight.toFixed(3),
      receiptPure: ((item.weight * item.touch) / 100).toFixed(3),
      cashPure: "0.000",
    }));

    cashTable.forEach((cash) => {
      txns.push({
        date,
        issue: "0.000",
        issuePure: "0.000",
        receipt: "0.000",
        receiptPure: "0.000",
        cashPure: Number(cash.pure || 0).toFixed(3),
      });
    });

    return txns;
  };

  // ---------------- FINAL SUBMIT ----------------
  const handleFinalSubmit = async () => {
    if (items.length === 0 && cashTable.length === 0 && b2cReceiptItems.length === 0) {
      Alert.alert("Error", "No records to submit");
      return;
    }

    const reportData = calculateReport();
    const transactionData = formatTransactions();
    let generatedBillNo = invoiceNo;

    console.log("FINAL ITEMS ðŸ‘‰", items);
    console.log("FINAL REPORT ðŸ‘‰", reportData);
    console.log("FINAL TXNS ðŸ‘‰", transactionData);

    // Unified Transactional Save
    try {
      const editBill = route.params?.editTransaction;
      const isEditMode = Boolean(editBill?._id);
      const customer = b2cCustomers.find(
        (c) =>
          (c.customerName === customerName || c.name === customerName) &&
          (c.phone === phone || c.customerNumber === phone)
      );
      const resolvedCustomer =
        customer ||
        selectedCust ||
        b2cCustomers.find((c) => c.phone === phone) ||
        b2cCustomers.find((c) => c.customerName === customerName || c.name === customerName) ||
        null;

      // Pre-calculate all values at top level so they are in scope for transactionRecord
      const ob = parseFloat(resolvedCustomer?.oldBalance || 0);
      const ab = parseFloat(resolvedCustomer?.advanceBalance || 0);
      const issuePureTotal = items.reduce((sum, it) => sum + ((parseFloat(it.weight || 0) * parseFloat(it.touch || 0)) / 100), 0);
      const issueTotalWeight = items.reduce((sum, it) => sum + parseFloat(it.weight || 0), 0);
      const receiptPureValue = b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.netWeight || 0), 0);
      const cashPureVal = cashTable.reduce((sum, row) => sum + parseFloat(row.pure || 0), 0);
      const cashReceivedAmount = cashTable.reduce((sum, row) => sum + parseFloat(row.rupees || 0), 0);
      const goldRateForBalance = parseFloat(rate || 0);
      const totalItemFinal = items.reduce((sum, it) => sum + parseFloat(it.final || 0), 0);
      const totalOldGoldAmount = b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const b2cTotalCashAmount = totalItemFinal - totalOldGoldAmount;
      const openingBalanceRupees = (ob - ab) * (goldRateForBalance || 0);
      const b2cFinalPayableAmount = b2cTotalCashAmount + openingBalanceRupees;
      const b2cBalanceRupees = b2cFinalPayableAmount - cashReceivedAmount;
      const b2cBalanceGrams =
        goldRateForBalance > 0 ? (b2cBalanceRupees / goldRateForBalance) : 0;
      let finalBalanceForRecord = 0;
      const savedCustomerId =
        resolvedCustomer?.id ||
        resolvedCustomer?._id ||
        resolvedCustomer?.customerId ||
        "";

      // 1. Update Customer Balance
      if (resolvedCustomer?.id) {
        const newNet = b2cBalanceGrams;

        let newCustomerOB = 0, newCustomerAB = 0;
        if (newNet >= 0) { newCustomerOB = newNet; newCustomerAB = 0; }
        else { newCustomerOB = 0; newCustomerAB = Math.abs(newNet); }

        finalBalanceForRecord = newNet;

        const updateResponse = await fetch(`${base_url}/customersB2C/${resolvedCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldBalance: newCustomerOB.toFixed(3),
            advanceBalance: newCustomerAB.toFixed(3),
          }),
        });

        if (!updateResponse.ok) throw new Error("Failed to update customer balance.");
        console.log("âœ… Customer balance updated successfully");
      }

      // 2. Save Transaction History â€” all required schema fields included
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
        cashTable: cashTable,
        gst: gstEnabled ? {
          sgst, cgst, igst,
          total: ((isSgstEnabled ? parseFloat(sgst) || 0 : 0) + (isCgstEnabled ? parseFloat(cgst) || 0 : 0) + (isIgstEnabled ? parseFloat(igst) || 0 : 0)).toString(),
          amount: items.reduce((sum, item) => sum + (parseFloat(item.gst) || 0), 0).toFixed(2)
        } : null,
        description: `B2C Bill - ${items.length} items`
      };

      if (!isEditMode) {
        const saveResponse = await fetch(`${base_url}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionRecord),
        });

        if (!saveResponse.ok) {
          const errText = await saveResponse.text();
          throw new Error(`Failed to save transaction history: ${errText}`);
        }
        await saveResponse.json();
      }

      // 3. Save Full Bill Summary
      const billSummaryData = {
        customerId: savedCustomerId,
        customerName: customerName,
        customerType: "B2C",
        billType: "B2C", // Explicitly set for backend
        date: date.split("/").reverse().join("-"),
        items: items,
        ob: ob,
        advBal: ab,
        issuePure: parseFloat(reportData.totalReceiptPure),
        receiptPure: b2cReceiptItems.reduce((sum, item) => sum + parseFloat(item.netWeight || 0), 0),
        cashPure: cashPureVal,
        currentBalance: b2cBalanceGrams,
        issueItems: items.map(it => ({
          name: it.displayItemName || it.itemName,
          itemName: it.itemName,
          displayItemName: it.displayItemName || it.itemName,
          weight: it.weight,
          touch: it.touch,
          wastage: it.wastage,
          rate: it.rate,
          total: it.total,
          gst: it.gst,
          final: it.final,
          gross: it.weight,
          m: it.wastage ?? '-',
          net: it.weight,
          calc: it.touch,
          pure: it.pure,
        })),
        receiptItems: b2cReceiptItems.map(it => ({
          name: it.name,
          weight: it.weight,
          sub: it.sub,
          netWeight: it.netWeight,
          rate: it.rate,
          amount: it.amount,
          // Keep legacy B2B-style keys for backward compatibility
          result: it.netWeight,
          calc: it.touch ?? 0,
          pure: it.netWeight,
        })),
        cashTable: cashTable,
        gst: gstEnabled ? {
          enabled: true,
          percentage: (transactionRecord.gst?.total || "0"),
          amount: (transactionRecord.gst?.amount || "0"),
          sgst, cgst, igst
        } : null,
      };

      if (isEditMode) {
        billSummaryData.billNo = editBill.billNo || editBill.invoiceNo || "";
        billSummaryData.invoiceNo = editBill.billNo || editBill.invoiceNo || "";
      }

      const billEndpoint = isEditMode
        ? `${base_url}/billSummary/${editBill._id}?billType=B2C`
        : `${base_url}/billSummary`;
      const billMethod = isEditMode ? "PUT" : "POST";

      const billRes = await fetch(billEndpoint, {
        method: billMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billSummaryData),
      });

      if (!billRes.ok) {
        const errText = await billRes.text();
        throw new Error(`Failed to save full bill summary: ${errText}`);
      }
      const savedBillSummary = await billRes.json();
      generatedBillNo = savedBillSummary?.billNo || savedBillSummary?.invoiceNo || generatedBillNo;
      setInvoiceNo(generatedBillNo);
      console.log("âœ… Entire B2C bill saved successfully");

    } catch (error) {
      console.error("âŒ Error during final save:", error);
      Alert.alert("Save Error", error.message);
      return;
    }

    const currentCustomer = b2cCustomers.find(c => c.customerName === customerName && c.phone === phone);

    navigation.navigate("BillPreview", {
      customer: {
        name: customerName,
        shop: "Easy-gold",
        id: currentCustomer?.id || currentCustomer?._id || "-",
        customerId: currentCustomer?.id || currentCustomer?._id || "-",
        customerType: "B2C",
        billNo: generatedBillNo || "-",
        invoiceNo: generatedBillNo || "-",
        phone,
        oldBalance: currentCustomer ? (parseFloat(currentCustomer.oldBalance) || 0).toFixed(3) : "0.000",
        advanceBalance: currentCustomer ? (parseFloat(currentCustomer.advanceBalance) || 0).toFixed(3) : "0.000",
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
      cashTable: cashTable,
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
        const cashPure = cashTable.reduce((sum, row) => sum + parseFloat(row.pure || 0), 0);
        const current = (ob - ab) + issue - receipt - cashPure;

        return {
          ob: ob.toFixed(3),
          ab: ab.toFixed(3),
          issue: issue.toFixed(3),
          receipt: receipt.toFixed(3),
          cash: cashPure.toFixed(3),
          cashAmount: cashTable.reduce((sum, row) => sum + parseFloat(row.rupees || 0), 0).toFixed(2),
          current: current.toFixed(3)
        };
      })()
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      {/* âœ… HEADER */}
      <CommonHeader
        title="B2C Cal Page"
        backgroundColor="#2E7D32"
        insideSafeArea
        left={
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Icon name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
        }
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            {route.params?.printAgain && route.params?.lastBill && (
              <TouchableOpacity
                onPress={() => navigation.navigate("BillPreview", route.params.lastBill)}
              >
                <Icon name="printer-refresh" color="#fff" size={28} />
              </TouchableOpacity>
            )}
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
        }
      />

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

              <View style={{ maxHeight: 200, marginBottom: 20 }}>
                {loadingCustomers ? (
                  <View style={{ paddingVertical: 12, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#2E7D32" />
                  </View>
                ) : (
                  <>
                    {!cartSearch && recentCustomers.length > 0 && (
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
                        {recentCustomers.map((cust, index) => (
                          <CustomerListItem
                            key={`recent-${cust.id || index}`}
                            item={cust}
                            onPress={selectCustomer}
                            highlight
                          />
                        ))}
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
                      filteredCartCustomers.map((cust, index) => (
                        <CustomerListItem
                          key={cust.id || index}
                          item={cust}
                          onPress={selectCustomer}
                          highlight={false}
                        />
                      ))
                    ) : !cartSearch && recentCustomers.length > 0 ? null : (
                      <Text style={styles.infoText}>No customers found</Text>
                    )}
                  </>
                )}
              </View>
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
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>Inv: {invoiceNo}</Text>
                    {selectedCust?.lastBillNo ? (
                      <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Last Inv: {selectedCust.lastBillNo}</Text>
                    ) : null}
                  </View>
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
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <View style={{ position: 'relative', marginRight: 15 }}>
                      <Icon name="cart" size={26} color="#000" />
                      {items.length > 0 && (
                        <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'red', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{items.length}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#2E7D32' }}>
                      W: {items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(3)}g
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000' }}>
                    Final Amount: â‚¹ {items.reduce((sum, item) => sum + (parseFloat(item.final || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

                            {/* ITEM NAME */}
              <View style={styles.itemAutocompleteWrap}>
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
              </View>
              {showItemDropdown &&
                Array.isArray(filteredItems) &&
                filteredItems.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      style={styles.dropdownScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator
                    >
                      {filteredItems.map((item, idx) => {
                        const entry = itemEntryItems.find(e => e.stockName === item.itemName);
                        const t = entry ? entry.percentage : parseFloat(item.pure || 0);
                        const r = parseFloat(rate || 0);
                        const wt = parseFloat(weight || 0);

                        let finalVal = 0;
                        if (wt > 0 && r > 0) {
                          const w = (wt * t) / 100;
                          const total = (wt + w) * r;
                          const gst = calcGST(total, gstPercentage, gstEnabled);
                          finalVal = total + gst;
                        }

                        return (
                          <View key={item.id || `${item.itemName}-${idx}`} style={styles.dropdownItem}>
                            <TouchableOpacity onPress={() => selectItem(item)} style={styles.dropdownItemMain}>
                              <Text style={styles.dropdownItemName}>{item.itemName}</Text>
                              <Text style={styles.dropdownItemMeta}>
                                Stock: {Number(item.weight || 0).toFixed(3)} g | Touch: {Number(t || 0).toFixed(2)}%
                              </Text>
                              {finalVal > 0 ? (
                                <Text style={styles.dropdownItemAmount}>Rs {finalVal.toFixed(2)}</Text>
                              ) : null}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleAddFromDropdown(item)}
                              style={styles.dropdownAddBtn}
                            >
                              <Icon name="plus" size={18} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>
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

                  <Text style={[styles.label, { marginTop: 12 }]}>GST Amount (â‚¹)</Text>
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
                              âŒ
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      {/* TOTAL WEIGHT ROW */}
                      <View style={[styles.tableRow, { marginTop: 10, borderTopWidth: 1, borderColor: '#ddd', paddingTop: 10 }]}>
                        <Text style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 16, color: '#000' }}>
                          Total Weight: {items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(3)} g
                        </Text>
                      </View>
                    </View>
                  </ScrollView>
                </>
              )}

              {/* ---------------- RECEIPT ENTRY SECTION ---------------- */}
              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.cardTitle}>Receipt Entry (Old Gold)</Text>
                  <View style={styles.cartContainer}>
                    <View style={{ position: "relative" }}>
                      <Icon name="cart" size={24} color="#000" />
                      {totalReceiptCartItems > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{totalReceiptCartItems}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cartText}>â‚¹{totalReceiptCartAmount.toFixed(2)}</Text>
                  </View>
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
                              <Text style={[styles.td, { color: "red" }]}>âŒ</Text>
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
                        Total Receipt Amount: â‚¹
                        {b2cReceiptItems
                          .reduce((acc, item) => acc + parseFloat(item.amount), 0)
                          .toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* ---------------- CASH RECEIVED SECTION ---------------- */}
              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={styles.issueHeader}>
                  <View style={styles.greenDot} />
                  <Text style={styles.sectionTitle}>Cash Received</Text>
                  <View style={styles.cartContainer}>
                    <Icon name="cash" size={22} color="#4CAF50" />
                    <Text style={styles.cartText}>
                      {cashTable.reduce((sum, c) => sum + Number(c.pure || 0), 0).toFixed(3)}g
                    </Text>
                    {cashTable.length > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{cashTable.length}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>Rupees</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={rupees}
                      onChangeText={(val) => {
                        setRupees(val);
                        setCashPureInput(computeCashPure(val, cashGoldRate || 0).toFixed(3));
                      }}
                      placeholder="0.00"
                    />
                  </View>

                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>Gold Rate</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={cashGoldRate}
                      onChangeText={(val) => {
                        setCashGoldRate(val);
                        setCashPureInput(computeCashPure(rupees || 0, val).toFixed(3));
                      }}
                      placeholder="Rate"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.inputBox}>
                    <Text style={styles.subLabel}>Pure</Text>
                    <View style={styles.purityBox}>
                      <Text style={styles.purityText}>{cashPureInput} g</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.addRowBtn} onPress={addCashEntry}>
                  <Text style={styles.addRowText}>+ Add Cash Entry</Text>
                </TouchableOpacity>

                {cashTable.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ gap: 5 }}>
                        <View style={styles.tableHeader}>
                          <Text style={styles.th}>Rupees</Text>
                          <Text style={styles.th}>FT Rate</Text>
                          <Text style={styles.th}>Pure</Text>
                          <Text style={styles.th}>X</Text>
                        </View>
                        {cashTable.map((row) => (
                          <View key={row.id} style={styles.tableRow}>
                            <Text style={styles.td}>{Number(row.rupees || 0).toFixed(2)}</Text>
                            <Text style={styles.td}>{Number(row.goldRate || 0).toFixed(2)}</Text>
                            <Text style={styles.td}>{Number(row.pure || 0).toFixed(3)}</Text>
                            <TouchableOpacity onPress={() => removeCashEntry(row.id)}>
                              <Text style={[styles.td, { color: "red" }]}>X</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    <View style={[styles.tableRow, { marginTop: 10, borderTopWidth: 1, borderColor: "#ddd", paddingTop: 10 }]}>
                      <Text style={{ flex: 1, textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
                        Total Cash Pure: {cashTable.reduce((sum, c) => sum + Number(c.pure || 0), 0).toFixed(3)} g
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.finalSubmitBtn,
                  (items.length === 0 && cashTable.length === 0 && b2cReceiptItems.length === 0) && { opacity: 0.5 },
                ]}
                disabled={items.length === 0 && cashTable.length === 0 && b2cReceiptItems.length === 0}
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
      {/* BOTTOM FLOATING CART INDICATOR */}
    </SafeAreaView >
  );
}


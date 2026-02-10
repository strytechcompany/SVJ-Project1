
import React, { useState, useEffect } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { base_url } from "./config";

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
  const [b2cCustomers, setB2cCustomers] = useState([]);

  // ---------------- CUSTOMER STATES ----------------
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomersByPhone, setFilteredCustomersByPhone] = useState([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // ---------------- ITEM INPUT STATES ----------------
  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [touch, setTouch] = useState("");
  const [wastage, setWastage] = useState("");
  const [rate, setRate] = useState("11500");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercentage, setGstPercentage] = useState("");
  const [gstAmount, setGstAmount] = useState("");

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

        // Calculate values
        const wt = parseFloat(estimate.weight) || 0;
        const touch = parseFloat(estimate.wastagePercent) || 0;
        const rate = parseFloat(estimate.goldRate) || 0;
        const wastage = (wt * touch) / 100;
        const total = (wt + wastage) * rate;
        const gst = total * 0.03;
        const final = total + gst;

        // Create item object
        const estimateItem = {
          itemName: estimate.itemName,
          weight: wt,
          touch: touch,
          wastage: wastage.toFixed(3),
          rate: estimate.goldRate,
          total: total,
          gst: gst,
          final: final,
          modifiedWeight: 0, // No stock deduction for estimate
          gstEnabled: true, // Assuming GST enabled for estimate
        };

        // Add to items array
        setItems([estimateItem]);

        // Populate input fields
        setItemName(estimate.itemName);
        setWeight(wt.toString());
        setTouch(touch.toString());
        setWastage(wastage.toFixed(3));
        setRate(estimate.goldRate.toString());

        // Show items section
        setShowItems(true);

        console.log("✅ Estimate item added to table:", estimateItem);
      }
    });
    return unsubscribe;
  }, [route.params?.estimate]);

  // ✅ Fetch B2C customers from API
  useEffect(() => {
    fetchB2CCustomers();
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
        amount: parseFloat(customer.advanceBalance || 0),
        advanceBalance: parseFloat(customer.advanceBalance || 0),
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
      const wmValue = ((wt * t)/100).toFixed(3);
      setWastage(wmValue);
    } else {
      setWastage("");
    }
  }, [weight, touch]);


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

      // 3️⃣ UPDATE LOCAL STATE
      const newItem = {
        itemName,
        weight: wt,
        touch: t,
        wastage: w,
        rate: r,
        total,
        gst,
        final,
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
      Alert.alert("Success", "Item added successfully!");
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
        customer.customerName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
      setPhone("");
      setAddress("");
    }
  };

  const selectCustomer = (customer) => {
    setCustomerName(customer.customerName);
    setPhone(customer.phone);
    setAddress(customer.address || "");
    setDate(new Date().toLocaleDateString("en-GB"));
    setShowDropdown(false);
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
        setDate(new Date().toLocaleDateString("en-GB"));
      }
    } else {
      setFilteredCustomersByPhone([]);
      setShowPhoneDropdown(false);
      setCustomerName("");
      setAddress("");
    }
  };

  const selectCustomerByPhone = (customer) => {
    setCustomerName(customer.customerName);
    setPhone(customer.phone);
    setAddress(customer.address || "");
    setDate(new Date().toLocaleDateString("en-GB"));
    setShowPhoneDropdown(false);
  };

  // ---------------- ITEM NAME HANDLING ----------------
  const handleItemNameChange = (text) => {
    setItemName(text);
    if (text) {
      const filtered = itemList.filter((item) =>
        item.itemName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowItemDropdown(true);
    } else {

      setFilteredItems(itemList);
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

    setTouch(touchValue);
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

      Alert.alert("Success", "Customer saved successfully");
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

    return {
      totalIssue: "0.000",
      totalIssuePure: "0.000",
      totalReceipt: totalReceipt.toFixed(3),
      totalReceiptPure: totalReceiptPure.toFixed(3),
      cash: items.reduce((sum, i) => sum + Number(i.final || 0), 0).toFixed(2),
      cashPure: totalReceiptPure.toFixed(3),
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

    // Update customer's advance balance
    try {
      const customer = b2cCustomers.find(c => c.customerName === customerName && c.phone === phone);
      if (customer) {
        const totalAmount = parseFloat(reportData.cash);
        const newAdvanceBalance = Math.max(0, customer.advanceBalance - totalAmount);

        const updateResponse = await fetch(`${base_url}/customersB2C/${customer.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            advanceBalance: newAdvanceBalance.toFixed(3),
          }),
        });

        if (!updateResponse.ok) {
          console.error("Failed to update customer advance balance");
        } else {
          console.log("✅ Customer advance balance updated successfully");
        }
      }
    } catch (error) {
      console.error("Error updating customer advance balance:", error);
    }

    navigation.navigate("BillPreview", {
      customer: {
        name: customerName,
        shop: "Easy-gold",
        id: invoiceNo || "-",
        phone,
        balance: "0.000",
        type: transactionType, // 👈 dynamic
        email: "-",
        advance: "0.000",
        date: date,
      },
      report: reportData,
      transactions: transactionData,
      items: items, // Pass items for B2C bill preview
      gst: gstEnabled ? {
        enabled: gstEnabled,
        percentage: gstPercentage,
        amount: gstAmount,
      } : null,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      {/* ✅ HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={26} color="#fff" style={{ top: 20 }} />
        </TouchableOpacity>
        <Text style={styles.appHeaderTitle}>B2C Cal Page</Text>
        <View style={{ width: 30 }} />
        <TouchableOpacity
          style={{ position: "absolute", right: 20, top: "58%" }}
          onPress={() =>
            navigation.navigate("CreateCustomerMaster", { type: "B2C",customers: b2cCustomers })
          }
        >
          <Feather name="user-plus" color="#000" size={25} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 160 }}
          style={styles.container}
        >
          {/* ---------------- CUSTOMER DETAILS ---------------- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer Details</Text>

            <Text style={styles.label}>Customer Name</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputWithButton}
                placeholder="Search customers..."
                value={customerName}
                onChangeText={handleCustomerNameChange}
              />
              <TouchableOpacity
                style={styles.plusButton}
                onPress={() => navigation.navigate("CreateCustomerMaster", { type: "B2C" })}
              >
                <Icon name="plus" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {showDropdown && filteredCustomers.length > 0 && (
              <View style={styles.dropdown}>
                {filteredCustomers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.dropdownItem}
                    onPress={() => selectCustomer(customer)}
                  >
                    <Text>
                      {customer.customerName} - {customer.phone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />

            {showPhoneDropdown && filteredCustomersByPhone.length > 0 && (
              <View style={styles.dropdown}>
                {filteredCustomersByPhone.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.dropdownItem}
                    onPress={() => selectCustomerByPhone(customer)}
                  >
                    <Text>
                      {customer.phone} - {customer.customerName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.rowBetween}>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="DD/MM/YYYY"
                />
              </View>

              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Invoice No</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceNo}
                  onChangeText={setInvoiceNo}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCustomerSubmit}
            >
              <Text style={styles.submitText}>SUBMIT CUSTOMER</Text>
            </TouchableOpacity>
          </View>

          {/* ---------------- ITEM SECTION ---------------- */}
          {showItems && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Item</Text>

              {/* ITEM NAME */}
              <Text style={styles.label}>Item</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                value={itemName}
                onChangeText={handleItemNameChange}
                onFocus={() => {
                  // Show all items when focused
                  if (itemList.length > 0) {
                    setFilteredItems(itemList);
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

              {/* GST CHECKBOX */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setGstEnabled(!gstEnabled)}
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
                  <Text style={styles.label}>GST Percentage (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={gstPercentage}
                    onChangeText={setGstPercentage}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                  />

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
                          <Text style={styles.td}>{row.itemName}</Text>
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

              {/* SUBMIT BUTTON */}
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
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  appHeader: {
    height: 100,
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  appHeaderTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    top: 20,
  },

  container: { flex: 1, backgroundColor: "#F5F7FA", padding: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 13, color: "#555", marginBottom: 4 },

  input: {
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between" },

  submitBtn: {
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  tableHeader: { flexDirection: "row", backgroundColor: "#EEF2F6" },
  th: { width: 90, textAlign: "center", fontWeight: "700", padding: 6 },

  tableRow: { flexDirection: "row" },
  td: { width: 90, padding: 8, textAlign: "center" },

  addRowBtn: {
    backgroundColor: "#135F25",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  addRowText: { color: "#fff", fontWeight: "700" },

  finalSubmitBtn: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  finalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 3,
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  weightInputContainer: {
    marginBottom: 12,
  },

  weightInput: {
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
  },

  modifiedWeightText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  inputWithButton: {
    flex: 1,
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
  },

  plusButton: {
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxContainer: {
    marginBottom: 12,
  },

  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkboxLabel: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
});

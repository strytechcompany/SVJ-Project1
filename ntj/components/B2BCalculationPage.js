import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";

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

  // Basic inputs
  const [weight, setWeight] = useState("");
  const [stone, setStone] = useState("");
  const [touch, setTouch] = useState("");
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptStone, setReceiptStone] = useState("");
  const [receiptTouch, setReceiptTouch] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));

  const [itemsStock, setItemsStock] = useState({});

  // Save stock to AsyncStorage whenever itemsStock changes
  useEffect(() => {
    saveStock();
  }, [itemsStock]);

  // Search
  const [search, setSearch] = useState("");
  const [cartSearch, setCartSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Handle customer name change for searchable dropdown
  const handleCustomerNameChange = (text) => {
    setSearch(text);
    if (text) {
      const filtered = customers.filter(
        (customer) =>
          customer.name &&
          customer.name.toLowerCase().includes(text.toLowerCase())
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

  // Issue / Receipt state arrays
  const [issueItems, setIssueItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);

  // Combined product table will be derived from these arrays
  // Cash table
  const [cashTable, setCashTable] = useState([]);
  const [rupees, setRupees] = useState("");
  const [goldRate, setGoldRate] = useState("");
  const [cashPureInput, setCashPureInput] = useState("0.000");

  const [itemsList, setItemsList] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIssueItem, setSelectedIssueItem] = useState(null);
  const [issueItemDropdownOpen, setIssueItemDropdownOpen] = useState(false);
  const [customIssueItem, setCustomIssueItem] = useState("");
  const [selectedReceiptItem, setSelectedReceiptItem] = useState(null);
  const [receiptItemDropdownOpen, setReceiptItemDropdownOpen] = useState(false);
  const [customReceiptItem, setCustomReceiptItem] = useState("");

  // Search states for dropdowns
  const [issueItemSearch, setIssueItemSearch] = useState("");
  const [receiptItemSearch, setReceiptItemSearch] = useState("");

  // Manual details
  const [issueDetails, setIssueDetails] = useState("");

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [phone, setPhone] = useState("");

  const filteredCartCustomers = customers.filter(
    (c) => c.name && c.name.toLowerCase().includes(cartSearch.toLowerCase())
  );

  // Fetch customers from DB on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const response = await fetch(`${base_url}/customers`);


        if (!response.ok) {
          throw new Error("Failed to fetch customers");
        }

        const data = await response.json();

        console.log("Fetched customers:", data);

        const mappedCustomers = data
          .filter((customer) => customer.customerName)
          .map((customer) => ({
            name: customer.customerName,
            ob: customer.oldBalance || 0,
            ab: customer.advanceBalance || 0,
            company: customer.shopName || "",
            phone: customer.phoneNumber || "",
            email: customer.emailId || "",
            id: customer._id,
          }));

        console.log("Mapped customers:", mappedCustomers);
        setCustomers(mappedCustomers);
      } catch (error) {
        console.error("Error fetching customers:", error);
        Alert.alert("Error", "Failed to load customers from database");
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch items from stock master on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const response = await fetch(`${base_url}/stockMaster`);

        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }

        const data = await response.json();

        console.log("Fetched items:", data);

        const itemsList = data.map((item) => ({ itemName: item.itemName, weight: item.quantity || 0 })).filter(item => item.itemName);

        console.log("Items list:", itemsList);
        setItemsList(itemsList);

        const stockObj = {};
        data.forEach((item) => {
          if (item.itemName) {
            stockObj[item.itemName] = item.quantity || 0;
          }
        });
        setItemsStock(stockObj);
      } catch (error) {
        console.error("Error fetching items:", error);
        Alert.alert("Error", "Failed to load items from stock master");
        setItemsList([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, []);

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
    }, [route.params?.newCustomer, navigation])
  );

  // -----------------------
  // Utilities & Calculators
  // -----------------------
  const parseNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // Pure calculation used for Issue/Receipt rows
  const calcPure = (w, s, t) => {
    const W = parseNum(w);
    const S = parseNum(s);
    const T = parseNum(t);
    const net = Math.max(0, W - S);
    const pure = net * (T / 100);
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
        "Please enter a valid weight greater than 0"
      );
      return;
    }

    const purity = calcPure(weight, stone, touch);

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

      // Update stock (allow negative)
      setItemsStock((prev) => ({
        ...prev,
        [selectedIssueItem]: Number(
          ((prev[selectedIssueItem] || 0) - issueWeight).toFixed(3)
        ),
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
      setStone("");
      setTouch("");
      setIssueDetails("");
      setSelectedIssueItem(null);

      Alert.alert("Success", "Issue entry saved to database successfully!");
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
        "Please enter a valid weight greater than 0"
      );
      return;
    }

    const purity = calcPure(receiptWeight, receiptStone, receiptTouch);

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

      // ➕ Increase item stock
      setItemsStock((prev) => ({
        ...prev,
        [selectedReceiptItem]: Number(
          ((prev[selectedReceiptItem] || 0) + receiptW).toFixed(3)
        ),
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
      setReceiptStone("");
      setReceiptTouch("");
      setSelectedReceiptItem(null);

      Alert.alert("Success", "Receipt entry saved to database successfully!");
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
        "Please enter a valid gold rate greater than 0"
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
      setGoldRate("");
      setCashPureInput("0.000");

      Alert.alert("Success", "Cash entry saved to database successfully!");
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
        [itemToRemove.item]: Number(
          (prev[itemToRemove.item] + itemToRemove.weight).toFixed(3)
        ),
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
        [itemToRemove.item]: Number(
          (prev[itemToRemove.item] - itemToRemove.weight).toFixed(3)
        ),
      }));
    }
    setReceiptItems((prev) => prev.filter((p) => p.id !== id));
  };

  const removeCashEntry = (id) => {
    setCashTable((prev) => prev.filter((p) => p.id !== id));
  };

  // -----------------------
  // Totals & Summary
  // -----------------------
  const totalIssuePure = issueItems.reduce(
    (acc, it) => acc + Number(it.purity || 0),
    0
  );
  const totalIssueWeight = issueItems.reduce(
    (acc, it) => acc + Number(it.weight || 0),
    0
  );

  const totalReceiptPure = receiptItems.reduce(
    (acc, it) => acc + Number(it.purity || 0),
    0
  );
  const totalReceiptWeight = receiptItems.reduce(
    (acc, it) => acc + Number(it.weight || 0),
    0
  );

  const totalCashPure = cashTable.reduce(
    (acc, it) => acc + Number(it.pure || 0),
    0
  );

  const oldBalance = selectedCustomer
    ? Number(parseNum(selectedCustomer.ob))
    : 0;

  // Change this line:
  const advBalance = selectedCustomer
    ? Number(parseNum(selectedCustomer.ab))
    : 0;

  const balance = Number(
    (oldBalance + totalReceiptPure + totalCashPure - totalIssuePure).toFixed(3)
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
      0
    );
    const totalIssuePure = issueItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0
    );
    const totalReceipt = receiptItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0
    );
    const totalReceiptPure = receiptItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0
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

    const transactionData = {
      issueTotal: Number(totalIssueWeight.toFixed(3)),
      issuePure: Number(totalIssuePure.toFixed(3)),
      oldBalance: Number(oldBalance.toFixed(3)),
      receiptPure: Number(totalReceiptPure.toFixed(3)),
      cashPure: Number(totalCashPure.toFixed(3)),
      balance: Number(balance.toFixed(3)),
      advBal: Number(advBalance.toFixed(3)),
    };

    console.log("📤 Transaction data to send:", transactionData);
    console.log("🌐 URL:", `${base_url}/transactions`);

    try {
      const response = await fetch(`${base_url}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      console.log("📥 Response status:", response.status);

      const responseText = await response.text();
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedTransaction = JSON.parse(responseText);
      console.log("✅ Transaction saved successfully:", savedTransaction);

      // Navigate to BillPreview after successful save
      navigation.navigate("BillPreview", {
  customer: {
    name: selectedCustomer.name,
    phone: selectedCustomer.phone || "",
    shop: selectedCustomer.company || "",
    id: selectedCustomer.id || "",
    balance: selectedCustomer.ob,
    advance: selectedCustomer.ab,
    type: "B2B",
    email: selectedCustomer.email || "",
  },

  issueItems,
  receiptItems,
  cashTable,
  report: calculateReport(),

  meta: {
    date,
    oldBalance,
    currentBalance: balance,
  }
});


      Alert.alert("Success", "Transaction saved successfully!");
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
      style={styles.container}
      nestedScrollEnabled={true}
      contentContainerStyle={{ paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Transaction</Text>
        <TouchableOpacity
          style={{ position: "absolute", right: 20, top: "50%" }}
          onPress={() =>
            navigation.navigate("CreateCustomerMaster", { type: "B2B" })
          }
        >
          <Feather name="user-plus" color="#000" size={30} />
        </TouchableOpacity>
      </View>


      {/* CUSTOMER CART */}
      {!selectedCustomer && !loadingCustomers && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="account-group" size={24} />
            <Text style={styles.sectionTitle}>All Customers</Text>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search customers..."
              style={styles.searchBox}
              value={cartSearch}
              onChangeText={setCartSearch}
            />
          </View>

          <ScrollView style={{ maxHeight: 200 }}>
            {filteredCartCustomers.length > 0 ? (
              filteredCartCustomers.map((cust, index) => (
                <TouchableOpacity
                  key={cust.id || index}
                  onPress={() => setSelectedCustomer(cust)}
                  style={styles.listItem}
                >
                  <Text style={styles.listItemText}>
                    {cust.name} - OB {cust.ob}g
                  </Text>
                </TouchableOpacity>
              ))
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
            <Icon name="account-circle" size={24} />
            <Text style={styles.sectionTitle}>Customer Info</Text>
          </View>

          <View style={styles.customerInfoRow}>
            <View style={styles.customerDetails}>
              <Text style={styles.infoText}>{selectedCustomer.name}</Text>
              <Text style={styles.infoText}>
                Company: {selectedCustomer.company}
              </Text>
              <Text style={styles.infoText}>Phone: {selectedCustomer.phone}</Text>
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
              <Icon name="cart" size={24} color="#000" />
              {issueItems.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{issueItems.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* SEARCH BOX */}
          <TextInput
            placeholder="Search items..."
            style={styles.searchBox}
            value={issueItemSearch}
            onChangeText={(text) => {
              setIssueItemSearch(text);
              setIssueItemDropdownOpen(text.length > 0);
            }}
          />

          {issueItemDropdownOpen && !loadingItems && (
            <View style={styles.cardTiny}>
              {itemsList.length > 0 ? (
                itemsList
                  .filter((it) =>
                    it.itemName.toLowerCase().includes(issueItemSearch.toLowerCase())
                  )
                  .map((it, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.listItem}
                      onPress={() => {
                        setSelectedIssueItem(it.itemName);
                        setIssueItemDropdownOpen(false);
                        setIssueItemSearch(it.itemName);
                      }}
                    >
                      <Text style={styles.listItemText}>{it.itemName} - {it.weight}g</Text>
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
                  {fmt(calcPure(weight || 0, stone || 0, touch || 0))} g
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
              <Icon name="cart" size={24} color="#000" />
              {receiptItems.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{receiptItems.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* SEARCH BOX */}
          <TextInput
            placeholder="Search items..."
            style={styles.searchBox}
            value={receiptItemSearch}
            onChangeText={(text) => {
              setReceiptItemSearch(text);
              setReceiptItemDropdownOpen(text.length > 0);
            }}
          />

          {receiptItemDropdownOpen && !loadingItems && (
            <View style={styles.cardTiny}>
              {itemsList.length > 0 ? (
                itemsList
                  .filter((it) =>
                    it.itemName.toLowerCase().includes(receiptItemSearch.toLowerCase())
                  )
                  .map((it, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.listItem}
                      onPress={() => {
                        setSelectedReceiptItem(it.itemName);
                        setReceiptItemDropdownOpen(false);
                        setReceiptItemSearch(it.itemName);
                      }}
                    >
                      <Text style={styles.listItemText}>{it.itemName} - {it.weight}g</Text>
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
                    calcPure(
                      receiptWeight || 0,
                      receiptStone || 0,
                      receiptTouch || 0
                    )
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
                <Text style={styles.productHeaderCell}>Stone (g)</Text>
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
                <Text style={styles.productHeaderCell}>Stone (g)</Text>
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
          <Text style={styles.sectionTitle}>Cash Received</Text>

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

          <Text style={[styles.subLabel, { marginTop: 12 }]}>Gold Rate ₹</Text>
          <TextInput
            style={styles.input}
            value={goldRate}
            onChangeText={(val) => {
              setGoldRate(val);
              setCashPureInput(fmt(computeCashPure(rupees || 0, val)));
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
            <Text style={styles.secondTableHeaderText}>Gold Rate</Text>
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

      {/* TRANSACTION SUMMARY (HORIZONTAL SCROLL) */}
      {selectedCustomer && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>

          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryHeaderText}>Issue Total (g)</Text>
                <Text style={styles.summaryHeaderText}>Issue Pure (g)</Text>
                <Text style={styles.summaryHeaderText}>Old Balance (g)</Text>
                <Text style={styles.summaryHeaderText}>Receipt Pure (g)</Text>
                <Text style={styles.summaryHeaderText}>Cash Pure (g)</Text>
                <Text style={styles.summaryHeaderText}>Balance (g)</Text>
                <Text style={styles.summaryHeaderText}>Adv.Bal (g)</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryCell}>{fmt(totalIssueWeight)}</Text>
                <Text style={styles.summaryCell}>{fmt(totalIssuePure)}</Text>
                <Text style={styles.summaryCell}>{fmt(oldBalance)}</Text>
                <Text style={styles.summaryCell}>{fmt(totalReceiptPure)}</Text>
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
    </ScrollView>
  );
}

// -------------------------- STYLES ----------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: 40,
    paddingHorizontal: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },

  dropdownCard: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },

  dropdownCardSmall: {
    backgroundColor: "#fff",
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },

  dropdownText: {
    marginLeft: 10,
    fontSize: 16,
  },

  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 16,
    borderRadius: 18,
    elevation: 2,
  },

  cardTiny: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    padding: 8,
    borderRadius: 10,
    elevation: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },

  greenDot: {
    width: 12,
    height: 12,
    backgroundColor: "green",
    borderRadius: 6,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },

  infoText: {
    fontSize: 17,
    marginVertical: 2,
  },

  label: {
    marginTop: 10,
    fontSize: 15,
    color: "#555",
  },

  subLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#555",
  },

  greenValue: {
    fontSize: 20,
    color: "green",
    fontWeight: "700",
  },

  blackValue: {
    fontSize: 20,
    fontWeight: "700",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  inputBox: {
    width: "48%",
  },

  input: {
    backgroundColor: "#F4F4F4",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },

  purityBox: {
    backgroundColor: "#F4F4F4",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
  },

  purityText: {
    fontSize: 16,
    fontWeight: "600",
  },

  addBtn: {
    backgroundColor: "#C9F8D0",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },

  addBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#135F25",
  },

  addBtn2: {
    backgroundColor: "#13A857",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },

  addBtnText2: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  searchBox: {
    backgroundColor: "#F4F4F4",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },

  searchBtn: {
    backgroundColor: "#13A857",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  listItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.3,
    borderColor: "#ccc",
  },

  listItemText: {
    fontSize: 17,
  },

  secondTableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFF0B3",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  secondTableHeaderText: {
    width: "25%",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 14,
    color: "#333",
  },

  secondTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E5E5",
  },

  secondTableCell: {
    width: "25%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },

  actionText: {
    fontSize: 14,
    fontWeight: "700",
  },

  /* Product table (horizontal) */
  productTable: {
    width: 1100, // wide width to allow horizontal scroll
  },

  productTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f1f1",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },

  productHeaderCell: {
    width: 140,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },

  productTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  productCell: {
    width: 140,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Summary table (horizontal) */
  summaryContainer: {
    width: 1000, // must be > screen width
  },

  summaryHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FFF7D1",
    paddingVertical: 12,
    borderRadius: 8,
  },

  summaryHeaderText: {
    width: 140,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
  },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#FFF8E6",
    paddingVertical: 12,
    borderRadius: 6,
  },

  summaryCell: {
    width: 140,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 3,
    marginTop: 5,
    maxHeight: 200,
  },

  customerInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerDetails: {
    flex: 1,
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  cartContainer: {
    position: "relative",
    marginLeft: "auto",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF5722",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
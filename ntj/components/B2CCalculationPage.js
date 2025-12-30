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

export default function CreateTransaction({ navigation }) {


  // ---------------- CUSTOMER DATA FROM B2C TRANSACTIONS ----------------
  const b2cCustomers = [
    { id: "1", customerName: "Ravi Kumar", phone: "9876543210", amount: 4500 },
    { id: "2", customerName: "Priya Sharma", phone: "9876543211", amount: 11200 },
    { id: "3", customerName: "Mohammed Ali", phone: "9876543212", amount: 7850 },
    { id: "4", customerName: "Anitha Rao", phone: "9876543213", amount: 16300 },
  ];

  // ---------------- CUSTOMER STATES ----------------
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomersByPhone, setFilteredCustomersByPhone] = useState([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);

  const [showItems, setShowItems] = useState(false);

  // ---------------- ITEM INPUT STATES ----------------
  // const [itemName, setItemName] = useState("");
  // const [weight, setWeight] = useState("");
  // const [wastage, setWastage] = useState("");
  // const [touch, setTouch] = useState("");
  // const [rate, setRate] = useState("");

  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [touch, setTouch] = useState("");
  const [wastage, setWastage] = useState("");
  const [rate, setRate] = useState("");


  const [items, setItems] = useState([]);

  useEffect(() => {
    console.log("🟢 ITEMS STATE:", items);
  }, [items]);


  // ---------------- ITEM LIST STATES ----------------
  const [itemList, setItemList] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItemNetWeight, setSelectedItemNetWeight] = useState("");

  // ---------------- LOAD STOCK MASTER ----------------
  useEffect(() => {
    if (showItems) {
      const loadStock = async () => {
        const data = await AsyncStorage.getItem("STOCK_MASTER");
        if (data) {
          setItemList(JSON.parse(data));
        } else {
          // Default stock if not set
          const defaultStock = [
            { id: "1", itemName: "Ring", netWeight: 50.000 },
            { id: "2", itemName: "Chain", netWeight: 100.000 },
            { id: "3", itemName: "Bangle", netWeight: 80.000 },
            { id: "4", itemName: "Ear Stud", netWeight: 40.000 },
            { id: "5", itemName: "Bracelet", netWeight: 30.000 },
            { id: "6", itemName: "Pendant", netWeight: 20.000 },
          ];
          setItemList(defaultStock);
          await AsyncStorage.setItem("STOCK_MASTER", JSON.stringify(defaultStock));
        }
      };
      loadStock();
    }
  }, [showItems]);

  // ---------------- CALCULATIONS ----------------
  const num = (v) => Number(v || 0);
  const getActualWeight = () => {
    const netWeight = num(selectedItemNetWeight);
    const subtractValue = num(weight);
    return netWeight - subtractValue;
  };
  const calcTotal = () => getActualWeight() * num(rate);
  const calcGST = () => calcTotal() * 0.03;
  const calcFinal = () => calcTotal() + calcGST();

  // ---------------- ADD ITEM ----------------

  const addRow = async () => {
    if (!itemName || !weight || !rate) {
      Alert.alert("Required", "Enter Item, Weight & Rate");
      return;
    }

    const wt = Number(weight);       // ✅ DIRECT WEIGHT
    const t = Number(touch || 0);
    const r = Number(rate);

    const total = wt * r;
    const gst = total * 0.03;
    const final = total + gst;

    // Check stock availability
    const selectedItem = itemList.find(item => item.itemName === itemName);
    if (!selectedItem || selectedItem.netWeight < wt) {
      Alert.alert("Insufficient Stock", `Available: ${selectedItem ? selectedItem.netWeight.toFixed(3) : 0} g`);
      return;
    }

    const newItem = {
      itemName,
      weight: wt,        // ✅ THIS WAS THE BUG
      touch: t,
      rate: r,
      total,
      gst,
      final,
    };

    console.log("ADDED ITEM 👉", newItem); // 🔍 DEBUG

    setItems((prev) => [...prev, newItem]);

    // Update stock: decrease for selling (B2C)
    const updatedStock = itemList.map(item =>
      item.itemName === itemName
        ? { ...item, netWeight: Number((item.netWeight - wt).toFixed(3)) }
        : item
    );
    setItemList(updatedStock);
    await AsyncStorage.setItem("STOCK_MASTER", JSON.stringify(updatedStock));

    setItemName("");
    setWeight("");
    setTouch("");
    setWastage("");
    setRate("");
  };






  const deleteRow = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // ---------------- CUSTOMER NAME HANDLING ----------------
  const handleCustomerNameChange = (text) => {
    setCustomerName(text);
    if (text) {
      const filtered = b2cCustomers.filter(customer =>
        customer.customerName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
      setPhone("");
    }
  };

  const selectCustomer = (customer) => {
    setCustomerName(customer.customerName);
    setPhone(customer.phone);
    setDate(new Date().toLocaleDateString('en-GB'));
    setShowDropdown(false);
  };

  // ---------------- PHONE HANDLING ----------------
  const handlePhoneChange = (text) => {
    setPhone(text);
    if (text) {
      const filtered = b2cCustomers.filter(customer =>
        customer.phone.startsWith(text)
      );
      setFilteredCustomersByPhone(filtered);
      setShowPhoneDropdown(true);
      const customer = b2cCustomers.find(customer => customer.phone === text);
      if (customer) {
        setCustomerName(customer.customerName);
        setDate(new Date().toLocaleDateString('en-GB'));
      }
    } else {
      setFilteredCustomersByPhone([]);
      setShowPhoneDropdown(false);
      setCustomerName("");
    }
  };

  const selectCustomerByPhone = (customer) => {
    setCustomerName(customer.customerName);
    setPhone(customer.phone);
    setDate(new Date().toLocaleDateString('en-GB'));
    setShowPhoneDropdown(false);
  };

  // ---------------- ITEM NAME HANDLING ----------------
  const handleItemNameChange = (text) => {
    setItemName(text);
    if (text) {
      const filtered = itemList.filter(item =>
        item.itemName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowItemDropdown(true);
    } else {
      setFilteredItems([]);
      setShowItemDropdown(false);
      setSelectedItemNetWeight("");
    }
  };

  const selectItem = (item) => {
    setItemName(item.itemName);
    setSelectedItemNetWeight(item.netWeight);
    setWeight(""); // User will enter the value to subtract
    setShowItemDropdown(false);
  };

  // ---------------- CUSTOMER SUBMIT ----------------
  const handleCustomerSubmit = () => {
    if (!customerName || !phone) {
      Alert.alert("Required", "Enter Customer Name & Phone");
      return;
    }
    setShowItems(true);
  };


  const calculateReport = () => {
    let totalReceipt = 0;
    let totalReceiptPure = 0;

    items.forEach((item) => {
      totalReceipt += Number(item.weight || 0);

      // Example pure calculation (touch based)
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
  const handleFinalSubmit = () => {
    if (items.length === 0) {
      Alert.alert("Error", "No items added");
      return;
    }

    const reportData = calculateReport();
    const transactionData = formatTransactions();

    console.log("FINAL ITEMS 👉", items);
    console.log("FINAL REPORT 👉", reportData);
    console.log("FINAL TXNS 👉", transactionData);

    navigation.navigate("BillPreview", {
      customer: {
        name: customerName,
        shop: "Easy-gold",
        id: invoiceNo || "-",
        phone,
        balance: "0.000",
        type: "B2C",
        email: "-",
        advance: "0.000",
      },
      report: reportData,
      transactions: transactionData,
    });
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      {/* ✅ HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#fff" style={{ top: 20 }} />
        </TouchableOpacity>
        <Text style={styles.appHeaderTitle}>B2C cal Page</Text>
        <View style={{ width: 30 }} />
        <TouchableOpacity
          style={{ position: "absolute", right: 20, top: "58%" }}
          onPress={() => navigation.navigate("CreateCustomerMaster", { type: "B2C" })}
        >
          <Feather name="user-plus" color="#000" size={25} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }} style={styles.container}>

          {/* ---------------- CUSTOMER DETAILS ---------------- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer Details</Text>

            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Search customers..."
              value={customerName}
              onChangeText={handleCustomerNameChange}
            />

            {showDropdown && filteredCustomers.length > 0 && (
              <View style={styles.dropdown}>
                {filteredCustomers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.dropdownItem}
                    onPress={() => selectCustomer(customer)}
                  >
                    <Text>{customer.customerName} - {customer.phone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" />

            {showPhoneDropdown && filteredCustomersByPhone.length > 0 && (
              <View style={styles.dropdown}>
                {filteredCustomersByPhone.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.dropdownItem}
                    onPress={() => selectCustomerByPhone(customer)}
                  >
                    <Text>{customer.phone} - {customer.customerName}</Text>
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
                <TextInput style={styles.input} value={invoiceNo} onChangeText={setInvoiceNo} />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCustomerSubmit}>
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
              />

              {showItemDropdown && filteredItems.length > 0 && (
                <View style={styles.dropdown}>
                  {filteredItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => selectItem(item)}
                    >
                      <Text>{item.itemName} - {item.netWeight}g</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* WEIGHT */}
              <Text style={styles.label}>Weight (g)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />

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
                onChangeText={setWastage}
                keyboardType="decimal-pad"
              />

              {/* RATE */}
              <Text style={styles.label}>Rate</Text>
              <TextInput
                style={styles.input}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
              />

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
                        {["Item", "Wt", "Touch", "Rate", "Total", "GST", "Final", "X"].map(
                          (h, i) => (
                            <Text key={i} style={styles.th}>{h}</Text>
                          )
                        )}
                      </View>

                      {/* TABLE ROWS */}
                      {items.map((row, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={styles.td}>{row.itemName}</Text>
                          <Text style={styles.td}>{row.weight}</Text>
                          <Text style={styles.td}>{row.touch}</Text>
                          <Text style={styles.td}>{row.rate}</Text>
                          <Text style={styles.td}>{row.total.toFixed(2)}</Text>
                          <Text style={styles.td}>{row.gst.toFixed(2)}</Text>
                          <Text style={styles.td}>{row.final.toFixed(2)}</Text>

                          <TouchableOpacity onPress={() => deleteRow(index)}>
                            <Text style={[styles.td, { color: "red" }]}>❌</Text>
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
                  items.length === 0 && { opacity: 0.5 }
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

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3 },

  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 13, color: "#555", marginBottom: 4 },

  input: { backgroundColor: "#F1F3F6", borderRadius: 10, padding: 12, marginBottom: 12 },

  rowBetween: { flexDirection: "row", justifyContent: "space-between" },

  submitBtn: { backgroundColor: "#2E7D32", padding: 14, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  tableHeader: { flexDirection: "row", backgroundColor: "#EEF2F6" },
  th: { width: 90, textAlign: "center", fontWeight: "700", padding: 6 },

  tableRow: { flexDirection: "row" },
  td: { width: 90, padding: 8, textAlign: "center" },

  addRowBtn: { backgroundColor: "#135F25", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 14 },
  addRowText: { color: "#fff", fontWeight: "700" },

  finalSubmitBtn: { backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  finalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  dropdown: { backgroundColor: "#fff", borderRadius: 10, elevation: 3, maxHeight: 150 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
});

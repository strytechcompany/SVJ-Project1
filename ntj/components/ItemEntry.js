import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "./config";

const STORAGE_KEY = "ITEM_LIST";

export default function ItemsEntry({ navigation }) {
  // -------- Stock Inputs --------
  const [itemName, setItemName] = useState("");
  const [less, setLess] = useState("");
  const [percentage, setPercentage] = useState("");

  // -------- Cash Section --------
  const [cash, setCash] = useState("");
  const [cashPercentage, setCashPercentage] = useState("");

  // -------- Meta --------
  const [selectedDate, setSelectedDate] = useState("");
  const [items, setItems] = useState([]);

  // 🔍 Search
  const [search, setSearch] = useState("");

  // UI Saved Message
  const [savedMessage, setSavedMessage] = useState("");

  const today = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  useEffect(() => {
    setSelectedDate(today);
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setItems(JSON.parse(data));
    } catch (error) {
      console.error("Error loading items:", error);
    }
  };

  const handleSubmit = async () => {
    if (!itemName || !less || !percentage || !cash || !cashPercentage) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    const localId = Date.now().toString();

    const newItem = {
      id: localId,
      itemName,
      buyingTouch: parseFloat(less),
      sellingTouch: parseFloat(percentage),
      cash: parseFloat(cash),
      cashPercentage: parseFloat(cashPercentage),
      date: selectedDate,
      status: "saving",
    };

    // ---- Instantly show item in UI ----
    const updatedList = [...items, newItem];
    setItems(updatedList);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    setSavedMessage("Saved successfully!");
    setTimeout(() => setSavedMessage(""), 3000);

    // Clear form
    setItemName("");
    setLess("");
    setPercentage("");
    setCash("");
    setCashPercentage("");

    // ---- API save ----
    try {
      const response = await fetch(`${base_url}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        updateStatus(localId, "error");
        return;
      }

      if (response.ok) updateStatus(localId, "saved");
      else updateStatus(localId, "error");
    } catch (err) {
      updateStatus(localId, "error");
    }
  };

  const updateStatus = async (id, newStatus) => {
    const updated = items.map((it) =>
      it.id === id ? { ...it, status: newStatus } : it
    );
    setItems(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // -------- Recent 10 Transactions --------
  const recentTransactions = items.slice(-10).reverse();

  // 🔍 Filtered transactions
  const filteredTransactions = recentTransactions.filter(
    (item) =>
      item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      item.date?.includes(search)
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Item Entry</Text>
        </View>

        {savedMessage !== "" && (
          <View style={styles.savedMsgBox}>
            <Text style={styles.savedMsg}>{savedMessage}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.formContainer}>
          {/* -------- STOCK DETAILS -------- */}
          <Text style={styles.sectionTitle}>Stock Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Stock Name"
            value={itemName}
            onChangeText={setItemName}
          />

          <TextInput
            style={styles.input}
            placeholder="Buying Touch %"
            keyboardType="numeric"
            value={less}
            onChangeText={setLess}
          />

          <TextInput
            style={styles.input}
            placeholder="Selling Touch %"
            keyboardType="numeric"
            value={percentage}
            onChangeText={setPercentage}
          />

          {/* -------- CASH SECTION -------- */}
          <Text style={styles.sectionTitle}>Cash</Text>

          <TextInput
            style={styles.input}
            placeholder="Cash"
            keyboardType="numeric"
            value={cash}
            onChangeText={setCash}
          />

          <TextInput
            style={styles.input}
            placeholder="Percentage"
            keyboardType="numeric"
            value={cashPercentage}
            onChangeText={setCashPercentage}
          />

          {/* -------- SUBMIT -------- */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Save</Text>
          </TouchableOpacity>

          {/* -------- RECENT TRANSACTIONS -------- */}
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search by stock name or date"
            value={search}
            onChangeText={setSearch}
          />

          {filteredTransactions.length === 0 ? (
            <Text style={styles.noData}>No transactions found</Text>
          ) : (
            filteredTransactions.map((item, index) => (
              <View key={index} style={styles.transactionCard}>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between" }}
                >
                  <Text style={styles.txName}>{item.itemName}</Text>

                  {item.status === "saving" && (
                    <Icon name="loading" size={20} color="#FF9800" />
                  )}
                  {item.status === "saved" && (
                    <Icon name="check-circle" size={20} color="#2E7D32" />
                  )}
                  {item.status === "error" && (
                    <Icon name="alert-circle" size={20} color="red" />
                  )}
                </View>

                <Text>Buying Touch: {item.buyingTouch}%</Text>
                <Text>Selling Touch: {item.sellingTouch}%</Text>

                <Text style={styles.txDate}>{item.date}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6F8" },
  header: {
    height: 110,
    backgroundColor: "#2E7D32",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 12,
  },
  savedMsgBox: {
    backgroundColor: "#C8E6C9",
    padding: 10,
    alignItems: "center",
  },
  savedMsg: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  formContainer: { padding: 20 },
  sectionTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#2E7D32",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    backgroundColor: "#fff",
  },
  submitBtn: {
    backgroundColor: "#1B5E20",
    padding: 15,
    borderRadius: 12,
    marginTop: 25,
  },
  submitText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  transactionCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    elevation: 2,
  },
  txName: { fontWeight: "bold", fontSize: 15 },
  txDate: { fontSize: 12, color: "#666", marginTop: 4 },
  noData: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
    fontStyle: "italic",
  },
});

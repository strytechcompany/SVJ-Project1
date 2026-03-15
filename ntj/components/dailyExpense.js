import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";

const DAILY_EXPENSE_ENDPOINTS = [
  `${base_url}/dailyExpenses`,
  `${base_url}/dailyExpense`,
];

const formatDateTime = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DailyExpense({ navigation }) {
  const [expenseName, setExpenseName] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [workerNames, setWorkerNames] = useState([]);
  const [showWorkerSuggestions, setShowWorkerSuggestions] = useState(false);

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const workerSuggestions = useMemo(() => {
    const key = workerName.trim().toLowerCase();
    if (!key) return workerNames.slice(0, 8);
    return workerNames
      .filter((name) => name.toLowerCase().includes(key))
      .slice(0, 8);
  }, [workerName, workerNames]);

  const fetchWorkerNames = async () => {
    try {
      const [usersRes, dealersRes] = await Promise.all([
        fetch(`${base_url}/users`),
        fetch(`${base_url}/customersDealer`),
      ]);

      const users = usersRes.ok ? await usersRes.json() : [];
      const dealers = dealersRes.ok ? await dealersRes.json() : [];

      const fromUsers = users
        .filter((u) => String(u.role || "").toLowerCase() === "worker")
        .map((u) => String(u.name || "").trim())
        .filter(Boolean);

      const fromDealers = dealers
        .map((d) => String(d.workerName || "").trim())
        .filter(Boolean);

      const merged = Array.from(new Set([...fromUsers, ...fromDealers]));
      setWorkerNames(merged);
    } catch (error) {
      console.error("Failed to fetch worker list:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoadingList(true);
      let success = false;
      let lastStatus = 0;
      for (const endpoint of DAILY_EXPENSE_ENDPOINTS) {
        const res = await fetch(endpoint);
        lastStatus = res.status;
        if (!res.ok) {
          continue;
        }
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
        success = true;
        break;
      }
      if (!success) {
        throw new Error(`Failed to fetch expenses (${lastStatus || "no response"})`);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      const msg = String(error?.message || "");
      if (msg.includes("(404)")) {
        Alert.alert(
          "API Not Found",
          "Daily Expense API returned 404. Deploy backend changes and restart server.",
        );
      } else {
        Alert.alert("Error", "Unable to load daily expense records.");
      }
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchWorkerNames();
    fetchExpenses();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, []),
  );

  const resetForm = () => {
    setExpenseName("");
    setWorkerName("");
    setPhoneNumber("");
    setAmount("");
    setDescription("");
    setShowWorkerSuggestions(false);
  };

  const handleSave = async () => {
    const amountValue = Number(amount);
    if (!expenseName.trim()) {
      Alert.alert("Validation", "Expense Name is required.");
      return;
    }
    if (!workerName.trim()) {
      Alert.alert("Validation", "Worker Name is required.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      Alert.alert("Validation", "Enter a valid Amount greater than 0.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        expenseName: expenseName.trim(),
        workerName: workerName.trim(),
        phoneNumber: String(phoneNumber || "").trim(),
        amount: amountValue,
        description: String(description || "").trim(),
      };

      let saved = null;
      let saveError = null;
      for (const endpoint of DAILY_EXPENSE_ENDPOINTS) {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          saved = body;
          break;
        }
        saveError = body?.message || `HTTP ${res.status}`;
      }
      if (!saved) {
        throw new Error(saveError || "Failed to save expense");
      }

      setRows((prev) => [saved, ...prev]);
      resetForm();
      Alert.alert("Saved", "Daily expense recorded successfully.");
    } catch (error) {
      console.error("Save expense error:", error);
      Alert.alert("Error", error.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>
          {index + 1}. {item.expenseName || "-"}
        </Text>
        <Text style={styles.amountText}>₹{Number(item.amount || 0).toFixed(2)}</Text>
      </View>
      <Text style={styles.cardLine}>Worker: {item.workerName || "-"}</Text>
      <Text style={styles.cardLine}>Phone: {item.phoneNumber || "-"}</Text>
      <Text style={styles.cardLine}>
        Date & Time: {formatDateTime(item.expenseDate || item.createdAt)}
      </Text>
      {!!item.description && (
        <Text style={styles.cardLine}>Details: {item.description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Daily Expense"
        backgroundColor="#1B4D1B"
        left={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add Daily Expense</Text>

          <Text style={styles.label}>Expense Name / Product Name</Text>
          <TextInput
            style={styles.input}
            value={expenseName}
            onChangeText={setExpenseName}
            placeholder="Tea, Flowers, Transport..."
          />

          <Text style={styles.label}>Worker Name</Text>
          <TextInput
            style={styles.input}
            value={workerName}
            onChangeText={(text) => {
              setWorkerName(text);
              setShowWorkerSuggestions(true);
            }}
            onFocus={() => setShowWorkerSuggestions(true)}
            onBlur={() => setTimeout(() => setShowWorkerSuggestions(false), 150)}
            placeholder="Select / type worker name"
          />

          {showWorkerSuggestions && workerSuggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {workerSuggestions.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.suggestionRow}
                  onPress={() => {
                    setWorkerName(name);
                    setShowWorkerSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="Optional phone number"
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Text style={styles.label}>Description / Details</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional details"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Expense"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Saved Expenses</Text>
          {loadingList ? (
            <ActivityIndicator size="small" color="#1B4D1B" style={{ marginTop: 12 }} />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item, idx) => String(item._id || item.id || idx)}
              renderItem={renderItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No expense records yet.</Text>
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    padding: 14,
    paddingBottom: 28,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B4D1B",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6d6d6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
    backgroundColor: "#fff",
    color: "#111",
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    marginTop: -4,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  suggestionRow: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  suggestionText: {
    color: "#222",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#1B4D1B",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyText: {
    color: "#777",
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ededed",
    backgroundColor: "#fcfcfc",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B4D1B",
  },
  cardLine: {
    fontSize: 13,
    color: "#444",
    marginTop: 2,
  },
});

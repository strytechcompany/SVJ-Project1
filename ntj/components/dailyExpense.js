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
import DateTimePicker from "@react-native-community/datetimepicker";
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

const toDateOnlyKey = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [editingId, setEditingId] = useState(null);

  // Saved records filters (UI only)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null); // Date | null
  const [showDatePicker, setShowDatePicker] = useState(false);

  const workerSuggestions = useMemo(() => {
    const key = workerName.trim().toLowerCase();
    if (!key) return workerNames.slice(0, 8);
    return workerNames
      .filter((w) => w.name.toLowerCase().includes(key))
      .slice(0, 8);
  }, [workerName, workerNames]);

  const filteredRows = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    const qNoSpace = q.replace(/\s+/g, "");
    const dateKey = selectedDate ? toDateOnlyKey(selectedDate) : null;

    return (rows || []).filter((r) => {
      if (dateKey) {
        const recordKey = toDateOnlyKey(r?.expenseDate || r?.createdAt);
        if (!recordKey || recordKey !== dateKey) return false;
      }

      if (!q) return true;

      const worker = String(r?.workerName || "").toLowerCase();
      const product = String(r?.expenseName || "").toLowerCase();
      const amt = Number(r?.amount);
      const amtText = Number.isFinite(amt) ? amt.toFixed(2) : String(r?.amount || "");
      const amtKey = String(amtText).replace(/\s+/g, "").toLowerCase();

      return (
        worker.includes(q) ||
        product.includes(q) ||
        amtKey.includes(qNoSpace)
      );
    });
  }, [rows, searchQuery, selectedDate]);

  const fetchWorkerNames = async () => {
    try {
      const [usersRes, dealersRes] = await Promise.all([
        fetch(`${base_url}/users`),
        fetch(`${base_url}/customersDealer`),
      ]);

      const users = usersRes.ok ? await usersRes.json() : [];
      const dealers = dealersRes.ok ? await dealersRes.json() : [];

      const workerMap = new Map();

      // From Users (Role: Worker)
      users.forEach((u) => {
        if (String(u.role || "").toLowerCase() === "worker") {
          const name = String(u.name || "").trim();
          if (name) {
            workerMap.set(name.toLowerCase(), {
              name,
              phone: String(u.phone || u.phoneNumber || "").trim(),
            });
          }
        }
      });

      // From Dealers (workerName field)
      dealers.forEach((d) => {
        const name = String(d.workerName || "").trim();
        if (name) {
          const key = name.toLowerCase();
          if (!workerMap.has(key)) {
            workerMap.set(key, {
              name,
              phone: String(d.phoneNumber || "").trim(),
            });
          }
        }
      });

      const merged = Array.from(workerMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
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
    setEditingId(null);
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
      const method = editingId ? "PUT" : "POST";
      const baseUrl = editingId ? `${DAILY_EXPENSE_ENDPOINTS[0]}/${editingId}` : DAILY_EXPENSE_ENDPOINTS[0];

      // Note: We use the first endpoint for modifications to be safe
      const res = await fetch(baseUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        saved = body;
      } else {
        saveError = body?.message || `HTTP ${res.status}`;
      }

      if (!saved) {
        throw new Error(saveError || "Failed to save expense");
      }

      if (editingId) {
        setRows((prev) => prev.map((r) => (r._id === editingId || r.id === editingId ? saved : r)));
      } else {
        setRows((prev) => [saved, ...prev]);
      }

      resetForm();
      Alert.alert("Success", editingId ? "Expense updated." : "Daily expense recorded successfully.");
    } catch (error) {
      console.error("Save expense error:", error);
      Alert.alert("Error", error.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id || item.id);
    setExpenseName(item.expenseName || "");
    setWorkerName(item.workerName || "");
    setPhoneNumber(item.phoneNumber || "");
    setAmount(String(item.amount || ""));
    setDescription(item.description || "");
    // Scroll to top
  };

  const handleDelete = (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${DAILY_EXPENSE_ENDPOINTS[0]}/${id}`, {
              method: "DELETE",
            });
            if (res.ok) {
              setRows((prev) => prev.filter((r) => r._id !== id && r.id !== id));
            } else {
              const body = await res.json().catch(() => ({}));
              Alert.alert("Error", body.message || "Failed to delete.");
            }
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Unable to delete record.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>
              {index + 1}. {item.expenseName || "-"}
            </Text>
            <Text style={styles.amountText}>₹{Number(item.amount || 0).toFixed(2)}</Text>
          </View>
          <Text style={styles.cardLine}>Worker: {item.workerName || "-"}</Text>
          <Text style={styles.cardLine}>Phone: {item.phoneNumber || "-"}</Text>
          <Text style={styles.cardLine}>
            Date: {formatDateTime(item.expenseDate || item.createdAt)}
          </Text>
          {!!item.description && (
            <Text style={styles.cardLine}>Details: {item.description}</Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editActionBtn]}
            onPress={() => handleEdit(item)}
          >
            <Icon name="pencil" size={18} color="#1B4D1B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteActionBtn]}
            onPress={() => handleDelete(item._id || item.id)}
          >
            <Icon name="delete" size={18} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>
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

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>{editingId ? "Update Daily Expense" : "Add Daily Expense"}</Text>
            {editingId && (
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

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
            onBlur={() => setTimeout(() => setShowWorkerSuggestions(false), 300)}
            placeholder="Select / type worker name"
          />

          {showWorkerSuggestions && workerSuggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {workerSuggestions.map((w) => (
                <TouchableOpacity
                  key={`${w.name}-${w.phone}`}
                  style={styles.suggestionRow}
                  onPress={() => {
                    setWorkerName(w.name);
                    setPhoneNumber(w.phone);
                    setShowWorkerSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>
                    {w.name} {w.phone ? `(${w.phone})` : ""}
                  </Text>
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
            style={[styles.saveBtn, saving && { opacity: 0.7 }, editingId && { backgroundColor: "#FF9800" }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Processing..." : editingId ? "Update Expense" : "Save Expense"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Worker Master / List</Text>
          <FlatList
            data={workerNames}
            keyExtractor={(item, idx) => `worker-${idx}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.workerRow}
                onPress={() => {
                  setWorkerName(item.name);
                  setPhoneNumber(item.phone);
                  Alert.alert("Selected", `Worker ${item.name} selected. Fill the amount and save.`);
                }}
              >
                <View>
                  <Text style={styles.workerNameText}>{item.name}</Text>
                  <Text style={styles.workerPhoneText}>{item.phone || "No phone"}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No workers found in database.</Text>
            }
          />
        </View> */}

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Saved Daily Expenses</Text>

          <View style={styles.filtersRow}>
            <View style={styles.searchWrap}>
              <Icon name="magnify" size={18} color="#6b6b6b" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search worker, product, amount..."
                placeholderTextColor="#8a8a8a"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearIconBtn}>
                  <Icon name="close-circle" size={18} color="#8a8a8a" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.dateBtn, selectedDate && styles.dateBtnActive]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={18} color={selectedDate ? "#fff" : "#1B4D1B"} />
              <Text style={[styles.dateBtnText, selectedDate && styles.dateBtnTextActive]}>
                {selectedDate ? toDateOnlyKey(selectedDate) : "Date"}
              </Text>
            </TouchableOpacity>

            {(!!selectedDate || !!searchQuery) && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedDate(null);
                }}
              >
                <Text style={styles.resetBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (event?.type === "dismissed") return;
                setSelectedDate(date || null);
              }}
            />
          )}

          {loadingList ? (
            <ActivityIndicator size="small" color="#1B4D1B" style={{ marginTop: 12 }} />
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(item, idx) => String(item._id || item.id || idx)}
              renderItem={renderItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {rows?.length ? "No matching records." : "No expense records yet."}
                </Text>
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
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d6d6d6",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    height: 40,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: "#111",
  },
  clearIconBtn: {
    paddingLeft: 6,
    paddingVertical: 6,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#1B4D1B",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: "#fff",
  },
  dateBtnActive: {
    backgroundColor: "#1B4D1B",
  },
  dateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B4D1B",
  },
  dateBtnTextActive: {
    color: "#fff",
  },
  resetBtn: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
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
    zIndex: 999,
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
  workerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  workerNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  workerPhoneText: {
    fontSize: 13,
    color: "#666",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButtons: {
    marginLeft: 10,
    justifyContent: "space-around",
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  editActionBtn: {
    marginBottom: 8,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cancelText: {
    color: "#D32F2F",
    fontWeight: "700",
  },
});

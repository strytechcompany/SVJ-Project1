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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";

export default function ItemsEntry({ navigation }) {
  // -------- Stock Details Inputs --------
  const [stockName, setStockName] = useState("");
  const [itemDetails, setItemDetails] = useState("");
  const [buyingTouch, setBuyingTouch] = useState("");
  const [sellingTouch, setSellingTouch] = useState("");
  const [percentage, setPercentage] = useState("");

  // two separate checkboxes
  const [issueChecked, setIssueChecked] = useState(false);
  const [receiptChecked, setReceiptChecked] = useState(false);

  // -------- Meta --------
  const [selectedDate, setSelectedDate] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 🔍 Search
  const [search, setSearch] = useState("");

  // UI Saved Message
  const [savedMessage, setSavedMessage] = useState("");

  // Edit mode
  const [editingItemId, setEditingItemId] = useState(null);

  // 🔍 Stock Name Lookup
  const [filteredStockNames, setFilteredStockNames] = useState([]);
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  const today = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  useEffect(() => {
    setSelectedDate(today);
    fetchItems();
  }, []);

  // Fetch items from database
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/items`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        Alert.alert("Error", "Failed to load items from database");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  // Handle Save or Update
  const handleSubmit = async () => {
    if (
      !stockName ||
      !itemDetails ||
      !buyingTouch ||
      !sellingTouch ||
      !percentage
    ) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (!issueChecked && !receiptChecked) {
      Alert.alert("Error", "Please select at least Issue or Receipt");
      return;
    }

    const payload = {
      stockName,
      itemDetails,
      buyingTouch: parseFloat(buyingTouch),
      sellingTouch: parseFloat(sellingTouch),
      percentage: parseFloat(percentage),
      date: selectedDate,
      issue: issueChecked,
      receipt: receiptChecked,
    };

    try {
      setLoading(true);

      if (editingItemId) {
        // ---------- UPDATE EXISTING ITEM ----------
        const response = await fetch(`${base_url}/items/${editingItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setSavedMessage("Updated successfully!");
          setTimeout(() => setSavedMessage(""), 3000);
          clearForm();
          await fetchItems();
        } else {
          const errorData = await response.json();
          Alert.alert("Error", errorData.message || "Failed to update item");
        }
      } else {
        // ---------- CREATE NEW ITEM ----------
        const response = await fetch(`${base_url}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setSavedMessage("Saved successfully!");
          setTimeout(() => setSavedMessage(""), 3000);
          clearForm();
          await fetchItems();
        } else {
          const errorData = await response.json();
          Alert.alert("Error", errorData.message || "Failed to save item");
        }
      }
    } catch (error) {
      console.error("Error saving/updating item:", error);
      Alert.alert(
        "Error",
        "Could not save/update item. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStockSearch = (text) => {
    setStockName(text);
    if (text.length > 0) {
      // Get unique stock names from existing items
      const uniqueNames = [...new Set(items.map(i => i.stockName).filter(Boolean))];
      const filtered = uniqueNames.filter(name =>
        name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStockNames(filtered);
      setShowStockDropdown(true);
    } else {
      setShowStockDropdown(false);
    }
  };

  const selectStockName = (name) => {
    setStockName(name);
    setShowStockDropdown(false);
    Keyboard.dismiss();
  };

  const clearForm = () => {
    setStockName("");
    setItemDetails("");
    setBuyingTouch("");
    setSellingTouch("");
    setPercentage("");
    setIssueChecked(false);
    setReceiptChecked(false);
    setEditingItemId(null);
  };

  // -------- Edit item ----------
  const handleEdit = (item) => {
    setStockName(item.stockName);
    setItemDetails(item.itemDetails);
    setBuyingTouch(item.buyingTouch.toString());
    setSellingTouch(item.sellingTouch.toString());
    setPercentage(item.percentage.toString());
    setSelectedDate(item.date);
    setEditingItemId(item._id || item.id);

    const issue = Boolean(item.issue);
    const receipt = Boolean(item.receipt);

    if (issue && !receipt) {
      setIssueChecked(true);
      setReceiptChecked(false);
    } else if (!issue && receipt) {
      setIssueChecked(false);
      setReceiptChecked(true);
    } else if (issue && receipt) {
      // Both true, prefer issue
      setIssueChecked(true);
      setReceiptChecked(false);
    } else {
      setIssueChecked(false);
      setReceiptChecked(false);
    }
  };

  // -------- Delete item ----------
  const handleDelete = async (itemId) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${base_url}/items/${itemId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              });

              if (response.ok) {
                setSavedMessage("Deleted successfully!");
                setTimeout(() => setSavedMessage(""), 3000);
                await fetchItems();
              } else {
                const errorData = await response.json();
                Alert.alert("Error", errorData.message || "Failed to delete item");
              }
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Could not delete item. Please check your connection.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // -------- Recent 10 Transactions --------
  const recentTransactions = items.slice(-10).reverse();

  // 🔍 Filtered transactions
  const filteredTransactions = recentTransactions.filter(
    (item) =>
      (item.stockName?.toLowerCase().includes(search.toLowerCase()) ||
        item.itemDetails?.toLowerCase().includes(search.toLowerCase()) ||
        item.date?.includes(search)) &&
      ((issueChecked ? item.issue : false) || (receiptChecked ? item.receipt : false) || (!issueChecked && !receiptChecked))
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
          <TouchableOpacity
            onPress={fetchItems}
            style={{ marginLeft: "auto" }}
          >
            <Icon name="refresh" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {savedMessage !== "" && (
          <View style={styles.savedMsgBox}>
            <Text style={styles.savedMsg}>{savedMessage}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.formContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* STOCK DETAILS */}
          <Text style={styles.sectionTitle}>Stock Details</Text>

          <View style={{ zIndex: 1000 }}>
            <TextInput
              style={styles.input}
              placeholder="Stock Name"
              value={stockName}
              onChangeText={handleStockSearch}
              editable={!loading}
            />
            {showStockDropdown && filteredStockNames.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                  {filteredStockNames.map((name, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => selectStockName(name)}
                    >
                      <Text style={styles.dropdownText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Item Details"
            value={itemDetails}
            onChangeText={setItemDetails}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Buying Touch %"
            keyboardType="numeric"
            value={buyingTouch}
            onChangeText={setBuyingTouch}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Selling Touch %"
            keyboardType="numeric"
            value={sellingTouch}
            onChangeText={setSellingTouch}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Percentage %"
            keyboardType="numeric"
            value={percentage}
            onChangeText={setPercentage}
            editable={!loading}
          />

          {/* TWO CHECKBOXES: ISSUE & RECEIPT (only checkboxes, no percentage display) */}
          <View style={styles.checkboxRowTwo}>
            {/* Issue box */}
            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => {
                setIssueChecked((prev) => !prev);
              }}
              activeOpacity={0.7}
            >
              <Icon
                name={
                  issueChecked ? "checkbox-marked" : "checkbox-blank-outline"
                }
                size={22}
                color="#1B5E20"
              />
              <Text style={styles.checkboxLabel}>Issue</Text>
            </TouchableOpacity>

            {/* Receipt box */}
            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => {
                setReceiptChecked((prev) => !prev);
              }}
              activeOpacity={0.7}
            >
              <Icon
                name={
                  receiptChecked ? "checkbox-marked" : "checkbox-blank-outline"
                }
                size={22}
                color="#1B5E20"
              />
              <Text style={styles.checkboxLabel}>Receipt</Text>
            </TouchableOpacity>
          </View>

          {/* SAVE / UPDATE BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {editingItemId ? "Update" : "Save"}
              </Text>
            )}
          </TouchableOpacity>

          {/* CLEAR FORM BUTTON */}
          {editingItemId && (
            <TouchableOpacity
              style={[styles.editBtn]}
              onPress={clearForm}
              disabled={loading}
            >
              <Text style={styles.submitText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}

          {/* RECENT TRANSACTIONS */}
          <View style={styles.transactionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.transactionCount}>
                ({filteredTransactions.length})
              </Text>
            </View>
          </View>

          <View style={styles.filterSwitchRow}>
            {["ALL", "ISSUE", "RECEIPT"].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  if (type === "ALL") {
                    setIssueChecked(false);
                    setReceiptChecked(false);
                  } else if (type === "ISSUE") {
                    setIssueChecked(true);
                    setReceiptChecked(false);
                  } else {
                    setIssueChecked(false);
                    setReceiptChecked(true);
                  }
                }}
                style={[
                  styles.filterSwitchBtn,
                  (type === "ALL" && !issueChecked && !receiptChecked) ||
                    (type === "ISSUE" && issueChecked) ||
                    (type === "RECEIPT" && receiptChecked)
                    ? styles.filterSwitchActive
                    : null
                ]}
              >
                <Text style={[
                  styles.filterSwitchText,
                  ((type === "ALL" && !issueChecked && !receiptChecked) ||
                    (type === "ISSUE" && issueChecked) ||
                    (type === "RECEIPT" && receiptChecked)) && { color: "#fff" }
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#666" style={{ marginLeft: 10 }} />
            <TextInput
              style={[styles.searchInput, { borderEmpty: 1, marginTop: 0, flex: 1, borderWidth: 0 }]}
              placeholder="Search by stock name, details or date"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading && items.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <Text style={styles.noData}>
              {search
                ? "No matching transactions found"
                : "No transactions found"}
            </Text>
          ) : (
            filteredTransactions.map((item, index) => (
              <View key={item._id || index} style={styles.transactionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.txName}>{item.stockName || "N/A"}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                      <Icon name="pencil" size={18} color="#1B5E20" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id || item.id)} style={styles.actionButton}>
                      <Icon name="delete" size={18} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.detailRow}>
                  <Icon name="text-box-outline" size={16} color="#666" />
                  <Text style={styles.txDetail}>
                    {item.itemDetails || "N/A"}
                  </Text>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Buying Touch</Text>
                    <Text style={styles.statValue}>
                      {item.buyingTouch != null
                        ? `${item.buyingTouch}%`
                        : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Selling Touch</Text>
                    <Text style={styles.statValue}>
                      {item.sellingTouch != null
                        ? `${item.sellingTouch}%`
                        : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Percentage</Text>
                    <Text style={styles.statValue}>
                      {item.percentage != null
                        ? `${item.percentage}%`
                        : "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Icon name="calendar" size={14} color="#999" />
                  <Text style={styles.txDate}>{item.date || "N/A"}</Text>
                </View>
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
  formContainer: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  transactionCount: {
    fontSize: 20,
    color: "#666",
    marginLeft: 8,
    fontWeight: "bold",
    top: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#2E7D32",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: "#1B5E20",
    padding: 15,
    borderRadius: 12,
    marginTop: 25,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#A5D6A7",
  },
  editBtn: {
    backgroundColor: "#FF9800",
    padding: 15,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  transactionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 10,
  },
  txName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1B5E20",
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  txDetail: {
    fontSize: 14,
    color: "#555",
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F5F6F8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#D0D0D0",
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B5E20",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  txDate: {
    fontSize: 12,
    color: "#999",
    marginLeft: 6,
    fontStyle: "italic",
  },
  noData: {
    textAlign: "center",
    color: "#999",
    marginTop: 30,
    fontStyle: "italic",
    fontSize: 14,
  },

  // TWO CHECKBOXES ROW (Issue + Receipt)
  checkboxRowTwo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    justifyContent: "space-between",
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: -5,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  filterSwitchRow: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 4,
    marginTop: 15,
  },
  filterSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  filterSwitchActive: {
    backgroundColor: "#2E7D32",
    elevation: 3,
  },
  filterSwitchText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { base_url } from "./config";

export default function PurchaseScreen({ navigation }) {
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [receiptItem, setReceiptItem] = useState("");
  const [receiptItemId, setReceiptItemId] = useState("");
  const [issueItem, setIssueItem] = useState("");
  const [issueItemId, setIssueItemId] = useState("");
  const [cash, setCash] = useState("");

  const [showSupplier, setShowSupplier] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const [savedList, setSavedList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // API Data
  const [suppliers, setSuppliers] = useState([]);
  const [issueItems, setIssueItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchItems();
    fetchPurchases();
  }, []);

  // Fetch suppliers from dealer route
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/customersDealer`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      } else {
        Alert.alert("Error", "Failed to load suppliers");
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Fetch items from item route
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/items`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter items based on type
        const issues = data.filter(item => item.type === 'issue');
        const receipts = data.filter(item => item.type === 'receipt');
        
        setIssueItems(issues);
        setReceiptItems(receipts);
      } else {
        Alert.alert("Error", "Failed to load items");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all purchases from database
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/purchases`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedList(data.map(purchase => ({
          id: purchase._id,
          supplier: purchase.supplierName,
          supplierId: purchase.supplier,
          issueItem: purchase.issueItemName,
          issueItemId: purchase.issueItem,
          receiptItem: purchase.receiptItemName,
          receiptItemId: purchase.receiptItem,
          cash: purchase.cash.toString(),
          date: purchase.date,
          status: purchase.status,
        })));
      } else {
        Alert.alert("Error", "Failed to load purchases");
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Get current date in DD/MM/YYYY format
  const getCurrentDate = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Save or Update purchase to database
  const handleSavePurchase = async () => {
    if (!supplier && !issueItem && !receiptItem && !cash) {
      Alert.alert("Error", "Please fill at least one field");
      return;
    }

    const payload = {
      supplier: supplierId || null,
      supplierName: supplier || "",
      issueItem: issueItemId || null,
      issueItemName: issueItem || "",
      receiptItem: receiptItemId || null,
      receiptItemName: receiptItem || "",
      cash: parseFloat(cash) || 0,
      date: getCurrentDate(),
      status: "pending",
    };

    try {
      setLoading(true);

      if (editingId) {
        // UPDATE existing purchase
        const response = await fetch(`${base_url}/purchases/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          Alert.alert("Success", "Purchase updated successfully");
          clearForm();
          await fetchPurchases();
        } else {
          const errorData = await response.json();
          Alert.alert("Error", errorData.message || "Failed to update purchase");
        }
      } else {
        // CREATE new purchase
        const response = await fetch(`${base_url}/purchases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          Alert.alert("Success", "Purchase saved successfully");
          clearForm();
          await fetchPurchases();
        } else {
          const errorData = await response.json();
          Alert.alert("Error", errorData.message || "Failed to save purchase");
        }
      }
    } catch (error) {
      console.error("Error saving purchase:", error);
      Alert.alert("Error", "Could not save purchase. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Clear form fields
  const clearForm = () => {
    setSupplier("");
    setSupplierId("");
    setIssueItem("");
    setIssueItemId("");
    setReceiptItem("");
    setReceiptItemId("");
    setCash("");
    setEditingId(null);
  };

  // Edit existing purchase
  const handleEdit = (item) => {
    setSupplier(item.supplier);
    setSupplierId(item.supplierId);
    setIssueItem(item.issueItem);
    setIssueItemId(item.issueItemId);
    setReceiptItem(item.receiptItem);
    setReceiptItemId(item.receiptItemId);
    setCash(item.cash);
    setEditingId(item.id);
  };

  // Delete purchase from database
  const handleDelete = async (purchaseId) => {
    Alert.alert(
      "Delete Purchase",
      "Are you sure you want to delete this purchase?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${base_url}/purchases/${purchaseId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              });

              if (response.ok) {
                Alert.alert("Success", "Purchase deleted successfully");
                await fetchPurchases();
              } else {
                Alert.alert("Error", "Failed to delete purchase");
              }
            } catch (error) {
              console.error("Error deleting purchase:", error);
              Alert.alert("Error", "Could not delete purchase");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Clear all purchases
  const handleClearAll = () => {
    Alert.alert(
      "Clear All",
      "Are you sure you want to clear all saved purchases? This will delete them from the database.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete each purchase one by one
              for (const purchase of savedList) {
                await fetch(`${base_url}/purchases/${purchase.id}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                });
              }
              
              Alert.alert("Success", "All purchases cleared");
              await fetchPurchases();
            } catch (error) {
              console.error("Error clearing purchases:", error);
              Alert.alert("Error", "Could not clear all purchases");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase</Text>
        <View style={styles.toggleBox}>
          <Text style={styles.toggleTextActive}>Bill</Text>
          <Text style={styles.toggleText}>History</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Supplier */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Select Supplier</Text>
            <TouchableOpacity onPress={fetchSuppliers}>
              <Icon name="refresh-cw" size={16} color="#2E7D32" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setShowSupplier(!showSupplier)}
          >
            <Text style={styles.selectText}>
              {supplier || "Select Supplier"}
            </Text>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          {showSupplier && (
            <ScrollView style={styles.dropdownContainer} nestedScrollEnabled>
              {suppliers.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownTextEmpty}>No suppliers found</Text>
                </View>
              ) : (
                suppliers.map((dealer) => (
                  <TouchableOpacity
                    key={dealer._id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSupplier(dealer.customerName);
                      setSupplierId(dealer._id);
                      setShowSupplier(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{dealer.customerName}</Text>
                    {dealer.shopName && (
                      <Text style={styles.dropdownSubText}>{dealer.shopName}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Issues */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Issues</Text>
            <TouchableOpacity onPress={fetchItems}>
              <Icon name="refresh-cw" size={16} color="#2E7D32" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setShowIssue(!showIssue)}
          >
            <Text style={styles.selectText}>
              {issueItem || "Search Item"}
            </Text>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          {showIssue && (
            <ScrollView style={styles.dropdownContainer} nestedScrollEnabled>
              {issueItems.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownTextEmpty}>No issue items found</Text>
                </View>
              ) : (
                issueItems.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIssueItem(item.stockName);
                      setIssueItemId(item._id);
                      setShowIssue(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{item.stockName}</Text>
                    {item.itemDetails && (
                      <Text style={styles.dropdownSubText}>{item.itemDetails}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Receipts */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Receipts</Text>
            <TouchableOpacity onPress={fetchItems}>
              <Icon name="refresh-cw" size={16} color="#2E7D32" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setShowReceipt(!showReceipt)}
          >
            <Text style={styles.selectText}>
              {receiptItem || "Search Item"}
            </Text>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          {showReceipt && (
            <ScrollView style={styles.dropdownContainer} nestedScrollEnabled>
              {receiptItems.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownTextEmpty}>No receipt items found</Text>
                </View>
              ) : (
                receiptItems.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setReceiptItem(item.stockName);
                      setReceiptItemId(item._id);
                      setShowReceipt(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{item.stockName}</Text>
                    {item.itemDetails && (
                      <Text style={styles.dropdownSubText}>{item.itemDetails}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Cash */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cash</Text>
          <Text style={styles.subLabel}>Amount ₹</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            value={cash}
            onChangeText={setCash}
            keyboardType="numeric"
          />
        </View>

        {/* Saved Purchases */}
        {savedList.length > 0 && (
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionTitle}>Saved Purchases ({savedList.length})</Text>
              <TouchableOpacity onPress={fetchPurchases}>
                <Icon name="refresh-cw" size={16} color="#2E7D32" />
              </TouchableOpacity>
            </View>
            {savedList.map((item) => (
              <View key={item.id} style={styles.savedRow}>
                <View style={styles.savedInfo}>
                  <Text style={styles.savedLabel}>
                    Supplier: <Text style={styles.savedValue}>{item.supplier || "-"}</Text>
                  </Text>
                  <Text style={styles.savedLabel}>
                    Issue: <Text style={styles.savedValue}>{item.issueItem || "-"}</Text>
                  </Text>
                  <Text style={styles.savedLabel}>
                    Receipt: <Text style={styles.savedValue}>{item.receiptItem || "-"}</Text>
                  </Text>
                  <Text style={styles.savedLabel}>
                    Cash: <Text style={styles.savedValue}>₹{item.cash || "0"}</Text>
                  </Text>
                  <Text style={styles.savedLabel}>
                    Date: <Text style={styles.savedValue}>{item.date || "-"}</Text>
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEdit(item)}
                  >
                    <Icon name="edit-2" size={16} color="#2E7D32" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Icon name="trash-2" size={16} color="#D32F2F" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {editingId && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={clearForm}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {savedList.length > 0 && !editingId && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearAll}
          >
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSavePurchase}>
          <Text style={styles.saveText}>
            {editingId ? "Update" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },

  header: {
    height: 110,
    backgroundColor: "#2E7D32",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginLeft: 12,
  },

  toggleBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 3,
  },

  toggleTextActive: {
    backgroundColor: "#fff",
    color: "#2E7D32",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    fontSize: 13,
    fontWeight: "600",
  },

  toggleText: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 10,
  },

  selectBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },

  selectText: {
    color: "#333",
    fontSize: 14,
  },

  dropdownContainer: {
    maxHeight: 200,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },

  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },

  dropdownText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  dropdownSubText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  dropdownTextEmpty: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },

  subLabel: {
    marginTop: 8,
    marginBottom: 6,
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  savedRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    marginTop: 8,
  },

  savedInfo: {
    marginBottom: 12,
  },

  savedLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },

  savedValue: {
    color: "#333",
    fontWeight: "normal",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },

  editText: {
    color: "#2E7D32",
    fontWeight: "bold",
    fontSize: 13,
  },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },

  deleteText: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 13,
  },

  footer: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },

  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FF9800",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginRight: 10,
  },

  cancelText: {
    color: "#FF9800",
    fontWeight: "bold",
    fontSize: 15,
  },

  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D32F2F",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginRight: 10,
  },

  clearText: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 15,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
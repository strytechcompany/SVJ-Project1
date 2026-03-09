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
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function PurchaseScreen({ navigation }) {
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [cash, setCash] = useState("");
  const [savedList, setSavedList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [issueEntries, setIssueEntries] = useState([{ item: "", itemId: "", weight: "" }]);
  const [receiptEntries, setReceiptEntries] = useState([{ item: "", itemId: "", weight: "" }]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState(""); // "issue" or "receipt" or "supplier"
  const [modalIndex, setModalIndex] = useState(null); // for table rows
  const [searchText, setSearchText] = useState("");

  // API Data
  const [suppliers, setSuppliers] = useState([]);
  const [issueItems, setIssueItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Table Helpers
  const addIssueEntry = () => {
    setIssueEntries(prev => [...prev, { item: "", itemId: "", weight: "" }]);
  };

  const removeIssueEntry = (index) => {
    setIssueEntries(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length === 0 ? [{ item: "", itemId: "", weight: "" }] : filtered;
    });
  };

  const updateIssueEntry = (index, field, value) => {
    setIssueEntries(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const addReceiptEntry = () => {
    setReceiptEntries(prev => [...prev, { item: "", itemId: "", weight: "" }]);
  };

  const removeReceiptEntry = (index) => {
    setReceiptEntries(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length === 0 ? [{ item: "", itemId: "", weight: "" }] : filtered;
    });
  };

  const updateReceiptEntry = (index, field, value) => {
    setReceiptEntries(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const getTotalIssueWeight = () => {
    return issueEntries.reduce((sum, entry) => sum + (parseFloat(entry.weight) || 0), 0);
  };

  const getTotalReceiptWeight = () => {
    return receiptEntries.reduce((sum, entry) => sum + (parseFloat(entry.weight) || 0), 0);
  };

  // Modal Logic

  const selectItemFromModal = (item) => {
    const itemName = item.stockName || item.itemName || "";

    if (modalMode === "supplier") {
      setSupplier(item.customerName || "");
      setSupplierId(item._id);
    } else if (modalMode === "issue") {
      updateIssueEntry(modalIndex, 'item', itemName);
      updateIssueEntry(modalIndex, 'itemId', item._id);
    } else if (modalMode === "receipt") {
      updateReceiptEntry(modalIndex, 'item', itemName);
      updateReceiptEntry(modalIndex, 'itemId', item._id);
    }

    setModalVisible(false);
    setSearchText("");
  };

  const openModal = (mode, index = null) => {
    setModalMode(mode);
    setModalIndex(index);
    setModalVisible(true);
    setSearchText("");
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchItems();
    fetchStocks();
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

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/stockMaster`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data);
      }
    } catch (error) {
      console.error("Error fetching stocks:", error);
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
          issueWeight: (purchase.issueWeight || 0).toString(),
          receiptItem: purchase.receiptItemName,
          receiptItemId: purchase.receiptItem,
          receiptWeight: (purchase.receiptWeight || 0).toString(),
          cash: (purchase.cash || 0).toString(),
          date: purchase.date,
          status: purchase.status,
          issueEntries: purchase.issueEntries || [],
          receiptEntries: purchase.receiptEntries || [],
        })));
      } else {
        Alert.alert("Error", "Failed to load purchases");
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get current date/time in DD/MM/YYYY HH:MM:SS format
  const getCurrentDateTime = () => {
    const d = new Date();
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    return `${date} ${time}`;
  };

  // Save or Update purchase to database
  const handleSavePurchase = async () => {
    const validIssues = issueEntries.filter(e => e.item && parseFloat(e.weight) > 0);
    const validReceipts = receiptEntries.filter(e => e.item && parseFloat(e.weight) > 0);
    const hasCash = parseFloat(cash) > 0;

    if (!supplier && validIssues.length === 0 && validReceipts.length === 0 && !hasCash) {
      Alert.alert("Error", "Please fill at least one field");
      return;
    }

    // Prepare compatibility data (first items)
    const firstIssue = validIssues[0] || {};
    const firstReceipt = validReceipts[0] || {};

    const payload = {
      supplier: supplierId || null,
      supplierName: supplier || "",
      issueItem: firstIssue.itemId || null,
      issueItemName: firstIssue.item || "",
      issueWeight: getTotalIssueWeight(),
      receiptItem: firstReceipt.itemId || null,
      receiptItemName: firstReceipt.item || "",
      receiptWeight: getTotalReceiptWeight(),
      issueEntries: validIssues.map(e => ({ item: e.itemId, itemName: e.item, weight: parseFloat(e.weight) })),
      receiptEntries: validReceipts.map(e => ({ item: e.itemId, itemName: e.item, weight: parseFloat(e.weight) })),
      cash: parseFloat(cash) || 0,
      date: getCurrentDateTime(),
      status: "pending",
    };

    // Bulk Validation
    for (const e of validIssues) {
      const stockItem = stocks.find(s => s.itemName === e.item);
      if (stockItem) {
        if (stockItem.weight < parseFloat(e.weight)) {
          Alert.alert("Warning", `Insufficient stock for ${e.item}! Available: ${stockItem.weight}g.`);
          return;
        }
      } else {
        Alert.alert("Error", `Item ${e.item} not found in stock master.`);
        return;
      }
    }

    try {
      setLoading(true);

      const updateStock = async (itemName, amount, type) => {
        const val = parseFloat(amount);
        if (!itemName || isNaN(val) || val <= 0) return;
        const res = await fetch(`${base_url}/stockMaster`);
        if (!res.ok) return;
        const latestStocks = await res.json();
        const stockItem = latestStocks.find(s => s.itemName === itemName);
        if (stockItem) {
          const newWeight = type === 'add' ? stockItem.weight + val : stockItem.weight - val;
          await fetch(`${base_url}/stockMaster/${stockItem._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...stockItem, weight: newWeight })
          });
        }
      };

      if (editingId) {
        // Reversal
        const oldRecord = savedList.find(r => r.id === editingId);
        if (oldRecord) {
          for (const e of (oldRecord.issueEntries || [])) await updateStock(e.itemName, e.weight, 'add');
          for (const e of (oldRecord.receiptEntries || [])) await updateStock(e.itemName, e.weight, 'deduct');
        }

        const response = await fetch(`${base_url}/purchases/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          for (const e of validIssues) await updateStock(e.item, e.weight, 'deduct');
          for (const e of validReceipts) await updateStock(e.item, e.weight, 'add');

          Alert.alert("Success", "Purchase updated successfully");
          clearForm();
          await fetchStocks();
          await fetchPurchases();
        } else {
          Alert.alert("Error", "Failed to update purchase");
        }
      } else {
        const response = await fetch(`${base_url}/purchases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          for (const e of validIssues) await updateStock(e.item, e.weight, 'deduct');
          for (const e of validReceipts) await updateStock(e.item, e.weight, 'add');

          Alert.alert("Success", "Purchase saved successfully");
          clearForm();
          await fetchStocks();
          await fetchPurchases();
        } else {
          Alert.alert("Error", "Failed to save purchase");
        }
      }
    } catch (error) {
      console.error("Error saving purchase:", error);
      Alert.alert("Error", "Could not save purchase.");
    } finally {
      setLoading(false);
    }
  };

  // Clear form fields
  const clearForm = () => {
    setSupplier("");
    setSupplierId("");
    setIssueEntries([{ item: "", itemId: "", weight: "" }]);
    setReceiptEntries([{ item: "", itemId: "", weight: "" }]);
    setCash("");
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setSupplier(item.supplier);
    setSupplierId(item.supplierId);
    setIssueEntries(item.issueEntries && item.issueEntries.length > 0 ?
      item.issueEntries.map(e => ({ item: e.itemName, itemId: e.item, weight: e.weight.toString() })) :
      [{ item: "", itemId: "", weight: "" }]);
    setReceiptEntries(item.receiptEntries && item.receiptEntries.length > 0 ?
      item.receiptEntries.map(e => ({ item: e.itemName, itemId: e.item, weight: e.weight.toString() })) :
      [{ item: "", itemId: "", weight: "" }]);
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
      <CommonHeader
      title="Purchase"
      backgroundColor="#2E7D32"
      left={
      <TouchableOpacity onPress={() => navigation.goBack()}>
      <Icon name="arrow-left" size={24} color="#fff" />
      </TouchableOpacity>
      }
      right={<View style={styles.toggleBox}><Text style={styles.toggleTextActive}>Bill</Text><Text style={styles.toggleText}>History</Text></View>}
      />

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
            onPress={() => openModal("supplier")}
          >
            <Text style={styles.selectText}>
              {supplier || "Select Supplier"}
            </Text>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Issues */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>Issues</Text>
              <TouchableOpacity onPress={fetchItems} style={{ marginLeft: 8 }}>
                <Icon name="refresh-cw" size={14} color="#2E7D32" />
              </TouchableOpacity>
            </View>
            <View style={[styles.weightBadgeContainer, { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2", paddingHorizontal: 12, paddingVertical: 6 }]}>
              <Icon name="shopping-cart" size={14} color="#D32F2F" />
              <Text style={[styles.weightBadge, { color: "#D32F2F", marginLeft: 8 }]}>
                {issueEntries.filter(e => e.item).length} Items • {getTotalIssueWeight().toFixed(3)}g
              </Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeadText, { width: 30 }]}>#</Text>
              <Text style={[styles.tableHeadText, { flex: 2 }]}>Item</Text>
              <Text style={[styles.tableHeadText, { flex: 1.5 }]}>Weight (g)</Text>
              <Text style={[styles.tableHeadText, { width: 40 }]}></Text>
            </View>

            {issueEntries.map((entry, index) => (
              <View key={index} style={styles.tableEntryRow}>
                <Text style={{ width: 30, color: "#666", fontSize: 13 }}>{index + 1}</Text>
                <TouchableOpacity
                  style={[styles.tableSelectBox, { flex: 2 }]}
                  onPress={() => openModal("issue", index)}
                >
                  <Text style={styles.tableSelectText} numberOfLines={1}>
                    {entry.item || "Select"}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.tableInput, { flex: 1.5 }]}
                  placeholder="0.000"
                  value={entry.weight}
                  onChangeText={(val) => updateIssueEntry(index, 'weight', val)}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={{ width: 40, alignItems: "flex-end" }}
                  onPress={() => removeIssueEntry(index)}
                >
                  <Icon name="minus-circle" size={20} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.addItemBtn} onPress={addIssueEntry}>
            <Icon name="plus-circle" size={18} color="#2E7D32" />
            <Text style={styles.addItemText}>Add Issue Item</Text>
          </TouchableOpacity>
        </View>

        {/* Receipts */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>Receipts</Text>
              <TouchableOpacity onPress={fetchItems} style={{ marginLeft: 8 }}>
                <Icon name="refresh-cw" size={14} color="#2E7D32" />
              </TouchableOpacity>
            </View>
            <View style={[styles.weightBadgeContainer, { paddingHorizontal: 12, paddingVertical: 6 }]}>
              <Icon name="shopping-cart" size={14} color="#2E7D32" />
              <Text style={[styles.weightBadge, { marginLeft: 8 }]}>
                {receiptEntries.filter(e => e.item).length} Items • {getTotalReceiptWeight().toFixed(3)}g
              </Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeadText, { width: 30 }]}>#</Text>
              <Text style={[styles.tableHeadText, { flex: 2 }]}>Item</Text>
              <Text style={[styles.tableHeadText, { flex: 1.5 }]}>Weight (g)</Text>
              <Text style={[styles.tableHeadText, { width: 40 }]}></Text>
            </View>

            {receiptEntries.map((entry, index) => (
              <View key={index} style={styles.tableEntryRow}>
                <Text style={{ width: 30, color: "#666", fontSize: 13 }}>{index + 1}</Text>
                <TouchableOpacity
                  style={[styles.tableSelectBox, { flex: 2 }]}
                  onPress={() => openModal("receipt", index)}
                >
                  <Text style={styles.tableSelectText} numberOfLines={1}>
                    {entry.item || "Select"}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.tableInput, { flex: 1.5 }]}
                  placeholder="0.000"
                  value={entry.weight}
                  onChangeText={(val) => updateReceiptEntry(index, 'weight', val)}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={{ width: 40, alignItems: "flex-end" }}
                  onPress={() => removeReceiptEntry(index)}
                >
                  <Icon name="minus-circle" size={20} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.addItemBtn} onPress={addReceiptEntry}>
            <Icon name="plus-circle" size={18} color="#2E7D32" />
            <Text style={styles.addItemText}>Add Receipt Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cash Amount</Text>
          <Text style={styles.subLabel}>Amount ₹</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter cash amount"
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
                  <View style={{ marginVertical: 4 }}>
                    <Text style={styles.savedLabel}>Issues:</Text>
                    {(item.issueEntries || []).map((e, idx) => (
                      <Text key={idx} style={[styles.savedValue, { marginLeft: 10 }]}>
                        • {e.item}: {e.weight}g
                      </Text>
                    ))}
                    {(item.issueEntries || []).length === 0 && <Text style={[styles.savedValue, { marginLeft: 10 }]}>-</Text>}
                  </View>

                  <View style={{ marginVertical: 4 }}>
                    <Text style={styles.savedLabel}>Receipts:</Text>
                    {(item.receiptEntries || []).map((e, idx) => (
                      <Text key={idx} style={[styles.savedValue, { marginLeft: 10 }]}>
                        • {e.item}: {e.weight}g
                      </Text>
                    ))}
                    {(item.receiptEntries || []).length === 0 && <Text style={[styles.savedValue, { marginLeft: 10 }]}>-</Text>}
                  </View>
                  <Text style={styles.savedLabel}>
                    Cash: <Text style={styles.savedValue}>₹{item.cash || "0"}</Text>
                  </Text>
                  <Text style={styles.savedLabel}>
                    Date/Time: <Text style={styles.savedValue}>{item.date || "-"}</Text>
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
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {modalMode.charAt(0).toUpperCase() + modalMode.slice(1)}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Icon name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Icon name="search" size={18} color="#999" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search ${modalMode}...`}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {modalMode === "supplier" ? (
                (() => {
                  const filtered = suppliers.filter(s =>
                    (s.customerName || "").toLowerCase().includes(searchText.toLowerCase()) ||
                    (s.phoneNumber || "").toLowerCase().includes(searchText.toLowerCase())
                  );
                  return filtered.length === 0 ? (
                    <Text style={styles.emptyText}>No suppliers found</Text>
                  ) : filtered.map(item => (
                    <TouchableOpacity
                      key={item._id}
                      style={styles.modalItem}
                      onPress={() => selectItemFromModal(item)}
                    >
                      <View style={styles.itemIconContainer}>
                        <Icon name="user" size={18} color="#2E7D32" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemMainText}>{item.customerName}</Text>
                        <Text style={styles.itemSubText}>{item.phoneNumber || item.shopName}</Text>
                      </View>
                      <Icon name="chevron-right" size={16} color="#ccc" />
                    </TouchableOpacity>
                  ));
                })()
              ) : (
                (() => {
                  const itemsToFilter = modalMode === "issue" ? issueItems : receiptItems;
                  const filtered = itemsToFilter.filter(i => (i.stockName || i.itemName || "").toLowerCase().includes(searchText.toLowerCase()));
                  return filtered.length === 0 ? (
                    <Text style={styles.emptyText}>No items found</Text>
                  ) : filtered.map(item => {
                    const itemName = item.stockName || item.itemName;
                    const stock = stocks.find(s => s.itemName === itemName);
                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.modalItem}
                        onPress={() => selectItemFromModal(item)}
                      >
                        <View style={styles.itemIconContainer}>
                          <Icon name="package" size={18} color="#2E7D32" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemMainText}>{itemName}</Text>
                          <Text style={styles.itemSubText}>Stock: {stock ? stock.weight : 0}g</Text>
                        </View>
                        <Icon name="chevron-right" size={16} color="#ccc" />
                      </TouchableOpacity>
                    );
                  });
                })()
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  stockWeightHint: {
    fontSize: 10,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 2,
    fontStyle: "italic",
    textAlign: "right",
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

  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#2E7D32",
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
    gap: 8,
  },
  addItemText: {
    color: "#2E7D32",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: "85%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalGrabber: {
    width: 40,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  modalCloseBtn: {
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 20,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  modalSearchIcon: {
    marginRight: 12,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemMainText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212529",
  },
  itemSubText: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#ADB5BD",
    fontSize: 15,
    fontStyle: "italic",
  },

  // Table Styles
  tableContainer: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    paddingVertical: 10,
    alignItems: "center",
  },
  columnHeader: {
    fontWeight: "700",
    color: "#495057",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  columnData: {
    fontSize: 13,
    color: "#212529",
    textAlign: "center",
  },
  col1: { width: 35, alignItems: "center", justifyContent: "center" },
  col2: { width: 70, alignItems: "center", justifyContent: "center" },
  col3: { flex: 2.5, paddingHorizontal: 4, justifyContent: "center" },
  col4: { flex: 1.5, paddingHorizontal: 4, justifyContent: "center" },
  col5: { width: 50, alignItems: "center", justifyContent: "center" },

  savedRow: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  savedInfo: {
    flex: 1,
  },
  savedLabel: {
    fontSize: 13,
    color: "#6C757D",
    fontWeight: "600",
  },
  savedValue: {
    color: "#212529",
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    paddingTop: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deleteText: {
    color: "#D32F2F",
    fontSize: 12,
    fontWeight: "700",
  },

  tableInput: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    backgroundColor: "#fff",
    textAlign: "center",
    color: "#212529",
  },
  tableSelectBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#fff",
  },
  tableSelectText: {
    color: "#495057",
    fontSize: 12,
    flex: 1,
    fontWeight: "500",
  },
  weightBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  weightBadge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 6,
  },
  table: { marginTop: 10 },
  tableHeaderRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
  tableHeadText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  tableEntryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F8E9', padding: 10, borderRadius: 8, marginTop: 10, gap: 8, borderWidth: 1, borderColor: '#C5E1A5', borderStyle: 'dashed' },
  addItemText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 14 }
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function GSTPage({ navigation }) {
  const [activeTab, setActiveTab] = useState("B2B");
  const [sgst, setSgst] = useState("");
  const [cgst, setCgst] = useState("");
  const [igst, setIgst] = useState("");
  const [hsn, setHsn] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [stone, setStone] = useState("");
  const [pureWeight, setPureWeight] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [savedList, setSavedList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [enabled, setEnabled] = useState(false);

  // ✅ Modal-based delete confirmation (like SettingsScreen)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const loadList = async () => {
      try {
        const response = await fetch(`${base_url}/gst`);
        const text = await response.text();
        const data = JSON.parse(text);
        setSavedList(data);
      } catch (error) {
        console.error("Failed to load GST list from DB", error);
      }
    };
    loadList();
  }, []);

  // ✅ Auto-calculate pureWeight/finalAmount (GST Percentage) from individual SGST, CGST, IGST
  useEffect(() => {
    const s = parseFloat(sgst) || 0;
    const c = parseFloat(cgst) || 0;
    const i = parseFloat(igst) || 0;
    const total = (s + c + i).toString();

    if (activeTab === "B2B") {
      setPureWeight(total);
    } else {
      setFinalAmount(total);
    }
  }, [sgst, cgst, igst, activeTab]);

  const clearFields = () => {
    setSgst(""); setCgst(""); setIgst(""); setHsn("");
    setNetWeight(""); setStone(""); setPureWeight(""); setFinalAmount("");
    setEditingId(null); setEnabled(false);
  };

  const handleSave = async () => {
    const now = new Date();
    const newItem = {
      type: activeTab,
      sgst, cgst, igst, hsn,
      netWeight, stone,
      enabled,
      finalValue: activeTab === "B2B" ? pureWeight : finalAmount,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    try {
      if (editingId) {
        const response = await fetch(`${base_url}/gst/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
        const text = await response.text();
        const result = JSON.parse(text);
        if (result.success) {
          setSavedList((prev) =>
            prev.map((i) => (String(i._id) === editingId ? result.data : i))
          );
          Alert.alert("Success", "Record updated!");
          clearFields();
        } else {
          Alert.alert("Error", "Failed to update record.");
        }
      } else {
        const response = await fetch(`${base_url}/gst/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
        const text = await response.text();
        const result = JSON.parse(text);
        if (result.success) {
          setSavedList((prev) => [result.data, ...prev]);
          Alert.alert("Success", "Added to list!");
          clearFields();
        } else {
          Alert.alert("Error", "Failed to save record.");
        }
      }
    } catch (error) {
      console.error("Failed to save GST record to DB", error);
      Alert.alert("Error", "Network error while saving.");
    }
  };

  const handleEdit = (item) => {
    setActiveTab(item.type);
    setSgst(item.sgst || "");
    setCgst(item.cgst || "");
    setIgst(item.igst || "");
    setHsn(item.hsn || "");
    setEnabled(item.enabled || false);
    setNetWeight(item.netWeight || "");
    setStone(item.stone || "");
    if (item.type === "B2B") {
      setPureWeight(item.finalValue || "");
      setFinalAmount("");
    } else {
      setFinalAmount(item.finalValue || "");
      setPureWeight("");
    }
    setEditingId(String(item._id));
  };

  const handleCancelEdit = () => {
    clearFields();
  };

  // ✅ Step 1: Just open the modal and store which item to delete
  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  // ✅ Step 2: Actually perform the delete when user confirms in modal
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleteModalVisible(false);

    try {
      const itemId = String(itemToDelete._id);
      console.log("Deleting item with id:", itemId);

      const res = await fetch(`${base_url}/gst/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();
      console.log("Delete response:", text);
      const data = JSON.parse(text);

      if (data.success) {
        setSavedList((prev) => prev.filter((i) => String(i._id) !== itemId));
        Alert.alert("Deleted", "Record removed successfully.");
      } else {
        Alert.alert("Error", "Failed to delete from database.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Network error while deleting.");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
      title="GST Calculation"
      onBack={() => navigation.goBack()}
      backgroundColor="#3D2800"
      insideSafeArea
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* TABS */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "B2B" && styles.activeTabBtn]}
              onPress={() => setActiveTab("B2B")}
            >
              <Text style={[styles.tabText, activeTab === "B2B" && styles.activeTypeText]}>
                B2B Transaction
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "B2C" && styles.activeTabBtn]}
              onPress={() => setActiveTab("B2C")}
            >
              <Text style={[styles.tabText, activeTab === "B2C" && styles.activeTypeText]}>
                B2C Transaction
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {editingId ? `Edit ${activeTab} Record` : `${activeTab} Details`}
            </Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>SGST</Text>
                <TextInput style={styles.input} placeholder="%" keyboardType="numeric" value={sgst} onChangeText={setSgst} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>CGST</Text>
                <TextInput style={styles.input} placeholder="%" keyboardType="numeric" value={cgst} onChangeText={setCgst} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>IGST</Text>
                <TextInput style={styles.input} placeholder="%" keyboardType="numeric" value={igst} onChangeText={setIgst} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>HSN Code</Text>
                <TextInput style={styles.input} placeholder="Code" keyboardType="numeric" value={hsn} onChangeText={setHsn} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Net Weight / HM</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={netWeight} onChangeText={setNetWeight} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Stone</Text>
                <TextInput style={styles.input} placeholder="Details" keyboardType="numeric" value={stone} onChangeText={setStone} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Percentage</Text>
              <TextInput
                style={styles.input}
                placeholder="%"
                keyboardType="numeric"
                value={activeTab === "B2B" ? pureWeight : finalAmount}
                onChangeText={activeTab === "B2B" ? setPureWeight : setFinalAmount}
              />
            </View>

            {/* ENABLE GST CHECKBOX */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setEnabled(!enabled)}
            >
              <Ionicons
                name={enabled ? "checkbox" : "square-outline"}
                size={24}
                color={enabled ? "#3D2800" : "#555"}
              />
              <Text style={styles.checkboxLabel}>Enable GST</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              {editingId && (
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, editingId && { flex: 1 }]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>
                  {editingId ? "Update Details" : "Save Details"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SAVED LIST */}
          {savedList.length > 0 && (
            <View style={{ marginTop: 30, paddingBottom: 40 }}>
              <Text style={styles.sectionTitle}>Saved Records</Text>
              {savedList.map((item) => (
                <View
                  key={String(item._id)}
                  style={[
                    styles.savedCard,
                    editingId === String(item._id) && styles.editingCard,
                  ]}
                >
                  <View style={styles.savedHeader}>
                    <View>
                      <Text style={styles.savedType}>{item.type}</Text>
                      <Text style={styles.savedHsn}>HSN: {item.hsn}</Text>
                    </View>
                    <Text style={styles.savedDate}>{item.date} {item.time}</Text>
                  </View>

                  <View style={styles.savedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>SGST</Text>
                      <Text style={styles.savedValue}>{item.sgst || "0"}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>CGST</Text>
                      <Text style={styles.savedValue}>{item.cgst || "0"}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>IGST</Text>
                      <Text style={styles.savedValue}>{item.igst || "0"}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>Status</Text>
                      <Text style={[styles.savedValue, { color: item.enabled ? "#B8860B" : "#d32f2f" }]}>
                        {item.enabled ? "ENABLED" : "DISABLED"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.savedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>Net Weight</Text>
                      <Text style={styles.savedValue}>{item.netWeight || "-"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>Stone</Text>
                      <Text style={styles.savedValue}>{item.stone || "-"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>
                        {item.type === "B2B" ? "Percentage" : "Final Amt"}
                      </Text>
                      <Text style={[styles.savedValue, { color: "#B8860B" }]}>
                        {item.finalValue || "-"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => handleEdit(item)}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    {/* ✅ Now calls confirmDelete instead of handleDelete */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => confirmDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.actionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ Delete Confirmation Modal — same pattern as SettingsScreen */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="warning-outline" size={50} color="red" />
            <Text style={styles.modalTitle}>Delete Record?</Text>
            <Text style={styles.modalText}>
              This will permanently delete this GST record. This action cannot be undone.
            </Text>

            <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDelete}>
              <Text style={styles.modalDeleteText}>YES, DELETE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setDeleteModalVisible(false);
                setItemToDelete(null);
              }}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F6" },
  header: {
    backgroundColor: "#3D2800",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  fileTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  content: { padding: 20 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 5,
    marginBottom: 20,
    elevation: 2,
  },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 25, alignItems: "center" },
  activeTabBtn: { backgroundColor: "#3D2800" },
  tabText: { fontWeight: "bold", color: "#555", fontSize: 14 },
  activeTypeText: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3D2800",
    marginBottom: 20,
    textAlign: "center",
  },
  row: { flexDirection: "row", gap: 15, marginBottom: 15 },
  col: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#000",
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#FFD54F",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    elevation: 3,
  },
  saveText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    elevation: 3,
  },
  cancelText: { color: "#333", fontSize: 16, fontWeight: "bold" },
  savedCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: "#3D2800",
  },
  editingCard: {
    borderLeftColor: "#2196F3",
    backgroundColor: "#F0F7FF",
  },
  savedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  savedType: { fontWeight: "bold", color: "#3D2800", fontSize: 16 },
  savedHsn: { color: "#666", fontSize: 12 },
  savedRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  savedLabel: { fontSize: 12, color: "#888", marginBottom: 2 },
  savedValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  savedDate: { color: "#888", fontSize: 12 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editBtn: { backgroundColor: "#2196F3" },
  deleteBtn: { backgroundColor: "#F44336" },
  actionText: { color: "#fff", fontSize: 12, fontWeight: "bold", marginLeft: 4 },

  // Modal styles (same pattern as SettingsScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 25,
    width: "80%",
    borderRadius: 15,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#333",
  },
  modalText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
    color: "#666",
  },
  modalDeleteBtn: {
    backgroundColor: "red",
    paddingVertical: 12,
    width: "100%",
    borderRadius: 10,
    marginBottom: 10,
  },
  modalDeleteText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  modalCancelBtn: {
    backgroundColor: "#eee",
    paddingVertical: 12,
    width: "100%",
    borderRadius: 10,
  },
  modalCancelText: {
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    fontSize: 16,
  },
});

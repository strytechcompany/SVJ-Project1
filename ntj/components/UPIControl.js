import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

export default function UPIControl({ navigation }) {
  const [upiIds, setUpiIds] = useState(["user1@upi", "user2@upi", "user3@upi"]);
  const [selectedUpiId, setSelectedUpiId] = useState("user1@upi");
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [editingUpiId, setEditingUpiId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUpiId, setQrUpiId] = useState("");
  const commonHandles = ["@oksbi", "@okicici", "@okaxis", "@okhdfcbank", "@ybl", "@paytm"];

  useEffect(() => {
    const loadSelectedUpiId = async () => {
      try {
        const stored = await AsyncStorage.getItem('selectedUpiId');
        if (stored) {
          setSelectedUpiId(stored);
        }
      } catch (error) {
        console.error('Error loading selected UPI ID:', error);
      }
    };
    loadSelectedUpiId();
  }, []);

  const saveSelectedUpiId = async (upiId) => {
    try {
      await AsyncStorage.setItem('selectedUpiId', upiId);
      setSelectedUpiId(upiId);
      Alert.alert("Success", `${upiId} selected as default UPI ID`);
    } catch (error) {
      console.error('Error saving selected UPI ID:', error);
    }
  };

  const handleAddUpiId = () => {
    if (!newUpiId.trim()) {
      Alert.alert("Error", "Please enter a UPI ID");
      return;
    }
    if (editingUpiId !== null) {
      // Edit existing
      const updated = [...upiIds];
      updated[editingUpiId] = newUpiId.trim();
      setUpiIds(updated);
    } else {
      // Add new
      setUpiIds([...upiIds, newUpiId.trim()]);
    }
    setNewUpiId("");
    setEditingUpiId(null);
    setShowUpiModal(false);
  };

  const handleHandleSelect = (handle) => {
    let current = newUpiId.trim();
    if (current.includes("@")) {
      current = current.split("@")[0];
    }
    setNewUpiId(current + handle);
  };

  const handleEdit = (index) => {
    setEditingUpiId(index);
    setNewUpiId(upiIds[index]);
    setShowUpiModal(true);
  };

  const handleDelete = (index) => {
    Alert.alert(
      "Delete UPI ID",
      "Are you sure you want to delete this UPI ID?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setUpiIds(upiIds.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const generateQR = (upiId) => {
    setQrUpiId(upiId);
    setShowQrModal(true);
  };

  const upiLink = qrUpiId ? `upi://pay?pa=${qrUpiId}&pn=Merchant&cu=INR` : "";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" style={{ top: 20 }}/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UPI ID Control</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* UPI ID LIST */}
        <View style={styles.card}>
          <View style={styles.upiHeader}>
            <Text style={styles.sectionTitle}>UPI IDs</Text>
            <TouchableOpacity
              style={styles.addUpiBtn}
              onPress={() => {
                setEditingUpiId(null);
                setNewUpiId("");
                setShowUpiModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {upiIds.map((upiId, index) => (
            <View key={index} style={styles.upiRow}>
              <View style={styles.upiInfo}>
                <Text style={styles.upiText}>{upiId}</Text>
                <View style={styles.upiTypeContainer}>
                  <Ionicons
                    name={selectedUpiId === upiId ? "star" : "star-outline"}
                    size={16}
                    color={selectedUpiId === upiId ? "#FFD700" : "#ccc"}
                  />
                  <Text style={selectedUpiId === upiId ? styles.primaryText : styles.secondaryText}>
                    {selectedUpiId === upiId ? "Primary" : "Secondary"}
                  </Text>
                </View>
              </View>
              <View style={styles.upiActions}>
                <TouchableOpacity
                  style={selectedUpiId === upiId ? styles.selectedBtn : styles.selectBtn}
                  onPress={() => saveSelectedUpiId(upiId)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qrBtn}
                  onPress={() => generateQR(upiId)}
                >
                  <Ionicons name="qr-code" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editUpiBtn}
                  onPress={() => handleEdit(index)}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteUpiBtn}
                  onPress={() => handleDelete(index)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add/Edit UPI Modal */}
      <Modal visible={showUpiModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingUpiId !== null ? "Edit UPI ID" : "Add UPI ID"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter UPI ID (e.g., user@upi)"
              value={newUpiId}
              onChangeText={setNewUpiId}
            />

            <Text style={styles.handleLabel}>Quick Select Handles:</Text>
            <View style={styles.handleContainer}>
              {commonHandles.map((handle, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.handleChip}
                  onPress={() => handleHandleSelect(handle)}
                >
                  <Text style={styles.handleChipText}>{handle}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowUpiModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddUpiId}
              >
                <Text style={styles.modalSaveText}>
                  {editingUpiId !== null ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={showQrModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Text style={styles.modalTitle}>Scan to Pay</Text>
            <Text style={styles.qrUpiText}>{qrUpiId}</Text>

            <View style={styles.qrContainer}>
              {qrUpiId ? (
                <QRCode
                  value={upiLink}
                  size={200}
                  color="black"
                  backgroundColor="white"
                />
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.closeQrBtn}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.closeQrText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#1B4D1B",
    height: 110,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", marginLeft: 15, top: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, margin: 12, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  upiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  addUpiBtn: { backgroundColor: "#1B4D1B", padding: 8, borderRadius: 20 },
  upiRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  upiInfo: { flex: 1 },
  upiText: { fontSize: 16 },
  upiTypeContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  primaryText: { fontSize: 12, color: "#FFD700", fontWeight: "bold", marginLeft: 4 },
  secondaryText: { fontSize: 12, color: "#666", marginLeft: 4 },
  upiActions: { flexDirection: "row" },
  selectBtn: { backgroundColor: "#ccc", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  selectedBtn: { backgroundColor: "#FFD700", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  qrBtn: { backgroundColor: "#1B4D1B", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  editUpiBtn: { backgroundColor: "#2E7D32", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  deleteUpiBtn: { backgroundColor: "#d32f2f", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalInput: { backgroundColor: "#F1F3F6", borderRadius: 10, padding: 12, marginVertical: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  modalCancelBtn: { backgroundColor: "#ccc", padding: 12, borderRadius: 8, flex: 1, marginRight: 10, alignItems: "center" },
  modalCancelText: { color: "#333" },
  modalSaveBtn: { backgroundColor: "#1B4D1B", padding: 12, borderRadius: 8, flex: 1, alignItems: "center" },
  modalSaveText: { color: "#fff" },
  handleLabel: { fontSize: 13, color: "#666", marginTop: 5, marginBottom: 5 },
  handleContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  handleChip: { backgroundColor: "#E8F5E9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: "#2E7D32" },
  handleChipText: { fontSize: 13, color: "#1B4D1B", fontWeight: "600" },
  qrUpiText: { fontSize: 14, color: "#666", marginBottom: 20 },
  qrContainer: { padding: 15, backgroundColor: "#fff", borderRadius: 10, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  closeQrBtn: { marginTop: 25, backgroundColor: "#1B4D1B", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
  closeQrText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

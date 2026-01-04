import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from './config';

export default function AddSuspenseTransaction({ navigation }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [oldBalance, setOldBalance] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [paymentType, setPaymentType] = useState("Cash");

  const [statusModal, setStatusModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Success Modal State

  const saveTransaction = async () => {
    if (!name || !amount || !oldBalance || !newBalance || !date) {
      Alert.alert("Error", "Please fill all details");
      return;
    }

    try {
      const response = await fetch(`${base_url}/retail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          amount,
          oldBalance,
          newBalance,
          date,
          status,
          paymentType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Trigger the success popup instead of Alert
        setShowSuccessModal(true);
      } else {
        Alert.alert("Error", data.error || "Something went wrong");
      }
    } catch (error) {
      console.log("API Error:", error);
      Alert.alert("Error", "Failed to connect with server");
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" style={{ top: 20 }} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Retails Transaction</Text>
      </View>

      <ScrollView style={styles.container}>
        <Text style={styles.label}>Transaction Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Enter transaction name"
        />

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter amount"
        />

        <Text style={styles.label}>Old Balance (₹)</Text>
        <TextInput
          value={oldBalance}
          onChangeText={setOldBalance}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter old balance"
        />

        <Text style={styles.label}>New Balance (₹)</Text>
        <TextInput
          value={newBalance}
          onChangeText={setNewBalance}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter new balance"
        />

        <Text style={styles.label}>Date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Status</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setStatusModal(true)}>
          <Text style={styles.dropdownText}>{status}</Text>
          <Ionicons name="chevron-down" size={20} color="#1B4D1B" />
        </TouchableOpacity>

        <Text style={styles.label}>Payment Type</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setPaymentModal(true)}>
          <Text style={styles.dropdownText}>{paymentType}</Text>
          <Ionicons name="chevron-down" size={20} color="#1B4D1B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={saveTransaction}>
          <Text style={styles.saveText}>Save Transaction</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- MODALS --- */}

      {/* Status Modal */}
      <Modal transparent visible={statusModal} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setStatusModal(false)}>
          <View style={styles.modalBox}>
            {["Pending", "Completed", "Rejected"].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalItem}
                onPress={() => {
                  setStatus(option);
                  setStatusModal(false);
                }}
              >
                <Text style={styles.modalText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Type Modal */}
      <Modal transparent visible={paymentModal} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setPaymentModal(false)}>
          <View style={styles.modalBox}>
            {["Cash", "UPI", "Bank"].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalItem}
                onPress={() => {
                  setPaymentType(option);
                  setPaymentModal(false);
                }}
              >
                <Text style={styles.modalText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Popup Modal */}
      <Modal transparent visible={showSuccessModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={80} color="#1B4D1B" />
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successSubtext}>Transaction has been saved successfully.</Text>
            <TouchableOpacity style={styles.successBtn} onPress={handleSuccessClose}>
              <Text style={styles.successBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1B4D1B",
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 20,
    top: 20,
  },
  container: { padding: 20 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 15, color: "#1B4D1B" },
  input: { backgroundColor: "#f2f2f2", padding: 12, borderRadius: 10, marginTop: 8, fontSize: 16 },
  dropdown: { backgroundColor: "#f2f2f2", padding: 12, borderRadius: 10, marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  dropdownText: { fontSize: 16, color: "#333" },
  saveBtn: { backgroundColor: "#1B4D1B", padding: 15, borderRadius: 12, marginTop: 30, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", width: "70%", borderRadius: 10, paddingVertical: 10, elevation: 10 },
  modalItem: { paddingVertical: 15, paddingHorizontal: 20 },
  modalText: { fontSize: 18, color: "#1B4D1B" },
  
  /* Success Modal Styles */
  successBox: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginTop: 10,
  },
  successSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 15,
  },
  successBtn: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 10,
  },
  successBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
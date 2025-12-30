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

  const saveTransaction = () => {
    if (!name || !amount || !oldBalance || !newBalance || !date) {
      Alert.alert("Error", "Please fill all details");
      return;
    }

    Alert.alert("Success", "Transaction Added Successfully", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Suspense Transaction</Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Transaction Name */}
        <Text style={styles.label}>Transaction Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Enter transaction name"
        />

        {/* Amount */}
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter amount"
        />

        {/* Old Balance */}
        <Text style={styles.label}>Old Balance (₹)</Text>
        <TextInput
          value={oldBalance}
          onChangeText={setOldBalance}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter old balance"
        />

        {/* New Balance */}
        <Text style={styles.label}>New Balance (₹)</Text>
        <TextInput
          value={newBalance}
          onChangeText={setNewBalance}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Enter new balance"
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />

        {/* Status Drop-down */}
        <Text style={styles.label}>Status</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setStatusModal(true)}
        >
          <Text style={styles.dropdownText}>{status}</Text>
          <Ionicons name="chevron-down" size={20} color="#1B4D1B" />
        </TouchableOpacity>

        {/* Payment Type Drop-down */}
        <Text style={styles.label}>Payment Type</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setPaymentModal(true)}
        >
          <Text style={styles.dropdownText}>{paymentType}</Text>
          <Ionicons name="chevron-down" size={20} color="#1B4D1B" />
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveTransaction}>
          <Text style={styles.saveText}>Save Transaction</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Status Modal */}
      <Modal transparent visible={statusModal} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setStatusModal(false)}
        >
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
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setPaymentModal(false)}
        >
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1B4D1B",
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 20,
  },

  container: {
    padding: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    color: "#1B4D1B",
  },

  input: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    fontSize: 16,
  },

  dropdown: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },

  saveBtn: {
    backgroundColor: "#1B4D1B",
    padding: 15,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    width: "70%",
    borderRadius: 10,
    paddingVertical: 10,
    elevation: 10,
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  modalText: {
    fontSize: 18,
    color: "#1B4D1B",
  },
});

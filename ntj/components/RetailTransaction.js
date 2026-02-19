import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AddRetailTransaction({ navigation }) {
  const [weight, setWeight] = useState("");
  const [wastagePercent, setWastagePercent] = useState("");
  const [hallmark, setHallmark] = useState("");
  const [less, setLess] = useState("");
  const [rate, setRate] = useState("");
  const [goldRate, setGoldRate] = useState("12260");
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");

  // UPI ID states
  const [upiIds, setUpiIds] = useState(["user1@upi", "user2@upi", "user3@upi"]);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [editingUpiId, setEditingUpiId] = useState(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.page}>

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate("Home")}>
              <Ionicons name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Retail Transaction</Text>

            <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate("RetailTransactionHistory")}>
              <Text style={styles.historyText}>History</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

            {/* GOLD RATE */}
            <View style={styles.card}>
              <View style={styles.rateHeader}>
                <Text style={styles.goldTitle}>💰 Gold Rate</Text>

                <TouchableOpacity
                  onPress={() => setIsEditingRate(!isEditingRate)}
                  style={styles.editBtn}
                >
                  <Ionicons
                    name={isEditingRate ? "checkmark" : "create-outline"}
                    size={18}
                    color="#2E7D32"
                  />
                  <Text style={styles.editText}>
                    {isEditingRate ? "Done" : "Edit"}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditingRate ? (
                <TextInput
                  style={styles.rateInput}
                  value={goldRate}
                  onChangeText={setGoldRate}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goldValue}>₹ {goldRate} per gM</Text>
              )}
            </View>

            {/* CUSTOMER */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Customer Name"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>

            {/* ITEMS */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Items</Text>

              <TextInput style={styles.input} placeholder="Weight (g)" value={weight} onChangeText={setWeight} keyboardType="numeric"/>
              <TextInput style={styles.input} placeholder="Wastage %" value={wastagePercent} onChangeText={setWastagePercent} keyboardType="numeric"/>
              <TextInput style={styles.input} placeholder="Hallmark ₹" value={hallmark} onChangeText={setHallmark} keyboardType="numeric"/>

              <View style={styles.resultRow}>
                <View style={styles.resultBox}><Text>Wastage (g)</Text><Text>0.000</Text></View>
                <View style={styles.resultBox}><Text>Total Gold (g)</Text><Text>0.000</Text></View>
              </View>

              <TouchableOpacity style={styles.addBtn}><Text style={styles.addText}>+ Add</Text></TouchableOpacity>
            </View>

            {/* RECEIPT */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Receipt</Text>

              <TextInput style={styles.input} placeholder="Weight (g)" keyboardType="numeric"/>
              <TextInput style={styles.input} placeholder="Less (g)" value={less} onChangeText={setLess} keyboardType="numeric"/>
              <TextInput style={styles.input} placeholder="Rate ₹" value={rate} onChangeText={setRate} keyboardType="numeric"/>

              <View style={styles.resultRow}>
                <View style={styles.resultBox}><Text>Net (g)</Text><Text>0.000</Text></View>
                <View style={styles.resultBox}><Text>Value ₹</Text><Text>0.00</Text></View>
              </View>

              <TouchableOpacity style={styles.addBtn}><Text style={styles.addText}>+ Add</Text></TouchableOpacity>
            </View>

            {/* UPI ID LIST */}
            <View style={styles.card}>
              <View style={styles.upiHeader}>
                <Text style={styles.sectionTitle}>UPI IDs</Text>
                <TouchableOpacity
                  style={styles.addUpiBtn}
                  onPress={() => setShowUpiModal(true)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              {upiIds.map((upiId, index) => (
                <View key={index} style={styles.upiRow}>
                  <Text style={styles.upiText}>{upiId}</Text>
                  <View style={styles.upiActions}>
                    <TouchableOpacity
                      style={styles.qrBtn}
                      onPress={() => {
                        // Generate QR code for this UPI ID
                        alert(`Generate QR for ${upiId}`);
                      }}
                    >
                      <Ionicons name="qr-code" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editUpiBtn}
                      onPress={() => {
                        setEditingUpiId(index);
                        setNewUpiId(upiId);
                        setShowUpiModal(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteUpiBtn}
                      onPress={() => {
                        setUpiIds(upiIds.filter((_, i) => i !== index));
                      }}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* SUMMARY */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Transaction Summary</Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}><Text>Issue Total</Text><Text>₹ 0.00</Text></View>
                <View style={styles.summaryBox}><Text>Receipt Total</Text><Text>₹ 0.00</Text></View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}><Text>Owner Payable</Text><Text>₹ 0.00</Text></View>
                <View style={styles.summaryBox}><Text>Customer Payable</Text><Text>₹ 0.00</Text></View>
              </View>
            </View>

            {/* ACTIONS */}
            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.saveBtn}><Text>Save</Text></TouchableOpacity>
              <TouchableOpacity style={styles.printBtn}><Text style={{color:"#fff"}}>Save & Print</Text></TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },

  header: {
    backgroundColor: "#1B4D1B",
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  historyBtn: { backgroundColor: "#2E7D32", padding: 6, borderRadius: 12 },
  historyText: { color: "#fff" },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, margin: 12, elevation: 3 },
  goldTitle: { fontWeight: "700", fontSize: 16 },
  goldValue: { fontSize: 22, fontWeight: "700", marginTop: 6 },

  rateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  editText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },

  rateInput: {
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  input: {
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
  },

  resultRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 10 },
  resultBox: { backgroundColor: "#E8F5E9", width: "48%", borderRadius: 10, padding: 12 },

  addBtn: { backgroundColor: "#2E7D32", padding: 12, borderRadius: 18, alignItems: "center", marginTop: 10 },
  addText: { color: "#fff", fontWeight: "700" },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  summaryBox: { backgroundColor: "#F1F3F6", width: "48%", borderRadius: 10, padding: 12 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", margin: 12 },
  saveBtn: { backgroundColor: "#fff", borderRadius: 12, padding: 12, width: "45%", alignItems: "center", borderWidth: 1 },
  printBtn: { backgroundColor: "#1B5E20", borderRadius: 12, padding: 12, width: "45%", alignItems: "center" },

  // UPI styles
  upiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  addUpiBtn: { backgroundColor: "#1B4D1B", padding: 8, borderRadius: 20 },
  upiRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  upiText: { fontSize: 16, flex: 1 },
  upiActions: { flexDirection: "row" },
  qrBtn: { backgroundColor: "#1B4D1B", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  editUpiBtn: { backgroundColor: "#2E7D32", padding: 8, borderRadius: 6, marginHorizontal: 2 },
  deleteUpiBtn: { backgroundColor: "#d32f2f", padding: 8, borderRadius: 6, marginHorizontal: 2 },

  // Modal styles
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalInput: { backgroundColor: "#F1F3F6", borderRadius: 10, padding: 12, marginVertical: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  modalCancelBtn: { backgroundColor: "#ccc", padding: 12, borderRadius: 8, flex: 1, marginRight: 10, alignItems: "center" },
  modalCancelText: { color: "#333" },
  modalSaveBtn: { backgroundColor: "#1B4D1B", padding: 12, borderRadius: 8, flex: 1, alignItems: "center" },
  modalSaveText: { color: "#fff" },
});

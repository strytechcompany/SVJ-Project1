// screens/Purchase.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Purchase({ navigation }) {
  const [supplier, setSupplier] = useState("");
  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Purchase</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Supplier */}
        <Text style={styles.label}>Supplier Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter supplier name"
          value={supplier}
          onChangeText={setSupplier}
        />

        {/* Item Name */}
        <Text style={styles.label}>Item Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter item name"
          value={itemName}
          onChangeText={setItemName}
        />

        {/* Weight */}
        <Text style={styles.label}>Weight (GMS)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter weight"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />

        {/* Amount */}
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Date */}
        <Text style={styles.label}>Purchase Date</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter date (YYYY-MM-DD)"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Add notes..."
          value={notes}
          onChangeText={setNotes}
          multiline={true}
        />

        {/* SAVE BUTTON (UI only – no function) */}
        <TouchableOpacity style={styles.saveBtn}>
          <Text style={styles.saveText}>Save Purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1B4D1B",
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 12,
    fontWeight: "700",
  },
  label: {
    color: "#1B4D1B",
    fontWeight: "700",
    marginTop: 14,
  },
  input: {
    backgroundColor: "#EFEFEF",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: "#1B4D1B",
    padding: 15,
    alignItems: "center",
    borderRadius: 12,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

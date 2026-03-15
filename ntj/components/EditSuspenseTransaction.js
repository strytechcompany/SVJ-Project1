import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import CommonHeader from "./CommonHeader";

export default function EditSuspenseTransaction({ route, navigation }) {
  const { item } = route.params;

  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);
  const [date, setDate] = useState(item.date);
  const [status, setStatus] = useState(item.status);
  const [paymentType, setPaymentType] = useState(item.paymentType || "Cash"); // NEW

  const saveChanges = () => {
    Alert.alert("Success", "Transaction Updated Successfully", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const deleteTransaction = () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* Header */}
      <CommonHeader
      title="Edit Suspense Transaction"
      onBack={() => navigation.goBack()}
      backgroundColor="#1B4D1B"
      />

      <ScrollView style={styles.container}>
        
        {/* Name */}
        <Text style={styles.label}>Transaction Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        {/* Amount */}
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={styles.input}
        />

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={status}
            onValueChange={setStatus}
            style={styles.picker}
          >
            <Picker.Item label="Pending" value="Pending" />
            <Picker.Item label="Completed" value="Completed" />
            <Picker.Item label="Rejected" value="Rejected" />
          </Picker>
        </View>

        {/* NEW PAYMENT TYPE FIELD */}
        <Text style={styles.label}>Payment Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={paymentType}
            onValueChange={setPaymentType}
            style={styles.picker}
          >
            <Picker.Item label="Cash" value="Cash" />
            <Picker.Item label="UPI" value="UPI" />
            <Picker.Item label="Card" value="Card" />
            <Picker.Item label="Bank Transfer" value="Bank" />
          </Picker>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveChanges}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteBtn} onPress={deleteTransaction}>
          <Text style={styles.deleteText}>Delete Transaction</Text>
        </TouchableOpacity>

      </ScrollView>
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

  container: { padding: 20 },

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

  pickerContainer: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    marginTop: 8,
  },

  picker: {
    height: 55,
    width: "100%",
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

  deleteBtn: {
    backgroundColor: "#b30000",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    alignItems: "center",
  },

  deleteText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});

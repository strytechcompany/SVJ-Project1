// screens/AddOrder.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AddOrder({ navigation }) {
  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");

  const paymentOptions = ["UPI", "Cash", "Bank Transfer", "Card"];

  const saveOrder = () => {
    if (!itemName || !weight || !customerName || !mobile) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }

    const newOrder = {
      id: "ORDER" + Math.floor(Math.random() * 1000),
      itemName,
      weight,
      customerName,
      mobile,
      paymentType,
    };

    navigation.navigate("Order", { newOrder });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" style={{ top: 25 }}/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Order</Text>
      </View>

      {/* CONTENT */}
      <View style={{ padding: 20 }}>
        <Text style={styles.label}>Image (sample only)</Text>

        {/* ITEM NAME */}
        <Text style={styles.label}>Item Name</Text>
        <TextInput
          placeholder="Enter item name"
          style={styles.input}
          value={itemName}
          onChangeText={setItemName}
        />

        {/* ITEM WEIGHT */}
        <Text style={styles.label}>Item Weight (GMS)</Text>
        <TextInput
          placeholder="Enter item weight (e.g., 12.345)"
          style={styles.input}
          value={weight}
          keyboardType="numeric"
          onChangeText={setWeight}
        />


        {/* CUSTOMER NAME */}
        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          placeholder="Enter customer name"
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
        />

        {/* MOBILE NUMBER */}
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          placeholder="Enter mobile number"
          style={styles.input}
          value={mobile}
          keyboardType="phone-pad"
          onChangeText={setMobile}
        />

        {/* PAYMENT TYPE */}
        <Text style={styles.label}>Payment Type</Text>

        <View style={styles.paymentRow}>
          {paymentOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.payBtn,
                paymentType === option && styles.payBtnActive,
              ]}
              onPress={() => setPaymentType(option)}
            >
              <Text
                style={[
                  styles.payText,
                  paymentType === option && styles.payTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity style={styles.saveButton} onPress={saveOrder}>
          <Text style={styles.saveText}>Save Order</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 20,
    top: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    color: "#1B4D1B",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    fontSize: 15,
  },

  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  payBtn: {
    borderWidth: 1,
    borderColor: "#1B4D1B",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
  },

  payBtnActive: {
    backgroundColor: "#1B4D1B",
  },

  payText: {
    color: "#1B4D1B",
    fontWeight: "700",
  },

  payTextActive: {
    color: "#fff",
  },

  saveButton: {
    backgroundColor: "#1B4D1B",
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
});

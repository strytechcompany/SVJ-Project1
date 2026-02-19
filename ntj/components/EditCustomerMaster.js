// screens/EditCustomerMaster.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";

export default function EditCustomerMaster({ navigation, route }) {
  const customer = route.params?.customer;

  if (!customer) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 18, color: "red" }}>No customer data found</Text>
      </View>
    );
  }

  const [customerType, setCustomerType] = useState(customer.customerType);
  const [customerName, setCustomerName] = useState(customer.customerName || "");
  const [customerNumber, setCustomerNumber] = useState(customer.customerNumber || customer.phoneNumber || "");
  const [shopName, setShopName] = useState(customer.shopName || "");
  const [gstin, setGstin] = useState(customer.gstin || "");
  const [address, setAddress] = useState(customer.address || "");
  const [oldBalance, setOldBalance] = useState(customer.oldBalance?.toString() || "0.000");
  const [advanceBalance, setAdvanceBalance] = useState(customer.advanceBalance?.toString() || "0.000");
  const [workerName, setWorkerName] = useState(customer.workerName || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    // Validation
    if (!customerName.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    if (!customerNumber.trim()) {
      Alert.alert("Error", "Phone number is required");
      return;
    }

    setLoading(true);

    try {
      // Determine the correct endpoint based on customer type
      let endpoint;
      if (customerType === "B2B") {
        endpoint = `${base_url}/customers/${customer._id || customer.id}`;
      } else if (customerType === "Dealer") {
        endpoint = `${base_url}/customersDealer/${customer._id || customer.id}`;
      } else {
        endpoint = `${base_url}/customersB2C/${customer._id || customer.id}`;
      }

      // Prepare the update data
      const updateData = {
        customerName: customerName.trim(),
        phoneNumber: customerNumber.trim(),
        gstin: gstin.trim(),
        address: address.trim(),
        oldBalance: parseFloat(oldBalance) || 0,
        advanceBalance: parseFloat(advanceBalance) || 0,
        workerName: workerName.trim(),
      };

      // Add shopName only for B2B customers
      if (customerType === "B2B") {
        updateData.shopName = shopName.trim();
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success",
          "Customer updated successfully",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to update customer");
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update customer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ top: 14 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Customer</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          >
            {/* Customer Type Display */}
            <View>
              <Text style={styles.label}>Customer Type</Text>
              <View style={styles.typeContainer}>
                <Text style={styles.typeText}>{customerType}</Text>
              </View>
            </View>

            {/* Input Fields */}
            {renderInput("Customer Name *", customerName, setCustomerName)}
            {renderInput("Phone Number *", customerNumber, setCustomerNumber, "phone-pad")}
            {renderInput("GSTIN", gstin, setGstin)}

            {/* Show Shop Name only for B2B customers */}
            {customerType === "B2B" && renderInput("Shop Name", shopName, setShopName)}

            {/* Show Worker Name for Dealers */}
            {customerType === "Dealer" && renderInput("Worker Name", workerName, setWorkerName)}

            {renderInput("Address", address, setAddress)}
            {renderInput("Old Balance", oldBalance, setOldBalance, "numeric")}
            {renderInput("Advance Balance", advanceBalance, setAdvanceBalance, "numeric")}

            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Update Customer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const renderInput = (label, value, setter, keyboard = "default") => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={setter}
      keyboardType={keyboard}
      placeholder={label.replace(" *", "")}
    />
  </View>
);

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2E7D32",
    height: 110,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 25,
  },
  label: {
    marginTop: 15,
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
    fontSize: 15,
  },
  typeContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
    backgroundColor: "#f5f5f5",
  },
  typeText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 20,
  },
  saveBtnDisabled: {
    backgroundColor: "#81C784",
  },
  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
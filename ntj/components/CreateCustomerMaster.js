import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config"; 

export default function CreateCustomerMaster({ navigation, route }) {
  const customers = route.params?.customers || [];

  // Get type from navigation (B2C, B2B, or Dealer)
  const [customerType, setCustomerType] = useState(route.params?.type || "B2C");

  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [gstin, setGstin] = useState(""); // Dealer/B2B specific
  const [address, setAddress] = useState(""); // Dealer specific
  const [oldBalance, setOldBalance] = useState("");
  const [advanceBalance, setAdvanceBalance] = useState("");

  // Save customer function
  const saveCustomer = async () => {
    if (!customerName || !customerNumber) {
      Alert.alert("Error", "Name and Phone Number are required.");
      return;
    }

    // Check locally if the name already exists in the current list
    const nameExists = customers.some(
      (c) => c.customerName.toLowerCase() === customerName.trim().toLowerCase()
    );
    if (nameExists) {
      Alert.alert(
        "Duplicate Name ❌",
        `${customerType} Customer with name "${customerName}" already exists. Please use a different name.`
      );
      return;
    }

    const newCustomer = {
      customerName,
      phoneNumber: customerNumber,
      emailId: customerType !== "Dealer" ? email : undefined,
      shopName,
      gstin: undefined,
      address: customerType !== "Dealer" ? address : undefined,
      oldBalance: parseFloat(oldBalance) || 0,
      advanceBalance: parseFloat(advanceBalance) || 0,
      customerType,
    };

    try {
      let url = "";
      if (customerType === "B2C") url = `${base_url}/customersB2C`;
      else if (customerType === "B2B") url = `${base_url}/customers`;
      else if (customerType === "Dealer") url = `${base_url}/customersDealer`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      const data = await response.json();

      // Handle backend duplicate error
      if (!response.ok && data.message?.toLowerCase().includes("already exists")) {
        Alert.alert(
          "Duplicate Name ❌",
          `${customerType} Customer with name "${customerName}" already exists. Please use a different name.`
        );
        return;
      }

      // Success
      if (response.ok && data) {
        Alert.alert("Success ✅", `${customerType} Customer saved successfully`);

        // Reset form fields
        setCustomerName("");
        setCustomerNumber("");
        setEmail("");
        setShopName("");
        setGstin("");
        setAddress("");
        setOldBalance("");
        setAdvanceBalance("");

        // Navigate to type-specific list
        const listScreen = getListScreenName(customerType);
        navigation.navigate(listScreen, {
          customers: [...customers, data],
          type: customerType,
        });
      } else {
        Alert.alert("Error ❌", data.message || "Failed to save customer");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error ❌", "Something went wrong while saving customer");
    }
  };

  // Helper to get list screen name based on type
  const getListScreenName = (type) => {
    switch (type) {
      case "B2B": return "CustomerMasterListB2B";
      case "Dealer": return "CustomerMasterListDealer";
      default: return "CustomerMasterListB2C"; // B2C default
    }
  };

  // Render input helper
  const renderInput = (label, value, setter, keyboard = "default") => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label} *</Text>
      <TextInput
        style={styles.input}
        value={value}
        keyboardType={keyboard}
        onChangeText={setter}
        placeholder={label}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Create {customerType} Customer</Text>
      </View>

      {/* Keyboard Avoiding View */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 15,
            paddingBottom: 40,
            flexGrow: 1,
          }}
        >
          {/* Customer Type Selector */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, customerType === "B2B" && styles.typeActive]}
              onPress={() => setCustomerType("B2B")}
            >
              <Text style={[styles.typeText, customerType === "B2B" && styles.typeActiveText]}>
                B2B
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, customerType === "B2C" && styles.typeActive]}
              onPress={() => setCustomerType("B2C")}
            >
              <Text style={[styles.typeText, customerType === "B2C" && styles.typeActiveText]}>
                B2C
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, customerType === "Dealer" && styles.typeActive]}
              onPress={() => setCustomerType("Dealer")}
            >
              <Text style={[styles.typeText, customerType === "Dealer" && styles.typeActiveText]}>
                Dealer
              </Text>
            </TouchableOpacity>
          </View>

          {/* COMMON FIELDS - All customer types */}
          {renderInput(customerType === "Dealer" ? "Dealer Name" : "Customer Name", customerName, setCustomerName)}
          {renderInput("Phone Number", customerNumber, setCustomerNumber, "phone-pad")}

          {/* B2B SPECIFIC FIELDS */}
          {customerType === "B2B" && (
            <>
              {renderInput("Shop Name", shopName, setShopName)}
              {renderInput("Address", address, setAddress, "default")}
            </>
          )}

          {/* B2C SPECIFIC FIELDS */}
          {customerType === "B2C" && (
            <>
              {renderInput("Address", address, setAddress, "default")}
            </>
          )}

          {/* DEALER SPECIFIC FIELDS */}
          {customerType === "Dealer" && (
            <>
              {renderInput("Address", address, setAddress, "default")}
            </>
          )}

          {/* BALANCE FIELDS - All customer types */}
          {renderInput("Old Balance", oldBalance, setOldBalance, "numeric")}
          {renderInput("Advance Balance", advanceBalance, setAdvanceBalance, "numeric")}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveCustomer}>
            <Text style={styles.saveText}>Save {customerType} Customer</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  backBtn: {
    top: 14,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 25,
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },
  typeBtn: {
    width: 120,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e6e6e6",
    marginHorizontal: 6,
    alignItems: "center",
  },
  typeActive: {
    backgroundColor: "#2E7D32",
  },
  typeText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  typeActiveText: {
    color: "#fff",
    fontWeight: "700",
  },
  inputContainer: {
    marginTop: 15,
  },
  label: {
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  saveBtn: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  saveText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

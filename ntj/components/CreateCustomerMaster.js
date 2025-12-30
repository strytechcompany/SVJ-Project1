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

  // Get type from navigation (B2C or B2B)
  const [customerType, setCustomerType] = useState(route.params?.type || "B2C");

  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [oldBalance, setOldBalance] = useState("");
  const [advanceBalance, setAdvanceBalance] = useState("");

  // Save customer to API
  const saveCustomer = async () => {
    if (!customerName || !customerNumber) {
      Alert.alert("Error", "Name and Phone Number are required.");
      return;
    }

    const newCustomer = {
      customerName,
      phoneNumber: customerNumber,
      emailId: email,
      shopName,
      oldBalance: parseFloat(oldBalance) || 0,
      advanceBalance: parseFloat(advanceBalance) || 0,
    };

    try {
      let url = "";
      if (customerType === "B2C") {
        url = `${base_url}/customersB2C`;
      } else {
        url = `${base_url}/customers`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCustomer),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Customer saved successfully");
        navigation.navigate("CustomerMasterList", {
          customers: [...customers, data],
        });
      } else {
        Alert.alert("Error", data.message || "Failed to save customer");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong while saving customer");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ top: 14 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Create Customer</Text>
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
          {/* Customer Type */}
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
          </View>

          {/* Input Fields */}
          {renderInput("Customer Name", customerName, setCustomerName)}
          {renderInput("Phone Number", customerNumber, setCustomerNumber, "numeric")}
          {renderInput("Email ID", email, setEmail)}
          {customerType === "B2B" && renderInput("Shop Name", shopName, setShopName)}
          {renderInput("Old Balance", oldBalance, setOldBalance, "numeric")}
          {renderInput("Advance Balance", advanceBalance, setAdvanceBalance, "numeric")}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveCustomer}>
            <Text style={styles.saveText}>Save Customer</Text>
          </TouchableOpacity>
        </ScrollView>
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
      keyboardType={keyboard}
      onChangeText={setter}
      placeholder={label}
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
  typeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },
  typeBtn: {
    width: 120,
    paddingVertical: 10,
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
  },
  typeActiveText: {
    color: "#fff",
    fontWeight: "700",
  },
  label: {
    marginTop: 15,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  saveBtn: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 20,
  },
  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});

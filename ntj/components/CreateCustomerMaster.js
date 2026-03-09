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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function CreateCustomerMaster({ navigation, route }) {
  const customers = route.params?.customers || [];

  // Get type from navigation (B2C, B2B, or Dealer)
  const [customerType, setCustomerType] = useState(route.params?.type || "B2C");

  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [gstin, setGstin] = useState(""); // B2B/B2C specific
  const [address, setAddress] = useState(""); // Dealer specific
  const [oldBalance, setOldBalance] = useState("");
  const [advanceBalance, setAdvanceBalance] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,   // ✅ Keep base64 small to prevent upload timeout on Render
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };


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
      gstin: customerType !== "Dealer" ? gstin : undefined,
      address: customerType !== "Dealer" ? address : undefined,
      oldBalance: parseFloat(oldBalance) || 0,
      advanceBalance: parseFloat(advanceBalance) || 0,
      customerType,
      image: selectedImage,
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
        setSelectedImage(null);


        // Go back to previous screen
        navigation.goBack();
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
      case "B2B": return "B2BCalculationPage";
      case "Dealer": return "Dealer";
      default: return "B2CCalculationPage"; // B2C default
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
      <CommonHeader
        title={`Create ${customerType} Customer`}
        onBack={() => navigation.goBack()}
        backgroundColor="#2E7D32"
      />

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
              {renderInput("GST Number", gstin, setGstin)}
              {renderInput("Address", address, setAddress, "default")}
            </>
          )}

          {/* B2C SPECIFIC FIELDS */}
          {customerType === "B2C" && (
            <>
              {renderInput("Address", address, setAddress, "default")}
              {renderInput("GST Number", gstin, setGstin)}
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

          {/* Photo / Proof Image Picker */}
          <View style={styles.imagePickerSection}>
            <Text style={styles.label}>Proof / ID Photo (Optional)</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={{ width: 80, height: 80, borderRadius: 8 }}
                  />
                  <Text style={styles.imagePreviewText}>Image Selected ✅</Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={28} color="#888" />
                  <Text style={styles.imagePlaceholderText}>Tap to upload photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {selectedImage ? (
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.removeImageText}>✕ Remove Image</Text>
              </TouchableOpacity>
            ) : null}
          </View>

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
  imagePickerSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  imagePickerBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    marginTop: 5,
  },
  imagePlaceholder: {
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  imagePreviewText: {
    fontSize: 14,
    color: "#2E7D32",
    marginLeft: 8,
    fontWeight: "600",
  },
  removeImageBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
  },
  removeImageText: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "600",
  },
});

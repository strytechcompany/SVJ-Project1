import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

// Convert local image URI to base64
const uriToBase64 = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function AddOrder({ navigation }) {
  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const b2bResponse = await fetch(`${base_url}/customers`);
      const b2bData = await b2bResponse.json();

      const b2cResponse = await fetch(`${base_url}/customersB2C`);
      const b2cData = await b2cResponse.json();

      const allCustomers = [
        ...b2bData.map(c => ({ ...c, type: 'B2B', phone: c.phoneNumber })),
        ...b2cData.map(c => ({ ...c, type: 'B2C', phone: c.phoneNumber }))
      ];
      setCustomers(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleCustomerNameChange = (text) => {
    setCustomerName(text);
    if (text.length > 0) {
      const filtered = customers.filter(c =>
        c.customerName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectCustomer = (customer) => {
    setCustomerName(customer.customerName);
    setMobile(customer.phone || "");
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission to access camera is required!");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const saveOrder = async (isPrint = false) => {
    if (!itemName || !weight || !customerName || !mobile) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      let base64Image = null;
      if (selectedImage) {
        base64Image = await uriToBase64(selectedImage);
      }

      const response = await fetch(`${base_url}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName,
          itemWeight: parseFloat(weight),
          customerName,
          mobileNumber: mobile,
          deliveryDate: date,
          image: base64Image,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isPrint) {
          // Navigate to BillPreview with real saved data
          const savedOrder = data.order || data;
          navigation.navigate("BillPreview", {
            order: {
              orderNo: savedOrder.orderNo || "01",
              customer: savedOrder.customerName,
              phone: savedOrder.mobileNumber,
              type: savedOrder.itemName,
              weight: savedOrder.itemWeight,
              date: new Date(savedOrder.createdAt || new Date()).toISOString().split('T')[0],
              image: base64Image || selectedImage, 
              balance: "0",
              payment: ""
            },
            autoShare: true
          });
        } else {
          Alert.alert("Success", "Order saved successfully");
          navigation.navigate("Order", { newOrder: data.order });
        }
      } else {
        Alert.alert("Error", data.message || "Failed to save order");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>

        {/* HEADER */}
        <CommonHeader
        title="Add New Order"
        onBack={() => navigation.goBack()}
        backgroundColor="#3D2800"
        />

        {/* SCROLL CONTENT */}
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Image</Text>
          <View style={{ flexDirection: 'row', gap: 15, marginTop: 10 }}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 10 }}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 10 }}>Camera</Text>
            </TouchableOpacity>
          </View>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          )}

          <Text style={styles.label}>Order Date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            style={styles.input}
            value={date}
            onChangeText={setDate}
          />

          <Text style={styles.label}>Customer Name</Text>
          <View style={{ zIndex: 1000 }}>
            <TextInput
              placeholder="Enter customer name"
              style={styles.input}
              value={customerName}
              onChangeText={handleCustomerNameChange}
            />
            {showDropdown && filteredCustomers.length > 0 && (
              <View style={styles.dropdown}>
                {filteredCustomers.map((c, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownItem}
                    onPress={() => selectCustomer(c)}
                  >
                    <Text style={styles.dropdownItemText}>{c.customerName} ({c.phone})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            placeholder="Enter mobile number"
            style={styles.input}
            value={mobile}
            keyboardType="phone-pad"
            onChangeText={setMobile}
          />

          <Text style={styles.label}>Item Name</Text>
          <TextInput
            placeholder="Enter item name"
            style={styles.input}
            value={itemName}
            onChangeText={setItemName}
          />

          <Text style={styles.label}>Item Weight (GMS)</Text>
          <TextInput
            placeholder="Enter item weight"
            style={styles.input}
            value={weight}
            keyboardType="numeric"
            onChangeText={setWeight}
          />

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#007bff', marginTop: 15 }, loading && { opacity: 0.6 }]}
            onPress={() => saveOrder(true)}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? "Saving..." : "Print Bill"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.6 }]}
            onPress={saveOrder}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? "Saving..." : "Save Order"}</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#3D2800",
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
    color: "#3D2800",
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
  saveButton: {
    backgroundColor: "#3D2800",
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
  imageButton: {
    backgroundColor: "#3D2800",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'center',
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },
});

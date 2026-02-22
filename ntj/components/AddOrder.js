import React, { useState } from "react";
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
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

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

  const paymentOptions = ["UPI", "Cash", "Bank Transfer", "Card"];

  const saveOrder = async () => {
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
          paymentType,
          amount: parseFloat(amount) || 0,
          balanceAmount: parseFloat(balanceAmount) || 0,
          deliveryDate: date,
          image: base64Image,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Order saved successfully");
        navigation.navigate("Order", { newOrder: data.order });
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={26} color="#fff" style={{ top: 25 }} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Order</Text>
          </View>

          {/* SCROLL CONTENT */}
          <ScrollView
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

            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              placeholder="Enter customer name"
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
            />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              placeholder="Enter mobile number"
              style={styles.input}
              value={mobile}
              keyboardType="phone-pad"
              onChangeText={setMobile}
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              placeholder="Enter amount"
              style={styles.input}
              value={amount}
              keyboardType="numeric"
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Balance Amount</Text>
            <TextInput
              placeholder="Enter balance amount"
              style={styles.input}
              value={balanceAmount}
              keyboardType="numeric"
              onChangeText={setBalanceAmount}
            />

            <Text style={styles.label}>Payment Type</Text>
            <View style={styles.paymentRow}>
              {paymentOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.payBtn, paymentType === option && styles.payBtnActive]}
                  onPress={() => setPaymentType(option)}
                >
                  <Text style={[styles.payText, paymentType === option && styles.payTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && { opacity: 0.6 }]}
              onPress={saveOrder}
              disabled={loading}
            >
              <Text style={styles.saveText}>{loading ? "Saving..." : "Save Order"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#007bff', marginTop: 15 }]}
              onPress={() => {
                if (!itemName || !weight || !customerName || !mobile) {
                  Alert.alert("Missing Fields", "Please fill all fields before printing.");
                  return;
                }
                const orderNo = `A202601${Math.floor(1000 + Math.random() * 9000)}`;
                navigation.navigate("BillPreview", {
                  order: {
                    orderNo,
                    customer: customerName,
                    phone: mobile,
                    type: itemName,
                    weight,
                    payment: paymentType,
                    date,
                    balance: balanceAmount || "0",
                    image: selectedImage,
                  }
                });
              }}
            >
              <Text style={styles.saveText}>Print Bill</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  payBtnActive: { backgroundColor: "#1B4D1B" },
  payText: { color: "#1B4D1B", fontWeight: "700" },
  payTextActive: { color: "#fff" },
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
  imageButton: {
    backgroundColor: "#1B4D1B",
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
});

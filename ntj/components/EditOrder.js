// screens/EditOrder.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from 'expo-image-picker';
import { base_url } from "./config";

export default function EditOrder({ route, navigation }) {
  const { order } = route.params;

  const [customer, setCustomer] = useState(order.customer);
  const [worker, setWorker] = useState(order.worker);
  const [date, setDate] = useState(order.date);
  const [phone, setPhone] = useState(order.phone);
  const [type, setType] = useState(order.type);
  const [status, setStatus] = useState(order.status);
  const [image, setImage] = useState(order.image);
  const [weight, setWeight] = useState(order.weight?.toString() || "");
  const [payment, setPayment] = useState(order.payment || "Cash");
  const [balance, setBalance] = useState(order.balanceAmount?.toString() || "0");

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const saveChanges = () => {
    const updatedOrder = {
      ...order,
      customer,
      worker,
      date,
      phone,
      type,
      status,
      image,
      weight: parseFloat(weight) || 0,
      payment: payment,
      balanceAmount: parseFloat(balance) || 0,
    };

    navigation.navigate("Order", { updatedOrder });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Order</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* IMAGE SECTION */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={styles.imageContainer}>
            {image ? (
              <Image
                source={{ uri: image.startsWith('http') || image.startsWith('file') ? image : `${base_url}/${image}` }}
                style={styles.image}
              />
            ) : (
              <Ionicons name="image-outline" size={60} color="#ccc" />
            )}
          </View>
          <TouchableOpacity style={styles.changeImgBtn} onPress={pickImage}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.changeImgText}>Change Image</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Customer</Text>
        <TextInput style={styles.input} value={customer} onChangeText={setCustomer} />

        <Text style={styles.label}>Worker</Text>
        <TextInput style={styles.input} value={worker} onChangeText={setWorker} />

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>Item Name</Text>
        <TextInput style={styles.input} value={type} onChangeText={setType} />

        <Text style={styles.label}>Weight (GMS)</Text>
        <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" />

        <Text style={styles.label}>Balance Amount (₹)</Text>
        <TextInput style={styles.input} value={balance} onChangeText={setBalance} keyboardType="numeric" />

        <Text style={styles.label}>Payment Type</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={payment} onValueChange={setPayment}>
            <Picker.Item label="Cash" value="Cash" />
            <Picker.Item label="UPI" value="UPI" />
            <Picker.Item label="Bank Transfer" value="Bank Transfer" />
            <Picker.Item label="Card" value="Card" />
          </Picker>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={status} onValueChange={setStatus}>
            <Picker.Item label="Pending" value="Pending" />
            <Picker.Item label="Assigned" value="Assigned" />
            <Picker.Item label="Completed" value="Completed" />
            <Picker.Item label="Cancelled" value="Cancelled" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#007bff', marginTop: 15 }]}
          onPress={() => {
            const orderNo = `A202601${(order.id || "").slice(-6).toUpperCase()}`;
            navigation.navigate("BillPreview", {
              order: {
                orderNo: orderNo,
                customer: customer,
                phone: phone,
                type: type,
                weight: weight,
                payment: payment,
                date: date,
                balance: balance,
                image: image,
                dealer: order.dealerName
              }
            });
          }}
        >
          <Text style={styles.saveText}>Print Bill</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 30, // Adjusted for status bar
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    marginLeft: 20,
    fontWeight: "700",
  },
  label: {
    fontSize: 15,
    marginTop: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: "#1B4D1B",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  imageContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  changeImgBtn: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
  },
  changeImgText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 5,
  }
});

// screens/EditOrder.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export default function EditOrder({ route, navigation }) {
  const { order } = route.params;

  const [customer, setCustomer] = useState(order.customer);
  const [worker, setWorker] = useState(order.worker);
  const [date, setDate] = useState(order.date);
  const [phone, setPhone] = useState(order.phone);
  const [type, setType] = useState(order.type);
  const [status, setStatus] = useState(order.status);

  const saveChanges = () => {
    const updatedOrder = {
      ...order,
      customer,
      worker,
      date,
      phone,
      type,
      status,
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

      <View style={{ padding: 20 }}>
        <Text style={styles.label}>Customer</Text>
        <TextInput style={styles.input} value={customer} onChangeText={setCustomer} />

        <Text style={styles.label}>Worker</Text>
        <TextInput style={styles.input} value={worker} onChangeText={setWorker} />

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>Type</Text>
        <TextInput style={styles.input} value={type} onChangeText={setType} />

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
      </View>
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
});

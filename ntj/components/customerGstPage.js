import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";

export default function CustomerGstPage({ navigation }) {
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const readResponseBody = async (response) => {
    const text = await response.text();
    if (!text) return { data: null, raw: "" };
    try {
      return { data: JSON.parse(text), raw: text };
    } catch (_) {
      return { data: null, raw: text };
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/gstCustomers`);
      if (response.ok) {
        const { data } = await readResponseBody(response);
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        const { data, raw } = await readResponseBody(response);
        Alert.alert("Error", data?.message || raw || "Failed to load GST customers");
      }
    } catch (error) {
      console.error("GST customers fetch error:", error);
      Alert.alert("Error", "Could not load GST customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const resetForm = () => {
    setCustomerName("");
    setPhoneNumber("");
    setAddress("");
    setGstNumber("");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!customerName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert("Error", "Customer Name, Phone Number, and Address are required.");
      return;
    }

    const payload = {
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      gstin: gstNumber.trim(),
    };

    try {
      setLoading(true);
      const url = editingId
        ? `${base_url}/gstCustomers/${editingId}`
        : `${base_url}/gstCustomers`;
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data: result, raw } = await readResponseBody(response);
      if (!response.ok) {
        Alert.alert("Error", result?.message || raw || "Failed to save GST customer");
        return;
      }

      Alert.alert("Success", editingId ? "GST customer updated" : "GST customer added");
      resetForm();
      await fetchCustomers();
    } catch (error) {
      console.error("GST customer save error:", error);
      Alert.alert("Error", "Failed to save GST customer");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setCustomerName(item.customerName || "");
    setPhoneNumber(item.phoneNumber || "");
    setAddress(item.address || "");
    setGstNumber(item.gstin || "");
    setEditingId(item._id);
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Customer", `Delete ${item.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const response = await fetch(`${base_url}/gstCustomers/${item._id}`, {
              method: "DELETE",
            });
            if (response.ok) {
              setCustomers((prev) => prev.filter((c) => c._id !== item._id));
              Alert.alert("Success", "GST customer deleted");
            } else {
              const { data, raw } = await readResponseBody(response);
              Alert.alert("Error", data?.message || raw || "Failed to delete GST customer");
            }
          } catch (error) {
            console.error("GST customer delete error:", error);
            Alert.alert("Error", "Failed to delete GST customer");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleSelectCustomer = (item) => {
    navigation.navigate("B2BCalculationPage", {
      gstCustomer: {
        id: item._id,
        name: item.customerName,
        phone: item.phoneNumber,
        address: item.address,
        gst: item.gstin,
        customerType: "B2B",
        isGstCustomer: true,
      },
      billTypeLabel: "GST",
      forceGstEnabled: true,
    });
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="GST Customers"
        onBack={() => navigation.goBack()}
        backgroundColor="#1B4D1B"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Customer Entry</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter address"
              multiline
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter GST number"
              value={gstNumber}
              onChangeText={setGstNumber}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>{editingId ? "Update" : "Save"} Customer</Text>
              )}
            </TouchableOpacity>
            {editingId ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={loading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>GST Customers</Text>
            <TouchableOpacity onPress={fetchCustomers} disabled={loading}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading && customers.length === 0 ? (
            <ActivityIndicator size="large" color="#1B4D1B" style={{ marginTop: 20 }} />
          ) : (
            customers.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.card}
                onPress={() => handleSelectCustomer(item)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName}</Text>
                  <Text style={styles.cardText}>Phone: {item.phoneNumber}</Text>
                  <Text style={styles.cardText}>GST No: {item.gstin || "N/A"}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#444",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: "#ECEFF1",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelText: {
    color: "#37474F",
    fontWeight: "bold",
    fontSize: 14,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  refreshText: {
    color: "#1B4D1B",
    fontWeight: "bold",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: "#555",
  },
  cardActions: {
    marginLeft: 10,
    gap: 6,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: "#E3F2FD",
  },
  deleteBtn: {
    backgroundColor: "#FFEBEE",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
});

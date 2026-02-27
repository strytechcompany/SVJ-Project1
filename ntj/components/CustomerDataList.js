// screens/CustomerMasterList.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";

import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

const CustomerCard = ({
  item,
  handleViewBill,
  handlePhonePress,
  handleWhatsApp,
  handleEdit,
  handleDelete,
}) => {
  const opacityValue = useRef(new Animated.Value(1)).current;

  const oldBalance = Number(item.oldBalance || 0);
  const advanceBalance = Number(item.advanceBalance || 0);
  const updatedAt = item.updatedAt;

  const getBalanceInfo = () => {
    if (advanceBalance > 0) return { color: "#2E7D32", blinking: false }; // Green for Advance
    if (oldBalance > 0) {
      if (!updatedAt) return { color: "#000", blinking: false };
      const lastDate = new Date(updatedAt);
      const now = new Date();
      const diffTime = Math.abs(now - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) return { color: "#2196F3", blinking: false }; // Blue (1st day)
      if (diffDays === 2) return { color: "#000000", blinking: false }; // Black (2nd day)
      if (diffDays === 3 || diffDays === 4)
        return { color: "#F44336", blinking: false }; // Red (3rd/4th day)
      if (diffDays >= 5) return { color: "#F44336", blinking: true }; // Red + Blinking (5th day+)
    }
    return { color: "#000", blinking: false };
  };

  const { color: valueColor, blinking } = getBalanceInfo();

  useEffect(() => {
    let animation;
    if (blinking) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else {
      opacityValue.stopAnimation();
      opacityValue.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [blinking]);

  const customerId = item.customerId || item.id;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => handleViewBill(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.customerType}</Text>
          </View>

          <Text style={styles.name}>{item.customerName}</Text>

          <View style={styles.iconRow}>
            <TouchableOpacity
              onPress={() => handlePhonePress(item.customerNumber)}
            >
              <Icon name="phone" size={22} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleWhatsApp(item.customerNumber)}
            >
              <Icon name="whatsapp" size={22} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <Icon name="pencil" size={22} color="#2D89EF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Icon name="delete" size={22} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sub}>Customer ID: {customerId}</Text>
        <Text style={styles.sub}>{item.shopName}</Text>

        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceTitle}>Old Balance</Text>
            <Animated.Text
              style={[
                styles.balanceValue,
                { color: valueColor, opacity: blinking ? opacityValue : 1 },
              ]}
            >
              {oldBalance.toFixed(3)}
            </Animated.Text>
          </View>

          <View style={styles.line} />

          <View>
            <Text style={styles.balanceTitle}>Advance Bal</Text>
            <Animated.Text
              style={[
                styles.balanceValue,
                {
                  color: advanceBalance > 0 ? "#2E7D32" : "#FF6F00",
                },
              ]}
            >
              {advanceBalance.toFixed(3)}
            </Animated.Text>
          </View>
        </View>

        <Text style={styles.lastPaidText}>
          Last Paid: {new Date(item.updatedAt).toLocaleDateString()}{" "}
          {new Date(item.updatedAt).toLocaleTimeString()}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CustomerMasterList({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, []),
  );

  const fetchCustomers = async () => {
    try {
      const b2bResponse = await fetch(`${base_url}/customers`);
      const b2bData = await b2bResponse.json();

      const b2cResponse = await fetch(`${base_url}/customersB2C`);
      const b2cData = await b2cResponse.json();

      const b2bCustomers = b2bData.map((customer) => ({
        ...customer,
        customerType: "B2B",
        customerNumber: customer.phoneNumber,
        // Add shop name field - adjust based on your API response
        shopName: customer.shopName || customer.companyName || "No Shop Name",
        // Add balance fields - adjust based on your API response
        oldBalance: customer.oldBalance || "0.000",
        advanceBalance: customer.advanceBalance || "0.000",
        billCurrentBalance: customer.billCurrentBalance || "0.000",
        updatedAt: customer.updatedAt || new Date().toISOString(),
      }));

      const b2cCustomers = b2cData.map((customer) => ({
        ...customer,
        customerType: "B2C",
        customerNumber: customer.phoneNumber,
        shopName: "No Shop Name",
        // Add balance fields - adjust based on your API response
        oldBalance: customer.oldBalance || "0.000",
        advanceBalance: customer.advanceBalance || "0.000",
        updatedAt: customer.updatedAt || new Date().toISOString(),
      }));

      const allCustomers = [...b2bCustomers, ...b2cCustomers];
      setCustomers(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const filteredData = customers.filter((item) => {
    const matchesSearch = item.customerName
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesType = filter === "ALL" || item.customerType === filter;

    return matchesSearch && matchesType;
  });

  const handleEdit = (customer) => {
    navigation.navigate("EditCustomerMaster", { customer });
  };

  const handleDelete = async (customer) => {
    Alert.alert("Delete Customer", `Delete ${customer.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const endpoint =
              customer.customerType === "B2B" ? "/customers" : "/customersB2C";
            const response = await fetch(
              `${base_url}${endpoint}/${customer.customerId || customer.id}`,
              {
                method: "DELETE",
              },
            );

            if (response.ok) {
              setCustomers(
                customers.filter(
                  (c) =>
                    (c.customerId || c.id) !==
                    (customer.customerId || customer.id),
                ),
              );
              Alert.alert("Success", "Customer deleted successfully");
            } else {
              Alert.alert("Error", "Failed to delete customer");
            }
          } catch (error) {
            console.error("Error deleting customer:", error);
            Alert.alert("Error", "Failed to delete customer");
          }
        },
      },
    ]);
  };

  const handlePhonePress = (phone) => {
    if (!phone) {
      Alert.alert("Error", "Phone number not available");
      return;
    }

    // Clean the phone number: remove spaces, dashes, and other non-numeric characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const url = `tel:${cleanPhone}`;

    Linking.openURL(url).catch((err) => {
      console.error("Error opening dialer:", err);
      Alert.alert("Error", "Unable to open dialer");
    });
  };

  const handleWhatsApp = (phone) => {
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  const handleAdd = () => {
    navigation.navigate("CreateCustomerMaster", { customers });
  };

  const handleViewBill = (customer) => {
    navigation.navigate("BillHistory", { customer });
  };

  const renderItem = ({ item }) => {
    return (
      <CustomerCard
        item={item}
        handleViewBill={handleViewBill}
        handlePhonePress={handlePhonePress}
        handleWhatsApp={handleWhatsApp}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ top: 15 }}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={{ alignItems: "center", flex: 1, top: 15 }}>
            <Text style={styles.fileTitle}>Customer Data List</Text>
            <Text style={styles.totalText}>
              Total Customers: {filteredData.length}
            </Text>
          </View>

          <View style={{ width: 26 }} />
        </View>

        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#888" />
          <TextInput
            placeholder="Search Customer..."
            style={styles.search}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* COLOR LEGEND */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
          <Text style={styles.legendText}>1st Day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#000000" }]} />
          <Text style={styles.legendText}>2nd Day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F44336" }]} />
          <Text style={styles.legendText}>3rd Day+</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2E7D32" }]} />
          <Text style={styles.legendText}>Advance</Text>
        </View>
      </View>

      {/* FILTER BUTTONS */}
      <View style={styles.filterRow}>
        {["ALL", "B2B", "B2C"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterBtn, filter === item && styles.filterActive]}
          >
            <Text
              style={[styles.filterText, filter === item && { color: "#fff" }]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
      />

      {/* FLOATING ADD BUTTON */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F6" },

  header: {
    backgroundColor: "#1B4D1B",
    paddingTop: Platform.OS === "ios" ? 65 : 25,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  headerRow: { flexDirection: "row", alignItems: "center" },

  fileTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  totalText: { color: "#FFD54F", fontSize: 14, marginTop: 4 },

  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  search: { marginLeft: 10, flex: 1 },

  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 10,
  },

  filterBtn: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  filterActive: { backgroundColor: "#2E7D32" },

  filterText: { fontWeight: "bold", color: "#333" },

  card: {
    backgroundColor: "#fff",
    margin: 10,
    borderRadius: 15,
    padding: 15,
  },

  cardHeader: { flexDirection: "row", alignItems: "center" },

  tag: {
    backgroundColor: "#222",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { color: "#fff", fontSize: 12 },

  name: { fontSize: 16, fontWeight: "bold", flex: 1, marginLeft: 10 },

  iconRow: { flexDirection: "row", gap: 10 },

  sub: { color: "#666", marginTop: 4 },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  balanceTitle: { color: "#000", fontSize: 14 },
  balanceValue: { fontSize: 16, fontWeight: "bold" },
  lastPaidText: {
    fontSize: 11,
    color: "#e87911ff",
    marginTop: 8,
    fontStyle: "italic",
    textAlign: "right",
  },

  line: { width: 1, backgroundColor: "#ddd" },

  addBtn: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2E7D32",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  cardTouchable: {
    flex: 1,
  },

  paymentSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  paymentInput: {
    flex: 1,
    backgroundColor: "#F1F3F6",
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },

  paymentBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  paymentBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 10,
    borderRadius: 15,
    elevation: 2,
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
});

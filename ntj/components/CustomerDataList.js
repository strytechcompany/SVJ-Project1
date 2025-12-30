// screens/CustomerMasterList.js
import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";

export default function CustomerMasterList({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const b2bResponse = await fetch(`${base_url}/customers`);
      const b2bData = await b2bResponse.json();
      
      const b2cResponse = await fetch(`${base_url}/customersB2C`);
      const b2cData = await b2cResponse.json();

      const b2bCustomers = b2bData.map(customer => ({
        ...customer,
        customerType: 'B2B',
        customerNumber: customer.phoneNumber,
        // Add shop name field - adjust based on your API response
        shopName: customer.shopName || customer.companyName || "No Shop Name",
        // Add balance fields - adjust based on your API response
        oldBalance: customer.oldBalance || "0.000",
        advanceBalance: customer.advanceBalance || "0.000",
      }));

      const b2cCustomers = b2cData.map(customer => ({
        ...customer,
        customerType: 'B2C',
        customerNumber: customer.phoneNumber,
        shopName: "No Shop Name",
        // Add balance fields - adjust based on your API response
        oldBalance: customer.oldBalance || "0.000",
        advanceBalance: customer.advanceBalance || "0.000",
      }));

      const allCustomers = [...b2bCustomers, ...b2cCustomers];
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  const handleDelete = (customer) => {
    Alert.alert("Delete Customer", `Delete ${customer.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          setCustomers(customers.filter((c) => c.customerId !== customer.customerId)),
      },
    ]);
  };

  const handleWhatsApp = (phone) => {
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  const handleAdd = () => {
    navigation.navigate("CreateCustomerMaster", { customers });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.customerType}</Text>
        </View>

        <Text style={styles.name}>{item.customerName}</Text>

        <View style={styles.iconRow}>
          <TouchableOpacity onPress={() => handleWhatsApp(item.customerNumber)}>
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

      <Text style={styles.sub}>Customer ID: {item.customerId || item.id}</Text>
      <Text style={styles.sub}>{item.shopName}</Text>

      <View style={styles.balanceRow}>
        <View>
          <Text style={styles.balanceTitle}>Old Balance</Text>
          <Text style={styles.balanceValue}>{item.oldBalance}</Text>
        </View>

        <View style={styles.line} />

        <View>
          <Text style={styles.balanceTitle}>Advance Balance</Text>
          <Text style={styles.balanceValue}>{item.advanceBalance}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={styles.fileTitle}>Customer Master</Text>
            <Text style={styles.totalText}>
              Total Customers: {filteredData.length}
            </Text>
          </View>

          <View style={{ width: 26 }} />
        </View>

        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#888" />
          <TextInput
            placeholder="Search Customer"
            style={styles.search}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* FILTER BUTTONS */}
      <View style={styles.filterRow}>
        {["ALL", "B2B", "B2C"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[
              styles.filterBtn,
              filter === item && styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && { color: "#fff" },
              ]}
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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

  balanceTitle: { color: "#777", fontSize: 12 },
  balanceValue: { fontSize: 16, fontWeight: "bold" },

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
});
// screens/CustomerMasterList.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";

export default function CustomerMasterList({ navigation, route }) {
  const [customers, setCustomers] = useState([]);

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
        customerNumber: customer.phoneNumber
      }));

      const b2cCustomers = b2cData.map(customer => ({
        ...customer,
        customerType: 'B2C',
        customerNumber: customer.phoneNumber
      }));

      const allCustomers = [...b2bCustomers, ...b2cCustomers];
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ top: 14 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Customer Master</Text>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("EditCustomerMaster", { customer: item })}
          >
            <Text style={styles.cardTitle}>{item.customerName}</Text>
            <Text style={styles.cardSubtitle}>Phone: {item.customerNumber}</Text>
            <Text style={styles.cardSubtitle}>Type: {item.customerType}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("CreateCustomerMaster", {
            customers: customers,
          })
        }
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
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
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 25,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4D1B",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#444",
    marginTop: 3,
  },
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#2E7D32",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
});

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

export default function Dealer({ navigation, route }) {
  const [dealers, setDealers] = useState([]);

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    try {
      const response = await fetch(`${base_url}/dealers`);
      const data = await response.json();

      const dealerList = data.map(dealer => ({
        ...dealer,
        customerType: 'Dealer',
        customerNumber: dealer.phoneNumber
      }));

      setDealers(dealerList);
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ top: 14 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Dealer Master</Text>
      </View>

      <FlatList
        data={dealers}
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
            customers: dealers,
            type: "Dealer",
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

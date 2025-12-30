// screens/ViewOrder.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ViewOrder({ navigation, route }) {
  const { order } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>Order ID</Text>
        <Text style={styles.value}>{order.id}</Text>

        <Text style={styles.label}>Customer</Text>
        <Text style={styles.value}>{order.customer}</Text>

        <Text style={styles.label}>Worker</Text>
        <Text style={styles.value}>{order.worker}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{order.date}</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{order.phone}</Text>

        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{order.type}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{order.status}</Text>
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
  box: {
    padding: 20,
    margin: 15,
    backgroundColor: "#fff",
    elevation: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  value: {
    fontSize: 15,
    color: "#444",
  },
});

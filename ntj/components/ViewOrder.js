import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CommonHeader from "./CommonHeader";

export default function ViewOrder({ navigation, route }) {
  const { order } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <CommonHeader
      title="Order Details"
      onBack={() => navigation.goBack()}
      backgroundColor="#3D2800"
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.box}>
          {order.image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: order.image }} style={styles.image} resizeMode="contain" />
            </View>
          )}

          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.value}>{order.id}</Text>

          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{order.customer}</Text>

          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{order.date}</Text>

          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{order.phone}</Text>

          <Text style={styles.label}>Item Name</Text>
          <Text style={styles.value}>{order.type}</Text>

          <Text style={styles.label}>Weight</Text>
          <Text style={styles.value}>{order.weight} GMS</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{order.status}</Text>

          {(order.assignedAt || order.dealerName) && (
            <>
              <Text style={styles.label}>Assigned Dealer</Text>
              <Text style={styles.value}>{order.dealerName || "N/A"}</Text>
              {order.assignedAt && (
                <>
                  <Text style={styles.label}>Assigned Date</Text>
                  <Text style={styles.value}>{new Date(order.assignedAt).toLocaleString()}</Text>
                </>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.printButton]}
            onPress={() => {
              const orderNo = order.orderNo || "01";
              navigation.navigate("BillPreview", {
                order: { ...order, orderNo, balance: order.balanceAmount || order.balance }
              });
            }}
          >
            <Ionicons name="printer" size={24} color="#fff" />
            <Text style={styles.printButtonText}>Print Bill</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#3D2800",
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
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  printButton: {
    backgroundColor: "#007bff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 25,
  },
  printButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
});

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CommonHeader from "./CommonHeader";

export default function ViewSuspenseDetails({ route, navigation }) {
  const { transaction } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <CommonHeader
      title="Suspense Details"
      onBack={() => navigation.goBack()}
      backgroundColor="#1B4D1B"
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.label}>Transaction Name</Text>
          <Text style={styles.value}>{transaction.name}</Text>

          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{transaction.amount}</Text>

          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{transaction.date}</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={[styles.statusText, 
            transaction.status === "Pending"
              ? styles.statusPending
              : transaction.status === "Completed"
              ? styles.statusCompleted
              : styles.statusRejected,
          ]}>
            {transaction.status}
          </Text>

          <Text style={styles.label}>Payment Type</Text>
          <Text style={styles.value}>
            {transaction.paymentType ? transaction.paymentType : "Not Available"}
          </Text>

          <Text style={styles.label}>Transaction ID</Text>
          <Text style={styles.value}>{transaction.id}</Text>
        </View>

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
    paddingTop: 25,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 20,
  },

  container: {
    padding: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    marginTop: 10,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B4D1B",
    marginTop: 15,
  },

  value: {
    fontSize: 18,
    color: "#333",
    marginTop: 4,
  },

  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    borderRadius: 6,
  },

  statusPending: { backgroundColor: "#FFCC00", color: "#333" },
  statusCompleted: { backgroundColor: "#1B4D1B", color: "#fff" },
  statusRejected: { backgroundColor: "#b30000", color: "#fff" },
});

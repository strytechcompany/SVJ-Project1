import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function PaymentHistory({ navigation }) {
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`${base_url}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data);
      } else {
        console.error("Failed to fetch payment history");
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>Date: {new Date(item.date || item.createdAt).toLocaleDateString()}</Text>
      <Text style={styles.historyText}>
        Dealer: <Text style={styles.dealerName}>{item.selectedDealer || "N/A"}</Text>
      </Text>
      <Text style={styles.historyText}>
        Total Metal: <Text style={styles.weightText}>{item.totalMetal} g</Text>
      </Text>
      <Text style={styles.historyText}>Total Cash: ₹ {item.totalCash}</Text>
      <Text style={styles.historyText}>Total Pure: {item.totalPure} g</Text>
      <Text style={styles.historyText}>Cash Paid: ₹ {item.cashPaid}</Text>
    </View>
  );

  const renderDealerTransferItem = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>Date: {new Date(item.date || item.createdAt).toLocaleDateString()}</Text>
      <Text style={styles.historyText}>
        Dealer: <Text style={styles.dealerName}>{item.selectedDealer || "N/A"}</Text>
      </Text>
      <Text style={styles.historyText}>
        Total Selected Weight: <Text style={styles.weightText}>{item.totalSelectedWeight} g</Text>
      </Text>
      <Text style={styles.historyText}>
        Weight Subtraction: <Text style={styles.weightText}>{item.weightSubtraction} g</Text>
      </Text>
      <Text style={styles.historyText}>
        Transfer Weight: <Text style={styles.weightText}>{item.transferWeight} g</Text>
      </Text>
      <Text style={styles.historyText}>
        Selected Items: {item.selectedItems?.join(', ') || "N/A"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <CommonHeader
      title="Payment History"
      backgroundColor="#2E5B17"
      insideSafeArea
      left={
      <TouchableOpacity onPress={() => navigation.navigate("Payments")}> 
      <Icon name="arrow-left" size={26} color="#fff" />
      </TouchableOpacity>
      }
      />

      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Payments</Text>
        <FlatList
          data={paymentHistory}
          keyExtractor={(item) => item._id?.toString() || item.createdAt}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No payment history available</Text>
          }
        />

        <Text style={styles.sectionTitle}>Dealer Transfers</Text>
        <FlatList
          data={dealerTransferHistory}
          keyExtractor={(item) => item._id?.toString() || item.createdAt}
          renderItem={renderDealerTransferItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No dealer transfer history available</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2E5B17",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: 120,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    top: "30%",
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f7fa",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#2E5B17",
  },
  listContainer: {
    paddingBottom: 20,
  },
  historyItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  historyText: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 50,
  },
  dealerName: {
    color: "#B8860B",
    fontWeight: "bold",
  },
  weightText: {
    color: "#E53935",
    fontWeight: "bold",
  },
});

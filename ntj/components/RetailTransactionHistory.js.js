import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RetailTransactionHistory({ navigation }) {
  const [search, setSearch] = useState("");

  return (
    <View style={styles.page}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("RetailTransaction")}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Retail Transaction History</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, mobile or transaction ID"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* DATE FILTER */}
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>From Date</Text>
            <View style={styles.dateInput}>
              <Text>11-01-2026</Text>
              <Ionicons name="calendar" size={18} color="#777" />
            </View>
          </View>

          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>To Date</Text>
            <View style={styles.dateInput}>
              <Text>11-01-2026</Text>
              <Ionicons name="calendar" size={18} color="#777" />
            </View>
          </View>
        </View>

        {/* GOLD RATE CARD */}
        <View style={styles.goldCard}>
          <Text style={styles.goldLabel}>Current Gold Rate (24K)</Text>
          <Text style={styles.goldValue}>₹ 12260</Text>
        </View>

        {/* TRANSACTION CARD */}
        <View style={styles.transactionCard}>
          <View style={styles.transactionTop}>
            <Text style={styles.transactionId}>Transaction ID: AKSD198</Text>
            <Text style={styles.transactionDate}>2026-01-11</Text>
            <TouchableOpacity style={styles.viewBtn}>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.customerName}>Sudharshan</Text>

          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Issues Tot (₹): ₹12383.6</Text>
              <Text style={styles.amountLabel}>Receipt Tot (₹): ₹270.00</Text>
            </View>
            <View>
              <Text style={styles.amountLabel}>Customer Payable: ₹12113.6</Text>
              <Text style={styles.amountLabel}>Owner Pay (₹): 0</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F6F9" },

  header: {
    backgroundColor: "#1B4D1B",
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 15,
  },

  searchBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 14,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    padding: 12,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 14,
  },
  dateBox: { width: "48%" },
  dateLabel: { marginBottom: 6, fontWeight: "600" },
  dateInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 2,
  },

  goldCard: {
    backgroundColor: "#FFF7E0",
    borderRadius: 14,
    padding: 16,
    margin: 14,
  },
  goldLabel: { fontWeight: "600" },
  goldValue: { fontSize: 22, fontWeight: "700", marginTop: 6 },

  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 14,
    elevation: 3,
  },

  transactionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transactionId: { fontWeight: "600", fontSize: 13 },
  transactionDate: { fontSize: 12, color: "#666" },

  viewBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  viewText: { color: "#2E7D32", fontWeight: "700" },

  customerName: { fontSize: 18, fontWeight: "700", marginVertical: 10 },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLabel: { fontSize: 13, marginVertical: 2 },
});

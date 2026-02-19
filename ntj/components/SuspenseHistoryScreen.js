import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function SuspenseHistoryScreen({ navigation }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem("suspense_history");
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load suspense history", e);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const name = tx.customer?.name || "";
    const mobile = tx.customer?.mobile || "";
    const id = tx.id || "";
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || mobile.includes(q) || id.toLowerCase().includes(q);
  });

  return (
    <View style={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" style={{ left: "3%", top: 10 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suspense Transaction History</Text>
      </View>

      <ScrollView>
        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            placeholder="Search by name, mobile or transaction ID"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* DATE FILTER (Placeholder logic for now) */}
        <View style={styles.filterRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>From Date</Text>
            <TextInput value={fromDate} onChangeText={setFromDate} style={styles.dateInput} placeholder="DD/MM/YYYY" />
          </View>

          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>To Date</Text>
            <TextInput value={toDate} onChangeText={setToDate} style={styles.dateInput} placeholder="DD/MM/YYYY" />
          </View>
        </View>

        <Text style={styles.resultText}>{filteredTransactions.length} transaction(s) found</Text>

        {/* TRANSACTION CARD */}
        {filteredTransactions.map((tx) => (
          <View key={tx.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.txId}>ID: {tx.id}</Text>
              <Text style={styles.txDate}>{tx.customer.date}</Text>
            </View>

            <Text style={styles.name}>{tx.customer.name}</Text>
            <Text style={styles.mobile}>Mobile: {tx.customer.phone || 'N/A'}</Text>
            <Text style={styles.mobile}>Address: {tx.customer.address || 'N/A'}</Text>

            {/* ISSUE TABLE */}
            {tx.suspense.issueItems && tx.suspense.issueItems.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>Issue Items</Text>
                <View style={[styles.tableHeader, { backgroundColor: '#FFEBEE' }]}>
                  <Text style={styles.cell}>Item</Text>
                  <Text style={styles.cell}>Weight</Text>
                  <Text style={styles.cell}>Pure</Text>
                </View>
                {tx.suspense.issueItems.map((item, i) => (
                  <View key={'issue-' + i} style={styles.tableRow}>
                    <Text style={styles.cell}>{item.name}</Text>
                    <Text style={styles.cell}>{item.weight}</Text>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{item.pure.toFixed(3)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* RECEIPT TABLE */}
            {tx.suspense.receiptItems && tx.suspense.receiptItems.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>Receipt Items</Text>
                <View style={[styles.tableHeader, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.cell}>Item</Text>
                  <Text style={styles.cell}>Weight</Text>
                  <Text style={styles.cell}>Pure</Text>
                </View>
                {tx.suspense.receiptItems.map((item, i) => (
                  <View key={'receipt-' + i} style={styles.tableRow}>
                    <Text style={styles.cell}>{item.name}</Text>
                    <Text style={styles.cell}>{item.weight}</Text>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{item.pure.toFixed(3)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 }}>
              <Text style={styles.rate}>Gold Rate: ₹{tx.suspense.goldRate}</Text>
              <View>
                <Text style={[styles.total, { color: tx.suspense.netAmount >= 0 ? '#D32F2F' : '#2E7D32' }]}>
                  Net Pure: {tx.suspense.netPure.toFixed(3)} g
                </Text>
                <Text style={styles.total}>Net Amt: ₹{tx.suspense.netAmount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: '#E3F2FD' }]}
                onPress={() => navigation.navigate("SuspenseTransaction", { editTransaction: tx })}
              >
                <Text style={[styles.openText, { color: '#1565C0' }]}>EDIT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.openBtn}
                onPress={() => navigation.navigate("BillPreview", {
                  customer: tx.customer,
                  suspense: tx.suspense
                })}
              >
                <Text style={styles.openText}>OPEN BILL</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
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
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginLeft: 16, top: 10 },

  searchBox: {
    backgroundColor: "#fff",
    margin: 14,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { marginLeft: 10, flex: 1 },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 14,
  },
  dateBox: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  dateLabel: { fontSize: 12, color: "#777" },
  dateInput: { fontSize: 14 },

  resultText: { margin: 14, fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    margin: 14,
    elevation: 3,
  },

  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  txId: { fontWeight: "700" },
  txDate: { color: "#666" },

  name: { marginTop: 6, fontWeight: "600" },
  mobile: { color: "#555", marginBottom: 10 },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#EEE",
    padding: 8,
    borderRadius: 8,
  },
  tableRow: { flexDirection: "row", paddingVertical: 6 },

  cell: { flex: 1, textAlign: "center", fontSize: 12 },

  rate: { marginTop: 8, fontWeight: "600" },
  total: { marginTop: 4, fontWeight: "700" },

  openBtn: {
    backgroundColor: "#C8FACC",
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 10,
  },
  openText: { color: "#1B5E20", fontWeight: "700" },
});

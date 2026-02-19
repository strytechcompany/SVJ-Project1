import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import DateTimePicker from "@react-native-community/datetimepicker";
import { base_url } from "./config";


const SAMPLE_BILLS = [
  {
    _id: "demo_101",
    date: "2024-02-14",
    type: "B2C",
    totalAmount: 154500,
    description: "Gold Chain Purchase",
    items: [
      { itemName: "Gold Chain", weight: 24.5, touch: 92, wastage: 2.5, rate: 6500, total: 154500 }
    ],
    gst: {
      sgst: "1.5", cgst: "1.5", igst: "0", total: "3", amount: "4635"
    }
  },
  {
    _id: "demo_102",
    date: "2024-02-10",
    type: "B2B",
    totalAmount: 0,
    description: "Fine Gold Issue",
    issueItems: [
      { name: "Fine Gold", weight: 100, touch: 99.5 }
    ],
    receiptItems: [],
    cashTable: [],
    summary: { totalIssue: 100, totalReceipt: 0, balance: 100 }
  }
];

export default function BillHistory({ navigation, route }) {
  const { customer, updatedBalance } = route.params || {};
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Calculate default queries (e.g., last 30 days) when component mounts
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    setFromDate(start.toISOString().split('T')[0]);
    setToDate(end.toISOString().split('T')[0]);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchBills(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    });

    // Initial fetch
    fetchBills(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);

    return unsubscribe;
  }, [navigation]);

  const fetchBills = async (start = fromDate, end = toDate) => {
    try {
      // Check if customer exists
      if (!customer) {
        console.warn('No customer data available');
        setBills(SAMPLE_BILLS);
        setLoading(false);
        return;
      }

      // Assuming there's an endpoint to fetch transactions for a customer
      let url = `${base_url}/transactions?customerId=${customer?.customerId || customer?.id || ''}&customerType=${customer?.customerType || 'B2C'}`;
      if (start) url += `&fromDate=${start}`;
      if (end) url += `&toDate=${end}`;

      console.log("Fetching bills from:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setBills(data);
        } else {
          console.log("No data found, using SAMPLE_BILLS for demo");
          setBills(SAMPLE_BILLS);
        }
      } else {
        console.warn("Fetch failed, using SAMPLE_BILLS");
        setBills(SAMPLE_BILLS);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      // Fallback to sample data on error for demo purposes
      setBills(SAMPLE_BILLS);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = (bill) => {
    // Navigate to BillPreview with bill data
    navigation.navigate("BillPreview", {
      customer: {
        name: customer?.customerName || 'Unknown',
        phone: customer?.customerNumber || '',
        type: customer?.customerType || 'B2C',
        date: bill.date || new Date().toLocaleDateString(),
        oldBalance: bill.oldBalance || customer?.oldBalance || 0,
        advanceBalance: bill.advanceBalance || customer?.advanceBalance || 0,
        balance: bill.balance || customer?.balance || (customer?.customerType === 'B2C' ? (customer?.oldBalance || 0) : (customer?.advanceBalance || 0)),
        customerId: customer?.customerId || customer?.id || '',
      },
      issueItems: bill.issueItems || [],
      receiptItems: bill.receiptItems || [],
      cashTable: bill.cashTable || [],
      summary: bill.summary || null,
      report: bill.report || null,
      transactions: [bill],
      items: bill.items || [],
      gst: bill.gst || null,
      estimate: bill.estimate || null,
    });
  };

  const handleEditBill = (bill) => {
    if (bill.type === 'B2C' || bill.type === 'Estimate') {
      navigation.navigate("B2CCalculationPage", {
        editTransaction: bill,
        editCustomer: customer
      });
    } else {
      Alert.alert("Info", "Edit currently enabled for B2C transactions only");
    }
  };

  const handleDeleteBill = (bill) => {
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this bill?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // If using real API
              if (bill._id && !bill._id.startsWith('demo_')) {
                await fetch(`${base_url}/transactions/${bill._id}`, { method: 'DELETE' });
              }
              // Update local state
              setBills(prev => prev.filter(b => b._id !== bill._id));
              Alert.alert("Success", "Bill deleted successfully");
            } catch (error) {
              console.error("Delete failed", error);
              // For demo, still remove it
              setBills(prev => prev.filter(b => b._id !== bill._id));
            }
          }
        }
      ]
    );
  };

  const renderBillItem = ({ item }) => {
    return (
      <View style={styles.billCard}>
        <TouchableOpacity onPress={() => handleViewBill(item)}>
          <View style={styles.billHeader}>
            <Text style={styles.billDate}>{item.date || 'N/A'}</Text>
            <Text style={styles.billType}>{item.type || 'Bill'}</Text>
          </View>
          <Text style={styles.billAmount}>₹{item.totalAmount || item.amount || 'N/A'}</Text>
          <Text style={styles.billDescription}>{item.description || 'Transaction details'}</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditBill(item)}>
            <Icon name="pencil" size={18} color="#2196F3" />
            <Text style={[styles.actionText, { color: '#2196F3' }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteBill(item)}>
            <Icon name="delete" size={18} color="#F44336" />
            <Text style={[styles.actionText, { color: '#F44336' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading bill history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={{ marginLeft: 15 }}>
            <Icon name="home-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: "center", flex: 1, marginRight: 40 }}>
            <Text style={styles.fileTitle}>Bill History</Text>
            <Text style={styles.customerName}>{customer?.customerName || 'Unknown Customer'}</Text>
          </View>
        </View>
      </View>

      {/* DATE FILTER */}

      {/* DATE FILTER */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Filter by Date</Text>

        <View style={styles.dateRow}>
          {/* FROM DATE */}
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowFromPicker(true)}
            >
              <Icon name="calendar" size={20} color="#666" style={{ marginRight: 8 }} />
              <Text style={[styles.dateText, !fromDate && { color: "#999" }]}>
                {fromDate ? new Date(fromDate).toLocaleDateString() : "DD-MM-YYYY"}
              </Text>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={fromDate ? new Date(fromDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate) {
                    setFromDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
          </View>

          {/* TO DATE */}
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowToPicker(true)}
            >
              <Icon name="calendar" size={20} color="#666" style={{ marginRight: 8 }} />
              <Text style={[styles.dateText, !toDate && { color: "#999" }]}>
                {toDate ? new Date(toDate).toLocaleDateString() : "DD-MM-YYYY"}
              </Text>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={toDate ? new Date(toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate) {
                    setToDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => { setLoading(true); fetchBills(); }}
        >
          <Icon name="magnify" size={20} color="#fff" style={{ marginRight: 5 }} />
          <Text style={styles.searchBtnText}>Search History</Text>
        </TouchableOpacity>
      </View>

      {bills.length === 0 ? (
        <View style={styles.noBills}>
          <Text style={styles.noBillsText}>No bills found for this customer.</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderBillItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  customerName: { color: "#FFD54F", fontSize: 14, marginTop: 4 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  noBills: { flex: 1, justifyContent: "center", alignItems: "center" },
  noBillsText: { fontSize: 16, color: "#666" },
  listContainer: { padding: 10 },
  billCard: {
    backgroundColor: "#fff",
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  billHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  billDate: { fontSize: 14, color: "#666" },
  billType: { fontSize: 14, fontWeight: "bold", color: "#2E7D32" },
  billAmount: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 5 },
  billDescription: { fontSize: 14, color: "#666" },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    paddingHorizontal: 10
  },
  actionText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '600',
  },


  // Filter Styles
  filterCard: {
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 5,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  searchBtn: {
    backgroundColor: "#1B4D1B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});

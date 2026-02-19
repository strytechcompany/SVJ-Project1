import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { base_url } from "./config";

export default function PaymentsScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  // ----- STATE VARIABLES -----
  const [receiptItems, setReceiptItems] = useState([]);
  const [cashAvailable] = useState("15,00,000");

  // Supplier State
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredDealers, setFilteredDealers] = useState([]);

  // Payment Inputs
  const [cashPayment, setCashPayment] = useState("");
  const [metalPure, setMetalPure] = useState("");
  const [bonusPure, setBonusPure] = useState("");

  // ----- EFFECTS -----

  // Load receiptItems from route params
  useEffect(() => {
    if (route.params?.receiptItems) {
      setReceiptItems(route.params.receiptItems);
    }
  }, [route.params?.receiptItems]);

  // Fetch Dealers
  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const response = await fetch(`${base_url}/customersDealer`);
        if (!response.ok) throw new Error("Failed to fetch dealers");
        const data = await response.json();
        const formatted = data.map(d => ({
          ...d,
          balance: (d.oldBalance || 0) + (d.advanceBalance || 0)
        }));
        setDealers(formatted);
        setFilteredDealers(formatted);
      } catch (error) {
        console.error("Dealer fetch error:", error);
      }
    };
    fetchDealers();
  }, []);

  // Filter Dealers
  useEffect(() => {
    const filtered = dealers.filter(d =>
      d.customerName.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredDealers(filtered);
  }, [searchText, dealers]);

  // ----- CALCULATIONS -----
  const totalWeight = useMemo(() => {
    return receiptItems.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
  }, [receiptItems]);

  const totalPureValFromEntries = useMemo(() => {
    // Note: The user called it "Pure Amount (₹)" and "Total Pure Amount" in the prompt
    // We'll calculate it using the 'amount' or 'purity' field based on context
    return receiptItems.reduce((sum, item) => sum + parseFloat(item.amount || item.purity || 0), 0);
  }, [receiptItems]);

  const totalPureCalculated = useMemo(() => {
    const cp = parseFloat(cashPayment) || 0;
    const mp = parseFloat(metalPure) || 0;
    const bp = parseFloat(bonusPure) || 0;
    return (cp + mp + bp).toFixed(2);
  }, [cashPayment, metalPure, bonusPure]);

  // ----- HANDLERS -----
  const openModal = () => setModalVisible(true);
  const closeModal = () => {
    setModalVisible(false);
    setSearchText("");
  };

  const selectDealer = (dealer) => {
    setSelectedDealer(dealer);
    closeModal();
  };

  const handleSaveOnly = () => {
    if (!selectedDealer) {
      Alert.alert("Error", "Please select a supplier first.");
      return;
    }
    Alert.alert("Success", "Payment details saved successfully.");
  };

  const handleSubmitPrint = () => {
    if (!selectedDealer) {
      Alert.alert("Error", "Please select a supplier first.");
      return;
    }
    Alert.alert("Success", "Payment submitted and bill generated.");
  };

  // ----- RENDER -----
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={26} color="#fff" style={{ top: 25 }} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Payments</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.mainTitle}>Payments / Supplier Payment</Text>

          {/* 1️⃣ RECENT ENTRIES SECTION */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Entries (from B2C)</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCol, { flex: 0.8 }]}>S.No</Text>
                <Text style={[styles.headerCol, { flex: 2.5, textAlign: "left" }]}>Entry Name</Text>
                <Text style={[styles.headerCol, { flex: 1.5 }]}>Weight(g)</Text>
                <Text style={[styles.headerCol, { flex: 1.8 }]}>Pure Amt(₹)</Text>
              </View>

              {receiptItems.length > 0 ? (
                receiptItems.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.cellCol, { flex: 0.8 }]}>{index + 1}</Text>
                    <Text style={[styles.cellCol, { flex: 2.5, textAlign: "left" }]}>
                      {item.item || item.itemName || "Item"}
                    </Text>
                    <Text style={[styles.cellCol, { flex: 1.5 }]}>{Number(item.weight || 0).toFixed(3)}</Text>
                    <Text style={[styles.cellCol, { flex: 1.8 }]}>{Number(item.amount || item.purity || 0).toFixed(2)}</Text>
                  </View>
                ))
              ) : (
                <View style={[styles.tableRow, { paddingVertical: 15 }]}>
                  <Text style={{ textAlign: "center", flex: 1, color: "#888" }}>No recent entries found.</Text>
                </View>
              )}

              {/* Footer Totals */}
              <View style={styles.tableFooter}>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>Total Weight:</Text>
                  <Text style={styles.footerValue}>{totalWeight.toFixed(3)} g</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>Total Pure Amount:</Text>
                  <Text style={styles.footerValue}>₹ {totalPureValFromEntries.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2️⃣ CASH AVAILABLE SECTION */}
          <View style={styles.sectionContainer}>
            <View style={styles.cashAvailableCard}>
              <View style={styles.cashLabelBox}>
                <Text style={styles.cashLabel}>Cash Available</Text>
              </View>
              <View style={styles.cashValueBox}>
                <Text style={styles.cashValue}>₹ {cashAvailable}</Text>
              </View>
            </View>
          </View>

          {/* 3️⃣ SUPPLIER SELECTION */}
          <View style={styles.sectionContainer}>
            <Text style={styles.inputLabel}>To Supplier</Text>
            <TouchableOpacity style={styles.supplierSelector} onPress={openModal}>
              <Text style={styles.supplierSelectorText}>
                {selectedDealer
                  ? `${selectedDealer.customerName} → B2B (${selectedDealer.balance}g)`
                  : "Select from Supplier Master"}
              </Text>
              <Icon name="chevron-down" size={24} color="#555" />
            </TouchableOpacity>
          </View>

          {/* 4️⃣ PAYMENT INPUT SECTION */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionSubtitle}>Payment Mode</Text>

            {/* Cash */}
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Cash</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="₹ 0"
                keyboardType="numeric"
                value={cashPayment}
                onChangeText={setCashPayment}
              />
            </View>

            {/* Metal (Pure) */}
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Metal (Pure)</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="₹ 0"
                keyboardType="numeric"
                value={metalPure}
                onChangeText={setMetalPure}
              />
            </View>

            {/* Bonus Pure */}
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Bonus Pure</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="₹ 0"
                keyboardType="numeric"
                value={bonusPure}
                onChangeText={setBonusPure}
              />
            </View>
          </View>

          {/* 5️⃣ TOTAL PURE (AUTO-CALCULATED) */}
          <View style={styles.sectionContainer}>
            <View style={styles.totalPureCard}>
              <Text style={styles.totalPureLabel}>Total Pure</Text>
              <View style={styles.totalPureDisplay}>
                <Text style={styles.totalPureValue}>₹ {totalPureCalculated}</Text>
              </View>
            </View>
          </View>

          {/* 6️⃣ ACTION BUTTONS */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitPrint}>
              <Text style={styles.btnText}>Submit{"\n"}& Print</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveOnly}>
              <Text style={styles.btnText}>Save{"\n"}Only</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUPPLIER MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Supplier</Text>
              <TouchableOpacity onPress={closeModal}>
                <Icon name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Icon name="magnify" size={24} color="#666" style={{ marginHorizontal: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search supplier..."
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <FlatList
              data={filteredDealers}
              keyExtractor={(item) => item._id || item.customerName}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dealerItem} onPress={() => selectDealer(item)}>
                  <View>
                    <Text style={styles.dealerName}>{item.customerName}</Text>
                    <Text style={styles.dealerType}>Dealer | Balance: {item.balance}g</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyList}>No suppliers found.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 45,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    height: 120,
    elevation: 5,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    top: 25,
  },
  scrollContainer: {
    padding: 18,
    paddingBottom: 50,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#1B4D1B",
    paddingLeft: 10,
  },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1B4D1B",
    overflow: "hidden",
    elevation: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1B4D1B",
  },
  headerCol: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1B4D1B",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  cellCol: {
    fontSize: 13,
    color: "#444",
    textAlign: "center",
  },
  tableFooter: {
    padding: 12,
    backgroundColor: "#F1F8E9",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 10,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1B4D1B",
    width: 100,
    textAlign: "right",
  },
  cashAvailableCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  cashLabelBox: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  cashLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cashValueBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#1B4D1B",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  cashValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  supplierSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  supplierSelectorText: {
    fontSize: 15,
    color: "#333",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
  },
  paymentInput: {
    flex: 2,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  totalPureCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1B4D1B",
  },
  totalPureLabel: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1B4D1B",
  },
  totalPureDisplay: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#1B4D1B",
  },
  totalPureValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 10,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#1B4D1B",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2E7D32",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  dealerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dealerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  dealerType: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  emptyList: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
  },
});

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function PaymentsScreen() {
  const navigation = useNavigation();

  // ----- STATE VARIABLES -----
  const [items, setItems] = useState([]); // Items from ItemEntry (Catalog)
  const [ledgerData, setLedgerData] = useState([]); // Ledger entries for OUT totals
  const [stockRecords, setStockRecords] = useState([]); // Official Stock weights
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [transferWeight, setTransferWeight] = useState("");

  // Dealer Selection States
  const [dealers, setDealers] = useState([]);
  const [filteredDealers, setFilteredDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Static Date (As requested: "date only to show it")
  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // ----- EFFECTS -----
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemRes, billRes, paymentRes, dealerRes, stockRes] = await Promise.all([
        fetch(`${base_url}/items`),
        fetch(`${base_url}/billSummary`),
        fetch(`${base_url}/payments`),
        fetch(`${base_url}/customersDealer`),
        fetch(`${base_url}/stockMaster`)
      ]);

      const allItems = itemRes.ok ? await itemRes.json() : [];
      const bills = billRes.ok ? await billRes.json() : [];
      const payments = paymentRes.ok ? await paymentRes.json() : [];
      const dealersData = dealerRes.ok ? await dealerRes.json() : [];
      const currentStocks = stockRes.ok ? await stockRes.json() : [];

      setStockRecords(currentStocks);

      // Only Receipt Item List from ItemEntry
      const receiptItems = allItems.filter(i => i.receipt === true);
      setItems(receiptItems);

      // Process Transactions for IN/OUT LEDGER per Item
      let combined = [];

      // 1. Process items from Bill Summaries
      bills.forEach(bill => {
        (bill.receiptItems || []).forEach(item => {
          combined.push({ type: "IN", name: item.name, weight: item.weight || 0 });
        });
        (bill.issueItems || []).forEach(item => {
          combined.push({ type: "OUT", name: item.name, weight: item.gross || item.weight || 0 });
        });
      });

      // 2. Process Dealer Transfers from Payments Collection (Added to OUT)
      payments.forEach(payment => {
        if (payment.type === "dealerTransfer") {
          const w = parseFloat(payment.transferWeight || 0);
          (payment.selectedItems || []).forEach(itemName => {
            combined.push({ type: "OUT", name: itemName, weight: w });
          });
        }
      });

      setLedgerData(combined);

      // Process Dealers
      const formattedDealers = dealersData.map(d => ({
        ...d,
        balance: (parseFloat(d.oldBalance) || 0) + (parseFloat(d.advanceBalance) || 0)
      }));

      setDealers(formattedDealers);
      setFilteredDealers(formattedDealers);

    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadSession();
  }, []);

  const loadSession = async () => {
    const session = await AsyncStorage.getItem("userSession");
    if (session) setCurrentUser(JSON.parse(session));
  };

  // Filter Dealers on search
  useEffect(() => {
    const filtered = dealers.filter(d =>
      (d.customerName || "").toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredDealers(filtered);
  }, [searchText, dealers]);

  // Map Stock Weights to Catalog Items
  const stockMap = useMemo(() => {
    const map = {};
    stockRecords.forEach(s => {
      map[s.itemName.toLowerCase()] = parseFloat(s.weight || 0);
    });
    return map;
  }, [stockRecords]);

  const itemLedgerStats = useMemo(() => {
    const stats = {};
    ledgerData.forEach(entry => {
      const nameKey = (entry.name || "").toLowerCase();
      if (!stats[nameKey]) stats[nameKey] = { in: 0, out: 0 };
      const w = parseFloat(entry.weight || 0);
      if (entry.type === "IN") stats[nameKey].in += w;
      else if (entry.type === "OUT") stats[nameKey].out += w;
    });
    return stats;
  }, [ledgerData]);

  // GRAND TOTAL IN: Sum of Current available weight across all tracked items
  const grandTotalIn = useMemo(() =>
    Object.values(stockMap).reduce((sum, w) => sum + w, 0).toFixed(3),
    [stockMap]);

  const grandTotalOut = useMemo(() =>
    Object.values(itemLedgerStats).reduce((sum, s) => sum + s.out, 0).toFixed(3),
    [itemLedgerStats]);

  // ----- STOCK TRANSFER LOGIC -----
  const handleTransfer = async () => {
    if (!selectedItemId) { Alert.alert("Required", "Please select an item."); return; }
    if (!transferWeight || isNaN(transferWeight) || parseFloat(transferWeight) <= 0) {
      Alert.alert("Required", "Please enter a valid weight to transfer.");
      return;
    }
    if (!selectedDealer) { Alert.alert("Required", "Please select a dealer / supplier."); return; }

    try {
      setLoading(true);
      const weightToSub = parseFloat(transferWeight);
      const catalogItem = items.find(i => i._id === selectedItemId);
      if (!catalogItem) throw new Error("Catalog item not found");

      // 1. Fetch current stock to find matches
      const stockRes = await fetch(`${base_url}/stockMaster`);
      if (!stockRes.ok) throw new Error("Failed to connect to Stock Master");
      const currentStocks = await stockRes.json();

      // Find stock record matching the item name (Case-insensitive)
      const stockRecord = currentStocks.find(s =>
        s.itemName.toLowerCase() === catalogItem.stockName.toLowerCase()
      );

      if (!stockRecord) {
        Alert.alert("Stock Error", `The item "${catalogItem.stockName}" was not found in Stock Master.`);
        return;
      }

      // Check for sufficient balance
      if ((stockRecord.weight || 0) < weightToSub) {
        Alert.alert("Insufficient Stock", `Available stock for ${stockRecord.itemName} is ${stockRecord.weight}g.`);
        return;
      }

      // ---- STEP 1: Update StockMaster ----
      const updatedWeight = Math.max(0, (stockRecord.weight || 0) - weightToSub);
      const updatedNetWeight = Math.max(0, (stockRecord.netWeight || 0) - weightToSub);
      const newPure = (stockRecord.pure || 0) * (updatedWeight / (stockRecord.weight || 1));

      const stockUpdateRes = await fetch(`${base_url}/stockMaster/${stockRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stockRecord,
          weight: updatedWeight,
          netWeight: updatedNetWeight,
          pure: newPure
        })
      });

      if (!stockUpdateRes.ok) throw new Error("Update to Stock Master failed");

      // ---- STEP 2: Create Payment (Dealer Transfer) ----
      const transferRecord = {
        date: new Date().toISOString(),
        selectedDealer: selectedDealer.customerName,
        selectedItems: [catalogItem.stockName],
        totalSelectedWeight: weightToSub,
        weightSubtraction: 0,
        transferWeight: weightToSub,
        type: "dealerTransfer"
      };

      const paymentRecordRes = await fetch(`${base_url}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferRecord)
      });
      if (!paymentRecordRes.ok) throw new Error("Failed to record transaction in ledger");

      // ---- STEP 3: Update Dealer Balance (Fresh Fetch) ----
      const dealerId = selectedDealer._id || selectedDealer.id;
      if (!dealerId) throw new Error("Dealer record ID not found");

      // Fetch fresh dealer record to ensure we are ADDING to the absolute latest balance
      const dealerFetchRes = await fetch(`${base_url}/customersDealer/${dealerId}`);
      if (!dealerFetchRes.ok) throw new Error("Could not fetch latest dealer balance");
      const freshDealer = await dealerFetchRes.json();

      let ob = parseFloat(freshDealer.oldBalance || 0);
      let ab = parseFloat(freshDealer.advanceBalance || 0);
      let currentNetBalance = ob - ab;

      // Add to existing weight: Net Balance increases with Issue
      let newNetBalance = currentNetBalance + weightToSub;

      let newOb = 0;
      let newAb = 0;
      if (newNetBalance >= 0) {
        newOb = newNetBalance;
        newAb = 0;
      } else {
        newOb = 0;
        newAb = Math.abs(newNetBalance);
      }

      const dealerUpdateRes = await fetch(`${base_url}/customersDealer/${dealerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...freshDealer,
          oldBalance: newOb,
          advanceBalance: newAb
        }),
      });

      if (dealerUpdateRes.ok) {
        Alert.alert("Success", `Inventory Synchronized:\n-${weightToSub}g deducted from IN\n+${weightToSub}g added to ${freshDealer.customerName}'s account`);
        setTransferWeight("");
        setSelectedItemId(null);
        setSelectedDealer(null);
        fetchData(); // Reload all totals and items
      } else {
        throw new Error("Failed to finalize dealer account update");
      }

    } catch (error) {
      console.error("Transfer error:", error);
      Alert.alert("Transfer Failed", error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // ----- RENDER -----
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDFDFD" }}>
      {/* PREMIUM HEADER */}
      <CommonHeader
      title="Payments"
      backgroundColor="#fff"
      titleColor="#1B4D1B"
      statusBarStyle="dark-content"
      insideSafeArea
      left={
      <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.headerIconBtn}>
      <Icon name="chevron-left" size={28} color="#1B4D1B" />
      </TouchableOpacity>
      }
      right={
      <TouchableOpacity style={styles.headerIconBtn} onPress={fetchData} disabled={loading}>
      <Icon name="refresh" size={24} color="#1B4D1B" />
      </TouchableOpacity>
      }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* USER PROFILE CARD */}
          <View style={styles.profileCard}>
            <View style={styles.profileCircle}>
              <Icon name="account" size={30} color="#1B4D1B" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Logged in as</Text>
              <Text style={styles.profileName}>{currentUser?.name || "Super Admin"}</Text>
              <Text style={styles.profileRole}>{currentUser?.role || "System Administrator"}</Text>
            </View>
          </View>

          {/* PROFESSIONAL DATE PANEL (Date Only) */}
          <View style={styles.datePanel}>
            <View style={styles.dateIconWrapper}>
              <Icon name="calendar-month-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.dateLabel}>Active Session Date</Text>
              <Text style={styles.dateValue}>{formattedDate}</Text>
            </View>
          </View>

          {/* SUMMARY GRID */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryBox, { backgroundColor: "#E8F5E9" }]}>
              <View style={styles.summaryCircle}><Icon name="arrow-down-bold" size={20} color="#2E7D32" /></View>
              <View>
                <Text style={styles.summaryLabel}>TOTAL IN</Text>
                <Text style={[styles.summaryValue, { color: "#2E7D32" }]}>{grandTotalIn} g</Text>
              </View>
            </View>
            <View style={[styles.summaryBox, { backgroundColor: "#FFEBEE" }]}>
              <View style={[styles.summaryCircle, { backgroundColor: "#FFCDD2" }]}><Icon name="arrow-up-bold" size={20} color="#D32F2F" /></View>
              <View>
                <Text style={styles.summaryLabel}>TOTAL OUT</Text>
                <Text style={[styles.summaryValue, { color: "#D32F2F" }]}>{grandTotalOut} g</Text>
              </View>
            </View>
          </View>

          {/* RECEIPT CATALOG TABLE */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Receipt Inventory Catalog</Text>
              <Icon name="package-variant-closed" size={20} color="#666" />
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCol, { width: 40 }]}>#</Text>
              <Text style={[styles.tableHeaderCol, { flex: 2, textAlign: "left", paddingLeft: 10 }]}>Item</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1 }]}>IN</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1 }]}>OUT</Text>
              <Text style={[styles.tableHeaderCol, { width: 45 }]}>Sel</Text>
            </View>

            {loading && items.length === 0 ? (
              <View style={styles.loadingContainer}><Text style={styles.loadingText}>Fetching Records...</Text></View>
            ) : items.length > 0 ? (
              items.map((item, index) => {
                const nameKey = (item.stockName || "").toLowerCase();
                const stockWeight = stockMap[nameKey] || 0;
                const stats = itemLedgerStats[nameKey] || { in: 0, out: 0 };
                const isSelected = selectedItemId === item._id;
                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[styles.tableRow, isSelected && styles.selectedRow]}
                    onPress={() => setSelectedItemId(item._id)}
                  >
                    <Text style={styles.snoCell}>{index + 1}</Text>
                    <Text style={styles.itemNameCell} numberOfLines={1}>{item.stockName}</Text>
                    <Text style={styles.inCell}>{stockWeight.toFixed(3)}</Text>
                    <Text style={styles.outCell}>{stats.out.toFixed(3)}</Text>
                    <View style={styles.checkCell}>
                      <Icon
                        name={isSelected ? "check-circle" : "circle-outline"}
                        size={22}
                        color={isSelected ? "#1B4D1B" : "#E0E0E0"}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}><Text style={styles.emptyText}>Empty Catalog</Text></View>
            )}
          </View>

          {/* TRANSFER CONTROLS */}
          <View style={[styles.card, styles.controlCard]}>
            <Text style={styles.controlTitle}>Transfer Execution</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>1. Transfer Weight (g)</Text>
              <View style={styles.weightInputWrapper}>
                <TextInput
                  style={styles.weightInput}
                  placeholder="0.000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={transferWeight}
                  onChangeText={setTransferWeight}
                />
                <Text style={{ marginRight: 15, fontWeight: "bold", color: "#1B4D1B" }}>GRAMS</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>2. Select Dealer / Supplier</Text>
              <TouchableOpacity style={styles.dealerSelect} onPress={() => setModalVisible(true)}>
                <Text style={[styles.dealerSelectText, !selectedDealer && { color: "#999" }]}>
                  {selectedDealer ? selectedDealer.customerName : "Select a recipient..."}
                </Text>
                <Icon name="chevron-down" size={22} color="#1B4D1B" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, (!selectedItemId || !transferWeight || !selectedDealer) && styles.disabledBtn]}
              onPress={handleTransfer}
              disabled={loading}
            >
              <Icon name="send-check" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.actionBtnText}>{loading ? "PROCESSING..." : "TRANSFER WEIGHT"}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* DEALER MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recipient Search</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="close-circle" size={32} color="#1B4D1B" /></TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Icon name="magnify" size={24} color="#1B4D1B" />
              <TextInput style={styles.modalSearchInput} placeholder="Search by name..." value={searchText} onChangeText={setSearchText} />
            </View>
            <FlatList
              data={filteredDealers}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedDealer(item); setModalVisible(false); }}>
                  <View style={styles.itemIcon}><Text style={styles.itemInitial}>{item.customerName?.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.customerName}</Text>
                    <Text style={styles.itemSubtitle}>Balance: {item.balance.toFixed(2)} g</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#EEE" />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item._id || item.customerName}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#fff", height: 100, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 15, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F0F0F0" },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1B4D1B", letterSpacing: 0.5 },
  headerBatch: { fontSize: 10, color: "#666", fontWeight: "bold", textTransform: "uppercase" },
  scrollContainer: { padding: 16, paddingBottom: 60 },
  datePanel: { backgroundColor: "#1B4D1B", borderRadius: 20, padding: 18, marginBottom: 20, flexDirection: "row", alignItems: "center", elevation: 6 },
  dateIconWrapper: { width: 48, height: 48, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 15 },
  dateLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "bold", textTransform: "uppercase" },
  dateValue: { fontSize: 17, fontWeight: "800", color: "#fff" },
  summaryGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryBox: { flex: 1, flexDirection: "row", padding: 16, borderRadius: 18, elevation: 2, alignItems: "center", gap: 12 },
  summaryCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#C8E6C9", alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontSize: 10, fontWeight: "bold", color: "#666", letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: "900" },
  card: { backgroundColor: "#fff", borderRadius: 20, elevation: 4, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: "#F0F0F0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", padding: 18, borderBottomWidth: 1, borderBottomColor: "#F5F5F5", alignItems: "center" },
  cardHeaderTitle: { fontSize: 15, fontWeight: "900", color: "#333", letterSpacing: 0.2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F8F9FA", paddingVertical: 12, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EEE" },
  tableHeaderCol: { color: "#666", fontSize: 11, fontWeight: "900", textAlign: "center", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#FAFAFA", alignItems: "center" },
  selectedRow: { backgroundColor: "#F1F8F1" },
  snoCell: { width: 40, textAlign: "center", fontSize: 12, color: "#AAA", fontWeight: "600" },
  itemNameCell: { flex: 2, textAlign: "left", paddingLeft: 10, fontSize: 14, fontWeight: "800", color: "#222" },
  inCell: { flex: 1, textAlign: "center", fontSize: 13, color: "#2E7D32", fontWeight: "900" },
  outCell: { flex: 1, textAlign: "center", fontSize: 13, color: "#D32F2F", fontWeight: "900" },
  checkCell: { width: 45, alignItems: "center" },
  controlCard: { padding: 22 },
  controlTitle: { fontSize: 16, fontWeight: "900", color: "#1B4D1B", marginBottom: 25, textAlign: "center" },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: "800", color: "#555", marginBottom: 10, textTransform: "uppercase" },
  weightInputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAF1", borderRadius: 14, borderWidth: 1.5, borderColor: "#E8F5E9" },
  weightInput: { flex: 1, height: 52, fontSize: 16, paddingHorizontal: 12, color: "#1B4D1B", fontWeight: "bold" },
  dealerSelect: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAF1", borderRadius: 14, borderWidth: 1.5, borderColor: "#E8F5E9", padding: 15 },
  dealerSelectText: { fontSize: 15, fontWeight: "700", color: "#1B4D1B" },
  actionBtn: { backgroundColor: "#1B4D1B", flexDirection: "row", height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 15, elevation: 8 },
  disabledBtn: { backgroundColor: "#E0E0E0", elevation: 0 },
  actionBtnText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", height: "75%", borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#1B4D1B" },
  modalSearch: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F7F9", borderRadius: 15, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: "#EEE" },
  modalSearchInput: { flex: 1, height: 50, marginLeft: 10, fontWeight: "600" },
  modalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  itemIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center", marginRight: 15 },
  itemInitial: { color: "#1B4D1B", fontWeight: "900", fontSize: 18 },
  itemTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  itemSubtitle: { fontSize: 12, color: "#777", marginTop: 3 },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { color: "#999", fontWeight: "bold" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { color: "#CCC", fontWeight: "bold" },
  profileCard: {
    backgroundColor: "#fff",
    marginBottom: 20,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 6,
    borderLeftColor: "#1B4D1B",
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  profileInfo: { flex: 1 },
  profileLabel: { fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  profileName: { fontSize: 20, fontWeight: "900", color: "#1B4D1B" },
  profileRole: { fontSize: 13, color: "#444", marginTop: 2, fontWeight: "500" },
});

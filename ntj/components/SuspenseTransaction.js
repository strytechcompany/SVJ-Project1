import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { base_url } from './config';
import CommonHeader from "./CommonHeader";

const EntryForm = ({ 
  title, name, setName, w, setW, c, setC, p, setP, r, setR, onAdd, color,
  handleItemSearch, showItemDropdown, issueFilteredStocks, receiptFilteredStocks, selectStockItem
}) => {
  const type = title.toLowerCase();
  return (
    <View style={[styles.modernCard, { borderTopWidth: 4, borderTopColor: color }]}>
      <View style={styles.formHeader}>
        <Ionicons name={title === "Issue" ? "arrow-up-circle" : "arrow-down-circle"} size={24} color={color} />
        <Text style={[styles.formTitle, { color }]}> Add {title} Item</Text>
      </View>

      <View style={[styles.inputGroup, { zIndex: type === 'issue' ? 2000 : 1000 }]}>
        <TextInput
          style={styles.modernInput}
          placeholder="Search Item Name (e.g. Ring, Chain)"
          value={name}
          onChangeText={(text) => handleItemSearch(text, type)}
        />
        {showItemDropdown[type] && (type === 'issue' ? issueFilteredStocks : receiptFilteredStocks).length > 0 && (
          <View style={styles.stockDropdown}>
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
              {(type === 'issue' ? issueFilteredStocks : receiptFilteredStocks).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => selectStockItem(item, type)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownText}>{item.stockName}</Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>{item.itemDetails}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.dropdownType, { backgroundColor: '#E1F5FE', color: '#0277BD' }]}>
                      {type === 'issue' ? item.sellingTouch : item.buyingTouch}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.inputRow}>
        <View style={styles.flex1}>
          <Text style={styles.inputLabel}>Weight (g)</Text>
          <TextInput style={styles.modernInput} placeholder="0.000" value={w} onChangeText={setW} keyboardType="numeric" returnKeyType="next" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.inputLabel}>Pieces</Text>
          <TextInput style={styles.modernInput} placeholder="1" value={c} onChangeText={setC} keyboardType="numeric" returnKeyType="next" />
        </View>
      </View>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onAdd}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.actionBtnText}>Add to {title} List</Text>
      </TouchableOpacity>
    </View>
  );
};

const DataTable = ({ items, type, color, removeItem }) => {
  const sectionTotalPure = items.reduce((sum, i) => sum + (i.pure || 0), 0);
  return (
    items.length > 0 && (
      <View style={styles.tableCard}>
        <View style={[styles.tableSubHeader, { backgroundColor: color + '10' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="list" size={18} color={color} />
            <Text style={[styles.tableSubTitle, { color }]}> {type} Summary</Text>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: color }]}>
            <Text style={styles.totalBadgeText}>{sectionTotalPure.toFixed(3)} g</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.modernTableHeader}>
              <Text style={[styles.mHeaderCell, { width: 40 }]}>#</Text>
              <Text style={[styles.mHeaderCell, { width: 140 }]}>Item Name</Text>
              <Text style={[styles.mHeaderCell, { width: 90 }]}>Weight</Text>
              <Text style={[styles.mHeaderCell, { width: 60 }]}>Qty</Text>
              <Text style={[styles.mHeaderCell, { width: 50, textAlign: 'center' }]}>Act</Text>
            </View>

            {items.map((item, idx) => (
              <View key={item.id} style={[styles.modernTableRow, idx % 2 === 1 && { backgroundColor: '#FBFBFB' }]}>
                <Text style={[styles.mCell, { width: 40, color: '#999' }]}>{idx + 1}</Text>
                <Text style={[styles.mCell, { width: 140, fontWeight: '700', color: '#1A1A1A' }]}>{item.name}</Text>
                <Text style={[styles.mCell, { width: 90 }]}>{Number(item.weight || 0).toFixed(3)}g</Text>
                <Text style={[styles.mCell, { width: 60 }]}>{item.count}</Text>
                <TouchableOpacity
                  style={{ width: 50, alignItems: 'center' }}
                  onPress={() => removeItem(type.toLowerCase(), item.id)}
                >
                  <Ionicons name="close-circle" size={22} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  );
};

export default function SuspenseTransactionScreen({ navigation, route }) {

  // --- ISSUE STATE ---
  const [issueItems, setIssueItems] = useState([]);
  const [issueName, setIssueName] = useState("");
  const [issueWeight, setIssueWeight] = useState("");
  const [issueCount, setIssueCount] = useState("");
  const [issuePure, setIssuePure] = useState("");
  const [issueRate, setIssueRate] = useState("");

  // --- RECEIPT STATE ---
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptName, setReceiptName] = useState("");
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptCount, setReceiptCount] = useState("");
  const [receiptPure, setReceiptPure] = useState("");
  const [receiptRate, setReceiptRate] = useState("");

  const [goldRate, setGoldRate] = useState("0");
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [currentTransactionId, setCurrentTransactionId] = useState(null);

  useEffect(() => {
    if (route.params?.editTransaction) {
      const tx = route.params.editTransaction;
      setCustomerName(tx.customer?.name || "");
      setMobile(tx.customer?.phone || "");
      setAddress(tx.customer?.address || "");
      setIssueItems(tx.suspense?.issueItems || []);
      setReceiptItems(tx.suspense?.receiptItems || []);
      setGoldRate(tx.suspense?.goldRate || "0");
      setIssueRate(tx.suspense?.goldRate || "0");
      setReceiptRate(tx.suspense?.goldRate || "0");
      setCurrentTransactionId(tx.id);
    }
  }, [route.params]);

  const [allCustomers, setAllCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // --- ITEM STOCK LOOKUP ---
  const [allStockItems, setAllStockItems] = useState([]);
  const [issueFilteredStocks, setIssueFilteredStocks] = useState([]);
  const [receiptFilteredStocks, setReceiptFilteredStocks] = useState([]);
  const [showItemDropdown, setShowItemDropdown] = useState({ issue: false, receipt: false });
  const [selectedIssueStock, setSelectedIssueStock] = useState(null);
  const [selectedReceiptStock, setSelectedReceiptStock] = useState(null);

  // Auto-calculate pure for Issue
  useEffect(() => {
    if (selectedIssueStock && issueWeight) {
      const touch = selectedIssueStock.sellingTouch || 100;
      setIssuePure(((Number(issueWeight) * Number(touch)) / 100).toFixed(3));
    }
  }, [issueWeight, selectedIssueStock]);

  // Auto-calculate pure for Receipt
  useEffect(() => {
    if (selectedReceiptStock && receiptWeight) {
      const touch = selectedReceiptStock.buyingTouch || 100;
      setReceiptPure(((Number(receiptWeight) * Number(touch)) / 100).toFixed(3));
    }
  }, [receiptWeight, selectedReceiptStock]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // Load Gold Rate
          const storedRate = await AsyncStorage.getItem("goldRate");
          if (storedRate) {
            setGoldRate(storedRate);
            setIssueRate(storedRate);
            setReceiptRate(storedRate);
          }

          // Load All Customers & Stock Items
          const [b2bRes, b2cRes, dealerRes, itemsRes] = await Promise.all([
            fetch(`${base_url}/customers`),
            fetch(`${base_url}/customersB2C`),
            fetch(`${base_url}/customersDealer`),
            fetch(`${base_url}/items`)
          ]);

          const b2bData = b2bRes.ok ? await b2bRes.json() : [];
          const b2cData = b2cRes.ok ? await b2cRes.json() : [];
          const dealerData = dealerRes.ok ? await dealerRes.json() : [];
          const stockData = itemsRes.ok ? await itemsRes.json() : [];

          const combined = [
            ...b2bData.map(c => ({ ...c, type: 'B2B', phone: c.phoneNumber || c.phone, customerName: c.customerName || c.name || "Unknown" })),
            ...b2cData.map(c => ({ ...c, type: 'B2C', phone: c.phoneNumber || c.phone, customerName: c.customerName || c.name || "Unknown" })),
            ...dealerData.map(c => ({ ...c, type: 'Dealer', phone: c.phoneNumber || c.phone, customerName: c.customerName || c.name || "Unknown" }))
          ];
          setAllCustomers(combined);
          setAllStockItems(stockData);
        } catch (error) {
          console.error("Failed to load data in Suspense", error);
        }
      };
      loadData();
    }, [])
  );

  const handleSearch = (text) => {
    setCustomerName(text);
    if (text.length > 0) {
      const filtered = allCustomers.filter(c =>
        (String(c.customerName || "")).toLowerCase().includes(text.toLowerCase()) ||
        (String(c.phone || "")).includes(text)
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectCustomer = (cust) => {
    setCustomerName(cust.customerName || cust.name || "");
    setMobile(cust.phone || "");
    setAddress(cust.address || "");
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleItemSearch = (text, type) => {
    if (type === 'issue') {
      setIssueName(text);
      setSelectedIssueStock(null); // Reset if they start typing again
    } else {
      setReceiptName(text);
      setSelectedReceiptStock(null);
    }

    if (text.length > 0) {
      const filtered = allStockItems.filter(item =>
        (item.stockName || "").toLowerCase().includes(text.toLowerCase())
      );
      if (type === 'issue') setIssueFilteredStocks(filtered);
      else setReceiptFilteredStocks(filtered);
      setShowItemDropdown({ ...showItemDropdown, [type]: true });
    } else {
      setShowItemDropdown({ ...showItemDropdown, [type]: false });
    }
  };

  const selectStockItem = (item, type) => {
    if (type === 'issue') {
      setIssueName(item.stockName);
      setSelectedIssueStock(item);
    } else {
      setReceiptName(item.stockName);
      setSelectedReceiptStock(item);
    }
    setShowItemDropdown({ ...showItemDropdown, [type]: false });
  };

  const addIssueItem = () => {
    if (!issueWeight || !issueCount) {
      Alert.alert("Error", "Please enter Weight and Pieces");
      return;
    }
    const newItem = {
      id: Date.now(),
      name: issueName || "N/A",
      weight: Number(issueWeight),
      count: Number(issueCount || 1),
      pure: Number(issuePure || issueWeight),
      rate: Number(issueRate || goldRate || 0),
      amount: Number(issuePure || issueWeight) * Number(issueRate || goldRate || 0)
    };
    setIssueItems([...issueItems, newItem]);
    setIssueName(""); setIssueWeight(""); setIssueCount(""); setIssuePure("");
    setSelectedIssueStock(null);
    Keyboard.dismiss();
  };

  const addReceiptItem = () => {
    if (!receiptWeight || !receiptCount) {
      Alert.alert("Error", "Please enter Weight and Pieces");
      return;
    }
    const newItem = {
      id: Date.now(),
      name: receiptName || "N/A",
      weight: Number(receiptWeight),
      count: Number(receiptCount || 1),
      pure: Number(receiptPure || receiptWeight),
      rate: Number(receiptRate || goldRate || 0),
      amount: Number(receiptPure || receiptWeight) * Number(receiptRate || goldRate || 0)
    };
    setReceiptItems([...receiptItems, newItem]);
    setReceiptName(""); setReceiptWeight(""); setReceiptCount(""); setReceiptPure("");
    setSelectedReceiptStock(null);
    Keyboard.dismiss();
  };

  const removeItem = (type, id) => {
    if (type === 'issue') setIssueItems(issueItems.filter(i => i.id !== id));
    else setReceiptItems(receiptItems.filter(i => i.id !== id));
  };

  const totalIssuePure = issueItems.reduce((sum, i) => sum + i.pure, 0);
  const totalReceiptPure = receiptItems.reduce((sum, i) => sum + i.pure, 0);
  const netPure = totalIssuePure - totalReceiptPure;

  const totalIssueAmount = issueItems.reduce((sum, i) => sum + i.amount, 0);
  const totalReceiptAmount = receiptItems.reduce((sum, i) => sum + i.amount, 0);
  const netAmount = totalIssueAmount - totalReceiptAmount;

  const handleSave = async () => {
    const transactionData = {
      id: currentTransactionId || "suspense-" + Date.now(),
      customer: {
        name: customerName || "Suspense Customer",
        phone: mobile || "N/A",
        address: address || "N/A",
        date: new Date().toLocaleDateString(),
        type: "Suspense",
      },
      suspense: {
        issueItems,
        receiptItems,
        goldRate,
        netPure,
        netAmount,
        totalIssuePure,
        totalReceiptPure,
        totalIssueAmount,
        totalReceiptAmount
      },
      date: new Date().toLocaleDateString(),
    };

    try {
      let response;
      if (currentTransactionId) {
        response = await fetch(`${base_url}/suspense/${currentTransactionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        });
      } else {
        response = await fetch(`${base_url}/suspense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        });
      }

      if (response.ok) {
        Alert.alert("Success", currentTransactionId ? "Updated Successfully" : "Saved Successfully");
        // Clear fields
        setIssueItems([]);
        setReceiptItems([]);
        setCustomerName('');
        setMobile('');
        setAddress('');
        setCurrentTransactionId(null);
        navigation.setParams({ editTransaction: null });
        Keyboard.dismiss();
      } else {
        const err = await response.json();
        Alert.alert("Error", err.error || "Failed to save transaction.");
      }
    } catch (error) {
      console.error("Error saving suspense transaction:", error);
      Alert.alert("Error", "Failed to save transaction.");
    }
  };

  const handlePrint = async () => {
    const transactionData = {
      id: currentTransactionId || "suspense-" + Date.now(),
      customer: {
        name: customerName || "Suspense Customer",
        phone: mobile || "N/A",
        address: address || "N/A",
        date: new Date().toLocaleDateString(),
        type: "Suspense",
      },
      suspense: {
        issueItems,
        receiptItems,
        goldRate,
        netPure,
        netAmount,
        totalIssuePure,
        totalReceiptPure,
        totalIssueAmount,
        totalReceiptAmount
      },
      date: new Date().toLocaleDateString(),
    };

    try {
      let response;
      if (currentTransactionId) {
        response = await fetch(`${base_url}/suspense/${currentTransactionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        });
      } else {
        response = await fetch(`${base_url}/suspense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        });
      }

      if (response.ok) {
        const result = await response.json();
        const savedData = result.data || result;
        
        // Navigate to Preview
        navigation.navigate("BillPreview", {
          customer: transactionData.customer,
          suspense: transactionData.suspense
        });

        // Clear fields
        setIssueItems([]);
        setReceiptItems([]);
        setCustomerName('');
        setMobile('');
        setAddress('');
        setCurrentTransactionId(null);
        navigation.setParams({ editTransaction: null });
        Keyboard.dismiss();
      } else {
        Alert.alert("Error", "Failed to save before printing");
      }
    } catch (error) {
      console.error("Error processing print/save:", error);
      Alert.alert("Error", "Failed to process transaction.");
    }
  };


  return (
    <View style={styles.page}>
      <CommonHeader
        title="Suspense Transaction"
        onBack={() => navigation.goBack()}
        backgroundColor="#1B4D1B"
        right={
          <TouchableOpacity onPress={() => navigation.navigate("SuspenseHistoryScreen")}>
            <Ionicons name="time" size={28} color="#fff" />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1, paddingBottom: 40 }}>
              {/* CUSTOMER & GOLD RATE INFO */}
              <View style={styles.modernCard}>
                {/* GOLD RATE SECTION */}
                <View style={styles.rateModule}>
                  <View style={styles.rateInfo}>
                    <Ionicons name="trending-up" size={20} color="#F4B400" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.rateLabel}>Today's Gold Rate</Text>
                      {isEditingRate ? (
                        <TextInput
                          style={styles.rateInputSmall}
                          value={goldRate}
                          onChangeText={(val) => {
                            setGoldRate(val);
                            setIssueRate(val);
                            setReceiptRate(val);
                          }}
                          onBlur={() => setIsEditingRate(false)}
                          autoFocus
                          keyboardType="numeric"
                          returnKeyType="done"
                        />
                      ) : (
                        <TouchableOpacity onPress={() => setIsEditingRate(true)}>
                          <Text style={styles.rateValueText}>₹ {Number(goldRate).toLocaleString()}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.editBadge} onPress={() => setIsEditingRate(!isEditingRate)}>
                    <Ionicons name={isEditingRate ? "checkmark-circle" : "pencil"} size={16} color="#fff" />
                    <Text style={styles.editBadgeText}>{isEditingRate ? "Save" : "Edit"}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* CUSTOMER LOOKUP SECTION */}
                <View style={styles.formHeader}>
                  <Ionicons name="person-circle" size={24} color="#1B4D1B" />
                  <Text style={styles.formTitle}> Customer Information</Text>
                </View>

                <View style={[styles.inputGroup, { zIndex: 5000 }]}>
                  <Text style={styles.inputLabel}>Search & Select Customer</Text>
                  <TextInput
                    style={styles.modernInput}
                    value={customerName}
                    onChangeText={handleSearch}
                    placeholder="Type customer name..."
                    returnKeyType="next"
                  />

                  {showDropdown && filteredCustomers.length > 0 && (
                    <View style={styles.dropdown}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                        {filteredCustomers.map((cust, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => selectCustomer(cust)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dropdownText}>{cust.customerName}</Text>
                              <Text style={{ fontSize: 12, color: '#666' }}>{cust.phone}</Text>
                            </View>
                            <Text style={styles.dropdownType}>{cust.type}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <TextInput
                    style={styles.modernInput}
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="Mobile number will auto-fill"
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.modernInput}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Customer Address"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <EntryForm 
                title="Issue" name={issueName} setName={setIssueName} w={issueWeight} setW={setIssueWeight} c={issueCount} setC={setIssueCount} p={issuePure} setP={setIssuePure} r={issueRate} setR={setIssueRate} onAdd={addIssueItem} color="#D32F2F" 
                handleItemSearch={handleItemSearch}
                showItemDropdown={showItemDropdown}
                issueFilteredStocks={issueFilteredStocks}
                receiptFilteredStocks={receiptFilteredStocks}
                selectStockItem={selectStockItem}
              />
              <DataTable items={issueItems} type="Issue" color="#D32F2F" removeItem={removeItem} />

              <EntryForm 
                title="Receipt" name={receiptName} setName={setReceiptName} w={receiptWeight} setW={setReceiptWeight} c={receiptCount} setC={setReceiptCount} p={receiptPure} setP={setReceiptPure} r={receiptRate} setR={setReceiptRate} onAdd={addReceiptItem} color="#2E7D32" 
                handleItemSearch={handleItemSearch}
                showItemDropdown={showItemDropdown}
                issueFilteredStocks={issueFilteredStocks}
                receiptFilteredStocks={receiptFilteredStocks}
                selectStockItem={selectStockItem}
              />
              <DataTable items={receiptItems} type="Receipt" color="#2E7D32" removeItem={removeItem} />

              {/* SUMMARY */}
              <View style={styles.totalCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Net Pure Gold:</Text>
                  <Text style={[styles.totalValue, { color: netPure >= 0 ? '#D32F2F' : '#2E7D32' }]}>{netPure.toFixed(3)} g</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Grand Total (₹):</Text>
                  <Text style={styles.totalValue}>₹ {netAmount.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
                <TouchableOpacity style={styles.printBtn} onPress={handlePrint}><Text style={styles.printText}>Save & Print</Text></TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F6F9" },
  header: {
    backgroundColor: "#1B4D1B",
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 45 : 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginLeft: 15 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, margin: 14, elevation: 3 },
  label: { fontWeight: "700" },

  rateHeader: { flexDirection: "row", justifyContent: "space-between" },
  rateText: { fontSize: 20, fontWeight: "700", marginTop: 10 },
  rateInput: { backgroundColor: "#F1F3F6", borderRadius: 10, padding: 10, fontSize: 18 },

  flex1: { flex: 1, marginHorizontal: 4 },
  miniLabel: { fontSize: 12, color: "#666", marginBottom: 2, marginLeft: 5 },

  totalCard: {
    borderWidth: 2,
    borderColor: "#F4B400",
    borderRadius: 14,
    padding: 14,
    margin: 14,
    backgroundColor: "#FFF9C4"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  totalLabel: { fontWeight: "700", fontSize: 16 },
  totalValue: { fontWeight: "700", fontSize: 16 },

  modernCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 14,
    marginVertical: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  formTitle: { fontSize: 18, fontWeight: "800", textTransform: "uppercase" },
  inputGroup: { marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 4, marginLeft: 4 },
  modernInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    color: "#333",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 5,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  rateModule: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
  },
  rateInfo: { flexDirection: "row", alignItems: "center" },
  rateLabel: { fontSize: 12, fontWeight: "600", color: "#666" },
  rateValueText: { fontSize: 22, fontWeight: "800", color: "#F4B400" },
  rateInputSmall: { fontSize: 18, fontWeight: "800", color: "#F4B400", padding: 0, minWidth: 100 },
  editBadge: {
    flexDirection: "row",
    backgroundColor: "#1B4D1B",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
    gap: 4,
  },
  editBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  divider: { height: 1.5, backgroundColor: "#F1F3F5", marginBottom: 15 },

  tableCard: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 5,
    marginBottom: 15,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  tableSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  tableSubTitle: { fontSize: 14, fontWeight: "800", textTransform: "uppercase" },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  totalBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  modernTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F3F5",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  mHeaderCell: {
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#6C757D",
    textTransform: "uppercase",
  },
  modernTableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    alignItems: "center",
  },
  mCell: {
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#495057",
  },

  tableSectionHeader: {
    padding: 10,
    alignItems: 'center',
  },
  tableSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F3F6",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerCell: {
    paddingHorizontal: 8,
    fontWeight: "800",
    fontSize: 13,
    color: "#555",
    textAlign: 'left'
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "center"
  },
  cell: {
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#666",
    textAlign: 'left'
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: '#EEE',
  },

  dropdown: {
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 5000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dropdownType: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  stockDropdown: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 3000,
  },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", margin: 14, marginTop: 20 },
  saveBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    width: "48%",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1B4D1B",
  },
  printBtn: {
    backgroundColor: "#1B4D1B",
    borderRadius: 14,
    padding: 16,
    width: "48%",
    alignItems: "center",
    elevation: 4,
  },
  saveText: { fontWeight: "800", color: "#1B4D1B" },
  printText: { color: "#fff", fontWeight: "800" },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";
import {
  computeNetBalance,
  deriveBalanceStateFromNet,
  normalizeBalanceState,
} from "./balanceUtils";

export default function Dealer({ navigation, route }) {
  const [dealers, setDealers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dealerWeights, setDealerWeights] = useState({});
  const [dealerDropdowns, setDealerDropdowns] = useState({});
  const [dealerSearchQuery, setDealerSearchQuery] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDealers();
      
      fetchTransfers();
      fetchItems();
      fetchStocks();
    });

    fetchDealers();
    fetchTransfers();
    fetchStocks();

    return unsubscribe;
  }, [navigation]);

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${base_url}/stockMaster`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await fetch(`${base_url}/payments/dealerTransferHistory`);
      if (response.ok) {
        const data = await response.json();
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };



  const fetchDealers = async () => {
    try {
      const response = await fetch(`${base_url}/customersDealer`);
      if (!response.ok) {
        throw new Error('Failed to fetch dealers');
      }
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format: expected an array');
      }

      const dealerList = data.map((dealer) => {
        const normalizedBalance = normalizeBalanceState({
          oldBalance: dealer.oldBalance,
          advanceBalance: dealer.advanceBalance,
        });
        return {
          ...dealer,
          ...normalizedBalance,
          customerType: 'Dealer',
          customerNumber: dealer.phoneNumber,
          workerName: dealer.workerName || ""
        };
      });

      setDealers(dealerList);
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  };

  const handleDeleteDealer = async (id) => {
    Alert.alert(
      "Delete Dealer",
      "Are you sure you want to delete this dealer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${base_url}/customersDealer/${id}`, {
                method: "DELETE",
              });
              if (response.ok) {
                Alert.alert("Success", "Dealer deleted successfully");
                fetchDealers();
              } else {
                Alert.alert("Error", "Failed to delete dealer");
              }
            } catch (error) {
              console.error("Error deleting dealer:", error);
              Alert.alert("Error", "An error occurred while deleting");
            }
          },
        },
      ]
    );
  };

  const handleSaveWeight = async (item) => {
    const dealerId = item._id || item.id;
    const w = parseFloat(dealerWeights[dealerId]);
    const selectedItemName = dealerDropdowns[dealerId];

    if (!w || w <= 0) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }
    if (!selectedItemName) {
      Alert.alert("Error", "Please select an item type from the dropdown");
      return;
    }

    try {
      // 1. Update StockMaster
      const stockItem = stocks.find(s => s.itemName === selectedItemName);

      if (stockItem) {
        // DEDUCT from stock
        const currentStockWeight = parseFloat(stockItem.grossWeight || 0);
        if (currentStockWeight < w) {
          Alert.alert("Warning", `Insufficient stock! Available: ${currentStockWeight}g. You are trying to transfer ${w}g.`);
          // We still allow it if needed, or we can return. Let's return for safety as per "deducted" requirement.
          return;
        }

        const updatedWeight = currentStockWeight - w;
        await fetch(`${base_url}/stockMaster/${stockItem._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...stockItem, grossWeight: updatedWeight })
        });
      } else {
        Alert.alert("Error", "Selected item not found in stock master");
        return;
      }

      // 2. Add to Transfer History 
      const transferData = {
        date: new Date().toISOString(),
        selectedDealer: item.customerName,
        selectedItems: [selectedItemName],
        totalSelectedWeight: w,
        weightSubtraction: 0,
        transferWeight: w,
        type: "dealerTransfer"
      };

      await fetch(`${base_url}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferData)
      });

      // 3. Update Dealer Balance
      // Logic for Issue: Shop Gold decreases (-), Dealer Debt increases (+)
      const newNetBalance = computeNetBalance({
        oldBalance: item.oldBalance,
        advanceBalance: item.advanceBalance,
        issue: w,
      });
      const finalState = deriveBalanceStateFromNet(newNetBalance);
      const newOb = finalState.oldBalance;
      const newAb = finalState.advanceBalance;

      const updateResponse = await fetch(`${base_url}/customersDealer/${dealerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          oldBalance: newOb,
          advanceBalance: newAb
        }),
      });

      if (updateResponse.ok) {
        Alert.alert("Success", "Weight deducted from stock and added to dealer balance.");

        // Clear inputs for this dealer
        setDealerWeights((prev) => ({ ...prev, [dealerId]: "" }));
        setDealerDropdowns((prev) => ({ ...prev, [dealerId]: "" }));
        setDealerSearchQuery((prev) => ({ ...prev, [dealerId]: "" }));

        // Reload data
        fetchDealers();
        fetchTransfers();
        fetchStocks();
      } else {
        Alert.alert("Error", "Failed to update dealer balance");
      }
    } catch (error) {
      console.error("Error saving weight:", error);
      Alert.alert("Error", "An error occurred while saving weight");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <CommonHeader
      title="Dealer Master"
      onBack={() => navigation.goBack()}
      backgroundColor="#B8860B"
      />

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Dealer by name or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        keyboardShouldPersistTaps="handled"
        data={dealers.filter(dealer =>
          (dealer.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
          (dealer.customerNumber?.toLowerCase() || "").includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => {
          // Find all transfers for this dealer
          const dealerTransfers = transfers.filter(t => t.selectedDealer === item.customerName);
          // Calculate total transferred weight
          const totalTransferred = dealerTransfers.reduce((sum, t) => sum + (t.transferWeight || 0), 0);
          const cardBalance = normalizeBalanceState({
            oldBalance: item.oldBalance,
            advanceBalance: item.advanceBalance,
          });
          const activeBalance =
            cardBalance.oldBalance > 0 ? cardBalance.oldBalance : cardBalance.advanceBalance;

          return (
            <View style={[styles.card, { zIndex: dropdownOpen[item._id || item.id] ? 10 : 1 }]}>
              <View style={styles.cardHeader}>
                <View style={styles.dealerProfileContainer}>
                  <View style={styles.dealerImagePlaceholder}>
                    <Ionicons name="person-outline" size={30} color="#999" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.customerName}</Text>
                    <Text style={styles.cardSubtitle}>Phone: {item.customerNumber}</Text>
                  </View>
                </View>
                <View style={styles.actionIcons}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("EditCustomerMaster", { customer: item })}
                    style={styles.iconButton}
                  >
                    <Ionicons name="create-outline" size={24} color="#1565C0" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteDealer(item._id || item.id)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={24} color="#C62828" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>Type: {item.customerType}</Text>
              {item.workerName ? (
                <Text style={styles.cardSubtitle}>Worker : {item.workerName}</Text>
              ) : null}

              {/* Current Balance */}
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Current Balance: </Text>
                <Text style={styles.balanceValue}>
                  {activeBalance.toFixed(3)} g
                </Text>
              </View>

              {/* Type Dropdown Field (Searchable) */}
              <View style={[styles.dropdownContainer, { zIndex: 10 }]}>
                <Text style={styles.weightInputLabel}>Select Type</Text>
                <View style={[styles.pickerWrapper, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <TextInput
                    style={styles.searchDropdownInput}
                    placeholder="Search Issue or Receipt Item..."
                    value={dealerSearchQuery[item._id || item.id] ?? ""}
                    onFocus={() => {
                      setDropdownOpen((prev) => ({ ...prev, [item._id || item.id]: true }));
                    }}
                    onBlur={() => {
                      setTimeout(() => setDropdownOpen((prev) => ({ ...prev, [item._id || item.id]: false })), 200);
                    }}
                    onChangeText={(val) => {
                      setDealerSearchQuery((prev) => ({ ...prev, [item._id || item.id]: val }));
                      setDropdownOpen((prev) => ({ ...prev, [item._id || item.id]: true }));
                    }}
                  />
                  {dropdownOpen[item._id || item.id] && (
                    <View style={styles.dropdownList}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        style={{ maxHeight: 150 }}
                        keyboardShouldPersistTaps="always"
                      >
                        {stocks
                          .filter(stock =>
                            stock.itemName.toLowerCase().includes((dealerSearchQuery[item._id || item.id] || "").toLowerCase())
                          )
                          .map((stock) => (
                            <TouchableOpacity
                              key={stock._id}
                              style={styles.dropdownOption}
                              onPress={() => {
                                setDealerDropdowns((prev) => ({ ...prev, [item._id || item.id]: stock.itemName }));
                                setDealerSearchQuery((prev) => ({ ...prev, [item._id || item.id]: stock.itemName }));
                                setDropdownOpen((prev) => ({ ...prev, [item._id || item.id]: false }));
                              }}
                            >
                              <Text style={styles.dropdownOptionText}>{stock.itemName}</Text>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Display Available Stock Weight */}
                {dealerDropdowns[item._id || item.id] && (
                  <View style={styles.stockStatusContainer}>
                    <Text style={styles.stockStatusLabel}>
                      Available in Stock:
                      <Text style={styles.stockStatusValue}>
                        {" "}{stocks.find(s => s.itemName === dealerDropdowns[item._id || item.id])?.grossWeight || 0} g
                      </Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Weight Input Field */}
              <View style={styles.weightInputContainer}>
                <Text style={styles.weightInputLabel}>Weight (g)</Text>
                <View style={styles.weightInputRow}>
                  <TextInput
                    style={styles.weightInput}
                    placeholder="Enter Weight"
                    keyboardType="decimal-pad"
                    value={dealerWeights[item._id || item.id] || ""}
                    onChangeText={(val) => setDealerWeights((prev) => ({ ...prev, [item._id || item.id]: val }))}
                  />
                  <TouchableOpacity
                    style={styles.weightSaveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSaveWeight(item);
                    }}
                  >
                    <Text style={styles.weightSaveText}>SAVE</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* View Bill Button */}
              <TouchableOpacity
                style={styles.viewBillButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate("DealerBill", { dealer: item });
                }}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text style={styles.viewBillText}>View Bill</Text>
              </TouchableOpacity>
            </View>
          );
        }}

      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("CreateCustomerMaster", {
            customers: dealers,
            type: "Dealer",
          })
        }
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#B8860B",
    height: 110,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 25,
  },
  dealerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dealerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  dealerImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2800",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#444",
    marginTop: 3,
  },
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#B8860B",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  transferInfo: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  transferTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#B8860B",
    marginBottom: 4,
  },
  transferText: {
    fontSize: 12,
    color: "#555",
  },
  balanceInfo: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7A5C00",
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#B8860B",
  },
  transferItem: {
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#B8860B",
  },
  transferDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A5C00",
    marginBottom: 4,
  },
  transferWeightText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#B8860B",
    marginTop: 2,
  },
  totalTransferredBox: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1976D2",
  },
  totalTransferredLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1565C0",
  },
  totalTransferredValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0D47A1",
  },
  viewBillButton: {
    backgroundColor: "#B8860B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  viewBillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  actionIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
    padding: 5,
  },
  weightInputContainer: {
    marginTop: 15,
  },
  weightInputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#B8860B",
    marginBottom: 5,
  },
  weightInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#F9F9F9",
  },
  weightSaveButton: {
    backgroundColor: "#1565C0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  weightSaveText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  dropdownContainer: {
    marginTop: 15,
    zIndex: 10, // Ensure dropdown overlaps elements below
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    overflow: "visible", // Allowed overflow so the absolute dropdown works
  },
  searchDropdownInput: {
    padding: 12,
    fontSize: 14,
    color: "#333",
  },
  dropdownList: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 0,
    elevation: 3,
    zIndex: 100,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownOptionText: {
    fontSize: 14,
    color: "#333",
  },
  stockStatusContainer: {
    marginTop: 8,
    backgroundColor: "#E3F2FD",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#1976D2",
  },
  stockStatusLabel: {
    fontSize: 13,
    color: "#1565C0",
    fontWeight: "600",
  },
  stockStatusValue: {
    fontSize: 14,
    color: "#0D47A1",
    fontWeight: "bold",
  },
});

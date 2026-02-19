import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";

export default function Dealer({ navigation, route }) {
  const [dealers, setDealers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDealers();
      fetchTransfers();
    });

    fetchDealers();
    fetchTransfers();

    return unsubscribe;
  }, [navigation]);

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

      const dealerList = data.map(dealer => ({
        ...dealer,
        customerType: 'Dealer',
        customerNumber: dealer.phoneNumber,
        workerName: dealer.workerName || ""
      }));

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

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ top: 14 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Dealer Master</Text>
      </View>

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

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("EditCustomerMaster", { customer: item })}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.customerName}</Text>
                  <Text style={styles.cardSubtitle}>Phone: {item.customerNumber}</Text>
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
                  {((item.oldBalance || 0) + (item.advanceBalance || 0)).toFixed(3)} g
                </Text>
              </View>

              {/* Transfer History */}
              {dealerTransfers.length > 0 && (
                <View style={styles.transferInfo}>
                  {/* Total Transferred Weight Summary */}
                  <View style={styles.totalTransferredBox}>
                    <Text style={styles.totalTransferredLabel}>Total Transferred Weight:</Text>
                    <Text style={styles.totalTransferredValue}>{totalTransferred.toFixed(3)} g</Text>
                  </View>

                  <Text style={styles.transferTitle}>Transfer History ({dealerTransfers.length}):</Text>
                  {dealerTransfers
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 2)
                    .map((transfer, index) => (
                      <View key={transfer._id || index} style={styles.transferItem}>
                        <Text style={styles.transferDate}>
                          {new Date(transfer.date).toLocaleDateString()} at {new Date(transfer.createdAt).toLocaleTimeString()}
                        </Text>
                        <Text style={styles.transferText}>
                          Items: {transfer.selectedItems?.join(', ') || 'N/A'}
                        </Text>
                        <Text style={styles.transferText}>
                          Total Weight: {transfer.totalSelectedWeight?.toFixed(3)} g
                        </Text>
                        <Text style={styles.transferWeightText}>
                          Transfer Weight: {transfer.transferWeight?.toFixed(3)} g
                        </Text>
                        <Text style={styles.transferText}>
                          Balance Weight: {transfer.weightSubtraction?.toFixed(3)} g
                        </Text>
                      </View>
                    ))}
                </View>
              )}

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
            </TouchableOpacity>
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
    backgroundColor: "#2E7D32",
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
    color: "#1B4D1B",
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
    backgroundColor: "#2E7D32",
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
    color: "#2E7D32",
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
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B5E20",
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  transferItem: {
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2E7D32",
  },
  transferDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1B5E20",
    marginBottom: 4,
  },
  transferWeightText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2E7D32",
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
    backgroundColor: "#2E7D32",
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
});

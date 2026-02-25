import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Animated,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { base_url } from "./config";

export default function HomeScreen() {
  const navigation = useNavigation();

  const getCurrentDate = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const [goldRate, setGoldRate] = useState("11500");
  const [goldDate, setGoldDate] = useState(getCurrentDate());
  const [ftRate, setFtRate] = useState("150");
  const [ftDate, setFtDate] = useState(getCurrentDate());
  const [modalVisible, setModalVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-250))[0];
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date) => {
    const d = date || new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = String(hours).padStart(2, "0");

    return `${day}-${month}-${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  useEffect(() => {
    fetchData();
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      console.log("Fetching rates from:", `${base_url}/rates`);
      const response = await fetch(`${base_url}/rates`);
      console.log("Rates response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Rates loaded from DB:", data);
        setGoldRate(data.goldRate);
        setGoldDate(data.goldDate);
        setFtRate(data.ftRate);
        setFtDate(data.ftDate);
        return;
      } else {
        console.log("No rates in DB yet, using defaults/AsyncStorage");
      }
    } catch (error) {
      console.log("DB fetch failed, falling back to AsyncStorage. Error:", error.message);
    }

    // Fallback to AsyncStorage
    try {
      const savedGoldRate = await AsyncStorage.getItem("goldRate");
      if (savedGoldRate) setGoldRate(savedGoldRate);
      const savedFtRate = await AsyncStorage.getItem("ftRate");
      if (savedFtRate) setFtRate(savedFtRate);
    } catch (error) {
      console.error("AsyncStorage error:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const b2bResponse = await fetch(`${base_url}/transactions`);
      const b2bData = b2bResponse.ok ? await b2bResponse.json() : [];

      const b2cResponse = await fetch(`${base_url}/retail`);
      const b2cData = b2cResponse.ok ? await b2cResponse.json() : [];

      const b2bMapped = b2bData
        .filter((t) => t.customerName || t.name)
        .map((t) => ({ ...t, type: "B2B" }));
      const b2cMapped = b2cData
        .filter((t) => t.customerName || t.name)
        .map((t) => ({ ...t, type: "B2C" }));

      const merged = [...b2bMapped, ...b2cMapped].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
      });

      const uniqueLatestTransactions = [];
      const seenCustomers = new Set();

      for (const txn of merged) {
        const name = txn.customerName || txn.name;
        if (!seenCustomers.has(name)) {
          seenCustomers.add(name);
          uniqueLatestTransactions.push(txn);
        }
      }

      setTransactions(uniqueLatestTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setMenuOpen(false));
  };

  const handleMenuNavigation = (screenName) => {
    navigation.navigate(screenName);
    closeMenu();
  };

  const handleSave = async () => {
    const payload = { goldRate, goldDate, ftRate, ftDate };
    console.log("Save pressed. Payload:", payload);
    console.log("Saving to:", `${base_url}/rates`);

    try {
      const response = await fetch(`${base_url}/rates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Save response status:", response.status);
      const result = await response.json();
      console.log("Save result:", result);

      if (response.ok) {
        await AsyncStorage.setItem("goldRate", goldRate);
        await AsyncStorage.setItem("ftRate", ftRate);
        Alert.alert("Success", "Rates saved successfully!");
      } else {
        Alert.alert("Error", `Failed to save: ${result.message}`);
      }
    } catch (error) {
      console.error("Save error:", error.message);
      Alert.alert("Error", `Network error: ${error.message}`);
    }

    setModalVisible(false);
  };


  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchData();
      await loadRates();
      console.log("Success", "Data refreshed successfully!");
    } catch (error) {
      console.error("Refresh error:", error);
      console.log("Error", "Failed to refresh data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((txn) => {
    const name = txn.customerName || txn.name || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "All" ||
      txn.type === filterType ||
      txn.customerType === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {menuOpen && (
        <TouchableOpacity style={styles.overlay} onPress={closeMenu} />
      )}

      {/* SIDE MENU */}
      <Animated.View style={[styles.sideMenu, { left: slideAnim }]}>
        <Text style={styles.menuTitle}>Menu</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("Home")}
        >
          <Icon name="view-dashboard-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("CustomerDataList")}
        >
          <Foundation name="database" color="#fff" size={24} />
          <Text style={styles.menuText}>Customer Data List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("RetailTransaction")}
        >
          <Icon name="cash-register" size={25} color="#fff" />
          <Text style={styles.menuText}>Retail Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("SuspenseTransaction")}
        >
          <Icon name="alert-circle-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Suspense Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("StockMaster")}
        >
          <Icon name="alert-circle-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Stock Master</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("Purchase")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Purchase</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("WorkerList")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Worker List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("Order")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("UPIControl")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>UPI Control</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("GSTPage")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>GST Page</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("Dealer")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Dealer List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("Settings")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu}>
            <Icon name="menu" size={30} color="#fff" style={{ top: 25 }} />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.headerText}>Hey! Super Admin</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
              <TouchableOpacity onPress={handleRefresh}>
                <Icon name="refresh" size={28} color="#fff" style={{ top: 25 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Gold + FT Card */}
        <View style={styles.goldCard}>
          <TouchableOpacity
            style={styles.cardEditIcon}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="pencil" size={20} style={{ top: 70 }} color="#FFD700" />
          </TouchableOpacity>

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.goldLabel}>GOLD PRICE</Text>
              <Text style={styles.goldRate}>₹{goldRate}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.goldLabel}>FT RATE</Text>
              <Text style={styles.goldRate}>₹{ftRate}</Text>
            </View>
          </View>

          <View style={styles.cardBottomRow}>
            <Icon name="clock-outline" size={14} color="#FFD700" style={{ marginRight: 6 }} />
            <Text style={styles.clockTextInside}>{formatDateTime(currentDateTime)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Access</Text>

        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() =>
              navigation.navigate("B2BCalculationPage", { ftRate })
            }
          >
            <Text style={styles.quickTileText}>B2B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() =>
              navigation.navigate("B2CCalculationPage", { goldRate })
            }
          >
            <Text style={styles.quickTileText}>B2C</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("StockMaster")}
          >
            <Text style={styles.quickTileText}>StockMaster</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("ItemEntry")}
          >
            <Text style={styles.quickTileText}>Item Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("Estimate", { goldRate })}
          >
            <Text style={styles.quickTileText}>Estimate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("CustomerDataList")}
          >
            <Text style={styles.quickTileText}>Customer</Text>
            <Text style={styles.quickTileText}>Data List</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        <FlatList
          data={filteredTransactions.slice(0, 10)}
          keyExtractor={(item) =>
            item._id || item.id || Math.random().toString()
          }
          scrollEnabled={false}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", marginTop: 20, color: "#999" }}
            >
              {loading ? "Loading transactions..." : "No transactions found"}
            </Text>
          }
          renderItem={({ item }) => {
            const isB2C =
              item.type === "B2C" || item.customerType === "B2C";
            const name = item.customerName || item.name;

            let balanceLabel = "Old Balance";
            let balanceValue = 0;
            let balanceColor = "#D32F2F";
            let unit = isB2C ? "₹" : "g";

            if (isB2C) {
              const val = parseFloat(item.newBalance || item.balance || 0);
              if (val < 0) {
                balanceLabel = "Advance Balance";
                balanceValue = Math.abs(val);
                balanceColor = "#2E7D32";
              } else {
                balanceLabel = "Old Balance";
                balanceValue = val;
                balanceColor = "#D32F2F";
              }
            } else {
              if (item.balance > 0) {
                balanceLabel = "Old Balance";
                balanceValue = item.balance;
                balanceColor = "#D32F2F";
              } else if (item.advBal > 0) {
                balanceLabel = "Advance Balance";
                balanceValue = item.advBal;
                balanceColor = "#2E7D32";
              } else {
                balanceValue = 0;
              }
            }

            return (
              <View style={styles.transactionCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnName}>{name}</Text>
                  <Text
                    style={[
                      styles.txnWeight,
                      { color: balanceColor, fontWeight: "700", marginTop: 5 },
                    ]}
                  >
                    {balanceLabel}: {isB2C ? unit : ""}
                    {Number(balanceValue).toFixed(isB2C ? 2 : 3)}
                    {!isB2C ? unit : ""}
                  </Text>
                </View>

                <View
                  style={[
                    styles.customerTag,
                    {
                      backgroundColor: isB2C ? "#E3F2FD" : "#E2FBE8",
                      marginLeft: 10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.customerText,
                      { color: isB2C ? "#1565C0" : "#1B4D1B" },
                    ]}
                  >
                    {isB2C ? "B2C" : "B2B"}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="home-outline" size={28} color="#2E7D32" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ReportScreen")}>
          <Ionicons name="document-outline" color="#000" size={28} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("B2BCalculationPage")}
        >
          <Icon name="plus" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Order")}>
          <FontAwesome
            name="money"
            color="#555"
            size={28}
            style={{ bottom: -1, marginLeft: 20 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <FontAwesome
            name="cog"
            color="#555"
            size={28}
            style={{ bottom: -1, marginLeft: 5 }}
          />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Rates & Dates</Text>

            <Text style={{ color: "#666", marginBottom: 4 }}>Gold Rate</Text>
            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={setGoldRate}
              keyboardType="numeric"
              placeholder="Enter Gold Rate"
            />

            <Text style={{ color: "#666", marginBottom: 4 }}>Gold Date</Text>
            <TextInput
              style={styles.input}
              value={goldDate}
              onChangeText={setGoldDate}
              placeholder="DD-MM-YYYY"
            />

            <Text style={{ color: "#666", marginBottom: 4 }}>FT Rate</Text>
            <TextInput
              style={styles.input}
              value={ftRate}
              onChangeText={setFtRate}
              keyboardType="numeric"
              placeholder="Enter FT Rate"
            />

            <Text style={{ color: "#666", marginBottom: 4 }}>FT Date</Text>
            <TextInput
              style={styles.input}
              value={ftDate}
              onChangeText={setFtDate}
              placeholder="DD-MM-YYYY"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1,
  },
  sideMenu: {
    position: "absolute",
    width: 250,
    height: "100%",
    backgroundColor: "#1B4D1B",
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  menuTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  menuText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
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
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 10,
    top: 25,
  },
  goldCard: {
    backgroundColor: "#1B4D1B",
    marginHorizontal: 15,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  goldLabel: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  goldRate: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.2)",
    paddingTop: 12,
  },
  clockTextInside: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  liveRate: {
    display: 'none',
  },
  liveDate: {
    display: 'none',
  },
  cardEditIcon: {
    position: "absolute",
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 5,
  },
  dateTimeContainer: {
    display: 'none',
  },
  editBtn: {
    display: 'none',
  },
  sectionTitle: {
    marginLeft: 20,
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
    bottom: 5,
  },
  quickAccessRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 15,
  },
  quickTile: {
    backgroundColor: "#F4F4F4",
    width: 110,
    height: 90,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  quickTileText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  transactionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 3,
  },
  txnName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  txnWeight: {
    color: "#444",
    marginTop: 3,
  },
  customerTag: {
    backgroundColor: "#E2FBE8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "center",
  },
  customerText: {
    color: "#1B4D1B",
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    bottom: 70,
    right: "43%",
    width: 60,
    height: 60,
    backgroundColor: "#1B4D1B",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  bottomNav: {
    height: 100,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    width: "85%",
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#000",
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterBtnText: {
    fontWeight: "bold",
    color: "#1B4D1B",
    marginRight: 5,
  },
  dropdown: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    elevation: 3,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
});

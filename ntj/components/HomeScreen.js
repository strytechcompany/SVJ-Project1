// HomeScreen.js
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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";
import { base_url } from "./config"; // ← assuming config is in same folder

export default function HomeScreen() {
  const navigation = useNavigation();

  const [goldRate, setGoldRate] = useState("11500");
  const [goldDate, setGoldDate] = useState("23-11-2025");

  const [ftRate, setFtRate] = useState("150");
  const [ftDate, setFtDate] = useState("23-11-2025");

  const [modalVisible, setModalVisible] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-250))[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [customers, setCustomers] = useState([]); // ← will hold B2B + B2C

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const b2bResponse = await fetch(`${base_url}/customers`);
      const b2bData = await b2bResponse.json();
      
      const b2cResponse = await fetch(`${base_url}/customersB2C`);
      const b2cData = await b2cResponse.json();

      const b2bCustomers = b2bData.map(customer => ({
        id: customer._id || customer.id, // fallback id
        name: customer.customerName,
        weight: `${customer.oldBalance || 0} g`, // map oldBalance → weight
        type: 'B2B',
      }));

      const b2cCustomers = b2cData.map(customer => ({
        id: customer._id || customer.id,
        name: customer.customerName,
        weight: `${customer.oldBalance || 0} g`,
        type: 'B2C',
      }));

      const allCustomers = [...b2bCustomers, ...b2cCustomers];
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      // Optionally set dummy data or show error
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

  const handleSave = () => {
    setModalVisible(false);
  };

  // Filter logic remains unchanged
  const filteredTransactions = customers.filter((txn) => {
    const matchesSearch = txn.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "All" || txn.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Background overlay */}
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
          <Text style={styles.menuText}>Customer Data List </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("CustomerMasterList")}
        >
          <Icon name="cash-register" size={25} color="#fff" />
          <Text style={styles.menuText}>Customer List</Text>
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
          <Text style={styles.menuText}>Stock Master </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuNavigation("Users")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Users List</Text>
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
          onPress={() => handleMenuNavigation("B2Bt")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Issue and Receipt List</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu}>
            <Icon name="menu" size={30} color="#fff" style={{ top: 25 }} />
          </TouchableOpacity>

          <Text style={styles.headerText}>Hey! Super Admin</Text>
        </View>

        {/* Gold + FT Card */}
        <View style={styles.goldCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.goldLabel}>GOLD PRICE</Text>
            <Text style={styles.goldRate}>₹{goldRate}</Text>
            <Text style={styles.liveRate}>LIVE RATE</Text>
            <Text style={styles.liveDate}>{goldDate}</Text>
          </View>

          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.goldLabel}>FT RATE</Text>
            <Text style={styles.goldRate}>₹{ftRate}</Text>
            <Text style={styles.liveRate}>LIVE RATE</Text>
            <Text style={styles.liveDate}>{ftDate}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.editBtnText}>Edit Gold Rate</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Access</Text>

        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("B2BCalculationPage")}
          >
            <Text style={styles.quickTileText}>B2B Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("B2Ct")}
          >
            <Text style={styles.quickTileText}> B2C Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("SuspenseTransaction")}
          >
            <Text style={styles.quickTileText}>Suspense Transaction</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickAccessRow1}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate("ItemEntry")}
          >
            <Text style={styles.quickTileText}> Item Entry</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
          >
            <Text style={styles.filterBtnText}>{filterType}</Text>
            <Icon name="chevron-down" size={20} color="#1B4D1B" />
          </TouchableOpacity>
        </View>

        {/* Filter Dropdown */}
        {filterDropdownOpen && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setFilterType("All");
                setFilterDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setFilterType("B2B");
                setFilterDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>B2B</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setFilterType("B2C");
                setFilterDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>B2C</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id || item.name}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.transactionCard}>
              <View>
                <Text style={styles.txnName}>{item.name}</Text>
                <Text style={styles.txnWeight}>GOLD WT : {item.weight}</Text>
              </View>

              <View style={styles.customerTag}>
                <Text style={styles.customerText}>{item.type}</Text>
              </View>
            </View>
          )}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="home-outline" size={28} color="#2E7D32" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Search")}>
          <Icon name="magnify" size={28} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("Order")}
        >
          <Icon name="plus" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("StockMaster")}>
          <FontAwesome
            name="money"
            color="#555"
            size={28}
            style={{ bottom: -1, marginLeft: 20 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("PersonalUser")}>
          <Icon name="account-outline" size={28} color="#555" />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Rates & Dates</Text>

            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={setGoldRate}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              value={goldDate}
              onChangeText={setGoldDate}
            />

            <TextInput
              style={styles.input}
              value={ftRate}
              onChangeText={setFtRate}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              value={ftDate}
              onChangeText={setFtDate}
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

// --- STYLES (unchanged) ---
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
    margin: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
  },
  goldLabel: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },
  goldRate: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  liveRate: {
    color: "red",
    marginTop: 10,
    fontWeight: "600",
  },
  liveDate: {
    color: "#ffffff",
  },

  editBtn: {
    backgroundColor: "#FFD700",
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
  },
  editBtnText: {
    fontWeight: "bold",
    fontSize: 16,
  },

  sectionTitle: {
    marginLeft: 20,
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
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
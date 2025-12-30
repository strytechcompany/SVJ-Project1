import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function RetailTransaction({ navigation, route }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Side Menu Animation
  const slideAnim = useRef(new Animated.Value(-250)).current;

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

  const handleMenuNavigation = (screen) => {
    closeMenu();
    navigation.navigate(screen);
  };

  // DEFAULT SAMPLE DATA
  const [transactions, setTransactions] = useState([
    { id: "1", name: "Gold Sell", amount: "₹25,000", date: "2025-01-05" },
    { id: "2", name: "Gold Buy", amount: "₹18,500", date: "2025-01-10" },
    { id: "3", name: "Exchange", amount: "₹10,200", date: "2025-01-15" },
  ]);

  // RECEIVE NEW TRANSACTION FROM AddRetailTransaction
  useEffect(() => {
    if (route?.params?.newTransaction) {
      setTransactions((prev) => [route.params.newTransaction, ...prev]);
    }
  }, [route?.params?.newTransaction]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDate}>{item.date}</Text>
      </View>
      <Text style={styles.cardAmount}>{item.amount}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Overlay when menu is open */}
      {menuOpen && <TouchableOpacity style={styles.overlay} onPress={closeMenu} />}

      {/* Side Menu */}
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
          onPress={() => handleMenuNavigation("Users")}
        >
          <Icon name="account-group-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Users List</Text>
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
          onPress={() => handleMenuNavigation("Settings")}
        >
          <Icon name="cog-outline" size={25} color="#fff" />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu}>
            <Icon name="menu" size={30} color="#fff" style={{ top: 15 }} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Retail Transaction</Text>
        </View>

        <View style={styles.container}>
          <Text style={styles.title}>Retail Transaction</Text>

          {/* Transaction List */}
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddRetailTransaction")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  header: {
    backgroundColor: "#1B4D1B",
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 20,
    fontWeight: "600",
    top: 15,
  },

  // Menu
  sideMenu: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "#1B4D1B",
    paddingTop: 40,
    zIndex: 10,
    paddingHorizontal: 15,
  },

  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 5,
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
    marginVertical: 12,
  },
  menuText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 20,
    alignSelf: "center",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  cardDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4D1B",
    alignSelf: "center",
  },

  fab: {
    position: "absolute",
    bottom: "8%",
    right: 25,
    backgroundColor: "#1B4D1B",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
});

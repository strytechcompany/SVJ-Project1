// screens/B2CTransactionList.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { base_url } from "./config";

export default function B2CTransactionList({ navigation }) {
  const [b2cList, setB2cList] = useState([]);
  const [b2cCustomers, setB2cCustomers] = useState([]);

  // ---------------- ADD useEffect TO FETCH CUSTOMERS ----------------
  useEffect(() => {
    fetchB2CCustomers();
  }, []);

  const fetchB2CCustomers = async () => {
    try {
      const response = await fetch(`${base_url}/customersB2C`);
      const data = await response.json();

      // Map the data to match your existing structure
      const formattedCustomers = data.map((customer) => ({
        id: customer._id || customer.id,
        customerName: customer.customerName,
        phone: customer.phoneNumber,
        amount: parseFloat(customer.advanceBalance || 0), // Map advanceBalance
        advanceBalance: parseFloat(customer.advanceBalance || 0),
      }));

      setB2cCustomers(formattedCustomers);
      console.log("✅ Fetched B2C Customers:", formattedCustomers);
    } catch (error) {
      console.error("❌ Error fetching B2C customers:", error);
      Alert.alert("Error", "Failed to load customers");
    }
  };

  // --- animation for list items ---
  const animValues = useRef([]);
  useEffect(() => {
    animValues.current = b2cList.map(
      (_, i) => animValues.current[i] || new Animated.Value(0)
    );

    if (b2cList.length === 0) return;

    const animations = animValues.current.map((av) =>
      Animated.timing(av, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      })
    );

    Animated.stagger(80, animations).start();
  }, [b2cList]);

  const renderItem = ({ item, index }) => {
    const av = animValues.current[index] || new Animated.Value(1);
    const opacity = av;
    const translateY = av.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 0],
    });

    return (
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
          marginBottom: 8,
        }}
      >
        <View style={styles.row}>
          <Text style={styles.rowText}>{item.customerName}</Text>
          <Text style={styles.amount}>₹ {item.amount}</Text>
        </View>
      </Animated.View>
    );
  };

  // -------------------------
  // Floating Add Button Options
  // -------------------------
  const [menuOpen, setMenuOpen] = useState(false);
  const opt1 = useRef(new Animated.Value(0)).current;
  const opt2 = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(opt1, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opt2, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = (cb) => {
    Animated.parallel([
      Animated.timing(opt1, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opt2, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuOpen(false);
      if (typeof cb === "function") cb();
    });
  };

  const toggleMenu = () => {
    if (menuOpen) closeMenu();
    else openMenu();
  };

  // Slide-up animation
  const opt1Style = {
    opacity: opt1,
    transform: [
      {
        translateY: opt1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -70],
        }),
      },
    ],
  };

  const opt2Style = {
    opacity: opt2,
    transform: [
      {
        translateY: opt2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -140],
        }),
      },
    ],
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#fff"
            style={{ top: 5 }}
          />
        </TouchableOpacity>
        <Text style={styles.headerText}>B2C Transactions</Text>
      </View>

      {/* LIST */}
      <FlatList
        data={b2cCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40, color: "#777" }}>
            No B2C transactions yet.
          </Text>
          
        }
        renderItem={renderItem}
      />

      {/* CLOSE OVERLAY */}
      {menuOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => closeMenu()}
        />
      )}

      {/* MAIN ADD BUTTON */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("B2CCalculationPage")}
        >
          <Text style={styles.addText}>+ Add B2C Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2E7D32",
    height: 130,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 15,
    marginTop: 10,
  },
  row: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowText: { fontSize: 16, color: "#333" },
  amount: { fontSize: 16, fontWeight: "bold", color: "#000" },

  fabContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: "center",
  },

  addBtn: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  addText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "bold",
  },

  optionWrap: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: "center",
  },

  optionButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    elevation: 6,
  },

  optionText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: "#222",
  },
});

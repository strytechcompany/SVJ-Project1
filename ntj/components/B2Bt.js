// screens/B2BTransactionList.js
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
import CommonHeader from "./CommonHeader";

export default function B2BTransactionList({ navigation }) {
  const [b2bList, setB2bList] = useState([]);

  // ✅ FETCH REAL DATA FROM DATABASE
  useEffect(() => {
    const fetchB2BTransactions = async () => {
      try {
        const response = await fetch(`${base_url}/transactions`); // Assuming this endpoint returns B2B transactions
        if (response.ok) {
          const data = await response.json();
          // Filter out only B2B transactions if they are mixed
          const filtered = data.filter(t => !t.type || t.type === 'B2B');
          setB2bList(filtered);
        }
      } catch (error) {
        console.error("Error fetching B2B transactions:", error);
      }
    };
    fetchB2BTransactions();
  }, []);

  // --- animation for list items ---
  const animValues = useRef([]);

  useEffect(() => {
    animValues.current = b2bList.map(
      (_, i) => animValues.current[i] || new Animated.Value(0)
    );

    if (b2bList.length === 0) return;

    const animations = animValues.current.map((av) =>
      Animated.timing(av, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      })
    );

    Animated.stagger(80, animations).start();
  }, [b2bList]);

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
          <View>
            <Text style={styles.rowText}>{item.customerName}</Text>
            <Text style={styles.amount}>{Number(item.balance || 0).toFixed(3)}g</Text>
          </View>

          {/* ✅ PREVIEW → REDIRECT TO CreateTransaction WITH DATA */}
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() =>
              navigation.navigate("B2BCalculationPage", {
                previewData: item,
                type: "B2B",
              })
            }
          >
            <Text style={styles.previewText}>Preview</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // --- DOUBLE OPTION ANIMATION FOR FAB ---
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
      <CommonHeader
      title="B2B Transactions"
      onBack={() => navigation.navigate("Home")}
      backgroundColor="#B8860B"
      right={
      <TouchableOpacity
      onPress={() => closeMenu(() => navigation.navigate("CreateCustomerMaster", { type: "B2B" }))}
      >
      <Feather name="user-plus" color="#fff" size={25} />
      </TouchableOpacity>
      }
      />

      {/* LIST */}
      <FlatList
        data={b2bList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40, color: "#777" }}>
            No B2B transactions yet.
          </Text>
        }
        renderItem={renderItem}
      />

      {menuOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => closeMenu()}
        />
      )}

      {/* MAIN BUTTON */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('B2BCalculationPage')}>
          <Text style={styles.addText}>+ Add B2B Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#B8860B",
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
    alignItems: "center",
  },
  rowText: { fontSize: 16, color: "#333" },
  amount: { fontSize: 16, fontWeight: "bold", color: "#000" },

  previewBtn: {
    backgroundColor: "#B8860B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  previewText: {
    color: "#fff",
    fontWeight: "700",
  },

  addBtn: {
    backgroundColor: "#B8860B",
    padding: 15,
    borderRadius: 12,
    margin: 20,
  },
  addText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "bold",
  },

  fabContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: "center",
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
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    marginBottom: 10,
    elevation: 6,
    justifyContent: "center",
  },

  optionText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: "#1f2d24",
  },
});

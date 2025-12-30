// screens/Order.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";

export default function Order({ navigation }) {
  const [selectedTab, setSelectedTab] = useState("Pending");

  const [orders, setOrders] = useState([
    {
      id: "AKSORD29",
      customer: "Rahu",
      worker: "Karthik",
      date: "2025-11-23",
      phone: "9043829808",
      type: "Chain",
      status: "Pending",
    },
    {
      id: "AKSORD28",
      customer: "Karthikeyen",
      worker: "Abdul Ahad",
      date: "2025-11-19",
      phone: "9965781338",
      type: "Chain",
      status: "Pending",
    },
    {
      id: "AKSORD27",
      customer: "Anand",
      worker: "Test1",
      date: "2025-10-26",
      phone: "9999999999",
      type: "Chain",
      status: "Pending",
    },
  ]);

  // ============================
  //       DELETE ORDER
  // ============================
  const deleteOrder = (id) => {
    Alert.alert(
      "Delete Order",
      "Are you sure you want to delete this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setOrders((prev) => prev.filter((o) => o.id !== id));
          },
        },
      ]
    );
  };

  const filteredOrders =
    selectedTab === "All"
      ? orders
      : orders.filter((o) => o.status === selectedTab);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.id}>{item.id}</Text>

        <View style={{ flexDirection: "row" }}>
          {/* Edit */}
          <TouchableOpacity
            onPress={() => navigation.navigate("EditOrder", { order: item })}
            style={{ marginRight: 12 }}
          >
            <Icon name="pencil" size={26} color="#1B4D1B" />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity onPress={() => deleteOrder(item.id)}>
            <Icon name="delete" size={26} color="#b30000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer */}
      <View style={styles.row}>
        <Icon name="account" size={18} color="#1B4D1B" />
        <Text style={styles.text}> Customer: {item.customer}</Text>
      </View>

      {/* Date */}
      <View style={styles.row}>
        <Icon name="calendar" size={18} color="#1B4D1B" />
        <Text style={styles.text}> {item.date}</Text>
      </View>

      {/* Worker */}
      <View style={styles.row}>
        <Icon name="account-cog" size={18} color="#1B4D1B" />
        <Text style={styles.text}> Worker: {item.worker}</Text>
      </View>

      {/* Phone */}
      <View style={styles.row}>
        <Icon name="phone" size={18} color="#1B4D1B" />
        <Text style={styles.text}> {item.phone}</Text>
      </View>

      {/* Type */}
      <View style={styles.row}>
        <Icon name="necklace" size={18} color="#1B4D1B" />
        <Text style={styles.text}> {item.type}</Text>
      </View>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>

      {/* View Button */}
      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => navigation.navigate("ViewOrder", { order: item })}
      >
        <Icon name="eye" size={20} color="#fff" />
        <Text style={styles.viewText}>View</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ top: 12 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Orders</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["All", "Pending", "Assigned"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView>
        <FlatList
          data={filteredOrders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddOrder")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1B4D1B",
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
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 20,
    marginTop: 25,
  },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },

  tab: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  activeTab: {
    backgroundColor: "#1B4D1B",
  },
  tabText: {
    fontSize: 15,
    color: "#333",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    margin: 12,
    borderRadius: 15,
    elevation: 4,
  },
  id: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4D1B",
  },
  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  text: {
    fontSize: 14,
    color: "#444",
  },

  statusBadge: {
    backgroundColor: "#FFE8B0",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  statusText: {
    color: "#8A6200",
    fontWeight: "700",
  },

  viewButton: {
    backgroundColor: "#1B4D1B",
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: "flex-end",
    borderRadius: 10,
    marginTop: 12,
  },
  viewText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
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

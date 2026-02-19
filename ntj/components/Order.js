import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";

export default function Order({ navigation }) {
  const [selectedTab, setSelectedTab] = useState("Pending");
  const [orders, setOrders] = useState([]);
  const [dealers, setDealers] = useState([]); // Dealer list
  const [openDropdownId, setOpenDropdownId] = useState(null); // Manage active dropdown
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ============================
  //    FETCH ORDERS & DEALERS
  // ============================
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, dealersRes] = await Promise.all([
        fetch(`${base_url}/orders`),
        fetch(`${base_url}/customersDealer`)
      ]);

      const ordersData = await ordersRes.json();
      const dealersData = dealersRes.ok ? await dealersRes.json() : [];

      if (dealersRes.ok) {
        setDealers(dealersData);
      }

      if (ordersRes.ok) {
        setOrders(
          ordersData.map((order) => ({
            id: order._id,
            customer: order.customerName,
            phone: order.mobileNumber,
            type: order.itemName,
            weight: order.itemWeight,
            payment: order.paymentType,
            date: order.deliveryDate ? order.deliveryDate.split("T")[0] : "-",
            status: order.status === "Completed" ? "Completed" : (order.assignedDealer ? "Assigned" : "Pending"),
            dealerName: order.assignedDealerName || "",
            dealerId: order.assignedDealer || "",
            image: order.image || null,
            balanceAmount: order.balanceAmount || 0,
          }))
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Server not reachable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAssignDealer = (orderId, dealer) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, dealerName: dealer.customerName, dealerId: dealer._id, status: 'Assigned' } : o
    ));
    setOpenDropdownId(null);
    Alert.alert("Assigned", `Order assigned to ${dealer.customerName}`);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

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
          onPress: async () => {
            try {
              const response = await fetch(`${base_url}/orders/${id}`, {
                method: "DELETE",
              });
              if (response.ok) {
                setOrders((prev) => prev.filter((o) => o.id !== id));
                Alert.alert("Deleted", "Order deleted successfully");
              } else {
                const data = await response.json();
                Alert.alert("Error", data.message || "Failed to delete order");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Server not reachable");
            }
          },
        },
      ]
    );
  };

  // ============================
  //     COMPLETE ORDER
  // ============================
  const handleComplete = (order) => {
    Alert.alert(
      "Complete Order",
      "Are you sure you want to mark this order as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            // 1. Update Status in Backend
            try {
              // Assuming PUT /orders/:id updates fields
              const response = await fetch(`${base_url}/orders/${order.id}`, {
                method: 'PUT', // or PATCH
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Completed" })
              });

              if (response.ok) {
                // Update Local State
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Completed" } : o));

                // 2. WhatsApp Notification
                const message = `Hello ${order.customer} (${order.phone}),\nYour order for ${order.type} has been completed.\nYour pending balance amount is ₹${order.balanceAmount}.\nThank you!`;
                const phone = order.phone.replace(/[^0-9]/g, ''); // Clean phone
                const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;

                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert("Error", "WhatsApp is not installed");
                }

              } else {
                Alert.alert("Error", "Failed to update order status");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Server error");
            }
          }
        }
      ]
    );
  };

  // ============================
  //      PRINT ORDER BILL
  // ============================
  const handlePrintBill = (order) => {
    // Generate Order No starting with A202601
    // Using last 6 chars of ID to keep it somewhat unique and short
    const orderNo = `A202601${(order.id || "").slice(-6).toUpperCase()}`;

    navigation.navigate("BillPreview", {
      order: {
        orderNo: orderNo,
        customer: order.customer,
        phone: order.phone,
        type: order.type,
        weight: order.weight,
        payment: order.payment,
        date: order.date,
        balance: order.balanceAmount,
        image: order.image,
        dealer: order.dealerName
      }
    });
  };

  const filteredOrders =
    selectedTab === "All"
      ? orders
      : orders.filter((o) => o.status === selectedTab);

  const renderItem = ({ item }) => (
    <OrderCard
      item={item}
      dealers={dealers}
      onAssign={handleAssignDealer}
      onDelete={deleteOrder}
      onEdit={(order) => navigation.navigate("EditOrder", { order })}
      onView={(order) => navigation.navigate("ViewOrder", { order })}
      onComplete={handleComplete}
      onPrint={handlePrintBill}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={{ top: 12 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Orders</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["All", "Pending", "Assigned", "Completed"].map((tab) => (
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
      {loading ? (
        <ActivityIndicator size="large" color="#1B4D1B" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <FlatList
            data={filteredOrders}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </ScrollView>
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddOrder", { onGoBack: fetchOrders })}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const OrderCard = ({ item, dealers, onAssign, onDelete, onEdit, onView, onComplete, onPrint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDealers = dealers.filter((d) =>
    (d.customerName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (dealer) => {
    onAssign(item.id, dealer);
    setIsOpen(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <View style={styles.actionIcons}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
            <Icon name="pencil-outline" size={20} color="#1B4D1B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.iconBtn}>
            <Icon name="delete-outline" size={20} color="#b30000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* IMAGE BOX */}
        <View style={styles.imageBox}>
          {item.image ? (
            <Image
              source={{ uri: item.image.startsWith('http') ? item.image : `${base_url}/${item.image}` }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderBox}>
              <Icon name="image-off-outline" size={24} color="#ccc" />
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>

        {/* DETAILS COLUMN */}
        <View style={styles.detailsColumn}>
          <Text style={styles.customerNameTitle} numberOfLines={1}>{item.customer}</Text>

          <View style={styles.infoRow}>
            <Icon name="necklace" size={14} color="#666" />
            <Text style={styles.infoText}> {item.type}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="weight-kilogram" size={14} color="#666" />
            <Text style={styles.infoText}> {item.weight} GMS</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="calendar-clock" size={14} color="#666" />
            <Text style={styles.infoText}> {item.date}</Text>
          </View>
        </View>
      </View>

      {/* DEALER SECTION & BOTTOM ACTIONS */}
      <View style={styles.cardFooter}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <TouchableOpacity
            style={styles.compactDropdown}
            onPress={() => setIsOpen(!isOpen)}
          >
            <Text style={styles.dropdownLabel} numberOfLines={1}>
              {item.dealerName ? item.dealerName : "Assign Dealer"}
            </Text>
            <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#666" />
          </TouchableOpacity>

          {isOpen && (
            <View style={styles.dropdownListContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 120 }}>
                {filteredDealers.map((dealer) => (
                  <TouchableOpacity
                    key={dealer._id}
                    style={styles.compactDealerItem}
                    onPress={() => handleSelect(dealer)}
                  >
                    <Text style={styles.dealerItemName}>{dealer.customerName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.footerActions}>
          {item.status === 'Assigned' && (
            <TouchableOpacity
              style={[styles.smallActionBtn, { backgroundColor: '#28a745' }]}
              onPress={() => onComplete(item)}
              title="Complete"
            >
              <Icon name="check" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: '#1B4D1B' }]}
            onPress={() => onView(item)}
            title="View"
          >
            <Icon name="eye-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

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
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: "#F0F4F0",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0EAE0',
  },
  statusText: {
    color: "#1B4D1B",
    fontWeight: "700",
    fontSize: 11,
    textTransform: 'uppercase',
  },
  actionIcons: {
    flexDirection: 'row',
  },
  iconBtn: {
    padding: 6,
    marginLeft: 8,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageBox: {
    marginRight: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  placeholderBox: {
    width: 80,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  placeholderText: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
  },
  detailsColumn: {
    flex: 1,
  },
  customerNameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  compactDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  dropdownLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  dropdownListContainer: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    elevation: 5,
    zIndex: 2000,
  },
  searchBar: {
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    fontSize: 12,
  },
  compactDealerItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  dealerItemName: {
    fontSize: 12,
    color: '#333',
  },
  footerActions: {
    flexDirection: 'row',
  },
  smallActionBtn: {
    padding: 10,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#1B4D1B",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

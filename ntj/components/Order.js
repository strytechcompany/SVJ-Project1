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
import { useFocusEffect } from "@react-navigation/native";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CommonHeader from "./CommonHeader";

export default function Order({ navigation }) {
  const [selectedTab, setSelectedTab] = useState("All");
  const [orders, setOrders] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, dealersRes] = await Promise.all([
        fetch(`${base_url}/orders`),
        fetch(`${base_url}/customersDealer`),
      ]);

      const ordersData = await ordersRes.json();
      const dealersData = dealersRes.ok ? await dealersRes.json() : [];

      if (dealersRes.ok) setDealers(dealersData);

      if (ordersRes.ok) {
        setOrders(
          ordersData.map((order) => ({
            id: order._id,
            orderNo: order.orderNo || "",
            customer: order.customerName,
            phone: order.mobileNumber,
            type: order.itemName,
            weight: order.itemWeight,
            payment: order.paymentType,
            date: order.deliveryDate ? order.deliveryDate.split("T")[0] : "-",
            status:
              order.status === "Delivery"
                ? "Delivery"
                : order.status === "Completed"
                  ? "Completed"
                  : order.assignedDealer
                    ? "Assigned"
                    : "Pending",
            dealerName: order.assignedDealerName || "",
            dealerId: order.assignedDealer || "",
            image: order.image || null,  // base64 string
            balanceAmount: order.balanceAmount || 0,
            amount: order.amount || 0,
            assignedAt: order.assignedAt || null,
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

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleAssignDealer = async (orderId, dealer) => {
    try {
      const response = await fetch(`${base_url}/orders/${orderId}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedDealer: dealer._id,
          assignedDealerName: dealer.customerName,
          status: "Assigned",
        }),
      });

      if (response.ok) {
        setOrders(prev =>
          prev.map(o =>
            o.id === orderId
              ? { ...o, dealerName: dealer.customerName, dealerId: dealer._id, status: 'Assigned', assignedAt: new Date().toISOString() }
              : o
          )
        );

        const order = orders.find(o => o.id === orderId);
        const phone = dealer.mobileNumber ? dealer.mobileNumber.replace(/[^0-9]/g, '') : null;

        const caption = `*New Order Assigned*\n\n*Item Name:* ${order.type}\n*Weight:* ${order.weight} GMS`;

        if (order && order.image && phone) {
          try {
            // Check if we can share files
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (!isSharingAvailable) {
              throw new Error("Sharing is not available on this device");
            }

            // Create a temporary file path
            const filename = `order_${orderId}.jpg`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            // Clean the base64 string (remove data prefix if present)
            const base64Data = order.image.includes('base64,')
              ? order.image.split('base64,')[1]
              : order.image;

            // Write the file
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Share the file
            // Note: On Android, WhatsApp doesn't always accept the message param with a file share via expo-sharing
            await Sharing.shareAsync(fileUri, {
              dialogTitle: caption,
              mimeType: 'image/jpeg',
              UTI: 'public.jpeg',
            });

          } catch (error) {
            if (error.message && error.message.includes('rejected')) {
              console.log("Sharing cancelled by user");
            } else {
              console.error("Sharing error:", error);
            }
            // Fallback to text matching the user's request as best as possible
            const whatsappUrl = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(caption)}`;
            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
              await Linking.openURL(whatsappUrl);
            } else {
              Alert.alert("Success", `Order assigned to ${dealer.customerName}. Photo share failed.`);
            }
          }
        } else if (phone) {
          const whatsappUrl = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(caption)}`;
          const supported = await Linking.canOpenURL(whatsappUrl);
          if (supported) {
            await Linking.openURL(whatsappUrl);
          } else {
            Alert.alert("Success", `Order assigned to ${dealer.customerName}`);
          }
        } else {
          Alert.alert("Assigned", `Order assigned to ${dealer.customerName}. No mobile number found.`);
        }
      } else {
        Alert.alert("Error", "Failed to assign dealer");
      }
    } catch (error) {
      Alert.alert("Error", "Server not reachable");
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const deleteOrder = (id) => {
    Alert.alert("Delete Order", "Are you sure you want to delete this order?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${base_url}/orders/${id}`, { method: "DELETE" });
            if (response.ok) {
              setOrders((prev) => prev.filter((o) => o.id !== id));
              Alert.alert("Deleted", "Order deleted successfully");
            } else {
              const data = await response.json();
              Alert.alert("Error", data.message || "Failed to delete order");
            }
          } catch (error) {
            Alert.alert("Error", "Server not reachable");
          }
        },
      },
    ]);
  };

  const handleComplete = (order) => {
    Alert.alert("Complete Order", "Mark this order as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          try {
            const response = await fetch(`${base_url}/orders/${order.id}`, {
              method: 'PUT',
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "Completed" }),
            });

            if (response.ok) {
              setOrders(prev =>
                prev.map(o => o.id === order.id ? { ...o, status: "Completed" } : o)
              );

              const message = `Hello ${order.customer},\nYour order for ${order.type} has been completed.\nPending balance: ₹${order.balanceAmount}.\nThank you!`;
              const phone = order.phone.replace(/[^0-9]/g, '');
              const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;
              const supported = await Linking.canOpenURL(url);
              if (supported) {
                await Linking.openURL(url);
              } else {
                Alert.alert("WhatsApp not installed");
              }
            } else {
              Alert.alert("Error", "Failed to update order status");
            }
          } catch (error) {
            Alert.alert("Error", "Server error");
          }
        },
      },
    ]);
  };

  const handlePrintBill = (order) => {
    const orderNo = order.orderNo || "01";
    navigation.navigate("BillPreview", {
      order: {
        orderNo,
        customer: order.customer,
        phone: order.phone,
        type: order.type,
        weight: order.weight,
        payment: order.payment,
        date: order.date,
        balance: order.balanceAmount,
        image: order.image,  // base64 passed directly
        dealer: order.dealerName,
      },
    });
  };

  const handleShareBill = (order) => {
    const orderNo = order.orderNo || "01";
    navigation.navigate("BillPreview", {
      order: {
        orderNo,
        customer: order.customer,
        phone: order.phone,
        type: order.type,
        weight: order.weight,
        payment: order.payment,
        date: order.date,
        balance: order.balanceAmount,
        image: order.image,
        dealer: order.dealerName,
      },
      autoShare: true,
    });
  };

  const handleDealerWhatsApp = (item) => {
    const dealer = dealers.find(d => d._id === item.dealerId);
    if (!dealer || !dealer.phoneNumber) {
      Alert.alert("Error", "Dealer phone number not found.");
      return;
    }

    const phone = dealer.phoneNumber.replace(/[^0-9]/g, "");
    const waPhone = phone.length === 10 ? `91${phone}` : phone;
    const message = `*Order Assigned Details*\n\n*Item:* ${item.type}\n*Weight:* ${item.weight} GMS\n*Customer:* ${item.customer}\n.`;
    const url = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      const webUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl).catch(() => Alert.alert("Error", "WhatsApp is not installed"));
    });
  };

  const handleStatusMove = async (order) => {
    let nextStatus = "";
    if (order.status === "Pending") {
      if (!order.dealerId) {
        Alert.alert("Dealer Required", "Please assign a dealer before moving to Assigned status.");
        return;
      }
      nextStatus = "Assigned";
    } else if (order.status === "Assigned") {
      nextStatus = "Completed";
    } else if (order.status === "Completed") {
      nextStatus = "Delivery";
    } else {
      return;
    }

    try {
      const response = await fetch(`${base_url}/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
        );
        Alert.alert("Success", `Order status updated to ${nextStatus}`);

        if (nextStatus === "Completed") {
          const message = `Hello ${order.customer},\nYour order for ${order.type} has been completed.\nPending balance: ₹${order.balanceAmount}.\nThank you!`;
          const phone = order.phone.replace(/[^0-9]/g, "");
          const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;
          Linking.canOpenURL(url).then((supported) => {
            if (supported) {
              Linking.openURL(url);
            }
          });
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        Alert.alert("Error", errData.message || "Failed to update status");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Server error");
    }
  };
 
  const filteredOrders =
    selectedTab === "All" ? orders : orders.filter((o) => o.status === selectedTab);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <CommonHeader
      title="Orders"
      onBack={() => navigation.navigate("Home")}
      backgroundColor="#1B4D1B"
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        {["All", "Pending", "Assigned", "Completed", "Delivery"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1B4D1B" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          <FlatList
            data={filteredOrders}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <OrderCard
                item={item}
                dealers={dealers}
                onAssign={handleAssignDealer}
                onDelete={deleteOrder}
                onEdit={(order) => navigation.navigate("EditOrder", { order })}
                onView={(order) => navigation.navigate("ViewOrder", { order })}
                onComplete={handleComplete}
                onPrint={handlePrintBill}
                onDealerWhatsApp={handleDealerWhatsApp}
                onStatusMove={handleStatusMove}
                onShareBill={handleShareBill}
              />
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddOrder", { onGoBack: fetchOrders })}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const OrderCard = ({ item, dealers, onAssign, onDelete, onEdit, onView, onComplete, onPrint, onDealerWhatsApp, onStatusMove, onShareBill }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDealers = dealers.filter((d) =>
    (d.customerName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <View style={styles.actionIcons}>
          {item.status !== "Delivery" && (
            <TouchableOpacity onPress={() => onStatusMove(item)} style={styles.iconBtn}>
              <Icon name="arrow-right-circle" size={24} color="#1B4D1B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
            <Icon name="pencil-outline" size={20} color="#1B4D1B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.iconBtn}>
            <Icon name="delete-outline" size={20} color="#b30000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Card Body */}
      <View style={styles.cardBody}>
        <View style={styles.imageBox}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
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
          {item.balanceAmount > 0 && (
            <View style={[styles.infoRow, { marginTop: 4 }]}>
              <Icon name="cash" size={14} color="#c0392b" />
              <Text style={[styles.infoText, { color: "#c0392b", fontWeight: "700" }]}>
                {" "}Balance: ₹{Number(item.balanceAmount).toFixed(2)}
              </Text>
            </View>
          )}
          {item.status === 'Assigned' && item.assignedAt && (
            <View style={[styles.infoRow, { marginTop: 4 }]}>
              <Icon name="clock-outline" size={14} color="#007bff" />
              <Text style={[styles.infoText, { color: "#007bff", fontSize: 11 }]}>
                {" "}Assigned: {new Date(item.assignedAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={{ flex: 1, marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.compactDropdown, { flex: 1 }]}
            onPress={() => setIsOpen(!isOpen)}
          >
            <Text style={styles.dropdownLabel} numberOfLines={1}>
              {item.dealerName ? item.dealerName : "Assign Dealer"}
            </Text>
            <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#666" />
          </TouchableOpacity>

          {item.dealerId ? (
            <TouchableOpacity
              onPress={() => onDealerWhatsApp(item)}
              style={{ marginLeft: 8 }}
            >
              <View style={{ backgroundColor: '#e8f5e9', padding: 6, borderRadius: 6 }}>
                <Icon name="whatsapp" size={20} color="#25D366" />
              </View>
            </TouchableOpacity>
          ) : null}

          {isOpen && (
            <View style={styles.dropdownListContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 120 }} keyboardShouldPersistTaps="handled">
                {filteredDealers.map((dealer) => (
                  <TouchableOpacity
                    key={dealer._id}
                    style={styles.compactDealerItem}
                    onPress={() => {
                      onAssign(item.id, dealer);
                      setIsOpen(false);
                    }}
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
            >
              <Icon name="check" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: '#1B4D1B' }]}
            onPress={() => onView(item)}
          >
            <Icon name="eye-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: '#25D366' }]}
            onPress={() => onShareBill(item)}
          >
            <Icon name="whatsapp" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: '#007bff' }]}
            onPress={() => onPrint(item)}
          >
            <Icon name="printer-outline" size={18} color="#fff" />
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
  activeTab: { backgroundColor: "#1B4D1B" },
  tabText: { fontSize: 15, color: "#333" },
  activeTabText: { color: "#fff", fontWeight: "700" },
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
  actionIcons: { flexDirection: 'row' },
  iconBtn: { padding: 6, marginLeft: 8 },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  imageBox: { marginRight: 12 },
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
  placeholderText: { fontSize: 9, color: '#999', marginTop: 4 },
  detailsColumn: { flex: 1 },
  customerNameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  infoText: { fontSize: 13, color: "#666" },
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
  dropdownLabel: { fontSize: 12, color: '#444', fontWeight: '600' },
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
  dealerItemName: { fontSize: 12, color: '#333' },
  footerActions: { flexDirection: 'row' },
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

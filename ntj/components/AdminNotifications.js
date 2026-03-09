import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";
import { buildReminderAlerts, loadReminderSettings } from "./reminderService";

export default function AdminNotifications({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      setRefreshing(true);
      const settings = await loadReminderSettings();
      if (!settings.enabled) {
        setAlerts([]);
        return;
      }

      const [b2bRes, b2cRes, dealerRes, txRes] = await Promise.all([
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/customersB2C`),
        fetch(`${base_url}/customersDealer`),
        fetch(`${base_url}/transactions`),
      ]);

      const [b2bRows, b2cRows, dealerRows, txRows] = await Promise.all([
        b2bRes.ok ? b2bRes.json() : [],
        b2cRes.ok ? b2cRes.json() : [],
        dealerRes.ok ? dealerRes.json() : [],
        txRes.ok ? txRes.json() : [],
      ]);

      const customers = [
        ...(Array.isArray(b2bRows) ? b2bRows.map((c) => ({ ...c, customerType: "B2B" })) : []),
        ...(Array.isArray(b2cRows) ? b2cRows.map((c) => ({ ...c, customerType: "B2C" })) : []),
        ...(Array.isArray(dealerRows) ? dealerRows.map((c) => ({ ...c, customerType: c.customerType || "Dealer" })) : []),
      ];

      const computed = buildReminderAlerts({
        customers,
        transactions: Array.isArray(txRows) ? txRows : [],
        settings,
      });
      setAlerts(computed);
    } catch (error) {
      console.error("Failed to load admin reminders:", error);
      setAlerts([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts]),
  );

  const renderItem = ({ item }) => {
    const dateText = item.lastTransactionDate
      ? new Date(item.lastTransactionDate).toLocaleDateString()
      : "N/A";

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.customerName}</Text>
        <Text style={styles.row}>Type: {item.customerType}</Text>
        <Text style={styles.row}>Pending Balance: {Number(item.pendingBalance || 0).toFixed(3)}</Text>
        <Text style={styles.row}>Last Transaction Date: {dateText}</Text>
        <Text style={[styles.row, styles.overdue]}>Overdue Days: {item.overdueDays}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Admin Notifications"
        subtitle={`Total Alerts: ${alerts.length}`}
        backgroundColor="#1B4D1B"
        left={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={alerts}
        keyExtractor={(item, index) => item.id || String(index)}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAlerts} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No overdue reminder alerts.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F6" },
  listContent: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  name: { fontSize: 16, fontWeight: "bold", color: "#1B4D1B", marginBottom: 6 },
  row: { fontSize: 14, color: "#333", marginBottom: 2 },
  overdue: { color: "#E53935", fontWeight: "bold" },
  emptyWrap: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#666", fontSize: 15 },
});

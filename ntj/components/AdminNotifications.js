import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  Linking,
  PanResponder,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";
import {
  buildReminderAlerts,
  clearReminderDismissed,
  dismissReminderAlert,
  loadReminderDismissed,
  loadReminderSettings,
  loadReminderSnoozes,
  setReminderSnoozeDays,
} from "./reminderService";

function NotificationCard({
  item,
  daysValue,
  saving,
  onChangeDays,
  onSaveDays,
  onCall,
  onWhatsApp,
  onDelete,
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx < -8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(Math.min(0, gestureState.dx));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -90 || gestureState.vx < -0.65) {
            Animated.timing(translateX, {
              toValue: -420,
              duration: 180,
              useNativeDriver: true,
            }).start(() => onDelete(item));
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
              speed: 20,
            }).start();
          }
        },
      }),
    [item, onDelete, translateX],
  );

  const dateText = item.lastTransactionDate
    ? new Date(item.lastTransactionDate).toLocaleDateString()
    : "N/A";

  return (
    <View style={styles.swipeWrap}>
      <View style={styles.deleteBg}>
        <Text style={styles.deleteBgText}>Delete</Text>
      </View>
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.name}>{item.customerName}</Text>
        <Text style={styles.row}>Type: {item.customerType}</Text>
        <Text style={styles.row}>Phone: {item.customerPhone || "-"}</Text>
        <Text style={styles.row}>Pending Balance: {Number(item.pendingBalance || 0).toFixed(3)}</Text>
        <Text style={styles.row}>Last Transaction Date: {dateText}</Text>
        <Text style={[styles.row, item.notificationActive ? styles.overdue : styles.remaining]}>
          {item.notificationActive
            ? `Reminder Active: ${item.overdueDays} overdue days`
            : `Remaining Days: ${item.remainingDays}`}
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.phoneBtn} onPress={() => onCall(item.customerPhone)}>
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.whatsAppBtn} onPress={() => onWhatsApp(item.customerPhone)}>
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.daysRow}>
          <TextInput
            style={styles.daysInput}
            value={String(daysValue ?? "")}
            onChangeText={(text) => onChangeDays(item.id, text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Remaining days"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => onSaveDays(item)}
            disabled={saving}
          >
            <Text style={styles.actionBtnText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

export default function AdminNotifications({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [daysInput, setDaysInput] = useState({});
  const [savingId, setSavingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
      const snoozes = await loadReminderSnoozes();
      const dismissed = await loadReminderDismissed();

      const computed = buildReminderAlerts({
        customers,
        transactions: Array.isArray(txRows) ? txRows : [],
        settings,
        snoozes,
        dismissed,
        includeAllPending: true,
      });
      setAlerts(computed);
      setDaysInput((prev) => {
        const next = { ...prev };
        computed.forEach((row) => {
          if (next[row.id] === undefined) next[row.id] = "";
        });
        return next;
      });
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

  const handlePhonePress = useCallback(async (phone) => {
    const cleanPhone = String(phone || "").replace(/[^\d+]/g, "");
    if (!cleanPhone) {
      Alert.alert("Missing Number", "Phone number is not available.");
      return;
    }
    await Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Failed", "Unable to open the phone dialer.");
    });
  }, []);

  const handleWhatsAppPress = useCallback(async (phone) => {
    let cleanPhone = String(phone || "").replace(/[^\d]/g, "");
    if (!cleanPhone) {
      Alert.alert("Missing Number", "WhatsApp number is not available.");
      return;
    }
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const appUrl = `whatsapp://send?phone=${cleanPhone}`;
    const webUrl = `https://wa.me/${cleanPhone}`;
    await Linking.openURL(appUrl).catch(() => {
      Linking.openURL(webUrl).catch(() => {
        Alert.alert("WhatsApp Failed", "Unable to open WhatsApp chat.");
      });
    });
  }, []);

  const handleSaveDays = useCallback(async (item) => {
    const raw = String(daysInput[item.id] ?? "").trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value) || value < 0) {
      Alert.alert("Invalid Days", "Enter a valid number of days.");
      return;
    }
    try {
      setSavingId(item.id);
      await clearReminderDismissed(item.id);
      await setReminderSnoozeDays(item.id, value);
      setDaysInput((prev) => ({ ...prev, [item.id]: "" }));
      await loadAlerts();
    } catch (error) {
      console.error("Failed to save reminder days:", error);
      Alert.alert("Save Failed", "Unable to update remaining days.");
    } finally {
      setSavingId("");
    }
  }, [daysInput, loadAlerts]);

  const handleDeleteCard = useCallback(async (item) => {
    try {
      await dismissReminderAlert(item.id, item.signature);
      setAlerts((prev) => prev.filter((row) => row.id !== item.id));
      setDaysInput((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete reminder card:", error);
      Alert.alert("Delete Failed", "Unable to delete this reminder.");
      await loadAlerts();
    }
  }, [loadAlerts]);

  const renderItem = ({ item }) => (
    <NotificationCard
      item={item}
      daysValue={daysInput[item.id]}
      saving={savingId === item.id}
      onChangeDays={(id, text) => setDaysInput((prev) => ({ ...prev, [id]: text }))}
      onSaveDays={handleSaveDays}
      onCall={handlePhonePress}
      onWhatsApp={handleWhatsAppPress}
      onDelete={handleDeleteCard}
    />
  );

  const filteredAlerts = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((item) => {
      const name = String(item.customerName || "").toLowerCase();
      const phone = String(item.customerPhone || "").toLowerCase();
      const type = String(item.customerType || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || type.includes(q);
    });
  }, [alerts, searchQuery]);

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Admin Notifications"
        subtitle={`Total Alerts: ${alerts.length}`}
        backgroundColor="#3D2800"
        left={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, phone, type..."
          placeholderTextColor="#98A2B3"
        />
      </View>

      <FlatList
        data={filteredAlerts}
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
  searchWrap: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    paddingVertical: 2,
  },
  listContent: { padding: 12, paddingBottom: 30 },
  swipeWrap: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 20,
  },
  deleteBgText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
  },
  name: { fontSize: 16, fontWeight: "bold", color: "#3D2800", marginBottom: 6 },
  row: { fontSize: 14, color: "#333", marginBottom: 2 },
  overdue: { color: "#E53935", fontWeight: "bold" },
  remaining: { color: "#1565C0", fontWeight: "bold" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  phoneBtn: {
    flex: 1,
    backgroundColor: "#1565C0",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  whatsAppBtn: {
    flex: 1,
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  daysRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  daysInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D0D7DE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    color: "#111",
  },
  saveBtn: {
    minWidth: 88,
    backgroundColor: "#3D2800",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  emptyWrap: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#666", fontSize: 15 },
});

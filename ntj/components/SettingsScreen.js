// screens/SettingsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export const SHOP_INFO_KEY = "shop_info_v1";
export const DEFAULT_SHOP_INFO = {
  shopName: "SRI VAISHNAVI JEWELLERS",
  shopAddress: "No.378, BIG BAZAAR STREET,\nR.G.NAGU SWEETS OPP, TRICHY - 620003.",
  phone: "82481 34521, 90429 87827",
  gstNo: "",
};

export default function SettingsScreen({ navigation, route }) {
  const user = route?.params?.user || null;
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [restoreVisible, setRestoreVisible] = useState(false);

  // Shop info
  const [shopInfo, setShopInfo] = useState(DEFAULT_SHOP_INFO);
  const [shopEditVisible, setShopEditVisible] = useState(false);
  const [editShopName, setEditShopName] = useState("");
  const [editShopAddress, setEditShopAddress] = useState("");
  const [editShopPhone, setEditShopPhone] = useState("");
  const [editShopGst, setEditShopGst] = useState("");
  const [backupList, setBackupList] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const BACKUP_KEY = "backup_history_v1";
  const RESTORE_KEY = "backup_restore_v1";

  const latestBackup = useMemo(
    () => (Array.isArray(backupList) && backupList.length ? backupList[0] : null),
    [backupList],
  );

  const formatBackupStamp = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || !Number.isFinite(d.getTime())) return { date: "N/A", time: "N/A" };
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const loadBackups = async () => {
    try {
      const raw = await AsyncStorage.getItem(BACKUP_KEY);
      if (!raw) {
        setBackupList([]);
        return [];
      }
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      setBackupList(list);
      return list;
    } catch (error) {
      console.error("Backup load error:", error);
      setBackupList([]);
      return [];
    }
  };

  const createDailyBackup = async () => {
    setBackupLoading(true);
    try {
      const [b2bRes, b2cRes, dealerRes, billRes, txnRes] = await Promise.all([
        fetch(`${base_url}/customers`),
        fetch(`${base_url}/customersB2C`),
        fetch(`${base_url}/customersDealer`),
        fetch(`${base_url}/billSummary`),
        fetch(`${base_url}/transactions`),
      ]);
      const [b2b, b2c, dealers, bills, txns] = await Promise.all([
        b2bRes.ok ? b2bRes.json() : [],
        b2cRes.ok ? b2cRes.json() : [],
        dealerRes.ok ? dealerRes.json() : [],
        billRes.ok ? billRes.json() : [],
        txnRes.ok ? txnRes.json() : [],
      ]);
      const backup = {
        id: `backup-${Date.now()}`,
        timestamp: new Date().toISOString(),
        customers: {
          b2b,
          b2c,
          dealers,
        },
        bills,
        transactions: txns,
      };
      const existing = await loadBackups();
      const updated = [backup, ...(existing || [])].slice(0, 30);
      await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(updated));
      setBackupList(updated);
    } catch (error) {
      console.error("Backup create error:", error);
    } finally {
      setBackupLoading(false);
    }
  };

  const ensureDailyBackup = async () => {
    const list = await loadBackups();
    const latest = Array.isArray(list) && list.length ? list[0] : null;
    const latestDate = latest?.timestamp
      ? new Date(latest.timestamp).toISOString().slice(0, 10)
      : "";
    const today = new Date().toISOString().slice(0, 10);
    if (!latest || latestDate !== today) {
      await createDailyBackup();
    }
  };

  const handleRestore = async (backup) => {
    try {
      await AsyncStorage.setItem(RESTORE_KEY, JSON.stringify(backup));
      Alert.alert("Restore", "Backup restored successfully.");
      setRestoreVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to restore backup.");
    }
  };

  const loadShopInfo = async () => {
    try {
      const raw = await AsyncStorage.getItem(SHOP_INFO_KEY);
      if (raw) setShopInfo({ ...DEFAULT_SHOP_INFO, ...JSON.parse(raw) });
    } catch {}
  };

  const openShopEdit = () => {
    setEditShopName(shopInfo.shopName);
    setEditShopAddress(shopInfo.shopAddress);
    setEditShopPhone(shopInfo.phone);
    setEditShopGst(shopInfo.gstNo);
    setShopEditVisible(true);
  };

  const saveShopInfo = async () => {
    if (!editShopName.trim()) {
      Alert.alert("Required", "Shop name cannot be empty.");
      return;
    }
    const updated = {
      shopName: editShopName.trim(),
      shopAddress: editShopAddress.trim(),
      phone: editShopPhone.trim(),
      gstNo: editShopGst.trim(),
    };
    try {
      await AsyncStorage.setItem(SHOP_INFO_KEY, JSON.stringify(updated));
      setShopInfo(updated);
      setShopEditVisible(false);
      Alert.alert("Saved", "Shop information updated.");
    } catch {
      Alert.alert("Error", "Failed to save shop information.");
    }
  };

  useEffect(() => {
    ensureDailyBackup();
    loadShopInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["adminLoggedIn", "adminData", "userSession"]);
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("Logout error", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await fetch(`${base_url}/deleteAll`, {
        method: "DELETE",
      });

      if (response.ok) {
        Alert.alert("Success", "All collections deleted successfully!");
      } else {
        Alert.alert("Error", "Failed to delete collections.");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Error connecting to server");
    }
    setConfirmDeleteVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* HEADER */}
      <CommonHeader
      title="Settings"
      backgroundColor="#3D2800"
      left={
      <TouchableOpacity onPress={() => navigation.goBack()}>
      <Icon name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>
      }
      />

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* Shop Information */}
        <Text style={styles.sectionTitle}>Shop Information</Text>
        <View style={styles.shopCard}>
          <View style={styles.shopCardHeader}>
            <Icon name="store-outline" size={22} color="#3D2800" />
            <Text style={styles.shopCardTitle}>Business Details</Text>
            <TouchableOpacity style={styles.shopEditBtn} onPress={openShopEdit}>
              <Icon name="pencil" size={16} color="#fff" />
              <Text style={styles.shopEditBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {[
            { icon: "store", label: "Shop Name", value: shopInfo.shopName },
            { icon: "map-marker-outline", label: "Address", value: shopInfo.shopAddress },
            { icon: "phone-outline", label: "Phone", value: shopInfo.phone },
            { icon: "file-certificate-outline", label: "GST No", value: shopInfo.gstNo || "Not set" },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.shopInfoRow}>
              <Icon name={icon} size={18} color="#3D2800" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.shopInfoLabel}>{label}</Text>
                <Text style={styles.shopInfoValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* General */}
        <Text style={styles.sectionTitle}>General</Text>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('PersonalUser', { user })}>
          <Icon name="account-circle-outline" size={24} color="#3D2800" />
          <Text style={styles.itemText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('ThirukkuralSettings')}>
          <Icon name="file-document-edit-outline" size={24} color="#3D2800" />
          <Text style={styles.itemText}>Bill Customization For Thirukkural</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('UPIControl')}>
          <Icon name="cash" size={24} color="#3D2800" />
          <Text style={styles.itemText}>UPI Control</Text>
        </TouchableOpacity>

        {/* Reminder Settings */}
        <Text style={styles.sectionTitle}>Reminder Settings</Text>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("ReminderSettings")}>
          <Icon name="bell-cog-outline" size={24} color="#3D2800" />
          <Text style={styles.itemText}>Configure Reminder Rules</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("AdminNotifications")}>
          <Icon name="bell-alert-outline" size={24} color="#3D2800" />
          <Text style={styles.itemText}>View Admin Notifications</Text>
        </TouchableOpacity>

        {/* Backup & Restore */}
        <Text style={styles.sectionTitle}>Backup & Restore</Text>
        {latestBackup ? (
          <View style={[styles.item, { elevation: 1 }]}>
            <Icon name="cloud-check-outline" size={24} color="#3D2800" />
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.itemText}>Restore Available</Text>
              <Text style={{ color: "#666", fontSize: 12 }}>
                Last backup: {formatBackupStamp(latestBackup.timestamp).date}{" "}
                {formatBackupStamp(latestBackup.timestamp).time}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.item} onPress={() => setRestoreVisible(true)}>
          <Icon name="backup-restore" size={24} color="#3D2800" />
          <Text style={styles.itemText}>{backupLoading ? "Preparing backups..." : "Restore"}</Text>
        </TouchableOpacity>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity style={styles.item}>
          <Icon name="shield-check-outline" size={24} color="#3D2800" />
          <Text style={styles.itemText}>Privacy</Text>
        </TouchableOpacity>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.item}>
          <Icon name="information-outline" size={24} color="#3D2800" />
          <Text style={styles.itemText}>App Version</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Logout</Text>

        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#3D2800" />
          <Text style={styles.itemText}>Logout</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: "red" }]}>Danger Zone</Text>

        <TouchableOpacity
          style={[styles.item, { borderColor: "red", borderWidth: 1 }]}
          onPress={() => setConfirmDeleteVisible(true)}
        >
          <Icon name="delete-forever-outline" size={24} color="red" />
          <Text style={[styles.itemText, { color: "red", fontWeight: "bold" }]}>DELETE ALL DATA</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Shop Info Edit Modal */}
      <Modal visible={shopEditVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={[styles.modalBox, { width: "92%", alignItems: "stretch", maxHeight: "88%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={styles.modalTitle}>Edit Shop Information</Text>
              <TouchableOpacity onPress={() => setShopEditVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Shop Name *</Text>
              <TextInput style={styles.fieldInput} value={editShopName} onChangeText={setEditShopName} placeholder="Enter shop name" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Shop Address</Text>
              <TextInput style={[styles.fieldInput, { minHeight: 72 }]} value={editShopAddress} onChangeText={setEditShopAddress} placeholder="Enter address" placeholderTextColor="#aaa" multiline />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.fieldInput} value={editShopPhone} onChangeText={setEditShopPhone} placeholder="e.g. 82481 34521" placeholderTextColor="#aaa" keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>GST Number</Text>
              <TextInput style={styles.fieldInput} value={editShopGst} onChangeText={setEditShopGst} placeholder="Enter GST number" placeholderTextColor="#aaa" autoCapitalize="characters" />
            </ScrollView>

            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: "#3D2800", marginTop: 16 }]} onPress={saveShopInfo}>
              <Text style={styles.deleteBtnText}>Save Shop Information</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Restore Modal */}
      <Modal visible={restoreVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Icon name="backup-restore" size={44} color="#3D2800" />
            <Text style={styles.modalTitle}>Available Backups</Text>
            <ScrollView style={{ maxHeight: 260, width: "100%" }}>
              {backupList.length === 0 ? (
                <Text style={styles.modalText}>No backups available.</Text>
              ) : (
                backupList.map((b) => {
                  const stamp = formatBackupStamp(b.timestamp);
                  const summary = [
                    `Customers: ${(b?.customers?.b2b?.length || 0) + (b?.customers?.b2c?.length || 0) + (b?.customers?.dealers?.length || 0)}`,
                    `Bills: ${b?.bills?.length || 0}`,
                    `Txns: ${b?.transactions?.length || 0}`,
                  ].join(" | ");
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.item, { marginBottom: 8 }]}
                      onPress={() => handleRestore(b)}
                    >
                      <Icon name="calendar-clock" size={22} color="#3D2800" />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.itemText}>{stamp.date} {stamp.time}</Text>
                        <Text style={{ color: "#666", fontSize: 12 }}>{summary}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRestoreVisible(false)}>
              <Text style={styles.cancelBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={confirmDeleteVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Icon name="alert-circle-outline" size={50} color="red" />
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <Text style={styles.modalText}>
              This action will delete ALL DATA permanently and cannot be undone.
            </Text>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAll}>
              <Text style={styles.deleteBtnText}>YES, DELETE EVERYTHING</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDeleteVisible(false)}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#3D2800",
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 20,
    marginTop: 15,
    top: 15,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#3D2800",
    marginVertical: 10,
    fontWeight: "bold",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
  },
  itemText: {
    fontSize: 16,
    marginLeft: 15,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 25,
    width: "80%",
    borderRadius: 15,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#333",
  },
  modalText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
    color: "#666",
  },
  deleteBtn: {
    backgroundColor: "red",
    paddingVertical: 12,
    width: "100%",
    borderRadius: 10,
    marginBottom: 10,
  },
  deleteBtnText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  cancelBtn: {
    backgroundColor: "#eee",
    paddingVertical: 12,
    width: "100%",
    borderRadius: 10,
  },
  cancelBtnText: {
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    fontSize: 16,
  },

  // Shop info card
  shopCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#3D2800",
  },
  shopCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  shopCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#3D2800",
    marginLeft: 8,
  },
  shopEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#3D2800",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shopEditBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  shopInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  shopInfoLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    marginBottom: 2,
  },
  shopInfoValue: {
    fontSize: 13,
    color: "#222",
    fontWeight: "500",
  },

  // Shop edit modal fields
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 11,
    marginTop: 5,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#FAFAFA",
  },
});

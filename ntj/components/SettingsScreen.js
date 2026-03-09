// screens/SettingsScreen.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function SettingsScreen({ navigation, route }) {
  const user = route?.params?.user || null;
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userSession");
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
      backgroundColor="#1B4D1B"
      left={
      <TouchableOpacity onPress={() => navigation.goBack()}>
      <Icon name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>
      }
      />

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* General */}
        <Text style={styles.sectionTitle}>General</Text>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('PersonalUser', { user })}>
          <Icon name="account-circle-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('ThirukkuralSettings')}>
          <Icon name="file-document-edit-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Bill Customization For Thirukkural</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('UPIControl')}>
          <Icon name="cash" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>UPI Control</Text>
        </TouchableOpacity>

        {/* Reminder Settings */}
        <Text style={styles.sectionTitle}>Reminder Settings</Text>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("ReminderSettings")}>
          <Icon name="bell-cog-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Configure Reminder Rules</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("AdminNotifications")}>
          <Icon name="bell-alert-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>View Admin Notifications</Text>
        </TouchableOpacity>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity style={styles.item}>
          <Icon name="shield-check-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Privacy</Text>
        </TouchableOpacity>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.item}>
          <Icon name="information-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>App Version</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Logout</Text>

        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#1B4D1B" />
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
    backgroundColor: "#1B4D1B",
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
    color: "#1B4D1B",
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
});

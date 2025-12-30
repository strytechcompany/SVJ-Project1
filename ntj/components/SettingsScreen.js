// screens/SettingsScreen.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function SettingsScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#fff" style={{ top: 20 }} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* General */}
        <Text style={styles.sectionTitle}>General</Text>

        <TouchableOpacity style={styles.item}>
          <Icon name="account-circle-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <Icon name="bell-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Notifications</Text>
        </TouchableOpacity>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity style={styles.item}>
          <Icon name="lock-outline" size={24} color="#1B4D1B" />
          <Text style={styles.itemText}>Change Password</Text>
        </TouchableOpacity>

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

      </ScrollView>
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
});

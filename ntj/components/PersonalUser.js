import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function PersonalUser() {
  const navigation = useNavigation();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: "absolute", left: 20, top: 60 }}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>John Doe</Text>
        <Text style={styles.profileEmail}>johndoe@gmail.com</Text>
        <Text style={styles.profileRole}>Admin</Text>
      </View>

      {/* Card - Change Password */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Password</Text>

        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Current Password"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="New Password"
          placeholderTextColor="#888"
        />

        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Confirm New Password"
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.updateBtn}>
          <Text style={styles.btnText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 40,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: "center",
    marginBottom: 20,
    height: 120,
  },

  headerTitle: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "700",
    top: 20,
  },

  profileSection: {
    alignItems: "center",
    marginBottom: 25,
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 60,
    marginBottom: 10,
    backgroundColor: "#ddd",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B4D1B",
  },

  profileEmail: {
    fontSize: 16,
    color: "#555",
    marginTop: 4,
  },

  profileRole: {
    fontSize: 14,
    color: "#777",
    marginTop: 2,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    elevation: 4,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1B4D1B",
    marginBottom: 15,
  },

  input: {
    width: "100%",
    padding: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  updateBtn: {
    backgroundColor: "#1B4D1B",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },

  btnText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },

  logoutBtn: {
    backgroundColor: "#C62828",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 40,
  },

  logoutText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
});

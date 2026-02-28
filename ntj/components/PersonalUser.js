import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";

export default function PersonalUser({ route }) {
  const navigation = useNavigation();

  // User can be passed via navigation params (from login flow)
  const passedUser = route?.params?.user || null;

  const [user, setUser] = useState(passedUser);
  const [loading, setLoading] = useState(!passedUser);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have the user from params, no need to fetch
    if (passedUser) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${base_url}/users`);
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        // Show the first user as a fallback when no specific user is passed
        if (data && data.length > 0) {
          setUser(data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4D1B" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9F9F9" }}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: "absolute", left: 20, top: 60 }}
        >
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* User Info */}
      <View style={styles.infoCard}>
        <View style={styles.avatarCircle}>
          <Icon name="account" size={48} color="#fff" />
        </View>
        <Text style={styles.userName}>{user?.name || "—"}</Text>
        <View style={styles.emailRow}>
          <Icon name="email-outline" size={18} color="#555" />
          <Text style={styles.emailText}>{user?.email || "—"}</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },

  header: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 40,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: "center",
    height: 120,
    marginBottom: 30,
  },

  headerTitle: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "700",
    top: 20,
  },

  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
  },

  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1B4D1B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B4D1B",
    marginBottom: 10,
  },

  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },

  emailText: {
    fontSize: 15,
    color: "#555",
    fontWeight: "400",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from './config';

export default function Users({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState("All User");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- FETCH USERS FROM API ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${base_url}/users`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Ensure each user has an 'id' field (required by FlatList)
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Failed to load users.");
        Alert.alert("Error", "Unable to load users. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // FILTER & SEARCH
  const filteredUsers = users.filter((item) => {
    const searchMatch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase());

    if (selectedFilter === "All User") return searchMatch;
    return item.role === selectedFilter && searchMatch;
  });

  // Render each user card
  const renderUser = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.userName}>{item.name}</Text>

      <View style={styles.roleTag}>
        <Text style={styles.roleText}>{item.role}</Text>
      </View>

      <View style={styles.row}>
        <Icon name="email-outline" size={18} />
        <Text style={styles.infoText}> {item.email}</Text>
      </View>

      <View style={styles.row}>
        <Icon name="phone-outline" size={18} />
        <Text style={styles.infoText}> {item.phone}</Text>
      </View>

      <View style={styles.actionRow}>
        {/* EDIT BUTTON */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("CreateUser", {
              user: item,
              updateUser: (updatedUser) => {
                setUsers((prev) =>
                  prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
                );
              },
            })
          }
        >
          <Icon name="pencil" size={24} color="blue" />
        </TouchableOpacity>

        {/* DELETE BUTTON */}
        <TouchableOpacity
          onPress={() => {
            // Optional: Confirm before delete
            Alert.alert(
              "Delete User",
              `Are you sure you want to delete ${item.name}?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const response = await fetch(`${base_url}/users/${item.id}`, {
                        method: "DELETE",
                      });
                      if (response.ok) {
                        setUsers(users.filter((u) => u.id !== item.id));
                      } else {
                        Alert.alert("Error", "Failed to delete user.");
                      }
                    } catch (err) {
                      console.error("Delete error:", err);
                      Alert.alert("Error", "Network error while deleting.");
                    }
                  },
                },
              ]
            );
          }}
        >
          <Icon name="trash-can" size={24} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1B4D1B" />
        <Text style={{ marginTop: 10, color: "#555" }}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "red" }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#fff" style={{ top: 25 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
      </View>

      {/* Search Box */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={22} color="gray" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        {["All User", "Super Admin", "Admin"].map((label) => (
          <TouchableOpacity
            key={label}
            style={[
              styles.filterBtn,
              selectedFilter === label && styles.filterBtnActive,
            ]}
            onPress={() => setSelectedFilter(label)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === label && styles.filterTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id?.toString() || item.email} // fallback to email if no id
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text>No users found.</Text>
          </View>
        )}
      />

      {/* ADD BUTTON */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() =>
          navigation.navigate("CreateUser", {
            addUser: (newUser) => {
              setUsers((prev) => [...prev, newUser]);
            },
          })
        }
      >
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    backgroundColor: "#1B4D1B",
    height: 150,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 15,
    fontWeight: "bold",
    top: 25,
  },

  searchBox: {
    margin: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 30,
    elevation: 3,
  },
  searchInput: { marginLeft: 10, fontSize: 16, flex: 1 },

  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginHorizontal: 5,
  },
  filterBtnActive: {
    backgroundColor: "#1B4D1B",
  },
  filterText: {
    color: "#333",
    fontSize: 15,
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },
  userName: { fontSize: 20, fontWeight: "bold" },

  roleTag: {
    backgroundColor: "#D7E9FF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 5,
  },
  roleText: { color: "#0066CC", fontWeight: "600" },

  row: { flexDirection: "row", alignItems: "center", marginTop: 5 },

  infoText: { fontSize: 15, color: "#555" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 15,
  },

  addBtn: {
    position: "absolute",
    bottom: 60,
    right: 25,
    backgroundColor: "green",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
  },
});
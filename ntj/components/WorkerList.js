import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config.js";

export default function Users({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState("All User");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states for adding user
  const [modalVisible, setModalVisible] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Admin",
    password: "",
  });

  // Additional states for roles, edit, delete
  const [roleOptions] = useState(["Admin", "Super Admin", "Worker"]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [currentRoleSetter, setCurrentRoleSetter] = useState(() => { });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUser, setEditUser] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "Admin",
  });

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${base_url}/users`);
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        const normalizedData = data.map((u, index) => ({
          id: u.id || u._id || index,
          ...u,
        }));
        setUsers(normalizedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter and search
  const filteredUsers = users.filter((item) => {
    const searchMatch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase());
    if (selectedFilter === "All User") return searchMatch;
    return item.role === selectedFilter && searchMatch;
  });

  // Add user to backend
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
      Alert.alert("Error", "Please fill all fields including password");
      return;
    }

    try {
      const response = await fetch(`${base_url}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) throw new Error("Failed to add user");
      const addedUser = await response.json();

      // Update local state
      setUsers((prev) => [
        ...prev,
        { id: addedUser.id || addedUser._id, ...addedUser },
      ]);
      setModalVisible(false);
      setNewUser({ name: "", email: "", phone: "", role: "Admin", password: "" });
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Handle edit user
  const handleEdit = (user) => {
    setEditUser(user);
    setEditModalVisible(true);
  };

  // Handle delete user
  const handleDelete = (userId) => {
    Alert.alert(
      "Delete User",
      "Are you sure you want to delete this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${base_url}/users/${userId}`, {
                method: "DELETE",
              });
              if (!response.ok) throw new Error("Failed to delete user");
              setUsers((prev) => prev.filter((u) => u.id !== userId));
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  // Update user to backend
  const handleEditUser = async () => {
    if (!editUser.name || !editUser.email || !editUser.phone) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      const response = await fetch(`${base_url}/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUser),
      });

      if (!response.ok) throw new Error("Failed to update user");

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? editUser : u))
      );
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

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
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => handleEdit(item)}
        >
          <Icon name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
        >
          <Icon name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1B4D1B" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "red" }}>{error}</Text>
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
        {["All User", "Super Admin", "Admin", "Worker"].map((label) => (
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
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Add User Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
              Add New User
            </Text>
            <TextInput
              placeholder="Name"
              value={newUser.name}
              onChangeText={(text) => setNewUser({ ...newUser, name: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              value={newUser.email}
              onChangeText={(text) => setNewUser({ ...newUser, email: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Phone"
              value={newUser.phone}
              onChangeText={(text) => setNewUser({ ...newUser, phone: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              value={newUser.password}
              onChangeText={(text) => setNewUser({ ...newUser, password: text })}
              style={styles.input}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setCurrentRoleSetter(() => (role) => setNewUser({ ...newUser, role }));
                setShowRoleModal(true);
              }}
            >
              <Text>{newUser.role || "Select Role"}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <TouchableOpacity onPress={handleAddUser} style={styles.modalBtn}>
                <Text style={{ color: "#fff" }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: "gray" }]}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Selection Modal */}
      <Modal visible={showRoleModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
              Select Role
            </Text>
            <FlatList
              data={roleOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.roleOption}
                  onPress={() => {
                    currentRoleSetter(item);
                    setShowRoleModal(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
            />
            <TouchableOpacity
              onPress={() => setShowRoleModal(false)}
              style={[styles.modalBtn, { backgroundColor: "gray" }]}
            >
              <Text style={{ color: "#fff" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
              Edit User
            </Text>
            <TextInput
              placeholder="Name"
              value={editUser.name}
              onChangeText={(text) => setEditUser({ ...editUser, name: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              value={editUser.email}
              onChangeText={(text) => setEditUser({ ...editUser, email: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Phone"
              value={editUser.phone}
              onChangeText={(text) => setEditUser({ ...editUser, phone: text })}
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setCurrentRoleSetter(() => (role) => setEditUser({ ...editUser, role }));
                setShowRoleModal(true);
              }}
            >
              <Text>{editUser.role || "Select Role"}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <TouchableOpacity onPress={handleEditUser} style={styles.modalBtn}>
                <Text style={{ color: "#fff" }}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: "gray" }]}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD BUTTON */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setModalVisible(true)}
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
  filterBtnActive: { backgroundColor: "#1B4D1B" },
  filterText: { color: "#333", fontSize: 15 },
  filterTextActive: { color: "#fff", fontWeight: "bold" },
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 5,
    borderRadius: 8,
  },
  modalBtn: {
    backgroundColor: "#1B4D1B",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  editBtn: {
    backgroundColor: "#1B4D1B",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  deleteBtn: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  roleOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
});

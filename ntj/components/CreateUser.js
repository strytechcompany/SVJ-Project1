import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from './config';

export default function EditUser({ route, navigation }) {
  const { user, updateUser, addUser } = route.params;
  const isEdit = !!user;

  const [name, setName] = useState(isEdit ? user.name : "");
  const [role, setRole] = useState(isEdit ? user.role : "");
  const [email, setEmail] = useState(isEdit ? user.email : "");
  const [phone, setPhone] = useState(isEdit ? user.phone : "");

  const handleSave = async () => {
  const userData = { name, role, email, phone };

  try {
    let response;
    if (isEdit) {
      // PUT request to update user
      response = await fetch(`${base_url}/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } else {
      // POST request to create user
      response = await fetch(`${base_url}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    }

    const data = await response.json();
    console.log('Server response:', data);
    navigation.goBack();
  } catch (err) {
    console.error('Error saving user:', err);
  }
};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create User</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Role</Text>
        <TextInput value={role} onChangeText={setRole} style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} />

        <Text style={styles.label}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    backgroundColor: "#1B4D1B",
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 15,
    fontWeight: "bold",
  },

  form: { padding: 20 },

  label: { fontSize: 16, fontWeight: "600", marginTop: 10 },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    elevation: 2,
  },

  saveBtn: {
    backgroundColor: "#1B4D1B",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

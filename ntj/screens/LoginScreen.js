import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "../components/config";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${base_url}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Fetch full user details (name, role) from /users list using the logged-in email
        let fullUser = { email: data.email, token: data.token };
        try {
          const usersRes = await fetch(`${base_url}/users`);
          if (usersRes.ok) {
            const users = await usersRes.json();
            const matched = users.find(
              (u) => u.email?.toLowerCase().trim() === data.email?.toLowerCase().trim()
            );
            if (matched) fullUser = { ...fullUser, ...matched };
          }
        } catch (_) {
          // Non-critical — proceed with partial user data
        }

        // Persist admin login across app restarts.
        await AsyncStorage.multiSet([
          ["adminLoggedIn", "true"],
          ["adminData", JSON.stringify(fullUser)],
          ["userSession", JSON.stringify(fullUser)],
        ]);

        navigation.replace("Home", { user: fullUser });
      } else {
        Alert.alert("Login Failed", data.message || "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Image */}
      <View style={styles.headerImageWrapper}>
        <Image
          source={require("../assets/Gold.jpeg")}
          style={styles.headerImage}
        />
      </View>

      {/* Welcome Text */}
      <View style={styles.titleWrapper}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subTitle}>Akshaya Gold Login</Text>
      </View>

      {/* Email Input */}
      <View style={styles.inputWrapper}>
        <Icon name="email-outline" size={22} color="#777" />
        <TextInput
          style={styles.textInput}
          placeholder="E-Mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputWrapper}>
        <Icon name="lock-outline" size={22} color="#777" />
        <TextInput
          style={styles.textInput}
          placeholder="Password"
          secureTextEntry={!showPass}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
          <Icon
            name={showPass ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#777"
          />
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginBtn, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerImageWrapper: {
    width: "100%",
    height: 250,
    overflow: "hidden",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    marginBottom: 30,
  },
  headerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  titleWrapper: { alignItems: "center", marginTop: 20, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: "bold", color: "#333" },
  subTitle: { fontSize: 15, color: "#777", marginTop: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    marginHorizontal: 25,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 55,
    marginVertical: 10,
  },
  textInput: { flex: 1, paddingLeft: 10, color: "#333" },
  loginBtn: {
    backgroundColor: "#2E7D32",
    marginHorizontal: 25,
    height: 55,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

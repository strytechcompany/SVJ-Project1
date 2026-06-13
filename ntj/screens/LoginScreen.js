import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "../components/config";

// 8-second timeout — shows error quickly when server is unreachable
const fetchWithTimeout = (url, options = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTimeout(`${base_url}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        let fullUser = { email: data.email, token: data.token };
        try {
          const usersRes = await fetchWithTimeout(`${base_url}/users`);
          if (usersRes.ok) {
            const users = await usersRes.json();
            const matched = users.find(
              (u) => u.email?.toLowerCase().trim() === data.email?.toLowerCase().trim()
            );
            if (matched) fullUser = { ...fullUser, ...matched };
          }
        } catch (_) {}

        await AsyncStorage.multiSet([
          ["adminLoggedIn", "true"],
          ["adminData", JSON.stringify(fullUser)],
          ["userSession", JSON.stringify(fullUser)],
        ]);

        navigation.replace("Home", { user: fullUser });
      } else {
        setErrorMsg(data.message || "Invalid email or password.");
      }
    } catch (error) {
      setErrorMsg("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="light-content" backgroundColor="#7A5C00" />

      {/* Golden Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerImageWrapper}>
          <Image
            source={require("../assets/Gold.jpeg")}
            style={styles.headerImage}
          />
          <View style={styles.headerOverlay} />
        </View>

        {/* Brand Title overlay */}
        <View style={styles.brandBox}>
          <Icon name="diamond-stone" size={38} color="#FFD700" />
          <Text style={styles.brandTitle}>Sri Vaishnavi Jeweller</Text>
          <Text style={styles.brandSub}>Premium Gold & Jewellery</Text>
        </View>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subTitle}>Sign in to your account</Text>

        {/* Email Input */}
        <View style={styles.inputWrapper}>
          <Icon name="email-outline" size={22} color="#B8860B" />
          <TextInput
            style={styles.textInput}
            placeholder="E-Mail"
            placeholderTextColor="#B8860B88"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <Icon name="lock-outline" size={22} color="#B8860B" />
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            placeholderTextColor="#B8860B88"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Icon
              name={showPass ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#B8860B"
            />
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#3D2800" size="small" />
          ) : (
            <View style={styles.loginBtnInner}>
              <Icon name="login" size={20} color="#3D2800" style={{ marginRight: 8 }} />
              <Text style={styles.loginText}>Login</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>Sri Vaishnavi Jeweller Management System</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8E1" },
  scrollContent: { flexGrow: 1 },
  headerBanner: { position: "relative", height: 280 },
  headerImageWrapper: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(60,30,0,0.55)",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  brandBox: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFD700",
    marginTop: 6,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandSub: {
    fontSize: 13,
    color: "#FFE88A",
    marginTop: 3,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 28,
    elevation: 8,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    marginBottom: 30,
  },
  title: { fontSize: 26, fontWeight: "bold", color: "#3D2800", textAlign: "center" },
  subTitle: { fontSize: 14, color: "#A07000", marginTop: 4, marginBottom: 24, textAlign: "center" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#FFD700",
  },
  textInput: { flex: 1, paddingLeft: 10, color: "#3D2800", fontSize: 15 },
  loginBtn: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  loginBtnInner: { flexDirection: "row", alignItems: "center" },
  loginText: { color: "#3D2800", fontSize: 17, fontWeight: "bold", letterSpacing: 0.5 },
  footerNote: {
    textAlign: "center",
    color: "#A07000",
    fontSize: 12,
    marginTop: 20,
    letterSpacing: 0.3,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    backgroundColor: "#FDECEA",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E74C3C",
  },
});

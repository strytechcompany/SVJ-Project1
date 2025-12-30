import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  return (
    <ScrollView style={styles.container}>
      {/* Header Image */}
      <View style={styles.headerImageWrapper}>
        <Image
          source={require("../assets/Gold.jpeg")} // add image here
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
          <Icon name={showPass ? "eye-off-outline" : "eye-outline"} size={22} />
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.loginText}>Login</Text>
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

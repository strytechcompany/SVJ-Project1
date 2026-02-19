import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GSTPage({ navigation }) {
  const [activeTab, setActiveTab] = useState("B2B");

  // Fields
  const [sgst, setSgst] = useState("");
  const [cgst, setCgst] = useState("");
  const [igst, setIgst] = useState("");
  const [hsn, setHsn] = useState("");
  const [netWeight, setNetWeight] = useState(""); // Net Weight / HM
  const [stone, setStone] = useState("");
  const [pureWeight, setPureWeight] = useState(""); // Pure Weight / Pure Amount
  const [finalAmount, setFinalAmount] = useState(""); // Final Payable Amount

  const [savedList, setSavedList] = useState([]);

  // Load saved list on mount
  useEffect(() => {
    const loadList = async () => {
      try {
        const stored = await AsyncStorage.getItem("gstSavedList");
        if (stored) {
          setSavedList(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load saved GST list", error);
      }
    };
    loadList();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSave = async () => {
    const now = new Date();
    const newItem = {
      id: Date.now().toString(),
      type: activeTab,
      sgst, cgst, igst, hsn,
      netWeight, stone,
      finalValue: activeTab === 'B2B' ? pureWeight : finalAmount,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedList = [newItem, ...savedList];
    setSavedList(updatedList);
    try {
      await AsyncStorage.setItem("gstSavedList", JSON.stringify(updatedList));
      Alert.alert("Success", "Added to list!");
    } catch (error) {
      console.error("Failed to save list", error);
    }

    // Optional: Clear fields
    setSgst("");
    setCgst("");
    setIgst("");
    setHsn("");
    setNetWeight("");
    setStone("");
    setPureWeight("");
    setFinalAmount("");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={styles.fileTitle}>GST Calculation</Text>
          </View>
          <View style={{ width: 26 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>

          {/* TABS */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "B2B" && styles.activeTabBtn]}
              onPress={() => handleTabChange("B2B")}
            >
              <Text style={[styles.tabText, activeTab === "B2B" && styles.activeTypeText]}>B2B Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "B2C" && styles.activeTabBtn]}
              onPress={() => handleTabChange("B2C")}
            >
              <Text style={[styles.tabText, activeTab === "B2C" && styles.activeTypeText]}>B2C Transaction</Text>
            </TouchableOpacity>
          </View>

          {/* FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{activeTab} Details</Text>

            {/* ROW 1: SGST & CGST */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>SGST</Text>
                <TextInput
                  style={styles.input}
                  placeholder="%"
                  keyboardType="numeric"
                  value={sgst}
                  onChangeText={setSgst}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>CGST</Text>
                <TextInput
                  style={styles.input}
                  placeholder="%"
                  keyboardType="numeric"
                  value={cgst}
                  onChangeText={setCgst}
                />
              </View>
            </View>

            {/* ROW 2: IGST & HSN Code */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>IGST</Text>
                <TextInput
                  style={styles.input}
                  placeholder="%"
                  keyboardType="numeric"
                  value={igst}
                  onChangeText={setIgst}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>HSN Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Code"
                  keyboardType="numeric"
                  value={hsn}
                  onChangeText={setHsn}
                />
              </View>
            </View>

            {/* ROW 3: Net Weight / HM & Stone */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Net Weight / HM</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={netWeight}
                  onChangeText={setNetWeight}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Stone</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Details"
                  value={stone}
                  onChangeText={setStone}
                />
              </View>
            </View>

            {/* ROW 4: Percentage */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Percentage</Text>
              <TextInput
                style={styles.input}
                placeholder="%"
                value={pureWeight}
                onChangeText={setPureWeight}
                keyboardType="numeric"
              />
            </View>

            {/* SUBMIT BUTTON */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save Details</Text>
            </TouchableOpacity>

          </View>

          {/* SAVED LIST */}
          {savedList.length > 0 && (
            <View style={{ marginTop: 30, paddingBottom: 40 }}>
              <Text style={styles.sectionTitle}>Saved Records</Text>
              {savedList.map((item) => (
                <View key={item.id} style={styles.savedCard}>
                  <View style={styles.savedHeader}>
                    <View>
                      <Text style={styles.savedType}>{item.type}</Text>
                      <Text style={styles.savedHsn}>HSN: {item.hsn}</Text>
                    </View>
                    <Text style={styles.savedDate}>{item.date} {item.time}</Text>
                  </View>

                  {/* Row 1: Tax Details */}
                  <View style={styles.savedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>SGST</Text>
                      <Text style={styles.savedValue}>{item.sgst || "0"}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>CGST</Text>
                      <Text style={styles.savedValue}>{item.cgst || "0"}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>IGST</Text>
                      <Text style={styles.savedValue}>{item.igst || "0"}%</Text>
                    </View>
                  </View>

                  {/* Row 2: Weight & Amount */}
                  <View style={styles.savedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>Net Weight</Text>
                      <Text style={styles.savedValue}>{item.netWeight || "-"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>Stone</Text>
                      <Text style={styles.savedValue}>{item.stone || "-"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedLabel}>{item.type === 'B2B' ? 'Percentage' : 'Final Amt'}</Text>
                      <Text style={[styles.savedValue, { color: '#2E7D32' }]}>{item.finalValue || "-"}</Text>
                    </View>
                  </View>

                  {/* ACTION BUTTONS */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={async () => {
                        setActiveTab(item.type);
                        setSgst(item.sgst || "");
                        setCgst(item.cgst || "");
                        setIgst(item.igst || "");
                        setHsn(item.hsn || "");
                        setNetWeight(item.netWeight || "");
                        setStone(item.stone || "");
                        if (item.type === 'B2B') {
                          setPureWeight(item.finalValue || "");
                        } else {
                          setFinalAmount(item.finalValue || "");
                        }
                        // Remove from list so it can be updated
                        const updatedList = savedList.filter((i) => i.id !== item.id);
                        setSavedList(updatedList);
                        await AsyncStorage.setItem("gstSavedList", JSON.stringify(updatedList));
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => {
                        Alert.alert(
                          "Delete Item",
                          "Are you sure you want to delete this item?",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete", style: "destructive", onPress: async () => {
                                const updatedList = savedList.filter((i) => i.id !== item.id);
                                setSavedList(updatedList);
                                await AsyncStorage.setItem("gstSavedList", JSON.stringify(updatedList));
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.actionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F6" },

  header: {
    backgroundColor: "#1B4D1B",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  fileTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  content: { padding: 20 },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 5,
    marginBottom: 20,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  activeTabBtn: {
    backgroundColor: "#1B4D1B",
  },
  tabText: {
    fontWeight: "bold",
    color: "#555",
    fontSize: 14,
  },
  activeTypeText: {
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B4D1B",
    marginBottom: 20,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 15,
  },
  col: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#000",
  },

  saveBtn: {
    backgroundColor: "#FFD54F",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  saveText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Saved List Styles
  savedCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: "#1B4D1B",
  },
  savedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  savedType: {
    fontWeight: "bold",
    color: "#1B4D1B",
    fontSize: 16,
  },
  savedHsn: {
    color: "#666",
    fontSize: 12,
  },
  savedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  savedLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  savedValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  savedStone: {
    fontSize: 12,
    color: "#555",
    fontStyle: "italic",
    marginTop: 4,
  },
  savedDate: {
    color: "#888",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: "#2196F3",
  },
  deleteBtn: {
    backgroundColor: "#F44336",
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
});

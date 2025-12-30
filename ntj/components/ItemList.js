import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const STORAGE_KEY = "ITEM_LIST";

/* 🔹 SAMPLE DATA */
const SAMPLE_ITEMS = [
  {
    id: "1",
    itemName: "Gold Ring",
    weight: "12.500",
    less: "0.300",
    netWeight: "12.200",
    percentage: "91.6",
    date: "10/12/2025",
  },
  {
    id: "2",
    itemName: "Gold Chain",
    weight: "25.750",
    less: "0.750",
    netWeight: "25.000",
    percentage: "91.6",
    date: "10/12/2025",
  },
  {
    id: "3",
    itemName: "Gold Bangle",
    weight: "18.200",
    less: "0.200",
    netWeight: "18.000",
    percentage: "91.6",
    date: "10/12/2025",
  },
];

export default function ItemsList({ navigation }) {
  const [items, setItems] = useState([]);

  /* ----- EDIT POPUP STATE ----- */
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [less, setLess] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [percentage, setPercentage] = useState("");

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadItems);
    return unsubscribe;
  }, [navigation]);

  /* ---------------- LOAD ITEMS ---------------- */
  const loadItems = async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      setItems(JSON.parse(data));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ITEMS));
      setItems(SAMPLE_ITEMS);
    }
  };

  /* ---------------- AUTO NET WEIGHT ---------------- */
  useEffect(() => {
    const w = parseFloat(weight);
    const l = parseFloat(less);
    if (!isNaN(w) && !isNaN(l)) {
      setNetWeight((w - l).toString());
    }
  }, [weight, less]);

  /* ---------------- OPEN EDIT POPUP ---------------- */
  const openEditPopup = (item) => {
    setEditItem(item);
    setItemName(item.itemName);
    setWeight(item.weight);
    setLess(item.less);
    setNetWeight(item.netWeight);
    setPercentage(item.percentage);
    setModalVisible(true);
  };

  /* ---------------- SAVE EDIT ---------------- */
  const saveEdit = async () => {
    const updatedList = items.map((i) =>
      i.id === editItem.id
        ? {
            ...i,
            itemName,
            weight,
            less,
            netWeight,
            percentage,
          }
        : i
    );

    setItems(updatedList);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    setModalVisible(false);
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = (id) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = items.filter((i) => i.id !== id);
          setItems(updated);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(updated)
          );
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Items List</Text>
      </View>

      {/* LIST */}
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold}>{item.itemName}</Text>
              <Text>Weight : {item.weight}</Text>
              <Text>Less : {item.less}</Text>
              <Text>Net Weight : {item.netWeight}</Text>
              <Text>Date : {item.date}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEditPopup(item)}>
                <Icon name="pencil" size={24} color="#1E88E5" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 15 }}
                onPress={() => handleDelete(item.id)}
              >
                <Icon name="delete" size={24} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* PLUS BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("ItemEntry")}
      >
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      {/* 🔔 EDIT POPUP */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Item</Text>

            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Item Name"
            />
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="Weight"
            />
            <TextInput
              style={styles.input}
              value={less}
              onChangeText={setLess}
              keyboardType="numeric"
              placeholder="Less"
            />
            <TextInput
              style={[styles.input, { backgroundColor: "#E8F5E9" }]}
              value={netWeight}
              editable={false}
            />
            
            <TextInput
              style={styles.input}
              value={percentage}
              onChangeText={setPercentage}
              keyboardType="numeric"
              placeholder="Percentage"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#9E9E9E" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={saveEdit}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  header: {
    height: 110,
    backgroundColor: "#2E7D32",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 12,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    flexDirection: "row",
  },
  bold: { fontWeight: "bold", fontSize: 16 },
  actions: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 10,
  },
  fab: {
    position: "absolute",
    right: 25,
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1B5E20",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2E7D32",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalBtn: {
    backgroundColor: "#2E7D32",
    padding: 12,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

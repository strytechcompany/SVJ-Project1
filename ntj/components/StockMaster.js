import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from './config';

export default function StockMaster({ navigation }) {
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const [stockName, setStockName] = useState("");
  const [weight, setWeight] = useState("");
  const [buyTouch, setBuyTouch] = useState("");
  const [sellTouch, setSellTouch] = useState("");
  const [calculation, setCalculation] = useState("");
  const [pure, setPure] = useState("");

  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [sortAsc, setSortAsc] = useState(true);

  const [allItems, setAllItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    loadAllItems();
    loadStocks();
  }, []);

const loadStocks = async () => {
  try {
    const response = await fetch(`${base_url}/stockMaster`);
    if (response.ok) {
      const stockItems = await response.json();
      // Transform backend data to match frontend format
      const transformedStocks = stockItems.map(item => ({
        id: item._id,
        name: item.itemName,
        weight: `${item.weight} g`,
        buy: item.less.toString(),
        sell: item.netWeight.toString(),
        pure: item.pure.toString(),
        calculation: item.calculation
      }));
      setStocks(transformedStocks);
    }
  } catch (error) {
    console.error('Error loading stocks:', error);
    // Fallback to AsyncStorage
    const data = await AsyncStorage.getItem("STOCK_LIST");
    if (data) {
      setStocks(JSON.parse(data));
    }
  }
};

  const saveStocks = async (updatedStocks) => {
    await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(updatedStocks));
  };

  useEffect(() => {
    const calc = parseFloat(calculation);
    const netWt = parseFloat(sellTouch);
    if (!isNaN(calc) && !isNaN(netWt)) {
      setPure((calc * netWt).toFixed(3));
    } else {
      setPure("");
    }
  }, [calculation, sellTouch]);

  // Load all items from backend
  const loadAllItems = async () => {
    try {
      const response = await fetch(`${base_url}/items`);
      if (response.ok) {
        const items = await response.json();
        setAllItems(items);
      } else {
        console.error('Failed to fetch items from backend');
        // Fallback to AsyncStorage if backend fails
        const data = await AsyncStorage.getItem("ITEM_LIST");
        if (data) {
          const items = JSON.parse(data);
          setAllItems(items);
        }
      }
    } catch (error) {
      console.error('Error loading items:', error);
      // Fallback to AsyncStorage
      const data = await AsyncStorage.getItem("ITEM_LIST");
      if (data) {
        const items = JSON.parse(data);
        setAllItems(items);
      }
    }
  };

  const handleStockNameChange = (text) => {
    setStockName(text);
    if (text.length > 0) {
      const filtered = [...new Set(allItems.map(item => item.itemName))].filter(name =>
        name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setCalculation("");
    }
  };

  const selectSuggestion = (name) => {
    setStockName(name);
    setShowSuggestions(false);
    
    // Find the item details from allItems
    const selectedItem = allItems.find(item => item.itemName === name);
    if (selectedItem) {
      // Only set buying touch in calculation field
      if (selectedItem.buyingTouch) {
        setCalculation(selectedItem.buyingTouch.toString());
      }
    }
  };

  const calculatePurity = (item) => {
    const selectedItem = allItems.find(i => i.itemName === item.name);
    if (selectedItem) {
      const calc = parseFloat(selectedItem.buyingTouch);
      const netWt = parseFloat(item.sell);
      if (!isNaN(calc) && !isNaN(netWt)) {
        return (calc * netWt).toFixed(3);
      }
    }
    return item.pure || "";
  };

  /* ---------------- SEARCH FILTER ---------------- */
  const filteredStocks = stocks.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- SORTING ---------------- */
  const sortedStocks = [...filteredStocks].sort((a, b) =>
    sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  /* ---------------- EDIT ---------------- */
  const handleEdit = (item) => {
    setIsEdit(true);
    setEditId(item.id);
    setStockName(item.name);
    setWeight(item.weight.replace(" g", ""));
    setBuyTouch(item.buy);
    setSellTouch(item.sell);
    
    // Load calculation from item entry
    const selectedItem = allItems.find(i => i.itemName === item.name);
    if (selectedItem && selectedItem.buyingTouch) {
      setCalculation(selectedItem.buyingTouch.toString());
    } else {
      setCalculation("");
    }
    
    setPure("");
    setModalVisible(true);
  };

  /* ---------------- DELETE WITH CONFIRMATION ---------------- */
  const handleDelete = (id) => {
  Alert.alert("Delete Stock", "Are you sure you want to delete this stock?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          // Delete from backend
          const response = await fetch(`${base_url}/stockMaster/${id}`, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            // Update local state
            const updatedStocks = stocks.filter((item) => item.id !== id);
            setStocks(updatedStocks);
            // Also update AsyncStorage as backup
            await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(updatedStocks));
          } else {
            Alert.alert("Error", "Failed to delete stock from server");
          }
        } catch (error) {
          console.error('Error deleting stock:', error);
          Alert.alert("Error", "Failed to delete stock");
        }
      },
    },
  ]);
};

  /* ---------------- ADD / UPDATE ---------------- */
  const handleSubmit = async () => {
  // Validation
  if (!stockName || !weight || !buyTouch || !sellTouch || !calculation) {
    Alert.alert("Error", "Please fill all required fields");
    return;
  }

  try {
    const stockData = {
      itemName: stockName,
      weight: parseFloat(weight),
      less: parseFloat(buyTouch),
      netWeight: parseFloat(sellTouch),
      calculation: calculation,
      pure: parseFloat(pure) || 0
    };

    if (isEdit) {
      // Update existing stock
      const response = await fetch(`${base_url}/stockMaster/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });

      if (response.ok) {
        const updatedStock = await response.json();
        const updatedStocks = stocks.map((item) =>
          item.id === editId
            ? {
                id: updatedStock._id,
                name: updatedStock.itemName,
                weight: `${updatedStock.weight} g`,
                buy: updatedStock.less.toString(),
                sell: updatedStock.netWeight.toString(),
                pure: updatedStock.pure.toString(),
                calculation: updatedStock.calculation
              }
            : item
        );
        setStocks(updatedStocks);
        await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(updatedStocks));
      } else {
        Alert.alert("Error", "Failed to update stock");
        return;
      }
    } else {
      // Create new stock
      const response = await fetch(`${base_url}/stockMaster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });

      if (response.ok) {
        const savedStock = await response.json();
        const newStock = {
          id: savedStock._id,
          name: savedStock.itemName,
          weight: `${savedStock.weight} g`,
          buy: savedStock.less.toString(),
          sell: savedStock.netWeight.toString(),
          pure: savedStock.pure.toString(),
          calculation: savedStock.calculation
        };
        const updatedStocks = [...stocks, newStock];
        setStocks(updatedStocks);
        await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(updatedStocks));
      } else {
        Alert.alert("Error", "Failed to save stock");
        return;
      }
    }

    // Reset form
    setIsEdit(false);
    setEditId(null);
    setStockName("");
    setWeight("");
    setBuyTouch("");
    setSellTouch("");
    setCalculation("");
    setPure("");
    setModalVisible(false);
  } catch (error) {
    console.error('Error saving stock:', error);
    Alert.alert("Error", "Failed to save stock to server");
  }
};

  const openAddModal = () => {
    setIsEdit(false);
    setEditId(null);
    setStockName("");
    setWeight("");
    setBuyTouch("");
    setSellTouch("");
    setCalculation("");
    setPure("");
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={26} color="#fff" style={{ top: 25 }} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Stock Master</Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={22} color="#777" />
        <TextInput
          placeholder="Search Items "
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* FILTER + SORT */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20 }}>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterText}>All Items</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSortAsc(!sortAsc)}>
          <Icon name={sortAsc ? "sort-alphabetical-ascending" : "sort-alphabetical-descending"} size={26} />
        </TouchableOpacity>
      </View>

      {/* STOCK LIST */}
      <FlatList
        data={sortedStocks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.stockName}>{item.name}</Text>

              <View style={styles.iconRow}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Icon name="pencil" size={22} color="#1E88E5" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Icon name="delete" size={22} color="#E53935" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.weight}>Weight : {item.weight}</Text>

            <Text style={styles.weight}>Purity : {calculatePurity(item)}</Text>

            <View style={styles.touchRow}>
              <View style={styles.touchBox}>
                <Text style={styles.touchText}>B : {item.buy}</Text>
              </View>

              <View style={styles.touchBox}>
                <Text style={styles.touchText}>S : {item.sell}</Text>
              </View>

              <TouchableOpacity style={styles.transactionBtn}>
                <Text style={styles.transactionText}>Transaction</Text>
                <Icon name="chart-line" size={18} color="#1B5E20" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FLOATING ADD BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit ? "Edit Item" : "Add Item"}
              </Text>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Item Name"
                value={stockName}
                onChangeText={handleStockNameChange}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ScrollView style={styles.suggestionsContainer} nestedScrollEnabled={true}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(item)}
                    >
                      <Text>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.label}>Weight (g) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />

              <Text style={styles.label}>Less *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                keyboardType="numeric"
                value={buyTouch}
                onChangeText={setBuyTouch}
              />

              <Text style={styles.label}>Net Weight *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                keyboardType="numeric"
                value={sellTouch}
                onChangeText={setSellTouch}
              />

              <Text style={styles.label}>Calculation (Buying Touch) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                placeholder="Auto-filled from Item Entry"
                keyboardType="numeric"
                value={calculation}
                onChangeText={setCalculation}
                editable={true}
              />

              <Text style={styles.label}>Pure *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                keyboardType="numeric"
                value={pure}
                onChangeText={setPure}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                  <Text style={styles.submitText}>
                    {isEdit ? "Update" : "Submit"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ✅ ALL YOUR ORIGINAL STYLES REMAIN UNCHANGED */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6F8" },

  header: {
    backgroundColor: "#2E5B17",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: 120,
  },
  headerText: { color: "#fff", fontSize: 22, fontWeight: "bold", top: "30%" },

  searchBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 30,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, padding: 10 },

  filterBtn: {
    backgroundColor: "#2E7D32",
    alignSelf: "flex-start",
    marginLeft: 0,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterText: { color: "#fff", fontWeight: "bold" },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    padding: 15,
    elevation: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockName: { fontSize: 18, fontWeight: "bold" },
  iconRow: { flexDirection: "row", gap: 15 },

  weight: { marginTop: 10, fontSize: 15 },

  touchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    justifyContent: "space-between",
  },
  touchBox: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  touchText: { fontWeight: "bold", color: "#2E7D32" },

  transactionBtn: {
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transactionText: { color: "#2E7D32", fontWeight: "bold" },

  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#2ECC71",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },

  label: { marginTop: 15, fontWeight: "bold" },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },

  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 10,
  },
  cancelText: { fontWeight: "bold" },

  submitBtn: {
    backgroundColor: "#1B5E20",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 10,
  },
  submitText: { color: "#fff", fontWeight: "bold" },

  suggestionsContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    maxHeight: 150,
    backgroundColor: "#fff",
    marginTop: 5,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
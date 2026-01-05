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
  Switch,
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
  const [workerName, setWorkerName] = useState("");
  const [description, setDescription] = useState("");

  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [sortAsc, setSortAsc] = useState(true);

  const [allItems, setAllItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [stocks, setStocks] = useState([]);

  // Search suggestions for main search box
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

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
        calculation: item.calculation,
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
    const wt = parseFloat(weight);
    const less = parseFloat(buyTouch);
    const calc = parseFloat(calculation);
    if (!isNaN(wt) && !isNaN(less)) {
      const netWt = wt - less;
      setSellTouch(netWt.toFixed(3));
      if (!isNaN(calc)) {
        setPure((calc * netWt).toFixed(3));
      } else {
        setPure("");
      }
    } else {
      setSellTouch("");
      setPure("");
    }
  }, [weight, buyTouch, calculation]);

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
    // Fixed: Use stockName instead of itemName to match Items collection
    const filtered = [...new Set(allItems.map(item => item.stockName))].filter(name =>
      name && name.toLowerCase().includes(text.toLowerCase())
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
  
  // Fixed: Use stockName to find the item
  const selectedItem = allItems.find(item => item.stockName === name);
  if (selectedItem) {
    // Set buying touch in calculation field
    if (selectedItem.buyingTouch) {
      setCalculation(selectedItem.buyingTouch.toString());
    }
  }
};

  const calculatePurity = (item) => {
  // Fixed: Use stockName to match
  const selectedItem = allItems.find(i => i.stockName === item.name);
  if (selectedItem) {
    const calc = parseFloat(selectedItem.buyingTouch);
    const netWt = parseFloat(item.sell);
    if (!isNaN(calc) && !isNaN(netWt)) {
      return (calc * netWt).toFixed(3);
    }
  }
  return item.pure || "";
};

  // Handle main search box input
  const handleSearchChange = (text) => {
    setSearch(text);
    if (text.length > 0) {
      const filtered = allItems.filter(item =>
        item.itemName.toLowerCase().includes(text.toLowerCase())
      );
      setSearchSuggestions(filtered);
      setShowSearchSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
    }
  };

  // Handle suggestion selection
  const selectSearchSuggestion = (item) => {
    // Pre-fill the add modal with selected item details
    setStockName(item.itemName);
    setWeight(item.weight.toString());
    setBuyTouch(""); // Will be set in stock
    setSellTouch(""); // Will be set in stock
    setCalculation(item.buyingTouch.toString());
    setPure("");
    setShowSearchSuggestions(false);
    setModalVisible(true);
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
  setWorkerName(item.workerName || "");
  setDescription(item.description || ""); // Load description
  
  // Fixed: Use stockName to find the item
  const selectedItem = allItems.find(i => i.stockName === item.name);
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

const handleSubmit = async () => {
  // Validation
  if (!stockName || !weight || !buyTouch || !sellTouch || !calculation) {
    Alert.alert("Error", "Please fill all required fields");
    return;
  }
  
  // Check for unique item name when adding new item
  if (!isEdit && stocks.some(stock => stock.name.toLowerCase() === stockName.toLowerCase())) {
    Alert.alert("Error", "Item name already exists. Please choose a different name.");
    return;
  }
  
  try {
    const stockData = {
      itemName: stockName,
      weight: parseFloat(weight),
      less: parseFloat(buyTouch),
      netWeight: parseFloat(sellTouch),
      calculation: calculation,
      pure: parseFloat(pure) || 0,
      workerName: workerName,
      description: description
    };
    
    console.log("Submitting stock data:", stockData);
    
    if (isEdit) {
      // Update existing stock - FIXED: Added parentheses around template literal
      const response = await fetch(`${base_url}/stockMaster/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });
      
      if (response.ok) {
        const updatedStock = await response.json();
        console.log("Updated stock from server:", updatedStock);
        
        const updatedStocks = stocks.map((item) =>
          item.id === editId
            ? {
                id: updatedStock._id,
                name: updatedStock.itemName,
                weight: `${updatedStock.weight} g`,
                buy: updatedStock.less.toString(),
                sell: updatedStock.netWeight.toString(),
                pure: updatedStock.pure.toString(),
                calculation: updatedStock.calculation,
                workerName: updatedStock.workerName || "",
                description: updatedStock.description || ""
              }
            : item
        );
        
        setStocks(updatedStocks);
        await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(updatedStocks));
        Alert.alert("Success", "Stock updated successfully");
      } else {
        Alert.alert("Error", "Failed to update stock");
        return;
      }
    } else {
      // Create new stock - FIXED: Added parentheses around template literal
      const response = await fetch(`${base_url}/stockMaster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });
      
      if (response.ok) {
        const savedStock = await response.json();
        console.log("Saved stock from server:", savedStock);
        
        const newStock = {
          id: savedStock._id,
          name: savedStock.itemName,
          weight: `${savedStock.weight} g`,
          buy: savedStock.less.toString(),
          sell: savedStock.netWeight.toString(),
          pure: savedStock.pure.toString(),
          calculation: savedStock.calculation,
          workerName: savedStock.workerName || "",
          description: savedStock.description || ""
        };
        
        const updatedStocks = [...stocks, newStock];
        setStocks(updatedStocks);
        await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(updatedStocks));
        Alert.alert("Success", "Stock added successfully");
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
    setWorkerName("");
    setDescription("");
    setModalVisible(false);
  } catch (error) {
    console.error('Error saving stock:', error);
    Alert.alert("Error", "Failed to save stock to server");
  }
};

// ADD THIS FUNCTION HERE ⬇️
const openAddModal = () => {
  setIsEdit(false);
  setEditId(null);
  setStockName("");
  setWeight("");
  setBuyTouch("");
  setSellTouch("");
  setCalculation("");
  setPure("");
  setWorkerName("");
  setDescription("");
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
          onChangeText={handleSearchChange}
          style={styles.searchInput}
        />
      </View>

      {/* SEARCH SUGGESTIONS */}
      {showSearchSuggestions && searchSuggestions.length > 0 && (
        <ScrollView style={styles.searchSuggestionsContainer} nestedScrollEnabled={true}>
          {searchSuggestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.searchSuggestionItem}
              onPress={() => selectSearchSuggestion(item)}
            >
              <Text style={styles.suggestionName}>{item.itemName}</Text>
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionDetail}>Weight: {item.weight} g</Text>
                <Text style={styles.suggestionDetail}>Buying Touch: {item.buyingTouch}</Text>
              </View>
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionDetail}>Selling Touch: {item.sellingTouch}</Text>
                <Text style={styles.suggestionDetail}>Cash: {item.cash}</Text>
              </View>
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionDetail}>Cash %: {item.cashPercentage}</Text>
                <Text style={styles.suggestionDetail}>Cash Weight: {item.cashWeight}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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

              <Text style={styles.label}>Worker Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Worker Name"
                value={workerName}
                onChangeText={setWorkerName}
              />

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
                style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                placeholder="0.000"
                keyboardType="numeric"
                value={sellTouch}
                editable={false}
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
                style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                placeholder="0.000"
                keyboardType="numeric"
                value={pure}
                editable={false}
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Enter Description"
                value={description}
                onChangeText={setDescription}
                multiline={true}
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

  searchSuggestionsContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  searchSuggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  suggestionDetail: {
    fontSize: 14,
    color: "#666",
  },

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
  checkboxRow: {
    flexDirection: "row",
    
    alignItems: "center",
    marginTop: 15,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
});

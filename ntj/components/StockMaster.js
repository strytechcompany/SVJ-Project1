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
import { useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

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

  const [addedItems, setAddedItems] = useState([]);

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

  const [dealers, setDealers] = useState([]);
  const [workerSuggestions, setWorkerSuggestions] = useState([]);
  const [showWorkerSuggestions, setShowWorkerSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAllItems();
    loadStocks();
    loadDealers();
  }, []);

  // Reload stocks when component comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadStocks();
    }, [])
  );

  const loadStocks = async () => {
    try {
      const response = await fetch(`${base_url}/stockMaster`);
      if (response.ok) {
        const stockItems = await response.json();
        // Transform backend data to match frontend format
        const transformedStocks = stockItems.map((item) => ({
          id: item._id,
          name: item.itemName,
          weight: `${item.weight} g`,
          buy: item.less.toString(),
          sell: item.netWeight.toString(),
          pure: item.pure.toString(),
          calculation: item.calculation,
          workerName: item.workerName || "", // ADD THIS LINE
          description: item.description || "", // ADD THIS LINE
        }));
        setStocks(transformedStocks);
      }
    } catch (error) {
      console.error("Error loading stocks:", error);
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

  // Update calculations for current item
  useEffect(() => {
    const wt = parseFloat(weight);
    const less = parseFloat(buyTouch);
    const calc = parseFloat(calculation);

    if (!isNaN(wt) && !isNaN(less)) {
      const netWt = wt - less;
      setSellTouch(netWt.toFixed(3));

      if (!isNaN(calc)) {
        const pureValue = ((calc * netWt) / 100);
        setPure(pureValue.toFixed(3));
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
        console.error("Failed to fetch items from backend");
        // Fallback to AsyncStorage if backend fails
        const data = await AsyncStorage.getItem("ITEM_LIST");
        if (data) {
          const items = JSON.parse(data);
          setAllItems(items);
        }
      }
    } catch (error) {
      console.error("Error loading items:", error);
      // Fallback to AsyncStorage
      const data = await AsyncStorage.getItem("ITEM_LIST");
      if (data) {
        const items = JSON.parse(data);
        setAllItems(items);
      }
    }
  };

  // Load dealers for worker name suggestions
  const loadDealers = async () => {
    try {
      const response = await fetch(`${base_url}/customersDealer`);
      if (response.ok) {
        const dealerData = await response.json();
        setDealers(dealerData);
      }
    } catch (error) {
      console.error("Error loading dealers:", error);
    }
  };

  const handleStockNameChange = (text) => {
    setStockName(text);

    if (text.length > 0) {
      const filtered = [
        ...new Set(allItems.map((item) => item.stockName)),
      ].filter(
        (name) => name && name.toLowerCase().includes(text.toLowerCase())
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
    const selectedItem = allItems.find((item) => item.stockName === name);
    if (selectedItem && selectedItem.buyingTouch) {
      setCalculation(selectedItem.buyingTouch.toString());
    }
  };

  const handleWorkerNameChange = (text) => {
    setWorkerName(text);

    if (text.length > 0) {
      const filtered = dealers
        .map((dealer) => dealer.customerName)
        .filter((name) => name && name.toLowerCase().includes(text.toLowerCase()));
      setWorkerSuggestions([...new Set(filtered)]);
      setShowWorkerSuggestions(true);
    } else {
      setWorkerSuggestions([]);
      setShowWorkerSuggestions(false);
    }
  };

  const selectWorkerSuggestion = (name) => {
    setWorkerName(name);
    setShowWorkerSuggestions(false);
  };

  const addItem = () => {
    if (!stockName || !weight || !buyTouch || !sellTouch || !calculation) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // Check if item already exists in addedItems list (the temporary list in modal)
    const existingIndex = addedItems.findIndex(
      (item) => item.stockName.toLowerCase() === stockName.toLowerCase()
    );

    if (existingIndex > -1) {
      // Merge with existing item in the temporary list
      const updatedAdded = [...addedItems];
      const existing = updatedAdded[existingIndex];

      updatedAdded[existingIndex] = {
        ...existing,
        weight: (parseFloat(existing.weight) + parseFloat(weight)).toFixed(3),
        buyTouch: (parseFloat(existing.buyTouch) + parseFloat(buyTouch)).toFixed(3),
        sellTouch: (parseFloat(existing.sellTouch) + parseFloat(sellTouch)).toFixed(3),
        pure: (parseFloat(existing.pure || 0) + parseFloat(pure || 0)).toFixed(3),
        workerName: workerName || existing.workerName,
        description: description || existing.description,
      };
      setAddedItems(updatedAdded);
    } else {
      // Add as new entry in the temporary list
      const newItem = {
        id: Date.now() + Math.random(),
        stockName,
        weight,
        buyTouch,
        sellTouch,
        calculation,
        pure,
        workerName,
        description,
      };
      setAddedItems((prev) => [...prev, newItem]);
    }

    // Clear form
    setStockName("");
    setWeight("");
    setBuyTouch("0");
    setSellTouch("");
    setCalculation("");
    setPure("");
    setWorkerName("");
    setDescription("");
  };

  const isCurrentFormValid = () =>
    Boolean(stockName && weight && buyTouch && sellTouch && calculation);

  const validateSubmitItem = (item) => {
    const stockNameValue = String(item.stockName || "").trim();
    const weightValue = parseFloat(item.weight);
    const lessValue = parseFloat(item.buyTouch);
    const netValue = parseFloat(item.sellTouch);
    const calcValue = parseFloat(item.calculation);
    const pureValue = parseFloat(item.pure || 0);

    if (!stockNameValue) {
      return { valid: false, message: "Item name is required." };
    }
    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      return { valid: false, message: `Invalid weight for ${stockNameValue}.` };
    }
    if (!Number.isFinite(lessValue) || lessValue < 0) {
      return { valid: false, message: `Invalid less value for ${stockNameValue}.` };
    }
    if (!Number.isFinite(netValue) || netValue < 0) {
      return { valid: false, message: `Invalid net weight for ${stockNameValue}.` };
    }
    if (!Number.isFinite(calcValue) || calcValue < 0) {
      return { valid: false, message: `Invalid calculation for ${stockNameValue}.` };
    }
    if (!Number.isFinite(pureValue) || pureValue < 0) {
      return { valid: false, message: `Invalid pure value for ${stockNameValue}.` };
    }

    return {
      valid: true,
      data: {
        stockName: stockNameValue,
        weight: weightValue,
        buyTouch: lessValue,
        sellTouch: netValue,
        calculation: String(item.calculation),
        pure: pureValue,
        workerName: item.workerName || "",
        description: item.description || "",
      },
    };
  };

  const getSubmitCandidates = () => {
    const fromList = Array.isArray(addedItems) ? [...addedItems] : [];
    if (!isEdit && isCurrentFormValid()) {
      fromList.push({
        id: "__current_form__",
        stockName,
        weight,
        buyTouch,
        sellTouch,
        calculation,
        pure,
        workerName,
        description,
      });
    }
    return fromList;
  };

  const removeAddedItem = (id) => {
    setAddedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculatePurity = (item) => {
    const selectedItem = allItems.find((i) => i.stockName === item.name);

    if (selectedItem) {
      const calc = parseFloat(selectedItem.buyingTouch);
      const netWt = parseFloat(item.sell);

      if (!isNaN(calc) && !isNaN(netWt)) {
        const pureValue = (calc * netWt) / 100;
        return pureValue.toFixed(3);
      }
    }

    return item.pure || "";
  };

  const getBuyingTouchForStock = (stockNameValue) => {
    const key = String(stockNameValue || "").trim().toLowerCase();
    if (!key) return null;

    const matched = [...(allItems || [])]
      .reverse()
      .find((entry) => {
        const entryName = String(entry?.stockName || entry?.itemName || "")
          .trim()
          .toLowerCase();
        const bt = Number(entry?.buyingTouch);
        return entryName === key && Number.isFinite(bt);
      });

    if (!matched) return null;
    return String(matched.buyingTouch);
  };


  // Handle main search box input
  const handleSearchChange = (text) => {
    setSearch(text);
    if (text.length > 0) {
      const filtered = allItems.filter((item) =>
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
    const selectedItem = allItems.find((i) => i.stockName === item.name);
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
              method: "DELETE",
            });

            if (response.ok) {
              // Update local state
              const updatedStocks = stocks.filter((item) => item.id !== id);
              setStocks(updatedStocks);
              // Also update AsyncStorage as backup
              await AsyncStorage.setItem(
                "STOCK_LIST",
                JSON.stringify(updatedStocks)
              );
            } else {
              Alert.alert("Error", "Failed to delete stock from server");
            }
          } catch (error) {
            console.error("Error deleting stock:", error);
            Alert.alert("Error", "Failed to delete stock");
          }
        },
      },
    ]);
  };

  const handleUpdate = async () => {
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
        pure: parseFloat(pure) || 0,
        workerName: workerName,
        description: description,
      };

      console.log("Updating stock data:", stockData);

      const response = await fetch(`${base_url}/stockMaster/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stockData),
      });

      if (response.ok) {
        const updatedStock = await response.json();
        console.log("Updated stock from server:", updatedStock);

        // START: Add to Dealer Bill (Transfer History) if workerName is present
        if (workerName) {
          try {
            const transferData = {
              date: new Date().toISOString().split('T')[0],
              selectedDealer: workerName,
              selectedItems: [stockName],
              totalSelectedWeight: parseFloat(weight),
              weightSubtraction: 0,
              transferWeight: parseFloat(weight)
            };

            const billResponse = await fetch(`${base_url}/payments/dealerTransferHistory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(transferData)
            });

            if (billResponse.ok) {
              console.log("✅ Automatically added to Dealer Bill History");
            }
          } catch (error) {
            console.error("❌ Error adding to Dealer Bill:", error);
          }
        }
        // END: Add to Dealer Bill

        // Update local state
        const updatedStocks = stocks.map((stock) =>
          stock.id === editId
            ? {
              id: updatedStock._id,
              name: updatedStock.itemName,
              weight: `${updatedStock.weight} g`,
              buy: updatedStock.less.toString(),
              sell: updatedStock.netWeight.toString(),
              pure: updatedStock.pure.toString(),
              calculation: updatedStock.calculation,
              workerName: updatedStock.workerName || "",
              description: updatedStock.description || "",
            }
            : stock
        );

        setStocks(updatedStocks);
        await AsyncStorage.setItem(
          "STOCK_LIST",
          JSON.stringify(updatedStocks)
        );

        Alert.alert("Success", "Item updated successfully");

        // Reset form and close modal
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
      } else {
        Alert.alert("Error", "Failed to update item on server");
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update item");
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const submitCandidates = getSubmitCandidates();
    if (submitCandidates.length === 0) {
      Alert.alert("Error", "No items to submit");
      return;
    }

    try {
      setIsSubmitting(true);
      const validationErrors = [];
      const preparedItems = [];
      for (const item of submitCandidates) {
        const validated = validateSubmitItem(item);
        if (!validated.valid) {
          validationErrors.push(validated.message);
        } else {
          preparedItems.push(validated.data);
        }
      }

      if (validationErrors.length > 0) {
        Alert.alert("Validation Error", validationErrors[0]);
        return;
      }

      // Merge duplicate item names inside this submit batch to avoid duplicate saves
      const mergedByName = new Map();
      for (const item of preparedItems) {
        const key = item.stockName.toLowerCase();
        if (!mergedByName.has(key)) {
          mergedByName.set(key, { ...item });
          continue;
        }
        const existing = mergedByName.get(key);
        mergedByName.set(key, {
          ...existing,
          weight: existing.weight + item.weight,
          buyTouch: existing.buyTouch + item.buyTouch,
          sellTouch: existing.sellTouch + item.sellTouch,
          pure: existing.pure + item.pure,
          // keep latest calculation/worker/description if provided
          calculation: item.calculation || existing.calculation,
          workerName: item.workerName || existing.workerName,
          description: item.description || existing.description,
        });
      }
      const itemsToSubmit = Array.from(mergedByName.values());

      const updatedExistingStocks = [];
      const createdNewStocks = [];

      for (const item of itemsToSubmit) {
        const existingStock = stocks.find(
          (s) => s.name.toLowerCase() === item.stockName.toLowerCase()
        );

        const stockData = {
          itemName: item.stockName,
          weight: item.weight,
          less: item.buyTouch,
          netWeight: item.sellTouch,
          calculation: item.calculation,
          pure: item.pure || 0,
          workerName: item.workerName,
          description: item.description,
        };

        if (existingStock) {
          // ADD to existing stock
          const mergedData = {
            itemName: existingStock.name,
            weight: parseFloat(existingStock.weight) + stockData.weight,
            less: parseFloat(existingStock.buy) + stockData.less,
            netWeight: parseFloat(existingStock.sell) + stockData.netWeight,
            calculation: stockData.calculation, // Keep newest calculation
            pure: parseFloat(existingStock.pure) + stockData.pure,
            workerName: stockData.workerName || existingStock.workerName,
            description: stockData.description || existingStock.description,
          };

          const response = await fetch(`${base_url}/stockMaster/${existingStock.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mergedData),
          });

          if (response.ok) {
            const savedItem = await response.json();
            updatedExistingStocks.push({
              id: savedItem._id,
              name: savedItem.itemName,
              weight: `${savedItem.weight} g`,
              buy: savedItem.less.toString(),
              sell: savedItem.netWeight.toString(),
              pure: savedItem.pure.toString(),
              calculation: savedItem.calculation,
              workerName: savedItem.workerName || "",
              description: savedItem.description || "",
            });
          } else {
            const errText = await response.text();
            throw new Error(errText || `Failed to update stock: ${item.stockName}`);
          }
        } else {
          // CREATE new stock
          const response = await fetch(`${base_url}/stockMaster`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stockData),
          });

          if (response.ok) {
            const savedItem = await response.json();
            createdNewStocks.push({
              id: savedItem._id,
              name: savedItem.itemName,
              weight: `${savedItem.weight} g`,
              buy: savedItem.less.toString(),
              sell: savedItem.netWeight.toString(),
              pure: savedItem.pure.toString(),
              calculation: savedItem.calculation,
              workerName: savedItem.workerName || "",
              description: savedItem.description || "",
            });
          } else {
            const errText = await response.text();
            throw new Error(errText || `Failed to create stock: ${item.stockName}`);
          }
        }
      }

      // Update stocks list state: replace old ones and add new ones
      const updatedList = stocks.map(s => {
        const updated = updatedExistingStocks.find(u => u.id === s.id);
        return updated ? updated : s;
      });

      const finalStocks = [...updatedList, ...createdNewStocks];
      setStocks(finalStocks);
      await AsyncStorage.setItem("STOCK_LIST", JSON.stringify(finalStocks));

      Alert.alert("Success", `${itemsToSubmit.length} item(s) saved successfully`);

      // Reset form
      setAddedItems([]);
      setStockName("");
      setWeight("");
      setBuyTouch("0");
      setSellTouch("");
      setCalculation("");
      setPure("");
      setWorkerName("");
      setDescription("");
      setModalVisible(false);
    } catch (error) {
      console.error("Error saving stocks:", error);
      Alert.alert("Error", "Failed to save stocks to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ADD THIS FUNCTION HERE ⬇️
  const openAddModal = () => {
    setIsEdit(false);
    setEditId(null);
    setStockName("");
    setWeight("");
    setBuyTouch("0");
    setSellTouch("");
    setCalculation("");
    setPure("");
    setWorkerName("");
    setDescription("");
    setAddedItems([]);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <CommonHeader
      title="Stock Master"
      backgroundColor="#2E5B17"
      left={
      <TouchableOpacity onPress={() => navigation.navigate("Home")}>
      <Icon name="arrow-left" size={26} color="#fff" />
      </TouchableOpacity>
      }
      right={
      <TouchableOpacity onPress={loadStocks} style={styles.refreshBtn}>
      <Icon name="refresh" size={26} color="#fff" />
      </TouchableOpacity>
      }
      />

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

      {/* SEARCH SUGGESTIONS */}
      {showSearchSuggestions && searchSuggestions.length > 0 && (
        <ScrollView
          style={styles.searchSuggestionsContainer}
          nestedScrollEnabled={true}
        >
          {searchSuggestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.searchSuggestionItem}
              onPress={() => selectSearchSuggestion(item)}
            >
              <Text style={styles.suggestionName}>{item.itemName}</Text>
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionDetail}>
                  Weight: {item.weight} g
                </Text>
                <Text style={styles.suggestionDetail}>
                  Buying Touch: {item.buyingTouch}
                </Text>
              </View>
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionDetail}>
                  Selling Touch: {item.sellingTouch}
                </Text>
                <Text style={styles.suggestionDetail}>Cash: {item.cash}</Text>
              </View>
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionDetail}>
                  Cash %: {item.cashPercentage}
                </Text>
                <Text style={styles.suggestionDetail}>
                  Cash Weight: {item.cashWeight}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FILTER + SORT */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginHorizontal: 20,
        }}
      >
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterText}>All Items</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSortAsc(!sortAsc)}>
          <Icon
            name={
              sortAsc
                ? "sort-alphabetical-ascending"
                : "sort-alphabetical-descending"
            }
            size={26}
          />
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

            {/* ADD THIS BLOCK */}
            <Text style={styles.weight}>Worker : {item.workerName || "N/A"}</Text>

            <View style={styles.touchRow}>
              <View style={styles.touchBox}>
                <Text style={styles.touchText}>B : {getBuyingTouchForStock(item.name) ?? item.buy}</Text>
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

              <Text style={styles.totalPureText}>
                Total Pure ({addedItems.length} items):
                <Text style={styles.totalPureValue}>{addedItems.reduce((sum, item) => sum + parseFloat(item.pure || 0), 0).toFixed(3)} g</Text>
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
                <ScrollView
                  style={styles.suggestionsContainer}
                  nestedScrollEnabled={true}
                >
                  {suggestions.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <Text>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.label}>Worker Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Worker Name"
                value={workerName}
                onChangeText={handleWorkerNameChange}
              />
              {showWorkerSuggestions && workerSuggestions.length > 0 && (
                <ScrollView
                  style={styles.suggestionsContainer}
                  nestedScrollEnabled={true}
                >
                  {workerSuggestions.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={() => selectWorkerSuggestion(suggestion)}
                    >
                      <Text>{suggestion}</Text>
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
                style={[styles.input, { backgroundColor: "#f0f0f0" }]}
                placeholder="0.000"
                keyboardType="numeric"
                value={sellTouch}
                editable={false}
              />

              <Text style={styles.label}>Calculation (Buying Touch) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#f0f0f0" }]}
                placeholder="Auto-filled from Item Entry"
                keyboardType="numeric"
                value={calculation}
                onChangeText={setCalculation}
                editable={true}
              />

              <Text style={styles.label}>Pure *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#f0f0f0" }]}
                placeholder="0.000"
                keyboardType="numeric"
                value={pure}
                editable={false}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Enter Description"
                value={description}
                onChangeText={setDescription}
                multiline={true}
              />

              {!isEdit && (
                <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                  <View style={styles.addBtnContent}>
                    <Icon name="plus-circle" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Add Item</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* ADDED ITEMS TABLE */}
              {!isEdit && addedItems.length > 0 && (
                <View style={styles.card1}>
                  <Text style={styles.sectionTitle}>Added Items</Text>
                  <View style={styles.secondTableHeader}>
                    <Text style={styles.secondTableHeaderText}>Item Name</Text>
                    <Text style={styles.secondTableHeaderText}>Weight</Text>
                    <Text style={styles.secondTableHeaderText}>Pure</Text>
                    <Text style={styles.secondTableHeaderText}>Action</Text>
                  </View>

                  {addedItems.map((item, idx) => (
                    <View key={item.id} style={styles.secondTableRow}>
                      <Text style={styles.secondTableCell}>{item.stockName}</Text>
                      <Text style={styles.secondTableCell}>{item.weight} g</Text>
                      <Text style={styles.secondTableCell}>{item.pure} g</Text>
                      <TouchableOpacity onPress={() => removeAddedItem(item.id)}>
                        <Text style={[styles.actionText, { color: "#d9534f" }]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

              )}

            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !isEdit && getSubmitCandidates().length === 0 && { opacity: 0.5 },
                  isSubmitting && { opacity: 0.5 },
                ]}
                onPress={isEdit ? handleUpdate : handleSubmit}
                disabled={isSubmitting || (!isEdit && getSubmitCandidates().length === 0)}
              >
                <Text style={styles.submitText}>
                  {isEdit ? "Update Item" : isSubmitting ? "Submitting..." : "Submit All"}
                </Text>
              </TouchableOpacity>
            </View>
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
  headerText: { color: "#fff", fontSize: 22, fontWeight: "bold", top: "30%", flex: 1 },
  refreshBtn: { bottom: "1%" },

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
  card1: {
    backgroundColor: "#fff",
    marginHorizontal: 5,
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
  itemRow: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 15,
    marginBottom: 15,
  },
  addMoreText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 8,
  },
  addBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 15,
  },
  addBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2E7D32",
  },
  secondTableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFF0B3",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  secondTableHeaderText: {
    width: "25%",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 14,
    color: "#333",
    left: 2,
  },
  secondTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E5E5",
    left: -5,
  },
  secondTableCell: {
    width: "25%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  totalPureText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
    top: 2,
    right: -15,
  },
  totalPureValue: {
    color: "gray",
  },

});

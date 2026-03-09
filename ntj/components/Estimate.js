import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

export default function EstimateScreen({ navigation, route }) {
  const passedGoldRate = route?.params?.goldRate;

  const [itemName, setItemName] = useState("");
  const [weight, setWeight] = useState("");
  const [wastagePercent, setWastagePercent] = useState("");
  const [goldRate, setGoldRate] = useState("");

  const [items, setItems] = useState([]); // Inventory items for search
  const [estimateList, setEstimateList] = useState([]); // User added estimate items
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [enableGST, setEnableGST] = useState(false);

  const weightNum = parseFloat(weight) || 0;
  const wastageNum = parseFloat(wastagePercent) || 0;
  const rateNum = parseFloat(goldRate) || 0;

  const wastageWeight = (weightNum * wastageNum) / 100;
  const grossWeight = weightNum + wastageWeight;
  const netAmount = grossWeight * rateNum;
  const gst = enableGST ? netAmount * 0.03 : 0;
  const totalAmount = netAmount + gst;

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(`${base_url}/items`);
        if (response.ok) {
          const data = await response.json();
          setItems(data);
        } else {
          Alert.alert("Error", "Failed to load items");
        }
      } catch (error) {
        Alert.alert("Error", "Server connection failed");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Load gold rate from navigation or AsyncStorage
  useEffect(() => {
    const loadGoldRate = async () => {
      try {
        if (passedGoldRate) {
          console.log("✅ Using gold rate from HomeScreen:", passedGoldRate);
          setGoldRate(passedGoldRate);
          return;
        }

        const storedRate = await AsyncStorage.getItem("goldRate");
        if (storedRate) {
          console.log("✅ Using stored gold rate:", storedRate);
          setGoldRate(storedRate);
        }
      } catch (error) {
        console.error("Error loading gold rate:", error);
      }
    };
    loadGoldRate();
  }, [passedGoldRate]);

  const filteredItems = items.filter(
    (item) =>
      item.stockName?.toLowerCase().includes(search.toLowerCase()) ||
      item.itemDetails?.toLowerCase().includes(search.toLowerCase())
  );

  const selectItem = (item) => {
    setItemName(item.stockName);
    setWastagePercent(item.percentage?.toString() || "");
    setSearch("");
  };

  const buildCurrentEstimateData = () => {
    if (estimateList.length > 0) {
      const total = estimateList.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
      return {
        items: estimateList.map((i) => ({
          itemName: i.itemName,
          weight: Number(i.weight) || 0,
          wastagePercent: Number(i.wastagePercent) || 0,
          grossWeight: Number(i.grossWeight) || 0,
          goldRate: Number(i.goldRate) || 0,
          netAmount: Number(i.netAmount) || 0,
          gst: Number(i.gst) || 0,
          totalAmount: Number(i.totalAmount) || 0,
        })),
        totalAmount: Number(total.toFixed(2)),
        itemName: estimateList.map((i) => i.itemName).join(", "),
        weight: Number(estimateList.reduce((sum, i) => sum + (Number(i.weight) || 0), 0).toFixed(3)),
        grossWeight: Number(estimateList.reduce((sum, i) => sum + (Number(i.grossWeight) || 0), 0).toFixed(3)),
        netAmount: Number(estimateList.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0).toFixed(2)),
        gst: Number(estimateList.reduce((sum, i) => sum + (Number(i.gst) || 0), 0).toFixed(2)),
        goldRate: rateNum,
        enableGST,
      };
    }

    return {
      itemName,
      weight: parseFloat(weight),
      wastagePercent: parseFloat(wastagePercent) || 0,
      grossWeight: Number(grossWeight.toFixed(3)),
      goldRate: parseFloat(goldRate),
      netAmount: Number(netAmount.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      enableGST,
      items: [],
    };
  };

  const navigateToEstimatePreview = (estimateData) => {
    navigation.navigate("BillPreview", {
      customer: {
        name: "Estimate Customer",
        phone: "N/A",
        type: "Estimate",
        date: new Date().toLocaleDateString(),
        oldBalance: 0,
        advanceBalance: 0,
        balance: 0,
        id: "estimate-" + Date.now(),
      },
      estimate: estimateData,
    });
  };

  const saveEstimateToBackend = async (estimateData) => {
    const asFixed = (value, digits = 2) => {
      const n = Number(value);
      return Number.isFinite(n) ? n.toFixed(digits) : (0).toFixed(digits);
    };

    const payload = {
      ...estimateData,
      // Compatibility: backend may validate numeric 0 as missing (!gst).
      // Send fixed strings so 0 values are accepted by older validation logic.
      weight: asFixed(estimateData.weight, 3),
      wastagePercent: asFixed(estimateData.wastagePercent, 3),
      grossWeight: asFixed(estimateData.grossWeight, 3),
      goldRate: asFixed(estimateData.goldRate, 2),
      netAmount: asFixed(estimateData.netAmount, 2),
      gst: asFixed(estimateData.gst, 2),
      totalAmount: asFixed(estimateData.totalAmount, 2),
      items: (estimateData.items || []).map((it) => ({
        ...it,
        weight: asFixed(it.weight, 3),
        wastagePercent: asFixed(it.wastagePercent, 3),
        grossWeight: asFixed(it.grossWeight, 3),
        goldRate: asFixed(it.goldRate, 2),
        netAmount: asFixed(it.netAmount, 2),
        gst: asFixed(it.gst, 2),
        totalAmount: asFixed(it.totalAmount, 2),
      })),
      customerName: "Estimate Customer",
      customerPhone: "N/A",
    };

    const response = await fetch(`${base_url}/estimates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to save estimate");
    }
    return response.json();
  };

  const saveAndViewEstimate = async () => {
    const hasList = estimateList.length > 0;
    if (!hasList && (!itemName || !weight || !goldRate)) {
      Alert.alert("Error", "Please fill Item Name, Weight, and Gold Rate");
      return;
    }

    try {
      const estimateData = buildCurrentEstimateData();
      const saved = await saveEstimateToBackend(estimateData);
      navigateToEstimatePreview({
        ...estimateData,
        ...saved,
        items: Array.isArray(saved?.items) && saved.items.length > 0 ? saved.items : estimateData.items,
      });
    } catch (error) {
      console.error("Error saving estimate:", error);
      Alert.alert("Save Failed", `${error.message}. Showing preview only.`);
      navigateToEstimatePreview(buildCurrentEstimateData());
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      {/* HEADER */}
      <CommonHeader
      title="Estimate"
      backgroundColor="#2E5B17"
      onBack={() => navigation.navigate("Home")}
      insideSafeArea
      right={
      <TouchableOpacity onPress={saveAndViewEstimate}>
      <Icon name="printer" size={26} color="#fff" />
      </TouchableOpacity>
      }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          bounces={true}
          alwaysBounceVertical={true}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="automatic"
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={search}
            onChangeText={setSearch}
          />

          {loading && <ActivityIndicator size="large" color="#2E7D32" />}

          {!loading && search.length > 0 && filteredItems.length > 0 && (
            <View style={styles.dropdownContainer}>
              <ScrollView
                style={styles.dropdown}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {filteredItems.map((item, index) => (
                  <TouchableOpacity
                    key={item._id || index}
                    style={styles.dropdownItem}
                    onPress={() => selectItem(item)}
                  >
                    <Text style={styles.dropdownText}>{item.stockName}</Text>
                    <Text style={styles.dropdownSubText}>
                      {item.itemDetails}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Enter weight"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Enter wastage percentage"
              keyboardType="numeric"
              value={wastagePercent}
              onChangeText={setWastagePercent}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.result}>{grossWeight.toFixed(3)} <Text style={styles.label}> Gross Weight</Text></Text>
          </View>

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Enter gold rate"
              keyboardType="numeric"
              value={goldRate}
              onChangeText={setGoldRate}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.result}>₹ {netAmount.toFixed(2)} <Text style={styles.label}> Net Amount</Text></Text>
          </View>

          {/* GST Toggle */}
          <View style={[styles.row, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' }]}>
            <Text style={styles.label}>Enable GST (3%)</Text>
            <Switch
              value={enableGST}
              onValueChange={setEnableGST}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={enableGST ? '#2E7D32' : '#f4f3f4'}
            />
          </View>

          {enableGST && (
            <View style={styles.row}>
              <Text style={styles.label}>GST (3%)</Text>
              <Text style={styles.result}>₹ {gst.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.totalBox}>
            <Text style={styles.totalText}>Current Item Total</Text>
            <Text style={styles.totalValue}>₹ {totalAmount.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.addItemBtn} onPress={() => {
            if (!itemName || !weight || !goldRate) {
              Alert.alert("Error", "Please fill Item Name, Weight, and Gold Rate");
              return;
            }
            const newItem = {
              id: Date.now(),
              itemName,
              weight: weightNum,
              wastagePercent: wastageNum,
              grossWeight: parseFloat(grossWeight.toFixed(3)),
              goldRate: rateNum,
              netAmount: parseFloat(netAmount.toFixed(2)),
              gst: parseFloat(gst.toFixed(2)),
              totalAmount: parseFloat(totalAmount.toFixed(2)),
              enableGST,
            };
            setEstimateList(prev => [...prev, newItem]);
            // Clear inputs except gold rate
            setItemName("");
            setWeight("");
            setWastagePercent("");
            setSearch("");
          }}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "bold", marginLeft: 8 }}>
              Add to List
            </Text>
          </TouchableOpacity>

          {/* ITEM LIST */}
          {estimateList.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Added Items ({estimateList.length})</Text>
              {estimateList.map((item, index) => (
                <View key={item.id || index} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemTitle}>{item.itemName}</Text>
                    <Text style={styles.listItemSubtitle}>
                      Wt: {item.weight}g | Rate: {item.goldRate}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listItemAmount}>₹{item.totalAmount}</Text>
                    <TouchableOpacity onPress={() => {
                      setEstimateList(prev => prev.filter(i => i.id !== item.id));
                    }}>
                      <Text style={{ color: 'red', fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View style={styles.grandTotalBox}>
                <Text style={styles.grandTotalText}>Grand Total: </Text>
                <Text style={styles.grandTotalValue}>
                  ₹ {estimateList.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={saveAndViewEstimate}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Save / View Estimate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.transferBtn}
            onPress={() => {
              if (!itemName || !weight || !goldRate) {
                Alert.alert("Error", "Please fill Item Name, Weight, and Gold Rate");
                return;
              }
              navigation.navigate("B2CCalculationPage", {
                estimate: {
                  itemName,
                  weight: parseFloat(weight),
                  wastagePercent: parseFloat(wastagePercent),
                  goldRate: parseFloat(goldRate),
                },
              });
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Transfer to B2C
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.transferBtn, { backgroundColor: "#1e3d59", marginTop: 10 }]}
            onPress={() => {
              if (!itemName || !weight || !goldRate) {
                Alert.alert("Error", "Please fill Item Name, Weight, and Gold Rate");
                return;
              }
              navigation.navigate("B2BCalculationPage", {
                previewData: {
                  itemName,
                  weight: parseFloat(weight),
                  touch: parseFloat(wastagePercent), // In B2B, wastage/touch is used
                  ftRate: goldRate,
                },
              });
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Transfer to B2B
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.billHistoryBtn}
            onPress={() => navigation.navigate("EstimateBillHistory")}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Bill History
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2E5B17",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 10,
  },
  container: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 90,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  dropdownContainer: {
    width: "100%",
    marginBottom: 10,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    maxHeight: 220,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontWeight: "600",
    fontSize: 16,
  },
  dropdownSubText: {
    fontSize: 13,
    color: "#777",
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  result: {
    backgroundColor: "#eef3ff",
    padding: 12,
    borderRadius: 8,
    fontWeight: "bold",
  },
  totalBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#1b5e20",
  },
  totalText: {
    color: "#c8e6c9",
  },
  totalValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: "#2e7d32",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  transferBtn: {
    marginTop: 10,
    backgroundColor: "#135F25",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  billBtn: {
    marginTop: 10,
    backgroundColor: "#1976d2",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  billHistoryBtn: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: "#455A64",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  addItemBtn: {
    backgroundColor: "#F57C00",
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee'
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  listItemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333'
  },
  listItemSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 2
  },
  listItemAmount: {
    fontWeight: 'bold',
    color: '#2E7D32'
  },
  grandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#eee'
  },
  grandTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32'
  }
});

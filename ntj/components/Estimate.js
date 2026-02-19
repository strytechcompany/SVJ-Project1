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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";

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

  const weightNum = parseFloat(weight) || 0;
  const wastageNum = parseFloat(wastagePercent) || 0;
  const rateNum = parseFloat(goldRate) || 0;

  const wastageWeight = (weightNum * wastageNum) / 100;
  const grossWeight = weightNum + wastageWeight;
  const netAmount = grossWeight * rateNum;
  const gst = netAmount * 0.03;
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

        const AsyncStorage = require("@react-native-async-storage/async-storage");
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

  // Save estimate and show bill
  const saveEstimate = () => {
    if (!itemName || !weight || !goldRate) {
      Alert.alert("Error", "Please fill Item Name, Weight, and Gold Rate");
      return;
    }

    navigation.navigate("BillPreview", {
      customer: {
        name: 'Estimate Customer',
        phone: 'N/A',
        type: 'Estimate',
        date: new Date().toLocaleDateString(),
        oldBalance: 0,
        advanceBalance: 0,
        balance: 0,
        id: 'estimate-' + Date.now(),
      },
      estimate: {
        itemName,
        weight: parseFloat(weight),
        wastagePercent: parseFloat(wastagePercent) || 0,
        grossWeight,
        goldRate: parseFloat(goldRate),
        netAmount,
        gst,
        totalAmount,
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Estimate</Text>
        <TouchableOpacity onPress={saveEstimate}>
          <Icon name="printer" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

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
          <Text style={styles.sectionTitle}>Select Item</Text>

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
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Weight (W)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Wastage %</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={wastagePercent}
              onChangeText={setWastagePercent}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Gross Weight</Text>
            <Text style={styles.result}>{grossWeight.toFixed(3)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Gold Rate</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={goldRate}
              onChangeText={setGoldRate}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Net Amount</Text>
            <Text style={styles.result}>₹ {netAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>GST (3%)</Text>
            <Text style={styles.result}>₹ {gst.toFixed(2)}</Text>
          </View>

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

          <TouchableOpacity style={styles.saveBtn} onPress={() => {
            // If list is empty, treat consistent with single item logic
            if (estimateList.length === 0) {
              saveEstimate();
              return;
            }

            // Construct the data properly for BillPreview
            const total = estimateList.reduce((sum, i) => sum + i.totalAmount, 0);

            navigation.navigate("BillPreview", {
              customer: {
                name: 'Estimate Customer',
                phone: 'N/A',
                type: 'Estimate',
                date: new Date().toLocaleDateString(),
                oldBalance: 0,
                advanceBalance: 0,
                balance: 0,
                id: 'estimate-' + Date.now(),
              },
              estimate: {
                items: estimateList, // Pass the list
                totalAmount: total.toFixed(2),
                // Aggregate/Fallback fields for compatibility
                itemName: estimateList.map(i => i.itemName).join(", "),
                weight: estimateList.reduce((sum, i) => sum + i.weight, 0).toFixed(3),
                grossWeight: estimateList.reduce((sum, i) => sum + i.grossWeight, 0).toFixed(3),
                netAmount: estimateList.reduce((sum, i) => sum + i.netAmount, 0).toFixed(2),
                gst: estimateList.reduce((sum, i) => sum + i.gst, 0).toFixed(2),
                goldRate: rateNum,
              }
            });
          }}>
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
            style={styles.billBtn}
            onPress={() => {
              if (!itemName || !weight || !goldRate) {
                Alert.alert("Error", "Please fill Item Name, Weight, and Gold Rate");
                return;
              }
              navigation.navigate("BillPreview", {
                customer: {
                  name: 'Estimate Customer',
                  phone: 'N/A',
                  type: 'Estimate',
                  date: new Date().toLocaleDateString(),
                  oldBalance: 0,
                  advanceBalance: 0,
                  balance: 0,
                  id: 'estimate-' + Date.now(),
                },
                estimate: {
                  itemName,
                  weight: parseFloat(weight),
                  wastagePercent: parseFloat(wastagePercent),
                  grossWeight,
                  goldRate: parseFloat(goldRate),
                  netAmount,
                  gst,
                  totalAmount,
                },
              });
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              View Bill
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

import React, { useState, useEffect, useMemo } from "react";
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
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";
import BarcodeDisplay from "./BarcodeDisplay";
import * as Print from "expo-print";

export default function StockMaster({ navigation }) {
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [expandedDesign, setExpandedDesign] = useState(null);
  const [sortBy, setSortBy] = useState("designName"); // "designName", "weight", "qty"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"

  // Form State
  const [itemNumber, setItemNumber] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("necklace");
  const [manualCategory, setManualCategory] = useState("");
  const [isManualCategory, setIsManualCategory] = useState(false);
  const [designName, setDesignName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [purity, setPurity] = useState("22k(916)");
  const [buyingTouch, setBuyingTouch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    loadStocks();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadStocks();
    }, [])
  );

  const loadStocks = async () => {
    setLoadingStocks(true);
    try {
      const response = await fetch(`${base_url}/stockMaster`);
      if (response.ok) {
        const data = await response.json();
        setStocks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading stocks:", error);
    } finally {
      setLoadingStocks(false);
    }
  };

  const generateBarcodeValue = () => {
    const code = "SVJ" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcode(code);
    if (!itemNumber) {
      setItemNumber("ITM" + Date.now().toString().slice(-6));
    }
  };

  const printNewBarcode = async () => {
    if (!barcode) {
      Alert.alert("No Barcode", "Please generate a barcode first.");
      return;
    }
    const barcodeSVG = generateBarcodeSVG(barcode, 180, 40);
    const displayName = itemName || "Item";
    const displayWeight = grossWeight ? `${grossWeight}g` : "";
    const displayPurity = purity || "";
    const displayCategory = isManualCategory ? manualCategory : category;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100vw;
              height: 100vh;
              background: #fff;
            }
            .label {
              width: 2.5in;
              border: 1.5px solid #000;
              border-radius: 6px;
              padding: 8px 10px;
              text-align: center;
              background: #fff;
            }
            .shop {
              font-size: 9px;
              font-weight: bold;
              color: #7a5c00;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .item-name {
              font-size: 11px;
              font-weight: bold;
              color: #000;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .details {
              font-size: 9px;
              color: #444;
              margin-bottom: 4px;
            }
            .barcode-wrap {
              margin: 6px 0 4px;
            }
            .barcode-num {
              font-size: 8px;
              letter-spacing: 2px;
              color: #000;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="shop">Sri Vaishnavi Jewellery</div>
            <div class="item-name">${displayName}</div>
            <div class="details">${[displayCategory, displayWeight, displayPurity].filter(Boolean).join(' | ')}</div>
            <div class="barcode-wrap">${barcodeSVG}</div>
            <div class="barcode-num">${barcode}</div>
          </div>
        </body>
      </html>
    `;
    try {
      await Print.printAsync({ html });
    } catch (e) {
      Alert.alert("Print Error", e.message || "Failed to print");
    }
  };



  const resetForm = () => {
    setItemNumber("");
    setItemName("");
    setCategory("necklace");
    setManualCategory("");
    setIsManualCategory(false);
    setDesignName("");
    setSupplierName("");
    setGrossWeight("");
    setNetWeight("");
    setPurity("22k(916)");
    setBuyingTouch("");
    setQuantity("1");
    setBarcode("");
  };

  const handleSubmit = async () => {
    if (!itemName || !category || !grossWeight || !purity) {
      Alert.alert("Error", "Please fill all required fields (Name, Category, Weight, Purity)");
      return;
    }
    if (!barcode) {
      Alert.alert("Error", "Please generate a barcode first");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        itemNumber,
        itemName,
        category: isManualCategory ? manualCategory : category,
        designName: designName || "Other Designs",
        supplierName,
        grossWeight: parseFloat(grossWeight),
        netWeight: parseFloat(netWeight || grossWeight),
        purity,
        buyingTouch: parseFloat(buyingTouch) || 0,
        quantity: parseInt(quantity) || 1,
        barcode
      };

      const response = await fetch(`${base_url}/stockMaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert("Success", "Item added to Stock Master");
        resetForm();
        setModalVisible(false);
        loadStocks();
      } else {
        const err = await response.json();
        Alert.alert("Error", err.message || "Failed to save item");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${base_url}/stockMaster/${id}`, { method: "DELETE" });
            if (res.ok) {
              loadStocks();
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    ]);
  };

  const groupedStocks = useMemo(() => {
    const filtered = stocks.filter(item => 
      !search || 
      (item.itemName || "").toLowerCase().includes(search.toLowerCase()) || 
      (item.itemNumber || "").toLowerCase().includes(search.toLowerCase()) || 
      (item.designName || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode || "").toLowerCase().includes(search.toLowerCase())
    );

    const groups = {};
    filtered.forEach(item => {
      const design = item.designName || "Other Designs";
      if (!groups[design]) {
        groups[design] = { items: [], totalWeight: 0, totalQty: 0 };
      }
      groups[design].items.push(item);
      groups[design].totalWeight += (parseFloat(item.grossWeight) || 0);
      groups[design].totalQty += (parseInt(item.quantity) || 1);
    });

    let result = Object.entries(groups)
      .map(([name, data]) => ({ designName: name, ...data }));

    // Apply Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortBy === "weight") { valA = a.totalWeight; valB = b.totalWeight; }
      else if (sortBy === "qty") { valA = a.totalQty; valB = b.totalQty; }
      else { valA = a.designName.toLowerCase(); valB = b.designName.toLowerCase(); }

      if (sortOrder === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return result;
  }, [stocks, search, sortBy, sortOrder]);

  const flatFilteredItems = useMemo(() => {
    if (!search) return [];
    return stocks.filter(item => 
      (item.itemName || "").toLowerCase().includes(search.toLowerCase()) || 
      (item.itemNumber || "").toLowerCase().includes(search.toLowerCase()) || 
      (item.designName || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [stocks, search]);

  const totalGrams = stocks.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0);

  const BARCODE_PATTERNS = [
    "11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000",
    "11001000100","11000100100","10110011100","10011011100","10011001110","10111001100","10011101100","10011100110","11001110010","11001011100",
    "11001001110","11011100100","11001110100","11101101110","11101001100","11100101100","11100100110","11101100100","11100110100","11100110010",
    "11011011000","11011000110","11000110110","10100011000","10001011000","10001000110","10110001000","10001101000","10001100010","11010001000",
    "11000101000","11000100010","10110111000","10110001110","10001101110","10111011000","10111000110","10001110110","11101110110","11010001110",
    "11000101110","11011101000","11011100010","11011101110","11101011000","11101000110","11100010110","11101101000","11101100010","11100011010",
    "11101111010","11001000010","11110001010","10100110000","10100001100","10010110000","10010000110","10000101100","10000100110","10110010000",
    "10110000100","10011010000","10011000010","10000110100","10000110010","11000010010","11001010000","11110111010","11000010100","10001111010",
    "10100111100","10010111100","10010011110","10111100100","10011110100","10011110010","11110100100","11110010100","11110010010","11011011110",
    "11011110110","11110110110","10101111000","10100011110","10001011110","10111101000","10111100010","11110101000","11110100010","10111011110",
    "10111101110","11101011110","11110101110"
  ];

  const generateBarcodeSVG = (value, width = 300, height = 80) => {
    let bits = "11010010000";
    let checksum = 104;
    for (let i = 0; i < value.length; i++) {
      const v = value.charCodeAt(i) - 32;
      if (v < 0 || v > 94) continue;
      checksum += v * (i + 1);
      bits += BARCODE_PATTERNS[v];
    }
    bits += BARCODE_PATTERNS[checksum % 103];
    bits += "1100011101011";

    const barW = width / bits.length;
    let rects = '';
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        rects += `<rect x="${(i * barW).toFixed(2)}" y="0" width="${(barW + 0.5).toFixed(2)}" height="${height}" fill="#000"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${rects}</svg>`;
  };

  const printBarcode = async (item) => {
    const barcodeSVG = generateBarcodeSVG(item.barcode, 300, 80);
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;padding:20px;box-sizing:border-box;">
          <h2 style="color:#B8860B;margin-bottom:5px;text-align:center;">SRI VAISHNAVI JEWELLERY</h2>
          <div style="border:2px solid #000;padding:20px;text-align:center;border-radius:8px;min-width:300px;">
            <p style="margin:4px 0;font-weight:bold;font-size:16px;">${item.itemName}</p>
            <p style="margin:4px 0;color:#555;font-size:13px;">Design: ${item.designName || 'N/A'}</p>
            <p style="margin:4px 0;color:#555;font-size:13px;">Weight: ${item.grossWeight}g | Purity: ${item.purity}</p>
            <div style="margin:15px auto;">${barcodeSVG}</div>
            <p style="letter-spacing:4px;font-size:12px;font-weight:bold;">${item.barcode}</p>
          </div>
        </body>
      </html>
    `;
    await Print.printAsync({ html });
  };

  const renderGroup = ({ item }) => {
    const isExpanded = expandedDesign === item.designName;
    return (
      <View style={styles.designGroup}>
        <TouchableOpacity 
          style={styles.groupHeader} 
          onPress={() => setExpandedDesign(isExpanded ? null : item.designName)}
        >
          <View style={styles.groupHeaderLeft}>
            <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={24} color="#B8860B" />
            <Text style={styles.groupDesignName}>{item.designName}</Text>
          </View>
          <View style={styles.groupHeaderRight}>
            <Text style={styles.groupSummaryText}>{item.totalQty} Items | {item.totalWeight.toFixed(3)}g</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.items.map((subItem, idx) => (
              <View key={subItem._id || idx} style={styles.itemRow}>
                <View style={styles.itemRowMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subItemName}>{subItem.itemName}</Text>
                    <Text style={styles.subItemDetails}>No: {subItem.itemNumber || "N/A"} | {subItem.category}</Text>
                    <Text style={styles.subItemDetails}>W: {subItem.grossWeight}g | P: {subItem.purity}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => printBarcode(subItem)}>
                      <Icon name="printer" size={20} color="#B8860B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(subItem._id)} style={{ marginLeft: 15 }}>
                      <Icon name="trash-can-outline" size={20} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                </View>
                {subItem.barcode && (
                  <View style={styles.barcodeDisplay}>
                    <BarcodeDisplay value={subItem.barcode} width={200} height={40} />
                    <Text style={styles.barcodeText}>{subItem.barcode}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={styles.groupFooter}>
              <Text style={styles.footerTotalText}>Items: {item.totalQty} | Total: {item.totalWeight.toFixed(3)}g</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8860B" />
      <CommonHeader title="Stock Master" onBack={() => navigation.goBack()} backgroundColor="#B8860B" />

      {/* Summary Header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryCard}>
          <Icon name="package-variant-closed" size={24} color="#fff" />
          <Text style={styles.summaryLabel}>Total Items</Text>
          <Text style={styles.summaryValue}>{stocks.length}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#8A6508" }]}>
          <Icon name="scale-bathroom" size={24} color="#fff" />
          <Text style={styles.summaryLabel}>Total Grams</Text>
          <Text style={styles.summaryValue}>{totalGrams.toFixed(3)}g</Text>
        </View>
      </View>

      {/* Search & Sort Bar */}
      <View style={styles.searchSortRow}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={24} color="#B8860B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Name, No, Design..."
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.sortBtn} 
          onPress={() => {
            if (sortBy === "designName") setSortBy("weight");
            else if (sortBy === "weight") setSortBy("qty");
            else setSortBy("designName");
          }}
        >
          <Icon name="sort-variant" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sort Indicators */}
      <View style={styles.sortIndicatorRow}>
        <Text style={styles.sortIndicatorText}>Sorting by: <Text style={{fontWeight: 'bold'}}>{sortBy.toUpperCase()}</Text></Text>
        <TouchableOpacity onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
          <Icon name={sortOrder === "asc" ? "arrow-up" : "arrow-down"} size={16} color="#B8860B" />
        </TouchableOpacity>
      </View>

      {loadingStocks ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#B8860B" />
          <Text style={styles.loaderText}>Loading Inventory...</Text>
        </View>
      ) : search ? (
        /* FLAT LIST WHEN SEARCHING */
        <FlatList
          data={flatFilteredItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={[styles.designGroup, { padding: 10 }]}>
               <View style={styles.itemRowMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subItemName}>{item.itemName}</Text>
                    <Text style={styles.subItemDetails}>Design: {item.designName}</Text>
                    <Text style={styles.subItemDetails}>No: {item.itemNumber || "N/A"} | {item.category}</Text>
                    <Text style={styles.subItemDetails}>W: {item.grossWeight}g | P: {item.purity}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => printBarcode(item)}>
                      <Icon name="printer" size={20} color="#B8860B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ marginLeft: 15 }}>
                      <Icon name="trash-can-outline" size={20} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.barcode && (
                  <View style={styles.barcodeDisplay}>
                    <BarcodeDisplay value={item.barcode} width={200} height={40} />
                    <Text style={styles.barcodeText}>{item.barcode}</Text>
                  </View>
                )}
            </View>
          )}
        />
      ) : (
        /* GROUPED LIST WHEN NOT SEARCHING */
        <FlatList
          data={groupedStocks}
          keyExtractor={(item) => item.designName}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="database-off" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No items found in stock</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Stock Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close-circle" size={28} color="#FF5252" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Item Number</Text>
                  <TextInput style={styles.input} value={itemNumber} onChangeText={setItemNumber} placeholder="ITM001" />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.inputLabel}>Item Name *</Text>
                  <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="e.g. Bridal Necklace" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Category *</Text>
              {!isManualCategory ? (
                <View style={styles.chipContainer}>
                  {["necklace", "bangle", "ring", "earring"].map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.chip, category === cat && styles.activeChip]} 
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.chipText, category === cat && styles.activeChipText]}>{cat.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.manualBtn} onPress={() => setIsManualCategory(true)}>
                    <Text style={styles.manualBtnText}>Manual</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.manualInputRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={manualCategory} onChangeText={setManualCategory} placeholder="Enter Category" />
                  <TouchableOpacity onPress={() => setIsManualCategory(false)} style={styles.cancelManual}>
                    <Icon name="close" size={24} color="#FF5252" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Design Name</Text>
                  <TextInput style={styles.input} value={designName} onChangeText={setDesignName} placeholder="e.g. Lotus" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Supplier</Text>
                  <TextInput style={styles.input} value={supplierName} onChangeText={setSupplierName} placeholder="Supplier Name" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Gross Wt (g) *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={grossWeight} 
                    onChangeText={(val) => {
                      setGrossWeight(val);
                      setNetWeight(val);
                    }} 
                    keyboardType="numeric" 
                    placeholder="0.000" 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Net Wt (g) *</Text>
                  <TextInput style={styles.input} value={netWeight} onChangeText={setNetWeight} keyboardType="numeric" placeholder="0.000" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Purity *</Text>
              <View style={styles.chipContainer}>
                {["22k(916)", "18k(750)", "24k(999)"].map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.chip, purity === p && styles.activeChip]} 
                    onPress={() => setPurity(p)}
                  >
                    <Text style={[styles.chipText, purity === p && styles.activeChipText]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Buying Touch (%)</Text>
                  <TextInput style={styles.input} value={buyingTouch} onChangeText={setBuyingTouch} keyboardType="numeric" placeholder="92.00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" />
                </View>
              </View>

              <View style={styles.barcodeSection}>
                <TouchableOpacity style={styles.barcodeBtn} onPress={generateBarcodeValue}>
                  <Icon name="barcode-scan" size={20} color="#fff" />
                  <Text style={styles.barcodeBtnText}>Generate Barcode</Text>
                </TouchableOpacity>
                {barcode !== "" && (
                  <View style={styles.previewBarcode}>
                    <BarcodeDisplay value={barcode} width={250} height={60} />
                    <Text style={styles.barcodeValueText}>{barcode}</Text>
                    <TouchableOpacity style={styles.printLabelBtn} onPress={printNewBarcode}>
                      <Icon name="printer" size={18} color="#fff" />
                      <Text style={styles.printLabelBtnText}>Print Barcode Label</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, isSubmitting && styles.disabledBtn]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>SAVE TO STOCK</Text>}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF2" },
  summaryHeader: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#B8860B",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    gap: 12,
    elevation: 5
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#9A7109",
    borderRadius: 15,
    padding: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryLabel: { color: "#FFF8E1", fontSize: 12, fontWeight: "600", marginTop: 4 },
  summaryValue: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  searchSortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 15,
    gap: 10
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "#FFD700",
    elevation: 2
  },
  sortBtn: {
    backgroundColor: "#B8860B",
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2
  },
  sortIndicatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 5,
    alignItems: "center"
  },
  sortIndicatorText: {
    fontSize: 12,
    color: "#666"
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#3D2800" },
  designGroup: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 15,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFF2D1"
  },
  groupHeader: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF9EB"
  },
  groupHeaderLeft: { flexDirection: "row", alignItems: "center" },
  groupDesignName: { fontSize: 17, fontWeight: "bold", color: "#3D2800", marginLeft: 8 },
  groupHeaderRight: { alignItems: "flex-end" },
  groupSummaryText: { fontSize: 12, color: "#B8860B", fontWeight: "600" },
  expandedContent: { padding: 10, backgroundColor: "#fff" },
  itemRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    marginBottom: 8
  },
  itemRowMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subItemName: { fontSize: 15, fontWeight: "bold", color: "#444" },
  subItemDetails: { fontSize: 12, color: "#777", marginTop: 2 },
  itemActions: { flexDirection: "row", alignItems: "center" },
  barcodeDisplay: { alignItems: "center", marginTop: 10, backgroundColor: "#FCFCFC", padding: 5, borderRadius: 8 },
  barcodeText: { fontSize: 10, color: "#666", marginTop: 2, letterSpacing: 2 },
  groupFooter: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    alignItems: "flex-end",
    backgroundColor: "#FFFDF7"
  },
  footerTotalText: { fontSize: 13, fontWeight: "bold", color: "#B8860B" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#B8860B",
    width: 65,
    height: 65,
    borderRadius: 32.5,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: { marginTop: 10, color: "#B8860B", fontWeight: "600" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 15, color: "#999", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: "90%"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 15
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#B8860B" },
  inputLabel: { fontSize: 13, fontWeight: "bold", color: "#666", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFEFA",
    color: "#3D2800"
  },
  formRow: { flexDirection: "row", alignItems: "center" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 5 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: "#fff"
  },
  activeChip: { backgroundColor: "#B8860B", borderColor: "#B8860B" },
  chipText: { fontSize: 12, fontWeight: "bold", color: "#B8860B" },
  activeChipText: { color: "#fff" },
  manualBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: "#E9ECEF" },
  manualBtnText: { fontSize: 12, fontWeight: "bold", color: "#495057" },
  manualInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cancelManual: { padding: 10 },
  barcodeSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#FFF8E1",
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD700",
    borderStyle: "dashed"
  },
  barcodeBtn: {
    flexDirection: "row",
    backgroundColor: "#3D2800",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    gap: 8
  },
  barcodeBtnText: { color: "#fff", fontWeight: "bold" },
  previewBarcode: { marginTop: 15, alignItems: "center" },
  barcodeValueText: { fontSize: 12, fontWeight: "bold", color: "#3D2800", marginTop: 5, letterSpacing: 3 },
  submitBtn: {
    backgroundColor: "#B8860B",
    marginTop: 30,
    height: 55,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 1 },
  disabledBtn: { backgroundColor: "#DCDCDC", elevation: 0 },
  printLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B8860B",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 7,
    elevation: 3
  },
  printLabelBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 }
});

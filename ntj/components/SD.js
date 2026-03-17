import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Linking,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Feather } from "@expo/vector-icons";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import CommonHeader from "./CommonHeader";

/**
 * CreateTransaction (Full)
 * - Customer select
 * - Issue / Receipt / Cash entries
 * - Product list table (showing both issue & receipt items)
 * - Transaction summary (horizontal scroll)
 *
 * Option C: includes product table & summary
 */

export default function CreateTransaction({ navigation }) {
  const route = useRoute();

  // ── ALL useState FIRST ──────────────────────────────────────
  const [weight, setWeight] = useState("");
  const [stone, setStone] = useState("0");
  const [touch, setTouch] = useState("");
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptStone, setReceiptStone] = useState("0");
  const [receiptTouch, setReceiptTouch] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [itemsStock, setItemsStock] = useState({});

  const [issueItems, setIssueItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [cashTable, setCashTable] = useState([]);

  const [rupees, setRupees] = useState("");
  const [goldRate, setGoldRate] = useState("");
  const [cashPureInput, setCashPureInput] = useState("0.000");

  const [gstEnabled, setGstEnabled] = useState(false);
  const [sgst, setSgst] = useState("");
  const [cgst, setCgst] = useState("");
  const [igst, setIgst] = useState("");
  const [gstPercentage, setGstPercentage] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [showGstInBill, setShowGstInBill] = useState(true);
  const [isSgstEnabled, setIsSgstEnabled] = useState(false);
  const [isCgstEnabled, setIsCgstEnabled] = useState(false);
  const [isIgstEnabled, setIsIgstEnabled] = useState(false);
  const [savedGstList, setSavedGstList] = useState([]);
  const [showSavedGstModal, setShowSavedGstModal] = useState(false);

  const [itemsList, setItemsList] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIssueItem, setSelectedIssueItem] = useState(null);
  const [issueItemDropdownOpen, setIssueItemDropdownOpen] = useState(false);
  const [customIssueItem, setCustomIssueItem] = useState("");
  const [selectedReceiptItem, setSelectedReceiptItem] = useState(null);
  const [receiptItemDropdownOpen, setReceiptItemDropdownOpen] = useState(false);
  const [customReceiptItem, setCustomReceiptItem] = useState("");
  const [issueItemSearch, setIssueItemSearch] = useState("");
  const [receiptItemSearch, setReceiptItemSearch] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [previousReceiptWeight, setPreviousReceiptWeight] = useState(0);

  const [search, setSearch] = useState("");
  const [cartSearch, setCartSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentNames, setRecentNames] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [phone, setPhone] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [showProofImageInBill, setShowProofImageInBill] = useState(true);

  // ── TOTALS (after useState, before useEffect) ───────────────
  const totalIssuePure = issueItems.reduce(
    (acc, it) => acc + Number(it.purity || 0),
    0,
  );
  const totalIssueWeight = issueItems.reduce(
    (acc, it) => acc + Number(it.weight || 0),
    0,
  );
  const totalIssueStone = issueItems.reduce(
    (acc, it) => acc + Number(it.stone || 0),
    0,
  );
  const totalIssueTouch = issueItems.reduce(
    (acc, it) => acc + Number(it.touch || 0),
    0,
  );
  const totalReceiptPure = receiptItems.reduce(
    (acc, it) => acc + Number(it.purity || 0),
    0,
  );
  const totalReceiptWeight = receiptItems.reduce(
    (acc, it) => acc + Number(it.weight || 0),
    0,
  );
  const totalReceiptStone = receiptItems.reduce(
    (acc, it) => acc + Number(it.stone || 0),
    0,
  );
  const totalReceiptTouch = receiptItems.reduce(
    (acc, it) => acc + Number(it.touch || 0),
    0,
  );
  const totalCashPure = cashTable.reduce(
    (acc, it) => acc + Number(it.pure || 0),
    0,
  );

  // ── useEffects AFTER totals ──────────────────────────────────
  useEffect(() => {
    saveStock();
  }, [itemsStock]);

  // Handle customer name change for searchable dropdown
  const handleCustomerNameChange = (text) => {
    setSearch(text);
    if (text) {
      const filtered = customers.filter(
        (customer) =>
          customer.name &&
          customer.name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearch(customer.name);
    setPhone(customer.phone || "");
    setShowDropdown(false);
  };

  useEffect(() => {
    const loadSavedGstList = async () => {
      try {
        const stored = await AsyncStorage.getItem("gstSavedList");
        if (stored) {
          setSavedGstList(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load saved GST list in B2B", error);
      }
    };
    if (gstEnabled) {
      loadSavedGstList();
    }
  }, [gstEnabled]);

  // Auto-calculate Total GST % based on selections
  useEffect(() => {
    if (gstEnabled) {
      const s = isSgstEnabled ? parseFloat(sgst) || 0 : 0;
      const c = isCgstEnabled ? parseFloat(cgst) || 0 : 0;
      const i = isIgstEnabled ? parseFloat(igst) || 0 : 0;
      setGstPercentage((s + c + i).toString());
    } else {
      setGstPercentage("0");
    }
  }, [
    gstEnabled,
    isSgstEnabled,
    isCgstEnabled,
    isIgstEnabled,
    sgst,
    cgst,
    igst,
  ]);

  // Auto-calculate GST amount in rupees
  useEffect(() => {
    if (gstEnabled) {
      const percentage = parseFloat(gstPercentage) || 0;
      const rate = parseFloat(goldRate) || 0;
      const pure = totalIssuePure;
      const amount = (pure * rate * percentage) / 100;
      setGstAmount(amount.toFixed(2));
    } else {
      setGstAmount("0");
    }
  }, [gstEnabled, gstPercentage, goldRate, totalIssuePure]);

  // Handler for stock update on receipt weight blur
  const updateReceiptStock = async (newWeight) => {
    if (!selectedReceiptItem || !itemsStock[selectedReceiptItem]?._id) return;

    const newW = parseNum(newWeight);
    const delta = newW - parseNum(previousReceiptWeight);

    if (delta !== 0) {
      // Update local stock
      setItemsStock((prev) => ({
        ...prev,
        [selectedReceiptItem]: {
          ...prev[selectedReceiptItem],
          weight: (
            Number(prev[selectedReceiptItem]?.weight || 0) + delta
          ).toFixed(3),
        },
      }));

      // Update stock in database
      try {
        const currentStock = Number(
          itemsStock[selectedReceiptItem]?.weight || 0,
        );
        const updatedWeight = Number((currentStock + delta).toFixed(3));

        const stockResponse = await fetch(
          `${base_url}/stockMaster/${itemsStock[selectedReceiptItem]?._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemName: selectedReceiptItem,
              weight: updatedWeight,
              less: 0,
              netWeight: updatedWeight,
              calculation: 0,
              pure: 0,
            }),
          },
        );

        if (!stockResponse.ok) {
          console.error("Failed to update stock in database on blur");
        } else {
          console.log("✅ Stock updated in database on blur");
        }
      } catch (stockError) {
        console.error("Error updating stock on blur:", stockError);
      }
    }

    setPreviousReceiptWeight(newWeight);
  };

  const filteredCartCustomers = customers.filter(
    (c) =>
      String(c.customerType || "").toUpperCase() === "DEALER" &&
      (
        (c.name && c.name.toLowerCase().includes(cartSearch.toLowerCase())) ||
        (c.phone && String(c.phone).includes(cartSearch))
      ),
  );

  const selectDealerFromCard = (cust) => {
    setSelectedCustomer(cust);
    setProofImage(cust.receiptImage || cust.proofImage || cust.image || "");
    setShowProofImageInBill(
      typeof cust?.receiptImageShowInBill === "boolean"
        ? cust.receiptImageShowInBill
        : true,
    );
  };

  const renderDealerCard = (cust, key, highlight = false) => {
    let currentBalance = Number(cust.ob || 0);
    let advanceBalance = Number(cust.ab || 0);
    if (currentBalance < 0) {
      advanceBalance += Math.abs(currentBalance);
      currentBalance = 0;
    }

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.listItem,
          highlight && { borderLeftWidth: 4, borderLeftColor: "#2E7D32" },
        ]}
        onPress={() => selectDealerFromCard(cust)}
      >
        <View>
          <Text style={styles.listItemText}>
            <Text style={{ fontWeight: "bold", color: "#000" }}>
              {cust.name}
            </Text>{" "}
            | P : {cust.phone}
          </Text>
          <Text style={styles.balanceText}>
            OB: {Number(currentBalance || 0).toFixed(3)}g{" "}
            {advanceBalance > 0
              ? `| AB: ${Number(advanceBalance || 0).toFixed(3)}g`
              : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const dealerResponse = await fetch(`${base_url}/customersDealer`);
      const dealerData = await dealerResponse.json();

      const dealerCustomers = dealerData
        .filter((customer) => {
          if (!customer.customerName) return false;
          const normalizedType = String(customer.customerType || "DEALER").toUpperCase();
          return normalizedType === "DEALER";
        })
        .map((customer) => {
          // Resolve the best available image from the dealer record
          // (the backend /customersDealer GET already merges latestTransactionImage)
          const resolvedImage =
            (customer.latestTransactionImage && String(customer.latestTransactionImage).trim()) ||
            (customer.lastTransaction?.receiptImage && String(customer.lastTransaction.receiptImage).trim()) ||
            (customer.lastTransaction?.image && String(customer.lastTransaction.image).trim()) ||
            (customer.receiptImage && String(customer.receiptImage).trim()) ||
            (customer.proofImage && String(customer.proofImage).trim()) ||
            (customer.image && String(customer.image).trim()) ||
            "";

          return {
            ...customer,
            customerType: "DEALER",
            customerNumber: customer.phoneNumber,
            customerId: customer.customerId || customer._id,
            id: customer._id || customer.id,
            name: customer.customerName,
            ob: customer.oldBalance || 0,
            ab: customer.advanceBalance || 0,
            company: customer.shopName || customer.companyName || "",
            phone: customer.phoneNumber || "",
            address: customer.address || "",
            gst: customer.gstin || "",
            customerName: customer.customerName,
            shopName: customer.shopName || customer.companyName || "No Shop Name",
            oldBalance: customer.oldBalance || 0,
            advanceBalance: customer.advanceBalance || 0,
            billCurrentBalance: customer.billCurrentBalance || 0,
            updatedAt: customer.updatedAt || new Date().toISOString(),
            // ✅ Image fields — required for proofImage pre-fill & saveCompleteTransaction fallback
            image: resolvedImage,
            receiptImage: resolvedImage,
            proofImage: resolvedImage,
          };
        });

      setCustomers(dealerCustomers);
    } catch (error) {
      console.error("Error fetching dealers:", error);
      Alert.alert("Error", "Failed to load dealers from database");
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handlePhonePress = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available");
      return;
    }
    const cleanPhone = String(phoneNumber).replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() =>
      Alert.alert("Error", "Unable to open dialer"),
    );
  };

  const handleWhatsAppPress = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert("Error", "WhatsApp number not available");
      return;
    }
    let cleanPhone = String(phoneNumber).replace(/[^\d+]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `+91${cleanPhone}`;
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`).catch(() =>
      Alert.alert("Error", "Make sure WhatsApp is installed on your device"),
    );
  };

  const handleEditCustomer = (customer) => {
    navigation.navigate("EditCustomerMaster", { customer });
  };

  const handleDeleteCustomer = async (customer) => {
    Alert.alert("Delete Dealer", `Delete ${customer.name || customer.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const id = customer.id || customer._id || customer.customerId;
            const response = await fetch(`${base_url}/customersDealer/${id}`, {
              method: "DELETE",
            });
            if (!response.ok) {
              throw new Error("Failed to delete dealer");
            }
            await fetchCustomers();
            Alert.alert("Success", "Dealer deleted successfully");
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to delete dealer");
          }
        },
      },
    ]);
  };

  const pickImageFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Gallery access permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3,   // ✅ Keep base64 small (<200 KB) to prevent upload timeouts
      base64: true,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      setProofImage(asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri);
    }
  };

  const captureImageFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.3,   // ✅ Keep base64 small (<200 KB) to prevent upload timeouts
      base64: true,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      setProofImage(asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri);
    }
  };

  const openProofImagePicker = () => {
    Alert.alert("Upload Receipt Proof", "Choose image source", [
      { text: "Camera", onPress: captureImageFromCamera },
      { text: "Gallery", onPress: pickImageFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const fetchRecentNames = async () => {
    try {
      const resp = await fetch(`${base_url}/transactions`);
      if (resp.ok) {
        const data = await resp.json();
        const names = [
          ...new Set(
            data
              .filter((t) => String(t?.customerType || t?.type || "").toUpperCase() === "DEALER")
              .map((t) => t.customerName)
              .filter(Boolean),
          ),
        ].slice(0, 5);
        setRecentNames(names);
      }
    } catch (err) {
      console.error("Recent names error:", err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const response = await fetch(`${base_url}/items`);

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();

      console.log("Fetched items:", data);

      // Create items list from schema
      const itemsList = data
        .map((item) => ({
          itemName: item.stockName, // updated
          itemDetails: item.itemDetails, // added
          buyingTouch: item.buyingTouch,
          sellingTouch: item.sellingTouch,
          percentage: item.percentage,
          type: item.type,
          issue: item.issue,
          receipt: item.receipt,
          date: item.date,
        }))
        .filter((item) => item.itemName); // ensure stockName exists

      console.log("Items list:", itemsList);
      setItemsList(itemsList);

      // Build stock object by fetching from stock master
      const fetchStock = async () => {
        try {
          const response = await fetch(`${base_url}/stockMaster`);
          if (!response.ok) {
            throw new Error("Failed to fetch stock");
          }
          const stockData = await response.json();
          const stockObj = {};
          stockData.forEach((item) => {
            const name = item.itemName;
            const weight = Number(item.weight);
            if (stockObj[name]) {
              stockObj[name].weight += weight;
            } else {
              stockObj[name] = { weight: weight, _id: item._id };
            }
          });
          setItemsStock(stockObj);
        } catch (error) {
          console.error("Error fetching stock:", error);
          // Fallback to 0 for each item
          const stockObj = {};
          data.forEach((item) => {
            if (item.stockName) {
              stockObj[item.stockName] = { weight: 0, _id: null };
            }
          });
          setItemsStock(stockObj);
        }
      };

      fetchStock();
    } catch (error) {
      console.error("Error fetching items:", error);
      Alert.alert("Error", "Failed to load items from stock master");
      setItemsList([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchRecentNames();
  }, []);

  // Handle new customer from CreateCustomerMaster
  useFocusEffect(
    useCallback(() => {
      if (route.params?.newCustomer) {
        const newCust = {
          ...route.params.newCustomer,
          customerType: "DEALER",
        };
        setCustomers((prev) => [...prev, newCust]);
        setSelectedCustomer(newCust);
        setPhone(newCust.phone || "");
        setProofImage(newCust.receiptImage || newCust.proofImage || newCust.image || "");
        // Clear the param to avoid re-adding
        navigation.setParams({ newCustomer: undefined });
      }
    }, [route.params?.newCustomer, navigation]),
  );

  // Load ft rate from route params or AsyncStorage on focus
  useFocusEffect(
    useCallback(() => {
      const loadFtRate = async () => {
        try {
          // First check if ftRate is passed via route params
          if (route.params?.ftRate) {
            setGoldRate(route.params.ftRate);
            // Also save to AsyncStorage for consistency
            await AsyncStorage.setItem("ftRate", route.params.ftRate);
          } else {
            // Fallback to AsyncStorage
            const storedFtRate = await AsyncStorage.getItem("ftRate");
            if (storedFtRate) {
              setGoldRate(storedFtRate);
            }
          }
        } catch (error) {
          console.error("Error loading ft rate:", error);
        }
      };
      loadFtRate();
    }, [route.params?.ftRate]),
  );

  // Function to refresh all data
  const handleRefresh = async () => {
    console.log("🔄 Refreshing data...");
    await fetchCustomers();
    await fetchItems();
    await fetchRecentNames();
    await refreshFtRate();
    console.log("Success", "Data refreshed from database");
  };

  // Handle previewData or estimate from route params
  useEffect(() => {
    if (route.params?.previewData) {
      const data = route.params.previewData;
      console.log("📥 Received previewData:", data);

      if (data.customerName) {
        const cust = customers.find((c) => c.name === data.customerName);
        if (cust) {
          setSelectedCustomer(cust);
          setSearch(cust.name);
          setPhone(cust.phone || "");
        } else {
          // If customer not found in list, create a temporary selected customer
          setSelectedCustomer({
            name: data.customerName,
            id: data.customerId || "N/A",
            phone: data.phone || "",
            ob: data.oldBalance || 0,
            ab: data.advBal || 0,
          });
          setSearch(data.customerName);
          setPhone(data.phone || "");
        }
      }

      if (data.itemName) {
        setSelectedIssueItem(data.itemName);
        setWeight(data.weight?.toString() || "");
        setTouch(data.touch?.toString() || "");
      }

      if (data.ftRate) {
        setGoldRate(data.ftRate.toString());
      }
    }
  }, [route.params?.previewData, customers]);

  useEffect(() => {
    if (!route.params?.editTransaction) return;
    const t = route.params.editTransaction;
    const c = route.params.editCustomer || {};

    const customerId = c.id || c._id || c.customerId || t.customerId;
    const foundCustomer =
      customers.find((cust) => String(cust.id) === String(customerId)) ||
      customers.find((cust) => cust.name === (c.customerName || c.name || t.customerName));

    if (foundCustomer) {
      setSelectedCustomer(foundCustomer);
      setSearch(foundCustomer.name || "");
      setPhone(foundCustomer.phone || "");
      setProofImage(foundCustomer.receiptImage || foundCustomer.proofImage || foundCustomer.image || "");
      setShowProofImageInBill(
        typeof t?.receiptImageShowInBill === "boolean"
          ? t.receiptImageShowInBill
          : (typeof foundCustomer?.receiptImageShowInBill === "boolean"
            ? foundCustomer.receiptImageShowInBill
            : true),
      );
    } else {
      const detectedType = String(c.customerType || c.type || "DEALER").toUpperCase();
      setSelectedCustomer({
        id: customerId,
        name: c.customerName || c.name || t.customerName || "Unknown",
        phone: c.customerNumber || c.phone || c.phoneNumber || "",
        customerType: detectedType,
        gst: c.gstin || "",
        address: c.address || "",
      });
      setSearch(c.customerName || c.name || t.customerName || "");
      setPhone(c.customerNumber || c.phone || c.phoneNumber || "");
      setProofImage(t.receiptImage || t.proofImage || t.image || "");
      setShowProofImageInBill(
        typeof t?.receiptImageShowInBill === "boolean"
          ? t.receiptImageShowInBill
          : true,
      );
    }

    setDate(
      t.date ||
      (t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"))
    );

    setIssueItems(
      (Array.isArray(t.issueItems) ? t.issueItems : []).map((item, idx) => ({
        id: Date.now() + idx,
        item: item.name || item.item || "",
        weight: Number(item.gross ?? item.weight ?? 0),
        stone: Number(item.m ?? item.stone ?? 0),
        touch: Number(item.calc ?? item.touch ?? 0),
        purity: Number(item.pure ?? item.purity ?? 0),
        type: "issue",
      }))
    );

    setReceiptItems(
      (Array.isArray(t.receiptItems) ? t.receiptItems : []).map((item, idx) => ({
        id: Date.now() + idx + 1000,
        item: item.name || item.item || "",
        weight: Number(item.weight ?? 0),
        stone: Number(item.result ?? item.stone ?? 0),
        touch: Number(item.calc ?? item.touch ?? 0),
        purity: Number(item.pure ?? item.purity ?? 0),
        type: "receipt",
      }))
    );

    setCashTable(
      (Array.isArray(t.cashTable) ? t.cashTable : []).map((item, idx) => ({
        id: Date.now() + idx + 2000,
        rupees: Number(item.rupees ?? 0),
        goldRate: Number(item.goldRate ?? 0),
        pure: Number(item.pure ?? 0),
      }))
    );
    if (t.receiptImage || t.proofImage || t.image) {
      setProofImage(t.receiptImage || t.proofImage || t.image);
    }
    if (typeof t?.receiptImageShowInBill === "boolean") {
      setShowProofImageInBill(t.receiptImageShowInBill);
    }
  }, [route.params?.editTransaction, route.params?.editCustomer, customers]);

  // Function to refresh FT rate
  const refreshFtRate = async () => {
    try {
      const storedFtRate = await AsyncStorage.getItem("ftRate");
      if (storedFtRate) {
        setGoldRate(storedFtRate);
        setCashPureInput(fmt(computeCashPure(rupees || 0, storedFtRate)));
      }
    } catch (error) {
      console.error("Error refreshing ft rate:", error);
    }
  };

  // -----------------------
  // Utilities & Calculators
  // -----------------------
  const parseNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // Pure calculation for Issue Table entries
  const calcIssuePure = (w, s, t) => {
    const W = parseNum(w);
    const S = parseNum(s);
    const T = parseNum(t);
    const net = Math.max(0, W - S);
    const pure = net * (T / 100);
    return Number(pure.toFixed(3));
  };

  // Pure calculation for Receipt Table entries
  const calcReceiptPure = (w, s, t) => {
    const W = parseNum(w);
    const S = parseNum(s);
    const T = parseNum(t);
    const pure = W * (S / 100) * (T / 100);
    return Number(pure.toFixed(3));
  };

  // Cash pure from rupees and goldRate
  const computeCashPure = (r, rate) => {
    const R = parseNum(r);
    const G = parseNum(rate);
    if (G <= 0) return 0;
    return Number((R / G).toFixed(3));
  };

  // Format helper
  const fmt = (n) => Number(n || 0).toFixed(3);
  const fmt2 = (n) => Number(n || 0).toFixed(2);
  const normalizeBillNo = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    const n = Number.parseInt(digits, 10);
    if (!Number.isFinite(n) || n <= 0) return "";
    return String(n).padStart(5, "0");
  };

  // -----------------------
  // Add / Remove operations
  // -----------------------
  const addIssueItem = async () => {
    console.log("🔵 addIssueItem called");

    if (!selectedIssueItem) {
      Alert.alert("Select Item", "Please choose an issue item before adding.");
      return;
    }

    if (!selectedCustomer) {
      Alert.alert("Select Customer", "Please select a customer first.");
      return;
    }

    const issueWeight = parseNum(weight);

    if (issueWeight <= 0) {
      Alert.alert(
        "Invalid Weight",
        "Please enter a valid weight greater than 0",
      );
      return;
    }

    const purity = calcIssuePure(weight, stone, touch);

    console.log("📊 Calculated purity:", purity);

    const issueEntryData = {
      itemName: selectedIssueItem,
      weight: issueWeight,
      stone: parseNum(stone),
      touch: parseNum(touch),
      purity: purity,
    };

    console.log("📤 Sending to backend:", issueEntryData);
    console.log("🌐 URL:", `${base_url}/issueEntries`);

    try {
      const response = await fetch(`${base_url}/issueEntries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(issueEntryData),
      });

      console.log("📥 Response status:", response.status);

      const responseText = await response.text();
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedEntry = JSON.parse(responseText);
      console.log("✅ Saved successfully:", savedEntry);

      // Update stock in database
      try {
        const currentStock = Number(itemsStock[selectedIssueItem]?.weight || 0);
        const newWeight = Number((currentStock - issueWeight).toFixed(3));

        const stockResponse = await fetch(
          `${base_url}/stockMaster/${itemsStock[selectedIssueItem]?._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemName: selectedIssueItem,
              weight: newWeight,
              less: 0, // Assuming less remains the same, adjust if needed
              netWeight: newWeight, // Assuming netWeight = weight - less
              calculation: 0, // Adjust based on your schema
              pure: 0, // Adjust based on your schema
            }),
          },
        );

        if (!stockResponse.ok) {
          console.error("Failed to update stock in database");
        } else {
          console.log("✅ Stock updated in database");
        }
      } catch (stockError) {
        console.error("Error updating stock:", stockError);
      }

      // Update local stock
      setItemsStock((prev) => ({
        ...prev,
        [selectedIssueItem]: {
          ...prev[selectedIssueItem],
          weight: Number(
            ((prev[selectedIssueItem]?.weight || 0) - issueWeight).toFixed(3),
          ),
        },
      }));

      // Add to issue items
      setIssueItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          item: selectedIssueItem,
          weight: issueWeight,
          stone: parseNum(stone),
          touch: parseNum(touch),
          purity,
          details: issueDetails,
          type: "issue",
        },
      ]);

      // Clear inputs
      setWeight("");
      setStone("0");
      setTouch("");
      setIssueDetails("");
      setSelectedIssueItem(null);
      setIssueItemSearch("");

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const addReceiptItem = async () => {
    console.log("🟢 addReceiptItem called");

    if (!selectedReceiptItem) {
      Alert.alert("Select Item", "Please choose a receipt item before adding.");
      return;
    }

    if (!selectedCustomer) {
      Alert.alert("Select Customer", "Please select a customer first.");
      return;
    }

    const receiptW = parseNum(receiptWeight);

    if (receiptW <= 0) {
      Alert.alert(
        "Invalid Weight",
        "Please enter a valid weight greater than 0",
      );
      return;
    }

    const purity = calcReceiptPure(receiptWeight, receiptStone, receiptTouch);

    console.log("📊 Calculated purity:", purity);

    const receiptEntryData = {
      itemName: selectedReceiptItem,
      weight: receiptW,
      stone: parseNum(receiptStone),
      touch: parseNum(receiptTouch),
      purity: purity,
    };

    console.log("📤 Sending to backend:", receiptEntryData);
    console.log("🌐 URL:", `${base_url}/receiptEntries`);

    try {
      const response = await fetch(`${base_url}/receiptEntries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(receiptEntryData),
      });

      console.log("📥 Response status:", response.status);

      const responseText = await response.text();
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedEntry = JSON.parse(responseText);
      console.log("✅ Saved successfully:", savedEntry);

      // Update stock in database
      try {
        const currentStock = Number(
          itemsStock[selectedReceiptItem]?.weight || 0,
        );
        const newWeight = Number((currentStock + receiptW).toFixed(3));

        const stockResponse = await fetch(
          `${base_url}/stockMaster/${itemsStock[selectedReceiptItem]?._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemName: selectedReceiptItem,
              weight: newWeight,
              less: 0, // Assuming less remains the same, adjust if needed
              netWeight: newWeight, // Assuming netWeight = weight - less
              calculation: 0, // Adjust based on your schema
              pure: 0, // Adjust based on your schema
            }),
          },
        );

        if (!stockResponse.ok) {
          console.error("Failed to update stock in database");
        } else {
          console.log("✅ Stock updated in database");
        }
      } catch (stockError) {
        console.error("Error updating stock:", stockError);
      }

      // ➕ Increase item stock locally
      setItemsStock((prev) => ({
        ...prev,
        [selectedReceiptItem]: {
          ...prev[selectedReceiptItem],
          weight: (
            Number(prev[selectedReceiptItem]?.weight || 0) + receiptW
          ).toFixed(3),
        },
      }));

      // Add to receipt items
      setReceiptItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          item: selectedReceiptItem,
          weight: Number(receiptW.toFixed(3)),
          stone: Number(parseNum(receiptStone).toFixed(3)),
          touch: Number(parseNum(receiptTouch).toFixed(3)),
          purity,
          type: "receipt",
        },
      ]);

      // Clear inputs
      setReceiptWeight("");
      setReceiptStone("0");
      setReceiptTouch("");
      setSelectedReceiptItem(null);
      setReceiptItemSearch("");

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const addCashEntry = async () => {
    console.log("🟢 addCashEntry called");

    const r = rupees || "0";
    const rate = goldRate || "0";

    if (parseNum(r) <= 0) {
      Alert.alert("Invalid Amount", "Please enter rupees greater than 0");
      return;
    }

    if (parseNum(rate) <= 0) {
      Alert.alert(
        "Invalid Rate",
        "Please enter a valid gold rate greater than 0",
      );
      return;
    }

    const pure = computeCashPure(r, rate);

    console.log("📊 Computed Pure:", pure);

    const cashEntryData = {
      rupees: parseNum(r),
      goldrate: parseNum(rate), // <<< IMPORTANT FIX
      pure,
    };

    console.log("📤 Sending to backend:", cashEntryData);
    console.log("🌐 URL:", `${base_url}/cashReceived`);

    try {
      const response = await fetch(`${base_url}/cashReceived`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cashEntryData),
      });

      const responseText = await response.text();
      console.log("📥 Response status:", response.status);
      console.log("📥 Response body:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const savedEntry = JSON.parse(responseText);
      console.log("✅ Cash entry saved:", savedEntry);

      setCashTable((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          rupees: Number(parseNum(r).toFixed(2)),
          goldRate: Number(parseNum(rate).toFixed(2)),
          pure,
        },
      ]);

      setRupees("");
      setCashPureInput("0.000");

      // Success message removed as per user request
    } catch (error) {
      console.error("❌ Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message}`);
    }
  };

  const removeIssueItem = (id) => {
    const itemToRemove = issueItems.find((item) => item.id === id);
    if (itemToRemove) {
      // ➕ Add back the weight to stock
      setItemsStock((prev) => ({
        ...prev,
        [itemToRemove.item]: {
          ...prev[itemToRemove.item],
          weight: Number(
            (
              (prev[itemToRemove.item]?.weight || 0) + itemToRemove.weight
            ).toFixed(3),
          ),
        },
      }));
    }
    setIssueItems((prev) => prev.filter((p) => p.id !== id));
  };

  const removeReceiptItem = (id) => {
    const itemToRemove = receiptItems.find((item) => item.id === id);
    if (itemToRemove) {
      // 🔻 Subtract the weight from stock
      setItemsStock((prev) => ({
        ...prev,
        [itemToRemove.item]: {
          ...prev[itemToRemove.item],
          weight: Number(
            (
              (prev[itemToRemove.item]?.weight || 0) - itemToRemove.weight
            ).toFixed(3),
          ),
        },
      }));
    }
    setReceiptItems((prev) => prev.filter((p) => p.id !== id));
  };

  const removeCashEntry = (id) => {
    setCashTable((prev) => prev.filter((p) => p.id !== id));
  };

  let oldBalance = selectedCustomer ? Number(parseNum(selectedCustomer.ob)) : 0;

  let advBalance = selectedCustomer ? Number(parseNum(selectedCustomer.ab)) : 0;

  // Convert negative old balance to advance balance
  if (oldBalance < 0) {
    advBalance += Math.abs(oldBalance);
    oldBalance = 0;
  }

  const gstPureValue = gstEnabled
    ? (totalIssuePure * (parseFloat(gstPercentage) || 0)) / 100
    : 0;

  const balance = Number(
    (
      oldBalance +
      totalIssuePure +
      gstPureValue -
      (totalReceiptPure + totalCashPure)
    ).toFixed(3),
  );

  // Save stock to AsyncStorage
  const saveStock = async () => {
    try {
      await AsyncStorage.setItem("STOCK_MASTER", JSON.stringify(itemsStock));
    } catch (error) {
      console.error("Error saving stock:", error);
    }
  };

  // Combined products for product table (issue + receipt)
  const productList = [
    ...issueItems.map((it) => ({ ...it, kind: "Issue" })),
    ...receiptItems.map((it) => ({ ...it, kind: "Receipt" })),
  ];

  // Reverse-mapped master source:
  // - Issue table dropdown -> receipt-type items only
  // - Receipt table dropdown -> issue-type items only
  // Items marked as both types are excluded to keep both lists strictly separated.
  const getReverseMappedItems = (searchText = "", targetTable = "issue") =>
    itemsList.filter((it) => {
      const nameMatch = String(it.itemName || "")
        .toLowerCase()
        .includes(String(searchText).toLowerCase());
      if (!nameMatch) return false;

      const isIssueType =
        it.issue === true || String(it.type || "").toLowerCase() === "issue";
      const isReceiptType =
        it.receipt === true || String(it.type || "").toLowerCase() === "receipt";

      // Strict separation: avoid showing the same item in both dropdowns.
      if (isIssueType && isReceiptType) return false;

      if (targetTable === "issue") {
        // Issue table should show Receipt-type items (reverse mapping).
        return isReceiptType;
      }

      // Receipt table should show Issue-type items (reverse mapping).
      return isIssueType;
    });

  const calculateReport = () => {
    const totalIssue = issueItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0,
    );
    const totalIssuePure = issueItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0,
    );
    const totalReceipt = receiptItems.reduce(
      (acc, it) => acc + Number(it.weight || 0),
      0,
    );
    const totalReceiptPure = receiptItems.reduce(
      (acc, it) => acc + Number(it.purity || 0),
      0,
    );
    const cash = cashTable.reduce((sum, c) => sum + Number(c.rupees || 0), 0);
    const cashPure = cashTable.reduce((sum, c) => sum + Number(c.pure || 0), 0);

    return {
      totalIssue: totalIssue.toFixed(3),
      totalIssuePure: totalIssuePure.toFixed(3),
      totalReceipt: totalReceipt.toFixed(3),
      totalReceiptPure: totalReceiptPure.toFixed(3),
      cash: cash.toFixed(2),
      cashPure: cashPure.toFixed(3),
    };
  };

  const formatTransactions = () => {
    const txns = [];

    // Issue transactions
    issueItems.forEach((item) => {
      txns.push({
        date,
        issue: item.weight.toFixed(3),
        issuePure: item.purity.toFixed(3),
        receipt: "0.000",
        receiptPure: "0.000",
        cashPure: "0.000",
      });
    });

    // Receipt transactions
    receiptItems.forEach((item) => {
      txns.push({
        date,
        issue: "0.000",
        issuePure: "0.000",
        receipt: item.weight.toFixed(3),
        receiptPure: item.purity.toFixed(3),
        cashPure: "0.000",
      });
    });

    // Cash transactions
    cashTable.forEach((cash) => {
      txns.push({
        date,
        issue: "0.000",
        issuePure: "0.000",
        receipt: "0.000",
        receiptPure: "0.000",
        cashPure: cash.pure.toFixed(3),
      });
    });

    return txns;
  };

  const saveCompleteTransaction = async () => {
    console.log("💾 saveCompleteTransaction called");

    if (!selectedCustomer) {
      Alert.alert("Error", "Please select a customer first");
      return;
    }

    if (
      issueItems.length === 0 &&
      receiptItems.length === 0 &&
      cashTable.length === 0
    ) {
      Alert.alert("Error", "No items added to transaction");
      return;
    }

    // ✅ FIX 1: Remove - advBalance from formula
    const finalDistinctBalance = Number(
      (
        oldBalance +
        totalIssuePure +
        (gstEnabled ? gstPureValue : 0) -
        totalReceiptPure -
        totalCashPure
      )
        // ✅ NO - advBalance here
        .toFixed(3),
    );

    const customerType = String(selectedCustomer.customerType || "DEALER").toUpperCase();
    const normalizedCustomerType = customerType;
    const isDealerOrSupplier =
      normalizedCustomerType === "DEALER" || normalizedCustomerType === "SUPPLIER";

    // ✅ FIX: Prioritize numeric customerId for B2B/B2C, use ObjectId for Dealer/Supplier
    const customerRecordId = isDealerOrSupplier
      ? (selectedCustomer.id || selectedCustomer._id || selectedCustomer.customerId)
      : (selectedCustomer.customerId || selectedCustomer.id || selectedCustomer._id);

    console.log("👤 Selected Customer Object:", JSON.stringify(selectedCustomer, null, 2));
    console.log("🆔 Resolved customerRecordId:", customerRecordId, "| isDealerOrSupplier:", isDealerOrSupplier);

    if (!customerRecordId) {
      Alert.alert("Error", "Customer ID not found for this transaction");
      return;
    }

    const normalizeImageForStorage = async (img) => {
      if (!img) return "";
      if (img.startsWith("data:image")) return img;
      if (img.startsWith("http://") || img.startsWith("https://")) return img;
      if (img.startsWith("file://") || img.startsWith("content://") || img.startsWith("ph://")) {
        try {
          const base64 = await FileSystem.readAsStringAsync(img, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return `data:image/jpeg;base64,${base64}`;
        } catch (e) {
          console.error("Failed to convert local image URI to base64:", e);
          return "";
        }
      }
      return img;
    };

    const dealerProofImage = isDealerOrSupplier
      ? await normalizeImageForStorage(proofImage || selectedCustomer.image || "")
      : "";
    const persistedDealerImage = isDealerOrSupplier
      ? (
        dealerProofImage ||
        String(route.params?.editTransaction?.receiptImage || "").trim() ||
        String(route.params?.editTransaction?.proofImage || "").trim() ||
        String(route.params?.editTransaction?.image || "").trim() ||
        String(selectedCustomer?.receiptImage || "").trim() ||
        String(selectedCustomer?.proofImage || "").trim() ||
        String(selectedCustomer?.image || "").trim() ||
        ""
      )
      : "";

    // 🔍 Debug: log image save details
    console.log("🖼️ proofImage state length:", proofImage?.length || 0);
    console.log("🖼️ selectedCustomer.image length:", selectedCustomer?.image?.length || 0);
    console.log("🖼️ dealerProofImage resolved length:", dealerProofImage?.length || 0);
    console.log("🖼️ isDealerOrSupplier:", isDealerOrSupplier, "| customerType:", customerType);
    if (dealerProofImage) {
      console.log("✅ Image WILL be saved - first 80 chars:", dealerProofImage.substring(0, 80));
    } else {
      console.log("❌ No image to save — proofImage is empty");
    }
    const normalizedTxType = normalizedCustomerType;

    const transactionData = {
      customerName: selectedCustomer.name,
      customerId: customerRecordId,
      customerType: normalizedTxType,
      type: normalizedTxType,
      dealerType: normalizedCustomerType,
      receiptImage: persistedDealerImage || null,
      proofImage: persistedDealerImage || null,
      image: persistedDealerImage || null,
      receiptImageShowInBill: showProofImageInBill,
      issueTotal: Number(totalIssueWeight.toFixed(3)),
      issuePure: Number(totalIssuePure.toFixed(3)),
      oldBalance: Number(oldBalance.toFixed(3)),
      receiptPure: Number(totalReceiptPure.toFixed(3)),
      cashPure: Number(totalCashPure.toFixed(3)),
      balance: finalDistinctBalance,
      advBal: Number(advBalance.toFixed(3)),
    };

    console.log("📤 Sending /transactions POST Payload:", JSON.stringify(transactionData, null, 2));

    try {
      const editBill = route.params?.editTransaction;
      const isEditMode = Boolean(editBill?._id);
      let savedTransaction = null;
      let transactionUpdated = false;

      if (isEditMode && /^[0-9a-fA-F]{24}$/.test(String(editBill?._id || ""))) {
        const txUpdateRes = await fetch(`${base_url}/transactions/${editBill._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
        if (txUpdateRes.ok) {
          savedTransaction = await txUpdateRes.json();
          transactionUpdated = true;
          console.log("✅ Transaction updated:", savedTransaction);
        } else {
          const txUpdateErr = await txUpdateRes.text();
          console.warn("Transaction update skipped:", txUpdateErr);
        }
      }

      if (!transactionUpdated) {
        const response = await fetch(`${base_url}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        savedTransaction = await response.json();
        console.log("✅ Transaction saved:", savedTransaction);
      }

      let updateEndpoint;
      if (normalizedCustomerType === "B2C") {
        updateEndpoint = `${base_url}/customersB2C/${customerRecordId}`;
      } else if (isDealerOrSupplier) {
        updateEndpoint = `${base_url}/customersDealer/${customerRecordId}`;
      } else {
        updateEndpoint = `${base_url}/customers/${customerRecordId}`;
      }

      // Calculate updated balances to save back to master record
      const currentNet = oldBalance - advBalance;
      const newNet = Number(
        (
          currentNet +
          totalIssuePure +
          (gstEnabled ? gstPureValue : 0) -
          totalReceiptPure -
          totalCashPure
        ).toFixed(3),
      );

      let final_OB = 0;
      let final_AB = 0;

      if (newNet >= 0) {
        final_OB = newNet;
        final_AB = 0;
      } else {
        final_OB = 0;
        final_AB = Math.abs(newNet);
      }

      let customerUpdateRes = await fetch(updateEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billCurrentBalance: newNet,
          oldBalance: final_OB.toFixed(3),
          advanceBalance: final_AB.toFixed(3),
          ...(persistedDealerImage ? { receiptImage: persistedDealerImage } : {}),
          ...(persistedDealerImage ? { image: persistedDealerImage } : {}),
          ...(persistedDealerImage ? { proofImage: persistedDealerImage } : {}),
          receiptImageShowInBill: showProofImageInBill,
          ...(gstEnabled && {
            gstin: selectedCustomer.gst || "",
            gstPercentage: gstPercentage,
            gstAmount: gstAmount,
            sgst: isSgstEnabled ? sgst : "0",
            cgst: isCgstEnabled ? cgst : "0",
            igst: isIgstEnabled ? igst : "0",
          }),
        }),
      });

      if (!customerUpdateRes.ok && isDealerOrSupplier) {
        // Fallback: resolve dealer by name and retry update with actual Mongo _id.
        try {
          const dealerListRes = await fetch(`${base_url}/customersDealer`);
          if (dealerListRes.ok) {
            const dealerRows = await dealerListRes.json();
            const nameKey = String(selectedCustomer.name || "").trim().toLowerCase();
            const matchedDealer = (Array.isArray(dealerRows) ? dealerRows : []).find(
              (row) => String(row?.customerName || "").trim().toLowerCase() === nameKey,
            );
            const fallbackDealerId = matchedDealer?._id || matchedDealer?.id || "";
            if (fallbackDealerId) {
              customerUpdateRes = await fetch(`${base_url}/customersDealer/${fallbackDealerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  billCurrentBalance: newNet,
                  oldBalance: final_OB.toFixed(3),
                  advanceBalance: final_AB.toFixed(3),
                  ...(persistedDealerImage ? { receiptImage: persistedDealerImage } : {}),
                  ...(persistedDealerImage ? { image: persistedDealerImage } : {}),
                  ...(persistedDealerImage ? { proofImage: persistedDealerImage } : {}),
                  receiptImageShowInBill: showProofImageInBill,
                  ...(gstEnabled && {
                    gstin: selectedCustomer.gst || "",
                    gstPercentage: gstPercentage,
                    gstAmount: gstAmount,
                    sgst: isSgstEnabled ? sgst : "0",
                    cgst: isCgstEnabled ? cgst : "0",
                    igst: isIgstEnabled ? igst : "0",
                  }),
                }),
              });
            }
          }
        } catch (retryErr) {
          console.warn("Dealer balance update retry failed:", retryErr?.message || retryErr);
        }
      }

      if (!customerUpdateRes.ok) {
        throw new Error("Failed to update customer balance in master.");
      }

      // Dealer transactions are stored as B2B in billSummary (schema constraint)
      const billStorageType =
        (normalizedCustomerType === "DEALER" || normalizedCustomerType === "SUPPLIER")
          ? "B2B"
          : normalizedCustomerType;

      const billSummaryData = {
        customerId: customerRecordId,
        customerName: selectedCustomer.name,
        customerType: normalizedCustomerType,
        dealerType: normalizedCustomerType,        // preserve Dealer/Supplier label
        billType: billStorageType,       // redundant but explicit
        date: (date && typeof date === 'string' && !date.toLowerCase().includes('invalid')) ? date.split("/").reverse().join("-") : new Date().toISOString().split('T')[0],
        ob: Number(oldBalance.toFixed(3)),
        issuePure: Number(totalIssuePure.toFixed(3)),
        receiptPure: Number(totalReceiptPure.toFixed(3)),
        cashPure: Number(totalCashPure.toFixed(3)),
        gstPure: Number((gstEnabled ? gstPureValue : 0).toFixed(3)),
        advBal: Number(advBalance.toFixed(3)),
        currentBalance: newNet,
        receiptImage: persistedDealerImage || null,
        proofImage: persistedDealerImage || null,
        image: persistedDealerImage || null,
        receiptImageShowInBill: showProofImageInBill,
        issueItems: issueItems.map((item) => ({
          name: item.item,
          gross: fmt(item.weight),
          m: fmt(item.stone),
          net: fmt(item.weight - item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
        })),
        receiptItems: receiptItems.map((item) => ({
          name: item.item,
          weight: fmt(item.weight),
          result: fmt(item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
        })),
        cashTable: cashTable,
        gst: gstEnabled
          ? {
            enabled: true,
            percentage: (
              (isSgstEnabled ? parseFloat(sgst) || 0 : 0) +
              (isCgstEnabled ? parseFloat(cgst) || 0 : 0) +
              (isIgstEnabled ? parseFloat(igst) || 0 : 0)
            ).toString(),
            amount: gstAmount,
            sgst: isSgstEnabled ? sgst : "0",
            cgst: isCgstEnabled ? cgst : "0",
            igst: isIgstEnabled ? igst : "0",
          }
          : null,
      };

      console.log("📤 Sending /billSummary POST Payload:", JSON.stringify(billSummaryData, null, 2));

      // Use POST upsert semantics always; on edit, preserve valid billNo to update same bill.
      const billEndpoint = `${base_url}/billSummary`;
      const billMethod = "POST";

      if (isEditMode) {
        const existingBillNo = normalizeBillNo(editBill.billNo || editBill.invoiceNo || "");
        if (existingBillNo) {
          billSummaryData.billNo = existingBillNo;
          billSummaryData.invoiceNo = existingBillNo;
        }
      }

      const billRes = await fetch(billEndpoint, {
        method: billMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billSummaryData),
      });

      if (!billRes.ok) {
        const billErrText = await billRes.text(); // ← reveals actual server error
        throw new Error(`Failed to save full bill summary: ${billErrText}`);
      }
      const savedBillSummary = await billRes.json();
      const generatedBillNo = savedBillSummary?.billNo || savedBillSummary?.invoiceNo || "N/A";

      console.log("✅ Entire bill saved successfully");

      navigation.navigate("BillPreview", {
        customer: {
          name: selectedCustomer.name,
          id: customerRecordId,
          customerId: customerRecordId,
          customerType: normalizedCustomerType,
          billNo: generatedBillNo,
          invoiceNo: generatedBillNo,
          phone:
            selectedCustomer.phone ||
            selectedCustomer.customerNumber ||
            selectedCustomer.phoneNumber ||
            "",
          type: customerType, // ✅ FIXED - was hardcoded "B2B"
          address: selectedCustomer.address || "",
          gstin: selectedCustomer.gst || "",
          date,
          oldBalance: fmt(oldBalance),
          advanceBalance: fmt(advBalance),
          image: persistedDealerImage || "",
          receiptImage: persistedDealerImage || "",
          proofImage: persistedDealerImage || "",
          receiptImageShowInBill: showProofImageInBill,
          transactionId: savedTransaction?._id || "",
          autoShare: true,
        },
        issueItems: issueItems.map((item) => ({
          name: item.item,
          gross: fmt(item.weight),
          m: fmt(item.stone),
          net: fmt(item.weight - item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
        })),
        receiptItems: receiptItems.map((item) => ({
          name: item.item,
          weight: fmt(item.weight),
          result: fmt(item.stone),
          calc: fmt(item.touch),
          pure: fmt(item.purity),
        })),
        cashTable: cashTable,
        gst: gstEnabled
          ? {
            enabled: gstEnabled,
            percentage: (
              (isSgstEnabled ? parseFloat(sgst) || 0 : 0) +
              (isCgstEnabled ? parseFloat(cgst) || 0 : 0) +
              (isIgstEnabled ? parseFloat(igst) || 0 : 0)
            ).toString(),
            amount: gstAmount,
            sgst: isSgstEnabled ? sgst : "0",
            cgst: isCgstEnabled ? cgst : "0",
            igst: isIgstEnabled ? igst : "0",
            showInBill: true,
          }
          : null,
        summary: {
          ob: fmt(oldBalance),
          issue: fmt(totalIssuePure),
          gstPure: fmt(gstPureValue),
          receipt: fmt(totalReceiptPure),
          cash: fmt(totalCashPure),
          current: fmt(newNet),
          obPlusIssue: fmt(oldBalance + totalIssuePure + gstPureValue),
          receiptPlusCash: fmt(totalReceiptPure + totalCashPure),
        },
        transactions: [
          {
            receiptImage: persistedDealerImage || null,
            proofImage: persistedDealerImage || null,
            image: persistedDealerImage || null,
            receiptImageShowInBill: showProofImageInBill,
            customerType: normalizedTxType,
            dealerType: normalizedCustomerType,
          },
        ],
      });
    } catch (error) {
      console.error("❌ Error saving transaction:", error);
      Alert.alert("Error", `Failed to save transaction: ${error.message}`);
    }
  };

  // -----------------------
  // UI rendering
  // -----------------------
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F7F7F7" }}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <CommonHeader
        title="Create Transaction"
        backgroundColor="#F7F7F7"
        titleColor="#000"
        statusBarStyle="dark-content"
        left={
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Icon name="arrow-left" size={32} color="#000" />
          </TouchableOpacity>
        }
        right={
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{ marginRight: 15 }}
            >
              <Icon name="home-outline" color="#000" size={30} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateCustomerMaster", { type: "Dealer" })
              }
            >
              <Feather name="user-plus" color="#000" size={30} />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 300 }}>

        {/* CUSTOMER CART */}
        {!selectedCustomer && !loadingCustomers && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="account-group" size={24} />
                <Text style={styles.sectionTitle}>Supplier / Dealer List</Text>
              </View>
              <TouchableOpacity onPress={handleRefresh}>
                <Icon name="refresh" color="#000" size={30} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                placeholder="Customers Name and Phone No...."
                style={styles.searchBox}
                value={cartSearch}
                onChangeText={setCartSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 200 }}>
              {!cartSearch && recentNames.length > 0 && (
                <View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#888",
                      marginBottom: 10,
                      marginLeft: 5,
                      fontWeight: "bold",
                    }}
                  >
                    RECENT TRANSACTIONS
                  </Text>
                  {customers
                    .filter(
                      (c) =>
                        recentNames.includes(c.name) &&
                        String(c.customerType || "").toUpperCase() === "DEALER",
                    )
                    .map((cust, index) =>
                      renderDealerCard(cust, `recent-${cust.id || index}`, true),
                    )}
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#888",
                      marginVertical: 10,
                      marginLeft: 5,
                      fontWeight: "bold",
                    }}
                  >
                    ALL CUSTOMERS
                  </Text>
                </View>
              )}
              {filteredCartCustomers.length > 0 ? (
                filteredCartCustomers.map((cust, index) =>
                  renderDealerCard(cust, cust.id || index, false),
                )
              ) : (
                <Text style={styles.infoText}>No customers found</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* CUSTOMER INFO */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="account-circle" size={24} />
                <Text style={styles.sectionTitle}>Customer Info</Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setSelectedCustomer(null);
                  setSearch("");
                  setPhone("");
                  setProofImage("");
                  setCartSearch("");
                }}
              >
                <Icon name="account-switch" size={20} color="#1E88E5" />
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.customerInfoRow}>
              <View style={styles.customerDetails}>
                <Text style={styles.infoText}>Name : {selectedCustomer.name}</Text>
                <Text style={styles.infoText}>
                  Phone: {selectedCustomer.phone}
                </Text>
              </View>

              <View style={styles.balanceContainer}>
                <Text style={styles.balanceText}>Old: {fmt(oldBalance)}g</Text>
                <Text style={styles.balanceText}>Adv: {fmt(advBalance)}g</Text>
              </View>
            </View>
          </View>
        )}

        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.issueHeader}>
              <View style={[styles.greenDot, { backgroundColor: "#0aa76a" }]} />
              <Text style={styles.sectionTitle}>Receipt Entry</Text>
              <View style={styles.cartContainer}>
                <Icon name="cart" size={24} color="#000" />
                <Text style={styles.cartText}>
                  {totalReceiptPure.toFixed(3)}g
                </Text>
                {receiptItems.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{receiptItems.length}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* SEARCH BOX */}
            <TextInput
              placeholder="Search items..."
              style={styles.searchBox}
              value={receiptItemSearch}
              onChangeText={(text) => {
                setReceiptItemSearch(text);
                setReceiptItemDropdownOpen(true);
              }}
              onFocus={() => setReceiptItemDropdownOpen(true)}
              onBlur={() =>
                setTimeout(() => setReceiptItemDropdownOpen(false), 200)
              }
            />

            {receiptItemDropdownOpen && !loadingItems && (
              <View style={styles.dropdownFloating}>
                {itemsList.length > 0 ? (
                  getReverseMappedItems(receiptItemSearch, "receipt")
                    .map((it, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.listItem,
                          styles.dropdownItemContentReceipt,
                        ]}
                        onPress={() => {
                          setSelectedReceiptItem(it.itemName);
                          setReceiptItemDropdownOpen(false);
                          setReceiptItemSearch(it.itemName);
                          setReceiptStone(it.buyingTouch?.toString() || ""); // Buying Touch -> Result
                          setReceiptTouch(it.sellingTouch?.toString() || ""); // Auto-fill touch
                        }}
                      >
                        <Text style={styles.dropdownItemTextReceipt}>
                          {it.itemName}
                        </Text>
                        <Text style={styles.dropdownItemWeightReceipt}>
                          Weight: {itemsStock[it.itemName]?.weight || 0} g
                        </Text>
                      </TouchableOpacity>
                    ))
                ) : (
                  <Text style={styles.infoText}>No items in stock master</Text>
                )}
              </View>
            )}

            {/* INPUTS */}
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Weight (g)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptWeight}
                  onChangeText={setReceiptWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Result (g)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptStone}
                  onChangeText={setReceiptStone}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Touch (%)</Text>
                <TextInput
                  style={styles.input}
                  value={receiptTouch}
                  onChangeText={setReceiptTouch}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Pure</Text>
                <View style={styles.purityBox}>
                  <Text style={styles.purityText}>
                    {fmt(
                      calcReceiptPure(
                        receiptWeight || 0,
                        receiptStone || 0,
                        receiptTouch || 0,
                      ),
                    )}{" "}
                    g
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#C9F8D0" }]}
              onPress={addReceiptItem}
            >
              <Text style={[styles.addBtnText, { color: "#135F25" }]}>
                + Add Receipt Item
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECEIPT TABLE */}
        {receiptItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Receipt Entry Table</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.productTable}>
                <View style={styles.productTableHeader}>
                  <Text style={styles.productHeaderCell}>#</Text>
                  <Text style={styles.productHeaderCell}>Kind</Text>
                  <Text style={styles.productHeaderCell}>Item</Text>
                  <Text style={styles.productHeaderCell}>Weight (g)</Text>
                  <Text style={styles.productHeaderCell}>Stone (g)</Text>
                  <Text style={styles.productHeaderCell}>Touch (%)</Text>
                  <Text style={styles.productHeaderCell}>Pure (g)</Text>
                  <Text style={styles.productHeaderCell}>Action</Text>
                </View>

                {receiptItems.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <Text style={styles.productCell}>{idx + 1}</Text>
                    <Text style={styles.productCell}>Receipt</Text>
                    <Text style={styles.productCell}>{row.item}</Text>
                    <Text style={styles.productCell}>
                      {Number(row.weight).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.stone).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.touch).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.purity).toFixed(3)}
                    </Text>
                    <TouchableOpacity onPress={() => removeReceiptItem(row.id)}>
                      <Text style={[styles.actionText, { color: "#d9534f" }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}


        {/* ISSUE ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.issueHeader}>
              <View style={styles.greenDot} />
              <Text style={styles.sectionTitle}>Issue Entry</Text>
              <View style={styles.cartContainer}>
                <Icon name="cart" size={24} color="#000" />
                <Text style={styles.cartText}>
                  {totalIssuePure.toFixed(3)}g
                </Text>
                {issueItems.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{issueItems.length}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* SEARCH BOX */}
            <TextInput
              placeholder="Search items..."
              style={styles.searchBox}
              value={issueItemSearch}
              onChangeText={(text) => {
                setIssueItemSearch(text);
                setIssueItemDropdownOpen(true);
              }}
              onFocus={() => setIssueItemDropdownOpen(true)}
              onBlur={() =>
                setTimeout(() => setIssueItemDropdownOpen(false), 200)
              }
            />

            {issueItemDropdownOpen && !loadingItems && (
              <View style={styles.dropdownFloating}>
                {itemsList.length > 0 ? (
                  getReverseMappedItems(issueItemSearch, "issue")
                    .map((it, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.listItem,
                          styles.dropdownItemContentIssue,
                        ]}
                        onPress={() => {
                          setSelectedIssueItem(it.itemName);
                          setIssueItemDropdownOpen(false);
                          setIssueItemSearch(it.itemName);
                          setTouch(it.sellingTouch?.toString() || ""); // Auto-fill touch
                        }}
                      >
                        <Text style={styles.dropdownItemTextIssue}>
                          {it.itemName}
                        </Text>
                        <Text style={styles.dropdownItemWeightIssue}>
                          Weight: {itemsStock[it.itemName]?.weight || 0} g
                        </Text>
                      </TouchableOpacity>
                    ))
                ) : (
                  <Text style={styles.infoText}>No items in stock master</Text>
                )}
              </View>
            )}

            {/* Inputs */}
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Weight (g)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Stone (g)</Text>
                <TextInput
                  style={styles.input}
                  value={stone}
                  onChangeText={setStone}
                  keyboardType="decimal-pad"
                  placeholder="0.000"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Touch (%)</Text>
                <TextInput
                  style={styles.input}
                  value={touch}
                  onChangeText={setTouch}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.subLabel}>Purity</Text>
                <View style={styles.purityBox}>
                  <Text style={styles.purityText}>
                    {fmt(calcIssuePure(weight || 0, stone || 0, touch || 0))} g
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={addIssueItem}>
              <Text style={styles.addBtnText}>+ Add New Item (Issue)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ISSUE TABLE */}
        {issueItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Issue Entry Table</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.productTable}>
                <View style={styles.productTableHeader}>
                  <Text style={styles.productHeaderCell}>#</Text>
                  <Text style={styles.productHeaderCell}>Kind</Text>
                  <Text style={styles.productHeaderCell}>Item</Text>
                  <Text style={styles.productHeaderCell}>Weight (g)</Text>
                  <Text style={styles.productHeaderCell}>Stone (g)</Text>
                  <Text style={styles.productHeaderCell}>Touch (%)</Text>
                  <Text style={styles.productHeaderCell}>Pure (g)</Text>
                  <Text style={styles.productHeaderCell}>Action</Text>
                </View>

                {issueItems.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <Text style={styles.productCell}>{idx + 1}</Text>
                    <Text style={styles.productCell}>Issue</Text>
                    <Text style={styles.productCell}>{row.item}</Text>
                    <Text style={styles.productCell}>
                      {Number(row.weight).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.stone).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.touch).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.purity).toFixed(3)}
                    </Text>
                    <TouchableOpacity onPress={() => removeIssueItem(row.id)}>
                      <Text style={[styles.actionText, { color: "#d9534f" }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}




        {/* RECEIPT ENTRY */}


        {/* PRODUCT LIST (combined) */}
        {productList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Products (Combined)</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.productTable}>
                <View style={styles.productTableHeader}>
                  <Text style={styles.productHeaderCell}>#</Text>
                  <Text style={styles.productHeaderCell}>Kind</Text>
                  <Text style={styles.productHeaderCell}>Item</Text>
                  <Text style={styles.productHeaderCell}>Weight (g)</Text>
                  <Text style={styles.productHeaderCell}>Stone (g)</Text>
                  <Text style={styles.productHeaderCell}>Touch (%)</Text>
                  <Text style={styles.productHeaderCell}>Pure (g)</Text>
                </View>

                {productList.map((row, idx) => (
                  <View key={row.id} style={styles.productTableRow}>
                    <Text style={styles.productCell}>{idx + 1}</Text>
                    <Text style={styles.productCell}>{row.kind}</Text>
                    <Text style={styles.productCell}>{row.item}</Text>
                    <Text style={styles.productCell}>
                      {Number(row.weight).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.stone).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.touch).toFixed(3)}
                    </Text>
                    <Text style={styles.productCell}>
                      {Number(row.purity).toFixed(3)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* CASH ENTRY */}
        {selectedCustomer && (
          <View style={styles.card}>
            <View style={styles.issueHeader}>
              <View style={[styles.greenDot, { backgroundColor: "#1e88e5" }]} />
              <Text style={styles.sectionTitle}>Cash Received</Text>
              <View style={styles.cartContainer}>
                <Icon name="cart" size={24} color="#000" />
                <Text style={styles.cartText}>{totalCashPure.toFixed(3)}g</Text>
                {cashTable.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cashTable.length}</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.subLabel}>Rupees ₹</Text>
            <TextInput
              style={styles.input}
              value={rupees}
              onChangeText={(val) => {
                setRupees(val);
                setCashPureInput(fmt(computeCashPure(val, goldRate || 0)));
              }}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <Text style={[styles.subLabel, { marginTop: 12 }]}>FT Rate ₹</Text>
            <TextInput
              style={styles.input}
              value={goldRate}
              onChangeText={async (val) => {
                setGoldRate(val);
                setCashPureInput(fmt(computeCashPure(rupees || 0, val)));
                await AsyncStorage.setItem("ftRate", val);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Pure (g)</Text>
            <View style={styles.purityBox}>
              <Text style={styles.purityText}>{cashPureInput} g</Text>
            </View>

            <TouchableOpacity style={styles.addBtn2} onPress={addCashEntry}>
              <Text style={styles.addBtnText2}>Add Cash</Text>
            </TouchableOpacity>
          </View>
        )}

        {["DEALER", "SUPPLIER"].includes(
          String(selectedCustomer?.customerType || "").toUpperCase(),
        ) && (
            <View style={styles.card}>
              <View style={styles.issueHeader}>
                <View style={[styles.greenDot, { backgroundColor: "#8E24AA" }]} />
                <Text style={styles.sectionTitle}>Receipt / Proof Image</Text>
              </View>
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setShowProofImageInBill((prev) => !prev)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      showProofImageInBill && styles.checkboxChecked,
                    ]}
                  >
                    {showProofImageInBill ? (
                      <Icon name="check" size={16} color="#fff" />
                    ) : null}
                  </View>
                  <Text style={styles.checkboxLabel}>Show image in printed bill</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.proofUploadBox}
                onPress={openProofImagePicker}
                activeOpacity={0.8}
              >
                {proofImage ? (
                  <Image source={{ uri: proofImage }} style={styles.proofPreviewLarge} />
                ) : (
                  <View style={styles.proofPlaceholder}>
                    <Icon name="image-plus" size={44} color="#90A4AE" />
                    <Text style={styles.proofPlaceholderText}>Tap to upload from Camera / Gallery</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.proofButtonRow}>
                <TouchableOpacity
                  style={styles.proofBtn}
                  onPress={openProofImagePicker}
                >
                  <Icon name="camera-plus-outline" size={18} color="#fff" />
                  <Text style={styles.proofBtnText}>Camera / Gallery</Text>
                </TouchableOpacity>
                {proofImage ? (
                  <TouchableOpacity
                    style={[styles.proofBtn, styles.proofRemoveBtn]}
                    onPress={() => setProofImage("")}
                  >
                    <Icon name="close" size={18} color="#fff" />
                    <Text style={styles.proofBtnText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

        {/* CASH TABLE */}
        {cashTable.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cash Received Table</Text>

            <View style={styles.secondTableHeader}>
              <Text style={styles.secondTableHeaderText}>Rupees</Text>
              <Text style={styles.secondTableHeaderText}>FT Rate</Text>
              <Text style={styles.secondTableHeaderText}>Pure</Text>
              <Text style={styles.secondTableHeaderText}>Action</Text>
            </View>

            {cashTable.map((row, idx) => (
              <View key={row.id} style={styles.secondTableRow}>
                <Text style={styles.secondTableCell}>{fmt2(row.rupees)}</Text>
                <Text style={styles.secondTableCell}>{fmt2(row.goldRate)}</Text>
                <Text style={styles.secondTableCell}>{fmt(row.pure)}</Text>
                <TouchableOpacity onPress={() => removeCashEntry(row.id)}>
                  <Text style={[styles.actionText, { color: "#d9534f" }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {/* Saved GST Selection Modal */}
        {showSavedGstModal && (
          <Modal
            visible={showSavedGstModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowSavedGstModal(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 20,
                  maxHeight: 500,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}
                >
                  Select a Saved GST Record
                </Text>

                <ScrollView>
                  {savedGstList.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: "#eee",
                        paddingVertical: 12,
                      }}
                      onPress={() => {
                        setSgst(item.sgst || "");
                        setCgst(item.cgst || "");
                        setIgst(item.igst || "");

                        setShowSavedGstModal(false);
                      }}
                    >
                      <Text style={{ fontWeight: "bold" }}>
                        {item.type} - HSN: {item.hsn}
                      </Text>
                      <View
                        style={{ flexDirection: "row", gap: 10, marginTop: 4 }}
                      >
                        <Text>SGST: {item.sgst || 0}%</Text>
                        <Text>CGST: {item.cgst || 0}%</Text>
                        <Text>IGST: {item.igst || 0}%</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {savedGstList.length === 0 && (
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#888",
                        marginVertical: 20,
                      }}
                    >
                      No saved records found.
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={{ marginTop: 20, alignSelf: "center", padding: 10 }}
                  onPress={() => setShowSavedGstModal(false)}
                >
                  <Text style={{ color: "red", fontWeight: "bold" }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* TRANSACTION SUMMARY (HORIZONTAL SCROLL) */}
        {selectedCustomer && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Transaction Summary</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryHeaderRow}>
                  <Text style={styles.summaryHeaderText}>Issue Total (g)</Text>
                  <Text style={styles.summaryHeaderText}>Issue Pure (g)</Text>
                  {gstEnabled && (
                    <Text style={styles.summaryHeaderText}>GST Pure (g)</Text>
                  )}
                  <Text style={styles.summaryHeaderText}>Old Balance (g)</Text>
                  <Text style={styles.summaryHeaderText}>Receipt Pure (g)</Text>
                  <Text style={styles.summaryHeaderText}>Cash Pure (g)</Text>
                  <Text style={styles.summaryHeaderText}>Balance (g)</Text>
                  <Text style={styles.summaryHeaderText}>Adv.Bal (g)</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryCell}>
                    {fmt(totalIssueWeight)}
                  </Text>
                  <Text style={styles.summaryCell}>{fmt(totalIssuePure)}</Text>
                  {gstEnabled && (
                    <Text style={styles.summaryCell}>{fmt(gstPureValue)}</Text>
                  )}
                  <Text style={styles.summaryCell}>{fmt(oldBalance)}</Text>
                  <Text style={styles.summaryCell}>
                    {fmt(totalReceiptPure)}
                  </Text>
                  <Text style={styles.summaryCell}>{fmt(totalCashPure)}</Text>
                  <Text style={styles.summaryCell}>{fmt(balance)}</Text>
                  <Text style={styles.summaryCell}>{fmt(advBalance)}</Text>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.addBtn2}
              onPress={saveCompleteTransaction}
            >
              <Text style={styles.addBtnText2}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownCard: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },
  dropdownCardSmall: {
    backgroundColor: "#fff",
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },
  dropdownText: {
    marginLeft: 10,
    fontSize: 16,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 18,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  dropdownFloating: {
    position: "absolute",
    top: 130,
    left: 18,
    right: 18,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 10,
    zIndex: 10000,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  greenDot: {
    width: 12,
    height: 12,
    backgroundColor: "green",
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 17,
    marginVertical: 2,
  },
  label: {
    marginTop: 10,
    fontSize: 15,
    color: "#555",
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#555",
  },
  greenValue: {
    fontSize: 20,
    color: "green",
    fontWeight: "700",
  },
  blackValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputBox: {
    width: "48%",
  },
  input: {
    backgroundColor: "#F4F4F4",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  purityBox: {
    backgroundColor: "#F4F4F4",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
  },
  purityText: {
    fontSize: 16,
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: "#C9F8D0",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  addBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#135F25",
  },
  addBtn2: {
    backgroundColor: "#13A857",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  addBtnText2: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  searchBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    color: "#000",
  },
  searchBtn: {
    backgroundColor: "#13A857",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listItem: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#F5F5F5",
    backgroundColor: "#fff",
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495E",
  },
  customerDataCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 15,
    padding: 12,
  },
  customerDataCardTouchable: {
    flex: 1,
  },
  customerDataCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerDataTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  customerDataAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  customerDataTag: {
    backgroundColor: "#222",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  customerDataTagText: {
    color: "#fff",
    fontSize: 12,
  },
  customerDataName: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  customerDataIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerDataSub: {
    color: "#666",
    marginTop: 4,
  },
  customerDataBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
  },
  customerDataBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    paddingRight: 12,
  },
  customerDataBalanceTitle: {
    color: "#000",
    fontSize: 14,
  },
  customerDataBalanceValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  customerDataLine: {
    width: 1,
    height: 40,
    backgroundColor: "#ddd",
    marginHorizontal: 12,
  },
  customerDataRightImageWrap: {
    width: 76,
    alignItems: "flex-end",
  },
  customerDataRightImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  customerDataRightImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  proofSection: {
    marginTop: 14,
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    padding: 10,
  },
  proofButtonRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  proofBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E88E5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  proofRemoveBtn: {
    backgroundColor: "#E53935",
  },
  proofBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  proofPreview: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    marginTop: 10,
  },
  proofUploadBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#FAFCFF",
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  proofPreviewLarge: {
    width: "100%",
    height: 150,
  },
  proofPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  proofPlaceholderText: {
    marginTop: 10,
    color: "#607D8B",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  dropdownItemContentIssue: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  dropdownItemTextIssue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    flex: 1,
  },
  dropdownItemWeightIssue: {
    fontSize: 13,
    color: "#1B5E20",
    fontWeight: "700",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dropdownItemContentReceipt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  dropdownItemTextReceipt: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    flex: 1,
  },
  dropdownItemWeightReceipt: {
    fontSize: 13,
    color: "#004D40",
    fontWeight: "700",
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  },
  secondTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E5E5",
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
  productTable: {
    width: 1260,
  },
  productTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#E9ECEF",
  },
  productHeaderCell: {
    width: 140,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 14,
    color: "#495057",
  },
  productTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  productCell: {
    width: 140,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryContainer: {
    width: 1000,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FFF7D1",
    paddingVertical: 12,
    borderRadius: 8,
  },
  summaryHeaderText: {
    width: 140,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#FFF8E6",
    paddingVertical: 12,
    borderRadius: 6,
  },
  summaryCell: {
    width: 140,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 3,
    marginTop: 5,
    maxHeight: 200,
  },
  customerInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerDetails: {
    flex: 1,
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  balanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7F8C8D",
    marginTop: 4,
  },
  cartContainer: {
    position: "relative",
    marginLeft: "auto",
  },
  cartText: {
    color: "gray",
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF5722",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: "#1E88E5",
    fontSize: 14,
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#1E88E5",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#1E88E5",
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});


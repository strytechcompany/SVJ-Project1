import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import Icon from "react-native-vector-icons/Feather";

export default function ReportScreen({ navigation }) {

  // ================= STATES =================
  const [fromDateObj, setFromDateObj] = useState(new Date(2026, 0, 10)); // Jan = 0
  const [toDateObj, setToDateObj] = useState(new Date(2026, 0, 12));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Individual search and filter states for each table
  const [b2bSearch, setB2bSearch] = useState("");
  const [b2cSearch, setB2cSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [cashSearch, setCashSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const [selectedB2bItem, setSelectedB2bItem] = useState("");
  const [selectedB2cItem, setSelectedB2cItem] = useState("");
  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState("");
  const [selectedReceiptItem, setSelectedReceiptItem] = useState("");
  const [selectedCashItem, setSelectedCashItem] = useState("");
  const [selectedStockItem, setSelectedStockItem] = useState("");

  const [showB2bDropdown, setShowB2bDropdown] = useState(false);
  const [showB2cDropdown, setShowB2cDropdown] = useState(false);
  const [showPurchaseDropdown, setShowPurchaseDropdown] = useState(false);
  const [showReceiptDropdown, setShowReceiptDropdown] = useState(false);
  const [showCashDropdown, setShowCashDropdown] = useState(false);
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  // ================= HELPER FUNCTION =================
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ================= UPDATE DATE TIME =================
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ================= SAMPLE DATA =================
  const reportData = {
    b2b: [
      { sno: 1, name: "Raju", item: "Stud", weight: 10.25, cash: 5000, pure: 9.87, date: "2026-01-10" },
      { sno: 2, name: "Kumar", item: "Ring", weight: 5.12, cash: 2500, pure: 4.87, date: "2026-01-11" },
      { sno: 3, name: "Vijay", item: "Chain", weight: 15.5, cash: 7500, pure: 14.75, date: "2026-01-12" },
      { sno: 4, name: "Suresh", item: "Bracelet", weight: 8.3, cash: 4000, pure: 7.95, date: "2026-01-13" },
      { sno: 5, name: "Rajesh", item: "Necklace", weight: 22.1, cash: 11000, pure: 21.05, date: "2026-01-14" },
      { sno: 6, name: "Mohan", item: "Earrings", weight: 3.2, cash: 1600, pure: 3.04, date: "2026-01-15" },
      { sno: 7, name: "Ravi", item: "Pendant", weight: 6.8, cash: 3400, pure: 6.52, date: "2026-01-16" },
      { sno: 8, name: "Amit", item: "Bangle", weight: 12.4, cash: 6200, pure: 11.88, date: "2026-01-17" },
      { sno: 9, name: "Deepak", item: "Brooch", weight: 4.5, cash: 2250, pure: 4.32, date: "2026-01-18" },
      { sno: 10, name: "Sunil", item: "Locket", weight: 9.7, cash: 4850, pure: 9.31, date: "2026-01-19" },
    ],
    b2c: [
      { sno: 1, name: "Arun", phone: "9876543210", item: "Chain", weight: 7.5, cash: 3000, date: "2026-01-12" },
      { sno: 2, name: "Priya", phone: "9876543211", item: "Ring", weight: 4.2, cash: 2100, date: "2026-01-13" },
      { sno: 3, name: "Kiran", phone: "9876543212", item: "Necklace", weight: 18.5, cash: 9250, date: "2026-01-14" },
      { sno: 4, name: "Sneha", phone: "9876543213", item: "Earrings", weight: 2.8, cash: 1400, date: "2026-01-15" },
      { sno: 5, name: "Rahul", phone: "9876543214", item: "Bracelet", weight: 9.1, cash: 4550, date: "2026-01-16" },
      { sno: 6, name: "Anita", phone: "9876543215", item: "Pendant", weight: 5.5, cash: 2750, date: "2026-01-17" },
      { sno: 7, name: "Vikram", phone: "9876543216", item: "Bangle", weight: 11.2, cash: 5600, date: "2026-01-18" },
      { sno: 8, name: "Meera", phone: "9876543217", item: "Brooch", weight: 3.9, cash: 1950, date: "2026-01-19" },
    ],
    purchase: [
      { item: "Gold Bar", from: "Supplier A", weight: 20, cash: 12000, pure: 19.5, date: "2026-01-10" },
      { item: "Silver Bar", from: "Supplier B", weight: 50, cash: 25000, pure: 49.5, date: "2026-01-11" },
      { item: "Platinum Bar", from: "Supplier C", weight: 10, cash: 8000, pure: 9.8, date: "2026-01-12" },
      { item: "Gold Coins", from: "Supplier A", weight: 15, cash: 9000, pure: 14.7, date: "2026-01-13" },
      { item: "Silver Coins", from: "Supplier B", weight: 25, cash: 12500, pure: 24.5, date: "2026-01-14" },
      { item: "Diamond", from: "Supplier D", weight: 5, cash: 50000, pure: 4.9, date: "2026-01-15" },
      { item: "Ruby", from: "Supplier E", weight: 3, cash: 30000, pure: 2.9, date: "2026-01-16" },
      { item: "Emerald", from: "Supplier F", weight: 4, cash: 40000, pure: 3.9, date: "2026-01-17" },
    ],
    receipt: [
      { item: "Gold", weight: 15, pure: 14.5, date: "2026-01-11" },
      { item: "Silver", weight: 30, pure: 29.5, date: "2026-01-12" },
      { item: "Platinum", weight: 8, pure: 7.8, date: "2026-01-13" },
      { item: "Diamond", weight: 3, pure: 2.9, date: "2026-01-14" },
      { item: "Ruby", weight: 2, pure: 1.9, date: "2026-01-15" },
      { item: "Emerald", weight: 4, pure: 3.9, date: "2026-01-16" },
      { item: "Sapphire", weight: 6, pure: 5.8, date: "2026-01-17" },
      { item: "Pearl", weight: 1.5, pure: 1.4, date: "2026-01-18" },
    ],
    cash: [
      { name: "Office", amount: 50000, pure: 0, date: "2026-01-12" },
      { name: "Shop", amount: 25000, pure: 0, date: "2026-01-13" },
      { name: "Warehouse", amount: 15000, pure: 0, date: "2026-01-14" },
      { name: "Branch", amount: 30000, pure: 0, date: "2026-01-15" },
      { name: "Online", amount: 10000, pure: 0, date: "2026-01-16" },
      { name: "Mobile", amount: 20000, pure: 0, date: "2026-01-17" },
      { name: "Retail", amount: 35000, pure: 0, date: "2026-01-18" },
      { name: "Wholesale", amount: 45000, pure: 0, date: "2026-01-19" },
    ],
    stock: [
      { name: "Stud", avail: 150.3 },
      { name: "Ring", avail: 340.1 },
      { name: "Chain", avail: 220.5 },
      { name: "Necklace", avail: 180.7 },
      { name: "Bracelet", avail: 95.2 },
      { name: "Earrings", avail: 120.8 },
      { name: "Pendant", avail: 75.4 },
      { name: "Bangle", avail: 200.1 },
      { name: "Gold Bar", avail: 500.0 },
      { name: "Silver Bar", avail: 800.3 },
      { name: "Platinum Bar", avail: 300.5 },
      { name: "Diamond", avail: 50.2 },
      { name: "Ruby", avail: 25.8 },
      { name: "Emerald", avail: 40.1 },
      { name: "Sapphire", avail: 35.7 },
      { name: "Pearl", avail: 15.4 },
    ],
  };

  // ================= DATE PICKER (FIXED) =================

  const onFromDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowFromPicker(false);
    }

    if (event.type === 'dismissed') return;

    if (selectedDate) {
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0); // Start of day
      setFromDateObj(d);
    }
  };

  const onToDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowToPicker(false);
    }

    if (event.type === 'dismissed') return;

    if (selectedDate) {
      const d = new Date(selectedDate);
      d.setHours(23, 59, 59, 999); // End of day
      setToDateObj(d);
    }
  };

  // ================= DATE FILTER =================
  const filterByDate = (list) => {
    return list.filter(item => {
      if (!item.date) return true;

      // Parse date manually to avoid timezone issues
      const [year, month, day] = item.date.split('-').map(Number);
      const itemDate = new Date(year, month - 1, day);
      itemDate.setHours(12, 0, 0, 0); // Set to noon to avoid edge cases

      const fromStart = new Date(fromDateObj);
      fromStart.setHours(0, 0, 0, 0);

      const toEnd = new Date(toDateObj);
      toEnd.setHours(23, 59, 59, 999);

      return itemDate >= fromStart && itemDate <= toEnd;
    });
  };

  // ================= PDF EXPORT =================
  const generatePDF = async () => {
    const allData = [
      ...reportData.b2b.map(i => ({ Type: "B2B", ...i })),
      ...reportData.b2c.map(i => ({ Type: "B2C", ...i })),
      ...reportData.purchase.map(i => ({ Type: "Purchase", ...i })),
      ...reportData.receipt.map(i => ({ Type: "Receipt", ...i })),
      ...reportData.cash.map(i => ({ Type: "Cash", ...i })),
    ];

    const rows = allData.map(item => `
      <tr>
        <td>${item.Type || ""}</td>
        <td>${item.name || item.from || ""}</td>
        <td>${item.item || ""}</td>
        <td>${item.weight || ""}</td>
        <td>${item.cash || item.amount || ""}</td>
        <td>${item.pure || ""}</td>
        <td>${item.date || ""}</td>
      </tr>
    `).join("");

    const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial; padding: 10px; }
        h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #000; padding: 6px; text-align: center; }
        th { background: #333; color: white; }
      </style>
    </head>
    <body>

    <h2>REPORT SUMMARY</h2>
    <p>From: ${formatDate(fromDateObj)} &nbsp;&nbsp; To: ${formatDate(toDateObj)}</p>

    <table>
      <tr>
        <th>Type</th>
        <th>Name / Supplier</th>
        <th>Item</th>
        <th>Weight</th>
        <th>Cash</th>
        <th>Pure</th>
        <th>Date</th>
      </tr>
      ${rows}
    </table>

    </body>
    </html>
    `;

    const file = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(file.uri);
  };

  // ================= MAIL EXPORT =================
  const sendMail = async () => {
    const file = await Print.printToFileAsync({ html: "<h1>Report</h1>" });
    await MailComposer.composeAsync({
      subject: "Report",
      body: "Report attached",
      attachments: [file.uri],
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="arrow-left" size={26} color="#fff" style={{ top: 20 }} />
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.dateTimeText}>
            {currentDateTime.toLocaleDateString()} {currentDateTime.toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.mailBtn} onPress={sendMail}>
            <Text style={{ color: "#fff" }}>Mail</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={generatePDF}>
            <Text style={{ color: "#fff" }}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container}>

        {/* DATE PICKER UI */}
        <View style={styles.dateCard}>
          <TouchableOpacity style={styles.dateBox} onPress={() => setShowFromPicker(true)}>
            <Text style={styles.dateTitle}>From Date</Text>
            <Text style={styles.dateValue}>{formatDate(fromDateObj)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateBox} onPress={() => setShowToPicker(true)}>
            <Text style={styles.dateTitle}>To Date</Text>
            <Text style={styles.dateValue}>{formatDate(toDateObj)}</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or item..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* TABS */}
        <View style={styles.tabRow}>
          {["B2B", "B2C", "Purchase", "Receipt", "Cash", "Stock", "All"].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.activeTabBtn]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={styles.tabText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= B2B TABLE ================= */}
        {(activeTab === "All" || activeTab === "B2B") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>B2B Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by name..."
                  value={b2bSearch}
                  onChangeText={setB2bSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowB2bDropdown(!showB2bDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showB2bDropdown && (
              <View style={styles.tableDropdown}>
                {[...new Set(reportData.b2b.map(item => item.item))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedB2bItem(item);
                      setShowB2bDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Cash</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date</Text>
                </View>

                {filterByDate(reportData.b2b)
                  .filter(r => r.name.toLowerCase().includes(b2bSearch.toLowerCase()) &&
                    (selectedB2bItem ? r.item === selectedB2bItem : true))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{r.sno}</Text>
                      <Text style={styles.tCell}>{r.name}</Text>
                      <Text style={styles.tCell}>{r.item}</Text>
                      <Text style={styles.tCell}>{r.weight}</Text>
                      <Text style={styles.tCell}>₹{r.cash}</Text>
                      <Text style={styles.tCell}>{r.pure}</Text>
                      <Text style={styles.tCell}>{r.date}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= B2C TABLE ================= */}
        {(activeTab === "All" || activeTab === "B2C") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>B2C Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by name or phone..."
                  value={b2cSearch}
                  onChangeText={setB2cSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowB2cDropdown(!showB2cDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showB2cDropdown && (
              <View style={styles.tableDropdown}>
                {[...new Set(reportData.b2c.map(item => item.item))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedB2cItem(item);
                      setShowB2cDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>S.No</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Phone</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Item</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Cash</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date</Text>
                </View>

                {filterByDate(reportData.b2c)
                  .filter(r => (r.name.toLowerCase().includes(b2cSearch.toLowerCase()) || r.phone.includes(b2cSearch)) &&
                    (selectedB2cItem ? r.item === selectedB2cItem : true))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{r.sno}</Text>
                      <Text style={styles.tCell}>{r.name}</Text>
                      <Text style={styles.tCell}>{r.phone}</Text>
                      <Text style={styles.tCell}>{r.item}</Text>
                      <Text style={styles.tCell}>{r.weight}</Text>
                      <Text style={styles.tCell}>₹{r.cash}</Text>
                      <Text style={styles.tCell}>{r.date}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= PURCHASE TABLE ================= */}
        {(activeTab === "All" || activeTab === "Purchase") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Purchase Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by item or supplier..."
                  value={purchaseSearch}
                  onChangeText={setPurchaseSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowPurchaseDropdown(!showPurchaseDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showPurchaseDropdown && (
              <View style={styles.tableDropdown}>
                {[...new Set(reportData.purchase.map(item => item.item))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedPurchaseItem(item);
                      setShowPurchaseDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>Item</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>From</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Cash</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date</Text>
                </View>

                {filterByDate(reportData.purchase)
                  .filter(r => (r.item.toLowerCase().includes(purchaseSearch.toLowerCase()) || r.from.toLowerCase().includes(purchaseSearch.toLowerCase())) &&
                    (selectedPurchaseItem ? r.item === selectedPurchaseItem : true))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{r.item}</Text>
                      <Text style={styles.tCell}>{r.from}</Text>
                      <Text style={styles.tCell}>{r.weight}</Text>
                      <Text style={styles.tCell}>₹{r.cash}</Text>
                      <Text style={styles.tCell}>{r.pure}</Text>
                      <Text style={styles.tCell}>{r.date}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= RECEIPT TABLE ================= */}
        {(activeTab === "All" || activeTab === "Receipt") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Receipt Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by item..."
                  value={receiptSearch}
                  onChangeText={setReceiptSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowReceiptDropdown(!showReceiptDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showReceiptDropdown && (
              <View style={styles.tableDropdown}>
                {[...new Set(reportData.receipt.map(item => item.item))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedReceiptItem(item);
                      setShowReceiptDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>Item</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Weight</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date</Text>
                </View>

                {filterByDate(reportData.receipt)
                  .filter(r => r.item.toLowerCase().includes(receiptSearch.toLowerCase()) &&
                    (selectedReceiptItem ? r.item === selectedReceiptItem : true))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{r.item}</Text>
                      <Text style={styles.tCell}>{r.weight}</Text>
                      <Text style={styles.tCell}>{r.pure}</Text>
                      <Text style={styles.tCell}>{r.date}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= CASH TABLE ================= */}
        {(activeTab === "All" || activeTab === "Cash") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Cash Report</Text>
              <TextInput
                style={styles.tableSearchInput}
                placeholder="Search by name..."
                value={cashSearch}
                onChangeText={setCashSearch}
              />
            </View>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Amount</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Pure</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Date</Text>
                </View>

                {filterByDate(reportData.cash)
                  .filter(r => r.name.toLowerCase().includes(cashSearch.toLowerCase()))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{r.name}</Text>
                      <Text style={styles.tCell}>₹{r.amount}</Text>
                      <Text style={styles.tCell}>{r.pure}</Text>
                      <Text style={styles.tCell}>{r.date}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* ================= STOCK TABLE ================= */}
        {(activeTab === "All" || activeTab === "Stock") && (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>Stock Report</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by name..."
                  value={stockSearch}
                  onChangeText={setStockSearch}
                />
                <TouchableOpacity
                  style={styles.tableFilterBtn}
                  onPress={() => setShowStockDropdown(!showStockDropdown)}
                >
                  <Text style={styles.tableFilterBtnText}>Items</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showStockDropdown && (
              <View style={styles.tableDropdown}>
                {[...new Set(reportData.stock.map(item => item.name))].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedStockItem(item);
                      setShowStockDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tCell, styles.headerCell]}>Name</Text>
                  <Text style={[styles.tCell, styles.headerCell]}>Available</Text>
                </View>

                {reportData.stock
                  .filter(r => r.name.toLowerCase().includes(stockSearch.toLowerCase()) &&
                    (selectedStockItem ? r.name === selectedStockItem : true))
                  .map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tCell}>{r.name}</Text>
                      <Text style={styles.tCell}>{r.avail}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Add bottom padding for scrolling */}
        <View style={{ height: 50 }} />

      </ScrollView>

      {/* DATE PICKERS (FIXED - Using Date objects directly) */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onFromDateChange}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onToDateChange}
        />
      )}
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "#1b5e20",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", flex: 1, textAlign: "center", top: 65 },
  dateTimeText: { color: "#fff", fontSize: 12, textAlign: "center", top: 20 },
  headerButtons: { flexDirection: "row", gap: 8, top: 20 },
  mailBtn: { backgroundColor: "#ff9800", padding: 8, borderRadius: 6 },
  exportBtn: { backgroundColor: "#43a047", padding: 8, borderRadius: 6 },

  container: { padding: 16, backgroundColor: "#f4f6f8", marginTop: 60, top: 50 },

  dateCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 10,
  },
  dateBox: {
    width: "48%",
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1b5e20",
  },
  dateTitle: { fontSize: 12, color: "#1b5e20" },
  dateValue: { fontSize: 16, fontWeight: "bold", color: "#000" },

  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },

  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  tabBtn: { backgroundColor: "#1b5e20", padding: 8, borderRadius: 6 },
  activeTabBtn: { backgroundColor: "#000" },
  tabText: { color: "#fff", fontWeight: "bold" },

  tableTitle: { fontSize: 16, fontWeight: "bold", marginVertical: 10, color: "#1b5e20" },
  tableHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 },
  tableSearchInput: { backgroundColor: "#fff", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#ccc", width: 150 },
  tableFilterBtn: { backgroundColor: "#1b5e20", padding: 8, borderRadius: 6, marginLeft: 10 },
  tableFilterBtnText: { color: "#fff", fontWeight: "bold" },
  tableDropdown: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#1b5e20",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1000,
    maxHeight: 200,
    minWidth: 140,
    paddingVertical: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    marginHorizontal: 5,
    marginVertical: 2,
    borderRadius: 5,
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  tableHeader: { flexDirection: "row", backgroundColor: "#1b5e20", padding: 8, borderRadius: 4 },
  tableRow: { flexDirection: "row", backgroundColor: "#e8f5e9", borderBottomWidth: 1, borderBottomColor: "#c8e6c9", padding: 8 },

  tCell: { width: 100, textAlign: "center", color: "#000" },
  headerCell: { color: "#fff", fontWeight: "bold" },
});

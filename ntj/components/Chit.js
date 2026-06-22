import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SHOP_INFO_KEY, DEFAULT_SHOP_INFO } from "./SettingsScreen";

const PRESET_MONTHS = [3, 5, 9, 12];

const displayGroupCode = (code) => (code || "").replace(/^GRP/i, "SVJ");

const getShopInfo = async () => {
  try {
    const raw = await AsyncStorage.getItem(SHOP_INFO_KEY);
    return raw ? { ...DEFAULT_SHOP_INFO, ...JSON.parse(raw) } : DEFAULT_SHOP_INFO;
  } catch {
    return DEFAULT_SHOP_INFO;
  }
};

export default function Chit({ navigation }) {
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedChit, setSelectedChit] = useState(null);

  // Add-customer form
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formGoldRate, setFormGoldRate] = useState("");
  const [formMonths, setFormMonths] = useState(12);
  const [customMonthsStr, setCustomMonthsStr] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payGoldRate, setPayGoldRate] = useState("");
  const [payDate, setPayDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [paying, setPaying] = useState(false);

  // Edit form
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingChit, setEditingChit] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMonths, setEditMonths] = useState(12);
  const [editCustomMonthsStr, setEditCustomMonthsStr] = useState("");
  const [showEditCustomInput, setShowEditCustomInput] = useState(false);
  const [editUpdating, setEditUpdating] = useState(false);

  // Bill preview
  const [billPreviewVisible, setBillPreviewVisible] = useState(false);
  const [previewChit, setPreviewChit] = useState(null);
  const [previewPayment, setPreviewPayment] = useState(null);
  const [shopInfo, setShopInfo] = useState(DEFAULT_SHOP_INFO);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchChits();
    getShopInfo().then(setShopInfo);
  }, []);

  const fetchChits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base_url}/chit`);
      if (res.ok) setChits(await res.json());
    } catch {
      Alert.alert("Error", "Failed to load chit customers.");
    } finally {
      setLoading(false);
    }
  };

  const formCalWeight = () => {
    const a = parseFloat(formAmount), r = parseFloat(formGoldRate);
    return (!isNaN(a) && !isNaN(r) && r > 0) ? (a / r).toFixed(4) : "";
  };

  const payCalWeight = () => {
    const a = parseFloat(payAmount), r = parseFloat(payGoldRate);
    return (!isNaN(a) && !isNaN(r) && r > 0) ? (a / r).toFixed(4) : "";
  };

  const resetAddForm = () => {
    setFormName(""); setFormPhone(""); setFormAddress("");
    setFormAmount(""); setFormGoldRate("");
    setFormMonths(12); setCustomMonthsStr(""); setShowCustomInput(false);
  };

  const selectPresetMonth = (m) => {
    setFormMonths(m);
    setShowCustomInput(false);
    setCustomMonthsStr("");
  };

  const selectCustomMonth = () => {
    setShowCustomInput(true);
    setFormMonths(0);
    setCustomMonthsStr("");
  };

  const onCustomMonthsChange = (v) => {
    setCustomMonthsStr(v);
    const n = parseInt(v, 10);
    setFormMonths(Number.isFinite(n) && n > 0 ? n : 0);
  };

  const handleAddCustomer = async () => {
    if (!formName.trim() || !formPhone.trim() || !formAmount || !formGoldRate) {
      Alert.alert("Required", "Please fill Customer Name, Phone, Monthly Amount and Gold Rate.");
      return;
    }
    if (!formMonths || formMonths < 1) {
      Alert.alert("Required", "Please select or enter a valid number of months.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base_url}/chit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formName.trim(),
          phone: formPhone.trim(),
          address: formAddress.trim(),
          monthlyAmount: parseFloat(formAmount),
          goldRate: parseFloat(formGoldRate),
          months: formMonths,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setChits((prev) => [saved, ...prev]);
        setAddModalVisible(false);
        resetAddForm();
      } else {
        const err = await res.json();
        Alert.alert("Error", err.message || "Failed to save.");
      }
    } catch {
      Alert.alert("Error", "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (chit) => {
    setSelectedChit(chit);
    setPayAmount(chit.monthlyAmount.toString());
    setPayGoldRate(chit.goldRate.toString());
    setPayDate(new Date().toLocaleDateString("en-GB"));
    setPayModalVisible(true);
  };

  const handlePayment = async () => {
    if (!payAmount || !payGoldRate) {
      Alert.alert("Required", "Please enter Amount and Gold Rate.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`${base_url}/chit/${selectedChit._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          goldRate: parseFloat(payGoldRate),
          date: payDate,
        }),
      });
      if (res.ok) {
        const { chit, payment } = await res.json();
        setChits((prev) => prev.map((c) => (c._id === chit._id ? chit : c)));
        setPaying(false);
        setPayModalVisible(false);
        // Show bill preview after modal dismisses
        setTimeout(() => {
          setPreviewChit(chit);
          setPreviewPayment(payment);
          setBillPreviewVisible(true);
        }, 400);
      } else {
        Alert.alert("Error", "Payment failed. Please try again.");
        setPaying(false);
      }
    } catch {
      Alert.alert("Error", "Network error.");
      setPaying(false);
    }
  };

  const printReceipt = async (chit, payment) => {
    const shop = await getShopInfo();
    const html = generateBillHTML(chit, payment, shop);
    try {
      await Print.printAsync({ html });
    } catch {
      try {
        const { uri } = await Print.printToFileAsync({ html });
        Alert.alert("Print", `Receipt saved to:\n${uri}\n\nOpen your Files app to print or share it.`);
      } catch {
        Alert.alert("Print Error", "Could not open print dialog. Please try again.");
      }
    }
  };

  const generateBillHTML = (chit, payment, shop = DEFAULT_SHOP_INFO) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; background:#fff;
               display:flex; justify-content:center; padding:24px; }
        .bill { width:360px; border:3px solid #7A5C00; border-radius:12px; overflow:hidden; }
        .inner { border:1.5px solid #7A5C00; margin:5px; border-radius:9px; overflow:hidden; }
        .header { text-align:center; padding:14px 12px 10px; }
        .shop-name { font-size:22px; font-weight:900; color:#7A5C00; letter-spacing:1px; }
        .shop-addr { font-size:12px; color:#7A5C00; margin-top:5px; line-height:1.6; }
        .shop-phone { font-size:15px; font-weight:700; color:#7A5C00; margin-top:4px; }
        .gst-row { font-size:12px; color:#7A5C00; margin-top:4px; font-weight:600; }
        .divider { border-top:1.5px solid #7A5C00; }
        .banner { background:#7A5C00; color:#fff; text-align:center;
                  font-size:16px; font-weight:700; padding:8px; letter-spacing:3px; }
        .rect-row { display:flex; justify-content:space-between;
                    padding:9px 16px; font-size:13px; color:#7A5C00; font-weight:600; }
        .fields { padding:10px 16px; border-top:1.5px solid #7A5C00; }
        .field-row { display:flex; align-items:center;
                     padding:7px 0; border-bottom:1px dotted #ccc; }
        .field-label { font-size:13px; font-weight:700; color:#7A5C00; width:108px; }
        .field-colon { font-size:13px; font-weight:700; color:#7A5C00; width:16px; }
        .field-value { font-size:13px; color:#000; flex:1; }
        .sig-area { padding:20px 16px 14px; border-top:1.5px solid #7A5C00;
                    min-height:70px; display:flex; align-items:flex-end; justify-content:flex-end; }
        .sig-text { font-size:13px; font-weight:600; color:#7A5C00; }
      </style>
    </head>
    <body>
      <div class="bill">
        <div class="inner">
          <div class="header">
            <div class="shop-name">${shop.shopName}</div>
            <div class="shop-addr">${shop.shopAddress.replace(/\n/g, "<br/>")}</div>
            <div class="shop-phone">Ph : ${shop.phone}</div>
            <div class="gst-row">GSTT No : ${shop.gstNo || ""}</div>
          </div>
          <div class="divider"></div>
          <div class="banner">CASH PAYMENT</div>
          <div class="rect-row">
            <span>Rect No :&nbsp;<strong>${payment.receiptNo}</strong></span>
            <span>Rect Date :&nbsp;${payment.date}</span>
          </div>
          <div class="fields">
            <div class="field-row">
              <span class="field-label">Group Code</span>
              <span class="field-colon">:</span>
              <span class="field-value">${displayGroupCode(chit.groupCode)}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Name</span>
              <span class="field-colon">:</span>
              <span class="field-value">${chit.customerName}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Amount</span>
              <span class="field-colon">:</span>
              <span class="field-value">&#8377; ${Number(payment.amount).toLocaleString("en-IN")}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Gold Rate</span>
              <span class="field-colon">:</span>
              <span class="field-value">&#8377; ${Number(payment.goldRate).toLocaleString("en-IN")}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Cal.Wt</span>
              <span class="field-colon">:</span>
              <span class="field-value">${payment.calWeight} g</span>
            </div>
            <div class="field-row">
              <span class="field-label">Total.Wt</span>
              <span class="field-colon">:</span>
              <span class="field-value">${payment.totalWeight} g</span>
            </div>
            <div class="field-row">
              <span class="field-label">Ins. No</span>
              <span class="field-colon">:</span>
              <span class="field-value">${payment.installmentNo}</span>
            </div>
          </div>
          <div class="sig-area">
            <span class="sig-text">Signature</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printSummary = async (chit) => {
    const shop = await getShopInfo();
    const payments = chit.payments || [];
    const totalMonths = chit.months || 12;
    const paid = chit.installmentNo || 0;

    const paymentRows = payments.length > 0
      ? payments.map((p) => `
          <tr>
            <td>${p.installmentNo}</td>
            <td>${p.date || "-"}</td>
            <td>&#8377; ${Number(p.amount).toLocaleString("en-IN")}</td>
            <td>&#8377; ${Number(p.goldRate).toLocaleString("en-IN")}</td>
            <td>${Number(p.calWeight).toFixed(4)} g</td>
            <td>${Number(p.totalWeight).toFixed(4)} g</td>
            <td>${p.receiptNo}</td>
          </tr>`).join("")
      : `<tr><td colspan="7" style="text-align:center;color:#888;">No payments yet</td></tr>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; padding:20px; color:#000; }
          .header { text-align:center; border-bottom:2px solid #7A5C00; padding-bottom:12px; margin-bottom:14px; }
          .shop-name { font-size:20px; font-weight:900; color:#7A5C00; }
          .shop-addr { font-size:11px; color:#555; margin-top:3px; }
          .shop-phone { font-size:13px; font-weight:700; color:#7A5C00; margin-top:3px; }
          .title { font-size:15px; font-weight:800; color:#fff; background:#7A5C00;
                   text-align:center; padding:7px; margin-bottom:14px; letter-spacing:2px; }
          .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 20px;
                       background:#FFF8E1; border:1px solid #FFF3CD; border-radius:8px;
                       padding:12px; margin-bottom:14px; }
          .info-item { display:flex; gap:6px; font-size:12px; }
          .info-label { font-weight:700; color:#7A5C00; min-width:110px; }
          .info-value { color:#000; }
          table { width:100%; border-collapse:collapse; font-size:11px; }
          th { background:#7A5C00; color:#fff; padding:7px 6px; text-align:center; }
          td { padding:6px; text-align:center; border-bottom:1px solid #eee; }
          tr:nth-child(even) td { background:#FFF8E1; }
          .summary { margin-top:14px; background:#FFF8E1; border-radius:8px;
                     padding:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }
          .sum-item { text-align:center; }
          .sum-label { font-size:11px; color:#555; }
          .sum-value { font-size:15px; font-weight:800; color:#7A5C00; }
          .footer { margin-top:30px; display:flex; justify-content:space-between; font-size:12px; color:#555; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shop.shopName}</div>
          <div class="shop-addr">${shop.shopAddress.replace(/\n/g, " ")}</div>
          <div class="shop-phone">Ph : ${shop.phone}</div>
          ${shop.gstNo ? `<div class="shop-addr">GSTT No : ${shop.gstNo}</div>` : ""}
        </div>

        <div class="title">CHIT PAYMENT STATEMENT</div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Group Code</span>
            <span class="info-value">${displayGroupCode(chit.groupCode)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Customer Name</span>
            <span class="info-value">${chit.customerName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone</span>
            <span class="info-value">${chit.phone || "-"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Address</span>
            <span class="info-value">${chit.address || "-"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Monthly Amount</span>
            <span class="info-value">&#8377; ${Number(chit.monthlyAmount).toLocaleString("en-IN")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Gold Rate</span>
            <span class="info-value">&#8377; ${Number(chit.goldRate).toLocaleString("en-IN")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Cal. Weight/Month</span>
            <span class="info-value">${chit.calculatedWeight} g</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Months</span>
            <span class="info-value">${totalMonths}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ins. No</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Gold Rate</th>
              <th>Cal.Wt</th>
              <th>Total Wt</th>
              <th>Rect No</th>
            </tr>
          </thead>
          <tbody>${paymentRows}</tbody>
        </table>

        <div class="summary">
          <div class="sum-item">
            <div class="sum-label">Installments Paid</div>
            <div class="sum-value">${paid} / ${totalMonths}</div>
          </div>
          <div class="sum-item">
            <div class="sum-label">Total Wt Accumulated</div>
            <div class="sum-value">${Number(chit.totalWeight || 0).toFixed(4)} g</div>
          </div>
          <div class="sum-item">
            <div class="sum-label">Remaining</div>
            <div class="sum-value">${Math.max(0, totalMonths - paid)} months</div>
          </div>
        </div>

        <div class="footer">
          <span>Printed on: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN")}</span>
          <span>Signature: _______________</span>
        </div>
      </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch {
      try {
        const { uri } = await Print.printToFileAsync({ html });
        Alert.alert("Saved", `Statement saved to:\n${uri}`);
      } catch {
        Alert.alert("Print Error", "Could not open print dialog.");
      }
    }
  };

  const openEditModal = (chit) => {
    setEditingChit(chit);
    setEditName(chit.customerName);
    setEditPhone(chit.phone);
    setEditAmount(chit.monthlyAmount.toString());
    const m = chit.months || 12;
    if (PRESET_MONTHS.includes(m)) {
      setEditMonths(m);
      setShowEditCustomInput(false);
      setEditCustomMonthsStr("");
    } else {
      setEditMonths(m);
      setShowEditCustomInput(true);
      setEditCustomMonthsStr(String(m));
    }
    setEditModalVisible(true);
  };

  const handleUpdateChit = async () => {
    if (!editName.trim() || !editPhone.trim() || !editAmount) {
      Alert.alert("Required", "Name, phone and monthly amount are required.");
      return;
    }
    setEditUpdating(true);
    try {
      const res = await fetch(`${base_url}/chit/${editingChit._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: editName.trim(),
          phone: editPhone.trim(),
          monthlyAmount: parseFloat(editAmount),
          months: editMonths,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setChits((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setEditModalVisible(false);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.message || "Failed to update.");
      }
    } catch {
      Alert.alert("Error", "Network error.");
    } finally {
      setEditUpdating(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete", "Delete this chit customer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${base_url}/chit/${id}`, { method: "DELETE" });
            if (res.ok) setChits((prev) => prev.filter((c) => c._id !== id));
          } catch { Alert.alert("Error", "Failed to delete."); }
        },
      },
    ]);
  };

  const renderChitCard = ({ item }) => {
    const totalMonths = item.months || 12;
    const paid = item.installmentNo || 0;
    const nextMonth = paid + 1;
    const isComplete = paid >= totalMonths;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupCode}>{displayGroupCode(item.groupCode)}</Text>
            <Text style={styles.custName}>{item.customerName}</Text>
            <Text style={styles.custSub}>
              {item.phone}{item.address ? `  •  ${item.address}` : ""}
            </Text>
          </View>
            <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => printSummary(item)} style={styles.printIconBtn}>
              <Icon name="printer" size={20} color="#7A5C00" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editIconBtn}>
              <Icon name="pencil" size={20} color="#1565C0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteIconBtn}>
              <Icon name="delete" size={20} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Monthly Amt</Text>
            <Text style={styles.infoValue}>
              ₹{Number(item.monthlyAmount).toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Gold Rate</Text>
            <Text style={styles.infoValue}>
              ₹{Number(item.goldRate).toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Cal.Wt</Text>
            <Text style={styles.infoValue}>{item.calculatedWeight} g</Text>
          </View>
        </View>

        {/* Total paid */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Total Wt Paid</Text>
            <Text style={[styles.infoValue, { color: "#B8860B" }]}>
              {Number(item.totalWeight).toFixed(4)} g
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Paid / Total</Text>
            <Text style={[styles.infoValue, { color: "#1565C0" }]}>
              {paid}/{totalMonths}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: isComplete ? "#B8860B" : "#E65100" }]}>
              {isComplete ? "Complete" : `${totalMonths - paid} left`}
            </Text>
          </View>
        </View>

        {/* Payment progress with + button */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>Monthly Payments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.progressRow}>
              {Array.from({ length: totalMonths }, (_, i) => {
                const mn = i + 1;
                const isPaid = mn <= paid;
                const isNext = mn === nextMonth && !isComplete;
                if (isNext) {
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.progressNextBtn}
                      onPress={() => openPayModal(item)}
                    >
                      <Icon name="plus" size={13} color="#fff" />
                      <Text style={styles.progressNextText}>{mn}</Text>
                    </TouchableOpacity>
                  );
                }
                if (isPaid) {
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.progressDot, styles.progressDotPaid]}
                      onPress={() => {
                        const payment = (item.payments || []).find(
                          (p) => p.installmentNo === mn
                        );
                        if (payment) {
                          setPreviewChit(item);
                          setPreviewPayment(payment);
                          setBillPreviewVisible(true);
                        }
                      }}
                    >
                      <Text style={[styles.progressDotNum, styles.progressDotNumPaid]}>
                        {mn}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={i} style={[styles.progressDot, styles.progressDotEmpty]}>
                    <Text style={styles.progressDotNum}>{mn}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Chit"
        backgroundColor="#7A5C00"
        left={
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Icon name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
        }
        right={
          <TouchableOpacity onPress={fetchChits} style={{ padding: 4 }}>
            <Icon name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or group ID..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Icon name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#B8860B" />
      ) : (
        <FlatList
          data={chits.filter((c) => {
            const q = searchQuery.trim().toLowerCase();
            if (!q) return true;
            return (
              (c.customerName || "").toLowerCase().includes(q) ||
              (c.phone || "").includes(q) ||
              displayGroupCode(c.groupCode).toLowerCase().includes(q)
            );
          })}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="account-group-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No chit customers yet.</Text>
              <Text style={styles.emptySubText}>Tap + to add one.</Text>
            </View>
          }
          renderItem={renderChitCard}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* ── ADD CUSTOMER MODAL ── */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Chit Customer</Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); resetAddForm(); }}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter name"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="Enter phone"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="Enter address"
                placeholderTextColor="#aaa"
                multiline
              />

              <Text style={styles.label}>Monthly Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder="e.g. 5000"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Gold Rate (₹/g) *</Text>
              <TextInput
                style={styles.input}
                value={formGoldRate}
                onChangeText={setFormGoldRate}
                placeholder="e.g. 6500"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Number of Months *</Text>
              <View style={styles.monthsRow}>
                {PRESET_MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthBtn, !showCustomInput && formMonths === m && styles.monthBtnActive]}
                    onPress={() => selectPresetMonth(m)}
                  >
                    <Text style={[styles.monthBtnText, !showCustomInput && formMonths === m && styles.monthBtnTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.monthBtn, showCustomInput && styles.monthBtnActive]}
                  onPress={selectCustomMonth}
                >
                  <Text style={[styles.monthBtnText, showCustomInput && styles.monthBtnTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {showCustomInput && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={customMonthsStr}
                  onChangeText={onCustomMonthsChange}
                  placeholder="Enter number of months"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  autoFocus
                />
              )}

              {formCalWeight() ? (
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>Calculated Weight</Text>
                  <Text style={styles.calcValue}>{formCalWeight()} g</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
              onPress={handleAddCustomer}
              disabled={submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? "Saving..." : "Save Customer"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PAY & PRINT MODAL ── */}
      <Modal visible={payModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay & Print Receipt</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedChit && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.payInfoCard}>
                  <Text style={styles.payInfoName}>{selectedChit.customerName}</Text>
                  <Text style={styles.payInfoSub}>
                    {displayGroupCode(selectedChit.groupCode)}  •  Installment #{selectedChit.installmentNo + 1}
                  </Text>
                </View>

                <Text style={styles.label}>Amount (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>Gold Rate (₹/g) *</Text>
                <TextInput
                  style={styles.input}
                  value={payGoldRate}
                  onChangeText={setPayGoldRate}
                  keyboardType="numeric"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={payDate}
                  onChangeText={setPayDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#aaa"
                />

                {payCalWeight() ? (
                  <View style={styles.calcBox}>
                    <Text style={styles.calcLabel}>Cal.Wt  =  Amount ÷ Gold Rate</Text>
                    <Text style={styles.calcValue}>{payCalWeight()} g</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, paying && { opacity: 0.5 }]}
              onPress={handlePayment}
              disabled={paying}
            >
              <Icon name="printer" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.submitText}>
                {paying ? "Processing..." : "Confirm & Print Bill"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT CHIT MODAL ── */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Customer</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {editingChit && (
              <View style={styles.editGroupBadge}>
                <Text style={styles.editGroupText}>{displayGroupCode(editingChit.groupCode)}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter phone"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Monthly Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="e.g. 5000"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Number of Months *</Text>
              <View style={styles.monthsRow}>
                {PRESET_MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthBtn, !showEditCustomInput && editMonths === m && styles.monthBtnActive]}
                    onPress={() => { setEditMonths(m); setShowEditCustomInput(false); setEditCustomMonthsStr(""); }}
                  >
                    <Text style={[styles.monthBtnText, !showEditCustomInput && editMonths === m && styles.monthBtnTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.monthBtn, showEditCustomInput && styles.monthBtnActive]}
                  onPress={() => { setShowEditCustomInput(true); setEditMonths(0); setEditCustomMonthsStr(""); }}
                >
                  <Text style={[styles.monthBtnText, showEditCustomInput && styles.monthBtnTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {showEditCustomInput && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={editCustomMonthsStr}
                  onChangeText={(v) => {
                    setEditCustomMonthsStr(v);
                    const n = parseInt(v, 10);
                    setEditMonths(Number.isFinite(n) && n > 0 ? n : 0);
                  }}
                  placeholder="Enter number of months"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  autoFocus
                />
              )}

              {editingChit && editAmount ? (
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>New Cal.Wt</Text>
                  <Text style={styles.calcValue}>
                    {(parseFloat(editAmount) / editingChit.goldRate).toFixed(4)} g
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, editUpdating && { opacity: 0.5 }]}
              onPress={handleUpdateChit}
              disabled={editUpdating}
            >
              <Icon name="content-save" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.submitText}>
                {editUpdating ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── BILL PREVIEW MODAL ── */}
      <Modal visible={billPreviewVisible} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <View style={styles.previewContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

              {/* Outer bill border */}
              <View style={styles.billOuter}>
                <View style={styles.billInner}>

                  {/* Header */}
                  <View style={styles.billHeader}>
                    <Text style={styles.billShopName}>{shopInfo.shopName}</Text>
                    {shopInfo.shopAddress.split("\n").map((line, i) => (
                      <Text key={i} style={styles.billAddr}>{line}</Text>
                    ))}
                    <Text style={styles.billPhone}>Ph : {shopInfo.phone}</Text>
                    <Text style={styles.billGst}>GSTT No : {shopInfo.gstNo || ""}</Text>
                  </View>

                  <View style={styles.billDivider} />

                  {/* CASH PAYMENT banner */}
                  <View style={styles.billBanner}>
                    <Text style={styles.billBannerText}>CASH PAYMENT</Text>
                  </View>

                  {/* Rect row */}
                  {previewPayment && (
                    <View style={styles.billRectRow}>
                      <Text style={styles.billRectText}>
                        Rect No : <Text style={styles.billRectValue}>{previewPayment.receiptNo}</Text>
                      </Text>
                      <Text style={styles.billRectText}>
                        Rect Date : <Text style={styles.billRectValue}>{previewPayment.date}</Text>
                      </Text>
                    </View>
                  )}

                  <View style={styles.billDivider} />

                  {/* Fields */}
                  {previewChit && previewPayment && (
                    <View style={styles.billFields}>
                      {[
                        ["Group Code", displayGroupCode(previewChit.groupCode)],
                        ["Name", previewChit.customerName],
                        ["Amount", `₹ ${Number(previewPayment.amount).toLocaleString("en-IN")}`],
                        ["Gold Rate", `₹ ${Number(previewPayment.goldRate).toLocaleString("en-IN")}`],
                        ["Cal.Wt", `${previewPayment.calWeight} g`],
                        ["Total. Wt", `${previewPayment.totalWeight} g`],
                        ["Ins. No", String(previewPayment.installmentNo)],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.billFieldRow}>
                          <Text style={styles.billFieldLabel}>{label}</Text>
                          <Text style={styles.billFieldColon}>:</Text>
                          <Text style={styles.billFieldValue}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Signature area */}
                  <View style={styles.billSigArea}>
                    <Text style={styles.billSigText}>Signature</Text>
                  </View>

                </View>
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => setBillPreviewVisible(false)}
              >
                <Icon name="close" size={18} color="#555" />
                <Text style={styles.previewCloseBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewPrintBtn}
                onPress={() => {
                  setBillPreviewVisible(false);
                  setTimeout(() => printReceipt(previewChit, previewPayment), 400);
                }}
              >
                <Icon name="printer" size={18} color="#fff" />
                <Text style={styles.previewPrintBtnText}>Print Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6F8" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#000",
  },

  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 12, fontWeight: "600" },
  emptySubText: { fontSize: 13, color: "#bbb", marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    marginBottom: 14,
    borderRadius: 14,
    padding: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  groupCode: { fontSize: 12, color: "#1565C0", fontWeight: "700", marginBottom: 2 },
  custName: { fontSize: 17, fontWeight: "bold", color: "#000" },
  custSub: { fontSize: 13, color: "#666", marginTop: 2 },

  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
  infoBox: {
    flex: 1, backgroundColor: "#F5F6F8", borderRadius: 8,
    padding: 8, alignItems: "center",
  },
  infoLabel: { fontSize: 11, color: "#888" },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#000", marginTop: 2 },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  printIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF8E1",
  },
  editIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
  },
  deleteIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
  },
  editGroupBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#3D2800",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  editGroupText: {
    color: "#FFD54F",
    fontWeight: "bold",
    fontSize: 13,
  },

  // Payment progress
  progressSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 10,
  },
  progressLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotPaid: {
    backgroundColor: "#B8860B",
  },
  progressDotEmpty: {
    backgroundColor: "#E0E0E0",
  },
  progressDotNum: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
  },
  progressDotNumPaid: {
    color: "#fff",
  },
  progressNextBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6F00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E65100",
  },
  progressNextText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 10,
  },

  fab: {
    position: "absolute", bottom: 25, right: 25,
    backgroundColor: "#FFD700", width: 60, height: 60,
    borderRadius: 30, justifyContent: "center", alignItems: "center",
    elevation: 6,
  },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff", width: "92%", borderRadius: 18,
    padding: 20, maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1B1F24" },

  label: { marginTop: 12, fontWeight: "600", color: "#333", fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    padding: 11, marginTop: 5, fontSize: 14, color: "#000",
    backgroundColor: "#FAFAFA",
  },

  calcBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 12, marginTop: 14,
  },
  calcLabel: { fontSize: 13, color: "#B8860B", fontWeight: "600" },
  calcValue: { fontSize: 16, fontWeight: "bold", color: "#7A5C00" },

  submitBtn: {
    backgroundColor: "#7A5C00", borderRadius: 12, padding: 14,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginTop: 16,
  },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  payInfoCard: {
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 12, marginBottom: 4,
  },
  payInfoName: { fontSize: 16, fontWeight: "bold", color: "#7A5C00" },
  payInfoSub: { fontSize: 13, color: "#555", marginTop: 3 },

  // ── Bill Preview ──
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "92%",
    overflow: "hidden",
  },
  billOuter: {
    borderWidth: 3,
    borderColor: "#7A5C00",
    borderRadius: 12,
    margin: 12,
    overflow: "hidden",
  },
  billInner: {
    borderWidth: 1.5,
    borderColor: "#7A5C00",
    borderRadius: 9,
    margin: 4,
    overflow: "hidden",
  },
  billHeader: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  billShopName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#7A5C00",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  billAddr: {
    fontSize: 12,
    color: "#7A5C00",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 18,
  },
  billPhone: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7A5C00",
    marginTop: 4,
    textAlign: "center",
  },
  billGst: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7A5C00",
    marginTop: 4,
  },
  billDivider: {
    height: 1.5,
    backgroundColor: "#7A5C00",
  },
  billBanner: {
    backgroundColor: "#7A5C00",
    paddingVertical: 9,
    alignItems: "center",
  },
  billBannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
  },
  billRectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  billRectText: {
    fontSize: 13,
    color: "#7A5C00",
    fontWeight: "600",
  },
  billRectValue: {
    fontWeight: "800",
    fontSize: 15,
  },
  billFields: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  billFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF8E1",
  },
  billFieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A5C00",
    width: 110,
  },
  billFieldColon: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A5C00",
    width: 18,
  },
  billFieldValue: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  billSigArea: {
    borderTopWidth: 1.5,
    borderTopColor: "#7A5C00",
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  billSigText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A5C00",
  },
  previewActions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  previewCloseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 12,
  },
  previewCloseBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
  },
  previewPrintBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7A5C00",
    borderRadius: 12,
    paddingVertical: 12,
  },
  previewPrintBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Month selector
  monthsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  monthBtn: {
    borderWidth: 1.5,
    borderColor: "#7A5C00",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  monthBtnActive: {
    backgroundColor: "#7A5C00",
  },
  monthBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A5C00",
  },
  monthBtnTextActive: {
    color: "#fff",
  },
});

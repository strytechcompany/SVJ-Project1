import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";
import { useRoute } from "@react-navigation/native";

const EMPTY_ROW = (sno) => ({
  sno: String(sno),
  particular: "",
  hsnCode: "",
  weight: "",
  rate: "",
  taxableValue: "",
  cgst: "",
  sgst: "",
  total: "",
});

const toNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatMoney = (value) => toNum(value, 0).toFixed(2);
const hasValue = (value) => String(value ?? "").trim() !== "";
const formatDecimal = (value, digits) =>
  Number.isFinite(value) ? value.toFixed(digits) : "";
const isZeroLike = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const num = Number(text);
  return Number.isFinite(num) && num === 0;
};

const normalizeRow = (row = {}, snoFallback) => ({
  sno: String(row.sno || snoFallback || ""),
  particular: String(row.particular || "").trim(),
  hsnCode: String(row.hsnCode || row.hsn || "").trim(),
  weight: String(row.weight || "").trim(),
  rate: String(row.rate || "").trim(),
  taxableValue: String(row.taxableValue || "").trim(),
  cgst: String(row.cgst || row.cgstAmount || "").trim(),
  sgst: String(row.sgst || row.sgstAmount || "").trim(),
  total: String(row.total || "").trim(),
});

const hasRowData = (row = {}) =>
  [
    row.particular,
    row.hsnCode,
    row.hsn,
    row.weight,
    row.rate,
    row.taxableValue,
    row.cgst,
    row.cgstAmount,
    row.sgst,
    row.sgstAmount,
    row.total,
  ].some((value) => String(value || "").trim() !== "");

const normalizeRowsForForm = (rows = [], { ensureOneEmpty = false } = {}) => {
  const nextRows = Array.isArray(rows)
    ? rows
        .map((row, index) => normalizeRow(row, index + 1))
        .filter((row) => hasRowData(row))
    : [];

  if (nextRows.length === 0 && ensureOneEmpty) {
    return [EMPTY_ROW(1)];
  }

  return nextRows;
};

const renumberRows = (rows = []) =>
  rows.map((row, index) => ({
    ...row,
    sno: String(index + 1),
  }));

const hasPrimaryRowIdentity = (row = {}) =>
  hasValue(row.particular) || hasValue(row.weight) || hasValue(row.taxableValue) || hasValue(row.total);

const collapseToPrimaryRows = (rows = []) => {
  const normalized = normalizeRowsForForm(rows, { ensureOneEmpty: true });
  const primaryRows = normalized.filter((row, index) => {
    if (index === 0) return true;
    return hasPrimaryRowIdentity(row);
  });
  return primaryRows.length > 0 ? renumberRows(primaryRows) : [EMPTY_ROW(1)];
};

const getLatestB2BGstRecord = (records = []) =>
  Array.isArray(records)
    ? records.find((item) => String(item?.type || "").toUpperCase() === "B2B") || null
    : null;

const getMatchedLatestB2BBill = (bills = [], customer = {}) => {
  const customerPhone = String(customer.phoneNumber || customer.phone || "").trim();
  const customerName = String(customer.customerName || customer.name || "").trim().toLowerCase();

  return Array.isArray(bills)
    ? bills.find((bill) => {
        const billPhone = String(bill?.phoneNumber || bill?.phone || "").trim();
        const billName = String(bill?.customerName || bill?.name || "").trim().toLowerCase();
        return (customerPhone && billPhone === customerPhone) || (customerName && billName === customerName);
      }) || null
    : null;
};

const buildRowFallbacks = ({ gstRecord, latestBill } = {}) => {
  const previewCashRows = Array.isArray(latestBill?.previewSnapshot?.cash?.rows)
    ? latestBill.previewSnapshot.cash.rows
    : [];
  const cashRows = previewCashRows.length > 0
    ? previewCashRows
    : Array.isArray(latestBill?.cashTable)
      ? latestBill.cashTable
      : [];
  const gstFromBill = latestBill?.gst || {};
  const fallbackWeight = cashRows.reduce(
    (sum, row) => sum + toNum(row?.pure, 0),
    0,
  );
  const fallbackRate = [...cashRows]
    .reverse()
    .map((row) => toNum(row?.goldRate, 0))
    .find((value) => value > 0) ||
    toNum(latestBill?.previewSnapshot?.header?.ftRate, toNum(gstFromBill?.rate, NaN));
  const taxableValue = Number.isFinite(fallbackWeight) && Number.isFinite(fallbackRate)
    ? fallbackWeight * fallbackRate
    : NaN;
  const sgstPercent = toNum(gstRecord?.sgst, 0);
  const cgstPercent = toNum(gstRecord?.cgst, 0);
  const sgstAmount = Number.isFinite(taxableValue)
    ? (taxableValue * sgstPercent) / 100
    : NaN;
  const cgstAmount = Number.isFinite(taxableValue)
    ? (taxableValue * cgstPercent) / 100
    : NaN;
  const totalValue = toNum(
    NaN,
    Number.isFinite(taxableValue) && Number.isFinite(sgstAmount) && Number.isFinite(cgstAmount)
      ? taxableValue + sgstAmount + cgstAmount
      : NaN,
  );

  return {
    hsnCode: String(gstRecord?.hsnCode || gstRecord?.hsn || "").trim(),
    sgstPercent,
    cgstPercent,
    hasGstRecord: Boolean(gstRecord),
    weight: fallbackWeight,
    rate: fallbackRate,
    taxableValue,
    sgstAmount,
    cgstAmount,
    totalValue,
  };
};

const enrichRowsWithFallbacks = (rows = [], fallbacks = {}) =>
  collapseToPrimaryRows(rows).map((row, index) => {
    if (!hasRowData(row)) return row;

    const allowFallbackFill = index === 0 || hasPrimaryRowIdentity(row);
    const shouldReplaceWeight = !hasValue(row.weight) || isZeroLike(row.weight);
    const shouldReplaceRate = !hasValue(row.rate) || isZeroLike(row.rate);
    const shouldReplaceTaxable = !hasValue(row.taxableValue) || isZeroLike(row.taxableValue);
    const shouldReplaceCgst = !hasValue(row.cgst) || isZeroLike(row.cgst);
    const shouldReplaceSgst = !hasValue(row.sgst) || isZeroLike(row.sgst);
    const shouldReplaceTotal = !hasValue(row.total) || isZeroLike(row.total);

    const weightValue = !shouldReplaceWeight
      ? toNum(row.weight, NaN)
      : allowFallbackFill
        ? fallbacks.weight
        : NaN;
    const rateValue = !shouldReplaceRate
      ? toNum(row.rate, NaN)
      : allowFallbackFill
        ? fallbacks.rate
        : NaN;
    const taxableValue = !shouldReplaceTaxable
      ? toNum(row.taxableValue, NaN)
      : Number.isFinite(fallbacks.taxableValue)
        ? fallbacks.taxableValue
        : Number.isFinite(weightValue) && Number.isFinite(rateValue)
        ? weightValue * rateValue
        : NaN;
    const cgstValue = !shouldReplaceCgst
      ? toNum(row.cgst, NaN)
      : Number.isFinite(fallbacks.cgstAmount)
        ? fallbacks.cgstAmount
        : fallbacks.hasGstRecord && Number.isFinite(taxableValue)
        ? (taxableValue * fallbacks.cgstPercent) / 100
        : NaN;
    const sgstValue = !shouldReplaceSgst
      ? toNum(row.sgst, NaN)
      : Number.isFinite(fallbacks.sgstAmount)
        ? fallbacks.sgstAmount
        : fallbacks.hasGstRecord && Number.isFinite(taxableValue)
        ? (taxableValue * fallbacks.sgstPercent) / 100
        : NaN;
    const recomputedTotalValue =
      Number.isFinite(taxableValue) && Number.isFinite(cgstValue) && Number.isFinite(sgstValue)
        ? taxableValue + cgstValue + sgstValue
        : NaN;
    const totalValue = !shouldReplaceTotal
      ? toNum(row.total, NaN)
      : Number.isFinite(recomputedTotalValue)
        ? recomputedTotalValue
        : Number.isFinite(fallbacks.totalValue)
        ? fallbacks.totalValue
        : NaN;

    return {
      ...row,
      hsnCode: hasValue(row.hsnCode)
        ? row.hsnCode
        : allowFallbackFill
          ? fallbacks.hsnCode
          : "",
      weight: shouldReplaceWeight ? formatDecimal(weightValue, 3) : row.weight,
      rate: shouldReplaceRate ? formatDecimal(rateValue, 2) : row.rate,
      taxableValue: shouldReplaceTaxable ? formatDecimal(taxableValue, 2) : row.taxableValue,
      cgst: shouldReplaceCgst ? formatDecimal(cgstValue, 2) : row.cgst,
      sgst: shouldReplaceSgst ? formatDecimal(sgstValue, 2) : row.sgst,
      total: shouldReplaceTotal ? formatDecimal(totalValue, 2) : row.total,
    };
  });

export default function CustomerGstPage({ navigation }) {
  const route = useRoute();
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [totalInvoiceValue, setTotalInvoiceValue] = useState("");
  const [billRows, setBillRows] = useState(() => normalizeRowsForForm([], { ensureOneEmpty: true }));
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNo: "",
    ifsc: "",
    branch: "",
  });
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const readResponseBody = async (response) => {
    const text = await response.text();
    if (!text) return { data: null, raw: "" };
    try {
      return { data: JSON.parse(text), raw: text };
    } catch (_) {
      return { data: null, raw: text };
    }
  };

  const findExistingCustomerMatch = (customer = {}, list = customers) => {
    const phone = String(customer.phoneNumber || customer.phone || "").trim();
    const name = String(customer.customerName || customer.name || "").trim().toLowerCase();

    return (Array.isArray(list) ? list : []).find((item) => {
      const itemPhone = String(item?.phoneNumber || item?.phone || "").trim();
      const itemName = String(item?.customerName || item?.name || "").trim().toLowerCase();
      return (phone && itemPhone === phone) || (name && itemName === name);
    }) || null;
  };

  const applyCustomerToForm = (item = {}, rowFallbacks = null) => {
    setCustomerName(item.customerName || item.name || "");
    setPhoneNumber(item.phoneNumber || item.phone || "");
    setAddress(item.address || "");
    setGstNumber(item.gstin || item.gst || "");
    setInvoiceNo(item.invoiceNo || item.billNo || "");
    setDate(item.date || new Date().toLocaleDateString("en-GB"));
    setTotalInvoiceValue(item.totalInvoiceValue || "");
    const normalizedRows = collapseToPrimaryRows(item.billRows);
    setBillRows(rowFallbacks ? enrichRowsWithFallbacks(normalizedRows, rowFallbacks) : normalizedRows);
    const nextBankDetails = {
      accountName: item.bankDetails?.accountName || "",
      accountNo: item.bankDetails?.accountNo || "",
      ifsc: item.bankDetails?.ifsc || "",
      branch: item.bankDetails?.branch || "",
    };
    setBankDetails(nextBankDetails);
    setShowBankDetails(
      [
        nextBankDetails.accountName,
        nextBankDetails.accountNo,
        nextBankDetails.ifsc,
        nextBankDetails.branch,
      ].some((value) => String(value || "").trim() !== ""),
    );
    setEditingId(item._id || null);
  };

  useEffect(() => {
    if (route.params?.customer) {
      const routeCustomer = route.params.customer;
      const existing = customers.find(
        (item) =>
          String(item.phoneNumber || "").trim() === String(routeCustomer.phone || "").trim() &&
          String(item.customerName || "").trim().toLowerCase() ===
            String(routeCustomer.name || "").trim().toLowerCase(),
      );

      if (existing) {
        applyCustomerToForm(existing);
        return;
      }

      applyCustomerToForm({
        customerName: routeCustomer.name || "",
        phoneNumber: routeCustomer.phone || "",
        address: routeCustomer.address || "",
        gstin: routeCustomer.gst || "",
        invoiceNo: routeCustomer.billNo || routeCustomer.invoiceNo || "",
        date: routeCustomer.date || new Date().toLocaleDateString("en-GB"),
        totalInvoiceValue: "",
        billRows: route.params?.billRows || [EMPTY_ROW(1)],
        bankDetails: route.params?.bankDetails || {},
      });
    }
  }, [route.params?.customer, route.params?.billRows, route.params?.bankDetails, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${base_url}/gstCustomers`);
      if (response.ok) {
        const { data } = await readResponseBody(response);
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        const { data, raw } = await readResponseBody(response);
        Alert.alert("Error", data?.message || raw || "Failed to load GST customers");
      }
    } catch (error) {
      console.error("GST customers fetch error:", error);
      Alert.alert("Error", "Could not load GST customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const resetForm = () => {
    setCustomerName("");
    setPhoneNumber("");
    setAddress("");
    setGstNumber("");
    setInvoiceNo("");
    setDate(new Date().toLocaleDateString("en-GB"));
    setTotalInvoiceValue("");
    setBillRows(normalizeRowsForForm([], { ensureOneEmpty: true }));
    setBankDetails({ accountName: "", accountNo: "", ifsc: "", branch: "" });
    setShowBankDetails(false);
    setEditingId(null);
  };

  const updateBillRow = (index, field, value) => {
    setBillRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  };

  const addBillRow = () => {
    setBillRows((prev) => [...renumberRows(prev), EMPTY_ROW(prev.length + 1)]);
  };

  const removeBillRow = (index) => {
    setBillRows((prev) => {
      const nextRows = prev.filter((_, rowIndex) => rowIndex !== index);
      return nextRows.length > 0
        ? renumberRows(nextRows)
        : [EMPTY_ROW(1)];
    });
  };

  const computedInvoiceValue = useMemo(
    () => billRows.reduce((sum, row) => sum + toNum(row.total, 0), 0),
    [billRows],
  );

  const buildPayload = () => ({
    customerName: customerName.trim(),
    phoneNumber: phoneNumber.trim(),
    address: address.trim(),
    gstin: gstNumber.trim(),
    invoiceNo: invoiceNo.trim(),
    date: date.trim(),
    totalInvoiceValue: String(totalInvoiceValue || formatMoney(computedInvoiceValue)).trim(),
    billRows: billRows
      .map((row, index) => normalizeRow(row, index + 1))
      .filter((row) => hasRowData(row)),
    bankDetails: {
      accountName: bankDetails.accountName.trim(),
      accountNo: bankDetails.accountNo.trim(),
      ifsc: bankDetails.ifsc.trim(),
      branch: bankDetails.branch.trim(),
    },
  });

  const handleSave = async () => {
    if (!customerName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert("Error", "Customer Name, Phone Number, and Address are required.");
      return;
    }

    const payload = buildPayload();

    try {
      setLoading(true);
      const matchedCustomer = editingId
        ? customers.find((item) => String(item?._id) === String(editingId)) || null
        : findExistingCustomerMatch(payload);
      const resolvedEditingId = editingId || matchedCustomer?._id || null;
      const url = resolvedEditingId
        ? `${base_url}/gstCustomers/${resolvedEditingId}`
        : `${base_url}/gstCustomers`;
      const method = resolvedEditingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data: result, raw } = await readResponseBody(response);
      if (!response.ok) {
        if (!resolvedEditingId && (result?.message || raw || "").includes("already exists")) {
          const duplicateCustomer = findExistingCustomerMatch(payload);
          if (duplicateCustomer?._id) {
            const retryResponse = await fetch(`${base_url}/gstCustomers/${duplicateCustomer._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const { data: retryResult, raw: retryRaw } = await readResponseBody(retryResponse);
            if (!retryResponse.ok) {
              Alert.alert("Error", retryResult?.message || retryRaw || "Failed to save GST customer");
              return;
            }
            Alert.alert("Success", "GST customer updated");
            applyCustomerToForm(retryResult || payload);
            await fetchCustomers();
            return;
          }
        }
        Alert.alert("Error", result?.message || raw || "Failed to save GST customer");
        return;
      }

      Alert.alert("Success", resolvedEditingId ? "GST customer updated" : "GST customer added");
      applyCustomerToForm(result || payload);
      await fetchCustomers();
    } catch (error) {
      console.error("GST customer save error:", error);
      Alert.alert("Error", "Failed to save GST customer");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    const loadEditData = async () => {
      try {
        setLoading(true);
        const [gstResponse, billsResponse] = await Promise.all([
          fetch(`${base_url}/gst`),
          fetch(`${base_url}/billSummary?billType=B2B`),
        ]);

        const gstRecords = gstResponse.ok ? await gstResponse.json() : [];
        const b2bBills = billsResponse.ok ? await billsResponse.json() : [];
        const gstRecord = getLatestB2BGstRecord(gstRecords);
        const latestBill = getMatchedLatestB2BBill(b2bBills, item);
        const rowFallbacks = buildRowFallbacks({ gstRecord, latestBill });

        applyCustomerToForm(item, rowFallbacks);
      } catch (error) {
        console.error("GST customer edit prefill error:", error);
        applyCustomerToForm(item);
      } finally {
        setLoading(false);
      }
    };

    loadEditData();
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Customer", `Delete ${item.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const response = await fetch(`${base_url}/gstCustomers/${item._id}`, {
              method: "DELETE",
            });
            if (response.ok) {
              setCustomers((prev) => prev.filter((c) => c._id !== item._id));
              if (editingId === item._id) {
                resetForm();
              }
              Alert.alert("Success", "GST customer deleted");
            } else {
              const { data, raw } = await readResponseBody(response);
              Alert.alert("Error", data?.message || raw || "Failed to delete GST customer");
            }
          } catch (error) {
            console.error("GST customer delete error:", error);
            Alert.alert("Error", "Failed to delete GST customer");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleSelectCustomer = (item) => {
    navigation.navigate("B2BCalculationPage", {
      gstCustomer: {
        id: item._id,
        name: item.customerName,
        phone: item.phoneNumber,
        address: item.address,
        gst: item.gstin,
        customerType: "B2B",
        isGstCustomer: true,
      },
      billTypeLabel: "GST",
      forceGstEnabled: true,
    });
  };

  const handlePrintBill = () => {
    const payload = buildPayload();
    navigation.navigate("GSTBillPreview", {
      customer: {
        name: payload.customerName,
        customerName: payload.customerName,
        phone: payload.phoneNumber,
        address: payload.address,
        gst: payload.gstin,
        gstin: payload.gstin,
      },
      invoiceNo: payload.invoiceNo,
      billNo: payload.invoiceNo,
      date: payload.date,
      totalInvoiceValue: payload.totalInvoiceValue,
      billRows: payload.billRows,
      bankDetails: payload.bankDetails,
    });
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="GST Customers"
        onBack={() => navigation.goBack()}
        backgroundColor="#1B4D1B"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Customer Entry</Text>

            <View style={styles.twoColumnRow}>
              <View style={styles.flexField}>
                <Text style={styles.label}>Customer Name *</Text>
                <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} />
              </View>
              <View style={styles.flexField}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput style={[styles.input, styles.textArea]} multiline value={address} onChangeText={setAddress} />
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.flexField}>
                <Text style={styles.label}>GST Number</Text>
                <TextInput style={styles.input} value={gstNumber} onChangeText={setGstNumber} />
              </View>
              <View style={styles.flexField}>
                <Text style={styles.label}>Invoice Number</Text>
                <TextInput style={styles.input} value={invoiceNo} onChangeText={setInvoiceNo} />
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.flexField}>
                <Text style={styles.label}>Date</Text>
                <TextInput style={styles.input} value={date} onChangeText={setDate} />
              </View>
              <View style={styles.flexField}>
                <Text style={styles.label}>Total Invoice Value</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder={formatMoney(computedInvoiceValue)}
                  value={totalInvoiceValue}
                  onChangeText={setTotalInvoiceValue}
                />
              </View>
            </View>
          </View>

	          <View style={styles.sectionCard}>
	            <Text style={styles.sectionTitle}>Bill Details</Text>
	            {billRows.map((row, index) => (
	              <View key={index} style={styles.rowCard}>
	                <View style={styles.rowHeader}>
	                  <Text style={styles.rowTitle}>Row {index + 1}</Text>
	                  {billRows.length > 1 ? (
	                    <TouchableOpacity
	                      style={styles.removeRowBtn}
	                      onPress={() => removeBillRow(index)}
	                    >
	                      <Text style={styles.removeRowText}>Remove</Text>
	                    </TouchableOpacity>
	                  ) : null}
	                </View>
	                <View style={styles.threeColumnRow}>
                  <View style={styles.smallField}>
                    <Text style={styles.label}>Sno</Text>
                    <TextInput style={styles.input} value={row.sno} onChangeText={(value) => updateBillRow(index, "sno", value)} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Particular</Text>
                    <TextInput style={styles.input} value={row.particular} onChangeText={(value) => updateBillRow(index, "particular", value)} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>HSN Code</Text>
                    <TextInput style={styles.input} value={row.hsnCode} onChangeText={(value) => updateBillRow(index, "hsnCode", value)} />
                  </View>
                </View>

                <View style={styles.threeColumnRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Weight</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={row.weight} onChangeText={(value) => updateBillRow(index, "weight", value)} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Rate</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={row.rate} onChangeText={(value) => updateBillRow(index, "rate", value)} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Taxable Value</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={row.taxableValue} onChangeText={(value) => updateBillRow(index, "taxableValue", value)} />
                  </View>
                </View>

                <View style={styles.threeColumnRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>CGST</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={row.cgst} onChangeText={(value) => updateBillRow(index, "cgst", value)} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>SGST</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={row.sgst} onChangeText={(value) => updateBillRow(index, "sgst", value)} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Total</Text>
                    <TextInput style={styles.input} keyboardType="decimal-pad" value={row.total} onChangeText={(value) => updateBillRow(index, "total", value)} />
                  </View>
	                </View>
	              </View>
	            ))}
	            <TouchableOpacity style={styles.addRowBtn} onPress={addBillRow}>
	              <Text style={styles.addRowText}>Add Item</Text>
	            </TouchableOpacity>
	          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Bank Details</Text>
              <TouchableOpacity
                style={styles.sectionToggleBtn}
                onPress={() => setShowBankDetails((prev) => !prev)}
              >
                <Text style={styles.sectionToggleText}>
                  {showBankDetails ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
            {showBankDetails ? (
              <>
                <View style={styles.twoColumnRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Bank Account Name</Text>
                    <TextInput style={styles.input} value={bankDetails.accountName} onChangeText={(value) => setBankDetails((prev) => ({ ...prev, accountName: value }))} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Account Number</Text>
                    <TextInput style={styles.input} value={bankDetails.accountNo} onChangeText={(value) => setBankDetails((prev) => ({ ...prev, accountNo: value }))} />
                  </View>
                </View>
                <View style={styles.twoColumnRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>IFSC Code</Text>
                    <TextInput style={styles.input} value={bankDetails.ifsc} onChangeText={(value) => setBankDetails((prev) => ({ ...prev, ifsc: value }))} />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Branch</Text>
                    <TextInput style={styles.input} value={bankDetails.branch} onChangeText={(value) => setBankDetails((prev) => ({ ...prev, branch: value }))} />
                  </View>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>{editingId ? "Update" : "Save"} Customer</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrintBill} disabled={loading}>
              <Text style={styles.printText}>Print Bill</Text>
            </TouchableOpacity>
            {editingId ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={loading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>
              {route.params?.customer ? "Selected GST Customer" : "GST Customers"}
            </Text>
            <TouchableOpacity onPress={fetchCustomers} disabled={loading}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading && customers.length === 0 ? (
            <ActivityIndicator size="large" color="#1B4D1B" style={{ marginTop: 20 }} />
          ) : (
            customers
              .filter((item) => {
                if (!route.params?.customer) return true;
                // If customer is passed from B2B, show only that one (matched by phone or name)
                const targetPhone = String(route.params.customer.phone || "").trim();
                const targetName = String(route.params.customer.name || "").toLowerCase().trim();
                return (
                  String(item.phoneNumber).trim() === targetPhone ||
                  String(item.customerName).toLowerCase().trim() === targetName
                );
              })
              .map((item) => (
              <View
                key={item._id}
                style={styles.card}
              >
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => handleSelectCustomer(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardName}>{item.customerName}</Text>
                  <Text style={styles.cardText}>Phone: {item.phoneNumber}</Text>
                  <Text style={styles.cardText}>Invoice: {item.invoiceNo || "N/A"}</Text>
                  <Text style={styles.cardText}>GST No: {item.gstin || "N/A"}</Text>
                  <Text style={styles.cardText}>Total Invoice: {item.totalInvoiceValue || "0.00"}</Text>
                  <Text style={styles.cardText}>Date: {item.date || "N/A"}</Text>
                </TouchableOpacity>
                <View style={styles.cardActions}>
	                  <TouchableOpacity
	                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                  >
	                    <Text style={styles.actionText}>Delete</Text>
	                  </TouchableOpacity>
	                </View>
	              </View>
	            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6F4",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8E4",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B4D1B",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionToggleBtn: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionToggleText: {
    color: "#1B5E20",
    fontSize: 12,
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: 12,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  threeColumnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  flexField: {
    flex: 1,
  },
  smallField: {
    width: 70,
  },
  label: {
    fontSize: 13,
    color: "#44514A",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FDFDFD",
    borderWidth: 1,
    borderColor: "#D7DED9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1D2420",
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  rowCard: {
    borderWidth: 1,
    borderColor: "#E5EBE7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#FAFCFB",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B4D1B",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  addRowBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addRowText: {
    color: "#1B5E20",
    fontSize: 14,
    fontWeight: "800",
  },
  removeRowBtn: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeRowText: {
    color: "#C62828",
    fontSize: 12,
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: "#1B4D1B",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  printBtn: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  printText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: "#ECEFF1",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelText: {
    color: "#37474F",
    fontWeight: "800",
    fontSize: 14,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  refreshText: {
    color: "#1B4D1B",
    fontWeight: "800",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8E4",
    justifyContent: "space-between",
  },
  cardMain: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#223028",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: "#55635C",
  },
  cardActions: {
    marginLeft: 10,
    gap: 6,
  },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: "#E3F2FD",
  },
  deleteBtn: {
    backgroundColor: "#FFEBEE",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#33423A",
  },
});

import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as Print from "expo-print";

const FIRM = {
  leftMark: "SVJ",
  rightMark: "SVJ",
  name: "SRI NAKSHATRAA JEWELLERS",
  address1: "NO: 2/9 SUNNAMBUKAARA STREET,",
  address2: "BIG BAZAAR ROAD,",
  address3: "TRICHY, TAMILNADU-620008",
  phone: "0431-2700916",
  mobile: "9894851235",
  email: "SRINAKSHATRAA@GMAIL.COM",
  gstin: "33ADVFS0458A1Z4",
  footer: "*** Thank You Visit Again ***",
  signatureLeft: "Signature Of The Party",
  signatureRight: "Sri Vaishnavi Jewellers",
};

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const fmt = (value, digits = 2) => toNum(value, 0).toFixed(digits);

const buildRow = (row = {}, sgstPct = 0, cgstPct = 0) => {
  const weight = toNum(row.weight, 0);
  const rate = toNum(row.rate, 0);
  const taxableValue = row.taxableValue !== undefined && row.taxableValue !== null && row.taxableValue !== ""
    ? toNum(row.taxableValue, weight * rate)
    : weight * rate;
  const cgstAmount = row.cgstAmount !== undefined && row.cgstAmount !== null && row.cgstAmount !== ""
    ? toNum(row.cgstAmount, (taxableValue * cgstPct) / 100)
    : (taxableValue * cgstPct) / 100;
  const sgstAmount = row.sgstAmount !== undefined && row.sgstAmount !== null && row.sgstAmount !== ""
    ? toNum(row.sgstAmount, (taxableValue * sgstPct) / 100)
    : (taxableValue * sgstPct) / 100;
  const total = row.total !== undefined && row.total !== null && row.total !== ""
    ? toNum(row.total, taxableValue + cgstAmount + sgstAmount)
    : taxableValue + cgstAmount + sgstAmount;

  return {
    sno: row.sno || "",
    particular: row.particular || "",
    hsn: String(row.hsn || ""),
    weight: fmt(weight, 3),
    rate: fmt(rate, 2),
    taxableValue: fmt(taxableValue, 2),
    cgstAmount: fmt(cgstAmount, 2),
    sgstAmount: fmt(sgstAmount, 2),
    total: fmt(total, 2),
    editable: Boolean(row.editable),
  };
};

export default function GSTBillPreview({ route, navigation }) {
  const params = route?.params || {};
  const customer = params.customer || {};
  const gst = params.gst || {};
  const sgstPct = toNum(gst.sgst, 0);
  const cgstPct = toNum(gst.cgst, 0);

  const initialRows = useMemo(() => {
    if (Array.isArray(params.billRows) && params.billRows.length > 0) {
      return params.billRows
        .filter((row) =>
          [
            row?.particular,
            row?.weight,
            row?.rate,
            row?.taxableValue,
            row?.cgst,
            row?.sgst,
            row?.total,
          ].some((value) => String(value ?? "").trim() !== "" && String(value ?? "").trim() !== "0" && String(value ?? "").trim() !== "0.00" && String(value ?? "").trim() !== "0.000")
        )
        .map((row, index) =>
        buildRow(
          {
            sno: row.sno || String(index + 1),
            particular: row.particular || "",
            hsn: row.hsnCode || row.hsn || "",
            weight: row.weight || 0,
            rate: row.rate || 0,
            taxableValue: row.taxableValue,
            cgstAmount: row.cgst,
            sgstAmount: row.sgst,
            total: row.total,
            editable: true,
          },
          sgstPct,
          cgstPct,
        ));
    }

    const firstRow = buildRow(
      {
        sno: "1",
        particular: "NEW GOLD ORNAMENTS",
        hsn: params.hsn || gst.hsn || "",
        weight: params.weight ?? gst.netWeight ?? 0,
        rate: params.rate ?? 0,
        editable: false,
      },
      sgstPct,
      cgstPct,
    );
    return [
      firstRow,
      buildRow({ sno: "2", particular: "", editable: true }, sgstPct, cgstPct),
      buildRow({ sno: "3", particular: "", editable: true }, sgstPct, cgstPct),
    ];
  }, [params.billRows, params.hsn, params.weight, params.rate, gst.hsn, gst.netWeight, sgstPct, cgstPct]);

  const [rows, setRows] = useState(initialRows);
  const [bank, setBank] = useState({
    accountName: params.bankDetails?.accountName || "",
    accountNo: params.bankDetails?.accountNo || "",
    ifsc: params.bankDetails?.ifsc || "",
    branch: params.bankDetails?.branch || "",
  });

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        return buildRow(next, sgstPct, cgstPct);
      }),
    );
  };

  const subtotal = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        weight: acc.weight + toNum(row.weight, 0),
        taxableValue: acc.taxableValue + toNum(row.taxableValue, 0),
        cgstAmount: acc.cgstAmount + toNum(row.cgstAmount, 0),
        sgstAmount: acc.sgstAmount + toNum(row.sgstAmount, 0),
        total: acc.total + toNum(row.total, 0),
      }),
      { weight: 0, taxableValue: 0, cgstAmount: 0, sgstAmount: 0, total: 0 },
    );
  }, [rows]);

  const topDate = params.date || new Date().toLocaleDateString("en-GB");
  const invoiceNo = params.billNo || params.invoiceNo || "N/A";
  const displayedInvoiceValue =
    toNum(params.totalInvoiceValue, 0) > 0 ? fmt(params.totalInvoiceValue, 2) : fmt(subtotal.total, 2);
  const customerAddress = [customer.addressLine1, customer.addressLine2, customer.address].filter(Boolean).join("\n") || customer.address || "";
  const customerGstin = customer.gstin || customer.gst || "N/A";
  const escapedAddress = String(customerAddress || "N/A").replace(/\n/g, "<br/>");

  const handlePrint = async () => {
    try {
      const rowsHtml = rows.map((row) => `
        <tr>
          <td>${row.sno || ""}</td>
          <td>${row.particular || ""}</td>
          <td>${row.hsn || ""}</td>
          <td>${row.weight || ""}</td>
          <td>${row.rate || ""}</td>
          <td>${row.taxableValue || ""}</td>
          <td>${row.cgstAmount || ""}</td>
          <td>${row.sgstAmount || ""}</td>
          <td>${row.total || ""}</td>
        </tr>
      `).join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
              .sheet { border: 1px solid #222; padding: 8px; }
              .header { width: 100%; border-collapse: collapse; }
              .header td { border: 1px solid #222; text-align: center; vertical-align: middle; }
              .logo { width: 72px; font-weight: 800; font-size: 18px; }
              .line { width: 26px; border-top: 1px solid #222; margin: 0 auto 10px; }
              .firm-name { font-size: 16px; font-weight: 800; }
              .firm-sub { font-size: 11px; }
              .gst { font-size: 12px; font-weight: 700; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; }
              .meta td, .details td, .details th, .bank td, .sign td, .invoice td { border: 1px solid #222; }
              .meta td, .bank td, .invoice td { padding: 6px; font-size: 12px; }
              .cust { border: 1px solid #222; border-top: 0; padding: 8px; }
              .cust-title { font-weight: 700; margin-bottom: 4px; }
              .details th, .details td { padding: 6px 4px; font-size: 11px; text-align: center; }
              .details th:nth-child(2), .details td:nth-child(2) { text-align: left; }
              .invoice-label { font-weight: 800; }
              .invoice-value { text-align: right; font-weight: 800; }
              .bank-title { text-align: center; font-weight: 800; padding: 6px; }
              .sign td { height: 70px; vertical-align: bottom; text-align: center; font-weight: 700; padding-bottom: 10px; }
              .footer { border: 1px solid #222; border-top: 0; text-align: center; font-weight: 700; padding: 6px; }
            </style>
          </head>
          <body>
            <div class="sheet">
              <table class="header">
                <tr>
                  <td class="logo"><div class="line"></div>${FIRM.leftMark}</td>
                  <td>
                    <div class="firm-name">${FIRM.name}</div>
                    <div class="firm-sub">${FIRM.address1}</div>
                    <div class="firm-sub">${FIRM.address2}</div>
                    <div class="firm-sub">${FIRM.address3}</div>
                    <div class="firm-sub">${FIRM.phone} ${FIRM.mobile}</div>
                    <div class="firm-sub">${FIRM.email}</div>
                    <div class="gst">GST : ${FIRM.gstin}</div>
                  </td>
                  <td class="logo"><div class="line"></div>${FIRM.rightMark}</td>
                </tr>
              </table>
              <table class="meta">
                <tr>
                  <td><b>Invoice No</b></td><td>${invoiceNo}</td>
                  <td><b>Date</b></td><td>${topDate}</td>
                </tr>
              </table>
              <div class="cust">
                <div class="cust-title">Customer Name & Address</div>
                <div><b>${customer.name || customer.customerName || "N/A"}</b></div>
                <div>${escapedAddress}</div>
                <div style="margin-top:6px;"><b>GST NO : ${customerGstin}</b></div>
              </div>
              <table class="details">
                <tr>
                  <th>S No</th><th>Particular</th><th>HSN Code</th><th>Weight</th><th>Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>Total</th>
                </tr>
                ${rowsHtml}
                <tr>
                  <td></td><td><b>Sub Total</b></td><td></td>
                  <td>${fmt(subtotal.weight, 3)}</td>
                  <td></td>
                  <td>${fmt(subtotal.taxableValue, 2)}</td>
                  <td>${fmt(subtotal.cgstAmount, 2)}</td>
                  <td>${fmt(subtotal.sgstAmount, 2)}</td>
                  <td>${fmt(subtotal.total, 2)}</td>
                </tr>
              </table>
              <table class="invoice">
                <tr><td class="invoice-label">TOTAL INVOICE VALUE</td><td class="invoice-value">${displayedInvoiceValue}</td></tr>
              </table>
              <table class="bank">
                <tr><td class="bank-title" colspan="2">Bank Details</td></tr>
                <tr><td>Account Name</td><td>${bank.accountName || ""}</td></tr>
                <tr><td>Account No</td><td>${bank.accountNo || ""}</td></tr>
                <tr><td>IFSC</td><td>${bank.ifsc || ""}</td></tr>
                <tr><td>Branch</td><td>${bank.branch || ""}</td></tr>
              </table>
              <table class="sign"><tr><td>${FIRM.signatureLeft}</td><td>${FIRM.signatureRight}</td></tr></table>
              <div class="footer">${FIRM.footer}</div>
            </div>
          </body>
        </html>`;

      await Print.printAsync({ html });
    } catch (error) {
      console.error("GST print failed:", error);
      Alert.alert("Error", "Failed to print GST bill.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#1E88E5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate("Home")}>
          <Icon name="home" size={22} color="#1E88E5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handlePrint}>
          <Icon name="printer" size={22} color="#1E88E5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.page}>
	        <View style={styles.firmHeader}>
            <View style={styles.firmLogoCell}>
              <View style={styles.logoTopLine} />
              <Text style={styles.firmLogoText}>{FIRM.leftMark}</Text>
            </View>
            <View style={styles.firmCenter}>
              <Text style={styles.firmName}>{FIRM.name}</Text>
              <Text style={styles.firmSub}>{FIRM.address1}</Text>
              <Text style={styles.firmSub}>{FIRM.address2}</Text>
              <Text style={styles.firmSub}>{FIRM.address3}</Text>
              <Text style={styles.firmMeta}>
                {FIRM.phone}    {FIRM.mobile}    {FIRM.email}
              </Text>
              <Text style={styles.firmGstin}>GST : {FIRM.gstin}</Text>
            </View>
            <View style={styles.firmLogoCellRight}>
              <View style={styles.logoTopLine} />
              <Text style={styles.firmLogoText}>{FIRM.rightMark}</Text>
            </View>
          </View>

          <View style={styles.metaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No</Text>
              <Text style={styles.metaValue}>{invoiceNo}</Text>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{topDate}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Customer Name & Address</Text>
            <Text style={styles.customerName}>{customer.name || customer.customerName || "N/A"}</Text>
            <Text style={styles.customerText}>{customerAddress || "N/A"}</Text>
            <Text style={styles.customerGstin}>GST NO : {customerGstin}</Text>
          </View>

	          <View style={styles.table}>
	            <View style={[styles.tableRow, styles.tableHeader]}>
	              <Text style={[styles.cell, styles.snoCol]}>S{"\n"}No</Text>
	              <Text style={[styles.cell, styles.particularCol]}>Particular</Text>
	              <Text style={[styles.cell, styles.hsnCol]}>HSN{"\n"}Code</Text>
	              <Text style={[styles.cell, styles.weightCol]}>Weight</Text>
	              <Text style={[styles.cell, styles.rateCol]}>Rate</Text>
	              <Text style={[styles.cell, styles.moneyCol]}>Taxable{"\n"}Value</Text>
	              <Text style={[styles.cell, styles.moneyCol]}>CGST</Text>
	              <Text style={[styles.cell, styles.moneyCol]}>SGST</Text>
	              <Text style={[styles.cell, styles.moneyCol]}>TOTAL</Text>
            </View>

            {rows.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.snoCol]}>{row.sno}</Text>
                {row.editable ? (
                  <TextInput
                    style={[styles.cellInput, styles.particularCol]}
                    value={row.particular}
                    onChangeText={(value) => updateRow(index, "particular", value)}
                    placeholder="Enter item"
                    placeholderTextColor="#777"
                  />
                ) : (
                  <Text style={[styles.cell, styles.particularCol]}>{row.particular}</Text>
                )}
                <TextInput
                  style={[styles.cellInput, styles.hsnCol]}
                  value={row.hsn}
                  onChangeText={(value) => updateRow(index, "hsn", value)}
                  editable={row.editable}
                  placeholder={row.editable ? "HSN" : ""}
                  placeholderTextColor="#777"
                />
                <TextInput
                  style={[styles.cellInput, styles.weightCol]}
                  value={row.weight}
                  onChangeText={(value) => updateRow(index, "weight", value)}
                  keyboardType="decimal-pad"
                  editable={row.editable}
                  placeholder="0.000"
                  placeholderTextColor="#777"
                />
                <TextInput
                  style={[styles.cellInput, styles.rateCol]}
                  value={row.rate}
                  onChangeText={(value) => updateRow(index, "rate", value)}
                  keyboardType="decimal-pad"
                  editable={row.editable}
                  placeholder="0.00"
                  placeholderTextColor="#777"
                />
                <Text style={[styles.cell, styles.moneyCol]}>{row.taxableValue}</Text>
                <Text style={[styles.cell, styles.moneyCol]}>{row.cgstAmount}</Text>
                <Text style={[styles.cell, styles.moneyCol]}>{row.sgstAmount}</Text>
                <Text style={[styles.cell, styles.moneyCol]}>{row.total}</Text>
              </View>
            ))}

            <View style={[styles.tableRow, styles.subtotalRow]}>
              <Text style={[styles.cell, styles.snoCol]} />
              <Text style={[styles.cell, styles.particularCol]}>Sub Total</Text>
              <Text style={[styles.cell, styles.hsnCol]} />
              <Text style={[styles.cell, styles.weightCol]}>{fmt(subtotal.weight, 3)}</Text>
              <Text style={[styles.cell, styles.rateCol]}>{fmt(params.rate, 2)}</Text>
              <Text style={[styles.cell, styles.moneyCol]}>{fmt(subtotal.taxableValue, 2)}</Text>
              <Text style={[styles.cell, styles.moneyCol]}>{fmt(subtotal.cgstAmount, 2)}</Text>
              <Text style={[styles.cell, styles.moneyCol]}>{fmt(subtotal.sgstAmount, 2)}</Text>
              <Text style={[styles.cell, styles.moneyCol]}>{fmt(subtotal.total, 2)}</Text>
            </View>
          </View>

          <View style={styles.invoiceValueRow}>
            <Text style={styles.invoiceValueLabel}>TOTAL INVOICE VALUE</Text>
            <Text style={styles.invoiceValueAmount}>{displayedInvoiceValue}</Text>
          </View>

          <View style={styles.bankSection}>
            <Text style={styles.bankHeading}>Bank Details</Text>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Account Name</Text>
              <TextInput
                style={styles.bankInput}
                value={bank.accountName}
                onChangeText={(value) => setBank((prev) => ({ ...prev, accountName: value }))}
                placeholder=""
                placeholderTextColor="#777"
              />
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Account No</Text>
              <TextInput
                style={styles.bankInput}
                value={bank.accountNo}
                onChangeText={(value) => setBank((prev) => ({ ...prev, accountNo: value }))}
                placeholder=""
                placeholderTextColor="#777"
              />
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>IFSC</Text>
              <TextInput
                style={styles.bankInput}
                value={bank.ifsc}
                onChangeText={(value) => setBank((prev) => ({ ...prev, ifsc: value }))}
                placeholder=""
                placeholderTextColor="#777"
              />
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Branch</Text>
              <TextInput
                style={styles.bankInput}
                value={bank.branch}
                onChangeText={(value) => setBank((prev) => ({ ...prev, branch: value }))}
                placeholder=""
                placeholderTextColor="#777"
              />
            </View>
          </View>

	          <View style={styles.signatureRow}>
	            <View style={styles.signatureCell}>
	              <Text style={styles.signatureText}>{FIRM.signatureLeft}</Text>
	            </View>
	            <View style={styles.signatureCell}>
	              <Text style={styles.signatureText}>{FIRM.signatureRight}</Text>
	            </View>
	          </View>
          <Text style={styles.footerText}>{FIRM.footer}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF1F4" },
  headerBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 28,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
  },
  content: { padding: 14, alignItems: "center" },
  page: {
    width: "100%",
    maxWidth: 820,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#202020",
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  firmHeader: { flexDirection: "row", borderWidth: 1, borderColor: "#222" },
  firmLogoCell: {
    width: 66,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#222",
    paddingVertical: 8,
  },
  firmLogoCellRight: {
    width: 66,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#222",
    paddingVertical: 8,
  },
  logoTopLine: {
    width: 24,
    borderTopWidth: 1,
    borderTopColor: "#222",
    marginBottom: 10,
  },
  firmCenter: { flex: 1, alignItems: "center", paddingVertical: 6, paddingHorizontal: 8 },
  firmName: { fontSize: 14, fontWeight: "800", color: "#111", textAlign: "center" },
  firmSub: { fontSize: 9, color: "#111", textAlign: "center" },
  firmMeta: { fontSize: 8, color: "#111", textAlign: "center", marginTop: 3 },
  firmGstin: { fontSize: 10, fontWeight: "700", color: "#111", marginTop: 2 },
  firmLogoText: { fontSize: 17, fontWeight: "800", color: "#111" },
  metaTable: { borderWidth: 1, borderColor: "#222", borderTopWidth: 0 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaLabel: {
    width: 76,
    borderRightWidth: 1,
    borderRightColor: "#222",
    padding: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#111",
  },
  metaValue: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#222",
    padding: 4,
    fontSize: 10,
    color: "#111",
  },
  section: { borderWidth: 1, borderColor: "#222", borderTopWidth: 0, padding: 6 },
  sectionHeading: { fontSize: 11, fontWeight: "700", color: "#111", marginBottom: 4 },
  customerName: { fontSize: 11, fontWeight: "700", color: "#111", marginBottom: 2 },
  customerText: { fontSize: 10, color: "#111", lineHeight: 14 },
  customerGstin: { fontSize: 10, fontWeight: "700", color: "#111", marginTop: 6 },
  table: { borderWidth: 1, borderColor: "#222", borderTopWidth: 0, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#222", alignItems: "stretch" },
  tableHeader: { backgroundColor: "#f2f2f2" },
  cell: {
    paddingHorizontal: 3,
    paddingVertical: 4,
    fontSize: 7.5,
    color: "#111",
    borderRightWidth: 1,
    borderRightColor: "#222",
    textAlign: "center",
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  cellInput: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    fontSize: 7.5,
    color: "#111",
    borderRightWidth: 1,
    borderRightColor: "#222",
    textAlign: "center",
    minHeight: 26,
    includeFontPadding: false,
  },
  snoCol: { flex: 0.7 },
  particularCol: { flex: 1.9 },
  hsnCol: { flex: 1.15 },
  weightCol: { flex: 1.0 },
  rateCol: { flex: 1.05 },
  moneyCol: { flex: 1.25 },
  subtotalRow: { backgroundColor: "#f7f7f7" },
  invoiceValueRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#222",
  },
  invoiceValueLabel: { flex: 1, padding: 6, fontSize: 11, fontWeight: "800", color: "#111" },
  invoiceValueAmount: { width: 120, padding: 6, fontSize: 11, fontWeight: "800", color: "#111", textAlign: "right" },
  bankSection: { borderWidth: 1, borderTopWidth: 0, borderColor: "#222" },
  bankHeading: { textAlign: "center", fontSize: 11, fontWeight: "800", color: "#111", paddingVertical: 4 },
  bankRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#222" },
  bankLabel: { width: 110, padding: 6, fontSize: 10, color: "#111", borderRightWidth: 1, borderRightColor: "#222" },
  bankInput: { flex: 1, padding: 6, fontSize: 10, color: "#111" },
  signatureRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#222",
  },
  signatureCell: {
    flex: 1,
    minHeight: 64,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 10,
  },
  signatureText: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
  },
  footerText: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#222",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    paddingVertical: 4,
  },
});

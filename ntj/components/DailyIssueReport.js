import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/Feather";
import { base_url } from "./config";

// ─── helpers ────────────────────────────────────────────────────────────────

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const startOf = (d) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};
const endOf = (d) => {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
};

const fmtWeight = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(3) + "g" : "0.000g";
};

const formatDate = (d) => {
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const getBillInvoiceNo = (r) => {
  const raw = r.billNo || r.invoiceNo || r.billNumber || "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits) return String(parseInt(digits, 10)).padStart(5, "0");
  const id = String(r._id || r.id || "");
  return id ? id.slice(-5).toUpperCase() : "-";
};

const getBillIssueWeight = (r) => {
  const direct = Number(r.totalIssueWeight ?? r.issueTotal ?? NaN);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return (r.issueItems || []).reduce(
    (s, it) => s + Number(it.gross || it.weight || 0),
    0
  );
};

const getBillReceiptWeight = (r) => {
  const direct = Number(r.totalReceiptWeight ?? NaN);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  return (r.receiptItems || []).reduce(
    (s, it) => s + Number(it.gross || it.weight || 0),
    0
  );
};

const getSuspenseIssueWeight = (row) => {
  const t = Number(row?.suspense?.totals?.totalIssueWeight ?? NaN);
  if (Number.isFinite(t)) return t;
  return (row?.suspense?.issueItems || []).reduce(
    (s, it) => s + Number(it.weight || it.gross || 0),
    0
  );
};

const getSuspenseReceiptWeight = (row) => {
  const t = Number(row?.suspense?.totals?.totalReceiptWeight ?? NaN);
  if (Number.isFinite(t)) return t;
  return (row?.suspense?.receiptItems || []).reduce(
    (s, it) => s + Number(it.weight || it.gross || 0),
    0
  );
};

const getSuspenseDate = (row) =>
  parseDate(row?.customer?.date || row?.createdAt || row?.date);

const getSuspenseInvoiceNo = (row) => {
  const id = String(row._id || "");
  return id ? `S-${id.slice(-5).toUpperCase()}` : "-";
};

// ─── component ──────────────────────────────────────────────────────────────

const DATE_FILTERS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "custom", label: "Custom Date" },
];

export default function DailyIssueReport({ navigation }) {
  const [filter, setFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo] = useState(null);
  const [iosPickerField, setIosPickerField] = useState(null);
  const [iosPickerDate, setIosPickerDate] = useState(new Date());

  const [b2bRows, setB2bRows] = useState([]);
  const [suspenseRows, setSuspenseRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── date range ────────────────────────────────────────────────────────────
  const getDateRange = useCallback(() => {
    const now = new Date();
    if (filter === "today") return { from: startOf(now), to: endOf(now) };
    if (filter === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOf(y), to: endOf(y) };
    }
    if (filter === "week") {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setDate(mon.getDate() - diff);
      return { from: startOf(mon), to: endOf(now) };
    }
    if (customFrom && customTo)
      return { from: startOf(customFrom), to: endOf(customTo) };
    return { from: startOf(now), to: endOf(now) };
  }, [filter, customFrom, customTo]);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b2bRes, suspenseRes] = await Promise.all([
        fetch(`${base_url}/billSummary?billType=B2B`),
        fetch(`${base_url}/suspense`),
      ]);
      if (b2bRes.ok) {
        const data = await b2bRes.json();
        setB2bRows(Array.isArray(data) ? data : []);
      }
      if (suspenseRes.ok) {
        const raw = await suspenseRes.json();
        const rows = Array.isArray(raw?.transactions)
          ? raw.transactions
          : Array.isArray(raw)
          ? raw
          : [];
        setSuspenseRows(rows);
      }
    } catch (e) {
      console.error("DailyIssueReport fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", fetchData);
    return unsub;
  }, [navigation, fetchData]);

  // ── filter by date ────────────────────────────────────────────────────────
  const { from, to } = getDateRange();

  const inRange = (dateValue) => {
    const d = parseDate(dateValue);
    if (!d) return false;
    return d >= from && d <= to;
  };

  const filteredB2B = b2bRows.filter((r) =>
    inRange(r.createdAt || r.date || r.billDate)
  );
  const filteredSuspense = suspenseRows.filter((r) =>
    inRange(r?.customer?.date || r?.createdAt || r?.date)
  );

  // ── unified bill list ─────────────────────────────────────────────────────
  const allBills = [
    ...filteredB2B.map((r) => {
      const dealerTag = String(r.dealerType || "").toUpperCase();
      const source =
        dealerTag === "DEALER" || dealerTag === "SUPPLIER" ? "Dealer" : "B2B";
      return {
        key: String(r._id || r.id || r.billNo || Math.random()),
        invoiceNo: getBillInvoiceNo(r),
        issueWeight: getBillIssueWeight(r),
        receiptWeight: getBillReceiptWeight(r),
        date: parseDate(r.createdAt || r.date),
        source,
      };
    }),
    ...filteredSuspense.map((r) => ({
      key: String(r._id || r.id || Math.random()),
      invoiceNo: getSuspenseInvoiceNo(r),
      issueWeight: getSuspenseIssueWeight(r),
      receiptWeight: getSuspenseReceiptWeight(r),
      date: getSuspenseDate(r),
      source: "Suspense",
    })),
  ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const totalBills = allBills.length;
  const totalIssue = allBills.reduce((s, b) => s + b.issueWeight, 0);
  const totalReceipt = allBills.reduce((s, b) => s + b.receiptWeight, 0);
  const netMovement = totalIssue - totalReceipt;

  // ── date picker ───────────────────────────────────────────────────────────
  const openPicker = (field) => {
    const initial = field === "to" ? customTo || new Date() : customFrom || new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        onChange: (evt, d) => {
          if (evt?.type === "dismissed" || !d) return;
          if (field === "from") setCustomFrom(d);
          else setCustomTo(d);
        },
      });
      return;
    }
    setIosPickerDate(initial);
    setIosPickerField(field);
  };

  // ── date range label ──────────────────────────────────────────────────────
  const getRangeLabel = () => {
    if (filter === "today") return `Today — ${formatDate(from)}`;
    if (filter === "yesterday") return `Yesterday — ${formatDate(from)}`;
    if (filter === "week") return `${formatDate(from)} to ${formatDate(to)}`;
    if (filter === "custom" && customFrom && customTo)
      return `${formatDate(customFrom)} to ${formatDate(customTo)}`;
    return "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#7A5C00" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Issue Report</Text>
        <TouchableOpacity
          onPress={fetchData}
          style={styles.headerIconBtn}
          disabled={loading}
        >
          <Icon name={loading ? "loader" : "refresh-cw"} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* DATE FILTER TABS */}
        <View style={styles.tabRow}>
          {DATE_FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, filter === key && styles.tabActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.tabText, filter === key && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CUSTOM DATE PICKERS */}
        {filter === "custom" && (
          <View style={styles.customDateRow}>
            <TouchableOpacity style={styles.dateBox} onPress={() => openPicker("from")}>
              <Text style={styles.dateBoxLabel}>From</Text>
              <Text style={styles.dateBoxValue}>
                {customFrom ? formatDate(customFrom) : "Select"}
              </Text>
            </TouchableOpacity>
            <View style={styles.dateArrow}>
              <Icon name="arrow-right" size={16} color="#B8860B" />
            </View>
            <TouchableOpacity style={styles.dateBox} onPress={() => openPicker("to")}>
              <Text style={styles.dateBoxLabel}>To</Text>
              <Text style={styles.dateBoxValue}>
                {customTo ? formatDate(customTo) : "Select"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* iOS PICKER */}
        {Platform.OS === "ios" && iosPickerField && (
          <View style={styles.iosPicker}>
            <DateTimePicker
              value={iosPickerDate}
              mode="date"
              display="spinner"
              onChange={(evt, d) => {
                if (evt?.type === "dismissed") {
                  setIosPickerField(null);
                  return;
                }
                if (d) setIosPickerDate(d);
              }}
            />
            <TouchableOpacity
              style={styles.iosPickerDoneBtn}
              onPress={() => {
                if (iosPickerField === "from") setCustomFrom(iosPickerDate);
                else setCustomTo(iosPickerDate);
                setIosPickerField(null);
              }}
            >
              <Text style={styles.iosPickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#B8860B"
            style={{ marginTop: 50 }}
          />
        ) : (
          <>
            {/* RANGE LABEL */}
            {getRangeLabel() ? (
              <Text style={styles.rangeLabel}>{getRangeLabel()}</Text>
            ) : null}

            {/* SUMMARY CARDS 2x2 */}
            <View style={styles.cardsGrid}>
              <View style={[styles.card, { backgroundColor: "#FFF3CD" }]}>
                <Text style={styles.cardLabel}>Total Bills</Text>
                <Text style={[styles.cardValue, { color: "#7A5C00" }]}>
                  {totalBills}
                </Text>
              </View>
              <View style={[styles.card, { backgroundColor: "#FFEBEE" }]}>
                <Text style={styles.cardLabel}>Total Issue</Text>
                <Text style={[styles.cardValue, { color: "#C62828" }]}>
                  {fmtWeight(totalIssue)}
                </Text>
              </View>
              <View style={[styles.card, { backgroundColor: "#E8F5E9" }]}>
                <Text style={styles.cardLabel}>Total Receipt</Text>
                <Text style={[styles.cardValue, { color: "#1B7A00" }]}>
                  {fmtWeight(totalReceipt)}
                </Text>
              </View>
              <View style={[styles.card, { backgroundColor: "#E3F2FD" }]}>
                <Text style={styles.cardLabel}>Net Movement</Text>
                <Text
                  style={[
                    styles.cardValue,
                    { color: netMovement >= 0 ? "#C62828" : "#1B7A00" },
                  ]}
                >
                  {fmtWeight(Math.abs(netMovement))}
                </Text>
              </View>
            </View>

            {/* BIG TOTAL BOX */}
            <View style={styles.totalBox}>
              <Text style={styles.totalBoxTitle}>TODAY ISSUE REPORT</Text>
              <Text style={styles.totalBoxBills}>Total Bills : {totalBills}</Text>
              <Text style={styles.totalBoxWeightLabel}>Total Issue Weight</Text>
              <Text style={styles.totalBoxWeight}>{fmtWeight(totalIssue)}</Text>
            </View>

            {/* BILL DETAIL TABLE */}
            {allBills.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2.2 }]}>Invoice No</Text>
                  <Text style={[styles.th, { flex: 1.3 }]}>Type</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Issue</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Receipt</Text>
                </View>
                {allBills.map((bill, idx) => (
                  <View
                    key={bill.key}
                    style={[
                      styles.tableRow,
                      idx % 2 === 0 && styles.tableRowAlt,
                    ]}
                  >
                    <Text style={[styles.td, { flex: 2.2, fontWeight: "700", color: "#3D2800" }]}>
                      {bill.invoiceNo}
                    </Text>
                    <Text style={[styles.td, { flex: 1.3, color: "#7A5C00", fontSize: 11 }]}>
                      {bill.source}
                    </Text>
                    <Text style={[styles.td, { flex: 2, color: "#C62828", fontWeight: "600" }]}>
                      {fmtWeight(bill.issueWeight)}
                    </Text>
                    <Text style={[styles.td, { flex: 2, color: "#1B7A00", fontWeight: "600" }]}>
                      {fmtWeight(bill.receiptWeight)}
                    </Text>
                  </View>
                ))}

                {/* TOTALS ROW */}
                <View style={styles.totalRow}>
                  <Text style={[styles.td, { flex: 3.5, fontWeight: "bold", color: "#3D2800", fontSize: 13 }]}>
                    TOTAL ({totalBills} bills)
                  </Text>
                  <Text style={[styles.td, { flex: 2, color: "#C62828", fontWeight: "bold", fontSize: 13 }]}>
                    {fmtWeight(totalIssue)}
                  </Text>
                  <Text style={[styles.td, { flex: 2, color: "#1B7A00", fontWeight: "bold", fontSize: 13 }]}>
                    {fmtWeight(totalReceipt)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Icon name="inbox" size={44} color="#B8860B" />
                <Text style={styles.emptyText}>No bills found for this period</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8E1" },

  header: {
    backgroundColor: "#7A5C00",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerIconBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    color: "#FFD700",
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    overflow: "hidden",
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  tabActive: { backgroundColor: "#7A5C00" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#7A5C00" },
  tabTextActive: { color: "#FFD700" },

  customDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 12,
  },
  dateBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    elevation: 2,
  },
  dateArrow: { marginHorizontal: 10 },
  dateBoxLabel: { fontSize: 11, color: "#B8860B", fontWeight: "600" },
  dateBoxValue: { fontSize: 14, color: "#3D2800", fontWeight: "700", marginTop: 3 },

  iosPicker: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    overflow: "hidden",
  },
  iosPickerDoneBtn: {
    backgroundColor: "#7A5C00",
    padding: 14,
    alignItems: "center",
  },
  iosPickerDoneText: { color: "#FFD700", fontWeight: "bold", fontSize: 15 },

  rangeLabel: {
    textAlign: "center",
    color: "#B8860B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 2,
  },

  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 14,
    marginTop: 14,
    gap: 10,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#FFD70040",
  },
  cardLabel: { fontSize: 12, color: "#7A5C00", fontWeight: "600", marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: "bold", color: "#3D2800" },

  totalBox: {
    marginHorizontal: 14,
    marginTop: 18,
    backgroundColor: "#3D2800",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  totalBoxTitle: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  totalBoxBills: { color: "#FFE082", fontSize: 14, marginBottom: 14 },
  totalBoxWeightLabel: { color: "#B8860B", fontSize: 12, fontWeight: "600" },
  totalBoxWeight: {
    color: "#FFD700",
    fontSize: 38,
    fontWeight: "bold",
    marginTop: 4,
    letterSpacing: 1,
  },

  table: {
    marginHorizontal: 14,
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#FFD70030",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#7A5C00",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#FFD70020",
    backgroundColor: "#fff",
  },
  tableRowAlt: { backgroundColor: "#FFFDE7" },
  td: { fontSize: 13, textAlign: "center" },

  totalRow: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: "#FFF3CD",
    borderTopWidth: 1.5,
    borderTopColor: "#FFD700",
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 50,
    marginTop: 20,
  },
  emptyText: {
    marginTop: 14,
    color: "#B8860B",
    fontSize: 15,
    fontWeight: "600",
  },
});

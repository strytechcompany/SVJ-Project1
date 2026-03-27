import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Print from "expo-print";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { base_url } from "./config";
import { deriveBalanceStateFromNet } from "./balanceUtils";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary:      "#1B4D1B",
  primaryDark:  "#143B14",
  primaryLight: "#E2FBE8",
  gold:         "#FFD700",
  white:        "#FFFFFF",
  bg:           "#F3F7F3",
  border:       "#BDD4BD",
  textDark:     "#152015",
  textMid:      "#3D5C3D",
  textLight:    "#6B8C6B",
  danger:       "#C0392B",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const fmt3      = (v) => toNum(v, 0).toFixed(3);
const normText  = (v) => String(v || "").trim().toLowerCase();
const normId    = (v) => String(v || "").trim().toLowerCase();

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB");
};

const toInputDate = (v) => {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseDate = (v) => {
  const t = String(v || "").trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayOnly = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Pick the best available balance from a bill row
const pickBillBalance = (row = {}) => {
  const candidates = [
    row?.currentBalance,
    row?.availableBalance,
    row?.finalBalance,
    row?.balanceValue,
    row?.ob,
    row?.oldBalance,
  ];
  for (const c of candidates) {
    const n = toNum(c, NaN);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

const normalizeCustomer = (c = {}) => ({
  ...c,
  id:         c?._id || c?.id || c?.customerId || "",
  customerId: c?.customerId || c?._id || c?.id || "",
  name:       c?.customerName || c?.name || "",
  phone:      c?.phoneNumber || c?.phone || c?.customerNumber || c?.mobileNumber || "",
});

const normalizeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row, i) => {
    const issue   = toNum(row?.issue ?? row?.issuePure ?? row?.totalIssueWeight ?? 0, 0);
    const receipt = toNum(row?.receipt ?? row?.receiptPure ?? row?.totalReceiptWeight ?? 0, 0);
    const balance = pickBillBalance(row);
    const rawDate = row?.date || row?.createdAt || row?.updatedAt || null;
    const pd      = rawDate ? new Date(rawDate) : null;
    return {
      id:         row?._id || row?.id || `${i}`,
      serialNo:   i + 1,
      issue,
      receipt,
      balance,
      date:       fmtDate(rawDate),
      parsedDate: pd && !Number.isNaN(pd.getTime()) ? pd : null,
      raw:        row,
    };
  });

const fetchRows = async (customer) => {
  const q = new URLSearchParams({ billType: "B2B" });
  if (customer?.customerId || customer?.id) {
    q.set("lookupCustomerId", customer.customerId || customer.id);
  }
  const res = await fetch(`${base_url}/billSummary/customer/${customer.id}?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch mini statement");
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) return rows;

  const fb = await fetch(`${base_url}/billSummary?billType=B2B`);
  if (!fb.ok) return [];
  const all   = await fb.json();
  const tName = normText(customer?.name || customer?.customerName);
  const tId   = normId(customer?.customerId || customer?.id);
  return (Array.isArray(all) ? all : []).filter((r) => {
    return normId(r?.customerId) === tId || (tName && normText(r?.customerName) === tName);
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MiniStatementPage({ navigation, route }) {
  const params = route?.params || {};
  const insets = useSafeAreaInsets();
  const headerTopInset = Platform.OS === "android"
    ? (StatusBar.currentHeight || 0)
    : insets.top;

  const [customers,        setCustomers]        = useState([]);
  const [search,           setSearch]           = useState("");
  const [showSugg,         setShowSugg]         = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [allRows,          setAllRows]          = useState([]);
  const [loadingCusts,     setLoadingCusts]     = useState(false);
  const [loadingStmt,      setLoadingStmt]      = useState(false);
  const [fromDate,         setFromDate]         = useState(toInputDate(params?.fromDate));
  const [toDate,           setToDate]           = useState(toInputDate(params?.toDate || new Date()));
  const [hasFetched,       setHasFetched]       = useState(false);

  // Autocomplete
  const filteredCusts = useMemo(() => {
    const q = normText(search);
    if (!q || selectedCustomer) return [];
    return customers.filter((c) => normText(c.name).includes(q)).slice(0, 8);
  }, [customers, search, selectedCustomer]);

  // Date-filtered rows
  const stmtRows = useMemo(() => {
    const rawFrom = parseDate(fromDate);
    const rawTo   = parseDate(toDate);
    if ((fromDate && !rawFrom) || (toDate && !rawTo)) return [];
    if (rawFrom && rawTo && rawFrom > rawTo) return [];
    const dFrom = dayOnly(rawFrom);
    const dTo   = dayOnly(rawTo);
    return allRows
      .filter((row) => {
        const rd = dayOnly(row.parsedDate);
        if (!dFrom && !dTo) return true;
        if (!rd) return false;
        if (dFrom && rd < dFrom) return false;
        if (dTo   && rd > dTo)   return false;
        return true;
      })
      .map((row, i) => ({ ...row, serialNo: i + 1 }));
  }, [allRows, fromDate, toDate]);

  const safeData = stmtRows;

  // Current balance from the most recent bill (latest updatedAt)
  const currentBalanceInfo = useMemo(() => {
    if (!allRows.length) return null;
    const latest = [...allRows].sort(
      (a, b) =>
        new Date(b.raw?.updatedAt || b.raw?.createdAt || 0).getTime() -
        new Date(a.raw?.updatedAt || a.raw?.createdAt || 0).getTime()
    )[0];
    const bal = pickBillBalance(latest?.raw || {});
    if (!Number.isFinite(bal)) return null;
    const derived = deriveBalanceStateFromNet(bal);
    const isAB    = derived.advanceBalance > 0;
    return {
      value:     Math.abs(bal).toFixed(3),
      label:     isAB ? "Advance Balance" : "Old Balance",
      isAB,
      raw:       bal,
    };
  }, [allRows]);

  // Totals (Issue & Receipt only — Final Balance = same as Current Balance)
  const totals = useMemo(() => {
    const totalIssue   = safeData.reduce((s, r) => s + toNum(r.issue,   0), 0);
    const totalReceipt = safeData.reduce((s, r) => s + toNum(r.receipt, 0), 0);
    return { totalIssue, totalReceipt };
  }, [safeData]);

  const hasDateError = useMemo(() => {
    const pF = parseDate(fromDate);
    const pT = parseDate(toDate);
    if ((fromDate && !pF) || (toDate && !pT)) return true;
    return Boolean(pF && pT && pF > pT);
  }, [fromDate, toDate]);

  // Load customers
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCusts(true);
        const res  = await fetch(`${base_url}/customers`);
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
        const list = (Array.isArray(data) ? data : [])
          .filter((c) => String(c?.customerType || "B2B").toUpperCase() === "B2B")
          .map(normalizeCustomer)
          .filter((c) => c.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(list);

        if (params?.customer) {
          const tName = normText(params.customer?.customerName || params.customer?.name);
          const tId   = normId(params.customer?._id || params.customer?.id || params.customer?.customerId);
          const found = list.find((c) => normId(c.id) === tId || normText(c.name) === tName);
          if (found) { setSelectedCustomer(found); setSearch(found.name); setShowSugg(false); }
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load customer list.");
      } finally {
        setLoadingCusts(false);
      }
    };
    load();
  }, [params?.customer]);

  // Load statement rows
  useEffect(() => {
    if (!selectedCustomer) { setAllRows([]); setHasFetched(false); return; }
    const load = async () => {
      try {
        setLoadingStmt(true);
        const raw  = await fetchRows(selectedCustomer);
        const norm = normalizeRows(raw);
        norm.sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));
        setAllRows(norm);
        setHasFetched(true);
      } catch (e) {
        console.error(e);
        setAllRows([]); setHasFetched(true);
        Alert.alert("Error", "Failed to load mini statement.");
      } finally {
        setLoadingStmt(false);
      }
    };
    load();
  }, [selectedCustomer?.customerId, selectedCustomer?.id]);

  const onSearchChange = (v) => {
    setSearch(v);
    setShowSugg(true);
    if (selectedCustomer && normText(v) !== normText(selectedCustomer.name)) {
      setSelectedCustomer(null); setAllRows([]); setHasFetched(false);
    }
  };

  const onSelectCustomer = (c) => {
    setSelectedCustomer(c); setSearch(c.name); setShowSugg(false);
    setAllRows([]); setHasFetched(false);
  };

  // Thermal print HTML
  const thermalHTML = () => {
    const rows = safeData.map((r) => `
      <tr>
        <td>${r.serialNo}</td>
        <td>${esc(fmt3(r.issue))}</td>
        <td>${esc(fmt3(r.receipt))}</td>
        <td>${esc(Number.isFinite(r.balance) ? fmt3(r.balance) : "-")}</td>
        <td>${esc(r.date)}</td>
      </tr>`).join("");

    const curBal    = currentBalanceInfo
      ? `${currentBalanceInfo.label}: ${currentBalanceInfo.value} g`
      : "-";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:11px;color:#000;background:#fff;width:80mm;margin:0 auto;padding:4mm 3mm}
.c{text-align:center}.b{font-weight:bold}
.div{border-top:1px dashed #000;margin:4px 0}
.shop{font-size:15px;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:1px}
.meta{display:flex;justify-content:space-between;font-size:10px;margin:1px 0}
table{width:100%;border-collapse:collapse;margin:4px 0;font-size:10px}
th{border-top:1px solid #000;border-bottom:1px solid #000;padding:2px 1px;text-align:center;font-weight:bold}
td{padding:2px 1px;text-align:center}
tr:last-child td{border-bottom:1px solid #000}
.sr{display:flex;justify-content:space-between;font-size:11px;margin:2px 0}
.sr.fin{font-weight:bold;font-size:12px}
.foot{text-align:center;font-size:9px;margin-top:6px}
</style></head><body>
<div class="shop">NTJ JEWELLERY</div>
<div class="c" style="font-size:11px">Mini Statement</div>
<div class="div"></div>
<div class="meta"><span>Name:</span><span>${esc(selectedCustomer?.name || "-")}</span></div>
<div class="meta"><span>Phone:</span><span>${esc(selectedCustomer?.phone || "-")}</span></div>
<div class="meta"><span>From:</span><span>${esc(fromDate || "-")}</span></div>
<div class="meta"><span>To:</span><span>${esc(toDate || "-")}</span></div>
<div class="meta"><span>Cur. Bal:</span><span>${esc(curBal)}</span></div>
<div class="div"></div>
<table>
<thead><tr><th>#</th><th>Issue</th><th>Receipt</th><th>Bal</th><th>Date</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="div"></div>
<div class="sr"><span>Total Issue:</span><span>${esc(fmt3(totals.totalIssue))} g</span></div>
<div class="sr"><span>Total Receipt:</span><span>${esc(fmt3(totals.totalReceipt))} g</span></div>
<div class="div"></div>
<div class="sr fin"><span>Final Balance (${esc(currentBalanceInfo?.label || "Balance")}):</span><span>${esc(currentBalanceInfo ? currentBalanceInfo.value : "-")} g</span></div>
<div class="div"></div>
<div class="foot">Thank you for your business!</div>
</body></html>`;
  };

  const handlePrint = async () => {
    if (!safeData.length) { Alert.alert("No data", "No transactions found to print."); return; }
    try {
      await Print.printAsync({ html: thermalHTML() });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to print.");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Fixed header – OUTSIDE ScrollView so it never scrolls away */}
      <View style={[styles.header, { paddingTop: headerTopInset + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mini Statement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Customer Name</Text>
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search B2B customer..."
            placeholderTextColor="#9BB09B"
            style={styles.searchInput}
          />
          {loadingCusts && <ActivityIndicator style={styles.loader} color={C.primary} />}

          {showSugg && filteredCusts.length > 0 && !selectedCustomer && (
            <View style={styles.suggBox}>
              {filteredCusts.map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.suggItem, i === filteredCusts.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => onSelectCustomer(c)}
                >
                  <Text style={styles.suggName}>{c.name}</Text>
                  <Text style={styles.suggMeta}>{c.phone || "No phone"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date Filter Card (shows after customer selected) */}
        {selectedCustomer && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Date Filter</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterFieldLeft}>
                <Text style={styles.filterLabel}>From</Text>
                <TextInput
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9BB09B"
                  style={styles.filterInput}
                />
              </View>
              <View style={styles.filterFieldRight}>
                <Text style={styles.filterLabel}>To</Text>
                <TextInput
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9BB09B"
                  style={styles.filterInput}
                />
              </View>
            </View>
            {hasDateError && <Text style={styles.dateError}>⚠ Invalid date range.</Text>}
          </View>
        )}

        {/* Statement content */}
        {selectedCustomer && (
          loadingStmt ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.loadingTxt}>Loading statement...</Text>
            </View>
          ) : safeData.length > 0 ? (
            <>
              {/* Current Balance Banner */}
              {currentBalanceInfo && (
                <View style={[styles.balanceBanner, currentBalanceInfo.isAB && styles.balanceBannerAB]}>
                  <View>
                    <Text style={styles.balanceBannerTitle}>Current Balance</Text>
                    <Text style={styles.balanceBannerSub}>{currentBalanceInfo.label}</Text>
                  </View>
                  <Text style={styles.balanceBannerValue}>{currentBalanceInfo.value} g</Text>
                </View>
              )}

              {/* Customer info strip */}
              <View style={styles.infoStrip}>
                <View style={styles.infoField}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{selectedCustomer.name}</Text>
                </View>
                <View style={styles.infoFieldRight}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{selectedCustomer.phone || "-"}</Text>
                </View>
                <View style={styles.infoFieldFull}>
                  <Text style={styles.infoLabel}>Period</Text>
                  <Text style={styles.infoValue}>{fromDate || "-"}  →  {toDate || "-"}</Text>
                </View>
              </View>

              {/* Transactions Table */}
              <View style={styles.tableCard}>
                <Text style={styles.cardLabel}>Transactions</Text>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.hCell, styles.snoCol]}>#</Text>
                  <Text style={[styles.cell, styles.hCell]}>Issue</Text>
                  <Text style={[styles.cell, styles.hCell]}>Receipt</Text>
                  <Text style={[styles.cell, styles.hCell]}>Balance</Text>
                  <Text style={[styles.cell, styles.hCell, styles.dateCol]}>Date</Text>
                </View>
                {safeData.map((row, idx) => (
                  <View
                    key={row.id}
                    style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  >
                    <Text style={[styles.cell, styles.snoCol]}>{row.serialNo}</Text>
                    <Text style={styles.cell}>{fmt3(row.issue)}</Text>
                    <Text style={styles.cell}>{fmt3(row.receipt)}</Text>
                    <Text style={styles.cell}>
                      {Number.isFinite(row.balance) ? fmt3(row.balance) : "-"}
                    </Text>
                    <Text style={[styles.cell, styles.dateCol]}>{row.date}</Text>
                  </View>
                ))}
              </View>

              {/* Balance Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Balance Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Total Issue</Text>
                  <Text style={styles.summaryVal}>{fmt3(totals.totalIssue)} g</Text>
                </View>
                <View style={styles.divLine} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Total Receipt</Text>
                  <Text style={styles.summaryVal}>{fmt3(totals.totalReceipt)} g</Text>
                </View>
                <View style={styles.divLine} />
                <View style={[styles.summaryRow, { paddingTop: 12 }]}>
                  <Text style={styles.finalLbl}>
                    Final Balance{"\n"}
                    <Text style={{ fontSize: 10, fontWeight: "600", color: C.textMid }}>
                      {currentBalanceInfo?.label || "Current Balance"}
                    </Text>
                  </Text>
                  <Text style={[
                    styles.finalVal,
                    currentBalanceInfo?.isAB && { color: C.danger },
                  ]}>
                    {currentBalanceInfo ? currentBalanceInfo.value : "-"} g
                  </Text>
                </View>
              </View>

              {/* Print */}
              <TouchableOpacity style={styles.printBtn} onPress={handlePrint} activeOpacity={0.82}>
                <Text style={styles.printBtnTxt}>🖨  Print Statement</Text>
              </TouchableOpacity>
            </>
          ) : hasFetched ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTxt}>No transactions found for this period.</Text>
            </View>
          ) : null
        )}

        {!selectedCustomer && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>Search and select a B2B customer to view their statement.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Fixed Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingBottom: 12,
    minHeight: 64,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  backBtnTxt: { color: C.white, fontSize: 13, fontWeight: "700" },
  headerTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerSpacer: { width: 60 },

  // ── Scroll
  scroll:       { flex: 1 },
  scrollContent: { paddingBottom: 36 },

  // ── Card (generic white box)
  card: {
    backgroundColor: C.white,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // ── Search
  searchInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textDark,
    backgroundColor: C.white,
  },
  loader: { marginTop: 8 },
  suggBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  suggItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2F2E2",
  },
  suggName: { fontSize: 14, fontWeight: "700", color: C.primary },
  suggMeta: { fontSize: 11, color: C.textLight, marginTop: 2 },

  // ── Date filter
  filterRow: { flexDirection: "row" },
  filterFieldLeft:  { flex: 1, marginRight: 6 },
  filterFieldRight: { flex: 1, marginLeft: 6 },
  filterLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: C.textDark,
    backgroundColor: C.white,
  },
  dateError: { marginTop: 6, color: C.danger, fontSize: 11, fontWeight: "600" },

  // ── Loading / empty
  loadingBlock: { paddingVertical: 32, alignItems: "center" },
  loadingTxt:   { marginTop: 10, color: C.textMid, fontSize: 13 },
  emptyCard: {
    marginHorizontal: 12,
    marginTop: 20,
    padding: 24,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTxt: { color: C.textLight, fontSize: 13, textAlign: "center", fontWeight: "600" },

  // ── Current Balance Banner
  balanceBanner: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  balanceBannerAB: { backgroundColor: "#7B3200" },
  balanceBannerTitle: { color: C.white, fontSize: 12, fontWeight: "700", opacity: 0.85 },
  balanceBannerSub:   { color: C.white, fontSize: 15, fontWeight: "800", marginTop: 2 },
  balanceBannerValue: { color: C.gold,  fontSize: 20, fontWeight: "900" },

  // ── Info strip
  infoStrip: {
    backgroundColor: C.primaryLight,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: C.border,
  },
  infoField:      { flex: 1, marginRight: 8, marginBottom: 4 },
  infoFieldRight: { flex: 1, marginBottom: 4 },
  infoFieldFull:  { width: "100%", marginTop: 4 },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  infoValue: { fontSize: 13, fontWeight: "700", color: C.textDark },

  // ── Table
  tableCard: {
    backgroundColor: C.white,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
    overflow: "hidden",
  },
  tableHead: {
    backgroundColor: C.primary,
    borderRadius: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E0EEE0",
  },
  tableRowAlt: { backgroundColor: "#F5FAF5" },
  cell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 3,
    fontSize: 11,
    color: C.textDark,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#E0EEE0",
  },
  hCell: {
    color: C.white,
    fontWeight: "800",
    fontSize: 11,
    borderRightColor: "rgba(255,255,255,0.2)",
  },
  snoCol:  { flex: 0.4 },
  dateCol: { flex: 1.6, borderRightWidth: 0 },

  // ── Summary card
  summaryCard: {
    backgroundColor: C.white,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  summaryLbl: { fontSize: 13, color: C.textMid, fontWeight: "600" },
  summaryVal: { fontSize: 13, color: C.textDark, fontWeight: "700" },
  divLine:    { height: 1, backgroundColor: "#DFF0DF" },
  finalLbl: {
    fontSize: 13,
    color: C.primary,
    fontWeight: "800",
    flex: 1,
    lineHeight: 18,
  },
  finalVal: {
    fontSize: 17,
    color: C.primary,
    fontWeight: "900",
  },

  // ── Print button
  printBtn: {
    marginHorizontal: 12,
    marginTop: 14,
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  printBtnTxt: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

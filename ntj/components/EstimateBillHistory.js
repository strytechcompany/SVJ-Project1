import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getCreatedTimestamp = (record) => {
  const ts = new Date(record?.createdAt || record?.date || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const isEstimateExpired = (record, now = Date.now()) => {
  const createdTs = getCreatedTimestamp(record);
  if (!createdTs) return false;
  return now - createdTs >= ONE_DAY_MS;
};

export default function EstimateBillHistory({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${base_url}/estimates`);
      if (!response.ok) {
        setHistory([]);
        return;
      }
      const rows = await response.json();
      const estimateRows = Array.isArray(rows) ? rows : [];
      const now = Date.now();
      const expiredRows = estimateRows.filter((row) => row?._id && isEstimateExpired(row, now));
      const activeRows = estimateRows.filter((row) => !isEstimateExpired(row, now));

      if (expiredRows.length > 0) {
        await Promise.all(
          expiredRows.map(async (row) => {
            try {
              await fetch(`${base_url}/estimates/${row._id}`, {
                method: "DELETE",
              });
            } catch (deleteError) {
              console.error("Error deleting expired estimate:", deleteError);
            }
          })
        );
      }

      setHistory(activeRows);
    } catch (error) {
      console.error("Error loading estimate history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const openEstimateBill = (record) => {
    const items = Array.isArray(record?.items) && record.items.length > 0
      ? record.items
      : [{
        itemName: record?.itemName || "N/A",
        weight: toNum(record?.weight, 0),
        wastagePercent: toNum(record?.wastagePercent, 0),
        grossWeight: toNum(record?.grossWeight, 0),
        goldRate: toNum(record?.goldRate, 0),
        netAmount: toNum(record?.netAmount, 0),
        gst: toNum(record?.gst, 0),
        totalAmount: toNum(record?.totalAmount, 0),
      }];

    const totalFromItems = items.reduce((sum, it) => sum + toNum(it?.totalAmount, 0), 0);
    const estimateData = {
      _id: record?._id || null,
      items,
      itemName: record?.itemName || items.map((it) => it.itemName).filter(Boolean).join(", "),
      weight: toNum(record?.weight, items.reduce((sum, it) => sum + toNum(it?.weight, 0), 0)),
      wastagePercent: toNum(record?.wastagePercent, items[0]?.wastagePercent || 0),
      grossWeight: toNum(record?.grossWeight, items.reduce((sum, it) => sum + toNum(it?.grossWeight, 0), 0)),
      goldRate: toNum(record?.goldRate, items[0]?.goldRate || 0),
      netAmount: toNum(record?.netAmount, items.reduce((sum, it) => sum + toNum(it?.netAmount, 0), 0)),
      gst: toNum(record?.gst, items.reduce((sum, it) => sum + toNum(it?.gst, 0), 0)),
      totalAmount: toNum(record?.totalAmount, totalFromItems),
      enableGST: Boolean(record?.enableGST) || toNum(record?.gst, 0) > 0,
      createdAt: record?.createdAt || null,
    };

    const createdDate = record?.createdAt ? new Date(record.createdAt) : new Date();
    navigation.navigate("BillPreview", {
      customer: {
        name: record?.customerName || "Estimate Customer",
        phone: record?.customerPhone || "N/A",
        type: "Estimate",
        date: createdDate.toLocaleDateString(),
        oldBalance: 0,
        advanceBalance: 0,
        balance: 0,
        id: `estimate-${record?._id || createdDate.getTime()}`,
      },
      estimate: estimateData,
    });
  };

  const renderItem = ({ item, index }) => {
    const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
    const createdText = createdAt ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}` : "N/A";
    const itemCount = Array.isArray(item?.items) && item.items.length > 0 ? item.items.length : 1;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openEstimateBill(item)}>
        <View style={styles.cardTop}>
          <Text style={styles.title}>Estimate #{history.length - index}</Text>
          <Icon name="receipt-text-outline" size={20} color="#1B5E20" />
        </View>
        <Text style={styles.rowText}>Items: {itemCount}</Text>
        <Text style={styles.rowText}>Name: {item?.itemName || "N/A"}</Text>
        <Text style={styles.amount}>Total: Rs {toNum(item?.totalAmount, 0).toFixed(2)}</Text>
        <Text style={styles.dateText}>{createdText}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Estimate Bill History"
        backgroundColor="#2E5B17"
        left={(
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
        )}
        right={(
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading estimate history...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item?._id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No estimate bills saved yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  list: { padding: 14, paddingBottom: 30 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, color: "#555" },
  empty: { textAlign: "center", marginTop: 40, color: "#666" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eee8",
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1B5E20" },
  rowText: { color: "#333", marginBottom: 4 },
  amount: { fontWeight: "700", color: "#0D47A1", marginTop: 2 },
  dateText: { marginTop: 6, color: "#666", fontSize: 12 },
});

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function BillPreview({ route, navigation }) {
  const {
    customer = {},
    report = {},
    transactions = [],
  } = route.params || {};

  /* ---------------- SHARE ---------------- */
  const handleShare = async () => {
    try {
      await Share.share({
        message: `
AKSHAYA GOLD

Customer : ${customer.name}
Mobile   : ${customer.phone}

Cash     : ₹${report.cash}
Cash Pure: ${report.cashPure} g
        `,
      });
    } catch (error) {
      console.log(error);
    }
  };

  /* ---------------- PRINT ---------------- */
  const handlePrint = async () => {
    try {
      const printMessage = `
AKSHAYA GOLD BILL

Customer Name: ${customer.name}
Shop Name: ${customer.shop}
Customer ID: ${customer.id}
Mobile: ${customer.phone}
Balance: ${customer.balance} g
Type: ${customer.type}
Email: ${customer.email}
Advance Balance: ${customer.advance} g

REPORTS:
Total Issues (g): ${report.totalIssue}
Total Issue Pure (g): ${report.totalIssuePure}
Total Receipt (g): ${report.totalReceipt}
Total Receipt Pure (g): ${report.totalReceiptPure}
Cash (Rs): ${report.cash}
Cash Pure (g): ${report.cashPure}

TRANSACTIONS:
${transactions.map((txn, idx) => `${idx + 1}. Date: ${txn.date}, Issue: ${txn.issue}g, Issue Pure: ${txn.issuePure}g, Receipt: ${txn.receipt}g, Receipt Pure: ${txn.receiptPure}g, Cash Pure: ${txn.cashPure}g`).join('\n')}
      `;
      await Share.share({
        message: printMessage,
      });
    } catch (error) {
      console.log(error);
    }
  };

  /* ---------------- DOWNLOAD ---------------- */
  const handleDownload = async () => {
    try {
      const downloadMessage = `
AKSHAYA GOLD BILL

Customer Name: ${customer.name}
Shop Name: ${customer.shop}
Customer ID: ${customer.id}
Mobile: ${customer.phone}
Balance: ${customer.balance} g
Type: ${customer.type}
Email: ${customer.email}
Advance Balance: ${customer.advance} g

REPORTS:
Total Issues (g): ${report.totalIssue}
Total Issue Pure (g): ${report.totalIssuePure}
Total Receipt (g): ${report.totalReceipt}
Total Receipt Pure (g): ${report.totalReceiptPure}
Cash (Rs): ${report.cash}
Cash Pure (g): ${report.cashPure}

TRANSACTIONS:
${transactions.map((txn, idx) => `${idx + 1}. Date: ${txn.date}, Issue: ${txn.issue}g, Issue Pure: ${txn.issuePure}g, Receipt: ${txn.receipt}g, Receipt Pure: ${txn.receiptPure}g, Cash Pure: ${txn.cashPure}g`).join('\n')}
      `;
      await Share.share({
        message: downloadMessage,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={26} />
        </TouchableOpacity>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handlePrint}>
            <Icon name="printer" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownload}>
            <Icon name="download" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Icon name="share-variant" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* TOP DETAILS */}
        <View style={styles.topRow}>
          {/* LEFT */}
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>Customer Name</Text>
            <Text style={styles.value}>{customer.name}</Text>

            <Text style={styles.label}>Shop Name</Text>
            <Text style={styles.value}>{customer.shop}</Text>

            <Text style={styles.label}>Customer ID</Text>
            <Text style={styles.value}>{customer.id}</Text>

            <Text style={styles.label}>Mobile</Text>
            <Text style={styles.value}>{customer.phone}</Text>

            <Text style={styles.label}>Balance</Text>
            <Text style={styles.value}>{customer.balance} (g)</Text>
          </View>

          {/* RIGHT */}
          <View style={{ width: "48%", alignItems: "flex-end" }}>
            <Text style={styles.shopName}>AKSHAYA GOLD</Text>

            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{customer.type}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{customer.email}</Text>

            <Text style={styles.label}>Advance Balance</Text>
            <Text style={styles.value}>{customer.advance} (g)</Text>
          </View>
        </View>

        {/* REPORTS */}
        <Text style={styles.sectionTitle}>REPORTS</Text>

        <View style={styles.reportTable}>
          {[
            ["Total Issues (g)", report.totalIssue],
            ["Total Issue Pure (g)", report.totalIssuePure],
            ["Total Receipt (g)", report.totalReceipt],
            ["Total Receipt Pure (g)", report.totalReceiptPure],
            ["Cash (Rs)", report.cash],
            ["Cash Pure (g)", report.cashPure],
          ].map(([key, value], index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportKey}>{key}</Text>
              <Text style={styles.reportValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* TRANSACTIONS */}
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionHeaderText}>TRANSACTIONS</Text>
        </View>

        <View style={styles.transactionTableHeader}>
          <Text style={styles.th}>DATE</Text>
          <Text style={styles.th}>ISSUE (g)</Text>
          <Text style={styles.th}>ISSUE PURE</Text>
          <Text style={styles.th}>RECEIPT (g)</Text>
          <Text style={styles.th}>RECEIPT PURE</Text>
          <Text style={styles.th}>CASH PURE</Text>
        </View>

        {transactions.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No Transactions
          </Text>
        ) : (
          transactions.map((row, index) => (
            <View key={index} style={styles.transactionRow}>
              <Text style={styles.td}>{row.date}</Text>
              <Text style={styles.td}>{row.issue}</Text>
              <Text style={styles.td}>{row.issuePure}</Text>
              <Text style={styles.td}>{row.receipt}</Text>
              <Text style={styles.td}>{row.receiptPure}</Text>
              <Text style={styles.td}>{row.cashPure}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },

  headerIcons: {
    flexDirection: "row",
    gap: 16,
  },

  container: {
    padding: 16,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  shopName: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    color: "#555",
    marginTop: 6,
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
  },

  sectionTitle: {
    fontWeight: "800",
    marginVertical: 10,
  },

  reportTable: {
    borderWidth: 1,
    borderColor: "#000",
  },

  reportRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },

  reportKey: {
    width: "70%",
    padding: 8,
    fontWeight: "600",
  },

  reportValue: {
    width: "30%",
    padding: 8,
    textAlign: "right",
    fontWeight: "700",
  },

  transactionHeader: {
    backgroundColor: "#0F766E",
    marginTop: 20,
  },

  transactionHeaderText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    padding: 8,
  },

  transactionTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },

  th: {
    width: "16.6%",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 6,
  },

  transactionRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },

  td: {
    width: "16.6%",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 8,
  },
});

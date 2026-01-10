import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function BillPreview({ route, navigation }) {
  const { customer, issueItems, receiptItems, cash, summary } = route.params;

  const generateHTML = () => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            h2 { margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>BILL</h1>
          <div>
            <p><strong>Name:</strong> ${customer.name}</p>
            <p><strong>Phone:</strong> ${customer.phone}</p>
            <p><strong>Type:</strong> ${customer.type}</p>
            <p><strong>Date:</strong> ${customer.date}</p>
            <p><strong>OB:</strong> ${customer.oldBalance}</p>
          </div>
          <h2>ISSUE:</h2>
          <table>
            <tr>
              <th>Name</th>
              <th>G.Weight</th>
              <th>M</th>
              <th>N.Weight</th>
              <th>Calc</th>
              <th>Pure</th>
            </tr>
            ${issueItems.map(row => `
              <tr>
                <td>${row.name}</td>
                <td>${row.gross}</td>
                <td>${row.m}</td>
                <td>${row.net}</td>
                <td>${row.calc}</td>
                <td>${row.pure}</td>
              </tr>
            `).join('')}
          </table>
          <h2>RECEIPT:</h2>
          <table>
            <tr>
              <th>Name</th>
              <th>Weight</th>
              <th>Result</th>
              <th>Calc</th>
              <th>Pure</th>
            </tr>
            ${receiptItems && receiptItems.length > 0 ? receiptItems.map(row => `
              <tr>
                <td>${row.name}</td>
                <td>${row.weight}</td>
                <td>${row.result}</td>
                <td>${row.calc}</td>
                <td>${row.pure}</td>
              </tr>
            `).join('') : '<tr><td colspan="5">No receipt items</td></tr>'}
          </table>
          <h2>CASH:</h2>
          <p>${cash ? `${cash.amount} / ${cash.rate} → ${cash.pure}` : 'N/A'}</p>
          <h2>SUMMARY:</h2>
          <table>
            <tr>
              <th>OB</th>
              <th>ISSUE</th>
              <th>RECEIPT</th>
              <th>CASH</th>
              <th>CURRENT</th>
            </tr>
            <tr>
              <td>${summary ? summary.ob : 'N/A'}</td>
              <td>${summary ? summary.issue : 'N/A'}</td>
              <td>${summary ? summary.receipt : 'N/A'}</td>
              <td>${summary ? summary.cash : 'N/A'}</td>
              <td>${summary ? summary.current : 'N/A'}</td>
            </tr>
            <tr>
              <td>${summary ? summary.obPlusIssue : 'N/A'}</td>
              <td>-</td>
              <td>${summary ? summary.receiptPlusCash : 'N/A'}</td>
              <td>=</td>
              <td>${summary ? (summary.obPlusIssue - summary.receiptPlusCash) : 'N/A'}</td>
            </tr>
          </table>
        </body>
      </html>
    `;
  };

  const handleDownload = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      Alert.alert('Download Successful', `PDF saved to: ${uri}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to download PDF');
      console.error(error);
    }
  };

  const handleShare = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to share PDF');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.page}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleDownload}>
          <Icon name="download" size={20} color="#fff" />
          <Text style={styles.buttonText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleShare}>
          <Icon name="share" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* HEADER */}
      <View style={styles.headerBox}>
        <Text style={styles.billTitle}>BILL</Text>

        <View style={styles.headerRow}>
          <View>
            <Text>Name : {customer.name}</Text>
            <Text>Phone : {customer.phone}</Text>
          </View>

          <View>
            <Text>Type : {customer.type}</Text>
            <Text>Date : {customer.date}</Text>
            <Text>OB : {customer.oldBalance}</Text>
          </View>
        </View>
      </View>

      {/* ISSUE */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>ISSUE :</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.cell}>Name</Text>
          <Text style={styles.cell}>G.Weight</Text>
          <Text style={styles.cell}>M</Text>
          <Text style={styles.cell}>N.Weight</Text>
          <Text style={styles.cell}>Calc</Text>
          <Text style={styles.cell}>Pure</Text>
        </View>

        {issueItems.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.cell}>{row.name}</Text>
            <Text style={styles.cell}>{row.gross}</Text>
            <Text style={styles.cell}>{row.m}</Text>
            <Text style={styles.cell}>{row.net}</Text>
            <Text style={styles.cell}>{row.calc}</Text>
            <Text style={styles.cell}>{row.pure}</Text>
          </View>
        ))}
      </View>

      {/* RECEIPT */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>RECEIPT :</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.cell}>Name</Text>
          <Text style={styles.cell}>Weight</Text>
          <Text style={styles.cell}>Result</Text>
          <Text style={styles.cell}>Calc</Text>
          <Text style={styles.cell}>Pure</Text>
        </View>

        {receiptItems && receiptItems.length > 0 ? (
          receiptItems.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cell}>{row.name}</Text>
              <Text style={styles.cell}>{row.weight}</Text>
              <Text style={styles.cell}>{row.result}</Text>
              <Text style={styles.cell}>{row.calc}</Text>
              <Text style={styles.cell}>{row.pure}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No receipt items</Text>
        )}
      </View>

      {/* CASH */}
      <View style={styles.cashBox}>
        <Text style={styles.sectionTitle}>CASH :</Text>
        <Text>{cash ? `${cash.amount} / ${cash.rate} → ${cash.pure}` : 'N/A'}</Text>
      </View>

      {/* SUMMARY */}
      <View style={styles.summaryBox}>
        <Text style={styles.sectionTitle}>SUMMARY :</Text>

        <View style={styles.summaryHeader}>
          <Text style={styles.sumCell}>OB</Text>
          <Text style={styles.sumCell}>ISSUE</Text>
          <Text style={styles.sumCell}>RECEIPT</Text>
          <Text style={styles.sumCell}>CASH</Text>
          <Text style={styles.sumCell}>CURRENT</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.sumCell}>{summary ? summary.ob : 'N/A'}</Text>
          <Text style={styles.sumCell}>{summary ? summary.issue : 'N/A'}</Text>
          <Text style={styles.sumCell}>{summary ? summary.receipt : 'N/A'}</Text>
          <Text style={styles.sumCell}>{summary ? summary.cash : 'N/A'}</Text>
          <Text style={styles.sumCell}>{summary ? summary.current : 'N/A'}</Text>
        </View>

        <View style={styles.finalSummaryRow}>
          <Text style={styles.sumCell}>{summary ? summary.obPlusIssue : 'N/A'}</Text>
          <Text style={styles.sumCell}>-</Text>
          <Text style={styles.sumCell}>{summary ? summary.receiptPlusCash : 'N/A'}</Text>
          <Text style={styles.sumCell}>=</Text>
          <Text style={styles.sumCell}>{summary ? (summary.obPlusIssue - summary.receiptPlusCash) : 'N/A'}</Text>
        </View>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 12, backgroundColor: "#fff" },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },

  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 10, borderRadius: 5 },

  buttonText: { color: '#fff', marginLeft: 5, fontWeight: 'bold' },

  billTitle: { textAlign: "center", fontWeight: "bold", marginBottom: 8 },

  headerBox: { borderWidth: 1, padding: 10, marginBottom: 10 },

  headerRow: { flexDirection: "row", justifyContent: "space-between" },

  sectionBox: { borderWidth: 1, marginBottom: 10 },

  sectionTitle: { margin: 6, fontWeight: "bold" },

  tableHeader: { flexDirection: "row", borderBottomWidth: 1 },

  tableRow: { flexDirection: "row", borderBottomWidth: 0.5 },

  cell: { flex: 1, textAlign: "center", paddingVertical: 6, fontSize: 11 },

  cashBox: { borderWidth: 1, padding: 10, marginBottom: 10 },

  summaryBox: { borderWidth: 1, padding: 10, marginBottom: 10 },

  finalSummaryRow: { flexDirection: "row", borderBottomWidth: 0.5, justifyContent: 'center' },

  summaryHeader: { flexDirection: "row", borderBottomWidth: 1 },

  summaryRow: { flexDirection: "row", borderBottomWidth: 0.5 },

  sumCell: { flex: 1, textAlign: "center", padding: 8, fontWeight: "bold", fontSize: 11 },

  noData: { textAlign: "center", color: "#999", marginTop: 10, fontStyle: "italic" },
});

// ntj/components/BillPreview.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Linking } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { base_url } from "./config";

export default function BillPreview({ route, navigation }) {
  const { issueItems, receiptItems, cashTable, summary, report, transactions, items, gst, estimate, suspense, order } = route.params || {};
  const customer = route.params?.customer || {};

  const isB2C = customer?.type === 'B2C';
  console.log("DEBUG: Customer in Preview 👉", customer);

  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [showUpi, setShowUpi] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [upiId, setUpiId] = useState("kaliyamoorthirengaraj@okaxis");
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [additionalCash, setAdditionalCash] = useState('');
  const [thirukkural, setThirukkural] = useState("மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன் ஆகுல நீர பிற.");

  useFocusEffect(
    useCallback(() => {
      const loadSelectedUpiId = async () => {
        try {
          const stored = await AsyncStorage.getItem('selectedUpiId');
          if (stored) {
            setUpiId(stored);
          }
        } catch (error) {
          console.error('Error loading selected UPI ID:', error);
        }
      };
      const loadThirukkural = async () => {
        try {
          const storedKural = await AsyncStorage.getItem('thirukkural_quote');
          if (storedKural) {
            setThirukkural(storedKural);
          }
        } catch (error) {
          console.error('Error loading Thirukkural:', error);
        }
      };
      loadSelectedUpiId();
      loadThirukkural();
    }, [])
  );
  const [qrDataURL, setQrDataURL] = useState('');
  const [qrReady, setQrReady] = useState(false);

  const qrRef = useRef(null);

  const totalAmount = report ? parseFloat(report.cash) : 0;

  useEffect(() => {
    const cash = parseFloat(cashAmount) || 0;
    const upi = totalAmount - cash;
    setUpiAmount(upi > 0 ? upi.toFixed(2) : '0.00');
  }, [cashAmount, totalAmount]);

  useEffect(() => {
    if (showUpi && parseFloat(upiAmount) > 0) {
      setTimeout(() => {
        if (qrRef.current) {
          qrRef.current.toDataURL((dataURL) => {
            setQrDataURL(dataURL);
          });
        }
      }, 100);
    }
  }, [upiAmount, showUpi]);

  // Calculate current/resulting balance positions
  const b2bCurrentBalance = summary ? Number(summary.current) : 0;
  const currentOD = b2bCurrentBalance > 0 ? b2bCurrentBalance.toFixed(3) : "0.000";
  const currentAB = b2bCurrentBalance < 0 ? Math.abs(b2bCurrentBalance).toFixed(3) : (customer.advanceBalance || "0.000");

  const finalBalance = summary ? summary.current : "N/A";


  // Calculate separate totals for issue and receipt
  const totalIssuePure = issueItems ? issueItems.reduce((sum, item) => sum + parseFloat(item.pure || 0), 0).toFixed(3) : '0.000';
  const totalReceiptPure = receiptItems ? receiptItems.reduce((sum, item) => sum + parseFloat(item.pure || 0), 0).toFixed(3) : '0.000';

  const generateHTML = () => {
    if (estimate) {
      return `
        <html>
          <head>
            <style>
              @page { size: 72mm 210mm; margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0; padding: 5mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 10px; }
              h2 { margin-top: 10px; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid black; padding: 4px; text-align: center; font-size: 9px; }
              th { background-color: #f2f2f2; }
              p { margin: 3px 0; }
            </style>
          </head>
          <body>
            <h1>ESTIMATE BILL</h1>
            <div>
              <p><strong>Item Name:</strong> ${estimate.itemName}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <h2>ESTIMATE DETAILS:</h2>
            <table>
              <tr>
                <th>Item Name</th>
                <th>Weight (g)</th>
                <th>W%</th>
                <th>Total Weight (g)</th>
                <th>Gold Rate</th>
                <th>Net Amount</th>
                <th>GST</th>
                <th>Total Amount</th>
              </tr>
              <tr>
                <td>${estimate.itemName}</td>
                <td>${estimate.weight}</td>
                <td>${estimate.wastagePercent}</td>
                <td>${estimate.grossWeight}</td>
                <td>${estimate.goldRate}</td>
                <td>₹${estimate.netAmount}</td>
                <td>₹${parseFloat(estimate.gst).toFixed(2)}</td>
                <td>₹${Math.round(parseFloat(estimate.totalAmount))}</td>
              </tr>
            </table>
            <h2>TOTAL:</h2>
            <p><strong>Total Amount:</strong> ₹${Math.round(parseFloat(estimate.totalAmount))}</p>
          </body>
        </html>
      `;
    } else if (order) {
      return `
        <html>
          <head>
            <style>
              @page { size: 72mm 210mm; margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0; padding: 5mm; font-size: 10px; }
              h1 { text-align: center; color: #1B4D1B; margin-bottom: 15px; font-size: 16px; }
              .order-details { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
              .order-details p { margin: 4px 0; font-size: 12px; }
              .photo-container { text-align: center; margin: 10px 0; }
              .order-photo { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #ddd; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid black; padding: 6px; text-align: center; font-size: 9px; }
              th { background-color: #f2f2f2; }
              .footer { text-align: center; margin-top: 20px; font-style: italic; color: #666; font-size: 10px; }
            </style>
          </head>
          <body>
            <h1>ORDER RECEIPT</h1>
            <div class="order-details" style="display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px;">
              <div style="flex: 1;">
                <p><strong>Order No:</strong> ${order.orderNo}</p>
                <p><strong>Name:</strong> ${order.customer}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
                <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
                <p><strong>GST No:</strong> ${order.gstin || 'N/A'}</p>
              </div>
              <div style="text-align: right; width: 100px;">
                <p><strong>Type:</strong> Order</p>
                <p><strong>Date:</strong> ${order.date || '-'}</p>
              </div>
            </div>

            <div style="border: 1px solid #000; margin-top: 10px; padding: 10px;">
               <p><strong>ORDER DETAILS :</strong></p>
               <div style="margin-top: 5px;">
                  <p><strong>Order No:</strong> ${order.orderNo}</p>
                  <p><strong>Item:</strong> ${order.type}</p>
                  <p><strong>Weight:</strong> ${order.weight} GMS</p>
                  <p><strong>Payment:</strong> ${order.payment}</p>
                  <p><strong>Pending Balance:</strong> ₹${order.balance}</p>
               </div>
            </div>

            <div class="footer" style="text-align: center; margin-top: 20px;">
              <p>${thirukkural}</p>
              <p>Thank you for choosing NJT Jewellery!</p>
            </div>
          </body>
        </html>
      `;
    } else if (suspense) {
      return `
        < html >
          <head>
            <style>
              @page { size: 72mm 210mm; margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0; padding: 5mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 10px; }
              h2 { margin-top: 15px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid black; padding: 4px; text-align: center; font-size: 8px; }
              th { background-color: #f2f2f2; }
              p { margin: 3px 0; }
              .total-row { font-weight: bold; background-color: #e0e0e0; }
            </style>
          </head>
          <body>
            <h1>SUSPENSE BILL</h1>
            <div>
              <p><strong>Name:</strong> ${customer.name}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
              <p><strong>GST No:</strong> ${customer.gstin || 'N/A'}</p>
              <p><strong>Date:</strong> ${customer.date}</p>
              <p><strong>Gold Rate:</strong> ₹${suspense.goldRate}</p>
            </div>

            <h2>ISSUE ITEMS:</h2>
            <table>
              <tr>
                <th>Item Name</th>
                <th>Weight (g)</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Pure (g)</th>
                <th>Amount</th>
              </tr>
              ${suspense.issueItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.weight.toFixed(3)}</td>
                  <td>${item.count}</td>
                  <td>${item.rate}</td>
                  <td>${item.pure.toFixed(3)}</td>
                  <td>${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">Total Issue</td>
                <td>${suspense.totalIssuePure.toFixed(3)}</td>
                <td>₹${suspense.totalIssueAmount.toFixed(2)}</td>
              </tr>
            </table>

            <h2>RECEIPT ITEMS:</h2>
            <table>
              <tr>
                <th>Item Name</th>
                <th>Weight (g)</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Pure (g)</th>
                <th>Amount</th>
              </tr>
              ${suspense.receiptItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.weight.toFixed(3)}</td>
                  <td>${item.count}</td>
                  <td>${item.rate}</td>
                  <td>${item.pure.toFixed(3)}</td>
                  <td>${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">Total Receipt</td>
                <td>${suspense.totalReceiptPure.toFixed(3)}</td>
                <td>₹${suspense.totalReceiptAmount.toFixed(2)}</td>
              </tr>
            </table>

            <h2>SUMMARY:</h2>
            <table>
              <tr>
                 <th>Description</th>
                 <th>Pure Gold (g)</th>
                 <th>Amount (₹)</th>
              </tr>
              <tr>
                <td>Net Balance</td>
                <td style="color: ${suspense.netPure >= 0 ? 'red' : 'green'}">${suspense.netPure.toFixed(3)}</td>
                <td>₹${suspense.netAmount.toFixed(2)}</td>
              </tr>
            </table>
          </body>
        </html >
    `;
    } else if (isB2C) {
      return `
    < html >
          <head>
            <style>
              @page { size: 72mm 210mm; margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0; padding: 5mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 10px; }
              h2 { margin-top: 15px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 3px; text-align: center; font-size: 7px; word-wrap: break-word; }
              th { background-color: #f2f2f2; }
              p { margin: 3px 0; }
            </style>
          </head>
          <body>
            <h1>BILL</h1>
            <div>
              <p><strong>Invoice No:</strong> ${customer.invoiceNo || customer.id || 'N/A'}</p>
              <p><strong>Name:</strong> ${customer.name}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
              <p><strong>GST No:</strong> ${customer.gstin || 'N/A'}</p>
              <p><strong>Type:</strong> ${customer.type}</p>
              <p><strong>Date:</strong> ${customer.date}</p>
              <p><strong>Balance:</strong> ${customer.balance}</p>
              <p><strong>Advance:</strong> ${customer.advanceBalance || 0}</p>
            </div>
            <h2>ITEMS:</h2>
            <table>
              <tr>
                <th>Item</th>
                <th>Weight</th>
                <th>Touch</th>
                <th>W/M</th>
                <th>Rate</th>
                <th>Total</th>
                <th>GST</th>
                <th>Final</th>
              </tr>
              ${items && items.length > 0 ? items.map(item => `
                <tr>
                  <td>${item.displayItemName || item.itemName}</td>
                  <td>${item.weight}</td>
                  <td>${item.touch}</td>
                  <td>${item.wastage}</td>
                  <td>${item.rate}</td>
                  <td>${item.total}</td>
                  <td>${item.gst}</td>
                  <td>${item.final}</td>
                </tr>
              `).join('') : '<tr><td colspan="8">No items</td></tr>'}
            </table>

    ${receiptItems && receiptItems.length > 0 ? `
              <h2>RECEIPT / OLD GOLD:</h2>
              <table>
                <tr>
                  <th>Item</th>
                  <th>Weight</th>
                  <th>Sub</th>
                  <th>Net Wt</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
                ${receiptItems.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.weight}</td>
                    <td>${item.sub}</td>
                    <td>${item.netWeight}</td>
                    <td>${item.rate}</td>
                    <td>${item.amount}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="5" style="text-align: right; font-weight: bold;">Total Old Gold Amount:</td>
                  <td style="font-weight: bold;">₹${receiptItems.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0).toFixed(2)}</td>
                </tr>
              </table>
            ` : ''
        }
            <h2>CASH:</h2>
            <p>${cashTable && cashTable.length > 0
          ? cashTable.map(c => `${c.rupees} / ${c.goldRate} → ${c.pure}`).join('<br/>')
          : 'N/A'
        }</p>
            <h2>TOTAL:</h2>
            <p><strong>Total Amount:</strong> ${report ? report.cash : 'N/A'}</p>
            ${cashAmount ? `<p><strong>Cash Amount:</strong> ₹${cashAmount}</p>` : ''}
            ${upiAmount && parseFloat(upiAmount) > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <div>
                  <h2>UPI Payment</h2>
                  <p>Amount: ₹${upiAmount}</p>
                  <p>Please scan the QR code for payment.</p>
                </div>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent("NTJ Jewellery")}&am=${upiAmount}&cu=INR`)}" style="width:200px;height:200px;" />
              </div>
            ` : ''
        }
  <div style="text-align: center; margin-top: 20px;">
  <p style="font-weight: bold; font-style: italic; margin-top: 10px;">${thirukkural}</p>
    <p>Thank you for your visit. Please visit again.</p>
  </div>
          </body >
        </html >
    `;
    } else {
      return `
    < html >
          <head>
            <style>
              @page { size: 72mm 210mm; margin: 0; }
              body { font-family: Arial, sans-serif; width: 72mm; margin: 0; padding: 5mm; font-size: 10px; }
              h1 { text-align: center; font-size: 16px; margin-bottom: 10px; }
              h2 { margin-top: 15px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid black; padding: 4px; text-align: center; font-size: 8px; }
              th { background-color: #f2f2f2; }
              p { margin: 3px 0; }
            </style>
          </head>
          <body>
            <h1>BILL</h1>
            <div>
              <p><strong>Name:</strong> ${customer.name}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
              <p><strong>GST No:</strong> ${customer.gstin || 'N/A'}</p>
              <p><strong>Type:</strong> ${customer.type}</p>
              <p><strong>Date:</strong> ${customer.date}</p>
              <p><strong>OB:</strong> ${customer.oldBalance}</p>
              <p><strong>Advance:</strong> ${customer.advanceBalance || 0}</p>
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
            <p>${cashTable && cashTable.length > 0
          ? cashTable.map(c => `${c.rupees} / ${c.goldRate} → ${c.pure}`).join('<br/>')
          : 'N/A'
        }</p>
            <h2>SUMMARY:</h2>
            <table>
              ${customer.oldBalance && parseFloat(customer.oldBalance) !== 0 ? `
                <!-- OB exists: Show OB | ISSUE | RECEIPT | CASH | CURRENT -->
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
                  <td>${summary ? (Number(summary.obPlusIssue) - Number(summary.receiptPlusCash)).toFixed(3) : 'N/A'}</td>
                </tr>
              ` : `
                <!-- AB exists: Show ISSUE | AB | RECEIPT | CASH | CURRENT -->
                <tr>
                  <th>ISSUE</th>
                  <th>AB</th>
                  <th>RECEIPT</th>
                  <th>CASH</th>
                  <th>CURRENT</th>
                </tr>
                <tr>
                  <td>${summary ? summary.issue : 'N/A'}</td>
                  <td>${customer.advanceBalance && parseFloat(customer.advanceBalance) !== 0 ? customer.advanceBalance : '0.000'}</td>
                  <td>${summary ? summary.receipt : 'N/A'}</td>
                  <td>${summary ? summary.cash : 'N/A'}</td>
                  <td>${summary && customer.advanceBalance ? (parseFloat(customer.advanceBalance) + parseFloat(summary.receipt) + parseFloat(summary.cash) - parseFloat(summary.issue)).toFixed(3) : (summary?.current || 'N/A')}</td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: right; padding-right: 10px;">${customer.advanceBalance || '0.000'} + ${summary?.receipt || '0.000'} + ${summary?.cash || '0.000'} - ${summary?.issue || '0.000'}</td>
                  <td>=</td>
                  <td>${summary && customer.advanceBalance ? (parseFloat(customer.advanceBalance) + parseFloat(summary.receipt) + parseFloat(summary.cash) - parseFloat(summary.issue)).toFixed(3) : (summary?.current || 'N/A')}</td>
                </tr>
              `}
            </table>
            ${cashAmount ? `<p><strong>Cash Amount:</strong> ₹${cashAmount}</p>` : ''}
          </body>
        </html >
    `;
    }
  };

  const handleDownload = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 204, // 72mm in points
        height: 842,
      });
      setIsPrinting(false);
      Alert.alert('Download Successful', `PDF saved to: ${uri} `);
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Error', 'Failed to download PDF');
      console.error(error);
    }
  };

  const handleShare = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 204, // 72mm in points
        height: 842,
      });
      await Sharing.shareAsync(uri);
      setIsPrinting(false);
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Error', 'Failed to share PDF');
      console.error(error);
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 204, // 72mm in points
        height: 842,
      });

      // Share the file directly without opening a specific chat thread/message
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Bill',
        UTI: 'com.adobe.pdf',
      });
      setIsPrinting(false);
    } catch (error) {
      setIsPrinting(false);
      console.error(error);
      Alert.alert("Error", "Failed to share bill");
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const html = generateHTML();
      // Generate PDF file once for both actions
      const { uri } = await Print.printToFileAsync({
        html,
        width: 204, // 72mm in points
        height: 842, // A4 height equivalent for continuous roll
      });

      // Action 1: Print the generated PDF
      try {
        await Print.printAsync({
          uri,
          width: 204,
          height: 842,
        });
      } catch (printError) {
        console.log("Print cancelled or failed:", printError.message);
      }

      // Action 2: Automatically share the same PDF via WhatsApp/System Share
      setTimeout(async () => {
        try {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Bill',
            UTI: 'com.adobe.pdf',
          });
          setIsPrinting(false);
        } catch (shareError) {
          setIsPrinting(false);
          console.error("Share error:", shareError);
        }
      }, 700);
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Error', 'Failed to process bill');
      console.error("General bill processing error:", error);
    }
  };

  const handlePrintQR = async () => {
    try {
      setIsPrinting(true);
      if (qrRef.current) {
        qrRef.current.toDataURL(async (dataURL) => {
          const html = `
    < html >
              <head>
                <style>
                  @page { size: 72mm 210mm; margin: 0; }
                  body { font-family: Arial, sans-serif; width: 72mm; margin: 0; padding: 10mm; text-align: center; font-size: 12px; }
                  h1 { margin-bottom: 15px; font-size: 18px; }
                  img { max-width: 60mm; height: auto; }
                </style>
              </head>
              <body>
                <h1>UPI QR Code</h1>
                <p>Amount: ₹${upiAmount}</p>
                <img src="${dataURL}" alt="UPI QR Code" />
              </body>
            </html >
    `;
          await Print.printAsync({
            html,
            width: 204,
            height: 842,
          });
          setIsPrinting(false);
        });
      } else {
        setIsPrinting(false);
        Alert.alert('Error', 'QR Code not available');
      }
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Error', 'Failed to print QR Code');
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: '#fff' }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* FIXED HEADER BAR */}
          {!isPrinting && (
            <View style={styles.buttonContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => {
                  if (customer && (customer.customerId || customer.id) && !items) {
                    navigation.navigate("BillHistory", { customer: customer });
                  } else {
                    navigation.navigate(order ? "Order" : estimate ? "Estimate" : isB2C ? "B2CCalculationPage" : "B2BCalculationPage");
                  }
                }}>
                  <Icon name="arrow-left" size={22} color="#1E88E5" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerBtn} onPress={handlePrint}>
                  <Icon name="printer" size={22} color="#1E88E5" />
                </TouchableOpacity>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.actionIcon} onPress={handleWhatsAppShare}>
                  <Icon name="whatsapp" size={24} color="#25D366" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionIcon} onPress={handleDownload}>
                  <Icon name="download" size={24} color="#1E88E5" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionIcon} onPress={handleShare}>
                  <Icon name="share-variant" size={24} color="#1E88E5" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionIcon} onPress={handlePrint}>
                  <Icon name="printer" size={24} color="#1E88E5" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView
            style={styles.page}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >

            <View style={styles.headerBox}>
              <Text style={styles.billTitle}>{estimate ? 'ESTIMATE BILL' : suspense ? 'SUSPENSE BILL' : order ? 'ORDER RECEIPT' : 'BILL'}</Text>

              <View style={styles.headerRow}>
                <View>
                  {!estimate && !suspense && !order && <Text>Invoice No : {customer.invoiceNo || customer.id || 'N/A'}</Text>}
                  {order && <Text>Order No : {order.orderNo}</Text>}
                  <Text>Name : {estimate ? (estimate.itemName || "Estimate Customer") : order ? order.customer : customer.name}</Text>
                  {(suspense || isB2C || order) && <Text>Phone : {order ? order.phone : customer.phone || 'N/A'}</Text>}
                  <Text>Address : {customer?.address || 'N/A'}</Text>
                  <Text>GST No : {customer?.gstin || 'N/A'}</Text>
                </View>

                <View>
                  <Text>Type : {estimate ? 'Estimate' : order ? 'Order' : customer.type}</Text>
                  <Text>Date : {estimate ? new Date().toLocaleDateString() : order ? order.date : customer.date}</Text>
                  {estimate ? (
                    <Text>OD : N/A</Text>
                  ) : (
                    <>
                      {customer.oldBalance && parseFloat(customer.oldBalance) !== 0 ? (
                        <Text>OB : {customer.oldBalance}</Text>
                      ) : null}
                      {customer.advanceBalance && parseFloat(customer.advanceBalance) !== 0 ? (
                        <Text>AB : {customer.advanceBalance}</Text>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            </View>

            {estimate ? (
              <>
                {/* ESTIMATE DETAILS */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>ESTIMATE DETAILS :</Text>

                  <View style={styles.tableHeader}>
                    <Text style={styles.cell}>Item Name</Text>
                    <Text style={styles.cell}>Weight (g)</Text>
                    <Text style={styles.cell}>Wastage %</Text>
                    <Text style={styles.cell}>Gross Weight (g)</Text>
                    <Text style={styles.cell}>Gold Rate</Text>
                    <Text style={styles.cell}>Net Amount</Text>
                    <Text style={styles.cell}>GST</Text>
                    <Text style={styles.cell}>Total Amount</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={styles.cell}>{estimate.itemName}</Text>
                    <Text style={styles.cell}>{estimate.weight}</Text>
                    <Text style={styles.cell}>{estimate.wastagePercent}</Text>
                    <Text style={styles.cell}>{estimate.grossWeight}</Text>
                    <Text style={styles.cell}>{estimate.goldRate}</Text>
                    <Text style={styles.cell}>₹{estimate.netAmount}</Text>
                    <Text style={styles.cell}>₹{parseFloat(estimate.gst).toFixed(2)}</Text>
                    <Text style={styles.cell}>₹{Math.round(parseFloat(estimate.totalAmount))}</Text>
                  </View>
                </View>

                {/* ESTIMATE TOTAL */}
                <View style={styles.cashBox}>
                  <Text style={styles.sectionTitle}>TOTAL :</Text>
                  <Text>Total Amount: ₹{Math.round(parseFloat(estimate.totalAmount))}</Text>
                </View>
              </>
            ) : suspense ? (
              <>
                {/* SUSPENSE DETAILS */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>ISSUE ITEMS :</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.cell, { flex: 2 }]}>Item</Text>
                    <Text style={styles.cell}>Wght</Text>
                    <Text style={styles.cell}>Qty</Text>
                    <Text style={styles.cell}>Rate</Text>
                    <Text style={styles.cell}>Pure</Text>
                    <Text style={styles.cell}>Amt</Text>
                  </View>
                  {suspense.issueItems.map((item, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
                      <Text style={styles.cell}>{item.weight.toFixed(3)}</Text>
                      <Text style={styles.cell}>{item.count}</Text>
                      <Text style={styles.cell}>{item.rate}</Text>
                      <Text style={styles.cell}>{item.pure.toFixed(3)}</Text>
                      <Text style={styles.cell}>{item.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                    <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Total</Text>
                    <Text style={styles.cell}></Text>
                    <Text style={styles.cell}></Text>
                    <Text style={styles.cell}></Text>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalIssuePure.toFixed(3)}</Text>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalIssueAmount.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>RECEIPT ITEMS :</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.cell, { flex: 2 }]}>Item</Text>
                    <Text style={styles.cell}>Wght</Text>
                    <Text style={styles.cell}>Qty</Text>
                    <Text style={styles.cell}>Rate</Text>
                    <Text style={styles.cell}>Pure</Text>
                    <Text style={styles.cell}>Amt</Text>
                  </View>
                  {suspense.receiptItems.map((item, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
                      <Text style={styles.cell}>{item.weight.toFixed(3)}</Text>
                      <Text style={styles.cell}>{item.count}</Text>
                      <Text style={styles.cell}>{item.rate}</Text>
                      <Text style={styles.cell}>{item.pure.toFixed(3)}</Text>
                      <Text style={styles.cell}>{item.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                    <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Total</Text>
                    <Text style={styles.cell}></Text>
                    <Text style={styles.cell}></Text>
                    <Text style={styles.cell}></Text>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalReceiptPure.toFixed(3)}</Text>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{suspense.totalReceiptAmount.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.cashBox}>
                  <Text style={styles.sectionTitle}>SUMMARY :</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontWeight: 'bold' }}>Net Pure Gold:</Text>
                    <Text style={{ fontWeight: 'bold', color: suspense.netPure >= 0 ? '#D32F2F' : '#2E7D32' }}>{suspense.netPure.toFixed(3)} g</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold' }}>Net Amount:</Text>
                    <Text style={{ fontWeight: 'bold' }}>₹{suspense.netAmount.toFixed(2)}</Text>
                  </View>
                </View>
              </>
            ) : order ? (
              <>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>ORDER DETAILS :</Text>
                  <View style={{ padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, marginBottom: 5 }}>Order No: {order.orderNo}</Text>
                      <Text style={{ fontSize: 16, marginBottom: 5 }}>Item: {order.type}</Text>
                      <Text style={{ fontSize: 16, marginBottom: 5 }}>Weight: {order.weight} GMS</Text>
                      <Text style={{ fontSize: 16, marginBottom: 5 }}>Payment: {order.payment}</Text>
                      <Text style={{ fontSize: 16, marginBottom: 5 }}>Pending Balance: ₹{order.balance}</Text>
                    </View>
                    {order.image && (
                      <View style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' }}>
                        <Image
                          source={{ uri: order.image.startsWith('http') ? order.image : `${base_url}/${order.image}` }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </View>



                <View style={styles.kuralContainer}>
                  <Text style={styles.kuralText}>{thirukkural}</Text>
                  <Text style={styles.visitAgainText}>Thank you for choosing NJT Jewellery!</Text>
                </View>
              </>
            ) : isB2C ? (
              <>
                {/* B2C ITEMS */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>ITEMS :</Text>

                  <View style={styles.tableHeader}>
                    <Text style={styles.cell}>Item</Text>
                    <Text style={styles.cell}>Weight</Text>
                    <Text style={styles.cell}>Touch</Text>
                    <Text style={styles.cell}>W/M</Text>
                    <Text style={styles.cell}>Rate</Text>
                    <Text style={styles.cell}>Total</Text>
                    <Text style={styles.cell}>GST</Text>
                    <Text style={styles.cell}>Final</Text>
                  </View>

                  {items && items.length > 0 ? (
                    items.map((item, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.cell}>{item.displayItemName || item.itemName}</Text>
                        <Text style={styles.cell}>{item.weight}</Text>
                        <Text style={styles.cell}>{item.touch}</Text>
                        <Text style={styles.cell}>{item.wastage}</Text>
                        <Text style={styles.cell}>{item.rate}</Text>
                        <Text style={styles.cell}>{item.total}</Text>
                        <Text style={styles.cell}>{item.gst}</Text>
                        <Text style={styles.cell}>{item.final}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noData}>No items</Text>
                  )}
                </View>

                {/* B2C RECEIPT / OLD GOLD ITEMS */}
                {receiptItems && receiptItems.length > 0 && (
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>RECEIPT / OLD GOLD :</Text>

                    <View style={styles.tableHeader}>
                      <Text style={styles.cell}>Item</Text>
                      <Text style={styles.cell}>Wt</Text>
                      <Text style={styles.cell}>Sub</Text>
                      <Text style={styles.cell}>Net Wt</Text>
                      <Text style={styles.cell}>Rate</Text>
                      <Text style={styles.cell}>Amt</Text>
                    </View>

                    {receiptItems.map((item, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.cell}>{item.name}</Text>
                        <Text style={styles.cell}>{item.weight}</Text>
                        <Text style={styles.cell}>{item.sub}</Text>
                        <Text style={styles.cell}>{item.netWeight}</Text>
                        <Text style={styles.cell}>{item.rate}</Text>
                        <Text style={styles.cell}>{item.amount}</Text>
                      </View>
                    ))}

                    <View style={styles.totalRow}>
                      <Text style={styles.totalCell}>Total Old Gold Amount:</Text>
                      <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>
                        ₹{receiptItems.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* GST */}
                {gst && gst.enabled && (
                  <View style={styles.cashBox}>
                    <Text style={styles.sectionTitle}>GST :</Text>
                    <Text>GST Percentage: {gst.percentage}%</Text>
                    <Text>GST Amount: ₹{gst.amount}</Text>
                  </View>
                )}

                {/* B2C TOTAL */}
                <View style={styles.cashBox}>
                  <Text style={styles.sectionTitle}>TOTAL :</Text>
                  <Text>Total Amount: {report ? report.cash : 'N/A'}</Text>
                  <Text>Current OD: {isB2C ? (Math.max(0, parseFloat(report?.cash || 0) - parseFloat(customer?.advanceBalance || 0)).toFixed(2)) : '0.00'}</Text>
                  <Text>Current AB: {isB2C ? (Math.max(0, parseFloat(customer?.advanceBalance || 0) - parseFloat(report?.cash || 0)).toFixed(2)) : '0.00'}</Text>
                  {cashAmount ? (
                    <>
                      <Text>Cash Amount: ₹{cashAmount}</Text>
                      <Text>UPI Amount: ₹{upiAmount}</Text>
                    </>
                  ) : null}
                </View>

                {/* CASH INPUT */}
                <View style={styles.row}>
                  <Text style={styles.label}>Cash Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter cash amount"
                    keyboardType="numeric"
                    value={cashAmount}
                    onChangeText={setCashAmount}
                  />
                </View>

                {/* UPI INPUT */}
                {cashAmount && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>UPI Amount</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter UPI amount"
                        keyboardType="numeric"
                        value={upiAmount}
                        onChangeText={setUpiAmount}
                      />
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.label}>Phone Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Phone Number"
                        keyboardType="phone-pad"
                        value={additionalPhone}
                        onChangeText={setAdditionalPhone}
                      />
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.label}>Cash</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Cash"
                        keyboardType="numeric"
                        value={additionalCash}
                        onChangeText={setAdditionalCash}
                      />
                    </View>
                  </>
                )}

                {/* SUBMIT BUTTON */}
                {cashAmount && (
                  <TouchableOpacity style={styles.submitBtn} onPress={() => setShowUpi(true)}>
                    <Text style={styles.submitText}>Generate QR Code</Text>
                  </TouchableOpacity>
                )}

                {/* QR CODE */}
                {showUpi && upiAmount > 0 && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>UPI QR Code for ₹{upiAmount}</Text>
                    <Text style={styles.upiIdText}>UPI ID: {upiId}</Text>
                    <TouchableOpacity style={styles.changeUpiBtn} onPress={() => navigation.navigate('UPIControl')}>
                      <Text style={styles.changeUpiText}>Change UPI ID</Text>
                    </TouchableOpacity>
                    <Image
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent("NTJ Jewellery")}&am=${upiAmount}&cu=INR`)}` }}
                      style={{ width: 200, height: 200 }
                      }
                    />
                    < TouchableOpacity style={styles.printQrBtn} onPress={handlePrintQR} >
                      <Text style={styles.printQrText}>Print QR Code</Text>
                    </TouchableOpacity >
                  </View >
                )}

                {/* Thirukkural Quote for B2C */}
                <View style={styles.kuralContainer}>
                  <Text style={styles.kuralText}>{thirukkural}</Text>
                  <Text style={styles.visitAgainText}>Thank you for your visit. Please visit again.</Text>
                </View>
              </>
            ) : (
              <>
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

                  {/* ISSUE TOTAL */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalCell}>Total Issue Pure:</Text>
                    <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>{totalIssuePure}</Text>
                  </View>
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

                  {/* RECEIPT TOTAL */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalCell}>Total Receipt Pure:</Text>
                    <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>{totalReceiptPure}</Text>
                  </View>
                </View>

                {/* CASH */}
                <View style={styles.cashBox}>
                  <Text style={styles.sectionTitle}>CASH :</Text>
                  {cashTable && cashTable.length > 0 ? (
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={styles.cell}>Amount</Text>
                        <Text style={styles.cell}>Rate</Text>
                        <Text style={styles.cell}>Pure</Text>
                      </View>
                      {cashTable.map((cashEntry, i) => (
                        <View key={i} style={styles.tableRow}>
                          <Text style={styles.cell}>{cashEntry.rupees}</Text>
                          <Text style={styles.cell}>{cashEntry.goldRate}</Text>
                          <Text style={styles.cell}>{cashEntry.pure}</Text>
                        </View>
                      ))}
                      <View style={styles.totalRow}>
                        <Text style={styles.totalCell}>Total Cash Pure:</Text>
                        <Text style={{ fontWeight: 'bold', right: 20, top: 5 }}>
                          {cashTable.reduce((sum, c) => sum + parseFloat(c.pure || 0), 0).toFixed(3)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text>N/A</Text>
                  )}
                </View>

                {/* GST */}
                {gst && gst.enabled && gst.showInBill !== false && (
                  <View style={styles.cashBox}>
                    <Text style={styles.sectionTitle}>GST :</Text>

                    {/* Dynamic Display Logic */}
                    {parseFloat(gst.igst) > 0 ? (
                      // IGST Case
                      <View>
                        <Text>IGST {gst.igst}% : ₹{gst.amount}</Text>
                      </View>
                    ) : (parseFloat(gst.sgst) > 0 || parseFloat(gst.cgst) > 0) ? (
                      // SGST + CGST Case
                      <View>
                        <Text>SGST {gst.sgst || 0}% : ₹{(parseFloat(gst.amount) / 2).toFixed(2)}</Text>
                        <Text>CGST {gst.cgst || 0}% : ₹{(parseFloat(gst.amount) / 2).toFixed(2)}</Text>
                      </View>
                    ) : (
                      // Fallback (Legacy or Total only)
                      <View>
                        <Text>GST Percentage: {gst.percentage}%</Text>
                        <Text>GST Amount: ₹{gst.amount}</Text>
                      </View>
                    )}

                    {(parseFloat(gst.igst) > 0 || parseFloat(gst.sgst) > 0) && (
                      <Text style={{ marginTop: 4, fontWeight: 'bold' }}>Total GST Amount: ₹{gst.amount}</Text>
                    )}
                  </View>
                )}

                {/* SUMMARY */}
                <View style={styles.summaryBox}>
                  <Text style={styles.sectionTitle}>SUMMARY :</Text>

                  {/* Conditional rendering based on OB or AB */}
                  {customer?.oldBalance && parseFloat(customer.oldBalance) !== 0 ? (
                    // OB exists: Show OB | ISSUE | RECEIPT | CASH | CURRENT
                    <>
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
                        <Text style={styles.sumCell}>{finalBalance}</Text>
                      </View>

                      <View style={styles.finalSummaryRow}>
                        <Text style={styles.sumCell}>{summary ? summary.obPlusIssue : 'N/A'}</Text>
                        <Text style={styles.sumCell}>-</Text>
                        <Text style={styles.sumCell}>{summary ? summary.receiptPlusCash : 'N/A'}</Text>
                        <Text style={styles.sumCell}>=</Text>
                        <Text style={styles.sumCell}>{summary ? (Number(summary.obPlusIssue) - Number(summary.receiptPlusCash)).toFixed(3) : 'N/A'}</Text>
                      </View>
                    </>
                  ) : (
                    // AB exists: Show ISSUE | AB | RECEIPT | CASH | CURRENT
                    <>
                      <View style={styles.summaryHeader}>
                        <Text style={styles.sumCell}>ISSUE</Text>
                        <Text style={styles.sumCell}>AB</Text>
                        <Text style={styles.sumCell}>RECEIPT</Text>
                        <Text style={styles.sumCell}>CASH</Text>
                        <Text style={styles.sumCell}>CURRENT</Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.sumCell}>{summary ? summary.issue : 'N/A'}</Text>
                        <Text style={styles.sumCell}>
                          {customer?.advanceBalance && parseFloat(customer.advanceBalance) !== 0
                            ? customer.advanceBalance
                            : '0.000'}
                        </Text>
                        <Text style={styles.sumCell}>{summary ? summary.receipt : 'N/A'}</Text>
                        <Text style={styles.sumCell}>{summary ? summary.cash : 'N/A'}</Text>
                        <Text style={styles.sumCell}>
                          {summary && customer?.advanceBalance ? (
                            (parseFloat(customer.advanceBalance) + parseFloat(summary.receipt) + parseFloat(summary.cash) - parseFloat(summary.issue)).toFixed(3)
                          ) : finalBalance}
                        </Text>
                      </View>

                      <View style={styles.finalSummaryRow}>
                        <Text style={[styles.sumCell, { flex: 2.5 }]}>
                          {customer?.advanceBalance || '0.000'} + {summary?.receipt || '0.000'} + {summary?.cash || '0.000'} - {summary?.issue || '0.000'}
                        </Text>
                        <Text style={[styles.sumCell, { flex: 0.5 }]}>=</Text>
                        <Text style={[styles.sumCell, { flex: 1 }]}>
                          {summary && customer?.advanceBalance ? (
                            (parseFloat(customer.advanceBalance) + parseFloat(summary.receipt) + parseFloat(summary.cash) - parseFloat(summary.issue)).toFixed(3)
                          ) : finalBalance}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </>
            )}

            {/* Bottom Home Button Removed */}

          </ScrollView >
        </View >
      </TouchableWithoutFeedback >
    </KeyboardAvoidingView >
  );
}

const styles = StyleSheet.create({
  page: { padding: 15, backgroundColor: "#fff", flex: 1 },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 25,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 10,
  },

  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    top: 15,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    top: 15,
  },

  actionIcon: {
    padding: 8,
  },

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

  totalRow: { flexDirection: "row", borderBottomWidth: 0.5, justifyContent: "space-between" },

  totalCell: { paddingVertical: 6, fontSize: 15, fontWeight: 'bold', left: 10, top: 5 },

  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleBtn: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  toggleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  submitBtn: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
    bottom: 10,
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  upiIdText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  changeUpiBtn: {
    backgroundColor: "#ffc107",
    padding: 6,
    borderRadius: 4,
    marginBottom: 10,
  },
  changeUpiText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "bold",
  },
  printQrBtn: {
    backgroundColor: "#17a2b8",
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  printQrText: {
    color: "#fff",
    fontWeight: "bold",
  },
  kuralContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginBottom: 20,
  },
  visitAgainText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  kuralText: {
    fontSize: 14,
    color: "#1B4D1B",
    fontWeight: "bold",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },
});

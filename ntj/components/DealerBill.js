import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Share,
    Modal,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { base_url } from "./config";

export default function DealerBill({ navigation, route }) {
    const { dealer } = route.params;
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            const response = await fetch(`${base_url}/payments/dealerTransferHistory`);
            if (response.ok) {
                const data = await response.json();
                // Filter transfers for this specific dealer
                const dealerTransfers = data.filter(t => t.selectedDealer === dealer.customerName);
                setTransfers(dealerTransfers);
            }
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalTransferred = transfers.reduce((sum, t) => sum + (t.transferWeight || 0), 0);
    const currentBalance = (dealer.oldBalance || 0) + (dealer.advanceBalance || 0);

    const handleShare = async () => {
        try {
            let message = `*NTJ Jewellers - Transfer Statement*\n\n`;
            message += `*Dealer:* ${dealer.customerName}\n`;
            message += `*Phone:* ${dealer.phoneNumber}\n`;
            message += `*Date:* ${new Date().toLocaleDateString()}\n\n`;

            message += `*Balance Summary:*\n`;
            message += `Current Balance: ${currentBalance.toFixed(3)} g\n`;
            message += `Total Transferred: ${totalTransferred.toFixed(3)} g\n`;
            message += `Total Transactions: ${transfers.length}\n\n`;

            message += `*Transfer History:*\n`;
            transfers.forEach((t, i) => {
                message += `\n#${i + 1} - ${new Date(t.date).toLocaleDateString()}\n`;
                message += `Items: ${t.selectedItems?.join(', ') || 'N/A'}\n`;
                message += `Transfer Weight: ${t.transferWeight?.toFixed(3)} g\n`;
                message += `Balance Weight: ${t.weightSubtraction?.toFixed(3)} g\n`;
            });

            message += `\n_Thank you for your business!_`;

            await Share.share({
                message: message,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };
    const handleViewReceipt = (transfer) => {
        setSelectedTransfer(transfer);
        setModalVisible(true);
    };

    const handleShareReceipt = async (t) => {
        try {
            let message = `*NTJ Jewellers - Transaction Receipt*\n\n`;
            message += `*Dealer:* ${dealer.customerName}\n`;
            message += `*Date:* ${new Date(t.date).toLocaleDateString()}\n`;
            message += `*Items:* ${t.selectedItems?.join(', ') || 'N/A'}\n\n`;
            message += `*Weight Details:*\n`;
            message += `Total Weight: ${t.totalSelectedWeight?.toFixed(3)} g\n`;
            message += `Transfer Weight: ${t.transferWeight?.toFixed(3)} g\n`;
            message += `Balance Weight: ${t.weightSubtraction?.toFixed(3)} g\n\n`;
            message += `_Thank you for your business!_`;

            await Share.share({ message });
        } catch (error) {
            console.error('Error sharing receipt:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Transfer Bill</Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-social" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Bill Container */}
                <View style={styles.billContainer}>
                    {/* Company Header */}
                    <View style={styles.companyHeader}>
                        <Text style={styles.companyName}>NTJ Jewellers</Text>
                        <Text style={styles.billTitle}>TRANSFER STATEMENT</Text>
                    </View>

                    {/* Dealer Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DEALER INFORMATION</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Name:</Text>
                            <Text style={styles.value}>{dealer.customerName}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{dealer.phoneNumber}</Text>
                        </View>
                        {dealer.workerName && (
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Worker:</Text>
                                <Text style={styles.value}>{dealer.workerName}</Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Date:</Text>
                            <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
                        </View>
                    </View>

                    {/* Balance Summary */}
                    <View style={styles.summarySection}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Current Balance:</Text>
                            <Text style={styles.summaryValue}>{currentBalance.toFixed(3)} g</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Transferred:</Text>
                            <Text style={styles.summaryValueHighlight}>{totalTransferred.toFixed(3)} g</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Transactions:</Text>
                            <Text style={styles.summaryValue}>{transfers.length}</Text>
                        </View>
                    </View>

                    {/* Transfer History Table */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>TRANSACTION HISTORY TABLE</Text>

                        {transfers.length === 0 ? (
                            <Text style={styles.noData}>No transfers found</Text>
                        ) : (
                            <View style={styles.tableContainer}>
                                {/* Table Header */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.columnHeader, { flex: 0.8 }]}>Date</Text>
                                    <Text style={[styles.columnHeader, { flex: 1.2 }]}>Items</Text>
                                    <Text style={[styles.columnHeader, { flex: 1 }]}>Transfer</Text>
                                    <Text style={[styles.columnHeader, { flex: 1 }]}>Balance</Text>
                                    <Text style={[styles.columnHeader, { flex: 0.6 }]}>Action</Text>
                                </View>

                                {/* Table Rows */}
                                {transfers.map((transfer, index) => (
                                    <View key={transfer._id || index} style={styles.tableRow}>
                                        <Text style={[styles.cell, { flex: 0.8 }]}>
                                            {new Date(transfer.date).toLocaleDateString()}
                                        </Text>
                                        <Text style={[styles.cell, { flex: 1.2 }]} numberOfLines={1}>
                                            {transfer.selectedItems?.join(', ') || 'N/A'}
                                        </Text>
                                        <Text style={[styles.cellBold, { flex: 1 }]}>
                                            {transfer.transferWeight?.toFixed(3)} g
                                        </Text>
                                        <Text style={[styles.cell, { flex: 1 }]}>
                                            {transfer.weightSubtraction?.toFixed(3)} g
                                        </Text>
                                        <View style={[styles.cell, { flex: 0.6, flexDirection: 'row', justifyContent: 'space-around' }]}>
                                            <TouchableOpacity onPress={() => handleViewReceipt(transfer)}>
                                                <Ionicons name="receipt-outline" size={18} color="#2E7D32" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleShareReceipt(transfer)}>
                                                <Ionicons name="share-social-outline" size={18} color="#1565C0" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Individual Receipt Modal */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.receiptContainer}>
                                    <TouchableOpacity
                                        style={styles.closeBtn}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Ionicons name="close-circle" size={32} color="#666" />
                                    </TouchableOpacity>

                                    {/* Receipt Content */}
                                    <View style={styles.receiptPaper}>
                                        <View style={styles.receiptHeader}>
                                            <Text style={styles.receiptStoreName}>NTJ Jewellers</Text>
                                            <Text style={styles.receiptTagline}>Purveyors of Fine Gold & Silver</Text>
                                            <View style={styles.divider} />
                                            <Text style={styles.receiptType}>TRANSACTION RECEIPT</Text>
                                        </View>

                                        <View style={styles.receiptInfoSection}>
                                            <View style={styles.receiptRow}>
                                                <Text style={styles.receiptLabel}>Transaction ID:</Text>
                                                <Text style={styles.receiptValue}>#{selectedTransfer?._id?.slice(-8).toUpperCase()}</Text>
                                            </View>
                                            <View style={styles.receiptRow}>
                                                <Text style={styles.receiptLabel}>Date:</Text>
                                                <Text style={styles.receiptValue}>{new Date(selectedTransfer?.date).toLocaleDateString()}</Text>
                                            </View>
                                            <View style={styles.receiptRow}>
                                                <Text style={styles.receiptLabel}>Time:</Text>
                                                <Text style={styles.receiptValue}>{new Date(selectedTransfer?.createdAt).toLocaleTimeString()}</Text>
                                            </View>
                                            <View style={styles.receiptRow}>
                                                <Text style={styles.receiptLabel}>Dealer:</Text>
                                                <Text style={styles.receiptValue}>{dealer?.customerName}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.dashedDivider} />

                                        <View style={styles.receiptItemsSection}>
                                            <Text style={styles.itemsTitle}>ITEMS</Text>
                                            <Text style={styles.itemsList}>{selectedTransfer?.selectedItems?.join(', ') || 'N/A'}</Text>
                                        </View>

                                        <View style={styles.dashedDivider} />

                                        <View style={styles.receiptTotalSection}>
                                            <View style={styles.receiptRow}>
                                                <Text style={styles.receiptLabel}>Total Weight:</Text>
                                                <Text style={styles.receiptValue}>{selectedTransfer?.totalSelectedWeight?.toFixed(3)} g</Text>
                                            </View>
                                            <View style={styles.receiptRowLarge}>
                                                <Text style={styles.receiptLabelBold}>Transfer Weight:</Text>
                                                <Text style={styles.receiptValueBold}>{selectedTransfer?.transferWeight?.toFixed(3)} g</Text>
                                            </View>
                                            <View style={styles.receiptRow}>
                                                <Text style={styles.receiptLabel}>Balance Weight:</Text>
                                                <Text style={styles.receiptValue}>{selectedTransfer?.weightSubtraction?.toFixed(3)} g</Text>
                                            </View>
                                        </View>

                                        <View style={styles.divider} />

                                        <View style={styles.receiptFooter}>
                                            <Text style={styles.footerThanks}>Thank you for your trust!</Text>
                                            <Text style={styles.footerAuth}>Authorized Signatory</Text>
                                            <View style={styles.signLine} />
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.modalShareBtn}
                                        onPress={() => handleShareReceipt(selectedTransfer)}
                                    >
                                        <Ionicons name="share-social" size={20} color="#fff" />
                                        <Text style={styles.modalShareBtnText}>Share Digital Receipt</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Thank you for your business!</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        top: 40,
    },
    header: {
        backgroundColor: "#2E7D32",
        height: 80,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
    scrollView: {
        flex: 1,
    },
    billContainer: {
        backgroundColor: "#fff",
        margin: 15,
        padding: 20,
        borderRadius: 10,
        elevation: 3,
    },
    companyHeader: {
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#2E7D32",
        paddingBottom: 15,
        marginBottom: 20,
    },
    companyName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2E7D32",
        marginBottom: 5,
    },
    billTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        letterSpacing: 2,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#2E7D32",
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        paddingBottom: 5,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#555",
        width: 100,
    },
    value: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    summarySection: {
        backgroundColor: "#E8F5E9",
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1B5E20",
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#2E7D32",
    },
    summaryValueHighlight: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1B5E20",
    },
    transferCard: {
        backgroundColor: "#FAFAFA",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#2E7D32",
    },
    transferHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    transferNumber: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#2E7D32",
    },
    transferDate: {
        fontSize: 12,
        color: "#666",
    },
    transferDetails: {
        paddingTop: 5,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    detailLabel: {
        fontSize: 13,
        color: "#666",
        flex: 1,
    },
    detailValue: {
        fontSize: 13,
        color: "#333",
        fontWeight: "500",
        flex: 1,
        textAlign: "right",
    },
    detailRowHighlight: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#E3F2FD",
        padding: 8,
        borderRadius: 4,
        marginTop: 5,
    },
    detailLabelBold: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1565C0",
    },
    detailValueBold: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0D47A1",
    },
    noData: {
        textAlign: "center",
        color: "#999",
        fontSize: 14,
        padding: 20,
    },
    footer: {
        marginTop: 30,
        paddingTop: 15,
        borderTopWidth: 2,
        borderTopColor: "#2E7D32",
        alignItems: "center",
    },
    footerText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#2E7D32",
        marginBottom: 5,
    },
    footerNote: {
        fontSize: 11,
        color: "#999",
        fontStyle: "italic",
    },
    cardActions: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#EEE",
        marginTop: 10,
        paddingTop: 10,
        justifyContent: "space-between",
    },
    actionBtnReceipt: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    actionBtnShare: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E3F2FD",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2E7D32",
        marginLeft: 5,
    },
    actionBtnTextBlue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1565C0",
        marginLeft: 5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "90%",
        maxHeight: "85%",
        backgroundColor: "#FFF",
        borderRadius: 15,
        overflow: "hidden",
    },
    receiptContainer: {
        padding: 20,
        alignItems: "center",
    },
    closeBtn: {
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1,
    },
    receiptPaper: {
        backgroundColor: "#FFF",
        width: "100%",
        padding: 20,
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 4,
        elevation: 2,
    },
    receiptHeader: {
        alignItems: "center",
        marginBottom: 15,
    },
    receiptStoreName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#1B5E20",
    },
    receiptTagline: {
        fontSize: 10,
        color: "#666",
        fontStyle: "italic",
    },
    divider: {
        height: 1.5,
        backgroundColor: "#333",
        width: "100%",
        marginVertical: 10,
    },
    dashedDivider: {
        height: 1,
        borderWidth: 1,
        borderColor: "#999",
        borderStyle: "dashed",
        width: "100%",
        marginVertical: 15,
    },
    receiptType: {
        fontSize: 14,
        fontWeight: "bold",
        letterSpacing: 1.5,
        color: "#333",
    },
    receiptInfoSection: {
        marginBottom: 10,
    },
    receiptRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 3,
    },
    receiptLabel: {
        fontSize: 13,
        color: "#555",
    },
    receiptValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#222",
    },
    receiptItemsSection: {
        marginBottom: 5,
    },
    itemsTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 5,
    },
    itemsList: {
        fontSize: 14,
        color: "#333",
        lineHeight: 18,
    },
    receiptTotalSection: {
        marginBottom: 10,
    },
    receiptRowLarge: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 6,
        paddingVertical: 4,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: "#EEE",
    },
    receiptLabelBold: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#1B5E20",
    },
    receiptValueBold: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#1B5E20",
    },
    receiptFooter: {
        alignItems: "center",
        marginTop: 15,
    },
    footerThanks: {
        fontSize: 12,
        fontStyle: "italic",
        color: "#666",
        marginBottom: 20,
    },
    footerAuth: {
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
    },
    signLine: {
        height: 1,
        backgroundColor: "#CCC",
        width: 100,
        marginTop: 5,
    },
    modalShareBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2E7D32",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
        width: "100%",
        justifyContent: "center",
    },
    modalShareBtnText: {
        color: "#FFF",
        fontWeight: "bold",
        marginLeft: 10,
        fontSize: 16,
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: "#EEE",
        borderRadius: 8,
        overflow: "hidden",
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#E8F5E9",
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
    },
    columnHeader: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#1B5E20",
        textAlign: "center",
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F5",
        backgroundColor: "#FFF",
        alignItems: "center",
    },
    cell: {
        fontSize: 11,
        color: "#333",
        textAlign: "center",
    },
    cellBold: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#2E7D32",
        textAlign: "center",
    },
});

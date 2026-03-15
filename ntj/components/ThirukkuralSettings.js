import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { base_url } from "./config";
import CommonHeader from "./CommonHeader";
import AsyncStorage from '@react-native-async-storage/async-storage';

const tamilFontFamily = Platform.select({
    ios: "Tamil Sangam MN",
    android: "Noto Sans Tamil",
    default: "Noto Sans Tamil",
});

export default function ThirukkuralSettings({ navigation }) {
    const [kural, setKural] = useState("");
    const [editedKural, setEditedKural] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchKural();
    }, []);

    const fetchKural = async () => {
        setFetching(true);
        try {
            const response = await axios.get(`${base_url}/thirukkural`);
            const text = response.data?.kural || "";
            setKural(text);
            setEditedKural(text);
            if (String(text).trim()) {
                await AsyncStorage.setItem('thirukkural_quote', text);
            }
        } catch (error) {
            console.error("Error fetching Thirukkural:", error);
            Alert.alert("Error", "Failed to load Thirukkural from server.");
        } finally {
            setFetching(false);
        }
    };

    const handleEdit = () => {
        setEditedKural(kural);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditedKural(kural);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!editedKural.trim()) {
            Alert.alert("Error", "Please enter a Thirukkural quote.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.put(`${base_url}/thirukkural`, {
                kural: editedKural.trim()
            });
            const updatedKural = response.data?.kural || editedKural.trim();
            setKural(updatedKural);
            setEditedKural(updatedKural);
            await AsyncStorage.setItem('thirukkural_quote', updatedKural);
            setIsEditing(false);
            Alert.alert("Success", "Thirukkural quote updated successfully!");
        } catch (error) {
            console.error("Error saving Thirukkural:", error);
            Alert.alert("Error", "Failed to save Thirukkural quote.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            {/* Header */}
            <CommonHeader
            title="Bill Customization"
            onBack={() => navigation.goBack()}
            backgroundColor="#1B4D1B"
            />

            <ScrollView contentContainerStyle={styles.content}>

                {fetching ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#1B4D1B" />
                        <Text style={styles.loaderText}>Loading quote...</Text>
                    </View>
                ) : (
                    <>
                        {/* Main Card */}
                        <View style={styles.card}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Thirukkural Quote</Text>
                                {!isEditing && (
                                    <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                                        <Ionicons name="pencil" size={18} color="#1B4D1B" />
                                        <Text style={styles.editButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text style={styles.helperText}>
                                This quote will appear at the bottom of all B2C bills.
                            </Text>

                            {isEditing ? (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter Thirukkural text here..."
                                        placeholderTextColor="#999"
                                        multiline
                                        numberOfLines={4}
                                        value={editedKural}
                                        onChangeText={setEditedKural}
                                        textAlignVertical="top"
                                        autoFocus
                                    />
                                    <View style={styles.buttonRow}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={handleCancel}
                                            disabled={loading}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.saveButton, loading && styles.disabledButton]}
                                            onPress={handleSave}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Save</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.displayBox}>
                                    <Text style={styles.displayKural}>
                                        {kural || "No quote set"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Preview Card */}
                        <View style={styles.previewCard}>
                            <Text style={styles.previewLabel}>Bill Bottom Preview:</Text>
                            <View style={styles.divider} />
                            <Text style={styles.kuralPreview}>
                                {isEditing ? editedKural || "No quote set" : kural || "No quote set"}
                            </Text>
                            <Text style={styles.previewText}>
                                Thank you for your visit. Please visit again.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        backgroundColor: "#1B4D1B",
        height: 100,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 5,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
        marginLeft: 15,
    },
    content: {
        padding: 20,
    },
    loaderContainer: {
        marginTop: 60,
        alignItems: "center",
    },
    loaderText: {
        marginTop: 12,
        fontSize: 14,
        color: "#666",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    label: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1B4D1B",
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        borderColor: "#1B4D1B",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
    },
    editButtonText: {
        fontSize: 14,
        color: "#1B4D1B",
        fontWeight: "600",
    },
    helperText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 15,
        fontStyle: "italic",
    },
    displayBox: {
        backgroundColor: "#F4F9F4",
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: "#D0E8D0",
    },
    displayKural: {
        fontSize: 16,
        color: "#333",
        lineHeight: 24,
        fontFamily: tamilFontFamily,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: "#333",
        backgroundColor: "#FAFAFA",
        minHeight: 120,
        marginBottom: 15,
        fontFamily: tamilFontFamily,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#1B4D1B",
        backgroundColor: "#fff",
    },
    cancelButtonText: {
        color: "#1B4D1B",
        fontSize: 15,
        fontWeight: "bold",
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#1B4D1B",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    disabledButton: {
        backgroundColor: "#A5BCA5",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "bold",
    },
    previewCard: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 20,
        elevation: 2,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "#CCC",
        alignItems: "center",
    },
    previewLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#999",
        alignSelf: "flex-start",
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: "#EEE",
        width: "100%",
        marginBottom: 15,
    },
    previewText: {
        fontSize: 12,
        color: "#666",
        marginTop: 8,
    },
    kuralPreview: {
        fontSize: 14,
        color: "#1B4D1B",
        fontWeight: "bold",
        textAlign: "center",
        lineHeight: 22,
        fontFamily: tamilFontFamily,
    },
});

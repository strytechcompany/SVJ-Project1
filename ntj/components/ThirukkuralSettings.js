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
    Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ThirukkuralSettings({ navigation }) {
    const [kural, setKural] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadKural();
    }, []);

    const loadKural = async () => {
        try {
            const savedKural = await AsyncStorage.getItem("thirukkural_quote");
            if (savedKural) {
                setKural(savedKural);
            } else {
                // Default kural if none is set
                setKural("மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன் ஆகுல நீர பிற.");
            }
        } catch (error) {
            console.error("Error loading Thirukkural:", error);
        }
    };

    const handleSave = async () => {
        if (!kural.trim()) {
            Alert.alert("Error", "Please enter a Thirukkural quote.");
            return;
        }

        setLoading(true);
        try {
            await AsyncStorage.setItem("thirukkural_quote", kural.trim());
            Alert.alert("Success", "Thirukkural quote updated successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bill Customization</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.label}>Thirukkural Quote</Text>
                    <Text style={styles.helperText}>
                        This quote will appear at the bottom of all B2C bills.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter Thirukkural text here..."
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        value={kural}
                        onChangeText={setKural}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Text style={styles.saveButtonText}>
                            {loading ? "Saving..." : "Save Configuration"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>Bill Bottom Preview:</Text>
                    <View style={styles.divider} />
                    <Text style={styles.kuralPreview}>{kural || "No quote set"}</Text>
                    <Text style={styles.previewText}>Thank you for your visit. Please visit again.</Text>
                </View>
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
    label: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1B4D1B",
        marginBottom: 8,
    },
    helperText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 15,
        fontStyle: "italic",
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
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: "#1B4D1B",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#A5BCA5",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
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
        marginBottom: 5,
    },
    kuralPreview: {
        fontSize: 14,
        color: "#1B4D1B",
        fontWeight: "bold",
        textAlign: "center",
        lineHeight: 22,
    }
});

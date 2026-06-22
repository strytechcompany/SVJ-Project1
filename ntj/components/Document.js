import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  Dimensions,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";

const formatDate = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString();
};

const normalizeName = (name = "") =>
  String(name).trim().replace(/\s+/g, " ");

const extFromMime = (mime = "") => {
  const low = String(mime).toLowerCase();
  if (low.includes("pdf")) return ".pdf";
  if (low.includes("png")) return ".png";
  if (low.includes("jpeg") || low.includes("jpg")) return ".jpg";
  return "";
};

const mimeFromName = (name = "") => {
  const low = String(name).toLowerCase();
  if (low.endsWith(".pdf")) return "application/pdf";
  if (low.endsWith(".png")) return "image/png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  return "";
};

export default function Document({ navigation }) {
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState("");
  const [viewerType, setViewerType] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const serverRoot = useMemo(() => base_url.replace(/\/api\/?$/, ""), []);
  const apiCandidates = useMemo(() => {
    const root = String(base_url || "").replace(/\/+$/, "");
    const noApi = root.replace(/\/api$/i, "");
    const withApi = /\/api$/i.test(root) ? root : `${root}/api`;
    return Array.from(new Set([root, withApi, noApi])).filter(Boolean);
  }, []);

  const toAbsoluteUrl = useCallback(
    (fileUrl = "") => {
      if (!fileUrl) return "";
      if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
      return `${serverRoot}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
    },
    [serverRoot]
  );

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await callDocumentApi({
        method: "GET",
        suffix: "",
        expectJson: true,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", `Failed to fetch documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredRows = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter((r) => {
      const name = String(r?.documentName || "").toLowerCase();
      const type = String(r?.fileType || "").toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [rows, searchQuery]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setSelectedFile(asset);
      if (!documentName.trim() && asset.name) {
        const base = asset.name.replace(/\.[^/.]+$/, "");
        setDocumentName(base);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to pick file: ${error.message}`);
    }
  };

  const resetForm = () => {
    setDocumentName("");
    setSelectedFile(null);
    setEditingItem(null);
  };

  const parseErrorResponse = async (res) => {
    const raw = await res.text();
    let parsedMsg = raw;
    try {
      const json = JSON.parse(raw);
      parsedMsg = json?.message || json?.error || raw;
    } catch (_e) {}
    if (typeof parsedMsg === "string" && /<!doctype html>|cannot (put|post|delete|get)/i.test(parsedMsg)) {
      return `API route not found (HTTP ${res.status}). Please restart backend server and try again.`;
    }
    return parsedMsg || `HTTP ${res.status}`;
  };

  const getDocumentUrlCandidates = useCallback((suffix = "") => {
    const urls = [];
    for (const base of apiCandidates) {
      urls.push(`${base}/documents${suffix}`);
      urls.push(`${base}/document${suffix}`);
    }
    return Array.from(new Set(urls));
  }, [apiCandidates]);

  const callDocumentApi = useCallback(
    async ({ method = "GET", suffix = "", body = undefined, expectJson = true }) => {
      const urls = getDocumentUrlCandidates(suffix);
      let lastError = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, { method, body });
          if (res.status === 404) {
            lastError = new Error(`API route not found: ${url}`);
            continue;
          }
          if (!res.ok) {
            throw new Error(await parseErrorResponse(res));
          }
          if (!expectJson) return { url, data: null };
          const data = await res.json();
          return { url, data };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("Document API route not found.");
    },
    [getDocumentUrlCandidates]
  );

  const handleUpload = async () => {
    if (!editingItem && !selectedFile) {
      Alert.alert("Validation", "Please choose a PDF/JPG/PNG file.");
      return;
    }
    const finalName = normalizeName(documentName || selectedFile?.name || "");
    if (!finalName) {
      Alert.alert("Validation", "Please enter a document name.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("documentName", finalName);

      if (selectedFile) {
        const detectedMime =
          selectedFile.mimeType ||
          mimeFromName(selectedFile.name) ||
          mimeFromName(selectedFile.uri);

        if (!detectedMime) {
          Alert.alert("Validation", "Only PDF, JPG, and PNG files are supported.");
          return;
        }

        const defaultExt = extFromMime(detectedMime);
        const baseName =
          (selectedFile.name && String(selectedFile.name).replace(/\.[^/.]+$/, "")) ||
          `document-${Date.now()}`;
        const fileName = selectedFile.name || `${baseName}${defaultExt || ".pdf"}`;

        formData.append("file", {
          uri: selectedFile.uri,
          name: fileName,
          type: detectedMime,
        });
      }

      const isEditMode = Boolean(editingItem?._id);
      let savedDoc = null;
      if (isEditMode) {
        const { data } = await callDocumentApi({
          method: "PUT",
          suffix: `/${editingItem._id}`,
          body: formData,
          expectJson: true,
        });
        savedDoc = data;
      } else {
        const { data } = await callDocumentApi({
          method: "POST",
          suffix: "/upload",
          body: formData,
          expectJson: true,
        });
        savedDoc = data;
      }

      if (savedDoc && savedDoc._id) {
        setRows((prev) => {
          if (isEditMode) {
            return prev.map((r) => (r._id === savedDoc._id ? savedDoc : r));
          }
          return [savedDoc, ...prev.filter((r) => r._id !== savedDoc._id)];
        });
      }

      resetForm();
      fetchDocuments();
      Alert.alert("Success", isEditMode ? "Document updated successfully." : "Document uploaded successfully.");
    } catch (error) {
      const fallback = editingItem ? "Failed to update document." : "Failed to upload document.";
      const msg = String(error?.message || fallback);
      const friendlyMsg =
        editingItem && /404|route not found|cannot put/i.test(msg)
          ? "Update API is unavailable. Restart backend server and try again."
          : msg;
      Alert.alert(editingItem ? "Update Failed" : "Upload Failed", friendlyMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setDocumentName(item?.documentName || "");
    setSelectedFile(null);
  };

  const handleView = async (item) => {
    try {
      const url = toAbsoluteUrl(item.fileUrl);
      if (!url) {
        Alert.alert("Error", "Document URL not found.");
        return;
      }
      setViewerUri(url);
      setViewerType(item.fileType || "");
      setViewerVisible(true);
    } catch (error) {
      Alert.alert("Error", `Failed to view: ${error.message}`);
    }
  };

  const handleShare = async (item) => {
    try {
      const { url } = await callDocumentApi({
        method: "GET",
        suffix: `/${item._id}/download`,
        expectJson: false,
      });
      const localPath = `${FileSystem.cacheDirectory}${item.documentName || "document"}-${Date.now()}${extFromMime(item.fileType)}`;
      const { uri } = await FileSystem.downloadAsync(url, localPath);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Share", "Sharing is not available on this device.");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to share: ${error.message}`);
    }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Document", "Do you want to delete this document?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await callDocumentApi({
              method: "DELETE",
              suffix: `/${item._id}`,
              expectJson: false,
            });
            setRows((prev) => prev.filter((r) => r._id !== item._id));
          } catch (error) {
            Alert.alert("Error", `Delete failed: ${error.message}`);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.documentName || "Untitled"}</Text>
      <Text style={styles.meta}>File Type: {item.fileType || "N/A"}</Text>
      <Text style={styles.meta}>Upload Date: {formatDate(item.uploadedAt || item.createdAt)}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        URL/Path: {toAbsoluteUrl(item.fileUrl)}
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(item)}>
          <Icon name="eye-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item)}>
          <Icon name="share-variant-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
          <Icon name="pencil-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Icon name="delete-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Document Manager"
        subtitle="Upload and manage important files"
        onBack={() => navigation.goBack()}
        backgroundColor="#3D2800"
        insideSafeArea
        right={
          <TouchableOpacity
            onPress={() => {
              setShowSearch((v) => !v);
              if (showSearch) setSearchQuery("");
            }}
            style={styles.headerIconBtn}
          >
            <Icon name={showSearch ? "close" : "magnify"} size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      {showSearch && (
        <View style={styles.searchBarWrapper}>
          <Icon name="magnify" size={20} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search documents..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.uploadBox}>
        {editingItem ? (
          <Text style={styles.editingInfo}>
            Editing: {editingItem.documentName || "Untitled"} (choose file only if replacing)
          </Text>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Document name"
          value={documentName}
          onChangeText={setDocumentName}
          editable={!uploading}
        />

        <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={uploading}>
          <Icon name="file-upload-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>{editingItem ? "Choose New File (Optional)" : "Choose File"}</Text>
        </TouchableOpacity>

        <Text style={styles.fileName} numberOfLines={1}>
          {selectedFile?.name ? `Selected: ${selectedFile.name}` : "Supported: PDF, JPG, PNG"}
        </Text>

        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="content-save-outline" size={18} color="#fff" />}
          <Text style={styles.btnText}>
            {uploading ? (editingItem ? "Updating..." : "Uploading...") : (editingItem ? "Update Document" : "Upload Document")}
          </Text>
        </TouchableOpacity>

        {editingItem ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={uploading}>
            <Text style={styles.cancelBtnText}>Cancel Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3D2800" />
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item, index) => item?._id || item?.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {rows?.length ? "No matching documents found" : "No Documents Found"}
            </Text>
          }
        />
      )}

      <Modal visible={viewerVisible} transparent={false} animationType="fade">
        <SafeAreaView style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.closeFullBtn}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {viewerType.includes("pdf") ? "PDF Document" : "Image View"}
            </Text>
            <View style={{ width: 40 }} /> 
          </View>
          
          <View style={styles.viewerBody}>
            {viewerType.toLowerCase().includes("pdf") ? (
              <View style={styles.noPreviewContainer}>
                <Icon name="file-pdf-box" size={100} color="#ef4444" />
                <Text style={styles.noPreviewText}>PDF Preview</Text>
                <Text style={styles.noPreviewSubText}>
                  Rendering PDFs inside the app requires an additional viewer.{"\n"}
                  Please use the Share button for full PDF interaction.
                </Text>
                <TouchableOpacity 
                  style={styles.shareInsideBtn} 
                  onPress={() => {
                    setViewerVisible(false);
                    // Find the item and share it
                    const item = rows.find(r => toAbsoluteUrl(r.fileUrl) === viewerUri);
                    if (item) handleShare(item);
                  }}
                >
                  <Icon name="share-variant" size={20} color="#fff" />
                  <Text style={styles.btnText}>Share / Open PDF</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Image 
                source={{ uri: viewerUri }} 
                style={styles.fullImage} 
                resizeMode="contain"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F5F8" },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    elevation: 2,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
  },
  uploadBox: {
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6dbe1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    height: 40,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3D2800",
    borderRadius: 8,
    height: 42,
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  fileName: { marginTop: 8, color: "#444", fontSize: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#3D2800", marginBottom: 4 },
  meta: { fontSize: 12, color: "#555", marginBottom: 2 },
  actionRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  editingInfo: { marginBottom: 8, color: "#3D2800", fontSize: 12, fontWeight: "600" },
  editBtn: {
    flex: 1,
    backgroundColor: "#0284c7",
    borderRadius: 8,
    height: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  viewBtn: {
    flex: 1,
    backgroundColor: "#6366f1",
    borderRadius: 8,
    height: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: "#B8860B",
    borderRadius: 8,
    height: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    height: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  cancelBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 8,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  cancelBtnText: { color: "#374151", fontWeight: "700", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#888", marginTop: 20 },
  
  // Viewer Styles
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewerHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  viewerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  closeFullBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 120,
  },
  noPreviewContainer: {
    alignItems: "center",
    padding: 30,
  },
  noPreviewText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
  },
  noPreviewSubText: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  shareInsideBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B8860B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 30,
    gap: 8,
  },
});

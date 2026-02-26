
import { StyleSheet, Platform, StatusBar } from "react-native";

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  appHeader: {
    height: Platform.OS === 'ios' ? 120 : 110,
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  appHeaderTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  container: { flex: 1, backgroundColor: "#F5F7FA", padding: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 13, color: "#555", marginBottom: 4 },

  input: {
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between" },

  submitBtn: {
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  tableHeader: { flexDirection: "row", backgroundColor: "#EEF2F6" },
  th: { width: 90, textAlign: "center", fontWeight: "700", padding: 6 },

  tableRow: { flexDirection: "row" },
  td: { width: 90, padding: 8, textAlign: "center" },

  addRowBtn: {
    backgroundColor: "#135F25",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  addRowText: { color: "#fff", fontWeight: "700" },


  finalSubmitBtn: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  finalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 3,
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  weightInputContainer: {
    marginBottom: 12,
  },

  weightInput: {
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
  },

  modifiedWeightText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  inputWithButton: {
    flex: 1,
    backgroundColor: "#F1F3F6",
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
  },

  plusButton: {
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxContainer: {
    marginBottom: 12,
  },

  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkboxLabel: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  searchBox: {
    backgroundColor: "#F1F3F6",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    flex: 1,
  },
  listItem: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 0.3,
    borderColor: "#ccc",
  },
  listItemText: {
    fontSize: 17,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  infoText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },

  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: "#1E88E5",
    fontSize: 14,
    fontWeight: "600",
  },
});

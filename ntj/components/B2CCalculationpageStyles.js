
import { StyleSheet, Platform, StatusBar } from "react-native";

// ---------------- STYLES ----------------
export const styles = StyleSheet.create({
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
    backgroundColor: "#C9F8D0",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  addRowText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#135F25",
  },


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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE3EA",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxHeight: 220,
    marginTop: -4,
    marginBottom: 10,
    overflow: "hidden",
    zIndex: 20,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF3F7",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownItemMain: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B1F24",
    marginBottom: 2,
  },
  dropdownItemMeta: {
    fontSize: 12,
    color: "#5F6B7A",
  },
  dropdownItemAmount: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "700",
    marginTop: 4,
  },
  dropdownAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  itemAutocompleteWrap: {
    position: "relative",
    zIndex: 25,
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
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  greenDot: {
    width: 12,
    height: 12,
    backgroundColor: "#2E7D32",
    borderRadius: 6,
  },
  cartContainer: {
    position: "relative",
    marginLeft: "auto",
    alignItems: "center",
  },
  cartText: {
    color: "gray",
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF5722",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inputBox: {
    width: "48%",
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#555",
  },
  purityBox: {
    backgroundColor: "#F1F3F6",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    height: 48,
  },
  purityText: {
    fontSize: 16,
    fontWeight: "600",
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
  productTable: {
    width: 1400,
  },
  productTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#E9ECEF",
  },
  productHeaderCell: {
    width: 140,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 14,
    color: "#495057",
  },
  productTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  productCell: {
    width: 140,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  floatingCart: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#135F25',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, // Extra padding for iOS notch
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cartBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF5722',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#135F25',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cartTotalLabel: {
    color: '#rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  cartTotalValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewCartBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginLeft: 'auto',
  },
  viewCartBtnText: {
    color: '#135F25',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";

const ENDPOINT = `${base_url}/dailyExpenses`;

const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
};
const formatDisplay = (v) => {
  const d = v ? new Date(v) : new Date();
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
};
const toKey = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default function DailyExpense({ navigation }) {
  const [expenseName, setExpenseName] = useState("");
  const [workerName, setWorkerName]   = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount]           = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date());   // ← auto today
  const [showFormPicker, setShowFormPicker] = useState(false);

  const [workerNames, setWorkerNames]         = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rows, setRows]           = useState([]);
  const [saving, setSaving]       = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery]   = useState("");
  const [filterDate, setFilterDate]     = useState(null);
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const suggestions = useMemo(() => {
    const k = workerName.trim().toLowerCase();
    return workerNames.filter(w => !k || w.name.toLowerCase().includes(k)).slice(0, 8);
  }, [workerName, workerNames]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const dk = filterDate ? toKey(filterDate) : null;
    return rows.filter(r => {
      if (dk && toKey(r.expenseDate || r.createdAt) !== dk) return false;
      if (!q) return true;
      return (r.workerName||"").toLowerCase().includes(q) ||
             (r.expenseName||"").toLowerCase().includes(q) ||
             String(r.amount||"").includes(q);
    });
  }, [rows, searchQuery, filterDate]);

  const fetchWorkers = async () => {
    try {
      const [ur, dr] = await Promise.all([fetch(`${base_url}/users`), fetch(`${base_url}/customersDealer`)]);
      const users   = ur.ok   ? await ur.json() : [];
      const dealers = dr.ok   ? await dr.json() : [];
      const map = new Map();
      users.filter(u => String(u.role||"").toLowerCase()==="worker").forEach(u => {
        const n = String(u.name||"").trim();
        if (n) map.set(n.toLowerCase(), { name:n, phone:String(u.phone||"") });
      });
      dealers.forEach(d => {
        const n = String(d.workerName||"").trim();
        if (n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(), { name:n, phone:String(d.phoneNumber||"") });
      });
      setWorkerNames(Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name)));
    } catch(e) { console.error(e); }
  };

  const fetchExpenses = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(ENDPOINT);
      const data = res.ok ? await res.json() : [];
      setRows(Array.isArray(data) ? data : []);
    } catch(e) { Alert.alert("Error","Unable to load expenses."); setRows([]); }
    finally { setLoadingList(false); }
  };

  useEffect(() => { fetchWorkers(); fetchExpenses(); }, []);
  useFocusEffect(useCallback(() => { fetchExpenses(); }, []));

  const resetForm = () => {
    setExpenseName(""); setWorkerName(""); setPhoneNumber(""); setAmount("");
    setDescription(""); setExpenseDate(new Date()); setEditingId(null);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!expenseName.trim()) return Alert.alert("Validation","Expense Name is required.");
    if (!workerName.trim())  return Alert.alert("Validation","Worker Name is required.");
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) return Alert.alert("Validation","Enter a valid amount.");
    setSaving(true);
    try {
      const payload = {
        expenseName: expenseName.trim(), workerName: workerName.trim(),
        phoneNumber: phoneNumber.trim(), amount: amt,
        description: description.trim(), expenseDate: expenseDate.toISOString(),
      };
      const url    = editingId ? `${ENDPOINT}/${editingId}` : ENDPOINT;
      const method = editingId ? "PUT" : "POST";
      const res  = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const body = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      if (editingId) setRows(p=>p.map(r=>(r._id===editingId||r.id===editingId)?body:r));
      else           setRows(p=>[body,...p]);
      resetForm();
      Alert.alert("Success", editingId ? "Expense updated." : "Expense saved!");
    } catch(e) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = item => {
    setEditingId(item._id||item.id);
    setExpenseName(item.expenseName||""); setWorkerName(item.workerName||"");
    setPhoneNumber(item.phoneNumber||""); setAmount(String(item.amount||""));
    setDescription(item.description||"");
    setExpenseDate(item.expenseDate ? new Date(item.expenseDate) : new Date());
  };

  const handleDelete = id => Alert.alert("Delete","Delete this expense?",
    [{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:async()=>{
      try {
        const res = await fetch(`${ENDPOINT}/${id}`,{method:"DELETE"});
        if (res.ok) setRows(p=>p.filter(r=>r._id!==id&&r.id!==id));
        else Alert.alert("Error","Failed to delete.");
      } catch(e) { Alert.alert("Error","Unable to delete."); }
    }}]
  );

  const totalAmount = filtered.reduce((s,r)=>s+Number(r.amount||0),0);

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Daily Expense"
        backgroundColor="#3D2800"
        left={<TouchableOpacity onPress={()=>navigation.goBack()}><Icon name="arrow-left" size={28} color="#FFD700"/></TouchableOpacity>}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Form Card ── */}
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <View style={styles.formTitleWrap}>
              <Icon name={editingId?"pencil-circle":"plus-circle"} size={22} color="#FFD700"/>
              <Text style={styles.formTitle}>{editingId?"Update Expense":"New Expense"}</Text>
            </View>
            {editingId && (
              <TouchableOpacity onPress={resetForm} style={styles.cancelChip}>
                <Text style={styles.cancelChipText}>✕ Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Date row */}
          <TouchableOpacity style={styles.dateRow} onPress={()=>setShowFormPicker(true)}>
            <Icon name="calendar-today" size={18} color="#B8860B"/>
            <Text style={styles.dateRowText}>Date: {formatDisplay(expenseDate)}</Text>
            <Icon name="chevron-down" size={18} color="#B8860B"/>
          </TouchableOpacity>
          {showFormPicker && (
            <DateTimePicker value={expenseDate} mode="date" display="default"
              maximumDate={new Date()}
              onChange={(e,d)=>{ setShowFormPicker(false); if(d) setExpenseDate(d); }}
            />
          )}

          <View style={styles.fieldRow}>
            <View style={[styles.fieldWrap,{flex:1.6,marginRight:8}]}>
              <Text style={styles.label}>Expense / Product</Text>
              <View style={styles.inputBox}>
                <Icon name="tag-outline" size={16} color="#B8860B" style={styles.inputIcon}/>
                <TextInput style={styles.inputText} value={expenseName} onChangeText={setExpenseName} placeholder="Tea, Transport..." placeholderTextColor="#C8A96E"/>
              </View>
            </View>
            <View style={[styles.fieldWrap,{flex:1}]}>
              <Text style={styles.label}>Amount (₹)</Text>
              <View style={styles.inputBox}>
                <Icon name="currency-inr" size={16} color="#B8860B" style={styles.inputIcon}/>
                <TextInput style={styles.inputText} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#C8A96E"/>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Worker Name</Text>
          <View style={styles.inputBox}>
            <Icon name="account-hard-hat-outline" size={16} color="#B8860B" style={styles.inputIcon}/>
            <TextInput style={styles.inputText} value={workerName}
              onChangeText={t=>{setWorkerName(t);setShowSuggestions(true);}}
              onFocus={()=>setShowSuggestions(true)}
              onBlur={()=>setTimeout(()=>setShowSuggestions(false),300)}
              placeholder="Worker name" placeholderTextColor="#C8A96E"/>
          </View>
          {showSuggestions && suggestions.length>0 && (
            <View style={styles.suggBox}>
              {suggestions.map(w=>(
                <TouchableOpacity key={w.name} style={styles.suggRow}
                  onPress={()=>{setWorkerName(w.name);setPhoneNumber(w.phone);setShowSuggestions(false);}}>
                  <Icon name="account-circle-outline" size={16} color="#B8860B"/>
                  <Text style={styles.suggText}>{w.name}{w.phone?` · ${w.phone}`:""}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.fieldRow}>
            <View style={[styles.fieldWrap,{flex:1,marginRight:8}]}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.inputBox}>
                <Icon name="phone-outline" size={16} color="#B8860B" style={styles.inputIcon}/>
                <TextInput style={styles.inputText} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="Optional" placeholderTextColor="#C8A96E"/>
              </View>
            </View>
            <View style={[styles.fieldWrap,{flex:1.6}]}>
              <Text style={styles.label}>Description</Text>
              <View style={styles.inputBox}>
                <Icon name="text-box-outline" size={16} color="#B8860B" style={styles.inputIcon}/>
                <TextInput style={styles.inputText} value={description} onChangeText={setDescription} placeholder="Optional details" placeholderTextColor="#C8A96E"/>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving&&{opacity:0.7}, editingId&&{backgroundColor:"#B8860B"}]}
            onPress={handleSave} disabled={saving}>
            <Icon name={editingId?"content-save-edit":"content-save"} size={20} color="#3D2800"/>
            <Text style={styles.saveBtnText}>{saving?"Saving…":editingId?"Update Expense":"Save Expense"}</Text>
          </TouchableOpacity>
        </View>

        {/* ── List Card ── */}
        <View style={styles.listCard}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>Expense Records</Text>
            {filtered.length>0 && (
              <View style={styles.totalChip}>
                <Text style={styles.totalChipText}>Total ₹{totalAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>

          <View style={styles.filtersRow}>
            <View style={styles.searchWrap}>
              <Icon name="magnify" size={17} color="#B8860B"/>
              <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery}
                placeholder="Search worker, product, amount" placeholderTextColor="#C8A96E"/>
              {!!searchQuery && <TouchableOpacity onPress={()=>setSearchQuery("")}><Icon name="close-circle" size={17} color="#B8860B"/></TouchableOpacity>}
            </View>
            <TouchableOpacity style={[styles.filterDateBtn, filterDate&&styles.filterDateBtnActive]} onPress={()=>setShowFilterPicker(true)}>
              <Icon name="calendar-filter" size={17} color={filterDate?"#fff":"#3D2800"}/>
              <Text style={[styles.filterDateText, filterDate&&{color:"#fff"}]}>{filterDate?formatDisplay(filterDate):"Date"}</Text>
            </TouchableOpacity>
            {(filterDate||searchQuery) && (
              <TouchableOpacity style={styles.clearBtn} onPress={()=>{setFilterDate(null);setSearchQuery("");}}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {showFilterPicker && (
            <DateTimePicker value={filterDate||new Date()} mode="date" display="default"
              onChange={(e,d)=>{setShowFilterPicker(false);if(d)setFilterDate(d);}}/>
          )}

          {loadingList ? <ActivityIndicator color="#B8860B" style={{marginTop:16}}/> : (
            <FlatList data={filtered} scrollEnabled={false}
              keyExtractor={(item,i)=>String(item._id||item.id||i)}
              ListEmptyComponent={<Text style={styles.emptyText}>{rows.length?"No matching records.":"No expenses yet."}</Text>}
              renderItem={({item,index})=>(
                <View style={styles.expCard}>
                  <View style={styles.expAccent}/>
                  <View style={{flex:1,padding:12}}>
                    <View style={styles.expTopRow}>
                      <Text style={styles.expName} numberOfLines={1}>{index+1}. {item.expenseName||"-"}</Text>
                      <Text style={styles.expAmount}>₹{Number(item.amount||0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.expMetaRow}>
                      <Icon name="account-outline" size={13} color="#B8860B"/>
                      <Text style={styles.expMeta}> {item.workerName||"-"}</Text>
                      {!!item.phoneNumber && <Text style={styles.expMeta}>  ·  📞 {item.phoneNumber}</Text>}
                    </View>
                    <View style={styles.expMetaRow}>
                      <Icon name="calendar-outline" size={13} color="#B8860B"/>
                      <Text style={styles.expMeta}> {formatDisplay(item.expenseDate||item.createdAt)}</Text>
                    </View>
                    {!!item.description && <Text style={styles.expDesc}>{item.description}</Text>}
                  </View>
                  <View style={styles.expActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={()=>handleEdit(item)}>
                      <Icon name="pencil" size={16} color="#3D2800"/>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={()=>handleDelete(item._id||item.id)}>
                      <Icon name="delete-outline" size={16} color="#D32F2F"/>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#FFF8E1" },
  scroll: { padding:14, paddingBottom:30 },

  // Form Card
  formCard: { backgroundColor:"#fff", borderRadius:20, padding:16, elevation:4,
    shadowColor:"#B8860B", shadowOffset:{width:0,height:3}, shadowOpacity:0.18, shadowRadius:8,
    borderWidth:1, borderColor:"#FFE082" },
  formHeaderRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  formTitleWrap: { flexDirection:"row", alignItems:"center", gap:8 },
  formTitle: { fontSize:17, fontWeight:"800", color:"#3D2800" },
  cancelChip: { backgroundColor:"#FFEBEE", paddingHorizontal:10, paddingVertical:5, borderRadius:20 },
  cancelChipText: { color:"#D32F2F", fontWeight:"700", fontSize:13 },

  dateRow: { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#FFF3CD",
    borderRadius:12, paddingHorizontal:12, paddingVertical:10, marginBottom:14,
    borderWidth:1, borderColor:"#FFD700" },
  dateRowText: { flex:1, color:"#3D2800", fontWeight:"700", fontSize:14 },

  fieldRow: { flexDirection:"row", marginBottom:0 },
  fieldWrap: { },
  label: { fontSize:12, fontWeight:"700", color:"#7A5C00", marginBottom:5, marginTop:8 },
  inputBox: { flexDirection:"row", alignItems:"center", backgroundColor:"#FFF8E1",
    borderRadius:12, borderWidth:1.5, borderColor:"#FFD700", paddingHorizontal:10, height:44 },
  inputIcon: { marginRight:6 },
  inputText: { flex:1, color:"#3D2800", fontSize:14 },

  suggBox: { backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:"#FFE082",
    marginTop:2, marginBottom:8, elevation:3 },
  suggRow: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10,
    borderBottomWidth:0.5, borderBottomColor:"#FFF3CD", gap:8 },
  suggText: { color:"#3D2800", fontSize:13 },

  saveBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8,
    backgroundColor:"#FFD700", borderRadius:14, paddingVertical:14, marginTop:16,
    elevation:3, shadowColor:"#B8860B", shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:5 },
  saveBtnText: { color:"#3D2800", fontWeight:"800", fontSize:15 },

  // List Card
  listCard: { backgroundColor:"#fff", borderRadius:20, padding:16, marginTop:14, elevation:4,
    shadowColor:"#B8860B", shadowOffset:{width:0,height:3}, shadowOpacity:0.15, shadowRadius:8,
    borderWidth:1, borderColor:"#FFE082" },
  listHeaderRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  listTitle: { fontSize:16, fontWeight:"800", color:"#3D2800" },
  totalChip: { backgroundColor:"#FFF3CD", paddingHorizontal:12, paddingVertical:5, borderRadius:20,
    borderWidth:1, borderColor:"#FFD700" },
  totalChipText: { color:"#7A5C00", fontWeight:"800", fontSize:13 },

  filtersRow: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
  searchWrap: { flex:1, flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"#FFF8E1",
    borderRadius:12, borderWidth:1.5, borderColor:"#FFD700", paddingHorizontal:10, height:42 },
  searchInput: { flex:1, color:"#3D2800", fontSize:13 },
  filterDateBtn: { flexDirection:"row", alignItems:"center", gap:5, borderWidth:1.5,
    borderColor:"#3D2800", borderRadius:12, paddingHorizontal:10, height:42, backgroundColor:"#fff" },
  filterDateBtnActive: { backgroundColor:"#3D2800" },
  filterDateText: { fontSize:12, fontWeight:"700", color:"#3D2800" },
  clearBtn: { height:42, paddingHorizontal:10, borderRadius:12, backgroundColor:"#EFEBE9",
    alignItems:"center", justifyContent:"center" },
  clearBtnText: { fontSize:12, fontWeight:"700", color:"#4E342E" },

  // Expense Card
  expCard: { flexDirection:"row", backgroundColor:"#FFFDE7", borderRadius:14, marginTop:10,
    overflow:"hidden", elevation:2, shadowColor:"#B8860B", shadowOffset:{width:0,height:1},
    shadowOpacity:0.1, shadowRadius:4, borderWidth:1, borderColor:"#FFE082" },
  expAccent: { width:5, backgroundColor:"#B8860B" },
  expTopRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:4 },
  expName: { fontSize:14, fontWeight:"800", color:"#3D2800", flex:1, marginRight:8 },
  expAmount: { fontSize:15, fontWeight:"800", color:"#7A5C00" },
  expMetaRow: { flexDirection:"row", alignItems:"center", marginTop:2 },
  expMeta: { fontSize:12, color:"#7A5C00" },
  expDesc: { fontSize:12, color:"#B8860B", marginTop:4, fontStyle:"italic" },
  expActions: { justifyContent:"space-around", padding:8, borderLeftWidth:1, borderLeftColor:"#FFE082" },
  editBtn: { padding:7, borderRadius:8, backgroundColor:"#FFF3CD", marginBottom:6 },
  deleteBtn: { padding:7, borderRadius:8, backgroundColor:"#FFEBEE" },

  emptyText: { textAlign:"center", color:"#B8860B", marginTop:16, fontSize:13 },
});

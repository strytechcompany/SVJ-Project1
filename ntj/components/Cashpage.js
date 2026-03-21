import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CommonHeader from "./CommonHeader";
import { base_url } from "./config";

const CASH_HISTORY_KEY = "cashpage_history";
const CASH_BILLS_KEY = "cashpage_bills";

const createEmptyForm = () => ({
    name: "",
    phone: "",
    cash: "",
    pure: "",
});

const formatThree = (value) => Number(value || 0).toFixed(3);
const parseNum = (value) => {
    const parsed = parseFloat(String(value ?? "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
};
const computeCashPure = (cashValue, rateValue) => {
    const cashNumber = parseNum(cashValue);
    const rateNumber = parseNum(rateValue);
    if (rateNumber <= 0 || cashNumber <= 0) return 0;
    return Number((Math.abs(cashNumber) / rateNumber).toFixed(3));
};

export default function Cashpage({ navigation }) {
    const [mode, setMode] = useState("cash");
    const [form, setForm] = useState(createEmptyForm());
    const [advanceForm, setAdvanceForm] = useState({
        name: "",
        phone: "",
        advanceAmount: "",
        gold: "",
    });
    const [entries, setEntries] = useState([]);
    const [cashBills, setCashBills] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [editingEntryId, setEditingEntryId] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [ftRate, setFtRate] = useState("150");
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [balanceInfo, setBalanceInfo] = useState({
        type: null,
        oldBalance: 0,
        advanceBalance: 0,
    });

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const response = await fetch(`${base_url}/customers`);
            const data = response.ok ? await response.json() : [];
            const normalizedCustomers = (Array.isArray(data) ? data : []).map((customer, index) => ({
                id: String(customer._id || customer.id || customer.customerId || index),
                name: String(customer.customerName || customer.name || "").trim(),
                phone: String(customer.customerNumber || customer.phoneNumber || customer.phone || "").trim(),
                oldBalance: parseNum(customer.oldBalance ?? customer.ob),
                advanceBalance: parseNum(customer.advanceBalance ?? customer.advBal),
            }));
            setCustomers(normalizedCustomers);
            return normalizedCustomers;
        } catch (error) {
            console.log("Cashpage customer fetch failed:", error?.message);
            setCustomers([]);
            return [];
        } finally {
            setLoadingCustomers(false);
        }
    };

    const loadFtRate = async () => {
        try {
            const response = await fetch(`${base_url}/rates`);
            if (response.ok) {
                const data = await response.json();
                if (data?.ftRate !== undefined && data?.ftRate !== null) {
                    const rate = String(data.ftRate);
                    setFtRate(rate);
                    await AsyncStorage.setItem("ftRate", rate);
                    return;
                }
            }
        } catch (error) {
            console.log("Cashpage rate fetch fallback:", error?.message);
        }

        try {
            const savedFtRate = await AsyncStorage.getItem("ftRate");
            if (savedFtRate) setFtRate(savedFtRate);
        } catch (error) {
            console.log("Cashpage AsyncStorage rate fallback failed:", error?.message);
        }
    };

    const handleRefresh = async () => {
        await Promise.all([fetchCustomers(), loadFtRate()]);
    };

    useEffect(() => {
        const loadSavedEntries = async () => {
            try {
                const storedEntries = await AsyncStorage.getItem(CASH_HISTORY_KEY);
                if (storedEntries) {
                    const parsedEntries = JSON.parse(storedEntries);
                    if (Array.isArray(parsedEntries)) {
                        setEntries(parsedEntries);
                    }
                }
            } catch (error) {
                console.log("Cashpage history load failed:", error?.message);
            }
        };

        const loadSavedBills = async () => {
            try {
                const storedBills = await AsyncStorage.getItem(CASH_BILLS_KEY);
                if (storedBills) {
                    const parsedBills = JSON.parse(storedBills);
                    if (Array.isArray(parsedBills)) {
                        setCashBills(parsedBills);
                    }
                }
            } catch (error) {
                console.log("Cashpage bill load failed:", error?.message);
            }
        };

        loadSavedEntries();
        loadSavedBills();
        loadFtRate();
        fetchCustomers();
    }, []);

    useEffect(() => {
        const saveEntries = async () => {
            try {
                await AsyncStorage.setItem(CASH_HISTORY_KEY, JSON.stringify(entries));
            } catch (error) {
                console.log("Cashpage history save failed:", error?.message);
            }
        };

        saveEntries();
    }, [entries]);

    useEffect(() => {
        const saveBills = async () => {
            try {
                await AsyncStorage.setItem(CASH_BILLS_KEY, JSON.stringify(cashBills));
            } catch (error) {
                console.log("Cashpage bill save failed:", error?.message);
            }
        };

        saveBills();
    }, [cashBills]);

    useEffect(() => {
        const pureValue = computeCashPure(form.cash, ftRate);
        setForm((prev) => {
            const nextPure = pureValue > 0 ? formatThree(pureValue) : "";
            if (prev.pure === nextPure) return prev;
            return { ...prev, pure: nextPure };
        });
    }, [form.cash, ftRate]);

    useEffect(() => {
        setAdvanceForm((prev) => {
            const nextGold = computeCashPure(prev.advanceAmount, ftRate);
            const gold = nextGold > 0 ? formatThree(nextGold) : "";
            if (prev.gold === gold) return prev;
            return { ...prev, gold };
        });
    }, [ftRate]);

    const filteredCustomers = useMemo(() => {
        const query =
            mode === "advance"
                ? advanceForm.name.trim().toLowerCase()
                : form.name.trim().toLowerCase();
        if (!query) return [];
        return customers
            .filter((customer) => customer.name.toLowerCase().includes(query))
            .slice(0, 8);
    }, [customers, form.name, advanceForm.name, mode]);

    const filteredHistory = useMemo(() => {
        const today = new Date().toDateString();
        return entries.filter(
            (item) => new Date(item.dateTime || item.createdAt || Date.now()).toDateString() === today
        );
    }, [entries]);

    const derivedPure = parseNum(form.pure);
    const derivedAdvancePure = computeCashPure(advanceForm.advanceAmount, ftRate);
    const currentBalance =
        balanceInfo.type === "old"
            ? mode === "advance"
                ? Math.max(balanceInfo.oldBalance - derivedAdvancePure, 0)
                : balanceInfo.oldBalance + derivedPure
            : 0;
    const remainingAdvanceRaw =
        balanceInfo.type === "advance"
            ? mode === "advance"
                ? balanceInfo.advanceBalance + derivedAdvancePure
                : balanceInfo.advanceBalance - derivedPure
            : 0;
    const remainingAdvance =
        balanceInfo.type === "advance" ? Math.max(remainingAdvanceRaw, 0) : 0;
    const convertedOldBalance =
        balanceInfo.type === "advance" && mode !== "advance" && remainingAdvanceRaw < 0
            ? Math.abs(remainingAdvanceRaw)
            : 0;
    const convertedAdvanceBalance =
        balanceInfo.type === "old" && mode === "advance" && balanceInfo.oldBalance - derivedAdvancePure < 0
            ? Math.abs(balanceInfo.oldBalance - derivedAdvancePure)
            : 0;

    const clearForm = () => {
        setForm(createEmptyForm());
        setAdvanceForm({
            name: "",
            phone: "",
            advanceAmount: "",
            gold: "",
        });
        setEditingEntryId("");
        setSelectedCustomerId("");
        setShowSuggestions(false);
        setBalanceInfo({
            type: null,
            oldBalance: 0,
            advanceBalance: 0,
        });
    };

    const openBillPreview = (billData, customerInfo) => {
        const targetParams = { billData };
        if (customerInfo) {
            targetParams.customer = customerInfo;
        }
        navigation.navigate("BillPreview", targetParams);
    };

    const handleModeChange = (nextMode) => {
        if (mode === nextMode) return;
        setMode(nextMode);
        clearForm();
    };

    const handleNameChange = (value, targetMode = mode) => {
        setEditingEntryId("");
        setSelectedCustomerId("");
        setShowSuggestions(true);
        setBalanceInfo({
            type: null,
            oldBalance: 0,
            advanceBalance: 0,
        });
        if (targetMode === "advance") {
            setAdvanceForm((prev) => ({
                ...prev,
                name: value,
                phone: "",
            }));
            return;
        }

        setForm((prev) => ({
            ...prev,
            name: value,
            phone: "",
        }));
    };

    const handleSelectCustomer = (customer, targetMode = mode) => {
        const oldBalance = parseNum(customer.oldBalance);
        const advanceBalance = parseNum(customer.advanceBalance);
        const activeType =
            oldBalance > 0 ? "old" : advanceBalance > 0 ? "advance" : null;

        setEditingEntryId("");
        setSelectedCustomerId(customer.id);
        setShowSuggestions(false);
        if (targetMode === "advance") {
            setAdvanceForm((prev) => ({
                ...prev,
                name: customer.name,
                phone: customer.phone,
            }));
        } else {
            setForm((prev) => ({
                ...prev,
                name: customer.name,
                phone: customer.phone,
            }));
        }
        setBalanceInfo({
            type: activeType,
            oldBalance: activeType === "old" ? oldBalance : 0,
            advanceBalance: activeType === "advance" ? advanceBalance : 0,
        });
    };

    const handleAdvanceChange = (value) => {
        setAdvanceForm((prev) => {
            const goldValue = computeCashPure(value, ftRate);
            return {
                ...prev,
                advanceAmount: value,
                gold: goldValue > 0 ? formatThree(goldValue) : "",
            };
        });
    };

    const isNumericValue = (value) => /^(\d+(\.\d+)?)$/.test(String(value).trim());

    const applyUpdatedBalance = (customer, pureValue) => {
        const oldBalance = parseNum(customer?.oldBalance);
        const advanceBalance = parseNum(customer?.advanceBalance);

        if (oldBalance > 0) {
            const nextOldBalance = oldBalance + pureValue;
            return {
                type: "old",
                oldBalance: nextOldBalance,
                advanceBalance: 0,
            };
        }

        if (advanceBalance > 0) {
            const nextAdvance = advanceBalance - pureValue;
            if (nextAdvance >= 0) {
                return {
                    type: "advance",
                    oldBalance: 0,
                    advanceBalance: nextAdvance,
                };
            }

            if (nextAdvance < 0) {
                return {
                    type: "old",
                    oldBalance: Math.abs(nextAdvance),
                    advanceBalance: 0,
                };
            }

            return {
                type: null,
                oldBalance: 0,
                advanceBalance: 0,
            };
        }

        return {
            type: pureValue > 0 ? "old" : null,
            oldBalance: pureValue > 0 ? pureValue : 0,
            advanceBalance: 0,
        };
    };

    const applyAdvanceUpdatedBalance = (customer, pureValue) => {
        const oldBalance = parseNum(customer?.oldBalance);
        const advanceBalance = parseNum(customer?.advanceBalance);

        if (oldBalance > 0) {
            const nextOldBalance = oldBalance - pureValue;
            if (nextOldBalance >= 0) {
                return {
                    type: nextOldBalance > 0 ? "old" : null,
                    oldBalance: nextOldBalance,
                    advanceBalance: 0,
                };
            }

            return {
                type: "advance",
                oldBalance: 0,
                advanceBalance: Math.abs(nextOldBalance),
            };
        }

        if (advanceBalance > 0) {
            return {
                type: "advance",
                oldBalance: 0,
                advanceBalance: advanceBalance + pureValue,
            };
        }

        return {
            type: pureValue > 0 ? "advance" : null,
            oldBalance: 0,
            advanceBalance: pureValue > 0 ? pureValue : 0,
        };
    };

    const handleEditHistory = (item) => {
        const isAdvanceEntry = item.billType === "advance";
        setMode(isAdvanceEntry ? "advance" : "cash");
        setEditingEntryId(item.id);
        setSelectedCustomerId(item.customerId || "");
        setShowSuggestions(false);
        if (isAdvanceEntry) {
            const advanceAmount = String(item.advanceAmount || item.cash || "");
            const goldValue = computeCashPure(advanceAmount, ftRate);
            setAdvanceForm({
                name: item.name || "",
                phone: item.phone || "",
                advanceAmount,
                gold: goldValue > 0 ? formatThree(goldValue) : "",
            });
            setForm(createEmptyForm());
        } else {
            setForm({
                name: item.name || "",
                phone: item.phone || "",
                cash: String(item.cash || ""),
                pure: String(item.pure || ""),
            });
            setAdvanceForm({
                name: "",
                phone: "",
                advanceAmount: "",
                gold: "",
            });
        }
        setBalanceInfo({
            type:
                parseNum(item.pastOldBalance) > 0
                    ? "old"
                    : parseNum(item.pastAdvanceBalance) > 0
                        ? "advance"
                        : null,
            oldBalance: parseNum(item.pastOldBalance),
            advanceBalance: parseNum(item.pastAdvanceBalance),
        });
    };

    const handleAdvanceSave = async () => {
        const trimmedName = advanceForm.name.trim();
        const trimmedPhone = advanceForm.phone.trim();
        const trimmedAdvanceAmount = advanceForm.advanceAmount.trim();

        if (!trimmedName) {
            Alert.alert("Validation", "Please enter or select a customer name.");
            return;
        }

        if (!trimmedAdvanceAmount) {
            Alert.alert("Validation", "Please enter advance amount.");
            return;
        }

        if (!isNumericValue(trimmedAdvanceAmount)) {
            Alert.alert("Validation", "Advance amount must be a valid number.");
            return;
        }

        if (parseNum(ftRate) <= 0) {
            Alert.alert("Validation", "FT Rate is invalid. Please check Home Screen rate.");
            return;
        }

        const selectedCustomer = customers.find(
            (customer) => String(customer.phone || "").trim() === trimmedPhone
        );
        const pureValue = computeCashPure(trimmedAdvanceAmount, ftRate);
        const updatedBalance = applyAdvanceUpdatedBalance(
            selectedCustomer || balanceInfo,
            pureValue
        );
        const pastOldBalance = parseNum(selectedCustomer?.oldBalance ?? balanceInfo.oldBalance);
        const pastAdvanceBalance = parseNum(
            selectedCustomer?.advanceBalance ?? balanceInfo.advanceBalance
        );

        if (trimmedPhone) {
            try {
                const response = await fetch(`${base_url}/customers/update-balance`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone: trimmedPhone,
                        oldBalance: updatedBalance.oldBalance,
                        advanceBalance: updatedBalance.advanceBalance,
                    }),
                });

                if (!response.ok) {
                    let errorMessage = "Failed to update customer balance";
                    try {
                        const body = await response.json();
                        if (body?.message) errorMessage = body.message;
                    } catch (_) { }
                    throw new Error(errorMessage);
                }

                await fetchCustomers();
            } catch (error) {
                console.log("Cashpage advance balance update failed:", error?.message);
                Alert.alert("Error", error?.message || "Failed to update customer balance.");
                return;
            }
        }

        const fallbackBillId = `cash-bill-${Date.now()}`;
        const dateTime = new Date().toISOString();
        const billId = editingEntryId
            ? entries.find((item) => item.id === editingEntryId)?.billId || fallbackBillId
            : fallbackBillId;
        const advanceBill = {
            id: billId,
            billType: "advance",
            name: trimmedName,
            phone: trimmedPhone,
            pastOldBalance: pastOldBalance,
            pastAdvanceBalance: pastAdvanceBalance,
            advanceAmount: Number(trimmedAdvanceAmount).toFixed(2),
            presentOldBalance: updatedBalance.oldBalance,
            presentAdvanceBalance: updatedBalance.advanceBalance,
            dateTime,
        };

        const newEntry = {
            id: editingEntryId || Date.now().toString(),
            billId,
            customerId: selectedCustomerId,
            name: trimmedName,
            phone: trimmedPhone,
            pastOldBalance: formatThree(pastOldBalance),
            pastAdvanceBalance: formatThree(pastAdvanceBalance),
            presentOldBalance: formatThree(updatedBalance.oldBalance),
            presentAdvanceBalance: formatThree(updatedBalance.advanceBalance),
            advanceAmount: Number(trimmedAdvanceAmount).toFixed(2),
            cash: Number(trimmedAdvanceAmount).toFixed(2),
            pure: formatThree(pureValue),
            type: "advance",
            billType: "advance",
            dateTime,
            createdAt: new Date().toLocaleString(),
        };

        const previewCashAmount = Number(trimmedAdvanceAmount).toFixed(2);
        const previewPure = formatThree(pureValue);
        const previewPayload = {
            billType: mode,
            name: trimmedName,
            phone: trimmedPhone,
            oldBalance: updatedBalance.oldBalance,
            advanceBalance: updatedBalance.advanceBalance,
            cash: previewCashAmount,
            pure: previewPure,
            advanceAmount: previewCashAmount,
            gold: previewPure,
            dateTime,
        };
        const previewCustomer = {
            name: trimmedName,
            phone: trimmedPhone,
            oldBalance: updatedBalance.oldBalance,
            advanceBalance: updatedBalance.advanceBalance,
            type: mode,
            date: dateTime,
        };

        if (editingEntryId) {
            setEntries((prev) =>
                prev.map((item) => (item.id === editingEntryId ? newEntry : item))
            );
            setCashBills((prev) =>
                prev.map((bill) => (bill.id === billId ? advanceBill : bill))
            );
            setBalanceInfo(updatedBalance);
            setAdvanceForm((prev) => ({
                ...prev,
                advanceAmount: "",
                gold: "",
            }));
            setEditingEntryId("");
            setShowSuggestions(false);
            Alert.alert("Success", "Advance entry updated successfully.");
            openBillPreview(previewPayload, previewCustomer);
            return;
        }

        setEntries((prev) => [newEntry, ...prev]);
        setCashBills((prev) => [advanceBill, ...prev]);
        setBalanceInfo(updatedBalance);
        setAdvanceForm((prev) => ({
            ...prev,
            advanceAmount: "",
            gold: "",
        }));
        setShowSuggestions(false);
        Alert.alert("Success", "Advance entry created successfully.");
        openBillPreview(previewPayload, previewCustomer);
    };

    const handleDeleteHistory = (id) => {
        setEntries((prev) => prev.filter((item) => item.id !== id));
        if (editingEntryId === id) {
            clearForm();
        }
    };

    const handlePrintHistory = (item) => {
        const matchedBill =
            cashBills.find((bill) => bill.id === item.billId) ||
            ((item.billType === "advance" || parseNum(item.pastAdvanceBalance) > 0)
                ? {
                    billType: "advance",
                    name: item.name,
                    phone: item.phone,
                    pastOldBalance: parseNum(item.pastOldBalance),
                    pastAdvanceBalance: parseNum(item.pastAdvanceBalance),
                    advanceAmount: item.cash,
                    presentOldBalance: parseNum(item.presentOldBalance),
                    presentAdvanceBalance: parseNum(item.presentAdvanceBalance),
                    dateTime: item.dateTime || new Date().toISOString(),
                }
                : {
                    billType: "cash",
                    name: item.name,
                    phone: item.phone,
                    oldBalance: parseNum(item.presentOldBalance),
                    advanceBalance: parseNum(item.presentAdvanceBalance),
                    cash: item.cash,
                    pure: item.pure,
                    dateTime: item.dateTime || new Date().toISOString(),
                });

        navigation.navigate("BillPreview", {
            billType: matchedBill.billType,
            cashBill: matchedBill.billType === "cash" ? matchedBill : undefined,
            advanceBill: matchedBill.billType === "advance" ? matchedBill : undefined,
            customer: {
                name: matchedBill.name,
                phone: matchedBill.phone,
                oldBalance: parseNum(
                    matchedBill.oldBalance ?? matchedBill.presentOldBalance
                ),
                advanceBalance: parseNum(
                    matchedBill.advanceBalance ?? matchedBill.presentAdvanceBalance
                ),
                type: matchedBill.billType,
                date: matchedBill.dateTime,
            },
        });
    };

    const handleSave = async () => {
        const trimmedName = form.name.trim();
        const trimmedPhone = form.phone.trim();
        const trimmedCash = form.cash.trim();
        const pureValue = parseNum(form.pure);

        if (!trimmedName) {
            Alert.alert("Validation", "Please enter or select a customer name.");
            return;
        }

        if (!trimmedCash) {
            Alert.alert("Validation", "Please enter cash.");
            return;
        }

        if (!isNumericValue(trimmedCash)) {
            Alert.alert("Validation", "Cash must be a valid number.");
            return;
        }

        if (parseNum(ftRate) <= 0) {
            Alert.alert("Validation", "FT Rate is invalid. Please check Home Screen rate.");
            return;
        }

        const selectedCustomer = customers.find(
            (customer) => String(customer.phone || "").trim() === trimmedPhone
        );

        console.log("Cashpage selected customer before update:", selectedCustomer);
        console.log("Cashpage customers before update:", customers);

        const updatedBalance = applyUpdatedBalance(
            selectedCustomer || balanceInfo,
            pureValue
        );

        const pastOldBalance = parseNum(selectedCustomer?.oldBalance ?? balanceInfo.oldBalance);
        const pastAdvanceBalance = parseNum(
            selectedCustomer?.advanceBalance ?? balanceInfo.advanceBalance
        );

        if (editingEntryId) {
            const existingEntry = entries.find((item) => item.id === editingEntryId);
            const billId = existingEntry?.billId || `cash-bill-${editingEntryId}`;
            const updatedEntry = {
                id: editingEntryId,
                billId,
                customerId: selectedCustomerId,
                name: trimmedName,
                phone: trimmedPhone,
                pastOldBalance: formatThree(pastOldBalance),
                pastAdvanceBalance: formatThree(pastAdvanceBalance),
                presentOldBalance: formatThree(updatedBalance.oldBalance),
                presentAdvanceBalance: formatThree(updatedBalance.advanceBalance),
                cash: Number(trimmedCash).toFixed(2),
                pure: formatThree(pureValue),
                type: "cash",
                billType: "cash",
                dateTime: new Date().toISOString(),
            };

            const updatedBill = {
                id: billId,
                billType: "cash",
                name: trimmedName,
                phone: trimmedPhone,
                oldBalance: updatedBalance.oldBalance,
                advanceBalance: updatedBalance.advanceBalance,
                cash: Number(trimmedCash).toFixed(2),
                pure: formatThree(pureValue),
                dateTime: updatedEntry.dateTime,
            };

            setEntries((prev) =>
                prev.map((item) => (item.id === editingEntryId ? updatedEntry : item))
            );
            setCashBills((prev) =>
                prev.map((bill) => (bill.id === billId ? updatedBill : bill))
            );
            setBalanceInfo(updatedBalance);
            setForm((prev) => ({
                ...prev,
                cash: "",
                pure: "",
            }));
            setEditingEntryId("");
            setShowSuggestions(false);
            console.log("Success", "Cash bill updated successfully.");
            const previewPayload = {
                billType: mode,
                name: trimmedName,
                phone: trimmedPhone,
                oldBalance: updatedBalance.oldBalance,
                advanceBalance: updatedBalance.advanceBalance,
                cash: Number(trimmedCash).toFixed(2),
                pure: formatThree(pureValue),
                advanceAmount: "",
                gold: "",
                dateTime: updatedEntry.dateTime,
            };
            const previewCustomer = {
                name: trimmedName,
                phone: trimmedPhone,
                oldBalance: updatedBalance.oldBalance,
                advanceBalance: updatedBalance.advanceBalance,
                type: mode,
                date: updatedEntry.dateTime,
            };
            openBillPreview(previewPayload, previewCustomer);
            return;
        }

        if (trimmedPhone) {
            try {
                const response = await fetch(`${base_url}/customers/update-balance`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone: trimmedPhone,
                        oldBalance: updatedBalance.oldBalance,
                        advanceBalance: updatedBalance.advanceBalance,
                    }),
                });

                if (!response.ok) {
                    let errorMessage = "Failed to update customer balance";
                    try {
                        const body = await response.json();
                        if (body?.message) errorMessage = body.message;
                    } catch (_) { }
                    throw new Error(errorMessage);
                }

                const updatedCustomers = await fetchCustomers();
                console.log("Cashpage customers after update:", updatedCustomers);
            } catch (error) {
                console.log("Cashpage balance update failed:", error?.message);
                Alert.alert("Error", error?.message || "Failed to update customer balance.");
                return;
            }
        }

        const billId = `cash-bill-${Date.now()}`;
        const dateTime = new Date().toISOString();
        const savedBill = {
            id: billId,
            billType: "cash",
            name: trimmedName,
            phone: trimmedPhone,
            oldBalance: updatedBalance.oldBalance,
            advanceBalance: updatedBalance.advanceBalance,
            cash: Number(trimmedCash).toFixed(2),
            pure: formatThree(pureValue),
            dateTime,
        };

        const newEntry = {
            id: Date.now().toString(),
            billId,
            customerId: selectedCustomerId,
            name: trimmedName,
            phone: form.phone.trim(),
            pastOldBalance: formatThree(pastOldBalance),
            pastAdvanceBalance: formatThree(pastAdvanceBalance),
            presentOldBalance: formatThree(updatedBalance.oldBalance),
            presentAdvanceBalance: formatThree(updatedBalance.advanceBalance),
            cash: Number(trimmedCash).toFixed(2),
            pure: formatThree(pureValue),
            ftRate: Number(parseNum(ftRate)).toFixed(2),
            balanceType: updatedBalance.type,
            oldBalance: formatThree(updatedBalance.oldBalance),
            advanceBalance: formatThree(updatedBalance.advanceBalance),
            currentBalance: formatThree(updatedBalance.oldBalance),
            remainingAdvance: formatThree(updatedBalance.advanceBalance),
            type: "cash",
            billType: savedBill.billType,
            dateTime: savedBill.dateTime,
            createdAt: new Date().toLocaleString(),
        };

        const previewPayload = {
            billType: mode,
            name: trimmedName,
            phone: trimmedPhone,
            oldBalance: updatedBalance.oldBalance,
            advanceBalance: updatedBalance.advanceBalance,
            cash: Number(trimmedCash).toFixed(2),
            pure: formatThree(pureValue),
            advanceAmount: "",
            gold: "",
            dateTime,
        };
        const previewCustomer = {
            name: trimmedName,
            phone: trimmedPhone,
            oldBalance: updatedBalance.oldBalance,
            advanceBalance: updatedBalance.advanceBalance,
            type: mode,
            date: dateTime,
        };

        setEntries((prev) => [newEntry, ...prev]);
        setCashBills((prev) => {
            const alreadyExists = prev.some(
                (bill) =>
                    bill.phone === savedBill.phone &&
                    bill.dateTime === savedBill.dateTime &&
                    (bill.cash === savedBill.cash || bill.advanceAmount === savedBill.advanceAmount)
            );
            return alreadyExists ? prev : [savedBill, ...prev];
        });
        setBalanceInfo(updatedBalance);
        setForm((prev) => ({
            ...prev,
            cash: "",
            pure: "",
        }));
        setShowSuggestions(false);
        Alert.alert("Success", "Cash bill created successfully.");
        openBillPreview(previewPayload, previewCustomer);
    };

    const renderItem = ({ item }) => {
        const entryType = item.type === "advance" || item.billType === "advance"
            ? "advance"
            : "cash";

        return (
            <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <View style={styles.historyTitleBlock}>
                        <Text style={styles.historyName}>{item.name}</Text>
                        {item.phone ? <Text style={styles.historyPhone}>{item.phone}</Text> : null}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[
                                styles.categoryButton,
                                entryType === "cash"
                                    ? styles.categoryButtonCash
                                    : styles.categoryButtonAdvance,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.categoryText,
                                    entryType === "cash"
                                        ? styles.categoryTextCash
                                        : styles.categoryTextAdvance,
                                ]}
                            >
                                {entryType === "cash" ? "Cash" : "Advance"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.historyDate}>
                        {new Date(item.dateTime || item.createdAt).toLocaleString()}
                    </Text>
                </View>

                <Text style={styles.historyValue}>
                    Past Balance:{" "}
                    {parseNum(item.pastOldBalance) > 0
                        ? `Old Balance : ${item.pastOldBalance}`
                        : `Advance Balance : ${item.pastAdvanceBalance || "0.000"}`}
                </Text>
                <Text style={styles.historyValue}>
                    Present Balance:{" "}
                    {parseNum(item.presentOldBalance) > 0
                        ? `Old Balance - ${item.presentOldBalance}`
                        : `Advance Balance - ${item.presentAdvanceBalance || "0.000"}`}
                </Text>

                {entryType === "advance" ? (
                    <Text style={styles.historyValue}>
                        Advance Amount: {item.advanceAmount || item.cash}
                    </Text>
                ) : (
                    <>
                        <Text style={styles.historyValue}>Cash: {item.cash}</Text>
                        <Text style={styles.historyValue}>Pure: {item.pure}</Text>
                    </>
                )}
                <View style={styles.historyActionRow}>
                    <TouchableOpacity
                        style={[styles.historyActionButton, styles.printHistoryButton]}
                        onPress={() => handlePrintHistory(item)}
                    >
                        <Text style={styles.historyActionText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.historyActionButton, styles.editHistoryButton]}
                        onPress={() => handleEditHistory(item)}
                    >
                        <Text style={styles.historyActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.historyActionButton, styles.deleteHistoryButton]}
                        onPress={() => handleDeleteHistory(item.id)}
                    >
                        <Text style={styles.historyActionText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.page}>
            <CommonHeader
                title="Cash Page"
                onBack={() => navigation?.goBack?.()}
                backgroundColor="#1B4D1B"
                right={
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                            <Ionicons name="refresh" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Home")}
                            style={styles.headerIconButton}
                        >
                            <MaterialCommunityIcons name="home-outline" color="#fff" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate("CreateCustomerMaster", { type: "B2B" })
                            }
                            style={styles.headerIconButton}
                        >
                            <Feather name="user-plus" color="#fff" size={22} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <FlatList
                data={filteredHistory}
                extraData={filteredHistory}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <View style={styles.formCard}>
                        <View style={styles.modeRow}>
                            <TouchableOpacity
                                style={[
                                    styles.modeButton,
                                    mode === "cash" && styles.modeButtonActive,
                                ]}
                                onPress={() => handleModeChange("cash")}
                            >
                                <Text
                                    style={[
                                        styles.modeButtonText,
                                        mode === "cash" && styles.modeButtonTextActive,
                                    ]}
                                >
                                    Cash
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modeButton,
                                    mode === "advance" && styles.modeButtonActive,
                                ]}
                                onPress={() => handleModeChange("advance")}
                            >
                                <Text
                                    style={[
                                        styles.modeButtonText,
                                        mode === "advance" && styles.modeButtonTextActive,
                                    ]}
                                >
                                    Advance
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>
                            {mode === "advance" ? "Advance Entry" : "Cash Entry"}
                        </Text>

                        <View style={styles.rateBanner}>
                            <Text style={styles.rateLabel}>FT Rate</Text>
                            <Text style={styles.rateValue}>₹{parseNum(ftRate).toFixed(2)}</Text>
                        </View>

                        <Text style={styles.label}>Customer Name</Text>
                        <TextInput
                            value={mode === "advance" ? advanceForm.name : form.name}
                            onChangeText={(value) => handleNameChange(value, mode)}
                            onFocus={() => setShowSuggestions(true)}
                            placeholder="Search customer name"
                            placeholderTextColor="#777"
                            style={styles.input}
                        />

                        {showSuggestions &&
                            (mode === "advance" ? advanceForm.name.trim() : form.name.trim()) ? (
                            <View style={styles.suggestionBox}>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer) => {
                                        const hasOld = customer.oldBalance > 0;
                                        const hasAdvance = !hasOld && customer.advanceBalance > 0;
                                        return (
                                            <TouchableOpacity
                                                key={customer.id}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectCustomer(customer, mode)}
                                            >
                                                <Text style={styles.suggestionName}>{customer.name}</Text>
                                                <Text style={styles.suggestionMeta}>
                                                    {customer.phone || "No phone"}
                                                    {hasOld ? ` | OB: ${formatThree(customer.oldBalance)}` : ""}
                                                    {hasAdvance ? ` | AB: ${formatThree(customer.advanceBalance)}` : ""}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.noSuggestionText}>
                                        {loadingCustomers ? "Loading customers..." : "No matching customer"}
                                    </Text>
                                )}
                            </View>
                        ) : null}

                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            value={mode === "advance" ? advanceForm.phone : form.phone}
                            editable={false}
                            placeholder="Customer phone will appear here"
                            placeholderTextColor="#777"
                            style={[styles.input, styles.readOnlyInput]}
                        />

                        {balanceInfo.type === "old" ? (
                            <>
                                <Text style={styles.label}>Old Balance</Text>
                                <TextInput
                                    value={formatThree(balanceInfo.oldBalance)}
                                    editable={false}
                                    style={[styles.input, styles.readOnlyInput]}
                                />

                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>
                                        {mode === "advance" && convertedAdvanceBalance > 0
                                            ? "Converted Advance"
                                            : "Current Balance"}
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        {formatThree(
                                            mode === "advance" && convertedAdvanceBalance > 0
                                                ? convertedAdvanceBalance
                                                : currentBalance
                                        )}
                                    </Text>
                                </View>
                            </>
                        ) : null}

                        {balanceInfo.type === "advance" ? (
                            <>
                                <Text style={styles.label}>Advance Balance</Text>
                                <TextInput
                                    value={formatThree(balanceInfo.advanceBalance)}
                                    editable={false}
                                    style={[styles.input, styles.readOnlyInput]}
                                />

                                <View style={[styles.summaryCard, styles.advanceSummaryCard]}>
                                    <Text style={styles.summaryTitle}>
                                        {mode === "advance"
                                            ? "Updated Advance"
                                            : remainingAdvanceRaw < 0
                                                ? "Converted Old Balance"
                                                : "Remaining Advance"}
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        {formatThree(
                                            mode === "advance"
                                                ? remainingAdvance
                                                : remainingAdvanceRaw < 0
                                                    ? convertedOldBalance
                                                    : remainingAdvance
                                        )}
                                    </Text>
                                </View>
                            </>
                        ) : null}

                        {!balanceInfo.type && selectedCustomerId ? (
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryTitle}>Balance Status</Text>
                                <Text style={styles.summaryValue}>New Entry</Text>
                            </View>
                        ) : null}

                        {mode === "advance" ? (
                            <>
                                <Text style={styles.label}>Advance Amount</Text>
                                <TextInput
                                    value={advanceForm.advanceAmount}
                                    onChangeText={handleAdvanceChange}
                                    placeholder="Enter advance amount"
                                    placeholderTextColor="#777"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />

                                <Text style={styles.label}>Gold (g)</Text>
                                <TextInput
                                    value={advanceForm.gold}
                                    editable={false}
                                    placeholder="Gold (g)"
                                    placeholderTextColor="#777"
                                    style={[styles.input, styles.readOnlyInput]}
                                />
                            </>
                        ) : (
                            <>
                                <Text style={styles.label}>Cash</Text>
                                <TextInput
                                    value={form.cash}
                                    onChangeText={(value) => setForm((prev) => ({ ...prev, cash: value }))}
                                    placeholder="Enter cash amount"
                                    placeholderTextColor="#777"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />

                                <Text style={styles.label}>Pure</Text>
                                <TextInput
                                    value={form.pure}
                                    editable={false}
                                    placeholder="Auto calculated pure"
                                    placeholderTextColor="#777"
                                    style={[styles.input, styles.readOnlyInput]}
                                />
                            </>
                        )}

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={mode === "advance" ? handleAdvanceSave : handleSave}
                            >
                                <Text style={styles.saveButtonText}>
                                    {editingEntryId ? "Update" : "Save"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.cancelButton} onPress={clearForm}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.historySectionHeader}>
                            <Text style={styles.sectionTitle}>History</Text>
                            <Text style={styles.historyCount}>{filteredHistory.length} item(s)</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No Data</Text>
                        <Text style={styles.emptySubtext}>Saved entries will appear here.</Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: "#F4F6F9",
    },
    listContent: {
        padding: 14,
        paddingBottom: 28,
    },
    formCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        elevation: 3,
    },
    modeRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 14,
    },
    modeButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#D7DEDC",
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: "center",
        backgroundColor: "#F5F7F6",
    },
    modeButtonActive: {
        backgroundColor: "#1B4D1B",
        borderColor: "#1B4D1B",
    },
    modeButtonText: {
        color: "#000",
        fontSize: 15,
        fontWeight: "700",
    },
    modeButtonTextActive: {
        color: "#FFF",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
        marginBottom: 14,
    },
    rateBanner: {
        backgroundColor: "#EEF7EF",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    rateLabel: {
        color: "#000",
        fontSize: 14,
        fontWeight: "600",
    },
    rateValue: {
        color: "#1B4D1B",
        fontSize: 18,
        fontWeight: "800",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#000",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#D7DEDC",
        borderRadius: 12,
        backgroundColor: "#FDFDFD",
        color: "#000",
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 14,
        fontSize: 15,
    },
    readOnlyInput: {
        backgroundColor: "#F1F4F3",
    },
    suggestionBox: {
        borderWidth: 1,
        borderColor: "#D7DEDC",
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        marginTop: -8,
        marginBottom: 14,
        overflow: "hidden",
    },
    suggestionItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F0",
    },
    suggestionName: {
        color: "#000",
        fontSize: 15,
        fontWeight: "700",
    },
    suggestionMeta: {
        color: "#444",
        fontSize: 12,
        marginTop: 4,
    },
    noSuggestionText: {
        color: "#000",
        fontSize: 14,
        padding: 14,
    },
    summaryCard: {
        backgroundColor: "#F5F9F5",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    advanceSummaryCard: {
        backgroundColor: "#F2F8F2",
    },
    summaryTitle: {
        color: "#000",
        fontSize: 13,
        fontWeight: "600",
    },
    summaryValue: {
        color: "#1B4D1B",
        fontSize: 22,
        fontWeight: "800",
        marginTop: 6,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 4,
        marginBottom: 18,
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#1B4D1B",
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: "center",
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "#E8ECEF",
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "700",
    },
    refreshButton: {
        padding: 4,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerIconButton: {
        padding: 4,
    },
    historySectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    historyCount: {
        color: "#555",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 14,
    },
    historyCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        elevation: 2,
    },
    historyHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    historyTitleBlock: {
        flex: 1,
        marginRight: 12,
    },
    historyName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#000",
    },
    historyPhone: {
        fontSize: 12,
        color: "#444",
        marginTop: 2,
    },
    categoryButton: {
        alignSelf: "flex-start",
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    categoryButtonCash: {
        backgroundColor: "#EAF7EE",
        borderColor: "#B7DFC3",
    },
    categoryButtonAdvance: {
        backgroundColor: "#EAF2FF",
        borderColor: "#B8CCF3",
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    categoryTextCash: {
        color: "#1F6A38",
    },
    categoryTextAdvance: {
        color: "#2457B5",
    },
    historyDate: {
        fontSize: 12,
        color: "#333",
    },
    historyValue: {
        fontSize: 14,
        color: "#000",
        marginTop: 3,
    },
    historyActionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 12,
    },
    historyActionButton: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    editHistoryButton: {
        backgroundColor: "#E3F2FD",
    },
    printHistoryButton: {
        backgroundColor: "#E8F5E9",
    },
    deleteHistoryButton: {
        backgroundColor: "#FFEBEE",
    },
    historyActionText: {
        color: "#000",
        fontSize: 13,
        fontWeight: "700",
    },
    emptyCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 18,
        elevation: 1,
    },
    emptyText: {
        textAlign: "center",
        color: "#000",
        fontSize: 16,
        fontWeight: "700",
    },
    emptySubtext: {
        textAlign: "center",
        color: "#666",
        fontSize: 13,
        marginTop: 6,
    },
    inactiveButton: {
        backgroundColor: "#ccc",
    },
});

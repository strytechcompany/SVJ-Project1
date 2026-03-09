import AsyncStorage from "@react-native-async-storage/async-storage";

export const REMINDER_SETTINGS_KEY = "reminder_settings_v1";

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  days: 3,
  inAppOnly: true,
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const normalizePhone = (value) => {
  const raw = String(value || "").trim();
  return raw || "-";
};

export const parseRecordDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dt = new Date(value);
  if (!Number.isNaN(dt.getTime())) return dt;

  if (typeof value === "string" && value.includes("/")) {
    const [datePart] = value.split(" ");
    const [dd, mm, yyyy] = datePart.split("/").map(Number);
    const fallback = new Date(yyyy, (mm || 1) - 1, dd || 1);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return null;
};

export const calculateDaysDiff = (fromDate, toDate = new Date()) => {
  if (!fromDate) return null;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - start.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
};

export const loadReminderSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed?.enabled !== false,
      days: Math.max(1, toNumber(parsed?.days, DEFAULT_REMINDER_SETTINGS.days)),
      inAppOnly: parsed?.inAppOnly !== false,
    };
  } catch (error) {
    console.error("Failed to load reminder settings:", error);
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
};

export const saveReminderSettings = async (settings) => {
  const sanitized = {
    enabled: settings?.enabled !== false,
    days: Math.max(1, toNumber(settings?.days, DEFAULT_REMINDER_SETTINGS.days)),
    inAppOnly: settings?.inAppOnly !== false,
  };
  await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(sanitized));
  return sanitized;
};

const getCustomerPendingBalance = (customer) => {
  const oldBalance = toNumber(customer?.oldBalance, 0);
  const advanceBalance = toNumber(customer?.advanceBalance, 0);
  return oldBalance > 0 ? oldBalance : Math.max(0, oldBalance - advanceBalance);
};

const getCustomerId = (customer) =>
  String(customer?.customerId || customer?.id || customer?._id || "");

const getCustomerName = (customer) =>
  String(customer?.customerName || customer?.name || "Unknown");

const getCustomerPhone = (customer) =>
  normalizePhone(
    customer?.customerNumber || customer?.phoneNumber || customer?.phone || customer?.mobileNumber || customer?.mobile
  );

const detectCustomerType = (customer) => {
  const t = String(customer?.customerType || customer?.type || "").toUpperCase();
  if (t === "SUPPLIER" || t === "DEALER") return "Dealer";
  if (t === "B2C") return "B2C";
  return "B2B";
};

export const buildReminderAlerts = ({
  customers = [],
  transactions = [],
  settings = DEFAULT_REMINDER_SETTINGS,
  now = new Date(),
}) => {
  if (!settings?.enabled) return [];

  const txMap = new Map();
  for (const tx of transactions || []) {
    const txDate = parseRecordDate(tx?.date || tx?.createdAt || tx?.updatedAt);
    if (!txDate) continue;
    const keys = [
      String(tx?.customerId || ""),
      String(tx?.customerName || ""),
    ].filter(Boolean);
    keys.forEach((key) => {
      const existing = txMap.get(key);
      if (!existing || txDate > existing) txMap.set(key, txDate);
    });
  }

  const threshold = Math.max(1, toNumber(settings?.days, 3));
  const alerts = [];

  for (const customer of customers || []) {
    const customerId = getCustomerId(customer);
    const customerName = getCustomerName(customer);
    const customerType = detectCustomerType(customer);
    const pendingBalance = getCustomerPendingBalance(customer);

    const txDateById = customerId ? txMap.get(customerId) : null;
    const txDateByName = txMap.get(customerName);
    const lastTransactionDate = txDateById || txDateByName || parseRecordDate(customer?.updatedAt);
    const overdueDays = calculateDaysDiff(lastTransactionDate, now);

    if (overdueDays === null) continue;
    const isOverdueByDays = overdueDays > threshold;
    const hasPendingBalance = pendingBalance > 0;

    if (!isOverdueByDays) continue;
    if (!hasPendingBalance && txDateById) continue;

    alerts.push({
      id: `${customerType}-${customerId || customerName}`,
      customerId,
      customerName,
      customerType,
      customerPhone: getCustomerPhone(customer),
      pendingBalance: Number(pendingBalance.toFixed(3)),
      lastTransactionDate: lastTransactionDate ? lastTransactionDate.toISOString() : null,
      overdueDays,
      reason: hasPendingBalance ? "Pending balance overdue" : "No activity",
    });
  }

  alerts.sort((a, b) => b.overdueDays - a.overdueDays);
  return alerts;
};

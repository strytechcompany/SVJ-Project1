import AsyncStorage from "@react-native-async-storage/async-storage";

export const REMINDER_SETTINGS_KEY = "reminder_settings_v1";
export const REMINDER_SNOOZE_KEY = "reminder_snooze_v1";
export const REMINDER_DISMISSED_KEY = "reminder_dismissed_v1";

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

const normalizeSnoozeMap = (value) => {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((acc, [key, row]) => {
    if (!key) return acc;
    const until = parseRecordDate(row?.until);
    const days = Math.max(0, toNumber(row?.days, 0));
    if (!until) return acc;
    acc[key] = {
      until: until.toISOString(),
      days,
    };
    return acc;
  }, {});
};

export const loadReminderSnoozes = async () => {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_SNOOZE_KEY);
    if (!raw) return {};
    return normalizeSnoozeMap(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to load reminder snoozes:", error);
    return {};
  }
};

export const saveReminderSnoozes = async (value) => {
  const sanitized = normalizeSnoozeMap(value);
  await AsyncStorage.setItem(REMINDER_SNOOZE_KEY, JSON.stringify(sanitized));
  return sanitized;
};

export const loadReminderDismissed = async () => {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to load dismissed reminders:", error);
    return {};
  }
};

export const saveReminderDismissed = async (value) => {
  const sanitized = value && typeof value === "object" ? value : {};
  await AsyncStorage.setItem(REMINDER_DISMISSED_KEY, JSON.stringify(sanitized));
  return sanitized;
};

export const dismissReminderAlert = async (customerKey, signature) => {
  const key = String(customerKey || "").trim();
  if (!key) return loadReminderDismissed();
  const all = await loadReminderDismissed();
  all[key] = String(signature || "");
  return saveReminderDismissed(all);
};

export const clearReminderDismissed = async (customerKey) => {
  const key = String(customerKey || "").trim();
  if (!key) return loadReminderDismissed();
  const all = await loadReminderDismissed();
  delete all[key];
  return saveReminderDismissed(all);
};

export const setReminderSnoozeDays = async (customerKey, days, now = new Date()) => {
  const key = String(customerKey || "").trim();
  if (!key) return loadReminderSnoozes();

  const all = await loadReminderSnoozes();
  const safeDays = Math.max(0, toNumber(days, 0));

  if (safeDays <= 0) {
    delete all[key];
    return saveReminderSnoozes(all);
  }

  const until = new Date(now);
  until.setHours(0, 0, 0, 0);
  until.setDate(until.getDate() + safeDays);
  all[key] = {
    days: safeDays,
    until: until.toISOString(),
  };
  return saveReminderSnoozes(all);
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

const getCustomerPhoneDigits = (customer) =>
  String(
    customer?.customerNumber || customer?.phoneNumber || customer?.phone || customer?.mobileNumber || customer?.mobile || ""
  )
    .replace(/[^\d]/g, "")
    .trim();

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
  snoozes = {},
  dismissed = {},
  includeAllPending = false,
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
    const customerPhoneDigits = getCustomerPhoneDigits(customer);
    const pendingBalance = getCustomerPendingBalance(customer);

    const txDateById = customerId ? txMap.get(customerId) : null;
    const txDateByName = txMap.get(customerName);
    const lastTransactionDate = txDateById || txDateByName || parseRecordDate(customer?.updatedAt);
    const overdueDays = calculateDaysDiff(lastTransactionDate, now);
    const alertBaseKey = customerId || customerPhoneDigits || customerName;
    const alertId = `${customerType}-${alertBaseKey}`;
    const snoozeInfo = snoozes?.[alertId];
    const snoozeUntil = parseRecordDate(snoozeInfo?.until);
    const remainingDays = snoozeUntil && snoozeUntil > now ? calculateDaysDiff(now, snoozeUntil) : 0;

    if (overdueDays === null) continue;
    const isOverdueByDays = overdueDays > threshold;
    const hasPendingBalance = pendingBalance > 0;
    const notificationActive = isOverdueByDays && remainingDays <= 0;
    const signature = [
      alertId,
      Number(pendingBalance || 0).toFixed(3),
      lastTransactionDate ? lastTransactionDate.toISOString() : "na",
    ].join("|");

    if (!hasPendingBalance) continue;
    if (!includeAllPending && !notificationActive) continue;
    if (dismissed?.[alertId] && dismissed[alertId] === signature) continue;

    alerts.push({
      id: alertId,
      customerId,
      customerName,
      customerType,
      customerPhone: getCustomerPhone(customer),
      pendingBalance: Number(pendingBalance.toFixed(3)),
      lastTransactionDate: lastTransactionDate ? lastTransactionDate.toISOString() : null,
      overdueDays,
      remainingDays,
      notificationActive,
      reason: "Pending balance overdue",
      snoozeDays: Math.max(0, toNumber(snoozeInfo?.days, 0)),
      snoozeUntil: snoozeUntil ? snoozeUntil.toISOString() : null,
      signature,
    });
  }

  alerts.sort((a, b) => {
    if (Number(b.notificationActive) !== Number(a.notificationActive)) {
      return Number(b.notificationActive) - Number(a.notificationActive);
    }
    if ((a.remainingDays || 0) !== (b.remainingDays || 0)) {
      return (a.remainingDays || 0) - (b.remainingDays || 0);
    }
    return b.overdueDays - a.overdueDays;
  });
  return alerts;
};

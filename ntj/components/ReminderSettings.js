import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import CommonHeader from "./CommonHeader";
import {
  DEFAULT_REMINDER_SETTINGS,
  loadReminderSettings,
  saveReminderSettings,
} from "./reminderService";

export default function ReminderSettings({ navigation }) {
  const [settings, setSettings] = useState(DEFAULT_REMINDER_SETTINGS);
  const [daysInput, setDaysInput] = useState(String(DEFAULT_REMINDER_SETTINGS.days));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadReminderSettings();
      setSettings(saved);
      setDaysInput(String(saved.days));
    })();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const parsedDays = Math.max(1, Number.parseInt(daysInput, 10) || DEFAULT_REMINDER_SETTINGS.days);
      const next = await saveReminderSettings({
        ...settings,
        days: parsedDays,
      });
      setSettings(next);
      setDaysInput(String(next.days));
      Alert.alert("Success", "Reminder settings saved.");
    } catch (error) {
      console.error("Failed to save reminder settings:", error);
      Alert.alert("Error", "Failed to save reminder settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Reminder Settings"
        backgroundColor="#3D2800"
        left={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Reminder Rules</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Enable Reminders</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, enabled: value }))}
              trackColor={{ false: "#ccc", true: "#81C784" }}
              thumbColor={settings.enabled ? "#B8860B" : "#f4f3f4"}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Overdue Days</Text>
            <TextInput
              style={styles.daysInput}
              keyboardType="number-pad"
              value={daysInput}
              onChangeText={(v) => setDaysInput(v.replace(/[^\d]/g, ""))}
              placeholder="3"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>In-app Alert Only</Text>
            <Switch
              value={settings.inAppOnly}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, inAppOnly: value }))}
              trackColor={{ false: "#ccc", true: "#81C784" }}
              thumbColor={settings.inAppOnly ? "#B8860B" : "#f4f3f4"}
            />
          </View>

          <Text style={styles.note}>
            WhatsApp auto-reminders are disabled. Admin receives in-app notifications only.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Settings"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, color: "#3D2800", marginBottom: 12, fontWeight: "bold" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: { fontSize: 16, color: "#333", fontWeight: "500" },
  daysInput: {
    width: 80,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  note: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: "#3D2800",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

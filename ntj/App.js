import React, { useState, useEffect } from "react";
import { Platform, Text, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./components/HomeScreen";

import SuspenseTransaction from "./components/SuspenseTransaction";
import SuspenseHistoryScreen from "./components/SuspenseHistoryScreen";

import PersonalUser from "./components/PersonalUser";

import SettingsScreen from "./components/SettingsScreen";
import EditSuspenseTransaction from "./components/EditSuspenseTransaction";
import ViewSuspenseDetails from "./components/ViewSuspenseDetails";

import CreateCustomerMaster from "./components/CreateCustomerMaster";
import EditCustomerMaster from "./components/EditCustomerMaster";

import B2Bt from "./components/B2Bt";
import B2BCalucationPage from "./components/B2BCalculationPage";

import B2Ct from "./components/B2ct";
import B2CCalucationPage from "./components/B2CCalculationPage";
import BillPreview from "./components/BillPreview";
import BillHistory from "./components/BillHistory";

import StockMaster from "./components/StockMaster";
import CustomerDataList from "./components/CustomerDataList";

import SD from "./components/SD";

import ReportScreen from "./components/ReportScreen";
import EstimateScreen from "./components/Estimate.js";
import EstimateBillHistory from "./components/EstimateBillHistory.js";

import UPIControl from "./components/UPIControl.js";

import ThirukkuralSettings from "./components/ThirukkuralSettings.js";
import ReminderSettings from "./components/ReminderSettings.js";
import AdminNotifications from "./components/AdminNotifications.js";
import DailyExpense from "./components/dailyExpense";
import Chit from "./components/Chit";
import DailyIssueReport from "./components/DailyIssueReport";

const Stack = createNativeStackNavigator();

if (Platform.OS === "android" && !__DEV__) {
  if (Text.defaultProps == null) {
    Text.defaultProps = {};
  }

  if (TextInput.defaultProps == null) {
    TextInput.defaultProps = {};
  }

  const existingTextStyle = Text.defaultProps.style;
  const existingTextInputStyle = TextInput.defaultProps.style;

  Text.defaultProps.style = Array.isArray(existingTextStyle)
    ? [{ color: "#000" }, ...existingTextStyle]
    : [{ color: "#000" }, existingTextStyle].filter(Boolean);

  TextInput.defaultProps.style = Array.isArray(existingTextInputStyle)
    ? [{ color: "#000" }, ...existingTextInputStyle]
    : [{ color: "#000" }, existingTextInputStyle].filter(Boolean);

  if (!TextInput.defaultProps.placeholderTextColor) {
    TextInput.defaultProps.placeholderTextColor = "#666";
  }
}

export default function App() {
  const [isChecking, setIsChecking] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Login");
  const [persistedUser, setPersistedUser] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const [adminLoggedIn, adminData, session] = await Promise.all([
        AsyncStorage.getItem("adminLoggedIn"),
        AsyncStorage.getItem("adminData"),
        AsyncStorage.getItem("userSession"),
      ]);
      const storedUser = adminData || session;
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setPersistedUser(parsedUser);
        setInitialRoute("Home");

        // Self-heal partially missing session flags so app restarts don't look like auto logout.
        if (adminLoggedIn !== "true" || !adminData || !session) {
          await AsyncStorage.multiSet([
            ["adminLoggedIn", "true"],
            ["adminData", JSON.stringify(parsedUser)],
            ["userSession", JSON.stringify(parsedUser)],
          ]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch session", e);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return null;
  }

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >

        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Home */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          initialParams={{ user: persistedUser }}
        />
        <Stack.Screen name="PersonalUser" component={PersonalUser} />

        {/* Suspense */}
        <Stack.Screen name="SuspenseTransaction" component={SuspenseTransaction} />
        <Stack.Screen name="SuspenseHistoryScreen" component={SuspenseHistoryScreen} />
        <Stack.Screen name="EditSuspenseTransaction" component={EditSuspenseTransaction} />
        <Stack.Screen name="ViewSuspenseDetails" component={ViewSuspenseDetails} />

        <Stack.Screen name="SD" component={SD} />

        {/* Customer Master */}
        <Stack.Screen name="CreateCustomerMaster" component={CreateCustomerMaster} />
        <Stack.Screen name="EditCustomerMaster" component={EditCustomerMaster} />

        {/* B2B and B2C Transactions */}
        <Stack.Screen name="B2Bt" component={B2Bt} />
        <Stack.Screen name="B2BCalculationPage" component={B2BCalucationPage} />
        <Stack.Screen name="B2Ct" component={B2Ct} />
        <Stack.Screen name="B2CCalculationPage" component={B2CCalucationPage} />
        <Stack.Screen name="BillPreview" component={BillPreview} />
        <Stack.Screen name="BillHistory" component={BillHistory} />

        {/* Stock Master */}
        <Stack.Screen name="StockMaster" component={StockMaster} />

        {/* Settings */}
        <Stack.Screen name="Settings" component={SettingsScreen} />

        <Stack.Screen name="CustomerDataList" component={CustomerDataList} />

        <Stack.Screen name="ReportScreen" component={ReportScreen} />
        <Stack.Screen name="Estimate" component={EstimateScreen} />
        <Stack.Screen name="EstimateBillHistory" component={EstimateBillHistory} />
        <Stack.Screen name="UPIControl" component={UPIControl} />
        <Stack.Screen name="ThirukkuralSettings" component={ThirukkuralSettings} />
        <Stack.Screen name="ReminderSettings" component={ReminderSettings} />
        <Stack.Screen name="AdminNotifications" component={AdminNotifications} />
        <Stack.Screen name="DailyExpense" component={DailyExpense} />
        <Stack.Screen name="Chit" component={Chit} />
        <Stack.Screen name="DailyIssueReport" component={DailyIssueReport} />

      </Stack.Navigator>
        </NavigationContainer>
  </SafeAreaProvider>
  );
}

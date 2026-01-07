import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./components/HomeScreen";

import RetailTransaction from "./components/RetailTransaction";
import AddRetailTransaction from "./components/AddRetailTransaction";

import SuspenseTransaction from "./components/SuspenseTransaction";

import Purchase from "./components/Purchase";

import UsersScreen from "./components/UsersScreen";
import Createuser from "./components/CreateUser";
import PersonalUser from "./components/PersonalUser";

import SettingsScreen from "./components/SettingsScreen";
import EditSuspenseTransaction from "./components/EditSuspenseTransaction";
import ViewSuspenseDetails from "./components/ViewSuspenseDetails";
import AddSuspenseTransaction from "./components/AddSuspenseTransaction";

import Order from "./components/Order";
import AddOrder from "./components/AddOrder";
import ViewOrder from "./components/ViewOrder";
import EditOrder from "./components/EditOrder";

import WorkerList from "./components/WorkerList";

import CustomerMasterList from "./components/CustomerMasterList";
import CreateCustomerMaster from "./components/CreateCustomerMaster";
import EditCustomerMaster from "./components/EditCustomerMaster";

import B2Bt from "./components/B2Bt";
import B2BCalucationPage from "./components/B2BCalculationPage";

import B2Ct from "./components/B2ct";
import B2CCalucationPage from "./components/B2CCalculationPage";
import BillPreview from "./components/BillPreview";

import StockMaster from "./components/StockMaster";
import ItemEntry from "./components/ItemEntry";
import ItemList from "./components/ItemList";
import CustomerDataList from "./components/CustomerDataList";
import Dealer from "./components/Dealer";
import PurchaseScreen from "./components/Purchase"


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Home */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PersonalUser" component={PersonalUser} />

        {/*Purchase*/}
        <Stack.Screen name="Purchase" component={Purchase} />

        {/* Transactions */}
        <Stack.Screen name="RetailTransaction" component={RetailTransaction} />
        <Stack.Screen name="AddRetailTransaction" component={AddRetailTransaction} />

        <Stack.Screen name="SuspenseTransaction" component={SuspenseTransaction} />

        {/* Users */}
        <Stack.Screen name="Users" component={UsersScreen} />
        <Stack.Screen name="CreateUser" component={Createuser} />
        <Stack.Screen name="EditSuspenseTransaction" component={EditSuspenseTransaction} />
        <Stack.Screen name="ViewSuspenseDetails" component={ViewSuspenseDetails} />
        <Stack.Screen name="AddSuspenseTransaction" component={AddSuspenseTransaction} />

        {/*Order*/}
        <Stack.Screen name="Order" component={Order} />
        <Stack.Screen name="AddOrder" component={AddOrder} />
        <Stack.Screen name="ViewOrder" component={ViewOrder} />
        <Stack.Screen name="EditOrder" component={EditOrder} />

        {/* Workers */}
        <Stack.Screen name="WorkerList" component={WorkerList} />

        {/* Customer Master */}
        <Stack.Screen name="CustomerMasterList" component={CustomerMasterList} />
        <Stack.Screen name="CreateCustomerMaster" component={CreateCustomerMaster} />
        <Stack.Screen name="EditCustomerMaster" component={EditCustomerMaster} />

        {/* B2B and B2C Transactions */}
        <Stack.Screen name="B2Bt" component={B2Bt}/>
        <Stack.Screen name="B2BCalculationPage" component={B2BCalucationPage}/>
        <Stack.Screen name="B2Ct" component={B2Ct}/>
        <Stack.Screen name="B2CCalculationPage" component={B2CCalucationPage}/>
        <Stack.Screen name="BillPreview" component={BillPreview}/>

        {/* Stock Master */}
        <Stack.Screen name="StockMaster" component={StockMaster} />
        <Stack.Screen name="ItemEntry" component={ItemEntry} />
        <Stack.Screen name="ItemList" component={ItemList} />

        {/* Settings */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
        {/* {/Customer Data List/} */}
        <Stack.Screen name="CustomerDataList" component={CustomerDataList} />
        <Stack.Screen name="Dealer" component={Dealer} />
        <Stack.Screen name="PurchaseScreen" component={PurchaseScreen} />
      
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAuthStore, isAdmin, isDriver } from '../stores/authStore';
import { C } from '../utils/colors';

// Screens
import LoginScreen            from '../screens/auth/LoginScreen';
import MyRequisitionsScreen   from '../screens/employee/MyRequisitionsScreen';
import NewRequisitionScreen   from '../screens/employee/NewRequisitionScreen';
import RequisitionDetailScreen from '../screens/employee/RequisitionDetailScreen';
import PendingApprovalsScreen  from '../screens/approver/PendingApprovalsScreen';
import AllTripsScreen          from '../screens/approver/AllTripsScreen';
import DriverHomeScreen        from '../screens/driver/DriverHomeScreen';
import DriverAllTripsScreen    from '../screens/driver/DriverAllTripsScreen';
import ActiveTripScreen        from '../screens/driver/ActiveTripScreen';
import DispatchDetailScreen    from '../screens/driver/DispatchDetailScreen';
import ProfileScreen           from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
    </View>
  );
}

// ── Employee tabs ──────────────────────────────────────────────────────────
function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: C.primary, tabBarStyle: { paddingBottom: 4 } }}>
      <Tab.Screen name="MyTrips" component={MyRequisitionsScreen}
        options={{ title: 'My Trips', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ── Approver tabs ──────────────────────────────────────────────────────────
function ApproverTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: C.emerald, tabBarStyle: { paddingBottom: 4 } }}>
      <Tab.Screen name="Pending" component={PendingApprovalsScreen}
        options={{ title: 'Pending', tabBarIcon: ({ focused }) => <TabIcon emoji="⏳" focused={focused} /> }} />
      <Tab.Screen name="AllTrips" component={AllTripsScreen}
        options={{ title: 'All Trips', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ── Driver tabs ────────────────────────────────────────────────────────────
function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: C.cyan, tabBarStyle: { paddingBottom: 4 } }}>
      <Tab.Screen name="Today" component={DriverHomeScreen}
        options={{ title: 'Today', tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" focused={focused} /> }} />
      <Tab.Screen name="AllMyTrips" component={DriverAllTripsScreen}
        options={{ title: 'All Trips', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ── Root navigator ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { token, user, isReady } = useAuthStore();

  if (!isReady) return null;

  // Choose tab set based on role
  function MainTabs() {
    if (isDriver(user))       return <DriverTabs />;
    if (isAdmin(user))        return <ApproverTabs />;
    return <EmployeeTabs />;    // default: employee
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main"               component={MainTabs} />
            {/* Shared screens reachable from any tab */}
            <Stack.Screen name="NewRequisition"     component={NewRequisitionScreen}    options={{ presentation: 'modal' }} />
            <Stack.Screen name="RequisitionDetail"  component={RequisitionDetailScreen} options={{ presentation: 'card'  }} />
            <Stack.Screen name="ActiveTrip"         component={ActiveTripScreen}        options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="DispatchDetail"     component={DispatchDetailScreen}    options={{ presentation: 'card'  }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

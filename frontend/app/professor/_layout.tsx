import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { MaterialCommunityIcons, FontAwesome5, Ionicons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function ProfessorTabsLayout() {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const activeColor = isDark ? '#7dd3fc' : '#2563eb';
  const inactiveColor = isDark ? '#94a3b8' : '#64748b';
  const bgColor = isDark ? '#0f172a' : '#fff';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: bgColor, paddingBottom: insets.bottom }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: activeColor,
            tabBarInactiveTintColor: inactiveColor,
            tabBarStyle: {
              backgroundColor: bgColor,
              borderTopWidth: 0,
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom,
            },
            tabBarLabelStyle: { fontSize: 12, marginBottom: 6 },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="view-dashboard" size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="classes"
            options={{
              title: 'Classes',
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="chalkboard-teacher" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="grading"
            options={{
              title: 'Grading',
              tabBarIcon: ({ color }) => (
                <FontAwesome name="graduation-cap" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="schedule"
            options={{
              title: 'Schedule',
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="calendar-month" size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => (
                <Ionicons name="person-circle-outline" size={23} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

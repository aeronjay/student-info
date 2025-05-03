import { View, Text } from 'react-native';

export default function DashboardScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">Student Dashboard</Text>
      <Text className="mt-2 text-gray-700 dark:text-gray-300">Welcome to your dashboard!</Text>
    </View>
  );
}
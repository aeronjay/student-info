import { Link } from "expo-router";
import { Text, View, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";

export default function WelcomeScreen() {
  const { colorScheme } = useColorScheme();
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900 px-6">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} translucent backgroundColor="transparent" />
      <View className="items-center mb-10">
        <Text className="text-6xl font-extrabold text-blue-700 dark:text-blue-400 mb-2 tracking-tight">EUP</Text>
        <Text className="text-xl text-gray-700 dark:text-gray-300 mb-6 text-center">Earist University of the Philippines</Text>
      </View>
      <Text className="text-2xl text-blue-600 dark:text-blue-300 font-semibold mb-8 text-center">Welcome to the EUP Classroom App</Text>
      <Link href="/login" asChild>
        <Pressable className="bg-blue-600 dark:bg-blue-500 px-8 py-3 rounded-full shadow-lg active:opacity-80">
          <Text className="text-white text-lg font-bold">Login</Text>
        </Pressable>
      </Link>
    </View>
  );
}

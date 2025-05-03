import { Link } from "expo-router";
import { Text, View, Pressable, ScrollView, Image } from "react-native";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="items-center mt-16 mb-10">
          {/* Medallion Icon */}
          <View className="mb-4">
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colorScheme === 'dark' ? '#38bdf8' : '#2563eb', backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#fff' }}
              resizeMode="cover"
            />
          </View>
          <Text className="text-6xl font-extrabold text-blue-700 dark:text-blue-400 mb-2 tracking-tight">EUP</Text>
          <Text className="text-xl text-gray-700 dark:text-gray-300 mb-6 text-center">Earist University of the Philippines</Text>
        </View>
        {/* Mission Section */}
        <View className="mb-8 w-full max-w-md mx-auto bg-blue-50 dark:bg-blue-950 rounded-2xl p-6 shadow-md">
          <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2 text-center">Our Mission</Text>
          <Text className="text-base text-gray-700 dark:text-gray-300 text-center mb-2">
            EUP is committed to providing quality, affordable, and accessible education. We empower students to become responsible, innovative, and globally competitive professionals through a nurturing and inclusive learning environment.
          </Text>
        </View>
        {/* Features Section */}
        <View className="mb-8 w-full max-w-md mx-auto">
          {/* Feature: Connect with Professors and Classmates */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6 flex-row items-center">
            <FontAwesome5 name="chalkboard-teacher" size={32} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} className="mr-4" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">Connect with Professors & Classmates</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300">Easily communicate, collaborate, and build relationships with your instructors and peers in every class.</Text>
            </View>
          </View>
          {/* Feature: Track Student Progress and Grades */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6 flex-row items-center">
            <MaterialCommunityIcons name="progress-check" size={32} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} className="mr-4" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">Track Progress & Grades</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300">Monitor your academic performance, view grades, and stay on top of your learning journey in real time.</Text>
            </View>
          </View>
          {/* Feature: Submit Assignments and Access Resources */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6 flex-row items-center">
            <Ionicons name="document-text-outline" size={32} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} className="mr-4" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">Assignments & Resources</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300">Submit assignments, download materials, and access all your class resources in one convenient place.</Text>
            </View>
          </View>
          {/* Feature: Announcements and Updates */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6 flex-row items-center">
            <Feather name="bell" size={32} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} className="mr-4" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">Announcements & Updates</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300">Stay informed with real-time notifications for important announcements, deadlines, and class activities.</Text>
            </View>
          </View>
          {/* Feature: Join and Manage Multiple Classes */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md flex-row items-center">
            <MaterialCommunityIcons name="account-group-outline" size={32} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} className="mr-4" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">Join & Manage Classes</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300">Easily join new classes, switch between them, and manage your academic schedule efficiently.</Text>
            </View>
          </View>
        </View>
        {/* Login Button Section */}
        <View className="items-center mb-10">
          <Link href="/login" asChild>
            <Pressable className="bg-blue-600 dark:bg-blue-500 px-8 py-3 rounded-full shadow-lg active:opacity-80">
              <Text className="text-white text-lg font-bold">Get Started!</Text>
            </Pressable>
          </Link>
        </View>
        {/* Dark/Light Mode Toggle */}
        <View className="items-center mb-8">
          <Pressable
            className="flex-row items-center px-4 py-2 rounded-full border border-blue-400 dark:border-blue-300"
            onPress={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          >
            <MaterialCommunityIcons name={colorScheme === 'dark' ? 'white-balance-sunny' : 'moon-waning-crescent'} size={20} color={colorScheme === 'dark' ? '#fbbf24' : '#2563eb'} className="mr-2" />
            <Text className="font-semibold text-blue-700 dark:text-blue-300">
              {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

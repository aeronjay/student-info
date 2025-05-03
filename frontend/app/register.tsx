import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { initDatabase, insertUser } from './db/sqlite';

function generateRandomId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function RegisterScreen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'professor'>('student');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initDatabase();
  }, []);

  function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const userRole = role === 'student' ? 'student' : 'pending_professor';
      const userId = generateRandomId();
      insertUser(userId, name, email, userRole); // uses runSync from sqlite.ts
      if (userRole === 'student') {
        router.replace('/student/dashboard');
      } else {
        Alert.alert("Success", "Registration submitted! Await superprofessor approval.");
        router.replace('/login');
      }
    } catch (err: any) {
      Alert.alert("Registration Error", err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 justify-center px-6">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} translucent backgroundColor="transparent" />
      {/* Back Icon Top Left */}
      <Pressable onPress={() => router.replace('/')} style={{ position: 'absolute', top: 48, left: 24, zIndex: 10 }} hitSlop={16}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} />
      </Pressable>
      <View className="items-center mb-8">
        <MaterialCommunityIcons name="account-plus" size={64} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} />
        <Text className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mt-2 mb-1">Register</Text>
        <Text className="text-base text-gray-700 dark:text-gray-300">Create your account</Text>
      </View>
      {/* Role Selection */}
      <View className="flex-row justify-center mb-8 space-x-4">
        <Pressable
          className={`flex-row items-center px-5 py-2 rounded-full border-2 ${role === 'student' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'} mr-2`}
          onPress={() => setRole('student')}
        >
          <FontAwesome5 name="user-graduate" size={20} color={role === 'student' ? '#2563eb' : colorScheme === 'dark' ? '#d1d5db' : '#6b7280'} className="mr-2" />
          <Text className={`font-semibold ${role === 'student' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Student</Text>
        </Pressable>
        <Pressable
          className={`flex-row items-center px-5 py-2 rounded-full border-2 ${role === 'professor' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'}`}
          onPress={() => setRole('professor')}
        >
          <MaterialCommunityIcons name="school" size={20} color={role === 'professor' ? '#2563eb' : colorScheme === 'dark' ? '#d1d5db' : '#6b7280'} className="mr-2" />
          <Text className={`font-semibold ${role === 'professor' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Professor</Text>
        </Pressable>
      </View>
      {/* Registration Form */}
      <View className="mb-6">
        <Text className="text-gray-700 dark:text-gray-300 mb-1 ml-1">Full Name</Text>
        <TextInput
          className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-4 border border-gray-200 dark:border-gray-700"
          placeholder="Enter your name"
          placeholderTextColor={colorScheme === 'dark' ? '#94a3b8' : '#64748b'}
          value={name}
          onChangeText={setName}
        />
        <Text className="text-gray-700 dark:text-gray-300 mb-1 ml-1">Email</Text>
        <TextInput
          className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-4 border border-gray-200 dark:border-gray-700"
          placeholder="Enter your email"
          placeholderTextColor={colorScheme === 'dark' ? '#94a3b8' : '#64748b'}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text className="text-gray-700 dark:text-gray-300 mb-1 ml-1">Password</Text>
        <TextInput
          className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-2 border border-gray-200 dark:border-gray-700"
          placeholder="Enter your password"
          placeholderTextColor={colorScheme === 'dark' ? '#94a3b8' : '#64748b'}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>
      {/* Register Button */}
      <Pressable
        className={`bg-blue-600 dark:bg-blue-500 py-3 rounded-full shadow-lg items-center mb-6 active:opacity-80 ${loading ? 'opacity-50' : ''}`}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-lg font-bold">{loading ? 'Registering...' : 'Register'}</Text>
      </Pressable>
      {/* Info for Professors */}
      {role === 'professor' && (
        <Text className="text-center text-yellow-600 dark:text-yellow-400 mb-4">Your registration will be reviewed by a superprofessor before you can access professor features.</Text>
      )}
      {/* Back to Login */}
      <View className="items-center mt-2">
        <Pressable onPress={() => router.replace('/login')}>
          <Text className="text-blue-600 dark:text-blue-300 font-semibold">Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

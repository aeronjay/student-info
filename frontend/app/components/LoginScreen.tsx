import { useState } from "react";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Link, useRouter } from "expo-router";
import { db } from '../db/sqlite';
import { useUser, User } from './UserContext';

export default function LoginScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [role, setRole] = useState<'student' | 'professor'>('student');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { setUser } = useUser();

  function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    try {
      const result = db.getFirstSync(
        'SELECT * FROM users WHERE email = ? AND role = ?',
        [email, role]
      ) as User;
      if (result) {
        setUser({
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
        });
        if (role === 'student') {
          router.replace('/student/dashboard');
        } else {
          router.replace('/professor/dashboard');
        }
      } else {
        Alert.alert('Login Failed', `No ${role} found with these credentials.`);
      }
    } catch (err: any) {
      Alert.alert('Login Error', err.message || 'Something went wrong.');
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 justify-center px-6">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} translucent backgroundColor="transparent" />
      {/* Back Icon Top Left */}
      <Pressable onPress={() => router.replace('/')} style={{ position: 'absolute', top: 48, left: 24, zIndex: 10 }} hitSlop={16}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} />
      </Pressable>
      {/* Header */}
      <View className="items-center mb-8">
        <MaterialCommunityIcons name="account-circle" size={64} color={colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'} />
        <Text className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mt-2 mb-1">EUP Login</Text>
        <Text className="text-base text-gray-700 dark:text-gray-300">Sign in to your account</Text>
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
      {/* Login Form */}
      <View className="mb-6">
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
      {/* Login Button */}
      <Pressable className="bg-blue-600 dark:bg-blue-500 py-3 rounded-full shadow-lg items-center mb-6 active:opacity-80" onPress={handleLogin}>
        <Text className="text-white text-lg font-bold">Login as {role.charAt(0).toUpperCase() + role.slice(1)}</Text>
      </Pressable>
      {/* Register Redirect */}
      <View className="items-center mb-4">
        <Link href="/register" asChild>
          <Pressable>
            <Text className="text-blue-600 dark:text-blue-300 font-semibold">Don't have an account? Register</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

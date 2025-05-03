import { useState } from 'react';
import { View, Text, Image, Pressable, Modal, Switch } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import SettingSection from '../components/SettingSection';
import { useUser } from '../components/UserContext';

export default function ProfessorProfileScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isDark, setIsDark] = useState(colorScheme === 'dark');
  const router = useRouter();
  const { user, setUser } = useUser();

  const handleLogout = () => {
    setUser(null);
    router.replace('/login');
  };

  const handleThemeChange = (value: boolean) => {
    setIsDark(value);
    setColorScheme(value ? 'dark' : 'light');
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-6 pt-12">
      {/* User Info Section */}
      <View className="items-center mb-8">
        <Image source={require('../../assets/images/male-student.png')} className="w-24 h-24 rounded-full mb-3" />
        <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">{user?.name || 'User'}</Text>
        <Text className="text-base text-gray-500 dark:text-gray-400">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Professor'}</Text>
        <Text className="text-base text-gray-700 dark:text-gray-300">{user?.email || 'professor@email.com'}</Text>
      </View>
      {/* Settings Sections */}
      <SettingSection
        title="Update Information"
        icon="account-edit"
        onPress={() => setShowInfoModal(true)}
      />
      <SettingSection
        title="App Settings"
        icon="cog"
        onPress={() => setShowThemeModal(true)}
      />
      {/* Logout Button */}
      <View className="flex-1 justify-end mb-8">
        <Pressable className="bg-red-600 py-3 rounded-full items-center" onPress={handleLogout}>
          <Text className="text-white text-lg font-bold">Logout</Text>
        </Pressable>
      </View>
      {/* Modals */}
      <Modal visible={showInfoModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-2xl p-6">
            <Pressable onPress={() => setShowInfoModal(false)} className="mb-4">
              <Text className="text-blue-600 dark:text-blue-300 font-semibold">Back</Text>
            </Pressable>
            <Text className="text-xl font-bold mb-2 text-blue-700 dark:text-blue-300">Update Information</Text>
            {/* TODO: Add update form here */}
            <Text className="text-gray-500 dark:text-gray-400">Feature coming soon.</Text>
          </View>
        </View>
      </Modal>
      <Modal visible={showThemeModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-2xl p-6">
            <Pressable onPress={() => setShowThemeModal(false)} className="mb-4">
              <Text className="text-blue-600 dark:text-blue-300 font-semibold">Back</Text>
            </Pressable>
            <Text className="text-xl font-bold mb-2 text-blue-700 dark:text-blue-300">App Settings</Text>
            <View className="flex-row items-center justify-between mt-4">
              <Text className="text-base text-gray-700 dark:text-gray-300">Dark Theme</Text>
              <Switch value={isDark} onValueChange={handleThemeChange} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

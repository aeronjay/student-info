import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SettingSectionProps {
  title: string;
  icon: string;
  onPress: () => void;
}

export default function SettingSection({ title, icon, onPress }: SettingSectionProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl px-5 py-4 mb-4 active:opacity-80"
    >
      <View className="flex-row items-center">
        <MaterialCommunityIcons name={icon as any} size={24} color="#2563eb" style={{ marginRight: 16 }} />
        <Text className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#64748b" />
    </Pressable>
  );
}

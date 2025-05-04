import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useUser } from '../../context/UserContext';
import { 
  getStudentClasses, 
  getClassByCode, 
  joinClass 
} from '../../services/db/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ClassDetailModal from '../components/classroom/ClassDetailModal';

function formatSchedule(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[start.getDay()];
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}, ${formatTime(start)} - ${formatTime(end)}`;
}

export default function ClassesScreen() {
  const { user } = useUser();
  const [joinedClasses, setJoinedClasses] = useState<any[]>([]);
  const [classCode, setClassCode] = useState('');
  const [refresh, setRefresh] = useState(false);
  
  // Class Detail Modal state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailVisible, setClassDetailVisible] = useState(false);

  useEffect(() => {
    if (user) {
      const data = getStudentClasses(user.id);
      setJoinedClasses(data);
    }
  }, [user, refresh]);

  const handleJoinClass = () => {
    if (!classCode) {
      Alert.alert('Error', 'Please enter a class code.');
      return;
    }
    const foundClass = getClassByCode(classCode) as any;
    if (!foundClass || !foundClass.id) {
      Alert.alert('Error', 'Class not found.');
      return;
    }
    try {
      joinClass(user?.id || '', foundClass.id);
      setClassCode('');
      setRefresh(r => !r);
      Alert.alert('Success', 'You have joined the class!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join class.');
    }
  };
  
  const handleOpenClassDetail = (classId: string) => {
    setSelectedClassId(classId);
    setClassDetailVisible(true);
  };
  
  const handleCloseClassDetail = () => {
    setClassDetailVisible(false);
    setSelectedClassId(null);
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-6 pt-8">
      <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Your Classes</Text>
      
      <View className="mb-6">
        <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Join a Class</Text>
        <View className="flex-row items-center mb-2">
          <TextInput
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 mr-2"
            placeholder="Enter class code"
            value={classCode}
            onChangeText={setClassCode}
          />
          <Pressable className="bg-blue-600 py-3 px-4 rounded-full items-center" onPress={handleJoinClass}>
            <Text className="text-white font-bold">Join</Text>
          </Pressable>
        </View>
      </View>
      
      <FlatList
        data={joinedClasses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => handleOpenClassDetail(item.id)}
            className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 mb-3"
          >
            <Text className="font-bold text-blue-700 dark:text-blue-300">{item.subject}</Text>
            <Text className="text-gray-700 dark:text-gray-300">Code: {item.classCode}</Text>
            <Text className="text-gray-700 dark:text-gray-300">Schedule: {formatSchedule(item.scheduleStart, item.scheduleEnd)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-gray-500 dark:text-gray-400 mb-4">You have not joined any classes yet.</Text>}
      />
      
      {/* Class Detail Modal */}
      <ClassDetailModal 
        visible={classDetailVisible}
        onClose={handleCloseClassDetail}
        classId={selectedClassId}
      />
    </View>
  );
}
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, Modal } from 'react-native';
import { useUser } from '../../context/UserContext';
import { insertClass, getProfessorClasses } from '../../services/db/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

function generateRandomId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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
  const [subject, setSubject] = useState('');
  const [subjectInfo, setSubjectInfo] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [scheduleStart, setScheduleStart] = useState<Date | null>(null);
  const [scheduleEnd, setScheduleEnd] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const data = getProfessorClasses(user.id);
      setClasses(data);
    }
  }, [user, refresh]);

  const handleCreateClass = () => {
    if (!subject || !subjectInfo || !subjectCode || !scheduleStart || !scheduleEnd) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    const id = generateRandomId();
    try {
      const classCode = insertClass(
        id,
        scheduleStart.toISOString(),
        scheduleEnd.toISOString(),
        subject,
        subjectInfo,
        subjectCode,
        user?.id || ''
      );
      setSubject('');
      setSubjectInfo('');
      setSubjectCode('');
      setScheduleStart(null);
      setScheduleEnd(null);
      setShowModal(false);
      setCreatedClassCode(classCode);
      setRefresh(r => !r);
      Alert.alert('Success', 'Class created!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create class.');
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-6 pt-8">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">Your Classes</Text>
        <Pressable onPress={() => setShowModal(true)} className="p-2">
          <MaterialCommunityIcons name="plus-circle" size={32} color="#2563eb" />
        </Pressable>
      </View>
      <FlatList
        data={classes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 mb-3">
            <Text className="font-bold text-blue-700 dark:text-blue-300">{item.subject}</Text>
            <Text className="text-gray-700 dark:text-gray-300">Code: {item.classCode}</Text>
            <Text className="text-gray-700 dark:text-gray-300">Schedule: {formatSchedule(item.scheduleStart, item.scheduleEnd)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text className="text-gray-500 dark:text-gray-400 mb-4">No classes yet.</Text>}
      />
      <Modal visible={showModal} animationType="slide" transparent>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowModal(false)}>
          <Pressable onPress={() => {}} className="bg-white dark:bg-gray-900 rounded-t-2xl p-6" style={{ elevation: 10 }}>
            <Pressable onPress={() => setShowModal(false)} className="mb-4">
              <Text className="text-blue-600 dark:text-blue-300 font-semibold">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Create New Class</Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-3 border border-gray-200 dark:border-gray-700"
              placeholder="Subject Name"
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-3 border border-gray-200 dark:border-gray-700"
              placeholder="Subject Info"
              value={subjectInfo}
              onChangeText={setSubjectInfo}
            />
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-3 border border-gray-200 dark:border-gray-700"
              placeholder="Subject Code (from university)"
              value={subjectCode}
              onChangeText={setSubjectCode}
            />
            <Pressable onPress={() => setPickerMode('start')} className="mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <Text className="text-gray-700 dark:text-gray-300">
                {scheduleStart ? `Start: ${scheduleStart.toLocaleString()}` : 'Pick Start Date & Time'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setPickerMode('end')} className="mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <Text className="text-gray-700 dark:text-gray-300">
                {scheduleEnd ? `End: ${scheduleEnd.toLocaleString()}` : 'Pick End Date & Time'}
              </Text>
            </Pressable>
            <DateTimePickerModal
              isVisible={pickerMode !== null}
              mode="datetime"
              date={pickerMode === 'start' ? (scheduleStart || new Date()) : (scheduleEnd || new Date())}
              onConfirm={(date: Date) => {
                if (pickerMode === 'start') setScheduleStart(date);
                if (pickerMode === 'end') setScheduleEnd(date);
                setPickerMode(null);
              }}
              onCancel={() => setPickerMode(null)}
            />
            <Pressable className="bg-blue-600 py-3 rounded-full items-center" onPress={handleCreateClass}>
              <Text className="text-white font-bold">Create Class</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {createdClassCode && (
        <View className="bg-green-100 dark:bg-green-900 rounded-xl p-4 mt-4">
          <Text className="text-green-800 dark:text-green-200 font-bold">Class Created!</Text>
          <Text className="text-green-800 dark:text-green-200">Class Code: {createdClassCode}</Text>
        </View>
      )}
    </View>
  );
}

import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, Modal, TouchableOpacity, useColorScheme } from 'react-native';
import { useUser } from '../../context/UserContext';
import { 
  insertClass, 
  getProfessorClasses, 
  createClassPost 
} from '../../services/db/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import ClassDetailModal from '../components/classroom/ClassDetailModal';

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
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | 'due' | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Class Detail Modal state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailVisible, setClassDetailVisible] = useState(false);
  
  // Post creation state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'assignment' | 'announcement'>('announcement');
  const [dueDate, setDueDate] = useState<Date | null>(null);

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
  
  const handleOpenClassDetail = (classId: string) => {
    setSelectedClassId(classId);
    setClassDetailVisible(true);
  };
  
  const handleCloseClassDetail = () => {
    setClassDetailVisible(false);
    setSelectedClassId(null);
  };
  
  const handleOpenPostModal = () => {
    setShowPostModal(true);
  };
  
  const handleCreatePost = () => {
    if (!selectedClassId || !postTitle || !postContent) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    
    try {
      const postId = generateRandomId();
      createClassPost(
        postId,
        selectedClassId,
        postTitle,
        postContent,
        postType,
        postType === 'assignment' && dueDate ? dueDate.toISOString() : null
      );
      
      // Reset form
      setPostTitle('');
      setPostContent('');
      setPostType('announcement');
      setDueDate(null);
      setShowPostModal(false);
      setRefresh(r => !r);
      
      // Refresh and show confirmation
      Alert.alert(
        'Success', 
        `Your ${postType} has been posted to the class.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create post.');
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
          <TouchableOpacity
            onPress={() => handleOpenClassDetail(item.id)}
            className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 mb-3"
          >
            <Text className="font-bold text-blue-700 dark:text-blue-300">{item.subject}</Text>
            <Text className="text-gray-700 dark:text-gray-300">Code: {item.classCode}</Text>
            <Text className="text-gray-700 dark:text-gray-300">Schedule: {formatSchedule(item.scheduleStart, item.scheduleEnd)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-gray-500 dark:text-gray-400 mb-4">No classes yet.</Text>}
      />
      
      {/* Create Class Modal */}
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
              date={
                pickerMode === 'start' 
                  ? (scheduleStart || new Date()) 
                  : pickerMode === 'end'
                  ? (scheduleEnd || new Date())
                  : (dueDate || new Date())
              }
              onConfirm={(date: Date) => {
                if (pickerMode === 'start') setScheduleStart(date);
                else if (pickerMode === 'end') setScheduleEnd(date);
                else if (pickerMode === 'due') setDueDate(date);
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
      
      {/* Create Post Modal */}
      <Modal visible={showPostModal} animationType="slide" transparent>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowPostModal(false)}>
          <Pressable onPress={() => {}} className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-t-2xl p-6`} style={{ elevation: 10 }}>
            <Pressable onPress={() => setShowPostModal(false)} className="mb-4">
              <Text className="text-blue-600 dark:text-blue-300 font-semibold">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">
              Create {postType === 'assignment' ? 'Assignment' : 'Announcement'}
            </Text>
            
            {/* Post Type Toggle */}
            <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <Pressable 
                className={`flex-1 py-2 px-4 items-center ${postType === 'announcement' ? 'bg-blue-600' : 'bg-transparent'}`}
                onPress={() => setPostType('announcement')}
              >
                <Text className={postType === 'announcement' ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                  Announcement
                </Text>
              </Pressable>
              
              <Pressable 
                className={`flex-1 py-2 px-4 items-center ${postType === 'assignment' ? 'bg-blue-600' : 'bg-transparent'}`}
                onPress={() => setPostType('assignment')}
              >
                <Text className={postType === 'assignment' ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                  Assignment
                </Text>
              </Pressable>
            </View>
            
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-3 border border-gray-200 dark:border-gray-700"
              placeholder="Title"
              value={postTitle}
              onChangeText={setPostTitle}
            />
            
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-3 border border-gray-200 dark:border-gray-700"
              placeholder="Content"
              value={postContent}
              onChangeText={setPostContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            {postType === 'assignment' && (
              <Pressable onPress={() => setPickerMode('due')} className="mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                <Text className="text-gray-700 dark:text-gray-300">
                  {dueDate ? `Due: ${dueDate.toLocaleString()}` : 'Set Due Date'}
                </Text>
              </Pressable>
            )}
            
            <DateTimePickerModal
              isVisible={pickerMode === 'due'}
              mode="datetime"
              date={dueDate || new Date()}
              onConfirm={(date: Date) => {
                setDueDate(date);
                setPickerMode(null);
              }}
              onCancel={() => setPickerMode(null)}
            />
            
            <Pressable className="bg-blue-600 py-3 rounded-full items-center" onPress={handleCreatePost}>
              <Text className="text-white font-bold">Post</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      
      {/* Class Detail Modal */}
      <ClassDetailModal 
        visible={classDetailVisible}
        onClose={handleCloseClassDetail}
        classId={selectedClassId}
        isTeacher={true}
        onAddPost={handleOpenPostModal}
      />
      
      {createdClassCode && (
        <View className="bg-green-100 dark:bg-green-900 rounded-xl p-4 mt-4">
          <Text className="text-green-800 dark:text-green-200 font-bold">Class Created!</Text>
          <Text className="text-green-800 dark:text-green-200">Class Code: {createdClassCode}</Text>
        </View>
      )}
    </View>
  );
}

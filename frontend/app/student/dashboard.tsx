import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useUser } from '../../context/UserContext';
import { 
  getStudentClasses, 
  getClassByCode, 
  joinClass, 
  getStudentAllAssignments,
  getClassPosts,
  getStudentGrades
} from '../../services/db/sqlite';
import ClassDetailModal from '../components/classroom/ClassDetailModal';
import { router } from 'expo-router';

interface Class {
  id: string;
  classCode: string;
  scheduleStart: string;
  scheduleEnd: string;
  subject: string;
  subjectInfo: string;
  subjectCode: string;
  professorId: string;
}

interface ClassPost {
  id: string;
  classId: string;
  title: string;
  content: string;
  type: string;
  dueDate: string | null;
  createdAt: string;
  subject?: string;
  subjectCode?: string;
}

interface StudentGrade {
  id: string;
  studentId: string;
  classId: string;
  midterm: number | null;
  final: number | null;
  updatedAt: string;
  subject?: string;
  subjectCode?: string;
  subjectInfo?: string;
  professorName?: string;
}

function formatSchedule(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[start.getDay()];
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}, ${formatTime(start)} - ${formatTime(end)}`;
}

function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

export default function DashboardScreen() {
  const { user } = useUser();
  const [joinedClasses, setJoinedClasses] = useState<Class[]>([]);
  const [classCode, setClassCode] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [latestAnnouncements, setLatestAnnouncements] = useState<ClassPost[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<ClassPost[]>([]);
  const [recentGrades, setRecentGrades] = useState<StudentGrade[]>([]);
  const [todayClasses, setTodayClasses] = useState<Class[]>([]);
  
  // Class Detail Modal state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailVisible, setClassDetailVisible] = useState(false);

  useEffect(() => {
    if (user) {
      // Get student's classes
      const classes = getStudentClasses(user.id);
      setJoinedClasses(classes);
      
      // Today's classes
      const today = new Date();
      const dayOfWeek = today.getDay();
      const filteredClasses = classes.filter(cls => {
        const classDay = new Date(cls.scheduleStart).getDay();
        return classDay === dayOfWeek;
      });
      setTodayClasses(filteredClasses);
      
      // Get latest announcements from all classes
      const allAnnouncements: ClassPost[] = [];
      classes.forEach(cls => {
        const posts = getClassPosts(cls.id);
        const announcements = posts.filter(post => post.type === 'announcement');
        // Add subject info to each announcement
        const enrichedAnnouncements = announcements.map(ann => ({
          ...ann,
          subject: cls.subject,
          subjectCode: cls.subjectCode
        }));
        allAnnouncements.push(...enrichedAnnouncements);
      });
      
      // Sort announcements by creation date (newest first) and take 3
      const sortedAnnouncements = allAnnouncements
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      setLatestAnnouncements(sortedAnnouncements);
      
      // Get upcoming assignments
      const assignments = getStudentAllAssignments(user.id);
      
      // Filter for pending or submitted assignments that haven't passed their due date
      const now = new Date();
      const pending = assignments
        .filter(assignment => 
          (assignment.status === 'pending' || assignment.status === 'submitted') && 
          (assignment.dueDate ? new Date(assignment.dueDate) > now : true)
        )
        .sort((a, b) => {
          // Sort by due date, with null due dates at the end
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 5);
        
      setUpcomingAssignments(pending);
      
      // Get recent grades
      const grades = getStudentGrades(user.id);
      
      // Sort by update date
      const sortedGrades = grades
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3);
      
      setRecentGrades(sortedGrades);
    }
  }, [user, refresh]);

  const handleJoinClass = () => {
    if (!classCode) {
      Alert.alert('Error', 'Please enter a class code.');
      return;
    }
    const foundClass = getClassByCode(classCode) as Class | undefined;
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
  
  const navigateToAssignments = () => {
    router.push('/student/tasks');
  };
  
  const navigateToGrades = () => {
    router.push('/student/grades');
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900 px-6 pt-8">
      <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Student Dashboard</Text>
      <Text className="mb-4 text-gray-700 dark:text-gray-300">Welcome, {user?.name}!</Text>
      
      {/* Join a Class Section */}
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
      
      {/* Today's Schedule */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Today's Schedule</Text>
        {todayClasses.length > 0 ? (
          <FlatList
            data={todayClasses}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => handleOpenClassDetail(item.id)}
                className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 mb-3"
              >
                <Text className="font-bold text-blue-700 dark:text-blue-300">{item.subject}</Text>
                <Text className="text-gray-700 dark:text-gray-300">{item.subjectCode}</Text>
                <Text className="text-gray-700 dark:text-gray-300">{formatSchedule(item.scheduleStart, item.scheduleEnd)}</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No classes scheduled for today.</Text>
        )}
      </View>
      
      {/* Latest Announcements */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Latest Announcements</Text>
        {latestAnnouncements.length > 0 ? (
          <FlatList
            data={latestAnnouncements}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4 mb-3">
                <Text className="font-bold text-yellow-700 dark:text-yellow-300">{item.title}</Text>
                <Text className="text-gray-500 dark:text-gray-400">{item.subject} ({item.subjectCode})</Text>
                <Text className="text-gray-700 dark:text-gray-300" numberOfLines={2}>{item.content}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">Posted: {formatDate(item.createdAt)}</Text>
              </View>
            )}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No recent announcements.</Text>
        )}
      </View>
      
      {/* Upcoming Assignments */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-blue-700 dark:text-blue-300">Upcoming Assignments</Text>
          <TouchableOpacity onPress={navigateToAssignments}>
            <Text className="text-blue-600 dark:text-blue-400">View All</Text>
          </TouchableOpacity>
        </View>
        {upcomingAssignments.length > 0 ? (
          <FlatList
            data={upcomingAssignments}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View className="bg-green-50 dark:bg-green-950 rounded-xl p-4 mb-3">
                <Text className="font-bold text-green-700 dark:text-green-300">{item.title}</Text>
                <Text className="text-gray-500 dark:text-gray-400">{item.subject} ({item.subjectCode})</Text>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-700 dark:text-gray-300">Status: <Text className="font-bold">{item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}</Text></Text>
                  {item.dueDate && (
                    <Text className="text-gray-700 dark:text-gray-300">Due: {formatDate(item.dueDate)}</Text>
                  )}
                </View>
              </View>
            )}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No upcoming assignments.</Text>
        )}
      </View>
      
      {/* Recent Grades */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-blue-700 dark:text-blue-300">Recent Grades</Text>
          <TouchableOpacity onPress={navigateToGrades}>
            <Text className="text-blue-600 dark:text-blue-400">View All</Text>
          </TouchableOpacity>
        </View>
        {recentGrades.length > 0 ? (
          <FlatList
            data={recentGrades}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4 mb-3">
                <Text className="font-bold text-purple-700 dark:text-purple-300">{item.subject}</Text>
                <Text className="text-gray-500 dark:text-gray-400">{item.subjectCode}</Text>
                <View className="flex-row justify-between mt-1">
                  <View>
                    <Text className="text-gray-700 dark:text-gray-300">Midterm: <Text className="font-bold">{item.midterm ?? 'N/A'}</Text></Text>
                  </View>
                  <View>
                    <Text className="text-gray-700 dark:text-gray-300">Final: <Text className="font-bold">{item.final ?? 'N/A'}</Text></Text>
                  </View>
                </View>
                <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">Updated: {formatDate(item.updatedAt)}</Text>
              </View>
            )}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No recent grades.</Text>
        )}
      </View>
      
      {/* All Classes */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Your Classes</Text>
        <FlatList
          data={joinedClasses}
          keyExtractor={item => item.id}
          scrollEnabled={false}
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
          ListEmptyComponent={<Text className="text-gray-500 dark:text-gray-400">You have not joined any classes yet.</Text>}
        />
      </View>
      
      {/* Class Detail Modal */}
      <ClassDetailModal 
        visible={classDetailVisible}
        onClose={handleCloseClassDetail}
        classId={selectedClassId}
      />
    </ScrollView>
  );
}
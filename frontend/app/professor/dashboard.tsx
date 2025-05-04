import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useUser } from '../../context/UserContext';
import { 
  getProfessorClasses, 
  getClassPosts, 
  getClassGradeStats,
  getSubmissionsForAssignment
} from '../../services/db/sqlite';
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
}

interface SubmissionCount {
  classId: string;
  subject: string;
  pending: number;
  submitted: number;
  graded: number;
}

function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatSchedule(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[start.getDay()];
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}, ${formatTime(start)} - ${formatTime(end)}`;
}

export default function DashboardScreen() {
  const { user } = useUser();
  const [classes, setClasses] = useState<Class[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<ClassPost[]>([]);
  const [submissionStats, setSubmissionStats] = useState<SubmissionCount[]>([]);
  const [todayClasses, setTodayClasses] = useState<Class[]>([]);
  
  useEffect(() => {
    if (user) {
      // Get professor's classes
      const professorClasses = getProfessorClasses(user.id);
      setClasses(professorClasses);
      
      // Get today's classes
      const today = new Date();
      const dayOfWeek = today.getDay();
      const filteredClasses = professorClasses.filter(cls => {
        const classDay = new Date(cls.scheduleStart).getDay();
        return classDay === dayOfWeek;
      });
      setTodayClasses(filteredClasses);
      
      // Get recent announcements across all classes
      const allAnnouncements: ClassPost[] = [];
      professorClasses.forEach(cls => {
        const posts = getClassPosts(cls.id);
        const announcements = posts.filter(post => post.type === 'announcement');
        allAnnouncements.push(...announcements);
      });
      
      // Sort announcements by creation date (newest first) and take 5
      const sortedAnnouncements = allAnnouncements
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentAnnouncements(sortedAnnouncements);
      
      // Get submission statistics
      const stats: SubmissionCount[] = [];
      professorClasses.forEach(cls => {
        const posts = getClassPosts(cls.id);
        const assignments = posts.filter(post => post.type === 'assignment');
        
        let pending = 0;
        let submitted = 0;
        let graded = 0;
        
        assignments.forEach(assignment => {
          const submissions = getSubmissionsForAssignment(assignment.id);
          submissions.forEach(sub => {
            if (sub.status === 'pending') pending++;
            else if (sub.status === 'submitted') submitted++;
            else if (sub.status === 'graded') graded++;
          });
        });
        
        stats.push({
          classId: cls.id,
          subject: cls.subject,
          pending,
          submitted,
          graded
        });
      });
      
      setSubmissionStats(stats);
    }
  }, [user]);

  const navigateToClass = (classId: string) => {
    router.push(`/professor/classes?classId=${classId}`);
  };

  const navigateToGrading = () => {
    router.push('/professor/grading');
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900 px-6 pt-8">
      <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Professor Dashboard</Text>
      <Text className="mb-6 text-gray-700 dark:text-gray-300">Welcome, {user?.name}!</Text>
      
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
                onPress={() => navigateToClass(item.id)}
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
      
      {/* Recent Announcements */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Recent Announcements</Text>
        {recentAnnouncements.length > 0 ? (
          <FlatList
            data={recentAnnouncements}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4 mb-3">
                <Text className="font-bold text-yellow-700 dark:text-yellow-300">{item.title}</Text>
                <Text className="text-gray-700 dark:text-gray-300" numberOfLines={2}>{item.content}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">Posted: {formatDate(item.createdAt)}</Text>
              </View>
            )}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No recent announcements.</Text>
        )}
      </View>
      
      {/* Submission Statistics */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-blue-700 dark:text-blue-300">Assignment Statistics</Text>
          <TouchableOpacity onPress={navigateToGrading}>
            <Text className="text-blue-600 dark:text-blue-400">View All</Text>
          </TouchableOpacity>
        </View>
        {submissionStats.length > 0 ? (
          submissionStats.map(stat => (
            <View key={stat.classId} className="bg-green-50 dark:bg-green-950 rounded-xl p-4 mb-3">
              <Text className="font-bold text-green-700 dark:text-green-300">{stat.subject}</Text>
              <View className="flex-row justify-between mt-2">
                <View className="items-center">
                  <Text className="text-gray-700 dark:text-gray-300 font-bold">{stat.pending}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">Pending</Text>
                </View>
                <View className="items-center">
                  <Text className="text-gray-700 dark:text-gray-300 font-bold">{stat.submitted}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">Submitted</Text>
                </View>
                <View className="items-center">
                  <Text className="text-gray-700 dark:text-gray-300 font-bold">{stat.graded}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">Graded</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No assignment statistics available.</Text>
        )}
      </View>
      
      {/* Class Analytics */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">Class Analytics</Text>
        {classes.length > 0 ? (
          <FlatList
            data={classes}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const stats = getClassGradeStats(item.id);
              return (
                <View className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4 mb-3">
                  <Text className="font-bold text-purple-700 dark:text-purple-300">{item.subject}</Text>
                  <Text className="text-gray-700 dark:text-gray-300">{item.subjectCode}</Text>
                  <View className="flex-row justify-between mt-2">
                    <View className="items-center">
                      <Text className="text-gray-700 dark:text-gray-300 font-bold">{stats.totalStudents}</Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-xs">Students</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-gray-700 dark:text-gray-300 font-bold">{stats.avgMidterm}</Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-xs">Avg. Midterm</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-gray-700 dark:text-gray-300 font-bold">{stats.avgFinal}</Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-xs">Avg. Final</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">No class analytics available.</Text>
        )}
      </View>
    </ScrollView>
  );
}

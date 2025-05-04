import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useUser } from '../../context/UserContext';
import { getStudentAllAssignments } from '../../services/db/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Assignment {
  id: string;
  classId: string;
  title: string;
  content: string;
  dueDate: string | null;
  createdAt: string;
  subject: string;
  subjectCode: string;
}

export default function TasksScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('all');
  
  useEffect(() => {
    if (user) {
      setLoading(true);
      const fetchedAssignments = getStudentAllAssignments(user.id) as Assignment[];
      setAssignments(fetchedAssignments);
      setLoading(false);
    }
  }, [user]);

  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        assignment => 
          assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    const now = new Date();
    
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(assignment => {
          if (!assignment.dueDate) return false;
          const dueDate = new Date(assignment.dueDate);
          return dueDate > now;
        });
        break;
      case 'overdue':
        filtered = filtered.filter(assignment => {
          if (!assignment.dueDate) return false;
          const dueDate = new Date(assignment.dueDate);
          return dueDate < now;
        });
        break;
      // For 'completed' we'd need to track completion status
      // For now, 'all' returns everything
    }
    
    return filtered;
  }, [assignments, searchQuery, filter]);

  function formatDueDate(dateString: string | null) {
    if (!dateString) return 'No due date';
    
    const dueDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dueDate.toDateString() === today.toDateString()) {
      return 'Due Today';
    } else if (dueDate.toDateString() === tomorrow.toDateString()) {
      return 'Due Tomorrow';
    } else {
      return `Due: ${dueDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}`;
    }
  }

  function getDueDateClassName(dateString: string | null) {
    if (!dateString) return 'bg-gray-100 dark:bg-gray-800';
    
    const dueDate = new Date(dateString);
    const today = new Date();
    
    if (dueDate < today) {
      return 'bg-red-100 dark:bg-red-900';
    }
    
    // Due in the next 2 days
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    
    if (dueDate <= twoDaysFromNow) {
      return 'bg-amber-100 dark:bg-amber-900';
    }
    
    return 'bg-blue-100 dark:bg-blue-900';
  }

  function getDueDateTextClassName(dateString: string | null) {
    if (!dateString) return 'text-gray-600 dark:text-gray-300';
    
    const dueDate = new Date(dateString);
    const today = new Date();
    
    if (dueDate < today) {
      return 'text-red-800 dark:text-red-200';
    }
    
    // Due in the next 2 days
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    
    if (dueDate <= twoDaysFromNow) {
      return 'text-amber-800 dark:text-amber-200';
    }
    
    return 'text-blue-800 dark:text-blue-200';
  }

  const renderFilterChip = (filterName: 'all' | 'upcoming' | 'overdue' | 'completed', label: string) => (
    <TouchableOpacity 
      className={`px-4 py-2 rounded-full mr-2 ${
        filter === filterName 
          ? 'bg-blue-600 dark:bg-blue-500' 
          : 'bg-gray-100 dark:bg-gray-800'
      }`}
      onPress={() => setFilter(filterName)}
    >
      <Text className={`font-medium ${
        filter === filterName 
          ? 'text-white' 
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAssignment = ({ item }: { item: Assignment }) => (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-200 dark:border-gray-700">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-semibold text-gray-600 dark:text-gray-400">{item.subjectCode}</Text>
        <View className={`px-3 py-1 rounded-full ${getDueDateClassName(item.dueDate)}`}>
          <Text className={`text-xs font-medium ${getDueDateTextClassName(item.dueDate)}`}>
            {formatDueDate(item.dueDate)}
          </Text>
        </View>
      </View>
      
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.title}</Text>
      <Text className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">{item.subject}</Text>
      <Text className="text-gray-700 dark:text-gray-300 mb-3" numberOfLines={2}>{item.content}</Text>
      
      <TouchableOpacity className="flex-row items-center">
        <Text className="text-blue-600 dark:text-blue-400 font-medium mr-1">View Details</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={isDark ? '#7dd3fc' : '#2563eb'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-5 pt-6 pb-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">Tasks</Text>
        <Text className="text-gray-700 dark:text-gray-300">Manage your assignments from all classes</Text>
      </View>
      
      <View className="mx-4 mt-4 mb-3 flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-3 border border-gray-200 dark:border-gray-700">
        <MaterialCommunityIcons name="magnify" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
        <TextInput
          className="flex-1 py-3 px-2 text-gray-900 dark:text-gray-100"
          placeholder="Search assignments..."
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View className="flex-row px-4 mb-4">
        {renderFilterChip('all', 'All')}
        {renderFilterChip('upcoming', 'Upcoming')}
        {renderFilterChip('overdue', 'Overdue')}
        {/* {renderFilterChip('completed', 'Completed')} */}
      </View>
      
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={isDark ? '#7dd3fc' : '#2563eb'} />
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          keyExtractor={item => item.id}
          renderItem={renderAssignment}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={isDark ? '#4b5563' : '#d1d5db'} />
              <Text className="text-lg font-bold text-gray-600 dark:text-gray-400 mt-4 mb-2">
                {searchQuery 
                  ? 'No assignments match your search'
                  : 'No assignments found'}
              </Text>
              <Text className="text-center text-gray-500 dark:text-gray-500 px-8">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'When you join classes with assignments, they will appear here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
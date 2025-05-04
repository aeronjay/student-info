import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useUser } from '../../context/UserContext';
import { getStudentAllAssignments, submitAssignment, markAssignmentAsDone, saveSubmissionFile } from '../../services/db/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { nanoid } from 'nanoid/non-secure';

interface Assignment {
  id: string;
  classId: string;
  title: string;
  content: string;
  dueDate: string | null;
  createdAt: string;
  subject: string;
  subjectCode: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: string;
  filePath?: string;
  fileName?: string;
  submissionId?: string;
}

export default function TasksScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'done'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  
  const fetchAssignments = () => {
    if (user) {
      setLoading(true);
      const fetchedAssignments = getStudentAllAssignments(user.id) as Assignment[];
      setAssignments(fetchedAssignments);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAssignments();
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
          return dueDate > now && assignment.status === 'pending';
        });
        break;
      case 'overdue':
        filtered = filtered.filter(assignment => {
          if (!assignment.dueDate) return false;
          const dueDate = new Date(assignment.dueDate);
          return dueDate < now && assignment.status === 'pending';
        });
        break;
      case 'done':
        filtered = filtered.filter(assignment => 
          assignment.status === 'submitted' || assignment.status === 'graded'
        );
        break;
      // 'all' returns everything
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

  function getDueDateClassName(dateString: string | null, status: string) {
    // If assignment is done or graded, show different colors
    if (status === 'submitted') {
      return 'bg-green-100 dark:bg-green-900';
    } else if (status === 'graded') {
      return 'bg-purple-100 dark:bg-purple-900';
    }
    
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

  function getDueDateTextClassName(dateString: string | null, status: string) {
    // If assignment is done or graded, show different colors
    if (status === 'submitted') {
      return 'text-green-800 dark:text-green-200';
    } else if (status === 'graded') {
      return 'text-purple-800 dark:text-purple-200';
    }
    
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

  const renderFilterChip = (filterName: 'all' | 'upcoming' | 'overdue' | 'done', label: string) => (
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

  const handleMarkAsDone = async (assignment: Assignment) => {
    if (!user) return;
    
    setSubmittingAssignment(true);
    
    try {
      const submissionId = assignment.submissionId || nanoid();
      await markAssignmentAsDone(submissionId, assignment.id, user.id);
      fetchAssignments(); // Refresh the assignments list
      Alert.alert('Success', 'Assignment marked as done');
    } catch (error) {
      console.error('Error marking assignment as done:', error);
      Alert.alert('Error', 'Failed to mark assignment as done');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleSubmitWithFile = async () => {
    if (!user || !selectedAssignment) return;
    
    setSubmittingAssignment(true);
    
    try {
      // Pick a document
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // All file types
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        setSubmittingAssignment(false);
        return;
      }
      
      const file = result.assets[0];
      
      // Save the file to a permanent location
      const submissionId = selectedAssignment.submissionId || nanoid();
      const { filePath, fileName } = await saveSubmissionFile(file.uri, user.id, selectedAssignment.id);
      
      // Submit the assignment with file reference
      await submitAssignment(submissionId, selectedAssignment.id, user.id, filePath, fileName);
      
      // Refresh assignments list
      fetchAssignments();
      
      // Close modal and reset selected assignment
      setIsModalVisible(false);
      setSelectedAssignment(null);
      
      Alert.alert('Success', 'Assignment submitted with file');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      Alert.alert('Error', 'Failed to submit assignment');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const getStatusText = (assignment: Assignment) => {
    if (assignment.status === 'graded') {
      return `Graded: ${assignment.grade || 'N/A'}`;
    } else if (assignment.status === 'submitted') {
      return assignment.fileName ? 'Submitted with file' : 'Marked as done';
    } else {
      return formatDueDate(assignment.dueDate);
    }
  };

  const renderAssignment = ({ item }: { item: Assignment }) => (
    <TouchableOpacity 
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-200 dark:border-gray-700"
      onPress={() => {
        setSelectedAssignment(item);
        setIsModalVisible(true);
      }}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-semibold text-gray-600 dark:text-gray-400">{item.subjectCode}</Text>
        <View className={`px-3 py-1 rounded-full ${getDueDateClassName(item.dueDate, item.status)}`}>
          <Text className={`text-xs font-medium ${getDueDateTextClassName(item.dueDate, item.status)}`}>
            {getStatusText(item)}
          </Text>
        </View>
      </View>
      
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.title}</Text>
      <Text className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">{item.subject}</Text>
      <Text className="text-gray-700 dark:text-gray-300 mb-3" numberOfLines={2}>{item.content}</Text>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-blue-600 dark:text-blue-400 font-medium mr-1">View Details</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={isDark ? '#7dd3fc' : '#2563eb'} />
        </View>
        
        {item.status === 'pending' && (
          <View className="flex-row">
            <TouchableOpacity 
              className="bg-green-500 px-3 py-1 rounded-lg mr-2 flex-row items-center"
              onPress={() => handleMarkAsDone(item)}
              disabled={submittingAssignment}
            >
              <MaterialCommunityIcons name="check" size={16} color="white" />
              <Text className="text-white text-xs font-medium ml-1">Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderAssignmentModal = () => {
    if (!selectedAssignment) return null;
    
    return (
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsModalVisible(false);
          setSelectedAssignment(null);
        }}
      >
        <View className="flex-1 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-5 shadow-lg" style={{ maxHeight: '80%' }}>
            <View className="w-12 h-1 bg-gray-300 dark:bg-gray-600 self-center rounded-full mb-4" />
            
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedAssignment.title}
            </Text>
            
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-medium text-blue-600 dark:text-blue-400">
                {selectedAssignment.subject} ({selectedAssignment.subjectCode})
              </Text>
              <View className={`px-3 py-1 rounded-full ${getDueDateClassName(selectedAssignment.dueDate, selectedAssignment.status)}`}>
                <Text className={`text-xs font-medium ${getDueDateTextClassName(selectedAssignment.dueDate, selectedAssignment.status)}`}>
                  {getStatusText(selectedAssignment)}
                </Text>
              </View>
            </View>
            
            <Text className="text-gray-700 dark:text-gray-300 mb-6">
              {selectedAssignment.content}
            </Text>
            
            {selectedAssignment.status === 'graded' && (
              <View className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl mb-6">
                <Text className="text-lg font-bold text-purple-800 dark:text-purple-200 mb-2">Your Grade</Text>
                <Text className="text-3xl font-bold text-purple-600 dark:text-purple-300 mb-1">{selectedAssignment.grade}</Text>
              </View>
            )}
            
            {selectedAssignment.fileName && (
              <View className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-6 flex-row items-center">
                <MaterialCommunityIcons name="file-document-outline" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
                <Text className="ml-2 text-gray-700 dark:text-gray-300 flex-1">{selectedAssignment.fileName}</Text>
              </View>
            )}
            
            {selectedAssignment.status === 'pending' && (
              <View className="flex-row justify-between mt-4">
                <TouchableOpacity 
                  className="bg-gray-200 dark:bg-gray-700 px-5 py-3 rounded-xl flex-row items-center justify-center flex-1 mr-2"
                  onPress={() => {
                    setIsModalVisible(false);
                    setSelectedAssignment(null);
                  }}
                >
                  <Text className="font-medium text-gray-800 dark:text-gray-200">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-green-500 px-5 py-3 rounded-xl flex-row items-center justify-center flex-1 mr-2"
                  onPress={() => handleMarkAsDone(selectedAssignment)}
                  disabled={submittingAssignment}
                >
                  <MaterialCommunityIcons name="check" size={20} color="white" />
                  <Text className="font-medium text-white ml-2">Mark Done</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-blue-600 px-5 py-3 rounded-xl flex-row items-center justify-center flex-1"
                  onPress={handleSubmitWithFile}
                  disabled={submittingAssignment}
                >
                  <MaterialCommunityIcons name="upload" size={20} color="white" />
                  <Text className="font-medium text-white ml-2">Upload</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {selectedAssignment.status !== 'pending' && (
              <TouchableOpacity 
                className="bg-gray-200 dark:bg-gray-700 px-5 py-3 rounded-xl flex-row items-center justify-center"
                onPress={() => {
                  setIsModalVisible(false);
                  setSelectedAssignment(null);
                }}
              >
                <Text className="font-medium text-gray-800 dark:text-gray-200">Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

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
        {renderFilterChip('done', 'Done')}
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
                  : filter === 'done'
                    ? 'No completed assignments'
                    : 'No assignments found'}
              </Text>
              <Text className="text-center text-gray-500 dark:text-gray-500 px-8">
                {searchQuery 
                  ? 'Try a different search term'
                  : filter === 'done'
                    ? 'Complete assignments to see them here'
                    : 'When you join classes with assignments, they will appear here'}
              </Text>
            </View>
          }
        />
      )}
      
      {renderAssignmentModal()}
    </View>
  );
}
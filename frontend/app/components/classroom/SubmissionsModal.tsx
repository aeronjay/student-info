import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, TextInput, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSubmissionsForAssignment, gradeAssignment } from '../../../services/db/sqlite';
import { nanoid } from 'nanoid/non-secure';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: 'pending' | 'submitted' | 'graded';
  filePath: string | null;
  fileName: string | null;
  submittedAt: string;
  grade: string | null;
  feedback: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  assignmentId: string | null;
  assignmentTitle: string;
}

export default function SubmissionsModal({ visible, onClose, assignmentId, assignmentTitle }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible && assignmentId) {
      loadSubmissions();
    }
  }, [visible, assignmentId]);

  const loadSubmissions = () => {
    if (!assignmentId) return;
    
    const fetchedSubmissions = getSubmissionsForAssignment(assignmentId) as AssignmentSubmission[];
    setSubmissions(fetchedSubmissions || []);
  };

  const handleGradeSubmission = () => {
    if (!selectedSubmission) return;
    
    setLoading(true);
    
    try {
      gradeAssignment(selectedSubmission.id, grade, feedback);
      loadSubmissions(); // Refresh the list
      setGradeModalVisible(false);
      setSelectedSubmission(null);
      setGrade('');
      setFeedback('');
    } catch (error) {
      console.error('Error grading submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (fileName: string | null): boolean => {
    if (!fileName) return false;
    const lowerCaseFileName = fileName.toLowerCase();
    return lowerCaseFileName.endsWith('.jpg') || 
           lowerCaseFileName.endsWith('.jpeg') || 
           lowerCaseFileName.endsWith('.png') || 
           lowerCaseFileName.endsWith('.gif');
  };

  const handleOpenFile = async (filePath: string | null, fileName: string | null) => {
    if (!filePath) {
      Alert.alert('No File', 'This submission does not have an attached file.');
      return;
    }

    setFileLoading(true);
    
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found. It may have been deleted or moved.');
        return;
      }

      // Special handling for image files
      if (isImageFile(fileName)) {
        setPreviewImageUri(filePath);
        setImagePreviewVisible(true);
      } else {
        // For other files (PDFs, etc.), use sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert('Error', 'File sharing is not available on this device.');
        }
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Could not open the file. The file format may not be supported.');
    } finally {
      setFileLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSubmissionItem = ({ item }: { item: AssignmentSubmission }) => (
    <TouchableOpacity
      className={`p-4 mb-3 rounded-xl ${
        item.status === 'graded'
          ? 'bg-purple-50 dark:bg-purple-900/30'
          : 'bg-white dark:bg-gray-800'
      } border border-gray-200 dark:border-gray-700`}
      onPress={() => {
        setSelectedSubmission(item);
        if (item.status === 'submitted') {
          setGradeModalVisible(true);
        }
      }}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-gray-800 dark:text-gray-200 text-lg">
          {item.studentName}
        </Text>
        <View className={`px-3 py-1 rounded-full ${
          item.status === 'graded'
            ? 'bg-purple-100 dark:bg-purple-800'
            : 'bg-green-100 dark:bg-green-800'
        }`}>
          <Text className={`text-xs font-medium ${
            item.status === 'graded'
              ? 'text-purple-800 dark:text-purple-200'
              : 'text-green-800 dark:text-green-200'
          }`}>
            {item.status === 'graded' ? 'Graded' : 'Submitted'}
          </Text>
        </View>
      </View>
      
      <Text className="text-gray-600 dark:text-gray-400 mb-2">
        Submitted: {formatDate(item.submittedAt)}
      </Text>
      
      {item.fileName && (
        <TouchableOpacity 
          className="flex-row items-center mb-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
          onPress={() => handleOpenFile(item.filePath, item.fileName)}
        >
          <MaterialCommunityIcons
            name={isImageFile(item.fileName) ? "file-image-outline" : "file-document-outline"}
            size={20}
            color={isDark ? '#94a3b8' : '#64748b'}
          />
          <Text className="ml-2 text-gray-700 dark:text-gray-300 flex-1">{item.fileName}</Text>
          <View className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
            <Text className="text-xs font-medium text-blue-700 dark:text-blue-200">
              {isImageFile(item.fileName) ? "View" : "Open"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      
      {item.status === 'graded' && (
        <View className="mt-2">
          <View className="flex-row items-center">
            <Text className="font-bold text-gray-700 dark:text-gray-300">Grade: </Text>
            <Text className="text-purple-600 dark:text-purple-400 font-bold">{item.grade}</Text>
          </View>
          
          {item.feedback && (
            <View className="mt-1">
              <Text className="font-bold text-gray-700 dark:text-gray-300">Feedback:</Text>
              <Text className="text-gray-600 dark:text-gray-400">{item.feedback}</Text>
            </View>
          )}
        </View>
      )}
      
      {item.status === 'submitted' && (
        <TouchableOpacity 
          className="mt-2 bg-blue-600 py-2 px-3 rounded-lg self-end flex-row items-center"
          onPress={() => {
            setSelectedSubmission(item);
            setGradeModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="white" />
          <Text className="text-white font-medium ml-1">Grade</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderGradeModal = () => {
    if (!selectedSubmission) return null;
    
    return (
      <Modal
        visible={gradeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setGradeModalVisible(false);
          setSelectedSubmission(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-5">
            <View className="w-12 h-1 bg-gray-300 dark:bg-gray-600 self-center rounded-full mb-4" />
            
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Grade Submission
            </Text>
            
            <Text className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student: {selectedSubmission.studentName}
            </Text>
            
            {selectedSubmission.fileName && (
              <TouchableOpacity 
                className="flex-row items-center mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                onPress={() => handleOpenFile(selectedSubmission.filePath, selectedSubmission.fileName)}
              >
                <MaterialCommunityIcons
                  name={isImageFile(selectedSubmission.fileName) ? "file-image-outline" : "file-document-outline"}
                  size={24}
                  color={isDark ? '#94a3b8' : '#64748b'}
                />
                <Text className="ml-2 text-gray-700 dark:text-gray-300 flex-1">{selectedSubmission.fileName}</Text>
                <View className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                  <Text className="text-xs font-medium text-blue-700 dark:text-blue-200">
                    {isImageFile(selectedSubmission.fileName) ? "View" : "Open"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            <Text className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grade:
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 mb-4 border border-gray-200 dark:border-gray-700"
              placeholder="Enter grade (e.g., A, B+, 95)"
              value={grade}
              onChangeText={setGrade}
            />
            
            <Text className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              Feedback (optional):
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 mb-4 border border-gray-200 dark:border-gray-700"
              placeholder="Enter feedback for the student"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View className="flex-row mt-2">
              <TouchableOpacity
                className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl mr-2 items-center"
                onPress={() => {
                  setGradeModalVisible(false);
                  setSelectedSubmission(null);
                }}
                disabled={loading}
              >
                <Text className="font-medium text-gray-800 dark:text-gray-200">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-blue-600 py-3 rounded-xl items-center"
                onPress={handleGradeSubmission}
                disabled={!grade.trim() || loading}
              >
                <Text className="font-medium text-white">Submit Grade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderImagePreviewModal = () => {
    return (
      <Modal
        visible={imagePreviewVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View className="flex-1 bg-black">
          <TouchableOpacity 
            className="absolute top-10 right-4 z-10 p-2 bg-black/50 rounded-full"
            onPress={() => setImagePreviewVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          {previewImageUri && (
            <Image
              source={{ uri: previewImageUri }}
              className="flex-1 w-full h-full"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 p-4 flex-row items-center border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={onClose} className="mr-4">
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={isDark ? '#e5e7eb' : '#374151'}
            />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Submissions
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {assignmentTitle}
            </Text>
          </View>
        </View>
        
        {fileLoading && (
          <View className="absolute inset-0 bg-black/30 items-center justify-center z-50">
            <View className="bg-white dark:bg-gray-800 p-5 rounded-xl">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-700 dark:text-gray-300 mt-3">Opening file...</Text>
            </View>
          </View>
        )}
        
        <FlatList
          data={submissions}
          renderItem={renderSubmissionItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <MaterialCommunityIcons
                name="inbox-outline"
                size={64}
                color={isDark ? '#4b5563' : '#d1d5db'}
              />
              <Text className="text-lg font-bold text-gray-600 dark:text-gray-400 mt-4 mb-2">
                No submissions yet
              </Text>
              <Text className="text-center text-gray-500 dark:text-gray-500 px-8">
                When students submit their assignments, they will appear here
              </Text>
            </View>
          }
        />
        
        {renderGradeModal()}
        {renderImagePreviewModal()}
      </View>
    </Modal>
  );
}
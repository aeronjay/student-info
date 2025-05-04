import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useUser } from '../../context/UserContext';
import { 
  getProfessorClasses, 
  getClassDetails, 
  getStudentsInClass, 
  saveStudentGrade, 
  getClassGradeStats,
  Class,
  StudentInClass,
  ClassGradeStats
} from '../../services/db/sqlite';

// A simple function to generate a unique ID
const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomNum = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomNum}`;
};

export default function GradingScreen() {
  const { user } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentInClass | null>(null);
  const [midtermGrade, setMidtermGrade] = useState('');
  const [finalGrade, setFinalGrade] = useState('');
  const [statsVisible, setStatsVisible] = useState(false);
  const [stats, setStats] = useState<ClassGradeStats | null>(null);

  // Load professor classes
  useEffect(() => {
    if (user?.id) {
      loadClasses();
    }
  }, [user]);

  // Load students when a class is selected
  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadStats();
    }
  }, [selectedClass]);

  const loadClasses = () => {
    try {
      const professorClasses = getProfessorClasses(user?.id || '');
      setClasses(professorClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    }
  };

  const loadStudents = () => {
    if (!selectedClass) return;
    
    try {
      const classStudents = getStudentsInClass(selectedClass.id);
      setStudents(classStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    }
  };

  const loadStats = () => {
    if (!selectedClass) return;
    
    try {
      const classStats = getClassGradeStats(selectedClass.id);
      setStats(classStats);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Don't alert for stats, just log the error
    }
  };

  const handleGradeSubmit = () => {
    if (!selectedStudent || !selectedClass) return;
    
    // Validate grades
    const midtermValue = midtermGrade ? parseFloat(midtermGrade) : null;
    const finalValue = finalGrade ? parseFloat(finalGrade) : null;
    
    if ((midtermValue !== null && (isNaN(midtermValue) || midtermValue < 0 || midtermValue > 100)) || 
        (finalValue !== null && (isNaN(finalValue) || finalValue < 0 || finalValue > 100))) {
      Alert.alert('Invalid Grades', 'Please enter valid grades between 0 and 100');
      return;
    }

    try {
      // Save grades to database
      saveStudentGrade(
        generateUniqueId(),
        selectedStudent.id,
        selectedClass.id,
        midtermValue,
        finalValue
      );
      
      // Update local state
      const updatedStudents = students.map(student => {
        if (student.id === selectedStudent.id) {
          return {
            ...student,
            midterm: midtermValue,
            final: finalValue
          };
        }
        return student;
      });
      
      setStudents(updatedStudents);
      
      // Refresh stats
      loadStats();
      
      // Close modal and reset inputs
      setModalVisible(false);
      setMidtermGrade('');
      setFinalGrade('');
      setSelectedStudent(null);
      
    } catch (error) {
      console.error('Error saving grades:', error);
      Alert.alert('Error', 'Failed to save grades');
    }
  };

  const openGradeModal = (student: StudentInClass) => {
    setSelectedStudent(student);
    setMidtermGrade(student.midterm === null ? '' : student.midterm.toString());
    setFinalGrade(student.final === null ? '' : student.final.toString());
    setModalVisible(true);
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-400';
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (grade >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeLetter = (grade: number | null) => {
    if (grade === null) return 'N/A';
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  const renderStudentItem = ({ item }: { item: StudentInClass }) => (
    <TouchableOpacity 
      className="flex-row items-center bg-white dark:bg-gray-800 rounded-lg p-4 my-1 shadow-sm"
      onPress={() => openGradeModal(item)}
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.name}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">ID: {item.id.substring(0, 8)}</Text>
      </View>
      <View className="flex-row items-center">
        <View className="items-center mr-4">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Midterm</Text>
          <Text className={`text-lg font-bold ${getGradeColor(item.midterm)}`}>
            {item.midterm === null ? 'N/A' : `${item.midterm} (${getGradeLetter(item.midterm)})`}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Final</Text>
          <Text className={`text-lg font-bold ${getGradeColor(item.final)}`}>
            {item.final === null ? 'N/A' : `${item.final} (${getGradeLetter(item.final)})`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100 dark:bg-gray-900">
      <View className="flex-1 px-4 py-2">
        <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Student Grading</Text>
        
        {/* Class Picker */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Select a Class</Text>
          <Picker
            selectedValue={selectedClass?.id}
            onValueChange={(itemValue: string) => {
              const selected = classes.find(c => c.id === itemValue);
              setSelectedClass(selected || null);
            }}
            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <Picker.Item label="Select a class..." value="" />
            {classes.map((cls) => (
              <Picker.Item key={cls.id} label={`${cls.subject} (${cls.subjectCode})`} value={cls.id} />
            ))}
          </Picker>
        </View>

        {/* Class Statistics */}
        {selectedClass && stats && (
          <View className="mb-4">
            <TouchableOpacity 
              className="flex-row items-center justify-between bg-blue-600 dark:bg-blue-800 rounded-lg p-4 shadow-sm"
              onPress={() => setStatsVisible(!statsVisible)}
            >
              <Text className="text-lg font-semibold text-white">Class Statistics</Text>
              <FontAwesome name={statsVisible ? "chevron-up" : "chevron-down"} size={16} color="white" />
            </TouchableOpacity>
            
            {statsVisible && (
              <View className="bg-white dark:bg-gray-800 rounded-b-lg p-4 shadow-sm">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-700 dark:text-gray-300">Total Students:</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalStudents}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-700 dark:text-gray-300">Graded Students:</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">{stats.gradedStudents}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-700 dark:text-gray-300">Average Midterm:</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">{stats.avgMidterm}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 dark:text-gray-300">Average Final:</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">{stats.avgFinal}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Student List */}
        {selectedClass ? (
          <FlatList
            data={students}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-gray-500 dark:text-gray-400">No students found in this class.</Text>
              </View>
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-gray-500 dark:text-gray-400">Please select a class to view students.</Text>
          </View>
        )}

        {/* Grading Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View className="bg-white dark:bg-gray-800 rounded-xl p-5 w-5/6 max-w-md shadow-lg">
              <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Grade Student: {selectedStudent?.name}
              </Text>
              
              <View className="mb-4">
                <Text className="text-gray-700 dark:text-gray-300 mb-1">Midterm Grade (0-100):</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  keyboardType="numeric"
                  value={midtermGrade}
                  onChangeText={setMidtermGrade}
                  placeholder="Enter midterm grade"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View className="mb-6">
                <Text className="text-gray-700 dark:text-gray-300 mb-1">Final Grade (0-100):</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  keyboardType="numeric"
                  value={finalGrade}
                  onChangeText={setFinalGrade}
                  placeholder="Enter final grade"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View className="flex-row justify-end">
                <TouchableOpacity
                  className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2 mr-2"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-gray-800 dark:text-gray-200">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-blue-600 dark:bg-blue-700 rounded-lg px-4 py-2"
                  onPress={handleGradeSubmit}
                >
                  <Text className="text-white">Save Grades</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
});
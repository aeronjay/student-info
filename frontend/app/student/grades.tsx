import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { FontAwesome } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import { 
  getStudentGrades, 
  getStudentClasses,
  getStudentAllAssignments,
  Class,
  StudentGrade,
  Assignment
} from '../../services/db/sqlite';

interface ClassGradeDisplay {
  id: string;
  name: string;
  code: string;
  info: string;
  professor: string;
  midterm: number | null;
  final: number | null;
  tasks: Array<{
    id: string;
    name: string;
    grade: number;
  }>;
}

export default function GradesScreen() {
  const { user } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [grades, setGrades] = useState<ClassGradeDisplay[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadGradesData();
    }
  }, [user]);

  const loadGradesData = async () => {
    try {
      // Load all grades
      const studentGrades: StudentGrade[] = getStudentGrades(user?.id || '');
      
      // Load all assignments for this student
      const studentAssignments: Assignment[] = getStudentAllAssignments(user?.id || '');
      
      // Group assignments by class
      const assignmentsByClass: Record<string, Array<{id: string; name: string; grade: number}>> = {};
      
      studentAssignments.forEach(assignment => {
        if (!assignmentsByClass[assignment.classId]) {
          assignmentsByClass[assignment.classId] = [];
        }
        
        if (assignment.status === 'graded' && assignment.grade) {
          assignmentsByClass[assignment.classId].push({
            id: assignment.id,
            name: assignment.title,
            grade: parseFloat(assignment.grade)
          });
        }
      });
      
      // If a student is enrolled in classes but doesn't have grades yet, 
      // we need to include those classes too
      const studentClasses: Class[] = getStudentClasses(user?.id || '');
      
      // Combine data
      const combinedGrades: ClassGradeDisplay[] = [];
      
      // First add all classes with grades
      studentGrades.forEach(grade => {
        combinedGrades.push({
          id: grade.classId,
          name: grade.subject || '',
          code: grade.subjectCode || '',
          info: grade.subjectInfo || '',
          professor: grade.professorName || '',
          midterm: grade.midterm !== null ? parseFloat(grade.midterm.toString()) : null,
          final: grade.final !== null ? parseFloat(grade.final.toString()) : null,
          tasks: assignmentsByClass[grade.classId] || []
        });
      });
      
      // Then add classes without grades
      studentClasses.forEach(cls => {
        // Check if this class is already in combinedGrades
        const exists = combinedGrades.some(g => g.id === cls.id);
        
        if (!exists) {
          combinedGrades.push({
            id: cls.id,
            name: cls.subject,
            code: cls.subjectCode,
            info: cls.subjectInfo,
            professor: '', // We don't have professor name here, would need another query
            midterm: null,
            final: null,
            tasks: assignmentsByClass[cls.id] || []
          });
        }
      });
      
      setGrades(combinedGrades);
      setAssignments(assignmentsByClass);
      
    } catch (error) {
      console.error('Error loading grades:', error);
      Alert.alert('Error', 'Failed to load grades data');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number | null): string => {
    if (grade === null) return 'text-gray-400';
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (grade >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeLetter = (grade: number | null): string => {
    if (grade === null) return 'N/A';
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  const calculateFinalGrade = (item: ClassGradeDisplay): number | null => {
    if (item.midterm === null && item.final === null && (!item.tasks || item.tasks.length === 0)) {
      return null;
    }
    
    let total = 0;
    let count = 0;
    
    if (item.midterm !== null) {
      total += item.midterm * 0.3; // Midterm worth 30%
      count += 0.3;
    }
    
    if (item.final !== null) {
      total += item.final * 0.5; // Final worth 50%
      count += 0.5;
    }
    
    // Tasks worth 20% total
    if (item.tasks && item.tasks.length > 0) {
      const taskAverage = item.tasks.reduce((sum: number, task) => sum + task.grade, 0) / item.tasks.length;
      total += taskAverage * 0.2;
      count += 0.2;
    }
    
    return count > 0 ? Math.round(total / count) : null;
  };

  const renderClassItem = ({ item }: { item: ClassGradeDisplay }) => {
    const isExpanded = expandedClass === item.id;
    const finalGrade = calculateFinalGrade(item);
    
    return (
      <View className="mb-4">
        <TouchableOpacity 
          className="flex-row items-center justify-between bg-white dark:bg-gray-800 rounded-t-lg p-4 shadow-sm"
          onPress={() => setExpandedClass(isExpanded ? null : item.id)}
        >
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.name}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">{item.code} • {item.professor}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm text-gray-600 dark:text-gray-400">Final Grade</Text>
            <Text className={`text-lg font-bold ${getGradeColor(finalGrade)}`}>
              {finalGrade === null ? 'Pending' : `${finalGrade} (${getGradeLetter(finalGrade)})`}
            </Text>
          </View>
          <FontAwesome 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={isDark ? "#94a3b8" : "#64748b"} 
            style={{ marginLeft: 12 }}
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View className="bg-gray-50 dark:bg-gray-700 rounded-b-lg p-4 shadow-sm">
            {/* Exam Grades */}
            <View className="mb-4">
              <Text className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Exam Grades</Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700 dark:text-gray-300">Midterm:</Text>
                <Text className={`font-semibold ${getGradeColor(item.midterm)}`}>
                  {item.midterm === null ? 'Not graded yet' : `${item.midterm} (${getGradeLetter(item.midterm)})`}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-700 dark:text-gray-300">Final:</Text>
                <Text className={`font-semibold ${getGradeColor(item.final)}`}>
                  {item.final === null ? 'Not graded yet' : `${item.final} (${getGradeLetter(item.final)})`}
                </Text>
              </View>
            </View>
            
            {/* Assignment Grades */}
            {item.tasks && item.tasks.length > 0 && (
              <View>
                <Text className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Assignments</Text>
                {item.tasks.map(task => (
                  <View key={task.id} className="flex-row justify-between mb-1">
                    <Text className="text-gray-700 dark:text-gray-300">{task.name}:</Text>
                    <Text className={`font-semibold ${getGradeColor(task.grade)}`}>
                      {task.grade} ({getGradeLetter(task.grade)})
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Grade Breakdown */}
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Text className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Grade Breakdown</Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700 dark:text-gray-300">Midterm: 30%</Text>
                <Text className="text-gray-700 dark:text-gray-300">Final: 50%</Text>
                <Text className="text-gray-700 dark:text-gray-300">Assignments: 20%</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 dark:bg-gray-900">
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Your Grades</Text>
        
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500 dark:text-gray-400">Loading grades...</Text>
          </View>
        ) : (
          <FlatList
            data={grades}
            renderItem={renderClassItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-gray-500 dark:text-gray-400">No grades available yet.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
import { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useUser } from '../../context/UserContext';
import { getStudentClasses } from '../../services/db/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ClassDetailModal from '../components/classroom/ClassDetailModal';

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

// Number of days to show (mon-sun)
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Time slots in consistent increments
const TIME_SLOTS = [
  { start: '08:00', end: '09:30' },
  { start: '09:45', end: '11:15' },
  { start: '11:30', end: '13:00' },
  { start: '14:00', end: '15:30' },
  { start: '15:45', end: '17:15' },
  { start: '17:30', end: '19:00' }
];

export default function ScheduleScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useUser();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailVisible, setClassDetailVisible] = useState(false);
  
  // Colors based on theme
  const bgColor = isDark ? 'bg-gray-900' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textColorDim = isDark ? 'text-gray-400' : 'text-gray-500';
  const primaryColor = isDark ? 'bg-blue-700' : 'bg-blue-600';
  const secondaryColor = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const classBlockColor = isDark ? 'bg-blue-900' : 'bg-blue-600';
  const highlightTextColor = isDark ? 'text-blue-300' : 'text-blue-100';
  
  // Get the current day name
  const selectedDay = DAYS_OF_WEEK[selectedDayIndex];
  
  useEffect(() => {
    if (user) {
      setLoading(true);
      const studentClasses = getStudentClasses(user.id) as Class[];
      setClasses(studentClasses);
      setLoading(false);
    }
  }, [user]);

  // Navigate to previous day
  const goToPreviousDay = () => {
    setSelectedDayIndex((prev) => (prev === 0 ? 6 : prev - 1));
  };

  // Navigate to next day
  const goToNextDay = () => {
    setSelectedDayIndex((prev) => (prev === 6 ? 0 : prev + 1));
  };
  
  // Create a schedule data structure that maps days to classes
  const scheduleByDay = useMemo(() => {
    const schedule: Record<number, Class[]> = {};
    
    // Initialize the schedule with empty arrays
    DAYS_OF_WEEK.forEach((_, dayIndex) => {
      schedule[dayIndex] = [];
    });
    
    // Place classes in the schedule
    classes.forEach(classItem => {
      const startDate = new Date(classItem.scheduleStart);
      const dayOfWeek = startDate.getDay();
      // Convert to our index (Monday = 0, Sunday = 6)
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      schedule[dayIndex].push(classItem);
    });
    
    return schedule;
  }, [classes]);

  // Get classes for the selected day
  const classesForSelectedDay = useMemo(() => {
    return scheduleByDay[selectedDayIndex] || [];
  }, [scheduleByDay, selectedDayIndex]);

  // Count classes for each day (for the weekly overview)
  const classCountByDay = useMemo(() => {
    const counts: Record<number, number> = {};
    
    DAYS_OF_WEEK.forEach((_, dayIndex) => {
      counts[dayIndex] = scheduleByDay[dayIndex].length;
    });
    
    return counts;
  }, [scheduleByDay]);

  const handleOpenClassDetail = (classId: string) => {
    setSelectedClassId(classId);
    setClassDetailVisible(true);
  };
  
  const handleCloseClassDetail = () => {
    setClassDetailVisible(false);
    setSelectedClassId(null);
  };
  
  // Format time from ISO string to display format
  const formatClassTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Check if a class falls within a time slot
  const isClassInTimeSlot = (classItem: Class, timeSlot: { start: string; end: string }) => {
    const classStartTime = formatClassTime(classItem.scheduleStart);
    const classEndTime = formatClassTime(classItem.scheduleEnd);
    
    // Simple check if time ranges overlap
    return (
      (classStartTime >= timeSlot.start && classStartTime < timeSlot.end) ||
      (classEndTime > timeSlot.start && classEndTime <= timeSlot.end) ||
      (classStartTime <= timeSlot.start && classEndTime >= timeSlot.end)
    );
  };

  // Empty state component
  const EmptySchedule = () => (
    <View className="items-center justify-center py-16">
      <MaterialCommunityIcons 
        name="calendar-blank-outline" 
        size={64} 
        color={isDark ? '#4b5563' : '#d1d5db'} 
      />
      <Text className={`text-lg font-bold ${textColorDim} mt-4 mb-2`}>
        No classes scheduled
      </Text>
      <Text className={`text-center ${textColorDim} px-8`}>
        Join classes to see them in your schedule
      </Text>
    </View>
  );

  // Render a class block for the schedule
  const renderClassBlock = (timeSlot: { start: string; end: string }) => {
    const classesInSlot = classesForSelectedDay.filter(classItem => 
      isClassInTimeSlot(classItem, timeSlot)
    );
    
    if (classesInSlot.length === 0) {
      return (
        <View className={`flex-1 border border-dashed ${borderColor} rounded-lg m-1 justify-center items-center`}>
          <Text className={textColorDim}>Available</Text>
        </View>
      );
    }
    
    return (
      <View className="flex-1 m-1">
        {classesInSlot.map(classItem => (
          <TouchableOpacity
            key={classItem.id}
            className={`${classBlockColor} rounded-lg p-3 mb-1`}
            onPress={() => handleOpenClassDetail(classItem.id)}
          >
            <Text className="text-lg font-bold text-white">{classItem.subject}</Text>
            <Text className="text-gray-300">{classItem.subjectCode}</Text>
            <Text className={highlightTextColor + " text-xs"}>
              {formatClassTime(classItem.scheduleStart)} - {formatClassTime(classItem.scheduleEnd)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View className={`flex-1 ${bgColor}`}>
      {/* Header with day navigation */}
      <View className={`flex-row items-center justify-between px-6 py-4 ${bgColor}`}>
        <TouchableOpacity onPress={goToPreviousDay} className="p-2">
          <MaterialCommunityIcons name="chevron-left" size={28} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        
        <Text className={`text-3xl font-bold ${textColor}`}>{selectedDay}</Text>
        
        <TouchableOpacity onPress={goToNextDay} className="p-2">
          <MaterialCommunityIcons name="chevron-right" size={28} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={isDark ? "#60a5fa" : "#3b82f6"} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4">
          {/* Schedule slots */}
          {TIME_SLOTS.map((timeSlot, index) => (
            <View key={index} className="flex-row mb-3 h-auto min-h-24">
              <View className="w-16 justify-center items-center">
                <Text className={textColorDim}>{timeSlot.start}</Text>
                <View className={`h-16 border-r ${borderColor}`} />
                <Text className={textColorDim}>{timeSlot.end}</Text>
              </View>
              
              {renderClassBlock(timeSlot)}
            </View>
          ))}
          
          {classes.length === 0 && <EmptySchedule />}
          
          {/* Weekly Overview */}
          <View className="mt-6 mb-8">
            <Text className={`text-2xl font-bold ${textColor} mb-4`}>Weekly Overview</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <View className="flex-row">
                {DAYS_OF_WEEK.map((day, index) => (
                  <TouchableOpacity 
                    key={day} 
                    className={`w-16 h-16 rounded-lg items-center justify-center mx-1 ${
                      index === selectedDayIndex ? primaryColor : secondaryColor
                    }`}
                    onPress={() => setSelectedDayIndex(index)}
                  >
                    <Text className={index === selectedDayIndex ? "text-white font-bold" : textColor}>{day.substring(0, 3)}</Text>
                    <Text className={index === selectedDayIndex ? "text-white" : textColor}>{classCountByDay[index]}</Text>
                    <Text className={index === selectedDayIndex ? "text-white text-xs" : `${textColorDim} text-xs`}>classes</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            {/* Classes for the day */}
            <Text className={`text-2xl font-bold ${textColor} mb-4`}>Classes on {selectedDay}</Text>
            {classesForSelectedDay.length > 0 ? (
              classesForSelectedDay.map(classItem => (
                <TouchableOpacity
                  key={classItem.id}
                  className={`${secondaryColor} rounded-lg p-4 mb-3`}
                  onPress={() => handleOpenClassDetail(classItem.id)}
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className={`text-xl font-bold ${textColor}`}>{classItem.subject}</Text>
                      <Text className={textColorDim}>
                        {formatClassTime(classItem.scheduleStart)} - {formatClassTime(classItem.scheduleEnd)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={textColor}>{classItem.subjectCode}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className={`${secondaryColor} rounded-lg p-6 items-center`}>
                <Text className={`${textColor} text-lg`}>No classes on {selectedDay}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      {/* Class Detail Modal */}
      <ClassDetailModal 
        visible={classDetailVisible}
        onClose={handleCloseClassDetail}
        classId={selectedClassId}
      />
    </View>
  );
}
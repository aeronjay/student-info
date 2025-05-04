import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, useColorScheme } from 'react-native';
import { useUser } from '../../../context/UserContext';
import { getClassDetails, getClassPosts } from '../../../services/db/sqlite';
import DraggableModal from './DraggableModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ClassDetailModalProps {
  visible: boolean;
  onClose: () => void;
  classId: string | null;
  isTeacher?: boolean;
  onAddPost?: () => void;
}

interface ClassPost {
  id: string;
  classId: string;
  title: string;
  content: string;
  type: 'assignment' | 'announcement';
  dueDate: string | null;
  createdAt: string;
}

interface ClassDetails {
  id: string;
  subject: string;
  subjectCode: string;
  subjectInfo: string;
  scheduleStart: string;
  scheduleEnd: string;
}

export default function ClassDetailModal({ visible, onClose, classId, isTeacher = false, onAddPost }: ClassDetailModalProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [posts, setPosts] = useState<ClassPost[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (visible && classId) {
      setLoading(true);
      
      // Get class details with proper type casting
      const details = getClassDetails(classId) as ClassDetails;
      setClassDetails(details);
      
      // Get class posts with proper type casting
      const classPosts = getClassPosts(classId) as ClassPost[];
      setPosts(classPosts);
      
      setLoading(false);
    }
  }, [visible, classId]);

  if (!classId || !visible) return null;

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDueDate(dateString: string | null) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatSchedule(startISO: string, endISO: string) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[start.getDay()];
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}, ${formatTime(start)} - ${formatTime(end)}`;
  }

  const renderPostItem = (post: ClassPost) => {
    return (
      <View key={post.id} style={[styles.postItem, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}>
        <View style={styles.postHeader}>
          <View style={styles.postTypeContainer}>
            {post.type === 'assignment' ? (
              <MaterialCommunityIcons name="clipboard-text" size={20} color={isDark ? '#93c5fd' : '#3b82f6'} />
            ) : (
              <MaterialCommunityIcons name="bullhorn" size={20} color={isDark ? '#93c5fd' : '#3b82f6'} />
            )}
            <Text style={[styles.postType, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>
              {post.type === 'assignment' ? 'Assignment' : 'Announcement'}
            </Text>
          </View>
          <Text style={[styles.postDate, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{formatDate(post.createdAt)}</Text>
        </View>
        
        <Text style={[styles.postTitle, { color: isDark ? '#f3f4f6' : '#1f2937' }]}>{post.title}</Text>
        <Text style={[styles.postContent, { color: isDark ? '#d1d5db' : '#4b5563' }]}>{post.content}</Text>
        
        {post.type === 'assignment' && post.dueDate && (
          <View style={[styles.dueDate, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
            <Text style={[styles.dueDateText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
              Due: {formatDueDate(post.dueDate)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <DraggableModal 
      visible={visible} 
      onClose={onClose}
      title={classDetails?.subject || 'Class Details'}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : (
        <View style={styles.container}>
          <ScrollView style={styles.scrollView}>
            {classDetails && (
              <View style={styles.classInfoSection}>
                <Text style={[styles.classCode, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{classDetails.subjectCode}</Text>
                <Text style={[styles.classDescription, { color: isDark ? '#d1d5db' : '#4b5563' }]}>{classDetails.subjectInfo}</Text>
                <Text style={[styles.classSchedule, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                  {formatSchedule(classDetails.scheduleStart, classDetails.scheduleEnd)}
                </Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
            
            <View style={styles.postsSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#f3f4f6' : '#1f2937' }]}>
                {posts.length > 0 ? 'Assignments & Announcements' : 'No assignments or announcements yet'}
              </Text>
              
              {posts.map(renderPostItem)}
            </View>
          </ScrollView>
          
          {/* Add Post Button (visible only for professors/teachers) */}
          {isTeacher && onAddPost && (
            <View style={styles.fabContainer}>
              <Pressable
                onPress={onAddPost}
                style={styles.fabButton}
              >
                <MaterialCommunityIcons name="plus" size={28} color="white" />
              </Pressable>
            </View>
          )}
        </View>
      )}
    </DraggableModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  classInfoSection: {
    marginBottom: 20,
  },
  classCode: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  classDescription: {
    fontSize: 14,
    marginBottom: 10,
  },
  classSchedule: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  postsSection: {
    marginBottom: 20,
  },
  postItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postType: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  postDate: {
    fontSize: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  postContent: {
    fontSize: 14,
    marginBottom: 10,
  },
  dueDate: {
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fabButton: {
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});
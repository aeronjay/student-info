import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, useColorScheme, Modal, Alert, Linking, Platform, Image } from 'react-native';
import { useUser } from '../../../context/UserContext';
import { getClassDetails, getClassPosts, getSubmissionsForAssignment } from '../../../services/db/sqlite';
import DraggableModal from './DraggableModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SubmissionsModal from './SubmissionsModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

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

export default function ClassDetailModal({ visible, onClose, classId, isTeacher = false, onAddPost }: ClassDetailModalProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [posts, setPosts] = useState<ClassPost[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [submissionsModalVisible, setSubmissionsModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ClassPost | null>(null);
  const [assignmentDetailVisible, setAssignmentDetailVisible] = useState(false);
  const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible && classId) {
      setLoading(true);
      const details = getClassDetails(classId) as ClassDetails;
      setClassDetails(details);
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

  const isImageFile = (fileName: string | null): boolean => {
    if (!fileName) return false;
    const lowerCaseFileName = fileName.toLowerCase();
    return lowerCaseFileName.endsWith('.jpg') || 
           lowerCaseFileName.endsWith('.jpeg') || 
           lowerCaseFileName.endsWith('.png') || 
           lowerCaseFileName.endsWith('.gif');
  };

  const handleViewSubmissions = (post: ClassPost) => {
    setSelectedAssignment(post);
    setSubmissionsModalVisible(true);
  };

  const handleViewAssignmentDetails = async (post: ClassPost) => {
    if (post.type !== 'assignment') return;
    setSelectedAssignment(post);
    setAssignmentDetailVisible(true);
    if (isTeacher) {
      setLoadingSubmissions(true);
      try {
        const submissions = getSubmissionsForAssignment(post.id) as AssignmentSubmission[];
        setSelectedAssignmentSubmissions(submissions || []);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoadingSubmissions(false);
      }
    }
  };

  const handleOpenFile = async (filePath: string | null, fileName: string | null) => {
    if (!filePath) {
      Alert.alert('No File', 'This submission does not have an attached file.');
      return;
    }

    setFileLoading(true);
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found. It may have been deleted or moved.');
        return;
      }

      if (isImageFile(fileName)) {
        setPreviewImageUri(filePath);
        setImagePreviewVisible(true);
      } else {
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

  const renderPostItem = (post: ClassPost) => {
    return (
      <TouchableOpacity 
        key={post.id} 
        style={[styles.postItem, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
        onPress={() => handleViewAssignmentDetails(post)}
      >
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
        <Text style={[styles.postContent, { color: isDark ? '#d1d5db' : '#4b5563' }]} numberOfLines={3}>{post.content}</Text>
        
        {post.type === 'assignment' && post.dueDate && (
          <View style={[styles.dueDate, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
            <Text style={[styles.dueDateText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
              Due: {formatDueDate(post.dueDate)}
            </Text>
          </View>
        )}
        
        {isTeacher && post.type === 'assignment' && (
          <TouchableOpacity 
            style={[styles.viewSubmissionsButton, { backgroundColor: isDark ? '#1e40af' : '#3b82f6' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleViewSubmissions(post);
            }}
          >
            <MaterialCommunityIcons name="inbox-arrow-down" size={16} color="white" />
            <Text style={styles.viewSubmissionsText}>View Submissions</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderAssignmentDetailModal = () => {
    if (!selectedAssignment) return null;
    return (
      <Modal
        visible={assignmentDetailVisible}
        animationType="slide"
        onRequestClose={() => {
          setAssignmentDetailVisible(false);
          setSelectedAssignment(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1f2937' : 'white' }}>
          <View style={{ flex: 1 }}>
            <View style={[styles.detailHeader, { backgroundColor: isDark ? '#374151' : '#f9fafb', borderBottomColor: isDark ? '#4b5563' : '#e5e7eb' }]}>
              <TouchableOpacity 
                onPress={() => {
                  setAssignmentDetailVisible(false);
                  setSelectedAssignment(null);
                }}
                style={{ padding: 10 }}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#e5e7eb' : '#374151'} />
              </TouchableOpacity>
              
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937' }}>
                  {selectedAssignment.title}
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {selectedAssignment.type === 'assignment' ? 'Assignment' : 'Announcement'}
                </Text>
              </View>
            </View>
            
            {fileLoading && (
              <View style={{
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.3)', 
                zIndex: 10,
                justifyContent: 'center', 
                alignItems: 'center'
              }}>
                <View style={{
                  backgroundColor: isDark ? '#374151' : 'white', 
                  padding: 20, 
                  borderRadius: 8
                }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={{ marginTop: 10, color: isDark ? '#f3f4f6' : '#1f2937' }}>
                    Opening file...
                  </Text>
                </View>
              </View>
            )}
            
            <ScrollView style={{ flex: 1, padding: 16 }}>
              <View style={[styles.detailSection, { backgroundColor: isDark ? '#374151' : '#f9fafb' }]}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#f3f4f6' : '#1f2937' }]}>Description</Text>
                <Text style={{ color: isDark ? '#d1d5db' : '#4b5563', fontSize: 16, lineHeight: 24 }}>
                  {selectedAssignment.content}
                </Text>
                
                {selectedAssignment.dueDate && (
                  <View style={[styles.dueDateLarge, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe', marginTop: 16 }]}>
                    <MaterialCommunityIcons name="calendar" size={20} color={isDark ? '#93c5fd' : '#1e40af'} />
                    <Text style={[styles.dueDateTextLarge, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                      Due: {formatDueDate(selectedAssignment.dueDate)}
                    </Text>
                  </View>
                )}
              </View>
              
              {isTeacher && selectedAssignment.type === 'assignment' && (
                <View style={[styles.detailSection, { backgroundColor: isDark ? '#374151' : '#f9fafb', marginTop: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={[styles.sectionTitle, { color: isDark ? '#f3f4f6' : '#1f2937' }]}>Student Submissions</Text>
                    <TouchableOpacity 
                      style={{ padding: 8 }}
                      onPress={() => {
                        setAssignmentDetailVisible(false);
                        handleViewSubmissions(selectedAssignment);
                      }}
                    >
                      <Text style={{ color: isDark ? '#93c5fd' : '#3b82f6', fontWeight: 'bold' }}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {loadingSubmissions ? (
                    <ActivityIndicator size="small" color={isDark ? '#93c5fd' : '#3b82f6'} style={{ marginVertical: 20 }} />
                  ) : selectedAssignmentSubmissions.length === 0 ? (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                      <MaterialCommunityIcons name="inbox-outline" size={40} color={isDark ? '#6b7280' : '#9ca3af'} />
                      <Text style={{ marginTop: 8, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center' }}>
                        No submissions yet
                      </Text>
                    </View>
                  ) : (
                    selectedAssignmentSubmissions.slice(0, 3).map((submission) => (
                      <View 
                        key={submission.id}
                        style={[
                          styles.submissionItem, 
                          { 
                            backgroundColor: isDark ? 
                              submission.status === 'graded' ? 'rgba(126, 34, 206, 0.2)' : '#1f2937' 
                              : submission.status === 'graded' ? '#f3e8ff' : 'white'
                          }
                        ]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontWeight: 'bold', color: isDark ? '#f3f4f6' : '#1f2937' }}>
                            {submission.studentName}
                          </Text>
                          <View style={{ 
                            paddingHorizontal: 8, 
                            paddingVertical: 2, 
                            borderRadius: 12,
                            backgroundColor: submission.status === 'graded' ? 
                              isDark ? 'rgba(126, 34, 206, 0.4)' : '#e9d5ff' : 
                              isDark ? 'rgba(5, 150, 105, 0.4)' : '#d1fae5'
                          }}>
                            <Text style={{ 
                              fontSize: 12,
                              color: submission.status === 'graded' ? 
                                isDark ? '#d8b4fe' : '#7e22ce' : 
                                isDark ? '#a7f3d0' : '#059669'
                            }}>
                              {submission.status === 'graded' ? 'Graded' : 'Submitted'}
                            </Text>
                          </View>
                        </View>
                        
                        {submission.status === 'graded' && (
                          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Grade: </Text>
                            <Text style={{ fontWeight: 'bold', color: isDark ? '#d8b4fe' : '#7e22ce' }}>
                              {submission.grade}
                            </Text>
                          </View>
                        )}
                        
                        {submission.fileName && (
                          <TouchableOpacity 
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              marginTop: 8,
                              padding: 8,
                              borderRadius: 6,
                              backgroundColor: isDark ? '#374151' : '#f3f4f6'
                            }}
                            onPress={() => handleOpenFile(submission.filePath, submission.fileName)}
                          >
                            <MaterialCommunityIcons 
                              name={isImageFile(submission.fileName) ? "file-image-outline" : "file-document-outline"} 
                              size={16} 
                              color={isDark ? '#9ca3af' : '#6b7280'} 
                            />
                            <Text style={{ color: isDark ? '#d1d5db' : '#4b5563', marginLeft: 6, fontSize: 12, flex: 1 }}>
                              {submission.fileName}
                            </Text>
                            <View style={{ 
                              backgroundColor: isDark ? '#1e40af' : '#dbeafe',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4
                            }}>
                              <Text style={{ 
                                fontSize: 10, 
                                fontWeight: 'bold',
                                color: isDark ? '#93c5fd' : '#1e40af'
                              }}>
                                {isImageFile(submission.fileName) ? "View" : "Open"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                  
                  {selectedAssignmentSubmissions.length > 3 && (
                    <TouchableOpacity 
                      style={{ 
                        alignItems: 'center', 
                        padding: 12, 
                        backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
                        borderRadius: 8,
                        marginTop: 12
                      }}
                      onPress={() => {
                        setAssignmentDetailVisible(false);
                        handleViewSubmissions(selectedAssignment);
                      }}
                    >
                      <Text style={{ color: isDark ? '#f3f4f6' : '#1f2937', fontWeight: '500' }}>
                        View All Submissions ({selectedAssignmentSubmissions.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
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
        <View style={{flex: 1, backgroundColor: 'black'}}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 10,
              padding: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20
            }}
            onPress={() => setImagePreviewVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          {previewImageUri && (
            <Image
              source={{ uri: previewImageUri }}
              style={{flex: 1, width: '100%', height: '100%'}}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    );
  };

  return (
    <>
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
      
      {selectedAssignment && (
        <SubmissionsModal
          visible={submissionsModalVisible}
          onClose={() => {
            setSubmissionsModalVisible(false);
            setSelectedAssignment(null);
          }}
          assignmentId={selectedAssignment?.id}
          assignmentTitle={selectedAssignment?.title}
        />
      )}
      
      {renderAssignmentDetailModal()}
      {renderImagePreviewModal()}
    </>
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
    marginBottom: 10
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewSubmissionsButton: {
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewSubmissionsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 5,
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
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    padding: 16,
  },
  detailSection: {
    padding: 16,
    borderRadius: 12,
  },
  dueDateLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dueDateTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  submissionItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  }
});
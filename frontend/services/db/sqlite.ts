import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export type UserRole = 'student' | 'professor';
export type PostType = 'assignment' | 'announcement';
export type SubmissionStatus = 'pending' | 'submitted' | 'graded';

const db = SQLite.openDatabaseSync('studentinfo.db');

export function initDatabase() {
  db.runSync(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL
    );`
  );

  // Create classes table (updated schema)
  db.runSync(
    `CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY NOT NULL,
      classCode TEXT NOT NULL,
      scheduleStart TEXT NOT NULL,
      scheduleEnd TEXT NOT NULL,
      subject TEXT NOT NULL,
      subjectInfo TEXT NOT NULL,
      subjectCode TEXT NOT NULL,
      professorId TEXT NOT NULL
    );`
  );
  // Create student_classes join table
  db.runSync(
    `CREATE TABLE IF NOT EXISTS student_classes (
      studentId TEXT NOT NULL,
      classId TEXT NOT NULL,
      PRIMARY KEY (studentId, classId)
    );`
  );
  
  // Create class posts table (assignments and announcements)
  db.runSync(
    `CREATE TABLE IF NOT EXISTS class_posts (
      id TEXT PRIMARY KEY NOT NULL,
      classId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      dueDate TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (classId) REFERENCES classes (id)
    );`
  );

  // Create assignment submissions table
  db.runSync(
    `CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      assignmentId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      status TEXT NOT NULL,
      filePath TEXT,
      fileName TEXT,
      submittedAt TEXT,
      grade TEXT,
      feedback TEXT,
      gradedAt TEXT,
      FOREIGN KEY (assignmentId) REFERENCES class_posts (id),
      FOREIGN KEY (studentId) REFERENCES users (id)
    );`
  );
}

function generateClassCode(length = 7) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function insertUser(id: string, name: string, email: string, role: UserRole) {
  db.runSync(
    'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
    [id, name, email, role]
  );
}

export function insertClass(
  id: string,
  scheduleStart: string,
  scheduleEnd: string,
  subject: string,
  subjectInfo: string,
  subjectCode: string,
  professorId: string
) {
  let classCode = generateClassCode();
  // Ensure classCode is unique
  while (db.getFirstSync('SELECT 1 FROM classes WHERE classCode = ?', [classCode])) {
    classCode = generateClassCode();
  }
  db.runSync(
    'INSERT INTO classes (id, classCode, scheduleStart, scheduleEnd, subject, subjectInfo, subjectCode, professorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, classCode, scheduleStart, scheduleEnd, subject, subjectInfo, subjectCode, professorId]
  );
  return classCode;
}

export function joinClass(studentId: string, classId: string) {
  db.runSync(
    'INSERT OR IGNORE INTO student_classes (studentId, classId) VALUES (?, ?)',
    [studentId, classId]
  );
}

export function getProfessorClasses(professorId: string) {
  return db.getAllSync('SELECT * FROM classes WHERE professorId = ?', [professorId]);
}

export function getStudentClasses(studentId: string) {
  return db.getAllSync(
    `SELECT c.* FROM classes c
     JOIN student_classes sc ON c.id = sc.classId
     WHERE sc.studentId = ?`,
    [studentId]
  );
}

export function getClassByCode(classCode: string) {
  return db.getFirstSync('SELECT * FROM classes WHERE classCode = ?', [classCode]);
}

// New functions for class posts (assignments and announcements)
export function createClassPost(
  id: string,
  classId: string,
  title: string,
  content: string,
  type: PostType,
  dueDate: string | null = null
) {
  const createdAt = new Date().toISOString();
  db.runSync(
    'INSERT INTO class_posts (id, classId, title, content, type, dueDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, classId, title, content, type, dueDate, createdAt]
  );
}

export function getClassPosts(classId: string) {
  return db.getAllSync(
    'SELECT * FROM class_posts WHERE classId = ? ORDER BY createdAt DESC',
    [classId]
  );
}

export function getClassDetails(classId: string) {
  return db.getFirstSync('SELECT * FROM classes WHERE id = ?', [classId]);
}

export function getStudentAllAssignments(studentId: string) {
  return db.getAllSync(
    `SELECT cp.*, c.subject, c.subjectCode, 
            COALESCE(sub.status, 'pending') as status,
            sub.grade, sub.filePath, sub.fileName, sub.id as submissionId
     FROM class_posts cp
     JOIN classes c ON cp.classId = c.id
     JOIN student_classes sc ON c.id = sc.classId
     LEFT JOIN assignment_submissions sub ON cp.id = sub.assignmentId AND sub.studentId = ?
     WHERE sc.studentId = ? AND cp.type = 'assignment'
     ORDER BY cp.dueDate ASC`,
    [studentId, studentId]
  );
}

// New functions for assignment submissions
export function submitAssignment(
  id: string,
  assignmentId: string,
  studentId: string,
  filePath: string | null = null,
  fileName: string | null = null
) {
  const submittedAt = new Date().toISOString();
  db.runSync(
    'INSERT OR REPLACE INTO assignment_submissions (id, assignmentId, studentId, status, filePath, fileName, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, assignmentId, studentId, 'submitted', filePath, fileName, submittedAt]
  );
}

export function markAssignmentAsDone(
  id: string,
  assignmentId: string,
  studentId: string
) {
  const submittedAt = new Date().toISOString();
  db.runSync(
    'INSERT OR REPLACE INTO assignment_submissions (id, assignmentId, studentId, status, submittedAt) VALUES (?, ?, ?, ?, ?)',
    [id, assignmentId, studentId, 'submitted', submittedAt]
  );
}

export function gradeAssignment(
  submissionId: string,
  grade: string,
  feedback: string = ''
) {
  const gradedAt = new Date().toISOString();
  db.runSync(
    'UPDATE assignment_submissions SET status = ?, grade = ?, feedback = ?, gradedAt = ? WHERE id = ?',
    ['graded', grade, feedback, gradedAt, submissionId]
  );
}

export function getStudentSubmission(assignmentId: string, studentId: string) {
  return db.getFirstSync(
    'SELECT * FROM assignment_submissions WHERE assignmentId = ? AND studentId = ?',
    [assignmentId, studentId]
  );
}

export function getSubmissionsForAssignment(assignmentId: string) {
  return db.getAllSync(
    `SELECT sub.*, u.name as studentName 
     FROM assignment_submissions sub
     JOIN users u ON sub.studentId = u.id
     WHERE sub.assignmentId = ?`,
    [assignmentId]
  );
}

// Function to save uploaded file
export async function saveSubmissionFile(fileUri: string, studentId: string, assignmentId: string) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }
    
    // Create directory if it doesn't exist
    const dirPath = `${FileSystem.documentDirectory}submissions/${studentId}/`;
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
    
    // Get file name from URI
    const fileName = fileUri.split('/').pop() || 'file';
    
    // Create a unique file path
    const newFilePath = `${dirPath}${assignmentId}_${fileName}`;
    
    // Copy file to new location
    await FileSystem.copyAsync({
      from: fileUri,
      to: newFilePath
    });
    
    return { filePath: newFilePath, fileName };
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

export { db };
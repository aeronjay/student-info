import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export type UserRole = 'student' | 'professor';
export type PostType = 'assignment' | 'announcement';
export type SubmissionStatus = 'pending' | 'submitted' | 'graded';

// Define types for database results
export interface Class {
  id: string;
  classCode: string;
  scheduleStart: string;
  scheduleEnd: string;
  subject: string;
  subjectInfo: string;
  subjectCode: string;
  professorId: string;
}

export interface StudentInClass {
  id: string;
  name: string;
  email: string;
  midterm: number | null;
  final: number | null;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  classId: string;
  midterm: number | null;
  final: number | null;
  updatedAt: string;
  subject?: string;
  subjectCode?: string;
  subjectInfo?: string;
  professorName?: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  content: string;
  type: string;
  dueDate: string | null;
  createdAt: string;
  subject?: string;
  subjectCode?: string;
  status?: string;
  grade?: string;
  filePath?: string;
  fileName?: string;
  submissionId?: string;
}

export interface ClassGradeStats {
  totalStudents: number;
  gradedStudents: number;
  avgMidterm: string;
  avgFinal: string;
}

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

  // Create student grades table for exams
  db.runSync(
    `CREATE TABLE IF NOT EXISTS student_grades (
      id TEXT PRIMARY KEY NOT NULL,
      studentId TEXT NOT NULL,
      classId TEXT NOT NULL,
      midterm REAL,
      final REAL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (studentId) REFERENCES users (id),
      FOREIGN KEY (classId) REFERENCES classes (id)
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

export function getProfessorClasses(professorId: string): Class[] {
  return db.getAllSync('SELECT * FROM classes WHERE professorId = ?', [professorId]) as Class[];
}

export function getStudentClasses(studentId: string): Class[] {
  return db.getAllSync(
    `SELECT c.* FROM classes c
     JOIN student_classes sc ON c.id = sc.classId
     WHERE sc.studentId = ?`,
    [studentId]
  ) as Class[];
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

export function getStudentAllAssignments(studentId: string): Assignment[] {
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
  ) as Assignment[];
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

// New functions for handling student grades
export function getStudentsInClass(classId: string): StudentInClass[] {
  return db.getAllSync(
    `SELECT u.id, u.name, u.email, sg.midterm, sg.final
     FROM users u
     JOIN student_classes sc ON u.id = sc.studentId
     LEFT JOIN student_grades sg ON u.id = sg.studentId AND sg.classId = ?
     WHERE sc.classId = ? AND u.role = 'student'
     ORDER BY u.name`,
    [classId, classId]
  ) as StudentInClass[];
}

export function saveStudentGrade(
  id: string,
  studentId: string,
  classId: string,
  midterm: number | null = null,
  final: number | null = null
): void {
  const updatedAt = new Date().toISOString();
  
  // Check if the student already has a grade record for this class
  const existingGrade = db.getFirstSync(
    'SELECT id FROM student_grades WHERE studentId = ? AND classId = ?',
    [studentId, classId]
  );
  
  if (existingGrade) {
    // Update existing record
    db.runSync(
      'UPDATE student_grades SET midterm = ?, final = ?, updatedAt = ? WHERE studentId = ? AND classId = ?',
      [midterm, final, updatedAt, studentId, classId]
    );
  } else {
    // Insert new record
    db.runSync(
      'INSERT INTO student_grades (id, studentId, classId, midterm, final, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, studentId, classId, midterm, final, updatedAt]
    );
  }
}

export function getStudentGrades(studentId: string): StudentGrade[] {
  return db.getAllSync(
    `SELECT sg.*, c.subject, c.subjectCode, c.subjectInfo, u.name as professorName
     FROM student_grades sg
     JOIN classes c ON sg.classId = c.id
     JOIN users u ON c.professorId = u.id
     WHERE sg.studentId = ?`,
    [studentId]
  ) as StudentGrade[];
}

export function getClassGradeStats(classId: string): ClassGradeStats {
  const result = db.getFirstSync(
    `SELECT 
       COUNT(DISTINCT sc.studentId) as totalStudents,
       COUNT(DISTINCT sg.studentId) as gradedStudents,
       AVG(sg.midterm) as avgMidterm,
       AVG(sg.final) as avgFinal
     FROM student_classes sc
     LEFT JOIN student_grades sg ON sc.studentId = sg.studentId AND sg.classId = sc.classId
     WHERE sc.classId = ?`,
    [classId]
  ) as any;
  
  return {
    totalStudents: result?.totalStudents || 0,
    gradedStudents: result?.gradedStudents || 0,
    avgMidterm: result?.avgMidterm ? parseFloat(result.avgMidterm).toFixed(1) : 'N/A',
    avgFinal: result?.avgFinal ? parseFloat(result.avgFinal).toFixed(1) : 'N/A'
  };
}

export { db };
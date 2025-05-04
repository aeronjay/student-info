import * as SQLite from 'expo-sqlite';

export type UserRole = 'student' | 'professor';

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

export { db };
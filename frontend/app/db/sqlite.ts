import * as SQLite from 'expo-sqlite';

export type UserRole = 'student' | 'pending_professor' | 'professor' | 'superprofessor';

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
}

export function insertUser(id: string, name: string, email: string, role: UserRole) {
  db.runSync(
    'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
    [id, name, email, role]
  );
}

export { db };
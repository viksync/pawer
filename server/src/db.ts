import Database from 'better-sqlite3';
const db = new Database('./db/database.db');

export interface UserBinding {
    unique_id: string;
    chat_id: string;
}

const createTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS user_bindings (
    unique_id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL
    )
`);

const insertUser = db.prepare(`
    INSERT INTO user_bindings
    (unique_id, chat_id)
    VALUES (?, ?)    
`);

const findUser = db.prepare(`
    SELECT *
    FROM user_bindings
    WHERE unique_id = ?
`) as Database.Statement<[string], UserBinding>;

const deleteUser = db.prepare(`
    DELETE 
    FROM user_bindings
    WHERE unique_id = ?
`);

export { createTable, insertUser, findUser, deleteUser };

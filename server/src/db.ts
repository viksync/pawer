import fs from 'fs';
import path from 'path';
import Database, { type Database as SqliteDb, RunResult } from 'better-sqlite3';

export interface TgBindingRecord {
    uid: string;
    chat_id: string;
}

export interface UserRepository {
    findUser(uid: string): Promise<TgBindingRecord | undefined>;
    insertUser(uid: string, chatId: string): Promise<void>;
    deleteUser(uid: string): Promise<boolean>;
}

export class SqliteRepo implements UserRepository {
    private insertUserQuery: Database.Statement<[string, string], RunResult>;
    private findUserQuery: Database.Statement<
        [string],
        TgBindingRecord | undefined
    >;
    private deleteUserQuery: Database.Statement<[string], RunResult>;

    static initialize(): SqliteRepo {
        const dbDir = path.resolve('./db');

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        const dbPath = path.join(dbDir, 'database.db');

        const db = new Database(dbPath);
        db.prepare(
            `CREATE TABLE IF NOT EXISTS tg_user_bindings (
                uid TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL
            )`,
        ).run();

        console.log('✅ Database initialized');
        return new SqliteRepo(db);
    }

    constructor(private db: SqliteDb) {
        this.insertUserQuery = db.prepare(`
            INSERT INTO tg_user_bindings
            (uid, chat_id)
            VALUES (?, ?)
        `);

        this.findUserQuery = db.prepare(`
            SELECT *
            FROM tg_user_bindings
            WHERE uid = ?
        `);

        this.deleteUserQuery = db.prepare(`
            DELETE 
            FROM tg_user_bindings
            WHERE uid = ?
        `);
    }

    async findUser(uid: string): Promise<TgBindingRecord | undefined> {
        return this.findUserQuery.get(uid);
    }

    async insertUser(uid: string, chatId: string): Promise<void> {
        this.insertUserQuery.run(uid, chatId);
    }

    async deleteUser(uid: string): Promise<boolean> {
        return this.deleteUserQuery.run(uid).changes > 0;
    }
}

export function createUserRepository(): UserRepository {
    return SqliteRepo.initialize();
}

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

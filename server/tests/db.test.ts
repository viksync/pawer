import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteRepo, type UserRepository } from '../src/db.js';

describe('UserRepository', () => {
    let db: Database.Database;
    let repo: UserRepository;

    beforeEach(() => {
        db = new Database(':memory:');

        db.exec(`
        CREATE TABLE IF NOT EXISTS tg_user_bindings (
        uid TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL
        )
        `);

        repo = new SqliteRepo(db);
    });

    afterEach(() => {
        db.close();
    });

    it('should insert and find user', async () => {
        await repo.insertUser('user123', 'chat456');

        const user = await repo.findUser('user123');

        expect(user).toEqual({
            uid: 'user123',
            chat_id: 'chat456',
        });
    });
});

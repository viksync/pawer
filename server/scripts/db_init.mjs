import Database from 'better-sqlite3';

try {
    const db = new Database('./db/database.db');

    const createTable = db.prepare(
        `
        CREATE TABLE IF NOT EXISTS user_bindings (
        unique_id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL
        )
        `,
    );

    createTable.run();

    console.log('✅ Database initialization complete!');
} catch (error) {
    console.error('❌ Database initialization failed:');
    console.error(error.message);
    process.exit(1);
}

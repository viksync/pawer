import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import * as webSocket from './websocket.js';
import * as userManagment from './user_managment.js';
import * as notifications from './notifications.js';
import { SqliteRepo, type UserRepository } from './db.js';
import Database from 'better-sqlite3';
// TODO: try middleware and limits

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN required');
}

const PORT = parseInt(process.env.PORT || '3333');

async function createServer(userRepository: UserRepository, botToken: string) {
    const fastify = Fastify({
        logger:
            process.env.NODE_ENV === 'production' ?
                { level: 'warn' }
            :   {
                    level: 'info',
                    transport: { target: 'pino-pretty' },
                },
    });

    await fastify.register(import('@fastify/websocket'));
    webSocket.setup(fastify);
    userManagment.setup(fastify, userRepository);
    notifications.setup(fastify, userRepository, botToken);

    return fastify;
}

async function main() {
    const dbDir = path.resolve('./db'); // resolves relative to CWD, safe on Render

    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const dbPath = path.join(dbDir, 'database.db');
    const db = new Database(dbPath);
    db.prepare(
        `
    CREATE TABLE IF NOT EXISTS tg_user_bindings (
    uid TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL
    )`,
    ).run();

    console.log('✅ Database ready!');
    // const db = new Database('./db/database.db');
    const userRepository = new SqliteRepo(db);
    const fastify = await createServer(userRepository, BOT_TOKEN!);

    try {
        await fastify.listen({ port: PORT });

        ['SIGTERM', 'SIGINT'].forEach((signal) => {
            process.on(signal, () => {
                fastify.log.info(
                    `Received ${signal}, shutting down gracefully`,
                );
                fastify.close(() => {
                    process.exit(0);
                });
            });
        });
    } catch (err) {
        fastify.log.error(`Didn't start because: ${err}`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal error', err);
    process.exit(1);
});

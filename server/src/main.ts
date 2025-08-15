import Fastify from 'fastify';
import * as webSocket from './websocket.js';
import * as userManagment from './user_managment.js';
import * as notifications from './notifications.js';
// TODO: try middleware and limits

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN required');
}

const PORT = parseInt(process.env.PORT || '3333');

async function createServer(botToken: string) {
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
    userManagment.setup(fastify);
    notifications.setup(fastify, botToken);

    return fastify;
}

async function main() {
    const fastify = await createServer(BOT_TOKEN!);

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

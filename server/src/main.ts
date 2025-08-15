import Fastify from 'fastify';
import { z } from 'zod';
import * as db from './db.js';
import type { WebSocket } from '@fastify/websocket';
// TODO: try middleware and limits

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN required');
}

const PORT = parseInt(process.env.PORT || '3333');

const TelegramWebhook = z.object({
    message: z.object({
        text: z.string(),
        chat: z.object({
            id: z.number(),
        }),
    }),
});

const UserNotification = z.object({
    unique_id: z.string(),
    message: z.string(),
});

const WSregistationData = z.object({
    type: z.string(),
    unique_id: z.string(),
});

interface WSConnectionsInfo {
    socket: WebSocket;
    lastSeen: number;
}

const activeWSConnections = new Map<string, WSConnectionsInfo>();

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

fastify.get('/ws', { websocket: true }, (connection, request) => {
    connection.on('message', (message: Buffer) => {
        try {
            const messageStr = message.toString();
            const rawData = JSON.parse(messageStr);
            const data = WSregistationData.parse(rawData);

            if (!(data.type === 'listen_for_link')) {
                connection.close(1003, 'Invalid message format');
                return;
            }

            activeWSConnections.set(data.unique_id, {
                socket: connection,
                lastSeen: Date.now(),
            });

            connection.send(
                JSON.stringify({
                    type: 'listening_confirmed',
                    unique_id: data.unique_id,
                }),
            );
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error(error);
                connection.close(1003, 'Invalid message format');
                return;
            }

            console.error(error);
            connection.close(1002, 'Json error');
        }
    });

    connection.on('close', () => {
        for (const [key, value] of activeWSConnections) {
            if (value.socket === connection) {
                activeWSConnections.delete(key);
                break;
            }
        }
    });
});

fastify.post('/webhook', async (request, reply) => {
    let data;
    try {
        data = TelegramWebhook.parse(request.body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send('Invalid webhook format');
        }
        return reply.code(200).send('OK');
    }

    const text = data.message.text;
    const chatId = data.message.chat.id;

    if (!text.startsWith('/start')) {
        return reply.code(200).send('OK');
    }

    const uniqueId = text.split(' ')[1];
    if (!uniqueId) {
        return reply.code(200).send('OK');
    }

    try {
        const existingUser = db.findUser.get(uniqueId);
        if (!existingUser) {
            db.insertUser.run(uniqueId, chatId.toString());
        }
    } catch (error) {
        console.error(error);
        return reply.code(200).send('OK');
    }

    const wsConnection = activeWSConnections.get(uniqueId);
    if (wsConnection) {
        try {
            wsConnection.socket.send(
                JSON.stringify({
                    type: 'linked',
                    unique_id: uniqueId,
                }),
            );

            wsConnection.socket.close(1000, 'Registration complete');
            activeWSConnections.delete(uniqueId);
        } catch (error) {
            console.error(error);
        }
    }

    return reply.code(200).send('OK');
});

fastify.post('/notify', async (request, reply) => {
    try {
        const data = UserNotification.parse(request.body);

        const result = db.findUser.get(data.unique_id);
        if (!result) {
            return reply.code(404).send('UUID Not Found');
        }

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: result.chat_id,
                    text: data.message,
                }),
            },
        );

        if (!telegramResponse.ok) {
            return reply.code(502).send('Telegram API error');
        }

        return reply.code(200).send('OK');
    } catch (error) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send('Invalid request format');
        }

        return reply.code(500).send('Server error');
    }
});

fastify.post<{ Params: { uuid: string } }>(
    '/unlink/:uuid',
    async (request, reply) => {
        const { uuid } = request.params;
        try {
            const result = db.deleteUser.run(uuid);

            if (!result.changes) {
                return reply.code(404).send({ error: 'User not found' });
                // return reply.code(404).send('User not found');
            }

            // return reply.code(204).send();
            return reply.code(200).send({ success: true });
        } catch {
            return reply.code(500).send('Database error');
        }
    },
);

fastify.get<{ Params: { uuid: string } }>(
    '/is_linked/:uuid',
    async (request, reply) => {
        const { uuid } = request.params;
        try {
            const result = db.findUser.get(uuid);

            if (!result) {
                // return reply.code(404).send('Not Found');
                return reply.code(200).send({ linked: false });
            }

            return reply.code(200).send({ linked: true });
            // return reply.code(200).send('OK');
        } catch {
            return reply.code(500).send('Database error');
        }
    },
);

try {
    await fastify.listen({ port: PORT });

    ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.on(signal, () => {
            fastify.log.info(`Received ${signal}, shutting down gracefully`);
            fastify.close(() => {
                process.exit(0);
            });
        });
    });
} catch (err) {
    fastify.log.error(`Didn't start because: ${err}`);
    process.exit(1);
}

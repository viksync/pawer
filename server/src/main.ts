import Fastify from 'fastify';
import { z } from 'zod';
import * as db from './db.js';
import * as webSocket from './websocket.js';
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

    webSocket.notifyApp(uniqueId, {
        type: 'linked',
        unique_id: uniqueId,
    });

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

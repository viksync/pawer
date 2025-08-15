import { z } from 'zod';
import * as db from './db.js';
import { FastifyInstance } from 'fastify';
import * as webSocket from './websocket.js';

const TelegramWebhook = z.object({
    message: z.object({
        text: z.string(),
        chat: z.object({
            id: z.number(),
        }),
    }),
});

export function setup(fastify: FastifyInstance) {
    fastify.post('/webhook', webhookHandler);
    fastify.get<{ Params: { uuid: string } }>(
        '/is_linked/:uuid',
        isLinkedHandler,
    );
    fastify.post<{ Params: { uuid: string } }>('/unlink/:uuid', unlinkHandler);
}

async function webhookHandler(request, reply) {
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
}

async function unlinkHandler(request, reply) {
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
}
async function isLinkedHandler(request, reply) {
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
}

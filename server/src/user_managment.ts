import { z } from 'zod';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as webSocket from './websocket.js';
import type { UserRepository } from './db.js';

const TgWebhookScheme = z.object({
    message: z.object({
        text: z.string(),
        chat: z.object({
            id: z.number(),
        }),
    }),
});

let db: UserRepository;

export function setup(fastify: FastifyInstance, dbInstance: UserRepository) {
    db = dbInstance;

    try {
        fastify.post('/webhook', webhookHandler);
        fastify.get<{ Params: { uid: string } }>(
            '/is_linked/:uid',
            isLinkedHandler,
        );
        fastify.delete<{ Params: { uid: string } }>(
            '/unlink/:uid',
            unlinkHandler,
        );
    } catch (err) {
        throw new Error(`User module init failed ${err}`);
    }
}

async function webhookHandler(request: FastifyRequest, reply: FastifyReply) {
    let data;
    try {
        data = TgWebhookScheme.parse(request.body);
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

    const uid = text.split(' ')[1];
    if (!uid) {
        return reply.code(200).send('OK');
    }

    try {
        const existingUser = await db.findUser(uid);
        if (!existingUser) {
            await db.insertUser(uid, chatId.toString());
        }
    } catch (error) {
        console.error(error);
        return reply.code(200).send('OK');
    }

    webSocket.notifyApp(uid, {
        type: 'linked',
        unique_id: uid,
    });

    return reply.code(200).send('OK');
}

async function unlinkHandler(
    request: FastifyRequest<{ Params: { uid: string } }>,
    reply: FastifyReply,
) {
    const { uid } = request.params;
    try {
        const result = await db.deleteUser(uid);

        if (!result) {
            return reply.code(404).send('User not found');
        }

        return reply.code(204).send();
    } catch {
        return reply.code(500).send('Database error');
    }
}
async function isLinkedHandler(
    request: FastifyRequest<{ Params: { uid: string } }>,
    reply: FastifyReply,
) {
    const { uid } = request.params;
    try {
        const result = await db.findUser(uid);

        if (!result) {
            return reply.code(404).send('Not Found');
        }

        return reply.code(200).send('OK');
    } catch {
        return reply.code(500).send('Database error');
    }
}

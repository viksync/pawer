import { z } from 'zod';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as webSocket from './websocket.js';

const TgWebhookScheme = z.object({
    message: z.object({
        text: z.string(),
        chat: z.object({
            id: z.number(),
        }),
    }),
});

export function setup(fastify: FastifyInstance) {
    try {
        fastify.post('/webhook', webhookHandler);
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
        webSocket.notifyApp(uid, `linked_chatId:${chatId}`);
    } catch (err) {
        console.error('Failed to send chat_id back', err);
    }

    return reply.code(200).send('OK');
}

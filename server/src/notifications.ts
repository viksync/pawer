import { z } from 'zod';
import * as db from './db.js';
import { FastifyInstance } from 'fastify';

const UserNotification = z.object({
    unique_id: z.string(),
    message: z.string(),
});

let BOT_TOKEN: string;

export function setup(fastify: FastifyInstance, botToken: string) {
    BOT_TOKEN = botToken;
    fastify.post('/notify', notifyHandler);
}

async function notifyHandler(request, reply) {
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
}

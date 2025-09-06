import { z } from 'zod';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const NotificationRequestScheme = z.object({
    chat_id: z.string(),
    message: z.string(),
});

let TELEGRAM_API_URL: string;

export function setup(fastify: FastifyInstance, botToken: string) {
    TELEGRAM_API_URL = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        fastify.post('/notify', notifyHandler);
    } catch (err) {
        throw new Error(`Notifications module init failed ${err}`);
    }
}

async function notifyHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = NotificationRequestScheme.parse(request.body);

        const telegramResponse = await fetch(TELEGRAM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: data.chat_id,
                text: data.message,
            }),
        });

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

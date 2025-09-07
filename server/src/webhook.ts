import { z } from 'zod';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const TgWebhookScheme = z.object({
    message: z.object({
        text: z.string(),
        chat: z.object({
            id: z.number(),
        }),
    }),
});

type NotifyAppFunction = (uid: string, msg: string) => void;

export function setup(fastify: FastifyInstance, notifyApp: NotifyAppFunction) {
    try {
        fastify.post('/webhook', (req, rep) =>
            webhookHandler(req, rep, notifyApp),
        );
    } catch (err) {
        throw new Error(`Webhook module init failed ${err}`);
    }
}

export async function register(botToken: string, publicUrl: string) {
    const url = `${publicUrl}/webhook`;

    try {
        const currentWebhook = await fetch(
            `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
        );
        const currentWebhookData = await currentWebhook.json();

        if (currentWebhookData.result?.url === url) {
            console.log('✅ Webhook already registered:', url);
            return;
        }
    } catch (err) {
        console.warn('Failed to get current webhook status: ', err);
    }

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${botToken}/setWebhook`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            },
        );

        const data = await res.json();

        if (!data.ok) {
            throw new Error(
                `Telegram API rejected webhook: ${JSON.stringify(data)}`,
            );
        }

        console.log('✅ Telegram webhook registered:', url);
    } catch (err) {
        console.error('Telegram webhook registration failed: ', err);
        throw err;
    }
}

async function webhookHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    notifyApp: NotifyAppFunction,
) {
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
        notifyApp(uid, `linked_chatId:${chatId}`);
    } catch (err) {
        console.error('Failed to send chat_id back', err);
    }

    return reply.code(200).send('OK');
}

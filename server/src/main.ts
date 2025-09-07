import Fastify, { type FastifyInstance } from 'fastify';
import * as websocket from './websocket.js';
import * as webhook from './webhook.js';
import * as notifications from './notifications.js';

type AppConfig = {
    botToken: string;
    publicUrl: string;
    port: number;
};

async function main() {
    let config: AppConfig;
    let fastify: FastifyInstance;

    try {
        config = loadConfig();
        await retryTillComplete(
            registerTelegramWebhook,
            30,
            config.botToken,
            config.publicUrl,
        );
        fastify = await createFastify();
        setupAppModules(fastify, config.botToken);
    } catch (err) {
        console.error('App initialization failed: ', err);
        process.exit(1);
    }

    try {
        await fastify.listen({ port: config.port, host: '0.0.0.0' });
        registerGracefulShutdown(fastify);
    } catch (err) {
        console.error(`Didn't start because: ${err}`);
        process.exit(1);
    }
}

main();

function loadConfig(): AppConfig {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error('BOT_TOKEN not set');

    const publicUrl = process.env.PUBLIC_URL;
    if (!publicUrl) throw new Error('PUBLIC_URL not set');

    const port = Number.parseInt(process.env.PORT || '3333', 10);

    console.log('✅ Config loaded');
    return { botToken, publicUrl, port };
}

async function retryTillComplete<T extends readonly unknown[]>(
    task: (...args: T) => Promise<void>,
    maxTimeoutSec: number = 30,
    ...args: T
) {
    let attempt = 1;
    let timeout: number;

    while (true) {
        try {
            await task(...args);
            return;
        } catch {
            console.warn(
                `${task.name || 'Task'} failed, retrying. Attempt: ${attempt}`,
            );
            timeout = Math.pow(2, attempt - 1);
            if (timeout > maxTimeoutSec) timeout = maxTimeoutSec;
            await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
            attempt++;
        }
    }
}

async function registerTelegramWebhook(botToken: string, publicUrl: string) {
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

async function createFastify() {
    const fastify = Fastify({
        logger:
            process.env.NODE_ENV === 'dev' ?
                {
                    level: 'info',
                    transport: { target: 'pino-pretty' },
                }
            :   { level: 'info' },
    });
    console.log('✅ Fastify instance created');

    await fastify.register(import('@fastify/websocket'));
    console.log('✅ Fastify websocket registered');

    return fastify;
}

async function setupAppModules(fastify: FastifyInstance, botToken: string) {
    websocket.setup(fastify);
    console.log('✅ Websocket module initialized');

    webhook.setup(fastify, websocket.notifyApp);
    console.log('✅ Webhook module initialized');

    notifications.setup(fastify, botToken);
    console.log('✅ Notifications module initialized');
}

function registerGracefulShutdown(fastify: FastifyInstance) {
    ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.on(signal, () => {
            fastify.log.info(`Received ${signal}, shutting down gracefully`);
            fastify.close(() => process.exit(0));
        });
    });
}

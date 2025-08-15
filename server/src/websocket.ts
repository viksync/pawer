import { z } from 'zod';
import type { WebSocket as FastifyWebSocket } from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';

const registrationSchema = z.object({
    type: z.string(),
    unique_id: z.string(),
});

interface Connection {
    socket: FastifyWebSocket;
    lastSeen: number;
}

const activeConnections = new Map<string, Connection>();

export function setup(fastifyInstance: FastifyInstance) {
    fastifyInstance.get(
        '/ws',
        { websocket: true },
        (connection: FastifyWebSocket, request) => {
            connection.on('message', (payload: Buffer) =>
                messageHandler(connection, payload),
            );
            connection.on('close', () => exitHandler(connection));
        },
    );
}

export function notifyApp(userId: string, message: object) {
    const connection = activeConnections.get(userId);
    if (connection) {
        try {
            connection.socket.send(JSON.stringify(message));
            connection.socket.close(1000, 'Registration complete');
            activeConnections.delete(userId);
        } catch (error) {
            console.error(error);
        }
    }
}

function messageHandler(connection: FastifyWebSocket, payload: Buffer) {
    try {
        const message = payload.toString();
        const data = registrationSchema.parse(JSON.parse(message));

        if (!(data.type === 'listen_for_link')) {
            connection.close(1003, 'Invalid message format');
            return;
        }

        activeConnections.set(data.unique_id, {
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
}

function exitHandler(connection: FastifyWebSocket) {
    for (const [key, value] of activeConnections) {
        if (value.socket === connection) {
            activeConnections.delete(key);
            break;
        }
    }
}

import type { WebSocket as FastifyWebSocket } from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';

interface Connection {
    socket: FastifyWebSocket;
    lastSeen: number;
}

const activeConnections = new Map<string, Connection>();

export function setup(fastifyInstance: FastifyInstance) {
    try {
        fastifyInstance.get(
            '/websocket',
            { websocket: true },
            (connection: FastifyWebSocket) => {
                connection.on('message', (payload: Buffer) =>
                    registerHandler(connection, payload),
                );
                connection.on('close', () => exitHandler(connection));
            },
        );
    } catch (err) {
        throw new Error(`Websocket module setup failed: ${err}`);
    }
}

export function notifyApp(userId: string, message: string) {
    const socket = activeConnections.get(userId)?.socket;
    if (socket) {
        try {
            socket.send(message);
            socket.close(1000, 'Registration complete');
            activeConnections.delete(userId);
        } catch (error) {
            console.error(error);
        }
    }
}

function registerHandler(connection: FastifyWebSocket, payload: Buffer) {
    const message = payload.toString();
    if (!message.startsWith('register:')) {
        connection.close(1003, 'Invalid message format');
        return;
    }

    const unique_id = message.substring(9);

    activeConnections.set(unique_id, {
        socket: connection,
        lastSeen: Date.now(),
    });

    connection.send('server_waiting');
}

function exitHandler(connection: FastifyWebSocket) {
    for (const [key, value] of activeConnections) {
        if (value.socket === connection) {
            activeConnections.delete(key);
            break;
        }
    }
}

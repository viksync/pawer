import type { WebSocket as FastifyWebSocket } from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import { ConnectionManager } from './connectionManager.js';

const activeConnections = new ConnectionManager();

export function setup(fastifyInstance: FastifyInstance) {
    try {
        fastifyInstance.get(
            '/websocket',
            { websocket: true },
            (connection: FastifyWebSocket) => {
                connection.on('message', (payload: Buffer) =>
                    processMessage(connection, payload),
                );
                connection.on('close', () => cleanupConnection(connection));
                connection.on('error', () => cleanupConnection(connection));
            },
        );
    } catch (err) {
        throw new Error(`Websocket module setup failed: ${err}`);
    }
}

export function notifyApp(uid: string, message: string) {
    const socket = activeConnections.get(uid);

    if (socket) {
        try {
            socket.send(message);
        } catch (err) {
            activeConnections.delete(uid);
            throw err;
        }
    }
}

function processMessage(connection: FastifyWebSocket, payload: Buffer) {
    try {
        const message = payload.toString();

        if (message.startsWith('link_uid:'))
            initiateTelegramLinking(connection, message);

        if (message === 'success') {
            activeConnections.delete(connection);
            connection.close(1000, 'OK');
        }
    } catch (err) {
        console.error('Error processing ws message', err);
    }
}

function initiateTelegramLinking(
    connection: FastifyWebSocket,
    message: string,
) {
    const uid = message.substring(9);
    activeConnections.set(connection, uid);
    try {
        connection.send('server_waiting');
    } catch (err) {
        console.error('Failed to initiate telegram linking', err);
        activeConnections.delete(connection);
    }
}

function cleanupConnection(connection: FastifyWebSocket) {
    activeConnections.delete(connection);
}

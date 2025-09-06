import type { WebSocket as FastifyWebSocket } from '@fastify/websocket';

export class ConnectionManager {
    uidToConnection = new Map<string, FastifyWebSocket>();
    connectionToUid = new Map<FastifyWebSocket, string>();

    set(connection: FastifyWebSocket, uid: string) {
        const existingConnection = this.uidToConnection.get(uid);
        if (existingConnection) {
            this.delete(existingConnection);
        }

        this.uidToConnection.set(uid, connection);
        this.connectionToUid.set(connection, uid);
    }

    get(key: string | FastifyWebSocket): FastifyWebSocket | string | undefined {
        return typeof key === 'string' ?
                this.uidToConnection.get(key)
            :   this.connectionToUid.get(key);
    }

    delete(key: string | FastifyWebSocket): void {
        if (typeof key === 'string') {
            const connection = this.uidToConnection.get(key);
            if (connection) {
                this.connectionToUid.delete(connection);
                this.uidToConnection.delete(key);
            }
        } else {
            const uid = this.connectionToUid.get(key);
            if (uid) {
                this.uidToConnection.delete(uid);
                this.connectionToUid.delete(key);
            }
        }
    }
}

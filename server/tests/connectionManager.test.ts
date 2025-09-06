import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from '../src/connectionManager.js';

interface MockSocket {
    id: string;
}

describe('ConnectionManager', () => {
    let manager: ConnectionManager;
    let mockSocket1: MockSocket;
    let mockSocket2: MockSocket;
    let mockUid1: string;
    let mockUid2: string;

    beforeEach(() => {
        manager = new ConnectionManager();
        mockSocket1 = { id: 'socket1' };
        mockSocket2 = { id: 'socket2' };
        mockUid1 = 'user1';
        mockUid2 = 'user2';
        manager.set(mockSocket1, mockUid1);
    });

    it('should maintain bidirectional mapping', () => {
        expect(manager.get(mockUid1)).toBe(mockSocket1);
        expect(manager.get(mockSocket1)).toBe(mockUid1);
    });

    it('should delete sync by uid', () => {
        const connection = manager.get(mockUid1);
        manager.delete(mockUid1);

        expect(manager.get(mockUid1)).toBe(undefined);
        expect(manager.get(connection)).toBe(undefined);
    });

    it('should delete sync by connection', () => {
        const uid = manager.get(mockSocket1)!;
        manager.delete(mockSocket1);

        expect(manager.get(uid)).toBe(undefined);
        expect(manager.get(mockSocket1)).toBe(undefined);
    });

    it('should handle deleting nonexistent uid', () => {
        manager.delete('nonexistent-user');
        expect(manager.get(mockUid1)).toBe(mockSocket1);
    });

    it('should handle deleting nonexistent connection', () => {
        const fakeSocket = { id: 'fake' };
        manager.delete(fakeSocket);

        expect(manager.get(mockUid1)).toBe(mockSocket1);
    });

    it('should handle multiple connections independently', () => {
        manager.set(mockSocket2, mockUid2);

        manager.delete(mockUid1);

        expect(manager.get(mockUid2)).toBe(mockSocket2);
        expect(manager.get(mockSocket2)).toBe(mockUid2);
    });

    it('should handle overwriting existing uid', () => {
        manager.set(mockSocket2, mockUid1);

        expect(manager.get(mockUid1)).toBe(mockSocket2);
        expect(manager.get(mockSocket2)).toBe(mockUid1);
        expect(manager.get(mockSocket1)).toBe(undefined);
    });

    it('should maintain map synchronization after all operations', () => {
        manager.set(mockSocket2, mockUid2);

        // Delete one by uid, one by connection
        manager.delete(mockUid1);
        manager.delete(mockSocket2);

        expect(manager.get(mockUid1)).toBe(undefined);
        expect(manager.get(mockUid2)).toBe(undefined);
        expect(manager.get(mockSocket1)).toBe(undefined);
        expect(manager.get(mockSocket2)).toBe(undefined);
    });

    it('should handle registering same connection and uid twice', () => {
        manager.set(mockSocket1, mockUid1);
        manager.set(mockSocket1, mockUid1);

        expect(manager.get(mockUid1)).toBe(mockSocket1);
        expect(manager.get(mockSocket1)).toBe(mockUid1);
    });

    it('should handle empty/undefined values', () => {
        expect(manager.get('')).toBe(undefined);
        expect(manager.get(null)).toBe(undefined);
        expect(manager.get(undefined)).toBe(undefined);

        manager.delete('');
        manager.delete(null);

        expect(manager.get(mockUid1)).toBe(mockSocket1);
    });
});

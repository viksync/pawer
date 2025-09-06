import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
    afterEach,
    type MockedFunction,
} from 'vitest';
import { setup } from '../src/notifications.js';
import Fastify, { type FastifyInstance } from 'fastify';

global.fetch = vi.fn();
const mockFetch = global.fetch as MockedFunction<typeof fetch>;

describe('Notifications module', () => {
    let mockFastify: FastifyInstance;
    const mockToken = 'test-token';
    const mockTgApiUrl = `https://api.telegram.org/bot${mockToken}/sendMessage`;

    const validChatId = '123';
    const validMessage = 'test';
    const validPayload = {
        chat_id: validChatId,
        message: validMessage,
    };

    const validInjectRequest = {
        method: 'POST' as const,
        url: '/notify',
        payload: validPayload,
    };

    const mockSuccessResponse = {
        ok: true,
        json: async () => ({ ok: true }),
    } as Response;

    beforeEach(() => {
        mockFastify = Fastify();
        setup(mockFastify, mockToken);
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await mockFastify.close();
    });

    it('should register /notify route', () => {
        const routes = mockFastify.printRoutes();
        expect(routes).toContain('notify (POST)');
    });

    it('should return 200 on successful notification', async () => {
        mockFetch.mockResolvedValue(mockSuccessResponse);

        const response = await mockFastify.inject(validInjectRequest);

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('OK');
    });

    it('should call Telegram API with correct URL', async () => {
        mockFetch.mockResolvedValue(mockSuccessResponse);

        await mockFastify.inject(validInjectRequest);

        expect(mockFetch).toHaveBeenCalledWith(
            mockTgApiUrl,
            expect.any(Object),
        );
    });

    it('should call Telegram API with correct parameters', async () => {
        mockFetch.mockResolvedValue(mockSuccessResponse);

        await mockFastify.inject(validInjectRequest);

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: validChatId,
                    text: validMessage,
                }),
            }),
        );
    });

    // Error scenarios
    it('should return 400 for missing chat_id', async () => {
        const response = await mockFastify.inject({
            method: 'POST',
            url: '/notify',
            payload: {
                message: validMessage,
                // missing chat_id
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid request format');
    });

    it('should return 400 for missing message', async () => {
        const response = await mockFastify.inject({
            method: 'POST',
            url: '/notify',
            payload: {
                chat_id: validChatId,
                // missing message
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid request format');
    });

    it('should return 400 for invalid chat_id type', async () => {
        const response = await mockFastify.inject({
            method: 'POST',
            url: '/notify',
            payload: {
                chat_id: 123, // should be string
                message: validMessage,
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid request format');
    });

    it('should return 400 for invalid message type', async () => {
        const response = await mockFastify.inject({
            method: 'POST',
            url: '/notify',
            payload: {
                chat_id: validChatId,
                message: 123, // should be string
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid request format');
    });

    it('should return 400 for empty payload', async () => {
        const response = await mockFastify.inject({
            method: 'POST',
            url: '/notify',
            payload: {},
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid request format');
    });

    it('should return 502 when Telegram API fails', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 400,
        } as Response);

        const response = await mockFastify.inject(validInjectRequest);

        expect(response.statusCode).toBe(502);
        expect(response.body).toBe('Telegram API error');
    });

    it('should return 500 when fetch throws network error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const response = await mockFastify.inject(validInjectRequest);

        expect(response.statusCode).toBe(500);
        expect(response.body).toBe('Server error');
    });

    it('should return 500 when fetch throws unexpected error', async () => {
        mockFetch.mockRejectedValue(new Error('Unexpected error'));

        const response = await mockFastify.inject(validInjectRequest);

        expect(response.statusCode).toBe(500);
        expect(response.body).toBe('Server error');
    });

    it('should not call Telegram API when validation fails', async () => {
        await mockFastify.inject({
            method: 'POST',
            url: '/notify',
            payload: {
                chat_id: 123, // invalid type
                message: validMessage,
            },
        });

        expect(mockFetch).not.toHaveBeenCalled();
    });
});

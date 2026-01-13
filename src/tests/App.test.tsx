import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';

// Mock the api module
vi.mock('../services/api', () => ({
    api: {
        getMe: vi.fn(),
        removeToken: vi.fn(),
    },
}));

describe('App', () => {
    it('renders login page by default when not authenticated', async () => {
        // Mock getMe to return failure (not authenticated)
        (api.getMe as any).mockResolvedValue({ success: false });

        render(<App />);

        // Check if Login page is rendered
        const titleElement = await screen.findByText(/Sistema de Gestão de Distribuidora de Gás/i);
        expect(titleElement).toBeInTheDocument();
    });
});

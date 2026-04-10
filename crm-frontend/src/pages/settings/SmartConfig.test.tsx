import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SmartConfig from './SmartConfig';

describe('SmartConfig Page', () => {
  test('renders chat interface and settings dashboard', () => {
    render(<SmartConfig />);

    expect(screen.getByRole('heading', { name: /Abon Config/i })).toBeInTheDocument();
    expect(screen.getByText(/Ghost Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Persona/i)).toBeInTheDocument();
  });

  test("updates persona when user asks for 'Professional Dispatcher'", async () => {
    render(<SmartConfig />);

    const input = screen.getByPlaceholderText(
      /Type: Make the AI sound like a professional dispatcher\./i
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, {
      target: { value: 'Make the AI sound like a professional dispatcher.' },
    });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/updated the persona to 'Professional Dispatcher'/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByDisplayValue(/You are a professional dispatcher\./i)
    ).toBeInTheDocument();
  });

  test('updates ghost protocol delay when user types a delay command', async () => {
    render(<SmartConfig />);

    const input = screen.getByPlaceholderText(
      /Type: Make the AI sound like a professional dispatcher\./i
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Set delay to 45 minutes' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Ghost protocol delay set to 45 minutes\./i)
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('spinbutton')).toHaveValue(45);
  });

  test("updates template when user asks for 'quote follow up template'", async () => {
    render(<SmartConfig />);

    const input = screen.getByPlaceholderText(
      /Type: Make the AI sound like a professional dispatcher\./i
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Use quote follow up template' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Template switched to Quote Follow Up\./i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Current: Quote Follow Up/i)).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import type { ChatMessage } from './useChat';

import '@/i18n';

function wrap(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </MemoryRouter>,
  );
}

const userMessage: ChatMessage = {
  rol: 'user',
  texto: 'Mortalidad última semana en CTR-001',
  ts: '2026-05-15T12:00:00Z',
};

const assistantMessage: ChatMessage = {
  rol: 'assistant',
  ts: '2026-05-15T12:00:05Z',
  respuesta: {
    mensaje_id: 'm1',
    respuesta: 'En los últimos 7 días, CTR-001 registró un pico el día 5...',
    blocked: false,
    error: null,
    artefactos: [
      {
        tipo: 'banner',
        version: 1,
        variante: 'info',
        mensaje: 'Banner 1',
      },
      {
        tipo: 'banner',
        version: 1,
        variante: 'info',
        mensaje: 'Banner 2',
      },
    ],
  },
};

describe('MessageBubble · PR 6 (colapsable)', () => {
  it('arranca expandido por defecto y muestra el texto completo', () => {
    wrap(<MessageBubble message={userMessage} />);
    expect(screen.getByText(userMessage.texto)).toBeInTheDocument();
    // El botón existe y dice "Colapsar".
    const btn = screen.getByRole('button', { name: /colapsar/i });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('user message: click colapsa y aria-expanded pasa a false', () => {
    wrap(<MessageBubble message={userMessage} />);
    const btn = screen.getByRole('button', { name: /colapsar/i });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn.getAttribute('aria-label')).toMatch(/expandir/i);
  });

  it('assistant message colapsado oculta artefactos y muestra contador', async () => {
    wrap(<MessageBubble message={assistantMessage} />);
    // Antes de colapsar: ambos banners visibles (esperamos al lazy load).
    expect(await screen.findByText('Banner 1')).toBeInTheDocument();
    expect(await screen.findByText('Banner 2')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /colapsar/i });
    fireEvent.click(btn);

    // Los banners desaparecen.
    expect(screen.queryByText('Banner 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Banner 2')).not.toBeInTheDocument();
    // Aparece contador "+2 artefactos ocultos".
    expect(screen.getByText(/\+2 artefactos ocultos/i)).toBeInTheDocument();
  });

  it('assistant con 1 artefacto usa singular en el contador', () => {
    const m = {
      ...assistantMessage,
      respuesta: {
        ...assistantMessage.respuesta,
        artefactos: [assistantMessage.respuesta.artefactos[0]!],
      },
    };
    wrap(<MessageBubble message={m} />);
    fireEvent.click(screen.getByRole('button', { name: /colapsar/i }));
    expect(screen.getByText(/\+1 artefacto oculto/i)).toBeInTheDocument();
  });

  it('assistant sin artefactos no muestra contador al colapsar', () => {
    const m = {
      ...assistantMessage,
      respuesta: {
        ...assistantMessage.respuesta,
        artefactos: [],
      },
    };
    wrap(<MessageBubble message={m} />);
    fireEvent.click(screen.getByRole('button', { name: /colapsar/i }));
    expect(screen.queryByText(/artefactos? oculto/i)).not.toBeInTheDocument();
  });
});

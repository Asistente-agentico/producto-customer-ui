import { beforeEach, describe, expect, it } from 'vitest';
import { useConversacionesStore } from './conversaciones';

beforeEach(() => {
  localStorage.clear();
  useConversacionesStore.setState({ lastConversacionId: null });
});

describe('useConversacionesStore', () => {
  it('arranca con lastConversacionId null', () => {
    expect(useConversacionesStore.getState().lastConversacionId).toBeNull();
  });

  it('setLast guarda el ID y persiste en localStorage', () => {
    useConversacionesStore.getState().setLast('conv_xyz');
    expect(useConversacionesStore.getState().lastConversacionId).toBe('conv_xyz');
    const stored = localStorage.getItem('customer-ui:conversaciones');
    expect(stored).toContain('conv_xyz');
  });

  it('setLast(null) limpia el ID', () => {
    useConversacionesStore.getState().setLast('conv_xyz');
    useConversacionesStore.getState().setLast(null);
    expect(useConversacionesStore.getState().lastConversacionId).toBeNull();
  });
});

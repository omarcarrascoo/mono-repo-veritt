import { create } from 'zustand';

// ── Toast store cross-platform ────────────────────────────────────────
// Funciona igual en web y native: `Alert.alert` no renderiza en web,
// así que cuando hay un error de API el usuario nunca lo ve. Esto es la
// alternativa.

export type NotifyTone = 'error' | 'success' | 'info' | 'warning';

export interface NotifyToast {
  id: string;
  tone: NotifyTone;
  title: string;
  description?: string;
  /** Duración antes de auto-dismiss. Default 4500ms. 0 = manual. */
  durationMs?: number;
}

interface NotifyState {
  toasts: NotifyToast[];
  push: (toast: Omit<NotifyToast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const useNotifyStore = create<NotifyState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const useNotifyToasts = () => useNotifyStore((s) => s.toasts);
export const useDismissNotify = () => useNotifyStore((s) => s.dismiss);

interface NotifyArgs {
  title: string;
  description?: string;
  durationMs?: number;
}

function makeNotifier(tone: NotifyTone) {
  return (titleOrArgs: string | NotifyArgs, description?: string) => {
    if (typeof titleOrArgs === 'string') {
      return useNotifyStore.getState().push({
        tone,
        title: titleOrArgs,
        description,
      });
    }
    return useNotifyStore.getState().push({ tone, ...titleOrArgs });
  };
}

export const notify = {
  error: makeNotifier('error'),
  success: makeNotifier('success'),
  info: makeNotifier('info'),
  warning: makeNotifier('warning'),
  dismiss: (id: string) => useNotifyStore.getState().dismiss(id),
  clear: () => useNotifyStore.getState().clear(),
};

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Key } from "ink";

export type FocusKeyHandler = (input: string, key: Key) => void;

export interface FocusRegistry {
  register(id: string, handler: FocusKeyHandler): void;
  unregister(id: string): void;
  isFocused(id: string): boolean;
  focusNext(): void;
  focusPrev(): void;
  handleKey(input: string, key: Key): void;
}

const FocusContext = createContext<FocusRegistry | null>(null);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [order, setOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const handlers = useRef<Map<string, FocusKeyHandler>>(new Map());

  const register = useCallback((id: string, handler: FocusKeyHandler) => {
    handlers.current.set(id, handler);
    setOrder((current) => (current.includes(id) ? current : [...current, id]));
    setActiveId((current) => current ?? id);
  }, []);

  const unregister = useCallback((id: string) => {
    handlers.current.delete(id);
    setOrder((current) => current.filter((value) => value !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const focusNext = useCallback(() => {
    setActiveId((current) => {
      if (!order.length) {
        return null;
      }
      if (!current) {
        return order[0];
      }
      const index = order.indexOf(current);
      return order[(index + 1) % order.length] ?? order[0];
    });
  }, [order]);

  const focusPrev = useCallback(() => {
    setActiveId((current) => {
      if (!order.length) {
        return null;
      }
      if (!current) {
        return order[order.length - 1];
      }
      const index = order.indexOf(current);
      return order[(index - 1 + order.length) % order.length] ?? order[0];
    });
  }, [order]);

  const handleKey = useCallback(
    (input: string, key: Key) => {
      if (!activeId) {
        return;
      }
      const handler = handlers.current.get(activeId);
      if (handler) {
        handler(input, key);
      }
    },
    [activeId]
  );

  const registry = useMemo<FocusRegistry>(
    () => ({
      register,
      unregister,
      isFocused: (id) => activeId === id,
      focusNext,
      focusPrev,
      handleKey
    }),
    [register, unregister, activeId, focusNext, focusPrev, handleKey]
  );

  return React.createElement(FocusContext.Provider, { value: registry }, children);
};

export function useFocusRegistry(): FocusRegistry {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("FocusRegistry is not available");
  }
  return context;
}

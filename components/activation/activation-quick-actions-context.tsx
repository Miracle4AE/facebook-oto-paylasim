"use client";

import { createContext, useContext } from "react";

type ActivationQuickActions = {
  openQuickStart: () => void;
};

const ActivationQuickActionsContext = createContext<ActivationQuickActions | null>(null);

export function ActivationQuickActionsProvider({
  children,
  openQuickStart,
}: {
  children: React.ReactNode;
  openQuickStart: () => void;
}) {
  return (
    <ActivationQuickActionsContext.Provider value={{ openQuickStart }}>{children}</ActivationQuickActionsContext.Provider>
  );
}

export function useActivationQuickStart(): ActivationQuickActions | null {
  return useContext(ActivationQuickActionsContext);
}

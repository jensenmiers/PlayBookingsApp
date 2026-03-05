"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

type AgentationComponent = ComponentType<Record<string, never>>;

function isAutomatedBrowserSession(): boolean {
  return typeof navigator !== "undefined" && navigator.webdriver === true;
}

export function AgentationProvider() {
  const [Agentation, setAgentation] = useState<AgentationComponent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || isAutomatedBrowserSession()) {
      return;
    }

    let isMounted = true;

    import("agentation")
      .then((module) => {
        if (isMounted) {
          setAgentation(() => module.Agentation as AgentationComponent);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAgentation(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || isAutomatedBrowserSession() || !Agentation) {
    return null;
  }

  return <Agentation />;
}

import { useEffect, useState } from "react";

export const useMainUIVisible = () => {
  const [visible, setVisible] = useState(logseq.isMainUIVisible);

  useEffect(() => {
    const eventName = "ui:visible:changed";
    const onVisibilityChanged = ({ visible: nextVisible }: { visible: boolean }) =>
      setVisible(nextVisible);

    logseq.on(eventName, onVisibilityChanged);
    return () => {
      logseq.off(eventName, onVisibilityChanged);
    };
  }, []);

  return visible;
};

export const useThemeMode = () => {
  const [mode, setMode] = useState<"dark" | "light">(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    let canceled = false;
    void logseq.App.getUserConfigs().then(({ preferredThemeMode }) => {
      if (!canceled) setMode(preferredThemeMode);
    });
    const unsubscribe = logseq.App.onThemeModeChanged(({ mode: nextMode }) =>
      setMode(nextMode)
    );

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, []);

  return mode;
};

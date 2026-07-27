import { useRef } from "react";
import { Heatmap } from "./heatmap/Heatmap";
import { useMainUIVisible, useThemeMode } from "./hooks/useLogseqUI";

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useMainUIVisible();
  const themeMode = useThemeMode();
  if (!visible) return null;

  return (
    <main
      className={`heatmap-overlay ${themeMode}`}
      onClick={(event) => {
        if (!innerRef.current?.contains(event.target as Node)) {
          logseq.hideMainUI();
        }
      }}
    >
      <Heatmap ref={innerRef} />
    </main>
  );
}

export default App;

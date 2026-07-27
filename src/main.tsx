import "@logseq/libs";

import ReactDOM from "react-dom/client";
import App from "./App";

function main() {
  const node = ReactDOM.createRoot(document.getElementById("app")!);
  node.render(<App />);

  const toggleHeatmap = () => {
    if (logseq.isMainUIVisible) {
      logseq.hideMainUI();
      return;
    }
    logseq.showMainUI({ autoFocus: true });
  };

  logseq.provideModel({
    dbHeatmapToggle: toggleHeatmap,
  });

  logseq.setMainUIInlineStyle({
    zIndex: 11,
    maxWidth: "calc(100% - 10px)",
  });

  logseq.provideStyle(`
    .db-heatmap-toolbar-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 28px;
      width: 28px;
      min-width: 28px;
      height: 28px;
      padding: 0;
      margin: 0;
    }

    .db-heatmap-toolbar-trigger .ti {
      font-size: 20px;
      line-height: 1;
    }
  `);

  logseq.App.registerUIItem("toolbar", {
    key: "db-heatmap-toolbar",
    template: `
      <a class="button db-heatmap-toolbar-trigger" data-on-click="dbHeatmapToggle" title="DB Activity Heatmap">
        <i class="ti ti-chart-grid-dots" aria-hidden="true"></i>
      </a>
    `,
  });

  console.info("DB Activity Heatmap loaded");
}

logseq.ready(main).catch(console.error);

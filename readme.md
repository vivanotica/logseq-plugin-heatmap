# Logseq Heatmap Plugin

This fork keeps the original GitHub/Flomo style UI and renders a heatmap based
on how many bullets were created each day in a Logseq DB graph.

It reads the indexed `:block/created-at` timestamp and counts nodes with a
`:block/parent`, so page nodes themselves are not included.

This fork is read-only and explicitly configured with `"effect": false`.

## How to use?

Firstly, turn on Logseq developer mode

### Option 1: directly install via Marketplace

### Option 2: manually load

- [download the prebuilt package here](https://github.com/vivanotica/logseq-plugin-heatmap/releases)
- unzip the zip file and load from Logseq plugins page

## Demo

![](./heatmap-demo.gif)
![](./daterange-selection.gif)

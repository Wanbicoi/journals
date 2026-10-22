#!/usr/bin/env node
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import React from "react";
import { App } from "./views/App.js";

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });

  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

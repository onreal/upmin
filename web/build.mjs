import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const watch = process.argv.includes("--watch");
const root = resolve(process.cwd());
const entry = resolve(root, "web/src/main.ts");
const outdir = resolve(root, "public/assets");

await mkdir(outdir, { recursive: true });

const styleFiles = [
  "web/src/styles/tokens.css",
  "web/src/styles/base.css",
  "web/src/styles/layout.css",
  "web/src/styles/components.css",
  "web/src/styles/modules.css",
  "web/src/styles/logs.css",
  "web/src/styles/editor.css",
  "web/src/styles/chat.css",
  "web/src/styles/notifications.css",
];

const copyStyles = async () => {
  const cssParts = await Promise.all(
    styleFiles.map(async (file) => readFile(resolve(root, file), "utf8"))
  );
  const css = cssParts.join("\n");
  await writeFile(resolve(outdir, "app.css"), css);
};

const buildOptions = {
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  sourcemap: true,
  outdir,
  entryNames: "app",
  loader: { ".ts": "ts" },
};

if (watch) {
  const ctx = await build({ ...buildOptions, incremental: true });
  await copyStyles();
  console.log("Watching web build...");
  const watcher = await import("node:fs");
  watcher.watch(resolve(root, "web/src"), async () => {
    await ctx.rebuild();
    await copyStyles();
  });
} else {
  await build(buildOptions);
  await copyStyles();
}

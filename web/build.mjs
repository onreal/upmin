import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const watch = process.argv.includes("--watch");
const root = resolve(process.cwd());
const entry = resolve(root, "web/src/main.ts");
const outdir = resolve(root, "public/assets");

await mkdir(outdir, { recursive: true });

const copyStyles = async () => {
  const css = await readFile(resolve(root, "web/src/styles.css"), "utf8");
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

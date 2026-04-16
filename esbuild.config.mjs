import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/plugin.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "com.lsl.claude-runner.sdPlugin/bin/plugin.js",
  sourcemap: watch,
  minify: !watch,
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
});

if (watch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("Build complete.");
}

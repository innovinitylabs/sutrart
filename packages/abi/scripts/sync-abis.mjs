#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "../../..");
const artifactPath = path.join(
  repoRoot,
  "contracts",
  "out",
  "SutrartMarket.sol",
  "SutrartMarket.json"
);
const outputDir = path.resolve(__dirname, "../src/generated");
const outputPath = path.join(outputDir, "sutrartMarketAbi.ts");

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
if (!artifact.abi) {
  throw new Error(`Missing abi field in artifact: ${artifactPath}`);
}

mkdirSync(outputDir, { recursive: true });

const output = `export const sutrartMarketAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
writeFileSync(outputPath, output, "utf8");

console.log(`Updated ABI: ${path.relative(repoRoot, outputPath)}`);

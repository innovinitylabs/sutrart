#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "../../..");
const outputDir = path.resolve(__dirname, "../src/generated");

const contracts = [
  { name: "SutrartMarket", exportName: "sutrartMarketAbi" },
  { name: "MockERC721", exportName: "mockErc721Abi" },
];

mkdirSync(outputDir, { recursive: true });

for (const contract of contracts) {
  const artifactPath = path.join(
    repoRoot,
    "contracts",
    "out",
    `${contract.name}.sol`,
    `${contract.name}.json`
  );

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  if (!artifact.abi) {
    throw new Error(`Missing abi field in artifact: ${artifactPath}`);
  }

  const outputPath = path.join(outputDir, `${contract.exportName}.ts`);
  const output = `export const ${contract.exportName} = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
  writeFileSync(outputPath, output, "utf8");

  console.log(`Updated ABI: ${path.relative(repoRoot, outputPath)}`);
}

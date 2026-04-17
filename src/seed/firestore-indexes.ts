import "server-only";
import fs from "fs";
import path from "path";

export interface FirestoreIndexConfig {
  indexes: unknown[];
  fieldOverrides: unknown[];
}

/**
 * Merges all *.index.json files in a directory into one Firestore config object.
 */
export function mergeFirestoreIndices(
  indexDir: string = process.cwd(),
): FirestoreIndexConfig {
  const mergedConfig: FirestoreIndexConfig = {
    indexes: [],
    fieldOverrides: [],
  };

  const files = fs.readdirSync(indexDir);

  for (const file of files) {
    if (!file.endsWith(".index.json")) {
      continue;
    }

    const filePath = path.join(indexDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const config = JSON.parse(content) as FirestoreIndexConfig;

    mergedConfig.indexes.push(...config.indexes);
    mergedConfig.fieldOverrides.push(...config.fieldOverrides);
  }

  return mergedConfig;
}

/**
 * Generates a merged firestore.indexes.json file from all *.index.json inputs.
 */
export function generateMergedFirestoreIndexFile(
  indexDir: string = process.cwd(),
  outputPath: string = path.join(process.cwd(), "firestore.indexes.json"),
): FirestoreIndexConfig {
  const mergedConfig = mergeFirestoreIndices(indexDir);
  fs.writeFileSync(outputPath, JSON.stringify(mergedConfig, null, 2));
  return mergedConfig;
}

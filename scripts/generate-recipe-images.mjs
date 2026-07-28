import { generateImages } from "./generate-image-library.mjs";
import { getRegenerationTargetIds } from "./image-maintenance-utils.mjs";

const onlyMissing = process.argv.includes("--only-missing");

async function main() {
  const onlyIds = onlyMissing ? await getRegenerationTargetIds("recipes") : [];

  if (onlyMissing) {
    console.log(`Only-missing mode: ${onlyIds.length} recipe images need generation.`);
  }

  const result = await generateImages("recipes", {
    onlyIds,
    useOnlyIds: onlyMissing,
  });
  console.log(`\nGenerated ${result.okCount}/${result.totalCount} recipe images.`);

  if (result.failCount > 0) {
    console.log(`Failed: ${result.results.filter((item) => !item.ok).map((item) => item.id).join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

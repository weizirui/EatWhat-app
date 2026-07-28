import { imageTargets, removeInvalidImages } from "./image-maintenance-utils.mjs";

async function main() {
  const invalidFiles = [
    ...(await removeInvalidImages(imageTargets.ingredients.imageDir)),
    ...(await removeInvalidImages(imageTargets.recipes.imageDir)),
  ];

  if (!invalidFiles.length) {
    console.log("没有发现需要清理的坏图。");
    return;
  }
  for (const item of invalidFiles) {
    console.log(`已删除 ${item.relativePath} (${item.reason})`);
  }
  console.log(`共清理 ${invalidFiles.length} 张坏图。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

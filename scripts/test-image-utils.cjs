const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath, overrides = {}) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require(request) {
      if (Object.prototype.hasOwnProperty.call(overrides, request)) {
        return overrides[request];
      }
      const resolved = path.resolve(
        dirname,
        request.endsWith(".js") ? request : `${request}.js`,
      );
      return loadCommonJsModule(resolved, overrides);
    },
    __dirname: dirname,
    __filename: filePath,
    console,
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const imagePath = path.join(root, "utils/image.js");
const imageConfigSource = fs.readFileSync(path.join(root, "utils/image-config.js"), "utf8");
const imageSource = fs.readFileSync(imagePath, "utf8");

assert.doesNotMatch(imageConfigSource, /wx\.cloud\.getCurrentEnv/);
assert.match(imageConfigSource, /return normalizeBaseUrl\(CLOUD_STORAGE_PREFIX\)/);
assert.match(imageConfigSource, /CLOUD_ENV_ID = "cloud1-d9gyz89t28481efb1"/);
assert.match(imageConfigSource, /cloud:\/\/\$\{CLOUD_ENV_ID\}\.\$\{CLOUD_STORAGE_BUCKET\}/);
assert.match(imageSource, /TEMP_URL_STORAGE_KEY/);
assert.match(imageSource, /loadPersistentTempUrlCache/);
assert.match(imageSource, /savePersistentTempUrlCache/);

const emptyImage = loadCommonJsModule(imagePath, {
  "./image-config": {
    getImageSourceMode() {
      return "none";
    },
    getRemoteImageBaseUrl() {
      return "";
    },
    buildCloudFileId() {
      return "";
    },
  },
});

assert.equal(
  emptyImage.ingredientImage("chicken_breast"),
  "",
);
assert.equal(
  emptyImage.recipeImage("steamed-chicken"),
  "",
);

const remoteImage = loadCommonJsModule(imagePath, {
  "./image-config": {
    getImageSourceMode() {
      return "remote";
    },
    getRemoteImageBaseUrl() {
      return "https://static.example.com/miniprogram-assets";
    },
    buildCloudFileId() {
      throw new Error("cloud path should not be used in remote mode");
    },
  },
});

assert.equal(
  remoteImage.ingredientImage("chicken_breast"),
  "https://static.example.com/miniprogram-assets/food/ingredients/chicken_breast.jpg",
);
assert.equal(
  remoteImage.recipeImage("steamed-chicken"),
  "https://static.example.com/miniprogram-assets/food/recipes/steamed-chicken.jpg",
);

const cloudImage = loadCommonJsModule(imagePath, {
  "./image-config": {
    getImageSourceMode() {
      return "cloud";
    },
    getRemoteImageBaseUrl() {
      return "";
    },
    buildCloudFileId(relativePath) {
      return `cloud://test-env/${relativePath}`;
    },
  },
});

assert.equal(
  cloudImage.ingredientImage("chicken_breast"),
  "cloud://test-env/food/ingredients/chicken_breast.jpg",
);
assert.equal(
  cloudImage.recipeImage("steamed-chicken"),
  "cloud://test-env/food/recipes/steamed-chicken.jpg",
);
assert.equal(
  cloudImage.getLocalImageUrl("cloud://test-env/food/recipes/steamed-chicken.jpg"),
  "/public/food/recipes/steamed-chicken.jpg",
);
const fallbackItem = cloudImage.fallbackImageAfterError({
  image: "https://temp.example.com/steamed-chicken.jpg",
  fallbackImage: "/public/food/recipes/steamed-chicken.jpg",
  hasImage: true,
  imageFailed: false,
});
assert.equal(fallbackItem.image, "/public/food/recipes/steamed-chicken.jpg");
assert.equal(fallbackItem.usingLocalFallback, true);
assert.equal(cloudImage.fallbackImageAfterError(fallbackItem), null);

console.log("image utils tests passed");

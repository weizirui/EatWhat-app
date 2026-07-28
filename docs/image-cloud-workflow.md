# 图片云存储工作流

这个流程只解决当前最小需求：检查缺图、补图、压缩、上传到云存储。

## 0. 一键执行

```bash
npm run run:image-pipeline
```

这个总脚本会按顺序做这些事：

- 识别低清图和已知坏图
- 把缺图和坏图都纳入重生成目标
- 调生成脚本补图
- 全部补齐后再压缩图片
- 输出流程摘要到 `scripts/output/image-pipeline-summary.json`

说明：

- 这是你后面最应该用的入口
- 如果当前环境不能访问外部 AI 出图接口，脚本会在“补图失败”处返回失败结果
- 图片会逐张生成成功后覆盖；生成失败时保留旧文件，不会先清空图片目录
- 当前支持两种 provider：
  - 默认 `openai`，必须设置 `OPENAI_API_KEY`
  - `trae` 仅保留为显式兼容选项，不再自动使用
- 也可以手动指定：

```bash
IMAGE_PROVIDER=openai OPENAI_API_KEY=你的key npm run run:image-pipeline
```

可选模型：

```bash
IMAGE_PROVIDER=openai OPENAI_API_KEY=你的key OPENAI_IMAGE_MODEL=gpt-image-1 npm run run:image-pipeline
```

如果你本机不能直连 OpenAI，也可以走你自己的兼容网关：

```bash
IMAGE_PROVIDER=openai OPENAI_BASE_URL=https://你的网关域名 OPENAI_API_KEY=你的key npm run run:image-pipeline
```

流程摘要里会写明本次使用的 provider 和失败原因。

## 1. 检查缺图

```bash
npm run check:missing-images
```

输出文件：

- `scripts/output/missing-images.json`

这个文件会告诉你：

- 食材图缺哪些
- 菜谱图缺哪些
- 本地是否有多余图片
- 本地是否混入已知坏图

## 1.1 清理坏图

```bash
npm run clean:invalid-images
```

说明：

- 会删除脚本能识别出的已知占位失败图
- 删除后再执行一次 `npm run check:missing-images`，就能看到真实缺图名单

## 2. 生成缺图

按类型分别执行：

```bash
npm run generate:ingredient-images
npm run generate:recipe-images
```

如果只想补当前缺失图片，不全量重跑，用下面这组：

```bash
npm run generate:missing-ingredient-images
npm run generate:missing-recipe-images
```

说明：

- 这两个脚本会把生成结果写入 `public/food/ingredients` 和 `public/food/recipes`
- 当前脚本依赖外部 AI 画图接口，所以要在可联网环境下执行
- `generate:missing-*` 会跳过本地已经存在的图片，更适合你清理坏图之后补缺
- 现在它也会把“已识别坏图”视为需要重生成的目标，不会再把坏图当成正常图跳过
- 如果 provider 不可用，脚本会明确输出配置错误、网络错误或 HTTP 错误

## 3. 压缩图片

```bash
npm run compress:miniprogram-images
```

这个步骤的目标是控制体积，避免真机调试或上传时继续触发体积限制问题。

## 4. 生成云存储上传清单

```bash
npm run build:cloud-image-manifest
```

输出文件：

- `scripts/output/cloud-image-manifest.json`

这个文件会列出：

- 本地图片路径
- 对应云存储路径
- 小程序当前使用的 `cloud://` 文件 ID

## 5. 上传到腾讯云存储

把本地图片上传到你已经建好的目录：

- `food/ingredients`
- `food/recipes`

上传时以 `scripts/output/cloud-image-manifest.json` 为准，保证文件名和云端路径一致。

## 建议执行顺序

```bash
npm run check:missing-images
npm run generate:ingredient-images
npm run generate:recipe-images
npm run compress:miniprogram-images
npm run build:cloud-image-manifest
```

## 后续可扩展

如果你后面要继续提效，建议按这个顺序迭代：

1. 先保留当前清单模式，成本最低，最容易落地
2. 再补一个“只生成缺失图片”的脚本，避免重复生成
3. 最后再接自动上传云存储，需要额外处理账号权限和上传凭证

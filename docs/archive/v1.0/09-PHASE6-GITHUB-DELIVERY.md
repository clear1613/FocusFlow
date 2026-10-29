# Phase 6 — GitHub 交付与持续集成

> FocusFlow V1.0 交付阶段

## 1. 阶段目标

把已经完成的功能包整理成一个可以直接被外部阅读、安装、验证和部署的仓库：

1. 打开首页就能看懂产品做什么、长什么样、用了什么技术。
2. 想深入的人可以继续读架构、数据一致性策略和测试。
3. 另一个人 clone 下来不需要隐藏步骤就能跑起来并复现验证。

## 2. CI

`.github/workflows/ci.yml` 使用单一质量门禁：

```text
install
→ lint
→ test
→ build
→ release-structure verification
```

- 权限只读，同一 ref 的新运行会取消被取代的旧运行。
- Node 版本由 `.nvmrc` 指定，安装使用锁文件 `npm ci`，与本地一致。
- 依赖日期边界的测试以 `TZ=Asia/Singapore` 运行，保证本地自然日断言稳定。
- 只有质量 job 全部通过，main 分支才会上传 `dist` 并部署 GitHub Pages；PR 只跑检查、不部署。

## 3. README

README 按读者关心的顺序组织：

```text
这是什么？
→ 长什么样？
→ 能做什么？
→ 工程上做了哪些关键设计？
→ 代码怎么组织？
→ 怎么运行、验证、部署？
```

中文为首页，`README.en.md` 提供英文版本，`README.zh-CN.md` 保留入口。

## 4. 架构文档

`docs/architecture.md` 用 Mermaid 绘制：系统分层、计时状态机、Session 幂等完成路径、持久化读写路径、由 Session 派生的统计口径。

## 5. 部署

- 正式托管为 GitHub Pages，站点运行在 `/FocusFlow/` 子路径。
- Vite 通过 `DEPLOY_BASE_PATH` 重写资源路径，CI 从仓库名派生该值。
- `vercel.json` 与 `DEPLOYMENT.md` 保留为可选托管方案，不参与 V1.0 发布门禁。

## 6. 发布校验

新增 `scripts/verify-release.mjs`，通过 `npm run verify:release` 执行：

- 必需文件、`package.json` 脚本、锁文件与包版本一致性；
- `.nvmrc` 与 CI 中的 Node 版本、五条门禁命令、Pages 相关配置；
- 被误跟踪的构建产物、环境文件与日志；
- 本地绝对路径与常见凭证特征；
- 文档中全部本地 Markdown 与图片链接可达。

该项检查不依赖框架运行时，可在 CI 与本地以相同方式执行。

## 7. 阶段结论

仓库侧交付物（CI、README、架构文档、验收脚本、部署说明、发布清单）在本阶段全部落地，随后进入真实部署与线上验收，结果记录在 `docs/11-RELEASE.md`。

# FocusFlow 发布记录

当前线上版本 **v1.1.0**，托管在 GitHub Pages，annotated Tag `v1.1.0` 指向发布提交。

| 项 | 内容 |
| --- | --- |
| 线上地址 | <https://clear1613.github.io/FocusFlow/> |
| 托管方式 | GitHub Pages，Actions workflow 构建，HTTPS，站点运行在 `/FocusFlow/` 子路径 |
| 工具链 | Node 24.22.1 / npm 11.21.1，由 `.nvmrc` 与 `packageManager` 固定 |
| 数据位置 | 浏览器 LocalStorage，单根键 `focusflow:data`，无后端依赖 |
| 回滚方式 | 重置 main 到上一个已验证提交并重新部署；用户本地数据不受影响 |

## v1.1.0 — 中文默认界面与语言切换

2026-10-28 发布。首次打开默认中文，右上角可切换 English，选择保存在当前浏览器；运行中的计时、任务与输入草稿不因切换丢失。

存储 schema 由 V1 升到 V2，旧数据迁移时补齐语言字段，不清空任务、Session 或计时状态。设计与实现细节见 [中文默认界面与语言切换](13-LANGUAGE.md)。

| 检查 | 结果 |
| --- | --- |
| `npm run test` | 20 个测试文件，86/86 通过（新增 8 个语言、数据兼容与迁移用例） |
| `npm run lint` / `npm run build` | 0 error、0 warning；TypeScript 与 Vite 构建通过 |
| `npm run verify:release` | 必需文件、锁文件、Node 版本、CI 命令与本地链接全部通过 |
| 线上业务回归 | 11/11 通过，Desktop、375×812、390×844，0 非预期错误 |
| 线上语言验收 | 4/4 通过，1440×1000、375×812、390×844、812×375，0 非预期错误 |

## v1.0.0 — 首发

2026-10-24 发布。任务管理、番茄钟、专注 Session 与统计的第一版。

| 检查 | 结果 |
| --- | --- |
| `npm ci` | 321 packages，审计 322，0 vulnerabilities |
| `npm run lint` | 0 error，0 warning |
| `npm run test` | 19 个测试文件，78/78 通过 |
| `npm run build` | TypeScript 检查通过，962 modules；JS 652.85 kB / gzip 195.91 kB |
| 线上浏览器验收 | 11/11 通过，Desktop、375×812、390×844，0 非预期 Console Error / Page Error |

线上 HTML、JS、CSS、favicon 均返回 200，资源路径为 `/FocusFlow/`。

## 发布门禁与流程

CI 在 main 构建时传入 `DEPLOY_BASE_PATH=/<repository-name>/`，由 Vite 重写资源路径；只有质量 job 全部通过才上传 `dist`，部署 job 依赖 quality，使用 `github-pages` 环境与 Pages/OIDC 权限，PR 不部署。

线上复验：

```bash
python scripts/browser-acceptance.py --production --expected-version 1.1.0 \
  --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/production.json
python scripts/language-acceptance.py --url https://clear1613.github.io/FocusFlow/ \
  --output docs/acceptance/language-production.json --screenshots-dir docs/screenshots/production
```

完整验收矩阵、原始结果与修复记录见 [验收记录](10-ACCEPTANCE.md)，截图说明见 [截图目录](screenshots/README.md)。

Vite 主 chunk 体积提示与 ESLint / esbuild 的安装提示保留为非阻断项，没有通过删测试、关闭规则或降级依赖来消除。

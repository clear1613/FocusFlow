# FocusFlow 发布记录

当前线上版本 **v1.4.0**，托管在 GitHub Pages。

> 本文保留各版本发布时点的验收基线。当前版本的详细结果见 [多窗口保护与加载优化](16-RELIABILITY.md)。历史首页交互改版验证见 [验收记录](10-ACCEPTANCE.md)。

## v1.4.0 — 多窗口保护与加载优化

2026-10-30 上线并完成生产复验。一个窗口负责写入，其他窗口同步查看，关闭写入窗口后自动接管；接管前读取最新状态并恢复过期计时。原有 V2 数据和版本 1 备份保持兼容。

任务、图表、设置和历史按需加载，局部模块失败不影响计时。入口 JavaScript 为 297,092 字节，相对 v1.3.0 的 706,261 字节减少 57.93%，构建执行 300,000 字节预算。

29 个测试文件、162 项测试、lint / 类型 / 构建 / 发布门禁通过。功能提交 `04a7798`，[CI #24](https://github.com/clear1613/FocusFlow/actions/runs/40981510991) 成功；线上所有 JS/CSS 与 favicon 匹配本地构建。

生产多窗口 8 项、历史 4 项、业务 11 项、语言 4 项均覆盖通过，分别含 7 / 2 / 9 / 2 项连接故障后单独重跑；备份完整运行 4/4。真实后台冻结约 181 秒及随后接管通过。原始失败、单项重跑与覆盖汇总分别保存，不记作一次连续通过。详情见[本轮验证](16-RELIABILITY.md#发布与生产验收)。

## v1.3.0 — 专注历史与复盘

2026-10-29 上线，2026-10-30 完成生产复验，详见 [历史设计与验收](15-HISTORY.md)。右上角查看按结束日期分组的专注记录，支持日期、任务、状态筛选，每日汇总、20 条分页与全部筛选结果 CSV 导出。查看历史时计时继续、返回保留输入草稿，存储与备份格式沿用原有版本。

本地门禁：26 个文件、148 项测试通过；历史专项 4/4、业务 11/11、语言 4/4、备份 4/4，无非预期应用错误。查询与 CSV 的 19 项测试另在纽约时区通过，覆盖夏令时日期边界。

功能提交 `35f988e`，CI #21 成功。线上备份完整运行 4/4；历史 4 项、语言 4 项、业务 11 项均覆盖通过，其中分别有 1 / 1 / 5 项初次导航连接中断后单独重跑。完整运行与单项重跑文件分别保留，覆盖汇总不记为一次连续全通过。正式截图已按 v1.3.0 归档。

| 项 | 内容 |
| --- | --- |
| 线上地址 | <https://clear1613.github.io/FocusFlow/> |
| 托管方式 | GitHub Pages，Actions workflow 构建，HTTPS，站点运行在 `/FocusFlow/` 子路径 |
| 工具链 | Node 24.22.1 / npm 11.21.1，由 `.nvmrc` 与 `packageManager` 固定 |
| 数据位置 | 浏览器 LocalStorage，单根键 `focusflow:data`，无后端依赖 |
| 回滚方式 | 用新的 revert 提交撤销问题变更并重新部署，保留 main 历史；用户本地数据不受影响 |

## v1.2.0 — 备份与恢复

2026-10-29 上线并完成生产验收。设置中新增 JSON 导出、文件校验与预览、确认替换。未结束的计时按备份时刻恢复为暂停，保留同一 Session，不把备份后的时间计为专注；写入失败时保留原数据与运行状态。默认中文，支持英文，业务 schema 仍为 V2。

本地门禁：23 个测试文件、123/123 用例，lint / 类型 / 构建 / 发布校验通过；备份专项 4/4、业务 11/11、语言 4/4，0 非预期错误。详细验证见 [备份与恢复](14-BACKUP.md)。

功能提交 `79aae93`，CI #19 成功；生产备份 4/4、语言 4/4，业务 11 项均通过（完整运行 9 项通过，2 项导航连接中断后单独重跑通过）。生产截图与原始运行 / 重跑报告均已归档，未重写既有版本的验收数字。

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
python scripts/browser-acceptance.py --production --expected-version 1.4.0 \
  --url https://clear1613.github.io/FocusFlow/ --output .artifacts/acceptance/production/business.json
python scripts/language-acceptance.py --url https://clear1613.github.io/FocusFlow/ \
  --output .artifacts/acceptance/production/language.json --screenshots-dir .artifacts/screenshots/production/language
```

完整验收矩阵、原始结果与修复记录见 [验收记录](10-ACCEPTANCE.md)，截图说明见 [截图目录](screenshots/README.md)。

v1.0—v1.3 的包体与安装提示保留在历史记录中。v1.4 已拆分动态模块，构建不再出现单个 chunk 超过 500 kB 的提示；未删除测试、关闭规则或降级依赖。

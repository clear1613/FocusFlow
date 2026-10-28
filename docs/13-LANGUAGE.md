# FocusFlow v1.1.0 · 中文默认界面与语言切换

日期：2026-10-28，Asia/Singapore。

## 使用方式

首次打开应用默认使用中文。在右上角语言选择框中选择 **English**，即可切换英文；选择 **中文** 可切回。选择保存在当前浏览器，刷新或重新打开后沿用。

计时、任务、统计、设置、弹窗、页面提示、通知、星期和无障碍标签均随语言切换。任务名称保留用户输入原文。

## 实现

- `AppSettings.locale` 保存 `'zh-CN'` 或 `'en'`，默认中文。
- 仍使用 `focusflow:data`，未新增存储键。存储 schema 升级至 V2，V1 数据经迁移补齐中文，不清空已有任务、Session 或计时状态；V0 可经 V1 连续迁移。
- 不支持的语言值回退中文。未来 schema 在切换语言时仍受写保护。
- 切换只更新语言偏好，不重新挂载应用，不改变 Session ID、截止时间或任务进度。未提交输入和已打开弹窗保持原有状态。
- 翻译由统一词条维护，英文与中文的词条键由 TypeScript 约束。服务事件在触发时读取当前语言。
- 清空所有数据同时恢复默认中文。

## 验证方式

```bash
npm run check
python scripts/language-acceptance.py
python scripts/browser-acceptance.py --output docs/acceptance/business-local.json --screenshots-dir docs/screenshots/local/business --expected-version 1.1.0
```

本地开发服务需先启动。语言验收使用隔离的 Edge 上下文，浏览器语言设置为英文，用来确认应用仍默认中文。任务为示例数据，计时由脚本设定的时间戳推进；真实等待的后台计时用例见 [验收记录](10-ACCEPTANCE.md)。

## 当前验证记录

- 自动化测试：20 个测试文件、86 个用例通过，其中新增 8 个语言、数据兼容和 V1 → V2 迁移用例。
- 业务浏览器回归：11/11 通过，见 [业务回归结果](acceptance/business-local.json)。
- 语言浏览器验收：桌面 1440×1000、手机 375×812 / 390×844、横屏 812×375，共 4/4 通过、0 非预期错误，见 [语言验收](acceptance/language-local.json)。
- 静态检查、TypeScript 检查、构建与发布校验通过。构建保留大于 500 kB 的包体积提示。
- 正式站点：v1.1.0 已部署至 [GitHub Pages](https://clear1613.github.io/FocusFlow/)，质量检查与 Pages 部署均通过。
- 正式站点语言验收：4/4 通过、0 非预期错误，见 [线上语言验收](acceptance/language-production.json)。验证默认中文、双向切换、刷新记忆、运行中 Session 与任务保留、输入草稿、键盘切换和中英文弹窗。
- 正式站点业务回归：11/11 通过、0 非预期错误，见 [线上业务验收](acceptance/business-production.json)。
- 中文首页与英文说明使用 v1.1.0 的线上截图；[截图说明](screenshots/README.md) 区分线上与本地两套。

v1.0.0 的发布信息见 [发布记录](11-RELEASE.md)，完整验收矩阵见 [验收记录](10-ACCEPTANCE.md)。

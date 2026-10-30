# FocusFlow v1.4.0 · 多窗口保护与加载优化

## 使用行为

同一浏览器、同一站点只允许一个 FocusFlow 页面编辑数据和操作计时。后开的页面显示只读视图，同步当前任务、剩余时间、今日统计、语言与主题；不会新增记录、完成 Session 或发出提醒。

关闭或离开正在使用的页面后，等待中的页面自动接管。接管前重新读取并校验最新本地数据，按原截止时间恢复过期计时，再显示编辑界面。任务、Session、统计、V2 数据结构和版本 1 备份格式保持兼容。

刷新写入页时，排队中的另一页面可能先取得权限，刷新后的页面进入只读是预期行为。只读页不主动抢占；多个等待窗口由浏览器依次授予权限。

缺少 Web Locks 或协调请求被拒绝时，保留只读状态，提示使用较新浏览器及 HTTPS / localhost。新版不能阻止旧版脚本写入，升级后需关闭尚未更新的旧页面。

## 实现

- [tabCoordinator](../src/services/tabCoordinator.ts)：独占锁 `focusflow:writer`、排队等待、`storage` 同步、`pagehide` / `pageshow` 生命周期、取消后忽略迟到授权。
- [tabStore](../src/stores/tabStore.ts)：运行态权限，默认禁止写入；持锁后初始化，恢复完成才公布编辑权限。不持久化权限，不增加业务存储键。
- [initializeApp](../src/services/initializeApp.ts)：只读水合不执行过期恢复、迁移落盘或通知；接管执行完整校验、恢复和水合。
- [storageService](../src/services/storageService.ts) 与 [usePomodoroTimer](../src/hooks/usePomodoroTimer.ts)：保存、清空及计时操作均检查权限，旧回调不会继续完成记录。
- [TabApplication](../src/TabApplication.tsx) 与 [TabStandby](../src/components/common/TabStandby.tsx)：编辑与只读界面分别挂载，只读计时仅计算显示值。

## 加载优化

图表、历史、设置和任务区域使用独立动态模块。切换历史仍保持工作台挂载，计时与输入草稿继续保留。周报计算拆到[周统计服务](../src/services/weeklyStatisticsService.ts)，避免首页的今日统计引入周报格式化代码。

[DeferredPanel](../src/components/common/DeferredPanel.tsx) 为加载状态预留空间，并隔离模块加载失败；其他区域和计时继续运行。刷新由用户主动触发，已保存数据按现有流程恢复。

[构建预算检查](../scripts/verify-bundle.mjs) 纳入 `npm run build`，入口 JavaScript 上限 300,000 字节。比较构建产物大小，不把字节下降等同于网络耗时或全页面下载量下降。图表与任务列表在首页仍会异步请求，历史和设置首次使用时才请求。

## 验证与证据

升级前已复现双标签覆盖：A 页新增任务，B 页从旧快照新增另一任务，A 页的数据被覆盖。回归测试覆盖只读加载、持久化入口、过期接管、旧计时回调、初始化公布顺序、取消等待、协调能力缺失和局部加载失败。

浏览器专项使用同一真实浏览器上下文的多个页面，验证共享存储、只读零写入、自动接管、刷新 / 离开 / 返回、重置同步、中英文、375 / 390 / 横屏，以及中断真实构建模块请求后的计时。不同套件隔离上下文，时间推进方式写入报告。真实等待另由独立后台用例验证。

本地 `npm run check`：29 个测试文件、162 项测试通过，lint、类型、构建与发布校验通过。浏览器使用本地 Pages 构建和 `/FocusFlow/` 子路径：

| 范围 | 结果 | 报告 |
| --- | --- | --- |
| 多窗口与加载失败专项 | 8/8，0 非预期错误 | [coordination](acceptance/v1.4/local/coordination.json) |
| 历史与 CSV | 4/4 | [history](acceptance/v1.4/local/history.json) |
| 业务回归 | 11/11 | [business](acceptance/v1.4/local/business.json) |
| 语言 | 4/4 | [language](acceptance/v1.4/local/language.json) |
| 备份 | 4/4 | [backup](acceptance/v1.4/local/backup.json) |
| 真实等待后台计时与接管 | 181.36 秒，剩余 118 秒 / 预期 118 秒，1 Session，0 pageerror | [background](acceptance/v1.4/local/background.json) |
| 入口包体 | 706,261 → 297,092 字节，减少 57.93%，预算通过 | [bundle](acceptance/v1.4/local/bundle.json) |

只读专项核对写入计数为 0，接管后同一 Session 仅完成一次，任务仅计一次。后台用例将写入页真实冻结 180 秒，并保持一个 FocusFlow 只读页打开；恢复后剩余时间按 `endAt` 校准，暂停并关闭原页面后，只读页接管同一暂停 Session。

构建模块请求中断为刻意注入，在 `expected_chunk_errors` 中单列；其他套件均无非预期应用错误。

历史脚本改用固定业务时间并保持 UI 定时调度运行，以覆盖懒加载；未减少筛选、CSV、任务计数与恢复断言。双标签脚本仅偏移只读页的 `Date.now`，避免 Playwright 共享上下文时钟同时推进写入页。

图片见[截图索引](screenshots/README.md)，线上结果已归档于同版本的 `production/`。

## 重跑

```bash
npm run check
npm run preview -- --host 127.0.0.1
python scripts/coordination-acceptance.py --url http://127.0.0.1:4173/FocusFlow/
```

构建和 preview 都需设置 `DEPLOY_BASE_PATH=/FocusFlow/`，完整流程见[部署说明](../DEPLOYMENT.md)。工具沿用独立安装的 Python Playwright 与 Edge，默认输出到 `.artifacts/`；正式证据按版本、环境和验收类型归档。`--case` 可执行具名用例，不改变业务断言。

## 发布与生产验收

2026-10-30 正常推送功能提交 `04a7798`，[CI #24](https://github.com/clear1613/FocusFlow/actions/runs/40981510991) 成功并部署 GitHub Pages。线上入口 `index-DXVcUyfL.js`、全部 7 个 JS/CSS 文件以及 favicon 与本地构建逐字节一致，见[资源核对](acceptance/v1.4/production/assets.json)。

| 范围 | 覆盖结果 | 报告 |
| --- | --- | --- |
| 多窗口与加载失败 | 8 项覆盖；首轮 1 项通过，7 项连接故障后单独重跑通过 | [coordination](acceptance/v1.4/production/coordination.json) |
| 历史与 CSV | 4 项覆盖；首轮 2 项通过，2 项单独重跑通过 | [history](acceptance/v1.4/production/history.json) |
| 业务 | 11 项覆盖；首轮 2 项通过，9 项单独重跑通过 | [business](acceptance/v1.4/production/business.json) |
| 语言 | 4 项覆盖；首轮 2 项通过，2 项单独重跑通过 | [language](acceptance/v1.4/production/language.json) |
| 备份 | 完整运行 4/4 | [backup](acceptance/v1.4/production/backup.json) |
| 真实等待后台与接管 | 181.31 秒，剩余 118 秒 / 预期 118 秒，同一暂停 Session，0 pageerror | [background](acceptance/v1.4/production/background.json) |

四个覆盖汇总的 `source_files` 与每项 `source` 指向 `raw/` 中的原始文件。首轮失败为 `ERR_CONNECTION_CLOSED`、`ERR_NETWORK_CHANGED` 或导航 / 重载超时；降低并发后使用同一脚本的 `--case` 完整重跑，不修改业务断言，不记作一次连续全通过。所有已执行业务覆盖均无非预期应用错误；刻意中断动态模块的预期错误在原始报告中单列。

本轮共归档 31 个生产报告文件（含原始运行、单项重跑、汇总、资源核对和真实等待）及 37 张线上截图。当前首页、手机、横屏、中英文、只读与接管、动态模块失败和备份图片均来自正式 URL 的独立浏览器和示例数据；旧版证据保持原样。未创建或移动版本标签。

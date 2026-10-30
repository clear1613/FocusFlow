# FocusFlow 验收记录

这份记录说明当前版本是怎么验的、验了什么、结果如何，以及验收过程中发现并修掉的问题。脚本、命令和原始结果都在仓库里，可以照着重跑。

- 当前 `1.4.0` 本地与生产验收已完成，新增多窗口保护与加载优化，覆盖 31 项浏览器用例并单列连接重跑，见[可靠性记录](16-RELIABILITY.md)。
- `1.3.0` 本地与生产验收已完成，新增历史与 CSV，结果含完整运行与单项导航重跑记录，见 [历史与复盘](15-HISTORY.md)。
- `1.2.0` 本地与生产复验见 [备份与恢复](14-BACKUP.md)，包含原始运行与连接中断重跑记录。
- `1.1.0` 的语言切换专项验收见 [中文默认界面与语言切换](13-LANGUAGE.md)。
- 首发版本 `1.0.0` 的发布信息见 [发布记录](11-RELEASE.md)。

## 1. 验收环境

| 项 | 内容 |
| --- | --- |
| 系统 | Windows 10.0.26200 |
| 浏览器 | Microsoft Edge 155 / 156，headless，每个用例独立上下文 |
| 工具链 | Node 24.22.1 / npm 11.21.1（与 `.nvmrc`、CI 一致） |
| 时区 | Asia/Singapore，用于固定本地自然日断言 |
| 数据 | 固定的示例任务，时间戳由脚本设定，不使用个人数据 |

浏览器用例用脚本设定的时间戳推进计时，同一套断言在任何机器上都能稳定复现；后台计时另有一条真实等待的用例，不使用时间快进。

## 2. 质量门禁

| 检查 | 当前结果 |
| --- | --- |
| `npm ci` | GitHub Actions #24 安装通过；历史审计数见发布记录 |
| `npm run lint` | 0 error，0 warning |
| `npm run test` | 29 个测试文件，162/162 通过 |
| `npm run build` | TypeScript 检查通过，Vite 构建通过 |
| `npm run verify:release` | 必需文件、锁文件、Node 版本、CI 命令与本地链接全部通过 |

`1.0.0` 首发时为 19 个测试文件、78 个用例；`1.1.0` 新增 8 个语言、数据兼容与 V1 → V2 迁移用例；首页交互改版与空状态连续天数修复后累计 100 个；`1.2.0` 新增 23 个备份用例，累计 123 个；`1.3.0` 新增 25 个历史与 CSV 用例，累计 148 个；`1.4.0` 新增 14 项多窗口、权限和加载失败用例，累计 162 个。

## 3. 浏览器验收

本节保留 v1.0.0 / v1.1.0 的历史验收。v1.2.0 的生产备份 4/4、语言 4/4、业务 11 项覆盖与两项连接中断后的单独重跑，详见 [备份验收](14-BACKUP.md#发布与生产验收)。v1.3.0 结果见 [历史与复盘](15-HISTORY.md)。

| 范围 | 覆盖点 |
| --- | --- |
| Timer | 启动创建一个 running Session；暂停/继续/刷新保持同一 ID；暂停不计时；重复完成最多一次；运行中 Reset 记为 cancelled；Focus Skip 不加番茄数；第 4 轮 Focus 进入长休息并清零周期 |
| 后台计时 | 5 分钟计时，第二标签页并冻结原页面生命周期，真实等待约 181 秒；返回后剩余 120 秒，`endAt` 预期 119 秒，误差在 1 秒内；1 个 Session，0 pageerror |
| 刷新与过期 | Running/Paused 刷新、关闭页面后过期重开、连续多次刷新；只完成一次并进入正确的休息阶段 |
| Task | 创建、编辑、选中、完成、删除；无历史直接删除；有历史需确认且 Session 保留；Completed 区默认折叠、可展开编辑删除、不能设为当前任务 |
| Persistence | 任务/会话/设置/计时/当前任务刷新保留；损坏 JSON 回退；非法状态、负时长、缺字段拒绝；V0→V1→V2 迁移；未来版本写保护与 Reset All Data 解锁 |
| Analytics | 25+50=75 分钟、七天明细、连续天数；`completedAt` 按自然日归属；cancelled/skipped/break 排除；删除任务不改变历史专注时长与周统计 |
| Notification | 已授权时原生通知构造成功，不在启动时请求权限；default→granted、denied 不重复请求、unsupported、请求异常与构造异常均降级，不影响计时与 Toast |
| Theme / Modal | Light / Dark / System 切换与系统主题联动；Esc、遮罩、Tab 循环、关闭后焦点返回、计时刷新时输入焦点稳定 |
| 移动端 | 375×812、390×844；80 字符任务名；计时器、模式切换、任务按钮、图表无横向溢出；弹窗不超屏 |
| 语言（1.1.0） | 默认中文；中英双向切换；刷新后保留选择；运行中的 Session、任务与输入草稿不丢；中英文弹窗；桌面、手机与横屏 4/4 通过 |
| Toast / Console | 专注与休息完成、权限反馈、恢复、迁移、重置均有提示；无非预期未捕获异常与 React 警告 |
| 首页交互（改版复验） | 设置收进右上角弹窗后桌面布局平衡；当前任务并入计时卡且切换需确认；任务行圆形勾选 + `⋯` 菜单；按钮按「模式 + 状态」命名；今日总结与周报结论（含并列最高）；暗色对比度、中英文、375/390 无横向溢出 |

结果：

- 业务用例：开发模式 **11/11**、本地生产构建 **11/11**、线上 Pages **11/11**，均 0 个非预期 Console Error / Page Error；
- 语言用例：本地与线上均 **4/4**，覆盖 1440×1000、375×812、390×844、812×375。
- 首页交互改版后（2026-10-29）：线上业务 **11/11**、线上语言 **4/4**、本地后台计时真实等待通过；另有 71 项扩展检查（无头 Edge）全部通过，Console 0 错误 0 警告；两套截图按新布局整体重拍，现归档于 `docs/screenshots/v1.1/production/` 与 `docs/screenshots/v1.1/local/`。

每次运行另有若干预期 warning，来自刻意注入的损坏 JSON、非法字段、未来版本迁移与写保护、通知构造与权限异常，用于确认降级路径生效。原始输出：

| 场景 | 结果文件 |
| --- | --- |
| 本地开发模式业务回归 | [v1.1/local/business-dev.json](acceptance/v1.1/local/business-dev.json) |
| 本地生产构建业务回归 | [v1.0/local/business-preview.json](acceptance/v1.0/local/business-preview.json) |
| 线上业务回归（1.1.0） | [v1.1/production/business.json](acceptance/v1.1/production/business.json) |
| 线上语言验收（1.1.0） | [v1.1/production/language.json](acceptance/v1.1/production/language.json) |
| 真实等待的后台计时 | [background.json](acceptance/v1.1/local/background.json) |

## 4. 验收中发现并修复的问题

| 问题 | 根因 | 修复与回归 |
| --- | --- | --- |
| 隔天恢复或后台延迟回调把专注记录归到错误日期 | 用回调处理时间作为 `completedAt` | 自然完成以 `endAt` 写入 `endedAt/completedAt`，保留暂停扣除与幂等；Timer Hook 与恢复测试先失败后通过 |
| 浏览器拒绝存储访问时启动抛异常 | `getItem` 位于 try/catch 之外 | 受控 `read_error` 并按默认数据启动；SecurityError 用例覆盖 |
| 小数时长可以让保存被拒绝 | UI 允许小数进入整数 Schema | 按整数时长规则截断并限制范围；25.5 的设置用例先失败后通过 |
| 长任务名把手机页面撑到约 981px | 隐式 Grid 列按最小内容宽度扩张 | 显式单列并允许收缩；80 字符任务名在 375/390 宽度先失败后通过 |
| 午夜之后今日/周统计仍停留在旧日期 | memo 只依赖 Session/Task | 增加本地自然日边界与重新可见时刷新；不持久化派生统计 |
| 遮罩关闭后焦点落回 body | mousedown 默认动作覆盖卸载时的焦点恢复 | 遮罩处理中 `preventDefault`；Esc 与遮罩两条路径均通过，含 Tab 循环 |
| 启动恢复缺少提示 | 初始化放在 React effect 中，受重放影响 | `initializeApp` 在挂载前完成恢复与水合，并给一次反馈；补充恢复、未来版本与过期完成用例 |
| 加入语言切换后旧数据可能丢字段 | V1 存储结构没有 `locale` | schema 升到 V2，V1 数据迁移时补齐中文；不清空任务、Session 与计时状态 |
| 设置移入弹窗后右栏被拉伸出约 300px 空洞 | Grid 默认把今日卡片拉伸到与计时卡等高 | 改为显式网格：计时卡跨两行，右列「今日 + 周趋势」底部对齐，任务清单整行在下；移动端顺序不变 |
| 靠近视口底部的任务行打开 `⋯` 菜单被裁剪 | 菜单固定向下展开 | 打开时测量剩余空间，不足 160px 自动向上弹出 |
| 移动端完成圆圈与菜单按钮触控目标过小 | 视觉尺寸直接用作点击区域 | 40px 命中区包裹 20px 视觉圆，菜单按钮同步放大 |
| 周报并列最高仍断言单一「最专注」日期 | 汇总只保留较早的一天 | 汇总输出 `tiedDayStarts`，并列时用 `Intl.ListFormat` 生成并列文案；补 2 条单测 |
| 空状态下「连续 N 天」整行消失（线上复验发现） | 改版后今日卡片只在有专注时长时渲染连续天数，而连续天数本身特意跨过未开始的自然日 | 空状态同样渲染该行；补 2 条单测（有连续与无连续两种空状态） |
| 复验脚本在重置数据后无法点击页面 | 重置有意保留设置弹窗，脚本仍按「设置是页面卡片」的旧结构编写 | 用例在重置后先关闭弹窗再继续；脚本其余选择器（设置弹窗、行菜单、sr-only 开关、第二个语言下拉）已适配新 DOM |

## 5. 复现方式

```bash
npm ci
npm run check                      # lint + test + build + 发布校验
npm run dev -- --host 127.0.0.1    # 另开一个终端
python scripts/browser-acceptance.py
python scripts/background-acceptance.py
python scripts/language-acceptance.py
```

线上复验：

```bash
python scripts/browser-acceptance.py --production --expected-version 1.4.0 \
  --url https://clear1613.github.io/FocusFlow/ --output .artifacts/acceptance/production/business.json
python scripts/language-acceptance.py --url https://clear1613.github.io/FocusFlow/ \
  --output .artifacts/acceptance/production/language.json --screenshots-dir .artifacts/screenshots/production/language
```

浏览器脚本需要本机安装 Python Playwright 与 Microsoft Edge；它们不进入应用的 npm 依赖。

## 6. 非阻断项

- 历史版本的 Vite 主 chunk 超过 500 kB 提示已在 v1.4 模块拆分后消除，当前入口为 297,092 字节；
- npm 提示 ESLint 版本停止维护、esbuild 安装脚本未配置 allowScripts；
- 依赖审计为 0 只代表当前时点，不等同于永久无漏洞，工具链升级另行安排。

这些提示保留在日志里，没有通过删除测试、关闭规则或降级依赖来消除。

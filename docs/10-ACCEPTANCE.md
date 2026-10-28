# FocusFlow 验收记录

这份记录说明当前版本是怎么验的、验了什么、结果如何，以及验收过程中发现并修掉的问题。脚本、命令和原始结果都在仓库里，可以照着重跑。

- 当前版本 `1.1.0` 的语言切换专项验收见 [中文默认界面与语言切换](13-LANGUAGE.md)。
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
| `npm ci` | 通过，依赖审计 0 vulnerabilities |
| `npm run lint` | 0 error，0 warning |
| `npm run test` | 20 个测试文件，86/86 通过 |
| `npm run build` | TypeScript 检查通过，Vite 构建通过 |
| `npm run verify:release` | 必需文件、锁文件、Node 版本、CI 命令与本地链接全部通过 |

`1.0.0` 首发时为 19 个测试文件、78 个用例；`1.1.0` 新增 8 个语言、数据兼容与 V1 → V2 迁移用例。

## 3. 浏览器验收

| 范围 | 覆盖点 |
| --- | --- |
| Timer | 启动创建一个 running Session；暂停/继续/刷新保持同一 ID；暂停不计时；重复完成最多一次；运行中 Reset 记为 cancelled；Focus Skip 不加番茄数；第 4 轮 Focus 进入长休息并清零周期 |
| 后台计时 | 5 分钟计时，第二标签页并冻结原页面生命周期，真实等待约 181 秒；返回后剩余时间 119 秒，与 `endAt` 计算一致；1 个 Session，0 pageerror |
| 刷新与过期 | Running/Paused 刷新、关闭页面后过期重开、连续多次刷新；只完成一次并进入正确的休息阶段 |
| Task | 创建、编辑、选中、完成、删除；无历史直接删除；有历史需确认且 Session 保留；Completed 区默认折叠、可展开编辑删除、不能设为当前任务 |
| Persistence | 任务/会话/设置/计时/当前任务刷新保留；损坏 JSON 回退；非法状态、负时长、缺字段拒绝；V0→V1→V2 迁移；未来版本写保护与 Reset All Data 解锁 |
| Analytics | 25+50=75 分钟、七天明细、连续天数；`completedAt` 按自然日归属；cancelled/skipped/break 排除；删除任务不改变历史专注时长与周统计 |
| Notification | 已授权时原生通知构造成功，不在启动时请求权限；default→granted、denied 不重复请求、unsupported、请求异常与构造异常均降级，不影响计时与 Toast |
| Theme / Modal | Light / Dark / System 切换与系统主题联动；Esc、遮罩、Tab 循环、关闭后焦点返回、计时刷新时输入焦点稳定 |
| 移动端 | 375×812、390×844；80 字符任务名；计时器、模式切换、任务按钮、图表无横向溢出；弹窗不超屏 |
| 语言（1.1.0） | 默认中文；中英双向切换；刷新后保留选择；运行中的 Session、任务与输入草稿不丢；中英文弹窗；桌面、手机与横屏 4/4 通过 |
| Toast / Console | 专注与休息完成、权限反馈、恢复、迁移、重置均有提示；无非预期未捕获异常与 React 警告 |

结果：

- 业务用例：开发模式 **11/11**、本地生产构建 **11/11**、线上 Pages **11/11**，均 0 个非预期 Console Error / Page Error；
- 语言用例：本地与线上均 **4/4**，覆盖 1440×1000、375×812、390×844、812×375。

每次运行另有若干预期 warning，来自刻意注入的损坏 JSON、非法字段、未来版本迁移与写保护、通知构造与权限异常，用于确认降级路径生效。原始输出：

| 场景 | 结果文件 |
| --- | --- |
| 本地开发模式业务回归 | [local-dev.json](acceptance/local-dev.json) |
| 本地生产构建业务回归 | [local-preview.json](acceptance/local-preview.json) |
| 线上业务回归（1.1.0） | [business-production.json](acceptance/business-production.json) |
| 线上语言验收（1.1.0） | [language-production.json](acceptance/language-production.json) |
| 真实等待的后台计时 | [background.json](acceptance/background.json) |

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
python scripts/browser-acceptance.py --production --expected-version 1.1.0 \
  --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/production.json
python scripts/language-acceptance.py --url https://clear1613.github.io/FocusFlow/ \
  --output docs/acceptance/language-production.json --screenshots-dir docs/screenshots/production
```

浏览器脚本需要本机安装 Python Playwright 与 Microsoft Edge；它们不进入应用的 npm 依赖。

## 6. 非阻断项

- Vite 主 JS chunk 超过 500 kB，暂未做包拆分；
- npm 提示 ESLint 版本停止维护、esbuild 安装脚本未配置 allowScripts；
- 依赖审计为 0 只代表当前时点，不等同于永久无漏洞，工具链升级另行安排。

这些提示保留在日志里，没有通过删除测试、关闭规则或降级依赖来消除。

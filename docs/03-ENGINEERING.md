# FocusFlow 工程规范

> 适用版本：V1.0 / V1.1
> 适用范围：仓库内所有源码、测试与文档

本文件收口 FocusFlow 的开发约定。它不是流程文档，而是写代码和评审代码时可以直接对照的规则清单。

## 1. 目录与分层

```text
src/
├── components/   展示与交互，按 timer / task / statistics / settings / common 划分
├── hooks/        连接 React 生命周期与业务服务
├── stores/       Zustand 状态切片，按领域拆分
├── services/     纯业务逻辑，不 import React
├── types/        按领域拆分的类型定义
├── utils/        无副作用的纯函数
└── constants/    默认值与固定配置
```

约束：

- 组件不直接读写 LocalStorage，也不直接实现业务规则。
- `services/` 必须可在无 DOM 环境下被测试，除注入依赖外不触碰浏览器 API。
- 跨层依赖只允许单向：`components → hooks/stores → services → utils`。
- 出现新的业务域时先加目录与类型，再写实现，不把逻辑堆进 `App.tsx`。

## 2. 命名与类型

- 组件文件 `PascalCase.tsx`，同名测试为 `PascalCase.test.tsx`；服务与工具使用 `camelCase.ts`。
- 类型集中在 `src/types`，禁止在组件内部重复声明数据结构。
- TypeScript strict 保持开启。不使用 `any`；外部数据先用 `unknown` 接住，再逐字段收敛。
- 函数命名用动词开头（`completeSession`、`resolveDeletedTask`），布尔值用 `is/has/can` 前缀。

## 3. 状态与数据流

- 数据流固定为：用户操作 → store action → service → 持久化协调器 → LocalStorage。
- 同一业务事实只保留一个来源。统计不落库，全部由已完成的 Session 现算。
- 派生值不写回 store；需要缓存时以选择器或 memo 实现，并明确失效条件。
- store 切片按领域拆分（timer / task / session / settings），切片之间不互相 import。

## 4. 计时规则

- 运行态剩余时间恒等于 `max(0, ceil((endAt - Date.now()) / 1000))`。
- `setInterval` 只负责触发界面刷新，不承担时间事实；任何"每秒减一"的写法都不允许。
- 暂停时冻结 `remainingSeconds` 并清空 `endAt`；继续时重新计算 `endAt`，不新建 Session。
- 页面重新可见、系统休眠恢复、刷新后启动，都必须先按截止时刻校准，再决定是否进入完成流程。

## 5. Session 规则

- 启动一轮专注立即创建 `running` Session；暂停与继续复用同一个 `activeSessionId`。
- 完成处理必须幂等：定时回调、可见性变化与启动恢复都可能触发，同一 Session 只允许完成一次、关联任务只 +1 一次。
- Reset 记为 `cancelled`，Skip 记为 `skipped`，二者不计入专注统计与长休息周期。
- 删除任务不得删除其 Session 历史；解析历史记录时回退为 `Deleted Task` 标签。

## 6. 持久化规则

- 只使用单一根键 `focusflow:data`，不在调用点散写局部键。
- 读取顺序固定：解析 → 版本识别 → 迁移 → 字段校验 → 计时恢复 → 注入 store → 挂载 React。
- 任何持久化结构变更必须同时提交三件事：`version` 升级、迁移函数、字段校验与对应测试。
- 解析失败回退默认数据并给出一次提示；读到高于当前应用的版本时开启写保护，不允许旧构建覆盖新数据。
- 计时运行期间按业务事件落盘，禁止每秒写入完整快照。

## 7. 测试要求

- 业务规则必须有测试；修复缺陷先写能复现的失败用例，再改实现。
- 覆盖优先级：Session 幂等与任务计数 > 刷新与过期恢复 > 跨自然日统计 > 迁移与字段校验 > 组件交互。
- 不通过 skip、删除断言、放宽 ESLint 规则或关闭 strict 的方式让门禁变绿。
- 涉及浏览器能力的逻辑（Notification、Audio、主题）要有降级用例，能力缺失不能阻断计时主流程。

## 8. 提交与评审

- 一次提交只做一件事，message 采用 `type: 摘要`（`feat` / `fix` / `refactor` / `test` / `docs` / `chore`）。
- 提交前本地跑 `npm run check`（lint + test + build + 发布校验）。
- PR 描述写清改了什么、为什么改、怎么验证；涉及持久化结构时说明迁移方案。
- 文档与实现同步修改，不允许文档描述已删除的行为。

## 9. V1.0 明确不做

后端服务、账号体系、云同步、多语言、PWA 离线安装。以上任一项要进入版本，先作为独立需求评估，不在实现过程中顺手加入。

V1.1 已按 2026-10-28 的明确需求加入中文默认界面与英文切换。语言设置纳入原有 Settings，schema 升级 V2，并提供 V1 → V2 迁移与兼容测试；其余边界保持不变。详见 [语言设计与验收](13-LANGUAGE.md)。

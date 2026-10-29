# Phase 4 — Analytics 数据统计闭环

> FocusFlow V0.5

## 1. 本阶段目标

Phase 4 不增加新的业务事实字段，而是把现有 `Session` / `Task` 事实稳定映射成用户可见统计。

统计主线：

```text
Completed Focus Session
        ↓
Statistics Service
        ↓
Today / Last 7 Days / Current Streak
        ↓
React UI
```

核心原则：

> Statistics 只读取事实，不维护第二套统计真相。

---

## 2. 统一统计事实源

只有以下 Session 才进入专注统计：

```text
type === focus
status === completed
completedAt !== null
```

以下全部排除：

```text
running
cancelled
skipped
short_break
long_break
```

Task 删除不删除 Session，因此删除任务后：

- 历史 Pomodoro 数仍保留；
- 历史 Focus Minutes 仍保留；
- 最近 7 天趋势仍保留；
- Current Streak 仍保留。

这与 Phase 2 的“Task 生命周期不能破坏 Session 历史”保持一致。

---

## 3. 今日统计

`getTodayStats()` 当前返回：

```text
pomodoros
focusMinutes
completedTasks
currentStreak
```

### 今日 Pomodoros

统计当地自然日内完成的 Focus Session 数量。

### 今日 Focus Minutes

使用每条 Session 自己保存的：

```text
actualDurationSeconds
```

求和后转换为分钟。

禁止使用：

```text
今日番茄数 × 当前 Focus Duration
```

因此用户把设置从：

```text
25 min → 50 min
```

不会把过去已经完成的 25 分钟 Session 重新计算为 50 分钟。

### 今日完成任务

仍根据当前 Task 的 `completedAt` 统计当天完成数量。

Task 删除不会影响 Session 派生的 Pomodoro / Focus Minutes / Streak；V1.0 暂不额外创建独立 Task Completion Event。

---

## 4. 跨自然日规则

Session 不按分钟拆分到两个自然日。

例如：

```text
23:45 Start
00:10 Complete
```

这次 25 分钟 Session 全部归属：

```text
completedAt 所在自然日
```

即第二天。

原因：

- PRD 明确以 completed Focus Session 的完成日统计；
- Today、7-day、Streak 统一使用同一时间口径；
- 避免一条 Session 被拆成多个统计事实。

---

## 5. 最近 7 天

`getLast7DaysFocusMinutes()`：

1. 先生成今天及前 6 个当地自然日；
2. 对每一天聚合 completed Focus Session；
3. 无 Session 日期仍返回 `0`；
4. 始终返回 7 个数据点。

例如：

```text
[10, 0, 0, 20, 0, 0, 75]
```

而不是只返回有记录的三天。

Weekly Chart 同时显示：

- 最近 7 天总分钟数；
- 每日柱状图；
- 全部为 0 时的空状态提示。

---

## 6. Current Streak

新增：

```text
getCurrentStreak(sessions, now)
```

一天只要至少有 1 个 completed Focus Session，即视为 Active Day。

一天完成多个 Session：

```text
仍只算 1 个 streak day
```

### 今天宽限规则

如果今天尚未完成 Focus，不立即把昨天已经保持的连续记录显示为 0。

例如：

```text
Mon ✔
Tue ✔
Wed ✔
Thu 今天上午尚未专注
```

Thu 上午显示：

```text
Streak = 3
```

如果 Thu 整天没有完成 Focus，那么 Fri 再打开时：

```text
Streak = 0
```

这样不会因为用户当天还没开始工作就提前“断签”。

---

## 7. 本地时区

Session 事实时间仍保存：

```text
Unix Timestamp(ms)
```

统计时根据浏览器本地时区转换到当地自然日。

不新增持久化的：

```text
YYYY-MM-DD
```

作为第二套事实日期。

---

## 8. UI 收口

Today 区由 3 项扩展为 4 项：

```text
Pomodoros
Focus min
Tasks
Day streak
```

并明确展示：

> Completed Focus Sessions are the statistics source of truth.

Weekly Chart 增加最近 7 天 Focus Minutes 总计。

全部为 0 时仍保留完整图表，并提示：

> 完成第一轮专注后，这里会开始记录你的专注趋势。

---

## 9. 自动化测试设计

新增：

```text
src/services/statisticsService.test.ts
```

共 11 个 Vitest Case，覆盖：

1. Today 只统计当地自然日 completed Focus；
2. 历史 25 / 50 分钟 Session 使用自身 actual duration；
3. Task 删除后 Session 派生统计不丢；
4. 跨午夜 Session 归 completedAt 当天；
5. 最近 7 天固定 7 个数据点并补 0；
6. cancelled / skipped / break 不进入周统计；
7. Streak 包含今天；
8. 今天尚未开始时保留昨天 streak；
9. 完整漏掉一天后 streak 中断；
10. 同一天多个 Session 只算一个 streak day；
11. 非 completed Focus 不进入 streak。

---

## 10. 阶段验证

统计口径不依赖 UI，因此本阶段先对纯服务层做独立验证，不等待完整依赖安装。

完整门禁（`npm ci` → lint → test → build）在依赖就绪后执行，结果见 `docs/10-ACCEPTANCE.md`。

### Statistics strict compile

通过临时 `date-fns` 类型声明，对：

```text
statisticsService.ts
+ FocusFlow types
```

执行 TypeScript strict compile：

```text
PASS
```

### Runtime assertions

将真实 `statisticsService.ts` 转译后，在：

```text
TZ=Asia/Singapore
```

下执行 10 组 Node runtime assertions：

```text
PASS — 10/10
```

覆盖：

- Today count/minutes/tasks；
- 历史时长独立于当前 Settings；
- 跨午夜归属；
- 删除 Task 后统计保留；
- 7-day zero-fill；
- cancelled/skipped/break exclusion；
- Streak today；
- Streak grace day；
- Streak break；
- Same-day de-duplication。

### Syntax scan

项目 TS / TSX / config：

```text
PASS — 52/52
```

---

## 11. Phase 4 完成条件

本阶段已经满足：

```text
[x] Today pomodoros
[x] Today focus minutes
[x] Today completed tasks
[x] 7-day zero-filled chart
[x] Current streak
[x] Local natural-day boundary
[x] Cross-midnight completion attribution
[x] Historical duration independent of current settings
[x] Deleted Task does not break Session analytics
[x] Cancelled / skipped / break exclusion
[x] Analytics tests added
```

Phase 4 代码收口完成。

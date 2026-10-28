# Phase 1 — Timer 正确性闭环验证记录

> FocusFlow V0.2  
> 范围：Timer / Session / 恢复 / 周期切换  
> 不包含：Task Phase 2 完整 CRUD、Migration、Streak、PWA

## 1. 本阶段完成项

- Timestamp-based Timer：运行态剩余时间以 `endAt - Date.now()` 为事实来源。
- Start：新阶段启动时立即创建 `running` Session。
- Pause：冻结 `remainingSeconds`，并清空 `endAt`。
- Resume：沿用原 `activeSessionId`，重新计算 `endAt`，不创建第二个 Session。
- Reset：当前 Session 只允许从 `running -> cancelled`，不计入完成番茄。
- Skip：当前 Session 只允许从 `running -> skipped`，不计入完成番茄和长休息周期。
- Natural Complete：只有 `running` Session 可以进入 `completed`。
- Completion Idempotency：重复 complete 不重复写 Session，也不重复给 Task `+1`。
- Pause Duration：完成 Session 的实际专注时间不包含暂停的墙钟时间。
- Refresh Restore：未过期 Running Timer 按 `endAt` 校准剩余时间。
- Expired Restore：页面关闭期间已到期的 Session 在启动恢复时只完成一次，并进入正确下一阶段。
- Invalid Recovery：非法 Timer 状态恢复到安全 Idle；关联的 running Session 收口为 cancelled，避免孤儿 Session。
- Long Break Cycle：默认第 4 个 completed Focus 进入 Long Break，并将周期计数归零。
- Mode Guard：Running / Paused 期间禁止直接切换 Timer Mode。
- Reset Confirmation：Running / Paused Reset 必须确认。
- Running Task Switch：运行中切换任务需要确认，并同步更新当前 running Session 的 `taskId`。
- Idle Settings Sync：Idle 状态修改当前模式时长后，Timer 立即同步；Running / Paused 当前轮不受影响。

## 2. 当前核心不变量

### INV-01

同一 Timer 最多只有一个 `activeSessionId`。

### INV-02

一个 Session 只有 `running` 才能进入：

- `completed`
- `cancelled`
- `skipped`

进入终态后不能再次转换。

### INV-03

一个 completed Focus 最多让关联 Task 的 `completedPomodoros +1` 一次。

### INV-04

Running Timer 必须具备：

```text
endAt != null
activeSessionId != null
```

### INV-05

Paused Timer：

```text
endAt = null
activeSessionId != null
```

### INV-06

Idle Timer：

```text
endAt = null
activeSessionId = null
startedAt = null
```

## 3. 完成路径

```text
Timer reaches zero
      ↓
active Session exists?
      ↓
Session status == running?
      ↓
completeSessionOnce
      ↓
Focus ? Task +1 : no task update
      ↓
calculate next mode
      ↓
create final Idle timer state
      ↓
persist once
      ↓
Audio / Notification
      ↓
Auto Start (optional)
```

业务数据先提交，再执行音频和通知等非关键副作用。

## 4. Reset / Skip 路径

### Reset

```text
running / paused
      ↓
user confirm
      ↓
Session -> cancelled
      ↓
actualDuration = planned - remaining
      ↓
Timer -> same mode / idle
```

### Skip

```text
running / paused / idle
      ↓
active Session ? Session -> skipped
      ↓
Focus -> Short Break
Break -> Focus
      ↓
long-break cycle 不增加
```

## 5. 刷新恢复

### 未过期

```text
status = running
endAt > now
      ↓
remaining = ceil((endAt - now) / 1000)
      ↓
继续 Running
```

### 已过期

```text
status = running
endAt <= now
      ↓
completeSessionOnce
      ↓
Task +1（Focus only）
      ↓
Short / Long Break
      ↓
Timer = idle
```

### 非法状态

例如：

```text
status = running
endAt = null
```

恢复为安全 Idle，并把仍处于 running 的关联 Session 标记为 cancelled；不虚构 completed Session。

## 6. 自动化测试文件

当前新增/更新：

```text
src/utils/time.test.ts
src/services/sessionService.test.ts
src/services/timerService.test.ts
src/services/timerRecoveryService.test.ts
```

测试覆盖：

- 时间格式与 timestamp remaining；
- Session complete 幂等；
- cancelled / skipped 不可被再次 complete；
- Session termination 幂等；
- Short / Long Break 周期；
- Skip 不增加长休息周期；
- Running / Paused active duration；
- Running Timer 恢复；
- Expired Timer 恢复；
- 第四个 Focus 恢复到 Long Break；
- Paused Timer 恢复；
- 非法 Running 状态安全降级。

当前共编写 **18 个测试 case**。

## 7. 本环境验证状态

已执行：

```text
TypeScript/TSX transpile syntax check
Timer 核心服务 CommonJS 临时转译 + Node assert
```

结果：

```text
PASS — all TS/TSX files syntax transpile
PASS — 10/10 Timer core runtime assertions
```

实际运行断言覆盖：

- Focus 自然完成只给 Task +1 一次；
- cancelled Session 不可被重新完成；
- skipped termination 幂等；
- 第 4 个 Focus 进入 Long Break；
- 普通 Focus 进入 Short Break；
- Pause 墙钟时间不计入 active duration；
- Idle 状态清除 active session；
- 过期 Running Timer 启动恢复只完成一次；
- 第 4 个过期 Focus 恢复到 Long Break；
- 非法 Running 状态把孤儿 active Session 收口为 cancelled。

阶段内先以不依赖安装的方式验证核心逻辑，等依赖就绪后再跑完整门禁：

```bash
npm install
npm run lint
npm test
npm run build
```

完整门禁的执行结果记录在 `docs/10-ACCEPTANCE.md`。

## 8. Phase 1 后剩余边界

Timer 正确性主链已经闭合；下一阶段不再重构 Timer 核心，除非测试暴露真实缺陷。

Phase 2 应重点进入：

```text
Task Edit
Task Delete confirmation with historical Session
Completed Tasks section
Task / Session presentation consistency
```

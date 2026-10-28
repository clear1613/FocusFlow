# Phase 3 — Persistence 数据持久化闭环

> FocusFlow V0.4

## 1. 本阶段目标

Phase 3 不新增业务功能，只收口本地数据的生命周期：

```text
Runtime State
   ↓
Persist
   ↓
LocalStorage
   ↓
Parse
   ↓
Migrate
   ↓
Validate
   ↓
Timer Recovery
   ↓
Hydrate Stores
```

目标是保证：旧数据能升级、坏数据不能进入 Store、新版本数据不会被旧应用误覆盖、用户可以明确清空全部本地数据。

---

## 2. 单根存储

唯一业务存储 Key：

```text
focusflow:data
```

根对象：

```text
version
tasks
sessions
activeTaskId
timer
settings
```

V0.4 不拆多个 LocalStorage Key，避免不同 Store 分别写入造成跨对象不一致。

---

## 3. Migration Pipeline

当前正式 Schema：

```text
STORAGE_VERSION = 1
```

本阶段没有为了“看起来有迁移”而无意义升级到 V2。

新增显式迁移表：

```text
0 → migrateV0ToV1
```

迁移入口：

```text
migratePersistedData(raw)
```

执行规则：

```text
读取 version
 ↓
version > current ? 拒绝降级
 ↓
version < current ? 按 migration map 顺序升级
 ↓
升级完成
 ↓
进入 current schema validation
```

### Legacy V0 → V1

V0 fixture 用来代表早期本地数据可能缺失的字段。

迁移时补齐：

- `timer.plannedDurationSeconds`
- `timer.completedFocusCountInCycle`
- `settings.autoStartFocus`
- `settings.notificationEnabled`
- `settings.theme`

缺省值统一来自当前 defaults，而不是在 migration 中散落 Magic Number。

---

## 4. 字段级 Schema Validation

新增：

```text
storageSchema.ts
```

不再只检查：

```text
tasks 是数组
settings 是对象
```

而是逐字段验证。

### Task

验证：

- `id` 非空
- `title` 1~80 字符
- `estimatedPomodoros` 1~99
- `completedPomodoros >= 0`
- `status` 只能是 `todo / completed`
- `createdAt` 合法
- `completedAt` 与 status 一致
- Task ID 不重复

### Session

验证：

- Session ID 不重复
- `type` 只能是三种 Timer Mode
- `status` 只能是 running / completed / cancelled / skipped
- started / ended / completed 时间合法
- planned / actual duration 非负且有合理上限
- running Session 不能已有 endedAt / completedAt
- completed Session 必须有 endedAt / completedAt
- cancelled / skipped 必须有 endedAt

### Timer

验证：

- mode / status 枚举合法
- remaining / planned duration 数值合法
- timestamp 类型合法
- `activeSessionId` 类型合法
- cycle count 非负整数

Running / Paused / Idle 的跨字段状态不变量仍交给 `timerRecoveryService`，避免因为一次可修复的崩溃状态就把所有历史数据清空。

### Settings

验证 PRD 规定的范围：

```text
Focus             1 ~ 120 min
Short Break       1 ~ 60 min
Long Break        1 ~ 120 min
Long Break Cycle  1 ~ 12
```

并验证所有 Boolean 与 Theme 枚举。

### Root Integrity

额外验证：

```text
activeTaskId
```

必须指向当前存在且仍是 todo 的 Task。

---

## 5. Load Pipeline

最终加载顺序：

```text
localStorage.getItem
 ↓
JSON.parse
 ↓
migratePersistedData
 ↓
validatePersistedAppData
 ↓
recoverPersistedTimer
 ↓
hydrate stores
```

顺序不能交换。

如果先 hydrate 再校验，坏数据已经进入运行态。

---

## 6. 损坏数据恢复

### JSON 损坏

例如：

```text
{bad json
```

处理：

```text
parse_error
→ defaults
→ UI recovery notice
→ 用安全 defaults 覆盖损坏值
```

### Schema 损坏

例如：

```text
focusMinutes = 0
status = unknown
completed Session 没有 completedAt
```

处理：

```text
validation_error
→ defaults
→ UI recovery notice
→ 用安全 defaults 覆盖损坏值
```

---

## 7. 防止旧版本覆盖未来数据

如果读取到：

```text
version > STORAGE_VERSION
```

这不是普通“损坏数据”。

它可能意味着用户的数据已经由更新版本 FocusFlow 写入。

因此不能：

```text
future data
→ defaults
→ save defaults
```

否则会发生降级数据破坏。

现在处理为：

```text
future version
 ↓
migration_error
 ↓
write-protection = true
 ↓
页面用 defaults 安全打开
 ↓
所有 save() 拒绝覆盖原始数据
```

顶部显示明确红色提示。

只有用户主动：

```text
Reset All Data
```

才会：

```text
removeItem
→ 解除 write-protection
→ 恢复 defaults
```

---

## 8. Save Gate

以前：

```text
runtime data
→ JSON.stringify
→ localStorage
```

现在：

```text
runtime data
 ↓
validatePersistedAppData
 ↓
valid ? save : reject
```

这意味着即使未来某个 Store Bug 产生：

```text
remainingSeconds = -1
```

也不会被永久写进浏览器。

---

## 9. Reset All Data

Settings 新增：

```text
Reset all data
```

必须二次确认。

清除：

- Tasks
- Sessions
- Active Task
- Timer 状态
- Settings
- LocalStorage root

执行后：

```text
remove focusflow:data
 ↓
所有 Store hydrate defaults
 ↓
解除 incompatible-version write protection
 ↓
触发 focusflow:storage-reset
 ↓
清除页面 Storage Warning
```

无需刷新页面。

---

## 10. 新增自动化测试

新增：

```text
storageSchema.test.ts
storageMigration.test.ts
storageService.test.ts
resetAppData.test.ts
```

覆盖：

- 当前合法 Schema
- 非法 Task status
- Settings 越界
- Session 生命周期损坏
- Active Task 悬空引用
- V0 → V1 migration
- 无版本 legacy migration
- future version rejection
- invalid JSON fallback
- field corruption fallback
- migrated load result
- invalid runtime save rejection
- future-version write protection
- Reset All Data Store reset

---

## 11. 阶段验证结果

本阶段先针对持久化纯模块做不依赖运行时的验证：

```text
PASS  TypeScript strict compile — Persistence 纯模块
PASS  10/10 Persistence runtime assertions
PASS  Changed TSX syntax scan — 0 syntax-level diagnostics
```

TSX scan 只有依赖尚未安装时的 module resolution 提示，没有语法级错误。完整门禁（`npm ci` → lint → test → build）在依赖就绪后统一执行，结果见 `docs/10-ACCEPTANCE.md`。

---

## 12. Phase 3 完成定义

以下内容全部闭环：

```text
Single Root Storage          ✅
Storage Version              ✅
Migration Pipeline           ✅
Field-level Validation       ✅
Corruption Recovery          ✅
Future-version Protection    ✅
Save Validation Gate         ✅
Reset All Data               ✅
Persistence Tests            ✅（测试文件完成）
```

Phase 3 到此收口。

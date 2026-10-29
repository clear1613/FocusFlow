# Phase 2 — Task 工作流闭环验证记录

> FocusFlow V0.3  
> 范围：Task CRUD / Active Task / 历史 Session 保留 / Completed Tasks  
> 不包含：Focus History 页面、Storage Migration、Streak、PWA

## 1. 本阶段完成项

- Task Edit：支持修改标题和预计番茄数。
- 编辑保护：标题 trim 后最多 80 字符，预计番茄限制 1~99。
- 历史计数保护：编辑不会修改 `completedPomodoros`、状态、创建时间或历史 Session。
- Delete without history：没有任何 Session 的任务可直接删除。
- Delete with history：已有 Session 的任务必须二次确认。
- Session Preservation：删除 Task 只删除 Task 实体，不删除任何历史 Session。
- Deleted Task Label：以后历史记录找不到原 Task 时统一显示 `Deleted Task`。
- Unassigned Label：未关联任务的 Session 统一显示 `Unassigned`。
- Completed Section：已完成任务移入默认折叠的 Completed 区域。
- Completed Task Guard：Completed Task 不允许再次被设为 Active Task。
- Completed Task Maintenance：已完成任务仍可编辑和删除。
- Active Task Delete：删除当前任务时 `activeTaskId` 自动清空；如果存在运行中的历史 Session，Session 保留原 `taskId`。

## 2. Task / Session 数据边界

Task 与 Session 不采用级联删除。

```text
Task
  │
  ├── Session A
  ├── Session B
  └── Session C
```

删除 Task 后：

```text
Task -> removed

Session A.taskId -> original task id
Session B.taskId -> original task id
Session C.taskId -> original task id
```

因此统计事实不会因为用户整理任务列表而丢失。

## 3. 历史展示规则

统一由：

```text
resolveTaskLabel(tasks, taskId)
```

解析：

```text
taskId = null
→ Unassigned

Task 存在
→ 当前 Task title

Task 已删除
→ Deleted Task
```

V1.0 不增加 `taskTitleSnapshot`，遵守 `02-TECH_DESIGN.md` 既定边界。

## 4. 删除确认规则

### 无历史 Session

```text
Delete
  ↓
直接删除 Task
```

### 已有历史 Session

```text
Delete
  ↓
检测 hasTaskHistory
  ↓
Confirm Dialog
  ↓
删除 Task
  ↓
Session 原样保留
```

不使用：

```text
Task delete
→ cascade delete Sessions
```

## 5. Completed Tasks

任务完成后：

```text
status = completed
completedAt = now
activeTaskId = null（如果它原本是 Active Task）
```

主待办列表只展示 `status = todo`。

Completed 区域：

- 默认折叠；
- 显示数量；
- 展开后可查看完成番茄数；
- 可以编辑；
- 可以删除；
- 不能重新选择为 Active Task。

V1.0 不实现 Reopen，避免增加新的状态转换语义。

## 6. 新增测试

### 纯业务测试

`src/services/taskService.test.ts`

覆盖：

- Edit 输入清洗；
- Edit 保留历史计数与状态；
- 检测 Task 是否存在 Session 历史；
- 删除 Task 不影响 Session；
- `Deleted Task` / `Unassigned` 标签解析。

### UI 工作流测试

`src/components/task/TaskList.test.tsx`

覆盖：

- Completed Tasks 默认折叠；
- Edit 修改标题与预计番茄；
- 无历史任务直接删除；
- 有历史任务必须确认；
- 确认删除后 Session 仍保留。

## 7. 阶段验证

已执行：

```text
TypeScript/TSX transpile syntax check
Task Service runtime assertions
```

结果：

```text
PASS — 41/41 TS/TSX files syntax transpile（添加 UI tests 前）
PASS — 5/5 Task core runtime assertions
```

新增 UI 测试文件在收口时一并纳入全量语法检查。

完整门禁在依赖安装完成后执行：

```bash
npm install
npm run lint
npm test
npm run build
```

## 8. Phase 2 后的 Task 不变量

### TASK-INV-01

同一时刻最多一个 Active Task。

### TASK-INV-02

Completed Task 不能成为 Active Task。

### TASK-INV-03

删除 Task 不删除 Session。

### TASK-INV-04

编辑 Task 不修改历史 Session。

### TASK-INV-05

Task 不存在时，历史展示不得崩溃，统一退化为 `Deleted Task`。

### TASK-INV-06

Task 编辑只允许改变：

```text
title
estimatedPomodoros
```

不得借编辑操作改写：

```text
completedPomodoros
status
createdAt
completedAt
```

# Phase 5 — UX 用户体验闭环

> FocusFlow V0.6

## 1. 目标

Phase 5 不修改前四阶段已经确定的业务事实，只收口用户体验与浏览器能力边界：

```text
Notification Permission
+ Toast
+ Theme
+ Dialog / Confirm
+ Accessibility
+ Mobile
```

核心原则：

> Toast 是基础反馈，Desktop Notification 是增强反馈；浏览器能力失败不能阻断 Timer / Session / Persistence。

---

## 2. Notification Permission

通知权限只允许从 Settings 的用户主动操作触发。

状态处理：

```text
default
  ↓ 用户开启
requestPermission()

 granted → notificationEnabled = true
 denied  → notificationEnabled = false + Warning Toast
 unsupported → notificationEnabled = false + Warning Toast
```

如果权限已经是 `denied`，不会再次执行 `requestPermission()`。

如果用户后来从浏览器设置撤销权限，应用启动后会把失效的 `notificationEnabled=true` 自动归一为 false，但不会自动再次请求权限。

---

## 3. Toast

新增全局 Toast Store 和 `ToastViewport`。

用途：

- Focus 完成；
- Break 完成；
- Notification 权限结果；
- Reset All Data 结果。

最多同时保留 4 条，默认约 4.2 秒自动关闭，也支持手动关闭。

Focus/Break 完成时，业务状态先完成并持久化，再依次执行：

```text
Audio
Toast
Desktop Notification (if granted)
```

Notification 或 Audio 失败都不能回滚 Session。

---

## 4. Theme Controller

Settings 支持：

```text
System
Light
Dark
```

Theme 本身仍保存在现有 Settings Schema 中，不新增持久化结构。

`System` 模式监听：

```text
(prefers-color-scheme: dark)
```

系统主题变化后立即更新页面；Theme Controller 使用 layout effect，降低首屏主题闪烁，并兼容 `matchMedia` 新旧监听接口。

显式 Light / Dark 不受系统主题变化影响。

Tailwind 的 `dark:` 改为 `.dark` class 驱动，保证持久化主题可以覆盖系统主题。

---

## 5. Unified Modal

新增统一 `Modal` 基建，`ConfirmDialog` 和 `TaskEditDialog` 复用。

统一能力：

- `role="dialog"`；
- `aria-modal="true"`；
- title / description 关联；
- Escape 关闭；
- 点击遮罩关闭；
- 基础 Tab Focus Trap；
- 打开时把焦点移入 Dialog；
- 关闭后恢复到原触发元素；
- Dialog 打开期间锁定 body scroll；
- Mobile 底部弹层、Desktop 居中；
- `max-height` + scroll，避免小屏内容越界。

特别处理：`onClose` 使用稳定 Ref，避免 Timer 每秒刷新造成 Dialog Effect 重跑和焦点跳动。

---

## 6. Accessibility Pass

新增：

- Skip to main content；
- Timer 剩余时间提供明确 `aria-label`，避免每秒 `aria-live` 造成屏幕阅读器噪音；
- Timer Progress 使用 `role="progressbar"`；
- Timer Mode 使用可访问按钮组和 `aria-pressed` 表达当前模式；
- Current Task 使用 `aria-live`；
- Today / Weekly / Settings 使用明确 section label；
- Recharts 图表作为视觉增强，另提供屏幕阅读器可读的 7 天分钟列表；
- 所有关键 Button / Input / Select 增加 `focus-visible`；
- Task name 不再只依赖 placeholder；
- Completed 折叠区增加 `aria-expanded / aria-controls`；
- Toast 使用 `status / alert`；
- Error Notice 使用 `role="alert"`；
- `prefers-reduced-motion` 用户减少动画。

本阶段没有引入 axe 等额外 Accessibility 依赖，验收范围为“基础可访问性工程收口”，不含 WCAG 自动化认证。

---

## 7. Mobile Pass

主要处理：

- App 外边距在小屏缩小；
- Header 允许 wrap；
- Timer 从 `text-7xl` 调整为 mobile `text-6xl` / desktop `text-8xl`；
- Mode Tabs 缩小移动端 padding / font；
- Button 最小点击高度 44px；
- Task Row 在移动端改为纵向布局；
- Edit / Done / Delete 操作支持 wrap；
- Settings Reset 区域在移动端纵向布局；
- Dialog 在小屏从底部出现并限制 `90dvh`；
- Toast 在 mobile 底部全宽、desktop 右上角。

---

## 8. Phase 5 测试

新增测试源：

```text
src/services/themeService.test.ts
src/services/notificationService.test.ts
src/stores/toastStore.test.ts
src/components/common/Modal.test.tsx
```

覆盖：

- System / Light / Dark 解析；
- Notification unsupported / denied / granted；
- Toast enqueue / remove / max queue；
- Modal Escape；
- Modal 焦点进入和关闭后恢复。

---

## 9. 验收结果

### 业务边界

- Notification 权限不会自动请求；
- Notification 失败不影响 Timer；
- Toast 始终可作为应用内反馈；
- Theme 设置保持在原 Settings Schema；
- Dialog 不改变 Task / Timer 业务语义。

### 当前环境验证

本阶段实际执行：

- `61/61` TS / TSX / config 文件 TypeScript syntax transpile：PASS；
- Theme / Notification 纯模块 TypeScript strict check：PASS；
- Theme / Notification Runtime Assertions：`9/9 PASS`；
- UX 结构静态断言：`13/13 PASS`；
- `package.json` 版本与 Phase 5 Roadmap 完整性：PASS。

完整门禁（`npm ci` → lint → test → build）在依赖就绪后统一执行，结果见 `docs/10-ACCEPTANCE.md`。

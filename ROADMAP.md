# FocusFlow implementation roadmap

## Phase 0 — Scope and skeleton
- [x] Define V1.0 scope and explicit non-goals (no backend, no account, local-first)
- [x] Choose the stack: React 19 + TypeScript + Vite + Zustand + Recharts
- [x] Write the PRD and technical design documents
- [x] Establish the V0.1 directory layout and code skeleton

## Phase 1 — Timer correctness
- [x] Timestamp-based remaining-time calculation
- [x] Basic start / pause / resume / reset
- [x] Session created on start
- [x] Completion idempotency helper
- [x] Restore-and-complete expired running timer on app boot
- [x] Skip flow
- [x] Reset confirmation
- [x] Running-task switch confirmation
- [x] Long-break cycle correctness
- [x] Invalid persisted timer recovery

## Phase 2 — Task workflow
- [x] Create task
- [x] Select active task
- [x] Complete task
- [x] Delete task
- [x] Edit task
- [x] Confirm deletion when historical Session exists
- [x] Keep Session history after Task deletion
- [x] Resolve deleted-task history as `Deleted Task`
- [x] Completed Tasks collapsible section
- [x] Prevent completed tasks from becoming Active Task

## Phase 3 — Persistence
- [x] Single `focusflow:data` root key
- [x] Storage version
- [x] Safe parse + fallback
- [x] Explicit migration pipeline
- [x] Strong field-level schema validation
- [x] Reset all data

## Phase 4 — Analytics
- [x] Today pomodoros
- [x] Today focus minutes
- [x] Today completed tasks
- [x] Last 7 days zero-filled chart
- [x] Current streak
- [x] Local natural-day boundary
- [x] Cross-midnight completion attribution
- [x] Historical duration independent of current settings
- [x] Deleted Task keeps Session-derived analytics
- [x] Cancelled / skipped / break exclusion

## Phase 5 — UX
- [x] Document title countdown
- [x] Audio service
- [x] Notification service
- [x] Permission request from Settings
- [x] Toast system
- [x] Dark-mode controller
- [x] Accessibility pass
- [x] Unified modal / confirm interaction
- [x] Mobile interaction pass

## Phase 6 — GitHub delivery
- [x] CI workflow and release verification
- [x] Complete README with usage, architecture and acceptance
- [x] UI preview asset + production screenshot replacement guide
- [x] Architecture diagrams
- [x] GitHub Pages workflow, repository subpath and deployment guide
- [x] GitHub Pages production deployment and public URL
- [x] Replace README preview with actual Pages production screenshot
- [ ] Optional future Vercel deployment (outside the v1.0.0 gate)
- [x] Final license review
- [x] Local acceptance: clean install, quality gates, desktop/mobile browser checks and real elapsed-time recovery
- [x] Replace README design preview with a real local application screenshot (sample data)

## V1.2 — Backup and restore
- [x] Export all current tasks, Sessions, timer and settings to a versioned JSON file
- [x] Validate and preview an imported file before explicit replacement
- [x] Restore unfinished timers paused without adding elapsed time since backup
- [x] Keep current storage and stores on validation or persistence failure
- [x] Preserve future-schema write protection and browser notification permissions
- [x] Production browser acceptance and release record

## V1.3 — Focus history and review
- [x] End-date grouping of completed, cancelled and skipped focus sessions
- [x] Today / seven / thirty / custom dates, task and status filters
- [x] Daily summaries consistent with existing completed-focus analytics
- [x] Twenty-row pages and CSV export of every filtered record
- [x] Unicode, quoting, timezone, exact seconds and spreadsheet formula-text protection
- [x] Timer continuity, draft retention, bilingual and dark / mobile interfaces
- [x] Unit tests and local history browser acceptance
- [x] Production regression and release evidence

## V1.4 — Multi-window reliability and loading
- [x] Browser-managed exclusive writer and live read-only followers
- [x] Rehydrate and recover latest data before automatic takeover
- [x] Guard storage and stale timer callbacks; fail read-only without coordination
- [x] Lazy task, chart, settings and history panels with local error boundaries
- [x] Entry JavaScript budget checked by every build
- [x] Local browser acceptance; versioned evidence and screenshots
- [x] Push, CI, production browser acceptance and updated live screenshots

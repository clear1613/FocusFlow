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
- [x] Full portfolio README
- [x] UI preview asset + production screenshot replacement guide
- [x] Architecture diagrams
- [x] GitHub Pages workflow, repository subpath and deployment guide
- [x] GitHub Pages production deployment and public URL
- [x] Replace README preview with actual Pages production screenshot
- [ ] Optional future Vercel deployment (outside the v1.0.0 gate)
- [x] Final license review
- [x] Local acceptance: clean install, quality gates, desktop/mobile browser checks and real elapsed-time recovery
- [x] Replace README design preview with a real local application screenshot (sample data)

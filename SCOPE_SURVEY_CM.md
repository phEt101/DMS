# Scope: Survey & CM UI alignment with Projects (PM)

## Purpose
กำหนดขอบเขตสำหรับงานปรับ UX/UI ของฟีเจอร์ `survey` และ `projects-cm` ให้สอดคล้องกับ pattern ของหน้า Projects (เรียกสั้น ๆ ว่า PM) โดยยึด `src/features/projects` เป็น source of truth สำหรับ UI, layout, component patterns และ interaction.

## Goals
- Reuse existing PM components, classes และ interaction patterns สำหรับ list, card, pagination, filter, search และ detail view
- ให้ `survey` และ `projects-cm` ให้พฤติกรรมและรูปลักษณ์เหมือน PM เท่าที่เป็นไปได้ โดยไม่เปลี่ยน business logic

## In scope
- ปรับโครงสร้าง list/card ของ `survey` และ `projects-cm` ให้ใช้ components/patterns จาก `src/features/projects` (เช่น `ProjectMainList`, `ProjectList`, `ProjectFilter`, `PaginationFooter`)
- Wiring: เชื่อมปุ่มเปิด detail (full page หรือ modal ตาม PM pattern) ให้ทำงานเหมือน PM
- เพิ่ม search, filter, pagination, page-size controls โดย reuse `ProjectFilter`/`PaginationFooter` หรือ pattern ที่เทียบเท่า
- ปรับ layout/spacing/classnames ให้ใช้ CSS class ที่มีอยู่ใน PM (เช่น `dms-card-grid`, `dms-project-card`, `dms-title-row`, ฯลฯ)
- Small glue code (adapters) เพื่อแปลง shape ของ mock data/ storage ให้เข้าใช้ UI component ได้โดยไม่เปลี่ยน data model

## Out of scope / Forbidden
- ห้ามเปลี่ยน business logic หรือ data model (storage, mock data)
- ห้ามแก้หรือย้ายไฟล์นอก scope ของ `survey` และ `projects-cm` ยกเว้นเมื่อจำเป็นจริง ๆ และมีเหตุผลชัดเจน
- ห้ามแก้ `src/features/projects` (PM) เพื่อให้มันเปลี่ยนตาม Survey/CM — PM เป็น source of truth
- ห้ามแก้ `SurveyForm` หรือ CM form/modal logic
- ห้ามแก้ `src/App.tsx` หรือ `src/layout/sidebar.tsx` เว้นแต่อย่างยิ่งจำเป็นเพื่อ route/detail (ต้องขออนุมัติก่อน)
- ห้ามเพิ่ม CSS ใหม่ หรือสร้าง design system ใหม่

## Allowed files to edit
- `src/features/projects/survey/*` (pages, components, storage adapters inside this folder)
- `src/features/projects/projects-cm/*` (pages, components, storage adapters inside this folder)
- Small, local adapters under the above folders to map data to PM components

## Acceptance criteria
1. List pages for `survey` and `projects-cm` render using PM patterns (cards or table) and look consistent with PM styles.
2. Search box exists and filters results (same behavior as PM search input).
3. Filter panel exists and uses same UI pattern as PM filter (where possible).
4. Pagination and page-size control exist and use `PaginationFooter` or equivalent.
5. Clicking a list item opens a Detail view using the PM detail pattern (full-page detail or PM's `ProjectDetailView` pattern). If full-page routing is used, it must not require edits to `App.tsx` without approval.
6. No changes to data storage shape or to `SurveyForm`/CM form logic.
7. `npx tsc --noEmit` completes without introducing new type errors in edited files. (Pre-existing unrelated errors in `App.tsx` / `sidebar.tsx` are acknowledged but not addressed here unless approved.)

## Test commands
Run these to validate changes locally:

```bash
# Typecheck
npx tsc --noEmit

# Start dev server
npm run dev
```

## Notes / Process
- ก่อนแก้ ให้ทำการสำรวจไฟล์ reference ใน `src/features/projects` (เช่น `page.tsx`, `components/project-main-list.tsx`, `components/project-list.tsx`, `components/project-filter.tsx`) และอ้างอิง implementation ของพวกมัน แทนการเดา
- ถ้าจำเป็นต้องแก้ไฟล์นอก scope (เช่น route mapping) ให้ยื่นคำขอแยกเป็น PR และอธิบายเหตุผล

---

Created for work on aligning `survey` and `projects-cm` UI to PM patterns.

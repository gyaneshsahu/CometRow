# Current editor checkpoint

Editor Lab is the only page editor. Create a named campaign and choose Customize to open the shared canvas on the campaign /customize route.

Production bundles docs/prototypes/editor-p0/lab-app.ts unchanged and substitutes only campaign-lab-storage.ts. Autosave, revisions, conflicts, permissions and private previews remain. npm run editor:lab runs the same source with local persistence at http://127.0.0.1:3002/editor-lab.

Obsolete editors, compatibility adapters and opt-in/fallback routes have been removed. Startup seeds create no campaigns. Historical migrations and database structures remain intact; application creation supplies the current document explicitly.

This is a cleanup checkpoint only. No professional Phase A UI upgrade has begun. Uploads, publishing, analytics and AI remain later work.

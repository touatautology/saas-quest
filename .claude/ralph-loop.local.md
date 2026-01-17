---
active: true
iteration: 1
max_iterations: 5
completion_promise: "ADMIN_I18N_COMPLETE"
started_at: "2026-01-17T00:00:00Z"
---

## Task: Internationalize admin pages in saas-quest

### Context
- Admin layout navigation is already i18n-ready (using useLocale() from '@/lib/i18n/context')
- Translation keys exist in lib/i18n/locales/{en,ja,es,zh,ko}.ts under 'admin' section
- Pattern to follow: import useLocale, call t('admin.keyName') for text

### Goal
Add i18n support to all admin page components that have hardcoded English text.

### Process for each file
1. Check if file has hardcoded English text
2. If yes:
   - Add 'use client' if not present (required for useLocale hook)
   - Import: import { useLocale } from '@/lib/i18n/context'
   - Add: const { t } = useLocale()
   - Add missing translation keys to ALL 5 locale files (en, ja, es, zh, ko)
   - Replace hardcoded text with t('admin.keyName')
3. Run: pnpm build
4. If build fails, fix errors before continuing

### Target files (in order)
1. app/(admin)/admin/page.tsx (dashboard)
2. app/(admin)/admin/users/page.tsx
3. app/(admin)/admin/quests/page.tsx
4. app/(admin)/admin/documents/page.tsx
5. app/(admin)/admin/rewards/page.tsx
6. app/(admin)/admin/tools/page.tsx
7. app/(admin)/admin/settings/page.tsx
8. app/(admin)/admin/analytics/page.tsx
9. app/(admin)/admin/system/page.tsx

### Translation guidelines
- Japanese: Natural Japanese
- Spanish: Latin American Spanish
- Chinese: Simplified Chinese
- Korean: Standard Korean

### Completion criteria
- All admin pages use t() for UI text
- All 5 locale files have matching keys
- pnpm build succeeds with no errors

Output <promise>ADMIN_I18N_COMPLETE</promise> when all pages are internationalized and build passes.

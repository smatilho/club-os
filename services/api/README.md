# api

Purpose: modular monolith backend for Club OS.

Suggested structure:
- `src/modules/<module-name>/{domain,application,infrastructure,presentation}`
- `src/platform/{auth,audit,db,events}`

## Runtime Environment
- `PORT` (default `4000`)
- `CLUB_OS_DEFAULT_ORG_ID` (default `org-default`)
- `CLUB_OS_AUTO_SEED` (default `true`)

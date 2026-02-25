# Abuse/Report Handling Workflow

## Overview
Community content moderation follows a structured report → triage → resolution workflow with mandatory audit logging for all moderation actions.

## Report Intake
1. Any authenticated member with `community.report` capability can file a report against a post or comment.
2. Reports require a `reasonCode` from the allowed enum: `spam`, `abuse`, `harassment`, `unsafe`, `other`.
3. Optional `details` field for context.
4. Target must exist and belong to the reporter's organization (tenant isolation enforced).
5. Reports are created with status `open`.

## Report Lifecycle

```
open → triaged → resolved
open → triaged → dismissed
open → resolved (direct)
open → dismissed (direct)
```

### Triage
- Only users with `community.moderate` capability can triage.
- Transitions open reports to `triaged` to indicate review has begun.
- Optional step; reports can be resolved/dismissed directly from `open`.

### Resolve
- Moderator marks the report as `resolved` with optional `resolutionNotes`.
- Records `resolvedByUserId` and `resolvedAt` timestamp.
- Typically paired with a moderation action (hide/lock post or comment).

### Dismiss
- Moderator marks the report as `dismissed` with optional `resolutionNotes`.
- Used when the report is not actionable or is invalid.

## Moderation Actions
Available actions for moderators (`community.moderate` capability):

### Posts
- **Hide**: Sets post status to `hidden`. Hidden posts are not visible to members in listings.
- **Unhide**: Restores a hidden post to `visible`.
- **Lock**: Sets post status to `locked`. Locked posts cannot receive new comments.
- **Unlock**: Restores a locked post to `visible`.

### Comments
- **Hide**: Sets comment status to `hidden`.
- **Unhide**: Restores a hidden comment to `visible`.

## Audit Requirements
- Every moderation route passes through `requireCapability("community.moderate", ...)` which:
  - Evaluates the policy engine decision
  - Writes an audit entry with actor, action, resource, and decision
- Tenant mismatch attempts produce `DENY_RESOURCE_TENANT_MISMATCH` audit entries
- All resolution/dismissal actions record `resolvedByUserId` for accountability

## Notification Behavior
- On report creation: in-app receipt notification is created for the reporting member.
- On report resolution/dismissal: in-app notification created for the original reporter informing them of the outcome.
- Notification channel failures do not block the primary moderation action.

## Current Limitations / Deferred Hardening
- **No auto-moderation**: All moderation is manual. Automated content scanning/filtering is deferred.
- **No report deduplication**: Multiple reports against the same target are tracked independently.
- **No appeal workflow**: Members cannot appeal moderation decisions in Phase 4.
- **No moderator fan-out yet**: Moderator notification fan-out to users with `community.moderate` is deferred.
- **No escalation tiers**: All reports are equal priority. Priority/severity classification is deferred.
- **In-memory storage**: All data is in-memory; persistence adapters are deferred to Phase 5.

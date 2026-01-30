# Compound Engineering Scripts

Nightly automation for learning and shipping while you sleep.

## How It Works

### 10:30 PM - Compound Review (cron: `compound-review`)
1. Reviews all sessions from the last 24 hours
2. Extracts patterns, gotchas, and learnings
3. Updates AGENTS.md, MEMORY.md, and relevant files
4. Commits and pushes changes

### 11:00 PM - Auto-Compound (cron: `auto-compound`)
1. Pulls latest (with fresh learnings from review)
2. Reads `tasks/backlog.md`, picks top pending task
3. Spawns a sub-agent to implement it
4. Creates PR or notifies on completion

## Files

- `tasks/backlog.md` - Priority-ordered task list
- `reports/` - Nightly execution reports
- `memory/compound-*.md` - Extracted learnings by date

## Managing the Backlog

Add tasks to `tasks/backlog.md` in priority order. The system picks the first task with `Status: pending` each night.

## Logs

Check session history for compound-review and auto-compound sessions, or ask Jarvis for a status update.

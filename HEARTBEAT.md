# HEARTBEAT.md

## Fact Extraction (Every Heartbeat)

On each heartbeat, check for extractable facts from recent conversations:

1. **Scan** recent messages since last extraction
2. **Extract** durable facts about people, companies, projects:
   - Relationship changes ("met with Sarah", "started working with Acme")
   - Status updates ("project launched", "changed jobs")
   - Milestones ("Emma's birthday", "closed funding round")
   - Preferences learned ("prefers morning meetings")
3. **Write** to appropriate `life/areas/<type>/<entity>/items.json`
4. **Skip**: casual chat, temporary info, small talk

**Track extraction state** in `memory/heartbeat-state.json`:
```json
{
  "lastFactExtraction": "2026-01-29T05:00:00Z",
  "lastChecks": { ... }
}
```

Only extract if >30 minutes since last extraction and there's new conversation content.

## If Nothing Needs Attention
Reply: HEARTBEAT_OK

# SPECS.md - User Decisions (Do Not Override)

Sub-agents: Read this file FIRST before making any changes. These are explicit user decisions that must not be changed without approval.

---

## Events & Calendar

### Event Count Verification
- MANDATORY: After ANY change, verify event count via API
- Expected: ~20 events (varies by season)
- Command: `curl -s https://info.kandedash.com/api/events | jq length`

### VSCO Integration
- NEVER modify pagination logic in `vsco.js` without extensive testing
- VSCO API has 23+ pages, booked events are <10% scattered throughout
- NO early-stopping heuristics — must fetch all pages

---

## General Rules

1. Verify the page loads after ANY change
2. Verify event count after ANY change to event-related code
3. Don't deploy without testing

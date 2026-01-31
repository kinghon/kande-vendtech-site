# Self-Review Log

[2026-01-31 03:00]
TAG: speed
HIT: Compressed 4-phase rollout from 12-24 months to 6 months efficiently. Understood Kurtis's urgency and adjusted all phase targets, timelines, and milestones without needing clarification.
WHY: Listened to intent ("ops manager within 6 months") and restructured all phases proportionally, not just the one he mentioned.

TAG: depth
MISS: Committed node_modules to the clawd workspace repo when pushing photo booths dashboard changes. 965 files changed — should have checked .gitignore or used the separate repo clone from the start.
FIX: Always check git remote before committing in subdirectories inside the clawd workspace. The photo booths dashboard deploys from kinghon/kande-photo-booths-dashboard, not the workspace repo. Use /tmp clone pattern (which I did recover to).

TAG: confidence
HIT: Good call spawning sub-agents for SEO optimization and machine system design — both are heavy tasks that would block the conversation. Kept main session responsive for Kurtis's rapid-fire requests.
WHY: Pattern from earlier session worked well. Heavy research/implementation = sub-agent. Quick edits = inline.

[2026-01-31]
TAG: speed
MISS: showTab bug — used `event.target` in a function called programmatically without an event. Classic JS gotcha. Prospect detail modal was silently crashing every time. Should have caught this when I wrote it.
FIX: Always test UI interactions both from user clicks AND programmatic calls. When writing onclick handlers that also get called from code, never rely on implicit `event` global.

TAG: depth
MISS: Geocoding — didn't append "Las Vegas, NV" to addresses on first import. Three pins ended up in other states. Should have anticipated ambiguous addresses.
FIX: When geocoding user-entered addresses for a known city, ALWAYS append the city/state as context. Don't trust bare street addresses.

TAG: depth
HIT: Inline expand pattern for CRM detail view — Kurtis wanted notes visible without popups. The auto-save with debounce + "Saved" flash indicator was a good UX call.
WHY: Listened to what he actually needed (quick edits, no friction) vs. what I initially built (modal with tabs).

TAG: confidence
HIT: Spawning sub-agents for research tasks worked well — YouTube transcription + Skool scraping ran in parallel while main session stayed responsive.
WHY: Right tool for the job. Heavy research tasks shouldn't block the conversation.

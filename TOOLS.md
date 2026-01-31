# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## Autonomous Actions (Pre-Approved)

Things Kurtis said I can do without asking:
- **Railway**: Auto-deploy is fine (2025-01-30)

## Standing Rules

- **Always add persistent storage** when creating apps with data (Railway volumes, external DB, etc.). Never use ephemeral filesystem for anything that needs to survive deploys. (2025-01-31)
- **Always do heavy processing server-side** — geocoding, data transforms, aggregations, etc. should run on the server and serve pre-computed results. Never make the user's browser do work that the server can do ahead of time. (2025-01-31)
- **VERIFY info.kandedash.com event count after EVERY change** to the photo booths dashboard. Before pushing, run `curl -s https://info.kandedash.com/api/events | node -e "..."` and confirm ~20 events. NEVER touch vsco.js pagination/filtering logic without testing. The VSCO API has booked events scattered across 23+ pages of leads — any early-stopping or pagination change WILL break the event list. (2026-01-31, recurring issue)
- **PRE-PUSH: grep for ALL references before removing any feature.** When deleting a function/feature, run `grep -n "functionName\|relatedVar\|relatedId"` across ALL files in the project BEFORE committing. Dangling calls to removed functions crash the page. This has broken vend.kandedash.com map TWICE (2026-01-31). No exceptions — grep first, push second.

## Projects & Repos

| Project | GitHub Repo | Railway/Hosting | Notes |
|---------|-------------|-----------------|-------|
| Kande Photo Booths Dashboard | `kinghon/kande-photo-booths-dashboard` | info.kandedash.com | Staff dashboard |
| Kande VendTech Site | `kinghon/kande-vendtech-site` | (TBD) | AI vending machines |
| Kande VendTech Dashboard | `kinghon/kande-vendtech-dashboard` | vend.kandedash.com | Ops platform dashboard |

Note: `/Users/kurtishon/clawd/kande-photo-booths/dashboard/` is a local copy — deploy goes to the separate GitHub repo.

## Sub-Agent Rules

When spawning sub-agents to work on any project:
1. **Require them to read `SPECS.md` first** — contains user decisions that must not be changed
2. Pass the SPECS.md path in the task description
3. Any change to something in SPECS.md requires user approval

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

#!/usr/bin/env bash
# AI Office Orchestration CLI
# Usage: ./orchestrate.sh <command> [args]
#
# Commands:
#   start <task_description>   — Create a new run and audit log
#   status <run_id>            — Show current run status
#   update <run_id> <status>   — Update run status
#   subtask <run_id> <json>    — Add/update a subtask result
#   complete <run_id> <output> — Mark run complete with final output
#   list                       — List recent runs
#   fail <run_id> <reason>     — Mark run as failed

set -euo pipefail

MEMORY_DIR="${CLAWD_HOME:-$(dirname "$(dirname "$(realpath "$0")")")/..}/memory/ai-office"
DASHBOARD_API="${DASHBOARD_API:-http://localhost:3000}"

mkdir -p "$MEMORY_DIR"

# Helpers
timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
slugify() { echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-40; }
log() { echo "[$(date +%H:%M:%S)] $*"; }

# === COMMANDS ===

cmd_start() {
  local task="$1"
  local ts=$(timestamp)
  local slug=$(slugify "$task")
  local datestamp=$(date +"%Y-%m-%d-%H%M")
  local logfile="${MEMORY_DIR}/${datestamp}-${slug}.md"

  # Create audit log from template
  cat > "$logfile" <<EOF
# AI Office Run: ${task}
**Started:** ${ts}
**Status:** planning

## Plan
_Awaiting plan from Planner agent..._

## Subtask Results
_No subtasks executed yet._

## Final Output
_Pending..._

## Metrics
- Total time: —
- Subtasks: 0
- Retries: 0
- Agents spawned: 0
EOF

  # Register with dashboard API (best-effort)
  local api_response=""
  api_response=$(curl -s -X POST "${DASHBOARD_API}/api/ai-office/runs" \
    -H "Content-Type: application/json" \
    -d "{\"task\": \"${task}\", \"status\": \"planning\"}" 2>/dev/null) || true

  local run_id=""
  if [ -n "$api_response" ]; then
    run_id=$(echo "$api_response" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  fi

  log "✅ AI Office run started"
  log "   Task: ${task}"
  log "   Log:  ${logfile}"
  [ -n "$run_id" ] && log "   Run ID: ${run_id}"
  echo "${logfile}"
}

cmd_status() {
  local run_id="$1"
  curl -s "${DASHBOARD_API}/api/ai-office/runs" | \
    python3 -c "
import json, sys
runs = json.load(sys.stdin)
for r in runs:
    if str(r['id']) == '${run_id}':
        print(f\"Run #{r['id']}: {r['task']}\")
        print(f\"Status: {r['status']}\")
        print(f\"Created: {r['created_at']}\")
        if r.get('subtasks'):
            print(f\"Subtasks: {len(r['subtasks'])}\")
            for s in r['subtasks']:
                print(f\"  {s['id']}: {s['name']} [{s['role']}] — {s['status']}\")
        sys.exit(0)
print('Run not found')
" 2>/dev/null || echo "Could not reach dashboard API"
}

cmd_update() {
  local run_id="$1"
  local status="$2"

  curl -s -X PUT "${DASHBOARD_API}/api/ai-office/runs/${run_id}" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"${status}\"}" > /dev/null 2>&1

  log "📝 Run #${run_id} status → ${status}"
}

cmd_subtask() {
  local run_id="$1"
  local subtask_json="$2"

  curl -s -X PUT "${DASHBOARD_API}/api/ai-office/runs/${run_id}" \
    -H "Content-Type: application/json" \
    -d "{\"add_subtask\": ${subtask_json}}" > /dev/null 2>&1

  log "📋 Subtask added to run #${run_id}"
}

cmd_complete() {
  local run_id="$1"
  local output="${2:-Task completed successfully}"

  curl -s -X PUT "${DASHBOARD_API}/api/ai-office/runs/${run_id}" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"complete\", \"final_output\": $(echo "$output" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')}" > /dev/null 2>&1

  log "✅ Run #${run_id} completed"
}

cmd_fail() {
  local run_id="$1"
  local reason="${2:-Unknown failure}"

  curl -s -X PUT "${DASHBOARD_API}/api/ai-office/runs/${run_id}" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"failed\", \"final_output\": $(echo "$reason" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')}" > /dev/null 2>&1

  log "❌ Run #${run_id} failed: ${reason}"
}

cmd_list() {
  # List from filesystem
  log "📂 Recent AI Office runs:"
  ls -t "$MEMORY_DIR"/*.md 2>/dev/null | head -10 | while read f; do
    local name=$(basename "$f" .md)
    local status=$(grep "^\*\*Status:\*\*" "$f" 2>/dev/null | head -1 | sed 's/.*\*\*Status:\*\* //')
    echo "  ${name}  [${status:-unknown}]"
  done

  # Also try API
  echo ""
  log "🌐 From dashboard API:"
  curl -s "${DASHBOARD_API}/api/ai-office/runs" 2>/dev/null | \
    python3 -c "
import json, sys
try:
    runs = json.load(sys.stdin)
    for r in runs[:10]:
        st = r.get('subtasks', [])
        print(f\"  #{r['id']}: {r['task']} [{r['status']}] — {len(st)} subtasks\")
    if not runs:
        print('  No runs yet')
except:
    print('  Could not parse API response')
" 2>/dev/null || echo "  Could not reach API"
}

# Update the markdown audit log file directly
cmd_log_update() {
  local logfile="$1"
  local field="$2"
  local value="$3"

  if [ ! -f "$logfile" ]; then
    log "❌ Log file not found: $logfile"
    return 1
  fi

  case "$field" in
    status)
      sed -i '' "s/^\*\*Status:\*\*.*/\*\*Status:\*\* ${value}/" "$logfile"
      ;;
    plan)
      # Replace plan section
      python3 -c "
import sys
content = open('${logfile}').read()
start = content.find('## Plan\n')
end = content.find('\n## ', start + 1)
if start >= 0 and end >= 0:
    new = content[:start] + '## Plan\n\`\`\`json\n${value}\n\`\`\`\n' + content[end:]
    open('${logfile}', 'w').write(new)
"
      ;;
    *)
      log "Unknown field: $field"
      ;;
  esac
}

# === MAIN ===

case "${1:-help}" in
  start)
    [ -z "${2:-}" ] && { echo "Usage: $0 start <task_description>"; exit 1; }
    cmd_start "$2"
    ;;
  status)
    [ -z "${2:-}" ] && { echo "Usage: $0 status <run_id>"; exit 1; }
    cmd_status "$2"
    ;;
  update)
    [ -z "${3:-}" ] && { echo "Usage: $0 update <run_id> <status>"; exit 1; }
    cmd_update "$2" "$3"
    ;;
  subtask)
    [ -z "${3:-}" ] && { echo "Usage: $0 subtask <run_id> <subtask_json>"; exit 1; }
    cmd_subtask "$2" "$3"
    ;;
  complete)
    cmd_complete "${2:?run_id required}" "${3:-}"
    ;;
  fail)
    cmd_fail "${2:?run_id required}" "${3:-}"
    ;;
  list)
    cmd_list
    ;;
  log-update)
    cmd_log_update "${2:?logfile required}" "${3:?field required}" "${4:?value required}"
    ;;
  help|*)
    cat <<EOF
🏢 AI Office Orchestration CLI

Usage: $0 <command> [args]

Commands:
  start <task>              Start a new AI Office run
  status <run_id>           Show run status from API
  update <run_id> <status>  Update run status (planning|executing|reviewing|complete|failed)
  subtask <run_id> <json>   Add a subtask result (JSON)
  complete <run_id> [output] Mark run as complete
  fail <run_id> [reason]    Mark run as failed
  list                      List recent runs
  log-update <file> <field> <value>  Update audit log file directly

Environment:
  DASHBOARD_API  Dashboard API URL (default: http://localhost:3000)
  CLAWD_HOME     Clawd workspace root
EOF
    ;;
esac

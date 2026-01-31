# AI Office Run: {task_name}
**Started:** {timestamp}
**Status:** {status}

## Plan
```json
{plan_json}
```

## Subtask Results

### T1: {subtask_name} [{role}]
**Status:** {approved/rejected}
**Retries:** {count}
**Output Summary:**
{summary}

**Critic Review:**
{review}

---

### T2: {subtask_name} [{role}]
**Status:** {approved/rejected}
**Retries:** {count}
**Output Summary:**
{summary}

**Critic Review:**
{review}

---

## Final Output
{synthesized_result}

## Metrics
- **Total time:** {duration}
- **Subtasks:** {count}
- **Retries:** {total_retry_count}
- **Agents spawned:** {agent_count}
- **Critic rejections:** {rejection_count}
- **Models used:** {model_list}

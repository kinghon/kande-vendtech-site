# AI Office — Multi-Agent Orchestration Framework

Based on "If You Want Coherence, Orchestrate a Team of Rivals" (arXiv:2601.14351).

## When to Use

Invoke the AI Office for **complex, multi-step tasks** that benefit from:
- Multiple perspectives and specialized expertise
- Quality gates and adversarial review
- Parallel execution of independent subtasks
- Audit trails and traceable decisions

**Don't use for:** Simple questions, quick lookups, single-file edits, or anything a single agent handles well.

## Architecture

```
User Task
    ↓
[Coordinator] ← You (main agent)
    ↓
[Planner] → Execution DAG + Acceptance Criteria
    ↓
[Executors] → Parallel specialized agents
    ↓
[Critic] → Review against criteria (VETO POWER)
    ↓ (approved)     ↑ (rejected → retry)
[Synthesizer] → Final polished output
    ↓
User
```

### Core Principles (from the paper)

1. **Errors die in committee** — Critics intercept errors before user exposure
2. **Opposing incentives** — Builders want to ship, Critics want correctness
3. **Veto authority** — Critics can reject outright (not advisory, not voting)
4. **Data isolation** — Raw data stays in execution layer, agents get summaries
5. **Pre-declared criteria** — Success criteria set BEFORE execution, not after
6. **Swiss cheese defense** — Multiple imperfect layers catch what others miss
7. **Cognitive diversity** — Different models/prompts for different roles

## Roles

### Coordinator (Main Agent)
- Receives task from user
- Invokes Planner
- Spawns Executors based on plan
- Routes outputs to Critic
- Handles retries on rejection
- Delivers approved output to user

### Planner
**Prompt template:** `roles/planner.md`
- Decomposes task into subtasks
- Creates execution DAG (what depends on what)
- Sets acceptance criteria per subtask
- Identifies which specialist roles are needed
- Estimates complexity and approach

### Researcher
**Prompt template:** `roles/researcher.md`
- Web research, data gathering, analysis
- Explores options and alternatives
- Cites sources, provides evidence
- Returns structured findings

### Builder
**Prompt template:** `roles/builder.md`
- Writes code, creates files, implements features
- Follows specifications from Planner
- Tests and validates own work before submission
- Git commits with clear messages

### Writer
**Prompt template:** `roles/writer.md`
- Produces written content, strategies, reports
- Follows brand voice and formatting requirements
- Structures information clearly
- Includes actionable recommendations

### Critic
**Prompt template:** `roles/critic.md`
- Reviews outputs against pre-declared acceptance criteria
- **Has VETO power** — can reject and trigger retry
- Checks for: correctness, completeness, quality, coherence
- Provides specific, actionable rejection reasons
- Does NOT produce — only reviews
- Max 3 retries before escalation to user

### Synthesizer
**Prompt template:** `roles/synthesizer.md`
- Combines all approved outputs into cohesive final deliverable
- Resolves any remaining inconsistencies
- Formats for user consumption
- Adds executive summary

## Orchestration Flow

### Step 1: Plan
```
Coordinator → sessions_spawn(Planner, task_description)
Planner returns:
{
  "subtasks": [
    {
      "id": "T1",
      "name": "Research competitors",
      "role": "researcher",
      "depends_on": [],
      "acceptance_criteria": ["List of 5+ competitors", "Pricing data for each", "Feature comparison matrix"],
      "priority": 1
    },
    ...
  ],
  "parallel_groups": [["T1", "T2"], ["T3"]],
  "final_output": "Description of what the user should receive"
}
```

### Step 2: Execute (parallel where possible)
```
For each parallel group:
  Coordinator → sessions_spawn(role, subtask + criteria)
  Wait for all in group to complete
```

### Step 3: Review
```
For each completed subtask:
  Coordinator → sessions_spawn(Critic, output + acceptance_criteria)
  Critic returns: { "approved": true/false, "feedback": "..." }
  If rejected and retries < 3:
    Re-spawn executor with critic feedback
  If rejected 3x:
    Escalate to user with context
```

### Step 4: Synthesize
```
Coordinator → sessions_spawn(Synthesizer, all_approved_outputs + final_output_spec)
Deliver to user
```

## Audit Trail

All AI Office runs are logged to `memory/ai-office/`:
```
memory/ai-office/
├── YYYY-MM-DD-HHmm-{task-slug}.md    # Run log
```

Each log contains:
- Original task
- Plan generated
- Each subtask: executor output, critic review, retry history
- Final synthesized output
- Timing and model info

## Configuration

### Model Selection per Role
- **Planner**: Use thinking/reasoning model (opus or sonnet with extended thinking)
- **Researcher**: Standard model with web access
- **Builder**: Standard model with code execution
- **Writer**: Standard model
- **Critic**: Use a DIFFERENT model than the executor when possible (cognitive diversity)
- **Synthesizer**: Standard model

### Retry Policy
- Max retries per subtask: 3
- On 3rd rejection: escalate to user with full context
- Critic must provide specific, actionable feedback on rejection

### Concurrency
- Independent subtasks run in parallel (sessions_spawn handles this)
- Dependent subtasks wait for prerequisites
- Critic reviews run sequentially (one at a time)

## Quick Start

When the user says something like "use the AI Office" or gives a complex task:

1. Read this SKILL.md
2. Read the role template for Planner (`roles/planner.md`)
3. Spawn Planner with the task
4. Follow the orchestration flow above
5. Log everything to audit trail
6. Deliver final result

## Example Invocations

- "Use the AI Office to build a marketing strategy for Kande VendTech"
- "AI Office: research and build a competitive analysis"
- "Orchestrate a team to redesign the dashboard"
- "Use the full team on this project"

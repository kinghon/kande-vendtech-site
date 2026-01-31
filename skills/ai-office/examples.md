# AI Office — Example Orchestrations

## Example 1: "Build a marketing strategy for Kande VendTech"

### Planner Output:
```json
{
  "task_summary": "Comprehensive marketing strategy for AI vending machine company targeting Las Vegas properties",
  "approach": "Research competitors and market, analyze target segments, develop strategy with channels and messaging, create implementation plan",
  "subtasks": [
    {
      "id": "T1",
      "name": "Competitive landscape research",
      "role": "researcher",
      "description": "Research vending companies in Las Vegas market — who they are, what they offer, pricing, positioning, online presence",
      "depends_on": [],
      "acceptance_criteria": [
        "5+ competitors identified with company names and websites",
        "Pricing comparison where available",
        "Their marketing channels (SEO, social, direct sales)",
        "Gaps or weaknesses we can exploit"
      ],
      "tools_needed": ["web_search", "web_fetch"],
      "priority": 1
    },
    {
      "id": "T2",
      "name": "Target segment analysis",
      "role": "researcher",
      "description": "Analyze best target property types for AI vending — apartment complexes, medical offices, warehouses. What messaging resonates with each",
      "depends_on": [],
      "acceptance_criteria": [
        "3+ target segments with profile",
        "Decision maker persona for each",
        "Key pain points per segment",
        "What drives their vending decisions"
      ],
      "tools_needed": ["web_search"],
      "priority": 1
    },
    {
      "id": "T3",
      "name": "Marketing strategy document",
      "role": "writer",
      "description": "Using research from T1 and T2, create a comprehensive marketing strategy covering positioning, channels, messaging, and budget",
      "depends_on": ["T1", "T2"],
      "acceptance_criteria": [
        "Clear positioning statement",
        "3+ marketing channels with specific tactics",
        "Messaging framework per target segment",
        "90-day implementation timeline",
        "Estimated budget per channel"
      ],
      "tools_needed": [],
      "priority": 2
    },
    {
      "id": "T4",
      "name": "SEO and content plan",
      "role": "writer",
      "description": "Create an SEO strategy and content calendar for Kande VendTech website and blog",
      "depends_on": ["T1"],
      "acceptance_criteria": [
        "10+ target keywords with search volume estimates",
        "Content calendar for first 3 months",
        "On-page SEO recommendations",
        "Local SEO tactics for Las Vegas market"
      ],
      "tools_needed": ["web_search"],
      "priority": 2
    }
  ],
  "parallel_groups": [["T1", "T2"], ["T3", "T4"]],
  "final_output": "Complete marketing strategy document with competitive analysis, target segments, channel strategy, messaging framework, SEO plan, and 90-day implementation roadmap",
  "estimated_complexity": "high",
  "risks": ["Competitor pricing may not be publicly available", "Search volume data requires paid tools"]
}
```

### Flow:
1. T1 (Researcher) and T2 (Researcher) run in parallel
2. Both outputs → Critic review
3. If approved, T3 (Writer) and T4 (Writer) run in parallel using T1/T2 outputs
4. Both outputs → Critic review
5. All approved outputs → Synthesizer
6. Final strategy delivered to user

## Example 2: "Redesign the dashboard homepage"

### Planner might output:
- T1: Researcher — analyze best dashboard UIs and current page issues
- T2: Builder — implement new design based on research
- T3: Critic reviews build
- T4: Builder — mobile optimization pass
- Synthesizer combines changelog + screenshots

## When NOT to Use AI Office

- "What's the weather?" → Just check weather
- "Fix this CSS bug" → Just fix it
- "Add a button to the CRM" → Just add it
- "Remind me at 3pm" → Just set a reminder

The overhead of planning + reviewing is only worth it for tasks that take 30+ minutes and benefit from multiple perspectives.

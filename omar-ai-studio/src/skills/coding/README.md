# Coding Agent Skills

These skill definitions guide the Coding Agent's behavior for different task types.

Each skill file defines triggers, rules, output format, and safety notes.

## Available Skills

| Skill | File | Use When |
|-------|------|----------|
| Architecture Review | architecture.skill.json | Inspecting and evaluating codebase structure |
| Bug Detection | debugging.skill.json | Finding and fixing errors |
| Code Refactoring | refactor.skill.json | Improving code quality without changing behavior |
| Integration Planning | integration.skill.json | Connecting to external APIs and services |

## Future Skills (Roadmap)

- `testing.skill.json` — Writing unit and integration tests
- `performance.skill.json` — Profiling and optimizing performance
- `security.skill.json` — Security audit and hardening
- `documentation.skill.json` — Auto-generating docs from code
- `migration.skill.json` — Database and API migration planning

## Adding a New Skill

1. Create `<skill-name>.skill.json` in this folder
2. Define `skillName`, `description`, `triggers`, `rules`, `outputFormat`, `safetyNotes`
3. The Coding Agent will automatically match requests to skills via trigger keywords
4. Skills are read-only constraints — they guide behavior, not replace it

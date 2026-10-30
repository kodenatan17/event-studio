# Codex agentic workflows

Use these routes with the native roles in `.codex/agents/`. The main agent coordinates and integrates. A named role can be passed to the runtime's delegation tool when custom roles are available. If the runtime offers only general subagents, include the relevant role instructions in the task. If no delegation is available, execute the applicable steps directly and report that fact; never invent agent results.

## Execution contract

1. Determine the user's requested outcome, whether edits are authorized, and the relevant worktree/spec/decision context. Select a route below. A small task may be completed directly.
2. For substantial tasks, delegate useful specialist steps. Each assignment includes the request, mode, relevant FR/T/E2E or spec sections, owned paths, prior findings, skills to read, expected output, and verification responsibilities. Do not make specialists rediscover supplied evidence.
3. Run dependent steps in order. Parallel work must be independent and have disjoint write ownership. Coordinate tests/builds sharing outputs or ports. Respect the runtime's concurrency limit; the local config caps open subagents at three. Release completed agents using the runtime's supported mechanism.
4. Check actual changes and results. On an implementation review failure, send concrete required fixes to the responsible writer and review again, at most two rounds before reassessing. Review/security/analyze requests without a fix request stay read-only. Continue unaffected work when one part needs user input.
5. Finish authorized phases without routine approval gates. Update task evidence when applicable. Final response states changes or findings, actual checks, and unresolved limitations. Do not claim a specialist ran when its work was done directly.

## Routes

| Skill / route | Specialist flow |
| --- | --- |
| `$event-feature` | scout(find/analyze) → coder(implement) → reviewer; add architect before implementation for new contracts/modules, and qa for changed behavior. |
| `$event-bugfix` | scout(diagnose) → coder(fix) → relevant regression verification → reviewer. If the cause is external, continue available local diagnosis; do not mutate an external system without authorization. |
| `$event-refactor` | scout(find/analyze) → coder(refactor) → existing regression checks → reviewer. Phase large changes and serialize shared-file edits. |
| `$event-review` | reviewer only. Findings are the deliverable; do not launch a fix loop unless the user requests fixes. |
| `$event-security` | reviewer(security), loading wedding-security-boundaries. Findings only unless fixes were requested; then coder(fix) → relevant verification → reviewer. |
| `$event-performance` | scout(analyze cost and baseline) → coder(performance) → verification/measurement → reviewer. For diagnosis-only requests, stop after findings. Use next-bundle-optimizer for client bundles, world-engine and matching Three.js skills for 3D. Compare against architecture.md §12 without inventing measurements. |
| `$event-document` | documenter(docs/progress). Change only affected docs and verify references; no code behavior changes. |
| `$event-comment` | documenter(comment). Explain non-obvious decisions; keep the diff comment-only. |
| `$event-devops` | devops → relevant local verification → reviewer. Remote operations require an authorized target; local preparation should continue without unnecessary pauses. |
| `$event-analyze` | scout(analyze); add architect(design) for requested architecture options. Read-only output with evidence and explicit uncertainties. |
| `$event-solutioning` | architect(spec/design); documenter(spec) only when documentation edits are requested. Documentation-only tasks can go directly to documenter. Preserve section IDs and log actual spec discrepancies; no app implementation without a request. |

## Skill selection

Use `spec-first` for behavior changes, `wedding-web-architecture` for app/API/data changes, `wedding-security-boundaries` for sensitive boundaries, and `world-engine` plus the matching `threejs-*` skills for 3D. Read only relevant references. Follow the current WebGL/no-Drei MVP decision even when general skills contain WebGPU examples.

For local joglo asset work, inspect the build/optimization scripts and scene config under `assets/source/joglo-interior/`, runtime node mappings, and D-023/D-025. A generated validation report alone does not establish runtime compatibility, real-device performance, or art sign-off.

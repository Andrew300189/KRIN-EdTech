# Educational core — remediation phase 01

## Scope

This phase implements the findings from the architecture audit without replacing
working authentication, billing, CMS workflow, or public URLs.

1. Make `LanguageLevel` and `CurriculumNode` the runtime source of truth for
   the public CEFR tree. The former TypeScript catalogue becomes an import-only
   legacy source until the data migration has been verified in every environment.
2. Keep all course and lesson editing on the existing CMS workflow and improve
   block authoring rather than introducing a second editor or content table.
3. Complete the first learning-feedback loop: specialised exercise controls,
   actionable error feedback, server-side solution purchases, and safe extra
   practice selection.

## Safety rules

- No destructive migration or deletion of existing curriculum rows.
- Every curriculum import is an idempotent upsert scoped by CEFR level.
- Existing public course URLs keep their behaviour; only reserved CEFR routes
  change their data source.
- Coins, answer checking, access, and rewards remain server-authoritative.
- The static catalogue must not be used as a runtime fallback after rollout.

## Completion checks

- Invalid level/section/topic URLs return `notFound()`.
- A level never displays a node from another level.
- CMS updates are revisioned and pass the existing lifecycle integrity checks.
- The selected exercise renderer always submits a structured answer validated
  server-side.
- Opening a solution deducts coins once, in a database transaction.
- Extra practice is selected from the same lesson/topic context and cannot
  return the just-completed exercise.

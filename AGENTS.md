# ArtworkApp — Agent Coding Guidelines

These instructions are mandatory for AI coding agents working in this repository.

## TypeScript style

- Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).
- Use strict, meaningful types; avoid `any` unless justified and documented.
- Prefer `const`, descriptive names, organized imports, and readable code.
- Respect framework-required patterns where they conflict with general style rules; document exceptions.

## Maximum three parameters

- No function, method, or constructor may declare more than **three parameters**.
- For four or more related inputs, use one typed parameter object (`interface` or `type`), or a class when runtime validation or behavior is required.
- Do not create unnecessary parameter objects for smaller signatures.

## Consistent abstraction

- Keep each function at a consistent level of abstraction.
- Separate orchestration, domain rules, and low-level infrastructure details.
- Extract meaningful lower-level operations into clearly named helpers, without creating trivial wrappers.

## No duplicate functionality

- Search the codebase for existing implementations before adding new behavior.
- Reuse or extract shared functionality when it represents the same responsibility.
- Do not unify unrelated code merely because it looks similar.

## Mandatory test-driven development

For every new or changed production behavior, use **Red → Green → Refactor**:

1. **Red:** Write a focused test before production code; execute it and confirm failure for the expected reason.
2. **Green:** Implement the minimum code needed; execute the test and confirm it passes.
3. **Refactor:** Improve naming, abstraction, duplication, and Google TypeScript style; rerun tests.

- Repeat for each meaningful behavior increment, including functions, methods, classes, and components.
- Test observable behavior and contracts rather than private implementation details.
- Never claim tests passed unless actually run. Report any inability to execute them.

## Agent workflow

1. Read this file and the relevant feature specification.
2. Inspect existing architecture, APIs, components, and tests.
3. Identify the smallest testable behavior increment.
4. Follow Red → Green → Refactor, recording the test outcome.
5. Run relevant tests, lint, and type checks; report outcomes and limitations.
6. Avoid unrelated changes.

## Definition of done

- [ ] Feature requirements satisfied.
- [ ] Google TypeScript style followed (or justified framework exception).
- [ ] No signature exceeds three parameters.
- [ ] Abstraction levels are consistent; duplication avoided.
- [ ] Tests were written and run before implementation, then rerun after refactoring.
- [ ] Relevant tests, lint, and type checks pass, or blockers are clearly reported.
- [ ] No unrelated changes.

## NestJS backend-specific guidance

- Follow established NestJS module boundaries: controllers handle transport and validation; services own application behavior; database access stays in the existing data-access approach.
- Use DTOs and `class-validator`/`class-transformer` for HTTP input validation as appropriate.
- Use Prisma safely; never interpolate untrusted input into raw SQL.
- Preserve API contracts, pagination structure, and consistent serialization (including bigint/decimal handling).
- Write focused service/controller tests before implementation; mock external dependencies when appropriate.
- For schema or API changes, add regression tests and account for migrations.

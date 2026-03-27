<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# Stack Rules — SaaS Hub v3

## Angular version

This project uses **Angular 21** with **Angular Material 21** and **NestJS**.
Before using any Angular/Angular Material API, always check the version constraints in `package.json`.

## Signals & rxResource

- Use `signal()`, `computed()`, `effect()`, `toSignal()` from `@angular/core`.
- Use `rxResource` from `@angular/core/rxjs-interop` for reactive HTTP fetching.
- **IMPORTANT — `rxResource` API in Angular 21+:**
  ```typescript
  // ✅ Correct (Angular 21+)
  readonly myResource = rxResource({
    stream: () => this.http.get<T[]>('/api/endpoint', { withCredentials: true }),
  });

  // ❌ Wrong — `loader` was renamed to `stream`
  readonly myResource = rxResource({
    loader: () => this.http.get<T[]>('/api/endpoint', { withCredentials: true }),
  });
  ```
- Access data via `.value()`, loading state via `.isLoading()`, errors via `.error()`.

## HttpClient

- Always use `HttpClient` (injected via `inject(HttpClient)`) — never native `fetch`.
- Pass `{ withCredentials: true }` for cookie-based auth.
- For one-shot async calls (outside signals), use `firstValueFrom(observable)` from `rxjs`.

## Components

- All components are **standalone** (`standalone: true`).
- Import Angular Material modules explicitly in each component's `imports: []` array.
- Use lazy-loaded routes via `loadComponent` in `app.routes.ts`.

## NestJS

- Fix TypeScript strict errors with explicit interfaces (e.g., `AuthenticatedRequest extends Request`).
- Use granular `catch` blocks — avoid swallowing errors silently.

---

## Tests unitaires — règles obligatoires

### Écriture des tests
- **TOUJOURS** écrire des tests unitaires pour tout nouveau code : services NestJS, guards, pipes, composants Angular critiques.
- Placer les fichiers de test à côté du fichier source : `foo.service.spec.ts` à côté de `foo.service.ts`.
- **NestJS** : utiliser `@nestjs/testing` (`Test.createTestingModule`) avec des mocks pour les dépendances externes (Supabase, HTTP).
- **Angular** : utiliser `TestBed` avec `provideHttpClientTesting()` pour mocker les appels HTTP. Tester les signals via leurs getters (`service.mySignal()`).
- Couvrir a minima : le cas nominal, les cas d'erreur, et les cas limites (valeur nulle, liste vide).

### Vérification obligatoire après chaque modification de code
- **Après tout ajout ou modification de code**, toujours lancer le type-check TypeScript pour détecter les erreurs avant de déclarer la tâche terminée :
  ```bash
  # Backend
  node node_modules/typescript/bin/tsc --project foodtruck-backend/tsconfig.app.json --noEmit
  node node_modules/typescript/bin/tsc --project hub-backend/tsconfig.app.json --noEmit

  # Frontend
  node node_modules/typescript/bin/tsc --project foodtruck-frontend/tsconfig.app.json --noEmit
  node node_modules/typescript/bin/tsc --project hub-frontend/tsconfig.app.json --noEmit
  ```
- Lancer les tests unitaires du projet modifié via Nx :
  ```bash
  npm exec nx run <project>:test
  ```
- **Ne jamais déclarer une tâche terminée si des erreurs TypeScript ou des tests échouent.**
- En cas d'erreur, corriger immédiatement puis relancer la vérification jusqu'à zéro erreur.

# ContribRadar Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working ContribRadar Core MVP: discovery, deterministic readiness scoring, explainability, issue search, watchlists, and a production-shaped Prisma schema.

**Architecture:** Start with a Next.js App Router application that reads from deterministic seed data through service boundaries, so the product flow works before external GitHub sync or database availability. Keep scoring, discovery, explainability, watchlists, and UI components in focused modules. Add Prisma/PostgreSQL schema in the same MVP so persistence can replace the seed adapter without changing API or UI contracts.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS, Vitest, Prisma with PostgreSQL provider, Zod.

---

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`: strict TypeScript config with `@/*` alias.
- `next.config.ts`: Next.js configuration.
- `postcss.config.mjs`: Tailwind PostCSS config.
- `vitest.config.ts`: Vitest config for TypeScript unit tests.
- `src/app/layout.tsx`: root HTML layout.
- `src/app/page.tsx`: server-rendered discovery dashboard.
- `src/app/globals.css`: global styles and Tailwind imports.
- `src/app/api/v1/discover/repos/route.ts`: repository discovery API route.
- `src/app/api/v1/discover/repos/[owner]/[repo]/score/route.ts`: repository score API route.
- `src/app/api/v1/discover/issues/route.ts`: issue discovery API route.
- `src/app/api/v1/watchlists/route.ts`: watchlist creation API route.
- `src/app/api/v1/watchlists/[id]/repos/route.ts`: watchlist detail API route.
- `src/components/discovery/discovery-dashboard.tsx`: main product screen.
- `src/components/discovery/filter-summary.tsx`: compact filter/facet summary.
- `src/components/discovery/repo-list.tsx`: scan-friendly repo list.
- `src/components/discovery/score-panel.tsx`: score breakdown and explanation panel.
- `src/components/discovery/issue-list.tsx`: issue readiness list.
- `src/domain/types.ts`: shared domain types and API response types.
- `src/domain/scoring.ts`: deterministic repo and issue scoring.
- `src/domain/scoring.test.ts`: scoring tests.
- `src/data/seed.ts`: representative GitHub-like data.
- `src/data/seed.test.ts`: seed shape tests.
- `src/server/discovery.ts`: discovery query parsing, filtering, facets, and score lookup.
- `src/server/discovery.test.ts`: discovery behavior and API response shape tests.
- `src/server/watchlists.ts`: development watchlist service with stable API shape.
- `src/server/watchlists.test.ts`: watchlist validation and saved repo tests.
- `src/server/http.ts`: structured JSON success/error helpers.
- `prisma/schema.prisma`: PostgreSQL core MVP schema.
- `prisma/seed.ts`: Prisma seed script matching `src/data/seed.ts`.
- `.env.example`: database URL example.
- `.gitignore`: generated files and local environment.
- `README.md`: local setup and verification commands.

## Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`

- [ ] **Step 1: Create the package manifest**

Create `package.json`:

```json
{
  "name": "contribradar-core-mvp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:validate": "prisma validate",
    "prisma:generate": "prisma generate",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.7.0",
    "next": "^15.3.1",
    "prisma": "^6.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.5",
    "@types/node": "^22.15.3",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "tailwindcss": "^4.1.5",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Create TypeScript and framework config files**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true
};

export default nextConfig;
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
```

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
```

- [ ] **Step 3: Create the initial app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContribRadar",
  description: "Contribution intelligence for GitHub repositories"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">ContribRadar</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Contribution intelligence dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Discover contribution-ready repositories, inspect deterministic readiness scores, and save promising targets.
        </p>
      </section>
    </main>
  );
}
```

Create `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #09090b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #09090b;
}
```

Create `.gitignore`:

```gitignore
node_modules
.next
dist
coverage
.env
.env.local
*.log
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
npm install
```

Expected: `node_modules` is created and `package-lock.json` is written.

- [ ] **Step 5: Verify the shell builds**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: TypeScript passes, then Next.js completes a production build and reports the `/` route.

- [ ] **Step 6: Commit foundation**

Run:

```powershell
git add .gitignore package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts src/app
git commit -m "chore: scaffold contribradar app"
```

Expected: commit succeeds with the foundation files.

## Task 2: Domain Types And Seed Data

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/data/seed.ts`
- Create: `src/data/seed.test.ts`

- [ ] **Step 1: Write the failing seed test**

Create `src/data/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seedIssues, seedRepositories } from "./seed";

describe("seed data", () => {
  it("contains repositories with issue data and scoring metrics", () => {
    expect(seedRepositories).toHaveLength(4);
    expect(seedIssues.length).toBeGreaterThanOrEqual(5);

    const pandas = seedRepositories.find((repo) => repo.fullName === "pandas-dev/pandas");

    expect(pandas).toMatchObject({
      owner: "pandas-dev",
      name: "pandas",
      language: "Python"
    });
    expect(pandas?.metrics.maintainerResponseHours).toBeLessThan(24);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- src/data/seed.test.ts
```

Expected: FAIL because `src/data/seed.ts` does not exist.

- [ ] **Step 3: Create shared domain types**

Create `src/domain/types.ts`:

```ts
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type Plan = "free" | "pro" | "team";

export type SortMode = "score" | "stars" | "activity" | "response_time";

export type RepoMetrics = {
  maintainerResponseHours: number | null;
  hasContributingGuide: boolean;
  hasIssueTemplates: boolean;
  hasGoodFirstIssueLabel: boolean;
  averagePrMergeDays: number | null;
  ciPassRate: number | null;
  testCoveragePercent: number | null;
  openCriticalBugs: number;
  hasCodeOfConduct: boolean;
  commitsPerDay: number;
  activeContributors30d: number;
  readmeLength: number;
  hasChangelog: boolean;
  hasApiDocs: boolean;
  hasExamples: boolean;
};

export type Repository = {
  id: string;
  githubId: number;
  fullName: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  sizeKb: number;
  lastCommitAt: string;
  createdAt: string;
  updatedAt: string;
  metrics: RepoMetrics;
};

export type IssueMetrics = {
  bodyWordCount: number;
  acceptanceCriteriaCount: number;
  commentCount: number;
  maintainerCommentCount: number;
  ageHours: number;
  assigneeCount: number;
};

export type Issue = {
  id: string;
  repoId: string;
  githubId: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastCommentAt: string | null;
  firstResponseHours: number | null;
  isStale: boolean;
  difficulty: "easy" | "medium" | "hard";
  metrics: IssueMetrics;
};

export type ScoreComponent = {
  key: string;
  label: string;
  score: number;
  weightedScore: number;
  weight: number;
  raw: string;
};

export type ScoreResult = {
  score: number;
  confidence: number;
  breakdown: ScoreComponent[];
  explanation: string;
  warnings: string[];
};

export type RepoWithScore = Repository & {
  readiness: ScoreResult;
  hasGoodFirstIssue: boolean;
};

export type IssueWithScore = Issue & {
  readiness: ScoreResult;
};

export type DiscoverReposQuery = {
  language?: string;
  topics?: string[];
  minScore?: number;
  hasGoodFirstIssue?: boolean;
  lastActiveWithinDays?: number;
  sort: SortMode;
  page: number;
  limit: number;
};

export type DiscoverIssuesQuery = {
  repoId?: string;
  labels?: string[];
  minIssueScore?: number;
  isStale?: boolean;
  hasNoAssignee?: boolean;
  difficulty?: Issue["difficulty"];
  page: number;
  limit: number;
};

export type Watchlist = {
  id: string;
  userId: string;
  name: string;
  description: string;
  filters: {
    languages: string[];
    topics: string[];
    minScore: number;
  };
  alertEnabled: boolean;
  digestFrequency: "daily" | "weekly";
  repoIds: string[];
  createdAt: string;
};
```

- [ ] **Step 4: Create representative seed data**

Create `src/data/seed.ts`:

```ts
import type { Issue, Repository } from "@/domain/types";

export const seedRepositories: Repository[] = [
  {
    id: "repo_pandas",
    githubId: 858127,
    fullName: "pandas-dev/pandas",
    owner: "pandas-dev",
    name: "pandas",
    description: "Flexible and powerful data analysis toolkit for Python.",
    language: "Python",
    topics: ["dataframe", "data-science", "python"],
    stars: 42300,
    forks: 17400,
    openIssues: 3410,
    sizeKb: 292000,
    lastCommitAt: "2026-05-05T18:12:00.000Z",
    createdAt: "2010-08-24T01:37:33.000Z",
    updatedAt: "2026-05-05T18:12:00.000Z",
    metrics: {
      maintainerResponseHours: 6,
      hasContributingGuide: true,
      hasIssueTemplates: true,
      hasGoodFirstIssueLabel: true,
      averagePrMergeDays: 4,
      ciPassRate: 0.92,
      testCoveragePercent: 78,
      openCriticalBugs: 0,
      hasCodeOfConduct: true,
      commitsPerDay: 3.2,
      activeContributors30d: 42,
      readmeLength: 2600,
      hasChangelog: true,
      hasApiDocs: true,
      hasExamples: true
    }
  },
  {
    id: "repo_tracing",
    githubId: 147301921,
    fullName: "tokio-rs/tracing",
    owner: "tokio-rs",
    name: "tracing",
    description: "Application level tracing for Rust.",
    language: "Rust",
    topics: ["rust", "observability", "distributed-systems"],
    stars: 6100,
    forks: 840,
    openIssues: 182,
    sizeKb: 42000,
    lastCommitAt: "2026-05-05T12:40:00.000Z",
    createdAt: "2018-09-04T10:00:00.000Z",
    updatedAt: "2026-05-05T12:40:00.000Z",
    metrics: {
      maintainerResponseHours: 18,
      hasContributingGuide: true,
      hasIssueTemplates: true,
      hasGoodFirstIssueLabel: true,
      averagePrMergeDays: 3,
      ciPassRate: 0.96,
      testCoveragePercent: 71,
      openCriticalBugs: 0,
      hasCodeOfConduct: true,
      commitsPerDay: 4.2,
      activeContributors30d: 55,
      readmeLength: 2100,
      hasChangelog: true,
      hasApiDocs: true,
      hasExamples: true
    }
  },
  {
    id: "repo_cli",
    githubId: 212121212,
    fullName: "open-source-labs/termflow",
    owner: "open-source-labs",
    name: "termflow",
    description: "Composable TypeScript CLI workflows for developer teams.",
    language: "TypeScript",
    topics: ["cli", "typescript", "developer-tools"],
    stars: 1250,
    forks: 130,
    openIssues: 38,
    sizeKb: 18000,
    lastCommitAt: "2026-04-28T09:10:00.000Z",
    createdAt: "2024-01-10T11:00:00.000Z",
    updatedAt: "2026-04-28T09:10:00.000Z",
    metrics: {
      maintainerResponseHours: 30,
      hasContributingGuide: true,
      hasIssueTemplates: false,
      hasGoodFirstIssueLabel: true,
      averagePrMergeDays: 8,
      ciPassRate: 0.81,
      testCoveragePercent: 54,
      openCriticalBugs: 1,
      hasCodeOfConduct: false,
      commitsPerDay: 0.8,
      activeContributors30d: 9,
      readmeLength: 1400,
      hasChangelog: false,
      hasApiDocs: false,
      hasExamples: true
    }
  },
  {
    id: "repo_stale",
    githubId: 313131313,
    fullName: "legacy-js/widgets",
    owner: "legacy-js",
    name: "widgets",
    description: "Legacy UI widgets that need maintainership help.",
    language: "JavaScript",
    topics: ["ui", "widgets", "legacy"],
    stars: 980,
    forks: 240,
    openIssues: 121,
    sizeKb: 64000,
    lastCommitAt: "2026-01-14T08:00:00.000Z",
    createdAt: "2017-04-15T09:00:00.000Z",
    updatedAt: "2026-01-14T08:00:00.000Z",
    metrics: {
      maintainerResponseHours: 190,
      hasContributingGuide: false,
      hasIssueTemplates: false,
      hasGoodFirstIssueLabel: false,
      averagePrMergeDays: 22,
      ciPassRate: 0.41,
      testCoveragePercent: 18,
      openCriticalBugs: 4,
      hasCodeOfConduct: false,
      commitsPerDay: 0.05,
      activeContributors30d: 1,
      readmeLength: 280,
      hasChangelog: false,
      hasApiDocs: false,
      hasExamples: false
    }
  }
];

export const seedIssues: Issue[] = [
  {
    id: "issue_pandas_docs",
    repoId: "repo_pandas",
    githubId: 52841,
    number: 52841,
    title: "Improve timezone examples in the getting started guide",
    body: "The timezone section needs clearer beginner examples and acceptance criteria for expected output.",
    state: "open",
    labels: ["good first issue", "documentation"],
    assignees: [],
    createdAt: "2026-05-03T12:00:00.000Z",
    updatedAt: "2026-05-05T12:30:00.000Z",
    closedAt: null,
    lastCommentAt: "2026-05-05T12:30:00.000Z",
    firstResponseHours: 4,
    isStale: false,
    difficulty: "easy",
    metrics: {
      bodyWordCount: 154,
      acceptanceCriteriaCount: 3,
      commentCount: 5,
      maintainerCommentCount: 2,
      ageHours: 48,
      assigneeCount: 0
    }
  },
  {
    id: "issue_pandas_perf",
    repoId: "repo_pandas",
    githubId: 53110,
    number: 53110,
    title: "Investigate groupby regression on nullable integers",
    body: "A regression appears in groupby operations with nullable integer arrays.",
    state: "open",
    labels: ["performance", "needs investigation"],
    assignees: ["core-dev"],
    createdAt: "2026-04-10T08:00:00.000Z",
    updatedAt: "2026-04-12T08:00:00.000Z",
    closedAt: null,
    lastCommentAt: "2026-04-12T08:00:00.000Z",
    firstResponseHours: 16,
    isStale: false,
    difficulty: "hard",
    metrics: {
      bodyWordCount: 74,
      acceptanceCriteriaCount: 0,
      commentCount: 2,
      maintainerCommentCount: 1,
      ageHours: 620,
      assigneeCount: 1
    }
  },
  {
    id: "issue_tracing_metrics",
    repoId: "repo_tracing",
    githubId: 2901,
    number: 2901,
    title: "Add examples for metrics integration",
    body: "Examples should show how tracing spans map into metrics exporters with setup steps and expected output.",
    state: "open",
    labels: ["good first issue", "help wanted", "documentation"],
    assignees: [],
    createdAt: "2026-05-04T10:00:00.000Z",
    updatedAt: "2026-05-05T16:00:00.000Z",
    closedAt: null,
    lastCommentAt: "2026-05-05T16:00:00.000Z",
    firstResponseHours: 7,
    isStale: false,
    difficulty: "easy",
    metrics: {
      bodyWordCount: 138,
      acceptanceCriteriaCount: 2,
      commentCount: 4,
      maintainerCommentCount: 2,
      ageHours: 38,
      assigneeCount: 0
    }
  },
  {
    id: "issue_cli_parser",
    repoId: "repo_cli",
    githubId: 77,
    number: 77,
    title: "Document parser plugin lifecycle",
    body: "Plugin authors need a clear lifecycle reference for parser hooks.",
    state: "open",
    labels: ["documentation", "help wanted"],
    assignees: [],
    createdAt: "2026-04-22T14:00:00.000Z",
    updatedAt: "2026-04-25T14:00:00.000Z",
    closedAt: null,
    lastCommentAt: "2026-04-25T14:00:00.000Z",
    firstResponseHours: 28,
    isStale: false,
    difficulty: "medium",
    metrics: {
      bodyWordCount: 68,
      acceptanceCriteriaCount: 1,
      commentCount: 1,
      maintainerCommentCount: 1,
      ageHours: 312,
      assigneeCount: 0
    }
  },
  {
    id: "issue_stale_refactor",
    repoId: "repo_stale",
    githubId: 901,
    number: 901,
    title: "Refactor widget registry",
    body: "The registry is hard to follow and needs refactoring.",
    state: "open",
    labels: ["refactor"],
    assignees: [],
    createdAt: "2025-12-01T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    closedAt: null,
    lastCommentAt: "2026-01-02T10:00:00.000Z",
    firstResponseHours: null,
    isStale: true,
    difficulty: "hard",
    metrics: {
      bodyWordCount: 12,
      acceptanceCriteriaCount: 0,
      commentCount: 0,
      maintainerCommentCount: 0,
      ageHours: 3744,
      assigneeCount: 0
    }
  }
];
```

- [ ] **Step 5: Run the seed test**

Run:

```powershell
npm test -- src/data/seed.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit seed data**

Run:

```powershell
git add src/domain/types.ts src/data/seed.ts src/data/seed.test.ts
git commit -m "feat: add contribradar seed data"
```

Expected: commit succeeds.

## Task 3: Deterministic Scoring Engine

**Files:**
- Create: `src/domain/scoring.test.ts`
- Create: `src/domain/scoring.ts`

- [ ] **Step 1: Write failing scoring tests**

Create `src/domain/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seedIssues, seedRepositories } from "@/data/seed";
import { scoreIssueReadiness, scoreRepositoryReadiness } from "./scoring";

describe("scoreRepositoryReadiness", () => {
  it("returns a high score with weighted explainability for responsive beginner-friendly repos", () => {
    const result = scoreRepositoryReadiness(seedRepositories[0]);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.confidence).toBeLessThanOrEqual(4);
    expect(result.breakdown).toHaveLength(5);
    expect(result.breakdown.map((part) => part.key)).toEqual([
      "maintainer_responsiveness",
      "newcomer_friendly",
      "code_health",
      "community_activity",
      "documentation"
    ]);
    expect(result.explanation).toContain("maintainer");
  });

  it("lowers confidence and adds warnings when data is weak", () => {
    const result = scoreRepositoryReadiness(seedRepositories[3]);

    expect(result.score).toBeLessThan(35);
    expect(result.confidence).toBeGreaterThanOrEqual(10);
    expect(result.warnings).toContain("Maintainer response is slow.");
    expect(result.warnings).toContain("Documentation signals are weak.");
  });
});

describe("scoreIssueReadiness", () => {
  it("scores clear unassigned good-first issues highly", () => {
    const result = scoreIssueReadiness(seedIssues[0]);

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.breakdown.map((part) => part.key)).toEqual([
      "clarity",
      "engagement",
      "recency",
      "assignee",
      "labels"
    ]);
    expect(result.explanation).toContain("issue");
  });

  it("penalizes stale issues with thin descriptions", () => {
    const result = scoreIssueReadiness(seedIssues[4]);

    expect(result.score).toBeLessThan(40);
    expect(result.warnings).toContain("Issue appears stale.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/domain/scoring.test.ts
```

Expected: FAIL because `src/domain/scoring.ts` does not exist.

- [ ] **Step 3: Implement scoring functions**

Create `src/domain/scoring.ts`:

```ts
import type { Issue, Repository, ScoreComponent, ScoreResult } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const round = (value: number) => Math.round(value * 100) / 100;

const weighted = (key: string, label: string, score: number, weight: number, raw: string): ScoreComponent => ({
  key,
  label,
  score: round(clamp(score)),
  weightedScore: round(clamp(score) * weight),
  weight,
  raw
});

const sumWeighted = (parts: ScoreComponent[]) => round(parts.reduce((sum, part) => sum + part.weightedScore, 0));

export function scoreRepositoryReadiness(repo: Repository): ScoreResult {
  const responseHours = repo.metrics.maintainerResponseHours;
  const maintainerScore = responseHours === null ? 35 : 100 / (1 + responseHours / 24);

  const newcomerScore =
    (repo.metrics.hasContributingGuide ? 25 : 0) +
    (repo.metrics.hasIssueTemplates ? 25 : 0) +
    (repo.metrics.hasGoodFirstIssueLabel ? 25 : 0) +
    (repo.metrics.averagePrMergeDays !== null && repo.metrics.averagePrMergeDays < 7 ? 25 : 0);

  const codeHealthScore =
    (repo.metrics.ciPassRate ?? 0.35) * 40 +
    ((repo.metrics.testCoveragePercent ?? 25) / 100) * 30 +
    (repo.metrics.openCriticalBugs === 0 ? 20 : repo.metrics.openCriticalBugs <= 1 ? 10 : 0) +
    (repo.metrics.hasCodeOfConduct ? 10 : 0);

  const communityActivityScore = Math.min(
    100,
    repo.metrics.commitsPerDay * 10 + repo.metrics.activeContributors30d * 2
  );

  const documentationScore =
    (repo.metrics.readmeLength > 500 ? 30 : 0) +
    (repo.metrics.hasChangelog ? 20 : 0) +
    (repo.metrics.hasApiDocs ? 25 : 0) +
    (repo.metrics.hasExamples ? 25 : 0);

  const breakdown = [
    weighted(
      "maintainer_responsiveness",
      "Maintainer Responsiveness",
      maintainerScore,
      0.3,
      responseHours === null ? "No response-time data" : `avg ${responseHours}h response`
    ),
    weighted("newcomer_friendly", "Newcomer Friendly", newcomerScore, 0.25, newcomerRaw(repo)),
    weighted("code_health", "Code Health", codeHealthScore, 0.2, codeHealthRaw(repo)),
    weighted(
      "community_activity",
      "Community Activity",
      communityActivityScore,
      0.15,
      `${repo.metrics.commitsPerDay} commits/day, ${repo.metrics.activeContributors30d} active contributors`
    ),
    weighted("documentation", "Documentation", documentationScore, 0.1, documentationRaw(repo))
  ];

  const warnings: string[] = [];
  if (responseHours === null || responseHours > 72) warnings.push("Maintainer response is slow.");
  if (documentationScore < 50) warnings.push("Documentation signals are weak.");
  if (repo.metrics.openCriticalBugs > 0) warnings.push("Open critical bugs reduce code health.");

  const missingMetrics = [
    responseHours,
    repo.metrics.averagePrMergeDays,
    repo.metrics.ciPassRate,
    repo.metrics.testCoveragePercent
  ].filter((value) => value === null).length;

  const score = sumWeighted(breakdown);
  const confidence = round(4 + missingMetrics * 3 + warnings.length * 1.5);

  return {
    score,
    confidence,
    breakdown,
    explanation: `${repo.fullName} scored ${score}/100 because maintainer response, newcomer setup, code health, activity, and documentation signals were evaluated with fixed weights.`,
    warnings
  };
}

export function scoreIssueReadiness(issue: Issue): ScoreResult {
  const clarityScore = clamp(issue.metrics.bodyWordCount * 0.35 + issue.metrics.acceptanceCriteriaCount * 20);
  const engagementScore = clamp(issue.metrics.commentCount * 8 + issue.metrics.maintainerCommentCount * 18);
  const recencyScore = issue.isStale ? 10 : clamp(100 - issue.metrics.ageHours / 24);
  const assigneeScore = issue.metrics.assigneeCount === 0 ? 100 : 25;
  const labelScore = issue.labels.includes("good first issue")
    ? 100
    : issue.labels.includes("help wanted")
      ? 70
      : issue.labels.includes("documentation")
        ? 60
        : 25;

  const breakdown = [
    weighted("clarity", "Clarity", clarityScore, 0.35, `${issue.metrics.bodyWordCount} words, ${issue.metrics.acceptanceCriteriaCount} acceptance criteria`),
    weighted("engagement", "Engagement", engagementScore, 0.25, `${issue.metrics.commentCount} comments, ${issue.metrics.maintainerCommentCount} maintainer comments`),
    weighted("recency", "Recency", recencyScore, 0.2, issue.isStale ? "stale issue" : `${Math.round(issue.metrics.ageHours)} hours old`),
    weighted("assignee", "Assignee Availability", assigneeScore, 0.15, issue.metrics.assigneeCount === 0 ? "unassigned" : "already assigned"),
    weighted("labels", "Labels", labelScore, 0.05, issue.labels.join(", "))
  ];

  const warnings: string[] = [];
  if (issue.isStale) warnings.push("Issue appears stale.");
  if (issue.metrics.acceptanceCriteriaCount === 0) warnings.push("No acceptance criteria detected.");
  if (issue.metrics.assigneeCount > 0) warnings.push("Issue already has an assignee.");

  const score = sumWeighted(breakdown);

  return {
    score,
    confidence: round(4 + warnings.length * 2),
    breakdown,
    explanation: `This issue scored ${score}/100 because clarity, engagement, recency, assignment, and labels were evaluated with fixed weights.`,
    warnings
  };
}

function newcomerRaw(repo: Repository) {
  const signals = [
    repo.metrics.hasContributingGuide ? "CONTRIBUTING.md" : "no CONTRIBUTING.md",
    repo.metrics.hasIssueTemplates ? "issue templates" : "no issue templates",
    repo.metrics.hasGoodFirstIssueLabel ? "good-first-issue label" : "no good-first-issue label",
    repo.metrics.averagePrMergeDays !== null ? `${repo.metrics.averagePrMergeDays}d avg PR merge` : "no PR merge data"
  ];
  return signals.join(", ");
}

function codeHealthRaw(repo: Repository) {
  const ci = repo.metrics.ciPassRate === null ? "CI unknown" : `CI ${Math.round(repo.metrics.ciPassRate * 100)}%`;
  const coverage =
    repo.metrics.testCoveragePercent === null ? "coverage unknown" : `coverage ${repo.metrics.testCoveragePercent}%`;
  return `${ci}, ${coverage}, ${repo.metrics.openCriticalBugs} critical bugs`;
}

function documentationRaw(repo: Repository) {
  const signals = [
    `${repo.metrics.readmeLength} README chars`,
    repo.metrics.hasChangelog ? "changelog" : "no changelog",
    repo.metrics.hasApiDocs ? "API docs" : "no API docs",
    repo.metrics.hasExamples ? "examples" : "no examples"
  ];
  return signals.join(", ");
}
```

- [ ] **Step 4: Run scoring tests**

Run:

```powershell
npm test -- src/domain/scoring.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit scoring engine**

Run:

```powershell
git add src/domain/scoring.ts src/domain/scoring.test.ts
git commit -m "feat: add readiness scoring engine"
```

Expected: commit succeeds.

## Task 4: Discovery Services

**Files:**
- Create: `src/server/discovery.test.ts`
- Create: `src/server/discovery.ts`

- [ ] **Step 1: Write failing discovery tests**

Create `src/server/discovery.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { discoverIssues, discoverRepositories, getRepositoryScore } from "./discovery";

describe("discoverRepositories", () => {
  it("filters by language, minimum score, topic, and good-first-issue availability", () => {
    const result = discoverRepositories({
      language: "Python",
      topics: ["data-science"],
      minScore: 70,
      hasGoodFirstIssue: true,
      sort: "score",
      page: 1,
      limit: 10
    });

    expect(result.total).toBe(1);
    expect(result.repos[0].fullName).toBe("pandas-dev/pandas");
    expect(result.facets.languages).toContain("Python");
    expect(result.facets.topics).toContain("data-science");
  });

  it("sorts by maintainer response time", () => {
    const result = discoverRepositories({
      sort: "response_time",
      page: 1,
      limit: 2
    });

    expect(result.repos[0].fullName).toBe("pandas-dev/pandas");
  });
});

describe("getRepositoryScore", () => {
  it("returns a score response by owner and repo", () => {
    const result = getRepositoryScore("tokio-rs", "tracing");

    expect(result.status).toBe(200);
    expect(result.data?.readiness_score).toBeGreaterThan(75);
    expect(result.data?.breakdown).toHaveLength(5);
  });

  it("returns a structured not found response", () => {
    const result = getRepositoryScore("missing", "repo");

    expect(result.status).toBe(404);
    expect(result.error?.code).toBe("REPOSITORY_NOT_FOUND");
  });
});

describe("discoverIssues", () => {
  it("filters unassigned beginner-friendly issues", () => {
    const result = discoverIssues({
      labels: ["good first issue"],
      minIssueScore: 70,
      hasNoAssignee: true,
      difficulty: "easy",
      page: 1,
      limit: 10
    });

    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.issues.every((issue) => issue.assignees.length === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/server/discovery.test.ts
```

Expected: FAIL because `src/server/discovery.ts` does not exist.

- [ ] **Step 3: Implement discovery services**

Create `src/server/discovery.ts`:

```ts
import { seedIssues, seedRepositories } from "@/data/seed";
import { scoreIssueReadiness, scoreRepositoryReadiness } from "@/domain/scoring";
import type {
  DiscoverIssuesQuery,
  DiscoverReposQuery,
  IssueWithScore,
  RepoWithScore,
  Repository,
  ScoreResult
} from "@/domain/types";

type ErrorResponse = {
  status: number;
  error: {
    code: string;
    message: string;
  };
  data?: never;
};

type ScoreResponse = {
  status: 200;
  data: {
    readiness_score: number;
    confidence: number;
    breakdown: ScoreResult["breakdown"];
    explanation: string;
    warnings: string[];
  };
  error?: never;
};

const defaultRepoQuery: DiscoverReposQuery = {
  sort: "score",
  page: 1,
  limit: 20
};

const defaultIssueQuery: DiscoverIssuesQuery = {
  page: 1,
  limit: 20
};

export function discoverRepositories(query: Partial<DiscoverReposQuery> = {}) {
  const parsed: DiscoverReposQuery = { ...defaultRepoQuery, ...query };
  const scored = seedRepositories.map(toRepoWithScore);
  const filtered = scored.filter((repo) => {
    if (parsed.language && repo.language.toLowerCase() !== parsed.language.toLowerCase()) return false;
    if (parsed.topics?.length && !parsed.topics.every((topic) => repo.topics.includes(topic))) return false;
    if (parsed.minScore !== undefined && repo.readiness.score < parsed.minScore) return false;
    if (parsed.hasGoodFirstIssue !== undefined && repo.hasGoodFirstIssue !== parsed.hasGoodFirstIssue) return false;
    if (parsed.lastActiveWithinDays !== undefined && daysSince(repo.lastCommitAt) > parsed.lastActiveWithinDays) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => sortRepos(a, b, parsed.sort));
  const paged = paginate(sorted, parsed.page, parsed.limit);

  return {
    repos: paged,
    total: filtered.length,
    facets: {
      languages: unique(scored.map((repo) => repo.language)),
      topics: unique(scored.flatMap((repo) => repo.topics))
    }
  };
}

export function getRepositoryScore(owner: string, repoName: string): ScoreResponse | ErrorResponse {
  const repo = seedRepositories.find(
    (candidate) =>
      candidate.owner.toLowerCase() === owner.toLowerCase() && candidate.name.toLowerCase() === repoName.toLowerCase()
  );

  if (!repo) {
    return {
      status: 404,
      error: {
        code: "REPOSITORY_NOT_FOUND",
        message: `Repository ${owner}/${repoName} was not found.`
      }
    };
  }

  const readiness = scoreRepositoryReadiness(repo);

  return {
    status: 200,
    data: {
      readiness_score: readiness.score,
      confidence: readiness.confidence,
      breakdown: readiness.breakdown,
      explanation: readiness.explanation,
      warnings: readiness.warnings
    }
  };
}

export function discoverIssues(query: Partial<DiscoverIssuesQuery> = {}) {
  const parsed: DiscoverIssuesQuery = { ...defaultIssueQuery, ...query };
  const scored = seedIssues.map((issue): IssueWithScore => ({ ...issue, readiness: scoreIssueReadiness(issue) }));
  const filtered = scored.filter((issue) => {
    if (parsed.repoId && issue.repoId !== parsed.repoId) return false;
    if (parsed.labels?.length && !parsed.labels.every((label) => issue.labels.includes(label))) return false;
    if (parsed.minIssueScore !== undefined && issue.readiness.score < parsed.minIssueScore) return false;
    if (parsed.isStale !== undefined && issue.isStale !== parsed.isStale) return false;
    if (parsed.hasNoAssignee && issue.assignees.length > 0) return false;
    if (parsed.difficulty && issue.difficulty !== parsed.difficulty) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.readiness.score - a.readiness.score);

  return {
    issues: paginate(sorted, parsed.page, parsed.limit),
    total: filtered.length
  };
}

export function toRepoWithScore(repo: Repository): RepoWithScore {
  return {
    ...repo,
    readiness: scoreRepositoryReadiness(repo),
    hasGoodFirstIssue: seedIssues.some(
      (issue) => issue.repoId === repo.id && issue.labels.includes("good first issue") && issue.state === "open"
    )
  };
}

function sortRepos(a: RepoWithScore, b: RepoWithScore, sort: DiscoverReposQuery["sort"]) {
  if (sort === "stars") return b.stars - a.stars;
  if (sort === "activity") return new Date(b.lastCommitAt).getTime() - new Date(a.lastCommitAt).getTime();
  if (sort === "response_time") {
    return (a.metrics.maintainerResponseHours ?? Number.MAX_SAFE_INTEGER) - (b.metrics.maintainerResponseHours ?? Number.MAX_SAFE_INTEGER);
  }
  return b.readiness.score - a.readiness.score;
}

function paginate<T>(items: T[], page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const start = (safePage - 1) * safeLimit;
  return items.slice(start, start + safeLimit);
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function daysSince(isoDate: string) {
  const now = new Date("2026-05-06T00:00:00.000Z").getTime();
  return (now - new Date(isoDate).getTime()) / 86_400_000;
}
```

- [ ] **Step 4: Run discovery tests**

Run:

```powershell
npm test -- src/server/discovery.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit discovery services**

Run:

```powershell
git add src/server/discovery.ts src/server/discovery.test.ts
git commit -m "feat: add discovery services"
```

Expected: commit succeeds.

## Task 5: Watchlist Service

**Files:**
- Create: `src/server/watchlists.test.ts`
- Create: `src/server/watchlists.ts`

- [ ] **Step 1: Write failing watchlist tests**

Create `src/server/watchlists.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createWatchlist, getWatchlistRepos, resetWatchlistsForTests } from "./watchlists";

describe("watchlists", () => {
  beforeEach(() => {
    resetWatchlistsForTests();
  });

  it("creates a watchlist with filters and matching repositories", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: "Python beginner targets",
      description: "Repos for first OSS contribution",
      filters: {
        languages: ["Python"],
        topics: ["data-science"],
        minScore: 70
      },
      alertEnabled: true,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(201);
    expect(result.data?.watchlist.name).toBe("Python beginner targets");

    const repos = getWatchlistRepos(result.data?.watchlist.id ?? "");
    expect(repos.status).toBe(200);
    expect(repos.data?.repos[0].fullName).toBe("pandas-dev/pandas");
  });

  it("rejects blank watchlist names", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: " ",
      description: "",
      filters: {
        languages: [],
        topics: [],
        minScore: 75
      },
      alertEnabled: false,
      digestFrequency: "daily"
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe("INVALID_WATCHLIST_NAME");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/server/watchlists.test.ts
```

Expected: FAIL because `src/server/watchlists.ts` does not exist.

- [ ] **Step 3: Implement watchlist service**

Create `src/server/watchlists.ts`:

```ts
import type { Watchlist } from "@/domain/types";
import { discoverRepositories } from "./discovery";

type CreateWatchlistInput = Omit<Watchlist, "id" | "repoIds" | "createdAt">;

type WatchlistSuccess = {
  status: 201;
  data: {
    watchlist: Watchlist;
  };
  error?: never;
};

type WatchlistReposSuccess = {
  status: 200;
  data: {
    watchlist: Watchlist;
    repos: ReturnType<typeof discoverRepositories>["repos"];
    total: number;
    filters_applied: Watchlist["filters"];
  };
  error?: never;
};

type WatchlistError = {
  status: 400 | 404;
  error: {
    code: string;
    message: string;
  };
  data?: never;
};

const watchlists = new Map<string, Watchlist>();

export function createWatchlist(input: CreateWatchlistInput): WatchlistSuccess | WatchlistError {
  if (input.name.trim().length === 0) {
    return {
      status: 400,
      error: {
        code: "INVALID_WATCHLIST_NAME",
        message: "Watchlist name is required."
      }
    };
  }

  const matchingRepos = discoverRepositories({
    language: input.filters.languages[0],
    topics: input.filters.topics,
    minScore: input.filters.minScore,
    sort: "score",
    page: 1,
    limit: 100
  }).repos;

  const watchlist: Watchlist = {
    ...input,
    id: `watchlist_${watchlists.size + 1}`,
    name: input.name.trim(),
    repoIds: matchingRepos.map((repo) => repo.id),
    createdAt: new Date("2026-05-06T00:00:00.000Z").toISOString()
  };

  watchlists.set(watchlist.id, watchlist);

  return {
    status: 201,
    data: {
      watchlist
    }
  };
}

export function getWatchlistRepos(id: string): WatchlistReposSuccess | WatchlistError {
  const watchlist = watchlists.get(id);

  if (!watchlist) {
    return {
      status: 404,
      error: {
        code: "WATCHLIST_NOT_FOUND",
        message: `Watchlist ${id} was not found.`
      }
    };
  }

  const repos = discoverRepositories({
    language: watchlist.filters.languages[0],
    topics: watchlist.filters.topics,
    minScore: watchlist.filters.minScore,
    sort: "score",
    page: 1,
    limit: 100
  }).repos.filter((repo) => watchlist.repoIds.includes(repo.id));

  return {
    status: 200,
    data: {
      watchlist,
      repos,
      total: repos.length,
      filters_applied: watchlist.filters
    }
  };
}

export function resetWatchlistsForTests() {
  watchlists.clear();
}
```

- [ ] **Step 4: Run watchlist tests**

Run:

```powershell
npm test -- src/server/watchlists.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit watchlist service**

Run:

```powershell
git add src/server/watchlists.ts src/server/watchlists.test.ts
git commit -m "feat: add watchlist service"
```

Expected: commit succeeds.

## Task 6: API Routes

**Files:**
- Create: `src/server/http.ts`
- Create: `src/app/api/v1/discover/repos/route.ts`
- Create: `src/app/api/v1/discover/repos/[owner]/[repo]/score/route.ts`
- Create: `src/app/api/v1/discover/issues/route.ts`
- Create: `src/app/api/v1/watchlists/route.ts`
- Create: `src/app/api/v1/watchlists/[id]/repos/route.ts`

- [ ] **Step 1: Create HTTP helpers**

Create `src/server/http.ts`:

```ts
import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details
      }
    },
    { status }
  );
}

export function readStringList(value: string | null) {
  if (!value) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readBoolean(value: string | null) {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
```

- [ ] **Step 2: Create repository discovery route**

Create `src/app/api/v1/discover/repos/route.ts`:

```ts
import { discoverRepositories } from "@/server/discovery";
import { jsonOk, readBoolean, readNumber, readStringList } from "@/server/http";
import type { SortMode } from "@/domain/types";

const sortModes: SortMode[] = ["score", "stars", "activity", "response_time"];

export function GET(request: Request) {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort");

  const result = discoverRepositories({
    language: url.searchParams.get("language") ?? undefined,
    topics: readStringList(url.searchParams.get("topics")),
    minScore: readNumber(url.searchParams.get("min_score")),
    hasGoodFirstIssue: readBoolean(url.searchParams.get("has_good_first_issue")),
    lastActiveWithinDays: readNumber(url.searchParams.get("last_active_within_days")),
    sort: sort && sortModes.includes(sort as SortMode) ? (sort as SortMode) : "score",
    page: readNumber(url.searchParams.get("page")) ?? 1,
    limit: readNumber(url.searchParams.get("limit")) ?? 20
  });

  return jsonOk({
    repos: result.repos,
    total: result.total,
    facets: result.facets
  });
}
```

- [ ] **Step 3: Create score detail route**

Create `src/app/api/v1/discover/repos/[owner]/[repo]/score/route.ts`:

```ts
import { getRepositoryScore } from "@/server/discovery";
import { jsonError, jsonOk } from "@/server/http";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const result = getRepositoryScore(params.owner, params.repo);

  if (result.error) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data);
}
```

- [ ] **Step 4: Create issue discovery route**

Create `src/app/api/v1/discover/issues/route.ts`:

```ts
import { discoverIssues } from "@/server/discovery";
import { jsonOk, readBoolean, readNumber, readStringList } from "@/server/http";
import type { Issue } from "@/domain/types";

const difficulties: Issue["difficulty"][] = ["easy", "medium", "hard"];

export function GET(request: Request) {
  const url = new URL(request.url);
  const difficulty = url.searchParams.get("difficulty");

  const result = discoverIssues({
    repoId: url.searchParams.get("repo_id") ?? undefined,
    labels: readStringList(url.searchParams.get("labels")),
    minIssueScore: readNumber(url.searchParams.get("min_issue_score")),
    isStale: readBoolean(url.searchParams.get("is_stale")),
    hasNoAssignee: readBoolean(url.searchParams.get("has_no_assignee")),
    difficulty:
      difficulty && difficulties.includes(difficulty as Issue["difficulty"])
        ? (difficulty as Issue["difficulty"])
        : undefined,
    page: readNumber(url.searchParams.get("page")) ?? 1,
    limit: readNumber(url.searchParams.get("limit")) ?? 20
  });

  return jsonOk({
    issues: result.issues,
    total: result.total
  });
}
```

- [ ] **Step 5: Create watchlist routes**

Create `src/app/api/v1/watchlists/route.ts`:

```ts
import { z } from "zod";
import { createWatchlist } from "@/server/watchlists";
import { jsonError, jsonOk } from "@/server/http";

const createWatchlistSchema = z.object({
  userId: z.string().min(1).default("user_demo"),
  name: z.string(),
  description: z.string().default(""),
  filters: z.object({
    languages: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    minScore: z.number().min(0).max(100).default(70)
  }),
  alertEnabled: z.boolean().default(false),
  digestFrequency: z.enum(["daily", "weekly"]).default("weekly")
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createWatchlistSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "INVALID_WATCHLIST_REQUEST", "Watchlist request is invalid.", parsed.error.flatten());
  }

  const result = createWatchlist(parsed.data);

  if (result.error) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data, 201);
}
```

Create `src/app/api/v1/watchlists/[id]/repos/route.ts`:

```ts
import { jsonError, jsonOk } from "@/server/http";
import { getWatchlistRepos } from "@/server/watchlists";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const result = getWatchlistRepos(params.id);

  if (result.error) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data);
}
```

- [ ] **Step 6: Verify routes compile**

Run:

```powershell
npm run build
```

Expected: PASS. Next.js compiles API routes and the `/` page.

- [ ] **Step 7: Commit API routes**

Run:

```powershell
git add src/server/http.ts src/app/api
git commit -m "feat: add core api routes"
```

Expected: commit succeeds.

## Task 7: Prisma Schema And Seed Script

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `.env.example`

- [ ] **Step 1: Create environment example**

Create `.env.example`:

```env
DATABASE_URL="postgresql://contribradar:contribradar@localhost:5432/contribradar?schema=public"
```

- [ ] **Step 2: Create PostgreSQL Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Plan {
  free
  pro
  team
}

enum IssueState {
  open
  closed
}

enum DigestFrequency {
  daily
  weekly
}

enum AlertType {
  new_issue
  score_change
  stale_reminder
}

model User {
  id               String      @id @default(cuid())
  githubId         String?     @unique
  email            String?     @unique
  displayName      String
  avatarUrl        String?
  skillVector      Json
  experienceLevel  String
  weeklyHours      Int
  plan             Plan        @default(free)
  alertPreferences Json
  createdAt        DateTime    @default(now())
  watchlists       Watchlist[]
  alerts           Alert[]

  @@map("users")
}

model Repository {
  id                             String          @id @default(cuid())
  githubId                       Int             @unique
  fullName                       String          @unique
  owner                          String
  name                           String
  description                    String
  language                       String
  topics                         Json
  stars                          Int
  forks                          Int
  openIssues                     Int
  sizeKb                         Int
  lastCommitAt                   DateTime
  createdAt                      DateTime
  updatedAt                      DateTime
  readinessScore                 Decimal?        @db.Decimal(5, 2)
  scoreConfidence                Decimal?        @db.Decimal(5, 2)
  scoreCalculatedAt              DateTime?
  metricMaintainerResponseHours  Decimal?        @db.Decimal(6, 2)
  metricNewcomerFriendlyScore    Decimal?        @db.Decimal(5, 2)
  metricCodeHealthScore          Decimal?        @db.Decimal(5, 2)
  metricCommunityActivityScore   Decimal?        @db.Decimal(5, 2)
  metricDocumentationScore       Decimal?        @db.Decimal(5, 2)
  issues                         Issue[]
  watchlistRepos                 WatchlistRepo[]
  alerts                         Alert[]
  scoreLogs                      ScoreLog[]

  @@index([readinessScore(sort: Desc)])
  @@index([language])
  @@map("repositories")
}

model Issue {
  id                    String          @id @default(cuid())
  repoId                String
  repository            Repository      @relation(fields: [repoId], references: [id], onDelete: Cascade)
  githubId              Int             @unique
  number                Int
  title                 String
  body                  String
  state                 IssueState
  labels                Json
  assignees             Json
  createdAt             DateTime
  updatedAt             DateTime
  closedAt              DateTime?
  issueReadinessScore   Decimal?        @db.Decimal(5, 2)
  hasAcceptanceCriteria Boolean
  commentCount          Int
  lastCommentAt         DateTime?
  firstResponseHours    Decimal?        @db.Decimal(6, 2)
  isStale               Boolean
  alerts                Alert[]

  @@index([repoId, state, issueReadinessScore(sort: Desc)])
  @@index([isStale, lastCommentAt])
  @@map("issues")
}

model Watchlist {
  id              String          @id @default(cuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  description     String
  filters         Json
  alertEnabled    Boolean         @default(false)
  digestFrequency DigestFrequency @default(weekly)
  repos           WatchlistRepo[]
  createdAt       DateTime        @default(now())

  @@index([userId])
  @@map("watchlists")
}

model WatchlistRepo {
  watchlistId String
  repoId      String
  watchlist   Watchlist  @relation(fields: [watchlistId], references: [id], onDelete: Cascade)
  repository  Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  addedAt     DateTime   @default(now())
  notes       String?

  @@id([watchlistId, repoId])
  @@map("watchlist_repos")
}

model Alert {
  id         String     @id @default(cuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       AlertType
  repoId     String
  repository Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  issueId    String?
  issue      Issue?     @relation(fields: [issueId], references: [id], onDelete: SetNull)
  message    String
  reasonText String
  isRead     Boolean    @default(false)
  createdAt  DateTime   @default(now())

  @@index([userId, isRead, createdAt(sort: Desc)])
  @@map("alerts")
}

model ScoreLog {
  id            String     @id @default(cuid())
  repoId        String
  repository    Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  calculatedAt  DateTime   @default(now())
  oldScore      Decimal?   @db.Decimal(5, 2)
  newScore      Decimal    @db.Decimal(5, 2)
  deltaReason   Json
  metricChanges Json

  @@index([repoId, calculatedAt(sort: Desc)])
  @@map("score_logs")
}
```

- [ ] **Step 3: Create Prisma seed script**

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { seedIssues, seedRepositories } from "../src/data/seed";
import { scoreIssueReadiness, scoreRepositoryReadiness } from "../src/domain/scoring";

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.watchlistRepo.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.scoreLog.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      id: "user_demo",
      githubId: "10001",
      email: "demo@contribradar.local",
      displayName: "Demo Contributor",
      skillVector: { languages: ["Python", "Rust", "TypeScript"], topics: ["documentation", "cli"] },
      experienceLevel: "beginner",
      weeklyHours: 5,
      plan: "free",
      alertPreferences: { quietMode: false }
    }
  });

  for (const repo of seedRepositories) {
    const readiness = scoreRepositoryReadiness(repo);
    await prisma.repository.create({
      data: {
        id: repo.id,
        githubId: repo.githubId,
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        topics: repo.topics,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        sizeKb: repo.sizeKb,
        lastCommitAt: repo.lastCommitAt,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
        readinessScore: readiness.score,
        scoreConfidence: readiness.confidence,
        scoreCalculatedAt: new Date("2026-05-06T00:00:00.000Z"),
        metricMaintainerResponseHours: repo.metrics.maintainerResponseHours,
        metricNewcomerFriendlyScore: readiness.breakdown.find((part) => part.key === "newcomer_friendly")?.score,
        metricCodeHealthScore: readiness.breakdown.find((part) => part.key === "code_health")?.score,
        metricCommunityActivityScore: readiness.breakdown.find((part) => part.key === "community_activity")?.score,
        metricDocumentationScore: readiness.breakdown.find((part) => part.key === "documentation")?.score,
        scoreLogs: {
          create: {
            newScore: readiness.score,
            deltaReason: { explanation: readiness.explanation, warnings: readiness.warnings },
            metricChanges: readiness.breakdown
          }
        }
      }
    });
  }

  for (const issue of seedIssues) {
    const readiness = scoreIssueReadiness(issue);
    await prisma.issue.create({
      data: {
        id: issue.id,
        repoId: issue.repoId,
        githubId: issue.githubId,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels,
        assignees: issue.assignees,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        closedAt: issue.closedAt,
        issueReadinessScore: readiness.score,
        hasAcceptanceCriteria: issue.metrics.acceptanceCriteriaCount > 0,
        commentCount: issue.metrics.commentCount,
        lastCommentAt: issue.lastCommentAt,
        firstResponseHours: issue.firstResponseHours,
        isStale: issue.isStale
      }
    });
  }

  await prisma.watchlist.create({
    data: {
      id: "watchlist_demo",
      userId: user.id,
      name: "First contribution targets",
      description: "High readiness repos for beginner contributors",
      filters: { languages: ["Python"], topics: ["data-science"], minScore: 70 },
      alertEnabled: true,
      digestFrequency: "weekly",
      repos: {
        create: {
          repoId: "repo_pandas",
          notes: "Strong docs and fast maintainer response."
        }
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 4: Validate Prisma schema**

Run:

```powershell
npm run prisma:validate
```

Expected: PASS with `The schema at prisma/schema.prisma is valid`.

- [ ] **Step 5: Commit Prisma schema**

Run:

```powershell
git add .env.example prisma/schema.prisma prisma/seed.ts
git commit -m "feat: add core prisma schema"
```

Expected: commit succeeds.

## Task 8: Discovery UI

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/discovery/discovery-dashboard.tsx`
- Create: `src/components/discovery/filter-summary.tsx`
- Create: `src/components/discovery/repo-list.tsx`
- Create: `src/components/discovery/score-panel.tsx`
- Create: `src/components/discovery/issue-list.tsx`

- [ ] **Step 1: Create filter summary component**

Create `src/components/discovery/filter-summary.tsx`:

```tsx
type FilterSummaryProps = {
  total: number;
  languages: string[];
  topics: string[];
};

export function FilterSummary({ total, languages, topics }: FilterSummaryProps) {
  return (
    <section className="grid gap-3 border-y border-zinc-800 py-4 text-sm text-zinc-300 md:grid-cols-3">
      <div>
        <span className="block text-xs uppercase text-zinc-500">Matches</span>
        <strong className="text-lg text-white">{total}</strong>
      </div>
      <div>
        <span className="block text-xs uppercase text-zinc-500">Languages</span>
        <span>{languages.slice(0, 4).join(", ")}</span>
      </div>
      <div>
        <span className="block text-xs uppercase text-zinc-500">Topics</span>
        <span>{topics.slice(0, 5).join(", ")}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create repo list component**

Create `src/components/discovery/repo-list.tsx`:

```tsx
import type { RepoWithScore } from "@/domain/types";

type RepoListProps = {
  repos: RepoWithScore[];
  selectedRepoId: string;
};

export function RepoList({ repos, selectedRepoId }: RepoListProps) {
  return (
    <section className="space-y-3">
      {repos.map((repo) => (
        <article
          key={repo.id}
          className={`border p-4 ${
            repo.id === selectedRepoId ? "border-emerald-400 bg-emerald-400/10" : "border-zinc-800 bg-zinc-900"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">{repo.fullName}</h2>
              <p className="mt-1 text-sm leading-5 text-zinc-400">{repo.description}</p>
            </div>
            <div className="min-w-16 text-right">
              <span className="block text-2xl font-semibold text-emerald-300">{repo.readiness.score}</span>
              <span className="text-xs text-zinc-500">±{repo.readiness.confidence}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-300">
            <span className="border border-zinc-700 px-2 py-1">{repo.language}</span>
            <span className="border border-zinc-700 px-2 py-1">{repo.stars.toLocaleString()} stars</span>
            <span className="border border-zinc-700 px-2 py-1">{repo.metrics.maintainerResponseHours ?? "?"}h response</span>
            {repo.hasGoodFirstIssue ? <span className="border border-emerald-500 px-2 py-1 text-emerald-200">good first issue</span> : null}
          </div>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Create score panel component**

Create `src/components/discovery/score-panel.tsx`:

```tsx
import type { RepoWithScore } from "@/domain/types";

type ScorePanelProps = {
  repo: RepoWithScore;
};

export function ScorePanel({ repo }: ScorePanelProps) {
  return (
    <aside className="border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Readiness Score</h2>
          <p className="text-sm text-zinc-400">{repo.fullName}</p>
        </div>
        <div className="text-right">
          <span className="block text-4xl font-semibold text-emerald-300">{repo.readiness.score}</span>
          <span className="text-xs text-zinc-500">confidence ±{repo.readiness.confidence}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {repo.readiness.breakdown.map((part) => (
          <div key={part.key}>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-200">{part.label}</span>
              <span className="text-zinc-400">{part.weightedScore}</span>
            </div>
            <div className="mt-1 h-2 bg-zinc-800">
              <div className="h-2 bg-emerald-400" style={{ width: `${part.score}%` }} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{part.raw}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-300">{repo.readiness.explanation}</p>

      {repo.readiness.warnings.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-amber-200">
          {repo.readiness.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
```

- [ ] **Step 4: Create issue list component**

Create `src/components/discovery/issue-list.tsx`:

```tsx
import type { IssueWithScore } from "@/domain/types";

type IssueListProps = {
  issues: IssueWithScore[];
};

export function IssueList({ issues }: IssueListProps) {
  return (
    <section className="border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-semibold text-white">Contribution-ready issues</h2>
      <div className="mt-4 space-y-3">
        {issues.map((issue) => (
          <article key={issue.id} className="border border-zinc-800 p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-white">#{issue.number} {issue.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">{issue.labels.join(", ")}</p>
              </div>
              <span className="text-lg font-semibold text-emerald-300">{issue.readiness.score}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create dashboard component**

Create `src/components/discovery/discovery-dashboard.tsx`:

```tsx
import type { IssueWithScore, RepoWithScore } from "@/domain/types";
import { FilterSummary } from "./filter-summary";
import { IssueList } from "./issue-list";
import { RepoList } from "./repo-list";
import { ScorePanel } from "./score-panel";

type DiscoveryDashboardProps = {
  repos: RepoWithScore[];
  total: number;
  facets: {
    languages: string[];
    topics: string[];
  };
  issues: IssueWithScore[];
};

export function DiscoveryDashboard({ repos, total, facets, issues }: DiscoveryDashboardProps) {
  const selectedRepo = repos[0];

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-6 text-zinc-100">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">ContribRadar</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Contribution Intelligence</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Find contribution-ready repositories with deterministic scores and visible evidence.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-zinc-400">
            <div className="border border-zinc-800 px-3 py-2">
              <strong className="block text-lg text-white">80+</strong>
              ready
            </div>
            <div className="border border-zinc-800 px-3 py-2">
              <strong className="block text-lg text-white">5</strong>
              signals
            </div>
            <div className="border border-zinc-800 px-3 py-2">
              <strong className="block text-lg text-white">0</strong>
              black box
            </div>
          </div>
        </header>

        <FilterSummary total={total} languages={facets.languages} topics={facets.topics} />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <RepoList repos={repos} selectedRepoId={selectedRepo.id} />
          <div className="space-y-5">
            <ScorePanel repo={selectedRepo} />
            <IssueList issues={issues} />
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Wire dashboard into the homepage**

Replace `src/app/page.tsx`:

```tsx
import { DiscoveryDashboard } from "@/components/discovery/discovery-dashboard";
import { discoverIssues, discoverRepositories } from "@/server/discovery";

export default function HomePage() {
  const repoResult = discoverRepositories({
    minScore: 50,
    sort: "score",
    page: 1,
    limit: 10
  });
  const issueResult = discoverIssues({
    minIssueScore: 50,
    hasNoAssignee: true,
    page: 1,
    limit: 5
  });

  return (
    <DiscoveryDashboard
      repos={repoResult.repos}
      total={repoResult.total}
      facets={repoResult.facets}
      issues={issueResult.issues}
    />
  );
}
```

- [ ] **Step 7: Verify UI compiles**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: PASS. TypeScript accepts the components and the homepage renders with the discovery dashboard.

- [ ] **Step 8: Commit discovery UI**

Run:

```powershell
git add src/app/page.tsx src/components/discovery
git commit -m "feat: add discovery dashboard"
```

Expected: commit succeeds.

## Task 9: Documentation And Final Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# ContribRadar Core MVP

ContribRadar is a contribution intelligence layer for GitHub repositories. This MVP focuses on deterministic readiness scoring, explainable repo discovery, issue discovery, and basic watchlist APIs.

## Stack

- Next.js 15 App Router
- TypeScript strict
- Tailwind CSS
- Vitest
- Prisma with PostgreSQL provider

## Local Setup

Install dependencies:

```powershell
npm install
```

Run tests:

```powershell
npm test
```

Validate Prisma schema:

```powershell
npm run prisma:validate
```

Run the app:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## MVP Scope

Included:

- Repository discovery with filters.
- Repository readiness score.
- Issue readiness score.
- Explainability breakdowns.
- Basic watchlist API.
- PostgreSQL Prisma schema for core entities.

Out of scope:

- Billing.
- Team dashboards.
- AI recommendations.
- Slack, Discord, email, and webhook alert delivery.
- Bounty and hackathon modules.
```

- [ ] **Step 2: Run full tests**

Run:

```powershell
npm test
```

Expected: PASS across seed, scoring, discovery, and watchlist tests.

- [ ] **Step 3: Validate Prisma schema**

Run:

```powershell
npm run prisma:validate
```

Expected: PASS with a valid schema message.

- [ ] **Step 4: Build the app**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: PASS with type checking, the `/` route, and API routes compiled.

- [ ] **Step 5: Start dev server**

Run:

```powershell
npm run dev
```

Expected: local server starts on `http://localhost:3000`.

- [ ] **Step 6: Commit README and verification updates**

Run:

```powershell
git add README.md
git commit -m "docs: add local setup guide"
```

Expected: commit succeeds.

## Self-Review Notes

- Spec coverage: repo discovery, issue discovery, readiness scoring, explainability, watchlists, Prisma schema, API surface, UI, error handling, and tests are covered by Tasks 1-9.
- Scope control: Team, Stripe, AI recommendations, external alert delivery, bounty, hackathon, and public API key management are excluded from implementation tasks.
- Data flow: seed data feeds scoring, discovery services, API routes, UI, and Prisma seed script.
- Type consistency: `Repository`, `Issue`, `ScoreResult`, `RepoWithScore`, `IssueWithScore`, and `Watchlist` are defined before use and reused across later tasks.

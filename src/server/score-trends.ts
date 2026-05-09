const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ScoreLogRecord = {
  calculatedAt: Date;
  oldScore: unknown;
  newScore: unknown;
  deltaReason: unknown;
};

type RepositoryRecord = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  scoreLogs: ScoreLogRecord[];
};

export type ScoreTrendClient = {
  repository: {
    findFirst: (args: unknown) => Promise<RepositoryRecord | null>;
  };
};

export type ScoreTrendPoint = {
  date: string;
  score: number;
};

export type ScoreTrendAnnotation = {
  date: string;
  message: string;
};

type ScoreTrendResponse =
  | {
      status: 200;
      data: {
        repository: {
          id: string;
          fullName: string;
        };
        points: ScoreTrendPoint[];
        annotations: ScoreTrendAnnotation[];
      };
      error?: never;
    }
  | {
      status: 404;
      data?: never;
      error: {
        code: "REPOSITORY_NOT_FOUND";
        message: string;
      };
    };

export async function getRepositoryScoreTrend(
  client: ScoreTrendClient,
  owner: string,
  repo: string,
  now = new Date()
): Promise<ScoreTrendResponse> {
  const repository = await client.repository.findFirst({
    where: {
      owner: { equals: owner, mode: "insensitive" },
      name: { equals: repo, mode: "insensitive" }
    },
    include: {
      scoreLogs: {
        orderBy: { calculatedAt: "desc" },
        take: 60
      }
    }
  });

  if (!repository) {
    return {
      status: 404,
      error: {
        code: "REPOSITORY_NOT_FOUND",
        message: `Repository ${owner}/${repo} was not found.`
      }
    };
  }

  const cutoff = now.getTime() - 30 * MS_PER_DAY;
  const logs = repository.scoreLogs
    .filter((log) => log.calculatedAt.getTime() >= cutoff)
    .sort((left, right) => left.calculatedAt.getTime() - right.calculatedAt.getTime());

  return {
    status: 200,
    data: {
      repository: {
        id: repository.id,
        fullName: repository.fullName
      },
      points: logs.map((log) => ({
        date: formatDate(log.calculatedAt),
        score: toNumber(log.newScore)
      })),
      annotations: logs.flatMap(toAnnotation)
    }
  };
}

function toAnnotation(log: ScoreLogRecord): ScoreTrendAnnotation[] {
  const oldScore = toNumber(log.oldScore);
  const newScore = toNumber(log.newScore);
  const delta = newScore - oldScore;

  if (Math.abs(delta) <= 5) {
    return [];
  }

  const verb = delta > 0 ? "increased" : "dropped";
  const explanation = scoreExplanation(log.deltaReason);

  return [
    {
      date: formatDate(log.calculatedAt),
      message: `Score ${verb} from ${oldScore} to ${newScore} because ${explanation}`
    }
  ];
}

function scoreExplanation(value: unknown): string {
  if (value && typeof value === "object" && "explanation" in value && typeof value.explanation === "string") {
    return value.explanation;
  }

  return "readiness metrics changed.";
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

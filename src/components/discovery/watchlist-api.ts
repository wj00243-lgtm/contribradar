export type WatchlistFilters = {
  languages: string[];
  topics: string[];
  minScore: number;
};

export type WatchlistRequest = {
  userId: "user_demo";
  name: string;
  description: string;
  filters: WatchlistFilters;
  alertEnabled: false;
  digestFrequency: "weekly";
};

type BuildWatchlistRequestInput = {
  name: string;
  filters: WatchlistFilters;
};

export function buildWatchlistRequest({ name, filters }: BuildWatchlistRequestInput): WatchlistRequest {
  return {
    userId: "user_demo",
    name: name.trim(),
    description: "Saved from the discovery dashboard.",
    filters: {
      languages: [...filters.languages],
      topics: [...filters.topics],
      minScore: filters.minScore
    },
    alertEnabled: false,
    digestFrequency: "weekly"
  };
}

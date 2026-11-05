export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  lectures: {
    all: () => ["lectures"] as const,
    list: (filters?: Record<string, unknown>) => ["lectures", "list", filters] as const,
    detail: (id: string) => ["lectures", "detail", id] as const,
  },
  jobs: {
    byLecture: (lectureId: string) => ["jobs", "lecture", lectureId] as const,
  },
  transcripts: {
    byLecture: (lectureId: string) => ["transcripts", "lecture", lectureId] as const,
  },
  benchmark: {
    results: () => ["benchmark", "results"] as const,
  },
} as const;

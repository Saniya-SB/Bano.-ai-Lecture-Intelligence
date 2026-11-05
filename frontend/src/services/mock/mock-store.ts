import { env } from "@/config/env";
import { LectureDto, JobDto, UserDto } from "@/types/api/common";
import { MOCK_LECTURES, MOCK_JOBS, MOCK_USER } from "./fixtures";
import { ApiError } from "@/types/domain/common";

export async function simulateLatency(scenario?: string): Promise<void> {
  const currentScenario = scenario || env.MOCK_SCENARIO;
  if (currentScenario === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return;
  }
  // Standard deterministic latency (300ms)
  await new Promise((resolve) => setTimeout(resolve, 300));
}

class MockStore {
  private lectures: LectureDto[] = [];
  private jobs: Record<string, JobDto> = {};
  private currentUser: UserDto | null = null;
  private isAuthenticated = true;

  constructor() {
    this.reset();
  }

  reset() {
    this.lectures = [...MOCK_LECTURES];
    this.jobs = { ...MOCK_JOBS };
    this.currentUser = { ...MOCK_USER };
    this.isAuthenticated = true;
  }

  private checkErrors() {
    if (env.MOCK_SCENARIO === "errors") {
      throw new ApiError({
        kind: "server",
        status: 500,
        userMessage: "Simulated server failure scenario is active.",
      });
    }
  }

  async getCurrentUser(): Promise<UserDto | null> {
    await simulateLatency();
    this.checkErrors();
    if (!this.isAuthenticated) {
      throw new ApiError({
        kind: "unauthorized",
        status: 401,
        userMessage: "You are not authenticated in mock mode.",
      });
    }
    return this.currentUser;
  }

  async getLectures(): Promise<LectureDto[]> {
    await simulateLatency();
    this.checkErrors();

    if (env.MOCK_SCENARIO === "empty") {
      return [];
    }

    return [...this.lectures];
  }

  async getLectureById(id: string): Promise<LectureDto> {
    await simulateLatency();
    this.checkErrors();

    const lecture = this.lectures.find((l) => l.id === id);
    if (!lecture) {
      throw new ApiError({
        kind: "not-found",
        status: 404,
        userMessage: `Lecture with ID ${id} was not found.`,
      });
    }
    return lecture;
  }

  async createLecture(params: {
    title: string;
    subject: string;
    topic?: string;
  }): Promise<LectureDto> {
    await simulateLatency();
    this.checkErrors();

    const newId = `lec_${Date.now()}`;
    const newLecture: LectureDto = {
      id: newId,
      title: params.title,
      subject: params.subject,
      topic: params.topic,
      duration_seconds: 0,
      status: "uploaded",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.lectures.unshift(newLecture);

    this.jobs[newId] = {
      id: `job_${Date.now()}`,
      lecture_id: newId,
      stage: "uploading",
      progress_percent: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return newLecture;
  }

  async updateLecture(id: string, updates: Partial<LectureDto>): Promise<LectureDto> {
    await simulateLatency();
    this.checkErrors();

    const index = this.lectures.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new ApiError({
        kind: "not-found",
        status: 404,
        userMessage: `Lecture with ID ${id} was not found.`,
      });
    }

    const updated = {
      ...this.lectures[index]!,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.lectures[index] = updated;
    return updated;
  }

  async deleteLecture(id: string): Promise<void> {
    await simulateLatency();
    this.checkErrors();

    this.lectures = this.lectures.filter((l) => l.id !== id);
    delete this.jobs[id];
  }

  async getJob(lectureId: string): Promise<JobDto | null> {
    await simulateLatency();
    this.checkErrors();

    return this.jobs[lectureId] || null;
  }

  setAuthenticated(status: boolean) {
    this.isAuthenticated = status;
  }
}

export const mockStore = new MockStore();

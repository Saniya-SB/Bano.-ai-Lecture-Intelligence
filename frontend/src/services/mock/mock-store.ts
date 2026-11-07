import { env } from "@/config/env";
import { LectureDto, JobDto, UserDto } from "@/types/api/common";
import { MOCK_LECTURES, MOCK_JOBS, MOCK_USER, MOCK_TRANSCRIPTS, MOCK_LEARNING_MATERIALS, MOCK_QUIZ_TEMPLATES } from "./fixtures";
import { LearningMaterialsDto, QuizDto } from "@/types/api/materials";
import { TranscriptDto } from "@/types/api/transcript";
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
  private transcripts: Record<string, TranscriptDto> = {};
  private materials: Record<string, LearningMaterialsDto> = {};
  private quizzes: Record<string, QuizDto> = {};
  private currentUser: UserDto | null = null;
  private isAuthenticated = true;
  private readonly USER_STORAGE_KEY= "bano_mock_user";
  private readonly AUTH_STORAGE_KEY= "bano_mock_authenticated"; 
  private readonly DATA_STORAGE_KEY= "bano_mock_data";

  constructor() {
    this.reset();
    this.restorePersistedState();
  }

  reset() {
    this.lectures = [...MOCK_LECTURES];
    this.jobs = { ...MOCK_JOBS };
    this.transcripts = { ...MOCK_TRANSCRIPTS };
    this.materials = { ...MOCK_LEARNING_MATERIALS };
    this.currentUser = { ...MOCK_USER };
    this.isAuthenticated = true;
  }
  private restorePersistedState() {
  if (typeof window === "undefined") return;

  const savedData = window.localStorage.getItem(this.DATA_STORAGE_KEY);
  if (!savedData) return;

  try {
    const data = JSON.parse(savedData);

    if (Array.isArray(data.lectures) && data.jobs) {
      this.lectures = data.lectures;
      this.jobs = data.jobs;
    }
  } catch {
    window.localStorage.removeItem(this.DATA_STORAGE_KEY);
  }
}

private persistState() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    this.DATA_STORAGE_KEY,
    JSON.stringify({
      lectures: this.lectures,
      jobs: this.jobs,
    })
  );
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
    if (typeof window !== "undefined") {
      const storedAuth = window.localStorage.getItem(this.AUTH_STORAGE_KEY);

if (storedAuth !== null) {
  this.isAuthenticated = storedAuth === "true";
}
  const storedUser = window.localStorage.getItem(this.USER_STORAGE_KEY);

  if (storedUser) {
    try {
      this.currentUser = JSON.parse(storedUser) as UserDto;
    } catch {
      window.localStorage.removeItem(this.USER_STORAGE_KEY);
    }
  }
}
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
    this.persistState();

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

  /**
   * Simulates a file or recording upload with progress callbacks.
   * Completely separate from real API — no network calls are made.
   * Progress fires at 20%, 50%, 80%, then 100% on completion.
   */
  async simulateFileUpload(
    params: { title: string; subject: string; topic?: string },
    onProgress?: (percent: number) => void
  ): Promise<LectureDto> {
    this.checkErrors();

    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const latency = env.MOCK_SCENARIO === "slow" ? 600 : 200;

    onProgress?.(20);
    await delay(latency);
    onProgress?.(50);
    await delay(latency);
    onProgress?.(80);
    await delay(latency);

    // Create the lecture record in mock store
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
    this.persistState();

    onProgress?.(100);
    return newLecture;
  }

  async getJob(lectureId: string): Promise<JobDto | null> {
    await simulateLatency();
    this.checkErrors();

    const job = this.jobs[lectureId];
    if (!job) return null;

    if (job.stage !== "completed" && job.stage !== "failed") {
      const stages: Array<JobDto["stage"]> = [
        "uploading",
        "validating",
        "preparing_audio",
        "transcribing",
        "processing_transcript",
        "generating_learning_material",
        "completed",
      ];
      const currentIndex = stages.indexOf(job.stage);
      if (currentIndex !== -1 && currentIndex < stages.length - 1) {
        const nextStage = stages[currentIndex + 1]!;
        job.stage = nextStage;
        job.progress_percent = Math.min(100, Math.round(((currentIndex + 2) / stages.length) * 100));
        job.updated_at = new Date().toISOString();

        if (nextStage === "completed") {
          const lec = this.lectures.find((l) => l.id === lectureId);
          if (lec) lec.status = "completed";
        }
        this.persistState();
      }
    }

    return { ...job };
  }

  async retryJob(lectureId: string): Promise<JobDto> {
    await simulateLatency();
    this.checkErrors();

    const job: JobDto = this.jobs[lectureId] || {
      id: `job_${Date.now()}`,
      lecture_id: lectureId,
      stage: "uploading",
      progress_percent: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    job.stage = "uploading";
    job.progress_percent = 10;
    job.error_message = undefined;
    job.updated_at = new Date().toISOString();
    this.jobs[lectureId] = job;

    const lec = this.lectures.find((l) => l.id === lectureId);
    if (lec) lec.status = "processing";
    this.persistState();
    return { ...job };
  }

  async getLearningMaterials(lectureId: string): Promise<LearningMaterialsDto | null> {
    await simulateLatency();
    this.checkErrors();

    if (env.MOCK_SCENARIO === "empty") {
      return null;
    }

    return this.materials[lectureId] || null;
  }

  async generateQuiz(lectureId: string, numQuestions = 5): Promise<QuizDto> {
    await simulateLatency();
    this.checkErrors();

    const boundedCount = Math.min(15, Math.max(1, numQuestions));
    const selected = MOCK_QUIZ_TEMPLATES.slice(0, boundedCount);

    const quiz: QuizDto = {
      lecture_id: lectureId,
      is_ai_generated: true,
      disclaimer: "This quiz is AI-generated from the lecture audio transcript.",
      questions: selected,
    };

    this.quizzes[lectureId] = quiz;
    return quiz;
  }

  async getQuiz(lectureId: string): Promise<QuizDto | null> {
    await simulateLatency();
    this.checkErrors();

    return this.quizzes[lectureId] || null;
  }

  async getTranscript(lectureId: string): Promise<TranscriptDto | null> {
    await simulateLatency();
    this.checkErrors();

    if (env.MOCK_SCENARIO === "empty") {
      return null;
    }

    return this.transcripts[lectureId] || null;
  }

  // setAuthenticated(status: boolean) {
  //   this.isAuthenticated = status;
  // }
  registerUser(data: { full_name: string; email: string }) {
  this.currentUser = {
    id: `usr_${Date.now()}`,
    email: data.email,
    full_name: data.full_name,
    created_at: new Date().toISOString(),
  };

  this.isAuthenticated = true;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      this.USER_STORAGE_KEY,
      JSON.stringify(this.currentUser)
    );
  }
}
setAuthenticated(status: boolean) {
  this.isAuthenticated = status;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      this.AUTH_STORAGE_KEY,
      String(status)
    );

    if (!status) {
      window.localStorage.removeItem(this.USER_STORAGE_KEY);
      this.currentUser = null;
    }
  }
}
}

export const mockStore = new MockStore();

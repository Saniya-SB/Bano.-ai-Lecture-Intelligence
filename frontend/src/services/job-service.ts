import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { JobDto } from "@/types/api/common";
import { Job } from "@/types/domain/common";
import { mapJobDtoToDomain } from "./adapters/job-adapter";

export const jobService = {
  /**
   * Fetches the current processing job for a lecture.
   *
   * PROVISIONAL: Pending Owais confirmation of Q7:
   * (Whether endpoint is GET /jobs/{id} or GET /lectures/{lectureId}/job).
   */
  async getJob(lectureId: string): Promise<Job | null> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.getJob(lectureId);
      return dto ? mapJobDtoToDomain(dto) : null;
    }

    try {
      const dto = await apiClient<JobDto>(`/jobs/${lectureId}`);
      return mapJobDtoToDomain(dto);
    } catch {
      return null;
    }
  },

  /**
   * Retries a failed processing job.
   * Gated behind FEATURES.processingRetry capability flag.
   * PROVISIONAL: Pending Owais confirmation of Q9.
   */
  async retryJob(lectureId: string): Promise<Job> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.retryJob(lectureId);
      return mapJobDtoToDomain(dto);
    }

    const dto = await apiClient<JobDto>(`/jobs/${lectureId}/retry`, {
      method: "POST",
    });
    return mapJobDtoToDomain(dto);
  },
};

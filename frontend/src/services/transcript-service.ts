import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { TranscriptDto } from "@/types/api/transcript";
import { Transcript } from "@/types/domain/transcript";
import { mapTranscriptDtoToDomain } from "./adapters/transcript-adapter";

export const transcriptService = {
  /**
   * Fetches transcript for a given lecture.
   *
   * PROVISIONAL: Pending Owais confirmation of Q10 (bilingual shape).
   */
  async getTranscript(lectureId: string): Promise<Transcript | null> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.getTranscript(lectureId);
      return dto ? mapTranscriptDtoToDomain(dto) : null;
    }

    try {
      const dto = await apiClient<TranscriptDto>(
        `/lectures/${lectureId}/transcripts`
      );
      return mapTranscriptDtoToDomain(dto);
    } catch {
      return null;
    }
  },
};

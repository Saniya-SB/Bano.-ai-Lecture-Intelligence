import { env } from "@/config/env";
import { apiClient } from "./api-client";

export interface TranscriptDto {
  id: string;
  lecture_id: string;
  roman_segments: { id: string; start_time: number; end_time: number; text: string }[];
  devanagari_segments: { id: string; start_time: number; end_time: number; text: string }[];
}

export const transcriptService = {
  async getTranscript(lectureId: string): Promise<TranscriptDto | null> {
    if (env.USE_MOCK_API) {
      return {
        id: `tr_${lectureId}`,
        lecture_id: lectureId,
        roman_segments: [
          {
            id: "seg_1",
            start_time: 0,
            end_time: 12,
            text: "Aaj hum binary search tree ke basic concepts aur insertion operation discuss karenge.",
          },
          {
            id: "seg_2",
            start_time: 13,
            end_time: 25,
            text: "Tree structure mein har node ke paas maximum do children ho sakte hain: left child aur right child.",
          },
        ],
        devanagari_segments: [
          {
            id: "seg_1",
            start_time: 0,
            end_time: 12,
            text: "आज हम बाइनरी सर्च ट्री के बेसिक कॉन्सेप्ट्स और इंसर्शन ऑपरेशन डिस्कस करेंगे।",
          },
          {
            id: "seg_2",
            start_time: 13,
            end_time: 25,
            text: "ट्री स्ट्रक्चर में हर नोड के पास मैक्सिमम दो चिल्ड्रन हो सकते हैं: लेफ्ट चाइल्ड और राइट चाइल्ड।",
          },
        ],
      };
    }
    return apiClient<TranscriptDto>(`/lectures/${lectureId}/transcripts`);
  },
};

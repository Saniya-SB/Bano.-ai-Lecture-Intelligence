import { LectureDto, JobDto, UserDto } from "@/types/api/common";

export const MOCK_USER: UserDto = {
  id: "usr_mock_1",
  email: "student@bano.ai",
  full_name: "Aman Sharma",
  created_at: "2026-11-01T10:00:00Z",
};

export const MOCK_LECTURES: LectureDto[] = [
  {
    id: "lec_101",
    title: "Data Structures - Binary Search Trees",
    subject: "Computer Science",
    topic: "Tree Traversals and Complexity",
    duration_seconds: 2840, // ~47 mins
    status: "completed",
    created_at: "2026-11-04T09:30:00Z",
    updated_at: "2026-11-04T10:20:00Z",
  },
  {
    id: "lec_102",
    title: "Operating Systems - Process Scheduling",
    subject: "Computer Science",
    topic: "Round Robin and Priority Scheduling",
    duration_seconds: 3600, // 60 mins
    status: "generating_notes",
    created_at: "2026-11-04T11:15:00Z",
    updated_at: "2026-11-04T11:45:00Z",
  },
  {
    id: "lec_103",
    title: "Digital Electronics - Karnaugh Maps",
    subject: "Electronics",
    topic: "4-Variable K-Map Minimisation",
    duration_seconds: 1920,
    status: "transcribing",
    created_at: "2026-11-04T13:00:00Z",
    updated_at: "2026-11-04T13:10:00Z",
  },
  {
    id: "lec_104",
    title: "Thermodynamics - Second Law Analysis",
    subject: "Mechanical Engineering",
    topic: "Carnot Engine & Entropy",
    duration_seconds: 3100,
    status: "processing",
    created_at: "2026-11-04T14:10:00Z",
    updated_at: "2026-11-04T14:15:00Z",
  },
  {
    id: "lec_105",
    title: "Fluid Mechanics - Bernoulli Equation",
    subject: "Civil Engineering",
    topic: "Venturi Meter Application",
    duration_seconds: 1540,
    status: "uploaded",
    created_at: "2026-11-04T15:00:00Z",
    updated_at: "2026-11-04T15:00:00Z",
  },
  {
    id: "lec_106",
    title: "Signals and Systems - Fourier Transform",
    subject: "Electrical Engineering",
    topic: "Continuous Time Fourier Transform",
    duration_seconds: 2400,
    status: "failed",
    created_at: "2026-11-03T16:00:00Z",
    updated_at: "2026-11-03T16:05:00Z",
  },
];

export const MOCK_JOBS: Record<string, JobDto> = {
  lec_101: {
    id: "job_101",
    lecture_id: "lec_101",
    stage: "completed",
    progress_percent: 100,
    created_at: "2026-11-04T09:30:00Z",
    updated_at: "2026-11-04T10:20:00Z",
  },
  lec_102: {
    id: "job_102",
    lecture_id: "lec_102",
    stage: "generating_learning_material",
    progress_percent: 85,
    created_at: "2026-11-04T11:15:00Z",
    updated_at: "2026-11-04T11:45:00Z",
  },
  lec_103: {
    id: "job_103",
    lecture_id: "lec_103",
    stage: "transcribing",
    progress_percent: 45,
    created_at: "2026-11-04T13:00:00Z",
    updated_at: "2026-11-04T13:10:00Z",
  },
  lec_104: {
    id: "job_104",
    lecture_id: "lec_104",
    stage: "preparing_audio",
    progress_percent: 20,
    created_at: "2026-11-04T14:10:00Z",
    updated_at: "2026-11-04T14:15:00Z",
  },
  lec_105: {
    id: "job_105",
    lecture_id: "lec_105",
    stage: "uploading",
    progress_percent: 5,
    created_at: "2026-11-04T15:00:00Z",
    updated_at: "2026-11-04T15:00:00Z",
  },
  lec_106: {
    id: "job_106",
    lecture_id: "lec_106",
    stage: "failed",
    error_message: "Audio stream was truncated or corrupted during upload.",
    created_at: "2026-11-03T16:00:00Z",
    updated_at: "2026-11-03T16:05:00Z",
  },
};

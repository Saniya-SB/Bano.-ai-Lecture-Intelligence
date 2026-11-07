# API Proposal: Learning Material, Quizzes & Transcript Segment Classification

## Context & Objectives
To support Bano.ai's Lecture Intelligence pipeline (processing Hinglish lectures into structured study material), the backend introduces:
1. **Segment Classification** (`segment_type`) on existing transcript endpoints so non-academic talk (admin announcements, chit-chat) is separated from core concepts.
2. **Unified Learning Materials Endpoint** (`/lectures/{id}/materials`) delivering notes, summary, key concepts, glossary, important questions, and extracted announcements.
3. **On-Demand Quiz Generation** (`/lectures/{id}/quiz`) generating self-assessment questions grounded strictly in concept/example segments.

---

## 1. Updated Existing Endpoint: `GET /api/v1/lectures/{id}/transcripts`

### Existing Frontend Interface (`TranscriptDto`):
```typescript
export interface TranscriptDto {
  id: string;
  lecture_id: string;
  roman_segments: { id: string; start_time: number; end_time: number; text: string }[];
  devanagari_segments: { id: string; start_time: number; end_time: number; text: string }[];
}
```

### Proposed Backward-Compatible Extension:
Adds `segment_type` to both Roman and Devanagari segment items:
```typescript
export type SegmentType = "concept" | "example" | "admin" | "off_topic";

export interface TranscriptSegmentDto {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
  segment_type: SegmentType; // New field (defaults to 'concept' if unclassified)
}

export interface TranscriptDto {
  id: string;
  lecture_id: string;
  roman_segments: TranscriptSegmentDto[];
  devanagari_segments: TranscriptSegmentDto[];
}
```
* **Frontend Handling**:
  - `off_topic` segments are **never deleted**. The frontend UI renders them with a distinctive style (e.g. muted text, tag badge, or collapsible container).
  - `admin` segments can be highlighted or flagged as announcements.

---

## 2. New Endpoint: `GET /api/v1/lectures/{id}/materials`

Returns all AI-generated study materials produced by the combined extraction call.

### Response JSON (`200 OK`):
```json
{
  "lecture_id": "lec_101",
  "is_ai_generated": true,
  "disclaimer": "This content is AI-generated from the lecture audio transcript. It reflects synthesized study material and is never a teacher quote.",
  "prompt_version": "v1.0",
  "model_name": "gemini-3.1-flash-lite",
  "cache_hit": false,
  "summary": {
    "short": "High-level 2-3 sentence overview of the lecture.",
    "detailed": "Multi-paragraph comprehensive breakdown of principles covered."
  },
  "notes": [
    {
      "heading": "Binary Search Tree Properties",
      "bullet_points": [
        "Left subtree keys are strictly less than parent node.",
        "Right subtree keys are strictly greater than parent node."
      ],
      "referenced_segment_ids": ["seg_1"],
      "referenced_time_ranges": [{"start": 0.0, "end": 12.0}]
    }
  ],
  "key_concepts": [
    {
      "concept": "Binary Search Tree (BST)",
      "explanation": "A node-based hierarchical tree data structure enabling average O(log N) operations.",
      "referenced_segment_ids": ["seg_1"],
      "referenced_time_ranges": [{"start": 0.0, "end": 12.0}]
    }
  ],
  "glossary": [
    {
      "term": "BST",
      "definition": "Binary Search Tree",
      "referenced_time_ranges": [{"start": 0.0, "end": 12.0}]
    }
  ],
  "important_questions": [
    {
      "question": "What is the worst-case time complexity of searching in an unbalanced BST?",
      "suggested_answer": "O(N), which happens when elements are inserted in sorted order causing skew.",
      "referenced_time_ranges": [{"start": 13.0, "end": 25.0}]
    }
  ],
  "announcements": [
    {
      "text": "Assignment 2 is due next Tuesday by 5 PM.",
      "referenced_time_ranges": [{"start": 26.0, "end": 35.0}]
    }
  ]
}
```

---

## 3. New Endpoint: `POST /api/v1/lectures/{id}/quiz`

Generates an on-demand multiple choice quiz strictly grounded in the lecture's concept/example segments.

### Query Parameters:
- `num_questions` (optional, default `5`, max `15`)

### Response JSON (`200 OK`):
```json
{
  "lecture_id": "lec_101",
  "is_ai_generated": true,
  "disclaimer": "This quiz is AI-generated from the lecture audio transcript.",
  "questions": [
    {
      "id": "q_1",
      "question": "In a Binary Search Tree, where are nodes with values smaller than the root stored?",
      "options": [
        "Left subtree",
        "Right subtree",
        "Root node",
        "Leaves only"
      ],
      "correct_option_index": 0,
      "explanation": "By definition of BST property, all keys in the left subtree must be less than the root key.",
      "referenced_segment_ids": ["seg_1"],
      "referenced_time_ranges": [{"start": 0.0, "end": 12.0}]
    }
  ]
}
```

---

## 4. Frontend Action Items
1. Update `frontend/src/services/transcript-service.ts` to consume `segment_type`.
2. Add `materials-service.ts` and `quiz-service.ts` to power the corresponding tabs in `frontend/src/app/(dashboard)/lectures/[id]/page.tsx` (`Notes`, `Summary`, `Questions`, `Quiz`).
3. Off-topic segment toggle / visual style in the `Transcript` tab.


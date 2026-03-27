export interface TestBatch {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TestBatchCreate {
  name: string;
  description?: string;
}

export interface TestBatchUpdate {
  name?: string;
  description?: string;
}

export interface TestQuestion {
  id: string;
  batch_id?: string;
  question: string;
  standard_answer: string;
  keywords: string[];
  category: string;
}

export interface TestQuestionCreate {
  batch_id?: string;
  question: string;
  standard_answer: string;
  keywords: string[];
  category: string;
}

export interface TestRun {
  id: string;
  name: string;
  description?: string;
  batch_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_questions: number;
  completed_questions: number;
  average_score?: number;
  hallucination_rate?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface TestResult {
  id: string;
  test_run_id: string;
  question_id: string;
  question: string;
  standard_answer: string;
  ai_answer?: string;
  accuracy?: number;
  completeness?: number;
  actionability?: number;
  consistency?: number;
  total_score?: number;
  issues?: string;
  category: string;
  error_message?: string;
  created_at: string;
}

export interface TestReportOverview {
  test_run: TestRun;
  average_score: number;
  dimension_scores: {
    accuracy: number;
    completeness: number;
    actionability: number;
    consistency: number;
  };
  hallucination_rate: number;
  category_stats: Record<string, number>;
  total_tests: number;
}

export interface TestReportDetail {
  overview: TestReportOverview;
  results: TestResult[];
}

export interface TestProgress {
  test_run_id: string;
  status: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface VersionComparison {
  base_run: TestRun;
  compare_run: TestRun;
  score_change: number;
  category_changes: Record<string, number>;
  low_score_questions: Array<{
    question_id: string;
    question: string;
    score?: number;
  }>;
}

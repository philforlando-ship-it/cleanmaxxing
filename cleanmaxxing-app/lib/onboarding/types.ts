export type QuestionType =
  | 'number'
  | 'choice'
  | 'multi-choice'
  | 'slider'
  | 'text'
  | 'yes-no';

export type Choice = { value: string; label: string };

export type Question = {
  key: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: Choice[];
  min?: number;
  max?: number;
  maxSelections?: number;
  required: boolean;
};

export type AgeSegment = '18-24' | '25-32' | '33-40';

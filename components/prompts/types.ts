export type PromptType = 'boolean' | 'descriptive' | 'keywords';

export interface Prompt {
  id: string;
  name: string;
  prompt: string;
  type: PromptType;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

export interface PipelineStage {
  id?: string;
  prompt_id: string;
  stage_order: number;
  filter_condition?: string;
  prompt?: {
    id: string;
    name: string;
    prompt: string;
    type: PromptType;
  };
}

export interface PipelineStageWithId extends Omit<PipelineStage, 'id'> {
  id: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  library_id: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
  library_name?: string;
  stages: PipelineStage[];
}

export interface PipelineFormData {
  name: string;
  description: string;
  library_id: string;
  stages: PipelineStage[];
}

export interface PromptFormData {
  name: string;
  prompt: string;
  type: PromptType | '';
} 
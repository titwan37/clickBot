export interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ActionType = 'mouse_click' | 'wait' | 'screenshot' | 'hook_window';

export interface HookTarget {
  window_title?: string;
  browser_type?: string;
  process_name?: string;
  pid?: number;
  auto_find_by_title?: boolean;
}

export interface Step {
  step_id: string;
  action: ActionType;
  region?: Region;
  randomize?: boolean;
  button?: 'left' | 'right' | 'middle';
  clicks?: number;
  duration?: number;
  duration_range?: [number, number];
  label?: string;
  delay_seconds?: number;
  hook_target?: HookTarget;
}

export interface Job {
  job_id: string;
  name: string;
  iterations: number;
  delay_between_iterations: number;
  steps: Step[];
}

export interface LogEvent {
  timestamp: string;
  event: string;
  data: any;
}

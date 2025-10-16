// Processing result interface for comprehensive error reporting and statistics
export default interface ProcessingResult {
  success: boolean;
  totalVersions: number;
  totalBooks: number;
  totalVerses: number;
  processedVersions: string[];
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

export interface ProcessingError {
  type: "validation" | "file" | "data" | "conversion";
  message: string;
  version?: string;
  book?: string;
  chapter?: number;
  verse?: number;
  filePath?: string;
  details?: any;
}

export interface ProcessingWarning {
  type: "missing_data" | "format_issue" | "performance" | "data_integrity";
  message: string;
  version?: string;
  book?: string;
  chapter?: number;
  verse?: number;
  details?: any;
}

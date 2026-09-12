export interface RecoveryCheck {
  id: string;
  farmId: string;
  userId: string;
  initialDiseaseResultId: string;
  baselineDate: string;
  checkDate: string;
  scheduledFollowUpDays: number; // e.g. 7 or 14 days
  beforeImageUrl: string;
  afterImageUrl: string;
  initialSeverity: 'Mild' | 'Moderate' | 'Severe';
  currentSeverity: 'Resolved' | 'Mild' | 'Moderate' | 'Severe';
  recoveryProgression: 'Improved' | 'No Significant Change' | 'Worsened';
  recoveryScorePercentage: number; // e.g. +45% recovery
  observations: string[];
  nextSteps: string[];
  isCompleted: boolean;
}

export interface UserNotification {
  id: string;
  userId: string;
  farmId?: string;
  type: 'recovery_due' | 'weather_alert' | 'scan_ready' | 'disease_warning';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

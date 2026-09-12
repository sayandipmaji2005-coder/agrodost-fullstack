export interface RecoveryCheck {
  id: string;
  farmId: string;
  userId: string;
  initialDiseaseResultId: string;
  baselineDate: string;
  checkDate: string;
  scheduledFollowUpDays: number;
  beforeImageUrl: string;
  afterImageUrl: string;
  initialSeverity: 'Mild' | 'Moderate' | 'Severe';
  currentSeverity: 'Resolved' | 'Mild' | 'Moderate' | 'Severe';
  recoveryProgression: 'Improved' | 'No Significant Change' | 'Worsened';
  recoveryScorePercentage: number;
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

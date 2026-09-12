export interface HourlyWeatherForecast {
  time: string;
  temperature: number; // in Celsius
  relativeHumidity: number; // in %
  precipitationProbability: number; // in %
  precipitationMm: number; // in mm
  windSpeedKmh: number; // in km/h
}

export interface SprayWindowAdvice {
  isSafeToSprayNow: boolean;
  status: 'safe' | 'caution' | 'unsafe';
  alertMessage: string;
  hoursUntilRainRisk: number | null; // e.g. 4 if rain risk starts in 4 hours
  windSpeedKmh: number;
  precipitationNext12HoursMm: number;
  bestNextSprayWindow: string; // formatted human string, e.g. "Tomorrow, 7:00 AM - 10:00 AM"
  weatherSummary: string;
  currentTempCelsius: number;
  currentHumidity: number;
  deltaTCelsius?: number;
  wetBulbTempCelsius?: number;
  deltaTStatus?: 'optimal' | 'low_inversion' | 'high_evaporation';
}


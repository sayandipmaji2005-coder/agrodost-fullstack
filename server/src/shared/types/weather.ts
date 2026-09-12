export interface HourlyWeatherForecast {
  time: string;
  temperature: number;
  relativeHumidity: number;
  precipitationProbability: number;
  precipitationMm: number;
  windSpeedKmh: number;
}

export interface SprayWindowAdvice {
  isSafeToSprayNow: boolean;
  status: 'safe' | 'caution' | 'unsafe';
  alertMessage: string;
  hoursUntilRainRisk: number | null;
  windSpeedKmh: number;
  precipitationNext12HoursMm: number;
  bestNextSprayWindow: string;
  weatherSummary: string;
  currentTempCelsius: number;
  currentHumidity: number;
  deltaTCelsius?: number;
  wetBulbTempCelsius?: number;
  deltaTStatus?: 'optimal' | 'low_inversion' | 'high_evaporation';
}


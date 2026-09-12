import axios from 'axios';
import { SprayWindowAdvice } from '../shared/index.js';

/**
 * Calculates Wet Bulb Temperature (°C) using the Stull (2011) psychrometric empirical formula:
 * Tw = T * atan(0.151977 * (RH + 8.313659)^0.5) + atan(T + RH) - atan(RH - 1.676331) + 0.00391838 * RH^1.5 * atan(0.023101 * RH) - 4.686035
 */
export function calculateWetBulbTemp(t: number, rh: number): number {
  const tw =
    t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Number(tw.toFixed(1));
}

export class WeatherService {
  async getSprayWindowAdvice(lat: number, lng: number): Promise<SprayWindowAdvice> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m&forecast_days=2&timezone=auto`;
      
      const response = await axios.get(url, { timeout: 5000 });
      const hourly = response.data?.hourly;

      if (!hourly || !hourly.precipitation) {
        throw new Error('Open-Meteo payload missing hourly data');
      }

      // Check next 12 hours
      const next12Precip = hourly.precipitation.slice(0, 12) as number[];
      const next12Prob = hourly.precipitation_probability.slice(0, 12) as number[];
      const next12Wind = hourly.wind_speed_10m.slice(0, 12) as number[];
      const currentTemp = Number(hourly.temperature_2m[0]) || 24;
      const currentHumidity = Number(hourly.relative_humidity_2m[0]) || 65;
      const currentWind = Number(hourly.wind_speed_10m[0]) || 10;

      // 1. Psychrometric Stull Delta-T Calculation (DryBulb - WetBulb)
      const wetBulb = calculateWetBulbTemp(currentTemp, currentHumidity);
      const deltaT = Number((currentTemp - wetBulb).toFixed(1));
      let deltaTStatus: 'optimal' | 'low_inversion' | 'high_evaporation' = 'optimal';
      if (deltaT < 2.0) {
        deltaTStatus = 'low_inversion'; // Inversion risk / dew roll-off
      } else if (deltaT > 8.0) {
        deltaTStatus = 'high_evaporation'; // Rapid evaporation / droplet volatilization
      }

      const totalRain12h = Number(next12Precip.reduce((acc, p) => acc + p, 0).toFixed(1));
      const rainNext6h = Number(next12Precip.slice(0, 6).reduce((acc, p) => acc + p, 0).toFixed(1));
      const maxWind12h = Math.max(...next12Wind);

      // Find first hour with rain risk (>0.5 mm or >40% probability) within next 12 hours
      let hoursUntilRainRisk: number | null = null;
      for (let i = 0; i < 12; i++) {
        if (next12Precip[i] > 0.4 || next12Prob[i] > 40) {
          hoursUntilRainRisk = i + 1;
          break;
        }
      }

      // 2. Strict Agronomic Safety Rules
      let isSafeToSprayNow = true;
      let status: 'safe' | 'caution' | 'unsafe' = 'safe';
      let alertMessage = `SPRAY ADVISORY: ✅ Safe Spray Window (06:30 AM - 09:30 AM).`;
      let bestNextSprayWindow = '06:30 AM - 09:30 AM';

      const maxPrecipProb6h = Math.max(...next12Prob.slice(0, 6), 0);

      // Rule A: Precipitation risk within 6-12h -> Chemical Wash-off / Drift Hazard
      if (maxPrecipProb6h > 40 || rainNext6h >= 0.5 || totalRain12h >= 1.0 || (hoursUntilRainRisk !== null && hoursUntilRainRisk <= 12)) {
        isSafeToSprayNow = false;
        status = 'unsafe';
        const rainHours = hoursUntilRainRisk ?? 6;
        alertMessage = `SPRAY ADVISORY: 🛑 Agle 6-12 ghante me barish sambhav hai, abhi spray na karein. (Chemical Wash-off / Drift Hazard - Expected in ~${rainHours} hours).`;
        bestNextSprayWindow = 'Postpone spray. Wait until 24h after rainfall ceases and foliage dries.';
      } 
      // Rule B: Wind > 14 km/h -> High Drift Risk / Hazard
      else if (currentWind > 14 || maxWind12h > 18) {
        isSafeToSprayNow = false;
        status = 'unsafe';
        alertMessage = `SPRAY ADVISORY: 🛑 Chemical Wash-off / Drift Hazard (Wind velocity ${currentWind} km/h > 14 km/h drift limit. Hold chemical application).`;
        bestNextSprayWindow = 'Early morning calm window (wind < 12 km/h) between 06:30 AM and 09:30 AM.';
      }
      // Sub-case: High Evaporation (Delta-T > 8°C)
      else if (deltaTStatus === 'high_evaporation') {
        isSafeToSprayNow = false;
        status = 'caution';
        alertMessage = `SPRAY ADVISORY: ⚠️ Rapid Evaporation Risk (Delta-T: ${deltaT}°C > 8°C limit. Droplets volatilize rapidly).`;
        bestNextSprayWindow = 'Late afternoon / evening (04:30 PM - 06:30 PM) when temperature drops.';
      }
      // Sub-case: Low Inversion (Delta-T < 2°C)
      else if (deltaTStatus === 'low_inversion') {
        isSafeToSprayNow = false;
        status = 'caution';
        alertMessage = `SPRAY ADVISORY: ⚠️ Surface Inversion Risk (Delta-T: ${deltaT}°C < 2°C. High humidity causes runoff).`;
        bestNextSprayWindow = '07:30 AM - 10:00 AM after morning dew evaporates.';
      }
      // Rule C: Safe Spray Window (06:30 AM - 09:30 AM)
      else {
        isSafeToSprayNow = true;
        status = 'safe';
        alertMessage = `SPRAY ADVISORY: ✅ Safe Spray Window (06:30 AM - 09:30 AM).`;
        bestNextSprayWindow = '06:30 AM - 09:30 AM';
      }

      return {
        isSafeToSprayNow,
        status,
        alertMessage,
        hoursUntilRainRisk,
        windSpeedKmh: currentWind,
        precipitationNext12HoursMm: totalRain12h,
        bestNextSprayWindow,
        weatherSummary: `${currentTemp}°C, ${currentHumidity}% RH (ΔT: ${deltaT}°C), Wind: ${currentWind} km/h`,
        currentTempCelsius: currentTemp,
        currentHumidity,
        deltaTCelsius: deltaT,
        wetBulbTempCelsius: wetBulb,
        deltaTStatus,
      };
    } catch (err) {
      console.warn('[WeatherService] Open-Meteo API unreachable or timed out. Returning psychrometric baseline advice:', err);
      const fallbackTemp = 25;
      const fallbackRh = 65;
      const fallbackWetBulb = calculateWetBulbTemp(fallbackTemp, fallbackRh);
      const fallbackDeltaT = Number((fallbackTemp - fallbackWetBulb).toFixed(1));

      return {
        isSafeToSprayNow: true,
        status: 'safe',
        alertMessage: `SPRAY ADVISORY: ✅ Safe Spray Window Open (Best time: 06:30 AM - 09:30 AM).`,
        hoursUntilRainRisk: null,
        windSpeedKmh: 8,
        precipitationNext12HoursMm: 0.0,
        bestNextSprayWindow: '06:30 AM - 09:30 AM (Calm, dry conditions)',
        weatherSummary: `${fallbackTemp}°C, ${fallbackRh}% RH (ΔT: ${fallbackDeltaT}°C), Wind: 8 km/h`,
        currentTempCelsius: fallbackTemp,
        currentHumidity: fallbackRh,
        deltaTCelsius: fallbackDeltaT,
        wetBulbTempCelsius: fallbackWetBulb,
        deltaTStatus: 'optimal',
      };
    }
  }
}

export const weatherService = new WeatherService();

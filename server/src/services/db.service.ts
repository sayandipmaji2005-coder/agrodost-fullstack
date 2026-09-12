import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { localStore } from '../db/localStore.js';

let supabaseClient: SupabaseClient | null = null;

if (config.supabase.isConfigured) {
  try {
    supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    console.log('[AgriCare DB] Supabase PostgreSQL client initialized.');
  } catch (err) {
    console.warn('[AgriCare DB] Failed to init Supabase client, falling back to local store:', err);
  }
} else {
  console.log('[AgriCare DB] Operating in Local Storage mode (Supabase credentials not set).');
}

export class DbService {
  // Users
  async getUserByEmail(email: string) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('profiles').select('*').eq('email', email).single();
      if (error) return null;
      return data;
    }
    return localStore.getUserByEmail(email);
  }

  async getUserById(id: string) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    }
    return localStore.getUserById(id);
  }

  async createUser(profile: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('profiles').insert([profile]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase createUser failed, falling back to localStore:', err);
      }
    }
    return localStore.createUser(profile);
  }

  // Farms
  async getFarms(userId: string) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('farms').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase getFarms failed, falling back to localStore:', err);
      }
    }
    return localStore.getFarms(userId);
  }

  async getFarmById(id: string, userId: string) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('farms').select('*').eq('id', id).eq('user_id', userId).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase getFarmById failed, falling back to localStore:', err);
      }
    }
    return localStore.getFarmById(id, userId);
  }

  async createFarm(farm: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('farms').insert([farm]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase createFarm failed, falling back to localStore:', err);
      }
    }
    return localStore.createFarm(farm);
  }

  async updateFarm(id: string, userId: string, updates: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('farms').update(updates).eq('id', id).eq('user_id', userId).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase updateFarm failed, falling back to localStore:', err);
      }
    }
    return localStore.updateFarm(id, userId, updates);
  }

  async deleteFarm(id: string, userId: string) {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('farms').delete().eq('id', id).eq('user_id', userId);
        if (!error) return true;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase deleteFarm failed, falling back to localStore:', err);
      }
    }
    return localStore.deleteFarm(id, userId);
  }

  // Satellite Scans
  async getSatelliteScans(farmId: string, userId: string) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('satellite_scans').select('*').eq('farm_id', farmId).eq('user_id', userId).order('scan_date', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase getSatelliteScans failed, falling back to localStore:', err);
      }
    }
    return localStore.getSatelliteScans(farmId, userId);
  }

  async createSatelliteScan(scan: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('satellite_scans').insert([scan]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase createSatelliteScan failed, falling back to localStore:', err);
      }
    }
    return localStore.createSatelliteScan(scan);
  }

  // Camera Scans
  async createCameraScan(scan: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('camera_scans').insert([scan]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase createCameraScan failed, falling back to localStore:', err);
      }
    }
    return localStore.createCameraScan(scan);
  }

  // Disease Results
  async getDiseaseResults(userId: string, farmId?: string) {
    if (supabaseClient) {
      try {
        let query = supabaseClient.from('disease_results').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (farmId) query = query.eq('farm_id', farmId);
        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase getDiseaseResults failed, falling back to localStore:', err);
      }
    }
    return localStore.getDiseaseResults(userId, farmId);
  }

  async getDiseaseResultById(id: string, userId: string) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('disease_results').select('*').eq('id', id).eq('user_id', userId).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase getDiseaseResultById failed, falling back to localStore:', err);
      }
    }
    return localStore.getDiseaseResultById(id, userId);
  }

  async createDiseaseResult(result: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('disease_results').insert([result]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AgriCare DB] Supabase createDiseaseResult failed, falling back to localStore:', err);
      }
    }
    return localStore.createDiseaseResult(result);
  }

  // Recovery Checks
  async getRecoveryChecks(userId: string, farmId?: string) {
    if (supabaseClient) {
      let query = supabaseClient.from('recovery_checks').select('*').eq('user_id', userId).order('check_date', { ascending: false });
      if (farmId) query = query.eq('farm_id', farmId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    return localStore.getRecoveryChecks(userId, farmId);
  }

  async createRecoveryCheck(check: any) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('recovery_checks').insert([check]).select().single();
      if (error) throw error;
      return data;
    }
    return localStore.createRecoveryCheck(check);
  }

  // Notifications
  async getNotifications(userId: string) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('user_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return localStore.getNotifications(userId);
  }

  async markNotificationAsRead(id: string, userId: string) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('user_notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    }
    return localStore.markNotificationAsRead(id, userId);
  }

  // Land Cover Scans
  async getLandCoverScans(farmId?: string) {
    if (supabaseClient && farmId) {
      const { data, error } = await supabaseClient.from('land_cover_scans').select('*').eq('farm_id', farmId).order('scan_date', { ascending: false });
      if (!error && data) return data;
    }
    return localStore.getLandCoverScans(farmId);
  }

  async saveLandCoverScan(scan: any) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('land_cover_scans').insert([scan]).select().single();
        if (!error && data) return data;
      } catch (e) {
        // Fallback to local
      }
    }
    return localStore.saveLandCoverScan(scan);
  }
}

export const dbService = new DbService();

import fs from 'fs';
import path from 'path';

export interface LocalDatabaseSchema {
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    preferredLanguage: 'en' | 'hi' | 'bn';
    state?: string;
    district?: string;
    role: 'farmer' | 'agronomist' | 'admin';
    createdAt: string;
    passwordHash?: string;
  }>;
  farms: Array<{
    id: string;
    userId: string;
    name: string;
    cropType: string;
    sowingDate?: string;
    areaAcres: number;
    areaHectares: number;
    centerCoordinates: { lat: number; lng: number };
    boundary: any;
    villageOrCity?: string;
    state?: string;
    pincode?: string;
    soilType?: string;
    status: 'healthy' | 'warning' | 'critical' | 'follow_up_due';
    lastScanDate?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  satelliteScans: any[];
  cameraScans: any[];
  diseaseResults: any[];
  recoveryChecks: any[];
  userNotifications: any[];
  landCoverScans: any[];
}

const INITIAL_SEED: LocalDatabaseSchema = {
  users: [],
  farms: [],
  satelliteScans: [],
  cameraScans: [],
  diseaseResults: [],
  recoveryChecks: [],
  userNotifications: [],
  landCoverScans: []
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

export class LocalStore {
  private data: LocalDatabaseSchema;

  constructor() {
    this.data = INITIAL_SEED;
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        if (!Array.isArray(this.data.landCoverScans)) {
          this.data.landCoverScans = [];
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('LocalStore init warning: using in-memory store', err);
      this.data = INITIAL_SEED;
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('LocalStore save error:', err);
    }
  }

  // Users
  getUserByEmail(email: string) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string) {
    return this.data.users.find(u => u.id === id);
  }

  createUser(user: any) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Farms
  getFarms(userId: string) {
    return this.data.farms.filter(f => f.userId === userId);
  }

  getFarmById(id: string, userId: string) {
    return this.data.farms.find(f => f.id === id && f.userId === userId);
  }

  createFarm(farm: any) {
    this.data.farms.push(farm);
    this.save();
    return farm;
  }

  updateFarm(id: string, userId: string, updates: any) {
    const idx = this.data.farms.findIndex(f => f.id === id && f.userId === userId);
    if (idx === -1) return null;
    this.data.farms[idx] = { ...this.data.farms[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.farms[idx];
  }

  deleteFarm(id: string, userId: string) {
    const idx = this.data.farms.findIndex(f => f.id === id && f.userId === userId);
    if (idx === -1) return false;
    this.data.farms.splice(idx, 1);
    this.save();
    return true;
  }

  // Satellite Scans
  getSatelliteScans(farmId: string, userId?: string) {
    return this.data.satelliteScans.filter(s => s.farmId === farmId && (!userId || s.userId === userId));
  }

  getSatelliteScanById(id: string) {
    return this.data.satelliteScans.find(s => s.id === id);
  }

  createSatelliteScan(scan: any) {
    this.data.satelliteScans.unshift(scan);
    this.save();
    return scan;
  }

  // Camera Scans
  getCameraScans(userId: string, farmId?: string) {
    return this.data.cameraScans.filter(s => {
      const userMatch = s.userId === userId;
      return farmId ? userMatch && s.farmId === farmId : userMatch;
    });
  }

  getCameraScanById(id: string, userId: string) {
    return this.data.cameraScans.find(s => s.id === id && s.userId === userId);
  }

  createCameraScan(scan: any) {
    this.data.cameraScans.unshift(scan);
    this.save();
    return scan;
  }

  // Disease Results
  getDiseaseResults(userId: string, farmId?: string) {
    return this.data.diseaseResults.filter(d => {
      const userMatch = d.userId === userId;
      return farmId ? userMatch && d.farmId === farmId : userMatch;
    });
  }

  getDiseaseResultById(id: string, userId?: string) {
    if (!userId) {
      return this.data.diseaseResults.find(d => d.id === id);
    }
    const matched = this.data.diseaseResults.find(d => d.id === id && (d.userId === userId || d.userId === 'farmer-session'));
    if (matched) return matched;
    return this.data.diseaseResults.find(d => d.id === id);
  }

  createDiseaseResult(result: any) {
    this.data.diseaseResults.unshift(result);
    this.save();
    return result;
  }

  // Recovery Checks
  getRecoveryChecks(userId: string, farmId?: string) {
    return this.data.recoveryChecks.filter(r => {
      const userMatch = r.userId === userId;
      return farmId ? userMatch && r.farmId === farmId : userMatch;
    });
  }

  createRecoveryCheck(check: any) {
    this.data.recoveryChecks.unshift(check);
    this.save();
    return check;
  }

  // Notifications
  getNotifications(userId: string) {
    return this.data.userNotifications.filter(n => n.userId === userId);
  }

  markNotificationAsRead(id: string, userId: string) {
    const notif = this.data.userNotifications.find(n => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      this.save();
    }
    return notif;
  }

  // Land Cover Scans
  getLandCoverScans(farmId?: string) {
    if (!this.data.landCoverScans) this.data.landCoverScans = [];
    if (!farmId) return this.data.landCoverScans;
    return this.data.landCoverScans.filter(s => s.farmId === farmId);
  }

  saveLandCoverScan(scan: any) {
    if (!this.data.landCoverScans) this.data.landCoverScans = [];
    this.data.landCoverScans.unshift(scan);
    this.save();
    return scan;
  }
}

export const localStore = new LocalStore();

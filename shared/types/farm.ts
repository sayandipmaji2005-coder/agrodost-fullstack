export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lng, lat], [lng, lat], ... ] ]
}

export interface Farm {
  id: string;
  userId: string;
  name: string;
  cropType: string;
  landCoverCategory?: string;
  landCoverBreakdown?: any;
  sowingDate?: string;
  areaAcres: number;
  areaHectares: number;
  centerCoordinates: {
    lat: number;
    lng: number;
  };
  boundary: GeoPolygon;
  villageOrCity?: string;
  state?: string;
  pincode?: string;
  soilType?: string;
  soilData?: any;
  predictedCrop?: string;
  classificationConfidence?: number;
  phenologySeries?: any[];
  status: 'healthy' | 'warning' | 'critical' | 'follow_up_due';
  lastScanDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmInput {
  name: string;
  cropType?: string;
  landCoverCategory?: string;
  landCoverBreakdown?: any;
  sowingDate?: string;
  boundary: GeoPolygon;
  villageOrCity?: string;
  state?: string;
  pincode?: string;
  soilType?: string;
  soilData?: any;
  predictedCrop?: string;
  classificationConfidence?: number;
  phenologySeries?: any[];
}

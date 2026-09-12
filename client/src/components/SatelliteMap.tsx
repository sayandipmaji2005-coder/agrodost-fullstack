import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import {
  Search,
  Navigation,
  Pencil,
  Square,
  Undo2,
  Check,
  RotateCcw,
  Trash2,
  X,
  AlertTriangle,
  MapPin,
  Loader2,
} from 'lucide-react';
import { GeoPolygon, LandCoverSubZone } from '@shared/index';

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface LocationInfo {
  lat: number;
  lng: number;
  villageOrCity?: string;
  pincode?: string;
  state?: string;
  displayName?: string;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  address?: {
    village?: string;
    town?: string;
    city?: string;
    suburb?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    [key: string]: string | undefined;
  };
}

interface SatelliteMapProps {
  initialBoundary?: GeoPolygon;
  onBoundaryChange?: (boundary: GeoPolygon, areaAcres: number, areaHectares: number, center: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: LocationInfo) => void;
  height?: string;
  readOnly?: boolean;
  landCoverSubZones?: LandCoverSubZone[];
}

type DrawMode = 'idle' | 'drawing' | 'quickbox' | 'finished';

export const SatelliteMap: React.FC<SatelliteMapProps> = ({
  initialBoundary,
  onBoundaryChange,
  onLocationSelect,
  height = '500px',
  readOnly = false,
  landCoverSubZones,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer references
  const esriSatelliteLayerRef = useRef<L.TileLayer | null>(null);
  const googleHybridLayerRef = useRef<L.TileLayer | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);

  // Boundary feature layers
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const haloLayerRef = useRef<L.Polygon | null>(null);
  const tempPolylineRef = useRef<L.Polyline | null>(null);
  const tempHaloPolylineRef = useRef<L.Polyline | null>(null);
  const tempMarkersGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const handlesGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const subzonesGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const guideBoxRef = useRef<L.Rectangle | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  // Search state
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapType, setMapType] = useState<'google-hybrid' | 'esri-satellite' | 'street'>('google-hybrid');

  // Drawing & Geometry state
  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [quickBoxCorner1, setQuickBoxCorner1] = useState<[number, number] | null>(null);
  const [hasSelfIntersection, setHasSelfIntersection] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<{ acres: number; hectares: number } | null>(null);
  const [perimeterMeters, setPerimeterMeters] = useState<number>(0);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number }>({ lat: 22.8962, lng: 88.2461 });

  // Refs to avoid stale closures in Leaflet event callbacks
  const drawModeRef = useRef<DrawMode>('idle');
  drawModeRef.current = drawMode;
  const pointsRef = useRef<[number, number][]>([]);
  pointsRef.current = points;
  const quickBoxCorner1Ref = useRef<[number, number] | null>(null);
  quickBoxCorner1Ref.current = quickBoxCorner1;

  // Touch-friendly vertex handle icon creator (36px touch zone with 18px visible glowing amber circle)
  const createHandleIcon = (index: number) => {
    return L.divIcon({
      className: 'custom-vertex-handle-wrapper',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          touch-action: none;
          margin-top: -18px;
          margin-left: -18px;
        " title="Drag to adjust corner #${index + 1}">
          <div style="
            width: 18px;
            height: 18px;
            background: #F59E0B;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.7), 0 0 0 2px rgba(245, 158, 11, 0.5);
            transition: transform 0.15s ease;
          "></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Temp point dot while drawing
  const createTempPointIcon = (index: number) => {
    return L.divIcon({
      className: 'custom-temp-point-wrapper',
      html: `
        <div style="
          width: 14px;
          height: 14px;
          background: #F59E0B;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 1px 5px rgba(0,0,0,0.6);
          margin-top: -7px;
          margin-left: -7px;
        "></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  };

  // Check self-intersection using Turf.js
  const checkSelfIntersection = (pts: [number, number][]): boolean => {
    if (pts.length < 4) return false;
    try {
      const ring = pts.map(p => [p[1], p[0]]);
      ring.push([pts[0][1], pts[0][0]]);
      const poly = turf.polygon([ring]);
      const kinks = turf.kinks(poly);
      return kinks.features.length > 0;
    } catch {
      return false;
    }
  };

  // Calculate area, perimeter, and centroid
  const computeMetrics = (pts: [number, number][]) => {
    if (pts.length < 3) {
      // Linear path perimeter
      let dist = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = turf.point([pts[i][1], pts[i][0]]);
        const p2 = turf.point([pts[i + 1][1], pts[i + 1][0]]);
        dist += turf.distance(p1, p2, { units: 'meters' });
      }
      setPerimeterMeters(Math.round(dist));
      setCalculatedArea(null);
      setHasSelfIntersection(false);
      return;
    }

    try {
      const ring = pts.map(p => [p[1], p[0]]);
      ring.push([pts[0][1], pts[0][0]]);
      const geoPoly = turf.polygon([ring]);

      // Area
      const areaSqM = turf.area(geoPoly);
      const acres = Number((areaSqM / 4046.8564224).toFixed(3));
      const hectares = Number((areaSqM / 10000).toFixed(3));
      setCalculatedArea({ acres, hectares });

      // Perimeter
      let totalDist = 0;
      for (let i = 0; i < pts.length; i++) {
        const next = (i + 1) % pts.length;
        const from = turf.point([pts[i][1], pts[i][0]]);
        const to = turf.point([pts[next][1], pts[next][0]]);
        totalDist += turf.distance(from, to, { units: 'meters' });
      }
      setPerimeterMeters(Math.round(totalDist));

      // Centroid
      const centroid = turf.centroid(geoPoly);
      const center = {
        lat: Number(centroid.geometry.coordinates[1].toFixed(6)),
        lng: Number(centroid.geometry.coordinates[0].toFixed(6)),
      };
      setCenterCoords(center);

      // Self-intersection
      const kinks = turf.kinks(geoPoly);
      const isIntersecting = kinks.features.length > 0;
      setHasSelfIntersection(isIntersecting);

      if (onBoundaryChange) {
        onBoundaryChange(
          geoPoly.geometry as any,
          acres,
          hectares,
          center
        );
      }
    } catch (err) {
      console.error('Error computing boundary metrics:', err);
    }
  };

  // Render permanent polygon with white halo and draggable vertex handles
  const renderClosedPolygonWithHandles = (pts: [number, number][]) => {
    if (!mapInstanceRef.current || pts.length < 3) return;
    const map = mapInstanceRef.current;

    // Remove existing boundary layers
    if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
    if (haloLayerRef.current) map.removeLayer(haloLayerRef.current);
    handlesGroupRef.current.clearLayers();
    tempMarkersGroupRef.current.clearLayers();
    if (tempPolylineRef.current) map.removeLayer(tempPolylineRef.current);
    if (tempHaloPolylineRef.current) map.removeLayer(tempHaloPolylineRef.current);
    if (guideBoxRef.current) map.removeLayer(guideBoxRef.current);

    // 1. White halo layer (6px width, transparent fill) for contrast against dark satellite
    const halo = L.polygon(pts, {
      color: '#FFFFFF',
      weight: 6,
      opacity: 0.85,
      fill: false,
      interactive: false,
    }).addTo(map);
    haloLayerRef.current = halo;

    // 2. Main polygon layer (3.5px amber stroke, emerald fill with 0.25 opacity)
    const polygon = L.polygon(pts, {
      color: '#F59E0B',
      weight: 3.5,
      opacity: 1,
      fillColor: '#10B981',
      fillOpacity: 0.25,
      dashArray: undefined,
    }).addTo(map);
    polygonLayerRef.current = polygon;

    // 3. Attach touch-friendly draggable anchor markers if not readOnly
    if (!readOnly) {
      pts.forEach((coord, idx) => {
        const marker = L.marker(coord, {
          icon: createHandleIcon(idx),
          draggable: true,
          zIndexOffset: 1000 + idx,
        });

        marker.on('drag', (e: any) => {
          const newLatLng = e.target.getLatLng();
          const currentPts = [...pointsRef.current];
          currentPts[idx] = [newLatLng.lat, newLatLng.lng];
          pointsRef.current = currentPts;
          setPoints(currentPts);

          // Update polygon and halo in real-time
          polygon.setLatLngs(currentPts);
          halo.setLatLngs(currentPts);
          computeMetrics(currentPts);
        });

        marker.on('dragend', () => {
          computeMetrics(pointsRef.current);
        });

        handlesGroupRef.current.addLayer(marker);
      });
    }

    computeMetrics(pts);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let startLat = 22.8962;
    let startLng = 88.2461;
    const startZoom = 15;

    if (initialBoundary?.coordinates?.[0]?.length) {
      const ring = initialBoundary.coordinates[0];
      const sumLat = ring.reduce((a, b) => a + b[1], 0);
      const sumLng = ring.reduce((a, b) => a + b[0], 0);
      startLat = sumLat / ring.length;
      startLng = sumLng / ring.length;
    }

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: startZoom,
      maxZoom: 21,
    });

    // 1. Google Hybrid Satellite Imagery (Primary Layer, maxZoom 21, maxNativeZoom 20)
    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Hybrid Satellite',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 21,
      maxNativeZoom: 20,
    });

    // 2. Esri World Imagery (Upscaled with maxNativeZoom: 18 and maxZoom: 21)
    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxNativeZoom: 18,
      maxZoom: 21,
    });

    // 3. OpenStreetMap Street View
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: 21,
    });

    googleHybridLayerRef.current = googleHybrid;
    esriSatelliteLayerRef.current = esriSatellite;
    osmLayerRef.current = osm;

    // Default to Google Hybrid Satellite
    googleHybrid.addTo(map);

    // Layer groups for handles and temp markers
    map.addLayer(handlesGroupRef.current);
    map.addLayer(tempMarkersGroupRef.current);
    map.addLayer(subzonesGroupRef.current);

    // Map Click Listener for custom drawing
    map.on('click', (e: L.LeafletMouseEvent) => {
      const mode = drawModeRef.current;
      const clicked: [number, number] = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ];

      if (mode === 'drawing') {
        const nextPts = [...pointsRef.current, clicked];
        pointsRef.current = nextPts;
        setPoints(nextPts);

        // Add visual temp marker at placed point
        const marker = L.marker(clicked, {
          icon: createTempPointIcon(nextPts.length - 1),
          interactive: false,
        });
        tempMarkersGroupRef.current.addLayer(marker);

        // Update or create connecting line with halo
        if (nextPts.length >= 2) {
          if (tempPolylineRef.current) {
            tempPolylineRef.current.setLatLngs(nextPts);
          } else {
            const haloLine = L.polyline(nextPts, {
              color: '#FFFFFF',
              weight: 5,
              opacity: 0.8,
              dashArray: '5, 5',
              interactive: false,
            }).addTo(map);
            tempHaloPolylineRef.current = haloLine;

            const line = L.polyline(nextPts, {
              color: '#F59E0B',
              weight: 3,
              dashArray: '5, 5',
              interactive: false,
            }).addTo(map);
            tempPolylineRef.current = line;
          }
          if (tempHaloPolylineRef.current) {
            tempHaloPolylineRef.current.setLatLngs(nextPts);
          }
        }

        computeMetrics(nextPts);
      } else if (mode === 'quickbox') {
        const corner1 = quickBoxCorner1Ref.current;
        if (!corner1) {
          // 1st corner placed
          quickBoxCorner1Ref.current = clicked;
          setQuickBoxCorner1(clicked);

          // Initialize guide box
          const guide = L.rectangle([clicked, clicked], {
            color: '#F59E0B',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#10B981',
            fillOpacity: 0.2,
            interactive: false,
          }).addTo(map);
          guideBoxRef.current = guide;
        } else {
          // 2nd corner placed -> create 4-vertex rectangle
          const corner2 = clicked;
          const rectPts: [number, number][] = [
            [corner1[0], corner1[1]],
            [corner1[0], corner2[1]],
            [corner2[0], corner2[1]],
            [corner2[0], corner1[1]],
          ];

          pointsRef.current = rectPts;
          setPoints(rectPts);
          setQuickBoxCorner1(null);
          quickBoxCorner1Ref.current = null;
          setDrawMode('finished');
          drawModeRef.current = 'finished';

          map.getContainer().style.cursor = '';
          map.dragging.enable();

          renderClosedPolygonWithHandles(rectPts);
        }
      }
    });

    // Map Mousemove Listener for Quick Box guide preview
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (drawModeRef.current === 'quickbox' && quickBoxCorner1Ref.current && guideBoxRef.current) {
        const bounds = L.latLngBounds([quickBoxCorner1Ref.current, [e.latlng.lat, e.latlng.lng]]);
        guideBoxRef.current.setBounds(bounds);
      }
    });

    // If initial boundary is provided, render it immediately
    if (initialBoundary?.coordinates?.[0]?.length) {
      let initialPts: [number, number][] = initialBoundary.coordinates[0].map(c => [c[1], c[0]]);
      // Strip redundant closing point if present
      if (
        initialPts.length > 3 &&
        initialPts[0][0] === initialPts[initialPts.length - 1][0] &&
        initialPts[0][1] === initialPts[initialPts.length - 1][1]
      ) {
        initialPts = initialPts.slice(0, -1);
      }
      pointsRef.current = initialPts;
      setPoints(initialPts);
      setDrawMode('finished');
      drawModeRef.current = 'finished';

      renderClosedPolygonWithHandles(initialPts);
      if (polygonLayerRef.current) {
        map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [35, 35] });
      }
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [initialBoundary, readOnly]);

  // Render land-cover subzones overlay when provided
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    subzonesGroupRef.current.clearLayers();

    if (landCoverSubZones && landCoverSubZones.length > 0) {
      landCoverSubZones.forEach((subZone) => {
        if (!subZone.coordinates?.[0]) return;
        const latLngs = subZone.coordinates[0].map(
          (coord) => [coord[1], coord[0]] as [number, number]
        );

        const subPoly = L.polygon(latLngs, {
          color: subZone.color || '#22c55e',
          weight: 2,
          opacity: 0.9,
          fillColor: subZone.color || '#22c55e',
          fillOpacity: 0.4,
        });

        subPoly.bindTooltip(
          `<strong>${subZone.landCoverLabel}</strong><br/>${subZone.areaAcres.toFixed(2)} ac (${Math.round(subZone.confidence * 100)}% conf)`,
          { sticky: true }
        );

        subzonesGroupRef.current.addLayer(subPoly);
      });
    }
  }, [landCoverSubZones]);

  // Click outside to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mode Control Actions
  const startPolygonDrawing = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Reset current boundary
    clearBoundaryArtifacts();
    setPoints([]);
    pointsRef.current = [];
    setCalculatedArea(null);
    setPerimeterMeters(0);
    setHasSelfIntersection(false);

    setDrawMode('drawing');
    drawModeRef.current = 'drawing';

    // Farmer-friendly drawing mode: crosshair cursor and prevent accidental map pan slips
    map.getContainer().style.cursor = 'crosshair';
    map.dragging.disable();
  };

  const startQuickBoxDrawing = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    clearBoundaryArtifacts();
    setPoints([]);
    pointsRef.current = [];
    setQuickBoxCorner1(null);
    quickBoxCorner1Ref.current = null;
    setCalculatedArea(null);
    setPerimeterMeters(0);
    setHasSelfIntersection(false);

    setDrawMode('quickbox');
    drawModeRef.current = 'quickbox';

    map.getContainer().style.cursor = 'crosshair';
    map.dragging.disable();
  };

  const undoLastPoint = () => {
    if (pointsRef.current.length === 0 || !mapInstanceRef.current) return;

    const updated = pointsRef.current.slice(0, -1);
    pointsRef.current = updated;
    setPoints(updated);

    // Rebuild temp markers
    tempMarkersGroupRef.current.clearLayers();
    updated.forEach((pt, i) => {
      const marker = L.marker(pt, {
        icon: createTempPointIcon(i),
        interactive: false,
      });
      tempMarkersGroupRef.current.addLayer(marker);
    });

    if (updated.length >= 2) {
      if (tempPolylineRef.current) tempPolylineRef.current.setLatLngs(updated);
      if (tempHaloPolylineRef.current) tempHaloPolylineRef.current.setLatLngs(updated);
    } else {
      if (tempPolylineRef.current) {
        mapInstanceRef.current.removeLayer(tempPolylineRef.current);
        tempPolylineRef.current = null;
      }
      if (tempHaloPolylineRef.current) {
        mapInstanceRef.current.removeLayer(tempHaloPolylineRef.current);
        tempHaloPolylineRef.current = null;
      }
    }

    computeMetrics(updated);
  };

  const finishPolygon = () => {
    const currentPts = pointsRef.current;
    if (currentPts.length < 3) {
      alert('Please place at least 3 corner points to outline your farm boundary.');
      return;
    }

    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Restore map navigation
    map.getContainer().style.cursor = '';
    map.dragging.enable();

    setDrawMode('finished');
    drawModeRef.current = 'finished';

    renderClosedPolygonWithHandles(currentPts);
  };

  const cancelDrawing = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    clearBoundaryArtifacts();
    setPoints([]);
    pointsRef.current = [];
    setQuickBoxCorner1(null);
    quickBoxCorner1Ref.current = null;
    setCalculatedArea(null);
    setPerimeterMeters(0);
    setHasSelfIntersection(false);
    setDrawMode('idle');
    drawModeRef.current = 'idle';

    map.getContainer().style.cursor = '';
    map.dragging.enable();
  };

  const clearBoundary = () => {
    cancelDrawing();
    if (onBoundaryChange) {
      onBoundaryChange(
        { type: 'Polygon', coordinates: [] },
        0,
        0,
        centerCoords
      );
    }
  };

  const clearBoundaryArtifacts = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (haloLayerRef.current) {
      map.removeLayer(haloLayerRef.current);
      haloLayerRef.current = null;
    }
    if (tempPolylineRef.current) {
      map.removeLayer(tempPolylineRef.current);
      tempPolylineRef.current = null;
    }
    if (tempHaloPolylineRef.current) {
      map.removeLayer(tempHaloPolylineRef.current);
      tempHaloPolylineRef.current = null;
    }
    if (guideBoxRef.current) {
      map.removeLayer(guideBoxRef.current);
      guideBoxRef.current = null;
    }
    handlesGroupRef.current.clearLayers();
    tempMarkersGroupRef.current.clearLayers();
    subzonesGroupRef.current.clearLayers();
  };

  // Base Layer Switching
  const setLayerType = (type: 'google-hybrid' | 'esri-satellite' | 'street') => {
    if (!mapInstanceRef.current || !googleHybridLayerRef.current || !esriSatelliteLayerRef.current || !osmLayerRef.current) return;
    const map = mapInstanceRef.current;

    if (map.hasLayer(googleHybridLayerRef.current)) map.removeLayer(googleHybridLayerRef.current);
    if (map.hasLayer(esriSatelliteLayerRef.current)) map.removeLayer(esriSatelliteLayerRef.current);
    if (map.hasLayer(osmLayerRef.current)) map.removeLayer(osmLayerRef.current);

    if (type === 'google-hybrid') {
      googleHybridLayerRef.current.addTo(map);
    } else if (type === 'esri-satellite') {
      esriSatelliteLayerRef.current.addTo(map);
    } else {
      osmLayerRef.current.addTo(map);
    }

    setMapType(type);
  };

  // Known Indian Agricultural Hubs & Towns Postal PIN Lookup
  const KNOWN_POSTAL_CODES: Record<string, string> = {
    ghatal: '721212',
    tarakeswar: '712410',
    tarkeshwar: '712410',
    arambagh: '712601',
    singur: '712409',
    chandannagar: '712136',
    chinsurah: '712101',
    serampore: '712201',
    bardhaman: '713101',
    burdwan: '713101',
    asansol: '713301',
    durgapur: '713201',
    medinipur: '721101',
    midnapore: '721101',
    kharagpur: '721301',
    haldia: '721607',
    tamluk: '721636',
    contai: '721401',
    kanthi: '721401',
    jhargram: '721507',
    bankura: '722101',
    bishnupur: '722122',
    purulia: '723101',
    bolpur: '731204',
    shantiniketan: '731204',
    suri: '731101',
    rampurhat: '731224',
    krishnanagar: '741101',
    nadia: '741101',
    ranaghat: '741201',
    kalyani: '741235',
    shantipur: '741404',
    nabadwip: '741302',
    berhampore: '742101',
    murshidabad: '742101',
    malda: '732101',
    englishbazar: '732101',
    raiganj: '733134',
    balurghat: '733101',
    siliguri: '734001',
    darjeeling: '734101',
    kalimpong: '734301',
    jalpaiguri: '735101',
    alipurduar: '736121',
    coochbehar: '736101',
    barasat: '700124',
    barrackpore: '700120',
    basirhat: '743411',
    bongaon: '743235',
    howrah: '711101',
    uluberia: '711315',
    bagnan: '711303',
    diamondharbour: '743331',
    kakdwip: '743347',
    canning: '743329',
    baruipur: '700144',
    kolkata: '700001',
  };

  // Nominatim Search Helpers
  const parseNominatimResult = (item: NominatimResult, rawQuery?: string) => {
    const addr = item.address || {};
    let villageOrCity = addr.village || addr.town || addr.city || addr.suburb || addr.municipality || addr.county || addr.state_district || '';
    if (!villageOrCity && item.display_name) {
      villageOrCity = item.display_name.split(',')[0].trim();
    }

    let pincode = addr.postcode || '';
    if (!pincode) {
      const pinMatch = `${rawQuery || ''} ${item.display_name}`.match(/\b[1-9][0-9]{5}\b/);
      if (pinMatch) pincode = pinMatch[0];
    }
    if (!pincode) {
      const textToSearch = `${villageOrCity} ${item.display_name} ${rawQuery || ''}`.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const words = textToSearch.split(/\s+/);
      for (const word of words) {
        if (KNOWN_POSTAL_CODES[word]) {
          pincode = KNOWN_POSTAL_CODES[word];
          break;
        }
      }
    }

    const state = addr.state || 'West Bengal';

    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      villageOrCity,
      pincode,
      state,
      displayName: item.display_name,
    };
  };

  const applySelectedLocation = (location: LocationInfo) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const lat = Number(location.lat.toFixed(6));
    const lng = Number(location.lng.toFixed(6));

    map.flyTo([lat, lng], 15, { duration: 1.5 });
    setCenterCoords({ lat, lng });

    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
    }
    const marker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #065f46; font-size: 13px;">${location.villageOrCity || 'Selected Location'}</strong><br/>
          ${location.pincode ? `<span style="color: #475569;">PIN: ${location.pincode}</span><br/>` : ''}
          <span style="color: #64748b;">${location.state || ''}</span>
        </div>
      `)
      .openPopup();
    searchMarkerRef.current = marker;

    if (onLocationSelect) {
      onLocationSelect({
        ...location,
        lat,
        lng,
      });
    }

    setShowDropdown(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (searchResults.length > 0) {
      const selected = parseNominatimResult(searchResults[0], query);
      applySelectedLocation(selected);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1`
      );
      const data: NominatimResult[] = await res.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        const selected = parseNominatimResult(data[0], query);
        applySelectedLocation(selected);
      } else {
        alert('Location not found. Please try entering a village name (e.g. Tarakeswar) or 6-digit PIN code (e.g. 712410).');
      }
    } catch (err) {
      console.error('Location search error:', err);
      alert('Failed to connect to location search service.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length >= 3) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&countrycodes=in&limit=5&addressdetails=1`
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data || []);
        setShowDropdown((data && data.length > 0) || false);
      } catch {
        // Suppress typing errors
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const lat = Number(latitude.toFixed(6));
        const lng = Number(longitude.toFixed(6));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.5 });
          setCenterCoords({ lat, lng });

          try {
            const revRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
            );
            const revData: NominatimResult = await revRes.json();
            const location = parseNominatimResult(revData);

            if (searchMarkerRef.current) {
              mapInstanceRef.current.removeLayer(searchMarkerRef.current);
            }
            const marker = L.marker([lat, lng])
              .addTo(mapInstanceRef.current)
              .bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                  <strong style="color: #065f46; font-size: 13px;">📍 Your Current Location</strong><br/>
                  ${location.villageOrCity ? `<span>${location.villageOrCity}</span><br/>` : ''}
                  ${location.pincode ? `<span style="color: #475569;">PIN: ${location.pincode}</span>` : ''}
                </div>
              `)
              .openPopup();
            searchMarkerRef.current = marker;

            if (onLocationSelect) {
              onLocationSelect(location);
            }
          } catch {
            if (onLocationSelect) {
              onLocationSelect({ lat, lng });
            }
          }
        }
      },
      () => {
        setIsLocating(false);
        alert('Could not determine your GPS location. Please check browser location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-300 shadow-md bg-slate-900">

      {/* Top Overlay Bar: Search & Layer Controls */}
      <div className="absolute top-3 left-3 right-14 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">

        {/* Search Input with Auto-Suggest Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-sm">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg px-3 py-1.5 border border-slate-200"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search village, city, PIN code..."
              value={searchQuery}
              onChange={handleQueryChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              className="w-full text-xs text-slate-900 bg-transparent outline-none placeholder:text-slate-400 font-medium"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-agri-600 shrink-0 ml-1" />
            ) : (
              <button
                type="submit"
                className="text-[11px] font-bold text-agri-700 bg-agri-100 hover:bg-agri-200 px-2 py-0.5 rounded-lg shrink-0 ml-1 transition-colors"
              >
                Go
              </button>
            )}
          </form>

          {/* Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-30 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {searchResults.map((item) => {
                const parsed = parseNominatimResult(item, searchQuery);
                return (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => {
                      applySelectedLocation(parsed);
                      setSearchQuery(parsed.villageOrCity || parsed.displayName || '');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-agri-50 transition-colors flex items-start gap-2 text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-agri-600 shrink-0 mt-0.5" />
                    <div className="flex-1 truncate">
                      <div className="font-bold text-slate-900 truncate">
                        {parsed.villageOrCity} {parsed.pincode ? `(${parsed.pincode})` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {parsed.displayName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Device Location Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="bg-white/95 hover:bg-white text-slate-700 px-3 py-2 rounded-2xl shadow-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
          title="Detect GPS location"
        >
          <Navigation className={`w-3.5 h-3.5 text-agri-600 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">My Location</span>
        </button>

        {/* High-Resolution Layer Switcher */}
        <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-0.5 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setLayerType('google-hybrid')}
            className={`px-2.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 ${
              mapType === 'google-hybrid'
                ? 'bg-agri-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Google Hybrid Satellite Imagery (Crisp detail with road & village labels up to zoom 21)"
          >
            <span>Google Hybrid</span>
          </button>
          <button
            type="button"
            onClick={() => setLayerType('esri-satellite')}
            className={`px-2.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 ${
              mapType === 'esri-satellite'
                ? 'bg-agri-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Esri World Imagery (Upscaled to zoom 21)"
          >
            <span>Esri Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => setLayerType('street')}
            className={`px-2.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 ${
              mapType === 'street'
                ? 'bg-agri-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="OpenStreetMap Street View"
          >
            <span>Street</span>
          </button>
        </div>

      </div>

      {/* Floating Farmer-Friendly Drawing Action Bar */}
      {!readOnly && (
        <div className="absolute top-16 left-3 right-3 z-20 flex justify-center pointer-events-none">
          
          {/* Mode 1: Idle (Ready to Draw) */}
          {drawMode === 'idle' && (
            <div className="bg-slate-950/90 text-white backdrop-blur-md px-3 py-2 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                type="button"
                onClick={startPolygonDrawing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Start Drawing Field</span>
              </button>

              <button
                type="button"
                onClick={startQuickBoxDrawing}
                className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                title="Create a 4-sided rectangular field by clicking 2 opposite corners"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Quick Box</span>
              </button>
            </div>
          )}

          {/* Mode 2: Actively Drawing Freehand Polygon */}
          {drawMode === 'drawing' && (
            <div className="bg-slate-950/95 text-white backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-500/40 shadow-2xl flex flex-wrap items-center gap-2.5 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mr-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Click map to place points ({points.length} placed) — Click points to map land parcel</span>
              </div>

              <button
                type="button"
                onClick={undoLastPoint}
                disabled={points.length === 0}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
                title="Remove the last placed vertex"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Undo Point</span>
              </button>

              <button
                type="button"
                onClick={finishPolygon}
                disabled={points.length < 3}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                title="Connect back to start and close field boundary"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish Field</span>
              </button>

              <button
                type="button"
                onClick={cancelDrawing}
                className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 border border-rose-700/40 transition-all"
                title="Cancel drawing mode"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Mode 3: Quick Box Mode (2-click rectangle) */}
          {drawMode === 'quickbox' && (
            <div className="bg-slate-950/95 text-white backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/40 shadow-2xl flex items-center gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Square className="w-4 h-4 animate-pulse text-amber-400" />
                <span>
                  {quickBoxCorner1
                    ? 'Corner 1 set! Click opposite corner of parcel'
                    : 'Click 1st corner of parcel'}
                </span>
              </div>

              <button
                type="button"
                onClick={cancelDrawing}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-xl font-bold text-xs border border-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Mode 4: Finished Polygon (Closed, with draggable handles) */}
          {drawMode === 'finished' && (
            <div className="bg-slate-950/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-2xl flex flex-wrap items-center gap-2.5 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold mr-1">
                <Check className="w-3.5 h-3.5" />
                <span>Boundary Active ({points.length} Corners)</span>
              </div>

              <span className="text-slate-400 hidden sm:inline text-[11px] mr-1">
                Drag amber circular handles to adjust edges
              </span>

              <button
                type="button"
                onClick={startPolygonDrawing}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
                title="Start drawing a new boundary"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Redraw</span>
              </button>

              <button
                type="button"
                onClick={clearBoundary}
                className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-rose-700/40 transition-all"
                title="Clear boundary completely"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Self-Intersection Alert Banner */}
      {hasSelfIntersection && (
        <div className="absolute top-28 left-3 right-3 z-20 flex justify-center pointer-events-none">
          <div className="bg-rose-950/95 text-rose-200 backdrop-blur-md px-4 py-2 rounded-2xl border border-rose-500/50 shadow-2xl flex items-center gap-2 text-xs pointer-events-auto animate-bounce">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">
              Warning: Boundary edges cross each other! Drag corners so lines do not intersect.
            </span>
          </div>
        </div>
      )}

      {/* Land-Cover Subzones Legend */}
      {landCoverSubZones && landCoverSubZones.length > 0 && (
        <div className="absolute top-20 right-3 z-20 pointer-events-auto bg-slate-950/90 text-white backdrop-blur-md px-3 py-2.5 rounded-xl border border-white/20 shadow-2xl text-xs flex flex-col gap-1.5 max-w-[210px] animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-1 border-b border-white/15 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Mapped Land Cover</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">10m GSD</span>
          </div>
          <div className="flex flex-col gap-1">
            {landCoverSubZones.map((sz, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: sz.color || '#22c55e' }}></span>
                  <span className="truncate text-slate-200">{sz.landCoverLabel}</span>
                </div>
                <span className="font-semibold text-slate-300 shrink-0 text-[10px]">{sz.areaAcres.toFixed(2)} ac</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} style={{ height }} className="w-full" />

      {/* Bottom Live Geometry & Area Display */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-between">
        <div className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 shadow-xl text-xs flex flex-wrap items-center gap-4 pointer-events-auto">
          
          {/* Centroid Coordinates */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-agri-400 shrink-0" />
            <span>Center: {centerCoords.lat}, {centerCoords.lng}</span>
          </div>

          {/* Area & Perimeter Readout */}
          {calculatedArea ? (
            <div className="flex items-center gap-3 border-l border-white/20 pl-3">
              <span className="font-black text-amber-300">
                Area: {calculatedArea.acres} Acres ({calculatedArea.hectares} Ha)
              </span>
              <span className="text-slate-300 font-medium">
                Perimeter: {perimeterMeters}m
              </span>
              <span className="text-slate-400 text-[11px]">
                ({points.length} Vertices)
              </span>
            </div>
          ) : (
            <div className="border-l border-white/20 pl-3 text-slate-400 italic">
              {readOnly
                ? 'No boundary mapped'
                : drawMode === 'drawing'
                ? `Tracing boundary: ${points.length} point(s) placed ${
                    perimeterMeters > 0 ? `(~${perimeterMeters}m)` : ''
                  }`
                : drawMode === 'quickbox'
                ? 'Click 2 opposite corners to draw rectangle'
                : 'Click "Start Drawing Field" or "Quick Box" above to map your parcel'}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

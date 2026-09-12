import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  LandCoverInferenceResult, 
  LandCoverSubZone, 
  LandCoverClass,
  Farm 
} from '@shared/index';
import { 
  Layers, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  Maximize2, 
  MapPin, 
  Sparkles,
  ExternalLink,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface LandCoverMapOverlayProps {
  farm?: Farm;
  inferenceResult: LandCoverInferenceResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  selectedZoneId?: string;
  onSelectZone?: (zone: LandCoverSubZone) => void;
}

export const LandCoverMapOverlay: React.FC<LandCoverMapOverlayProps> = ({
  farm,
  inferenceResult,
  isLoading,
  onRefresh,
  selectedZoneId,
  onSelectZone,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const subzoneLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [activeBaseLayer, setActiveBaseLayer] = useState<'esri_sat' | 'osm'>('esri_sat');
  const [activeZone, setActiveZone] = useState<LandCoverSubZone | null>(null);

  const esriTileLayerRef = useRef<L.TileLayer | null>(null);
  const osmTileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = farm?.centerCoordinates?.lat || 22.8935;
    const initialLng = farm?.centerCoordinates?.lng || 88.2440;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      maxZoom: 20,
      minZoom: 5,
      zoomControl: false,
    });

    // Base Tile Layers
    esriTileLayerRef.current = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    );

    osmTileLayerRef.current = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    );

    esriTileLayerRef.current.addTo(map);

    // Layer groups
    subzoneLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Base Layer Switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (activeBaseLayer === 'esri_sat') {
      if (osmTileLayerRef.current && map.hasLayer(osmTileLayerRef.current)) {
        map.removeLayer(osmTileLayerRef.current);
      }
      if (esriTileLayerRef.current && !map.hasLayer(esriTileLayerRef.current)) {
        esriTileLayerRef.current.addTo(map);
      }
    } else {
      if (esriTileLayerRef.current && map.hasLayer(esriTileLayerRef.current)) {
        map.removeLayer(esriTileLayerRef.current);
      }
      if (osmTileLayerRef.current && !map.hasLayer(osmTileLayerRef.current)) {
        osmTileLayerRef.current.addTo(map);
      }
    }
  }, [activeBaseLayer]);

  // Render Boundaries & Classified Subzones
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous subzones
    if (subzoneLayerGroupRef.current) {
      subzoneLayerGroupRef.current.clearLayers();
    }
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    // 1. Draw Farm Boundary
    if (farm?.boundary?.coordinates) {
      try {
        const rawCoords = farm.boundary.coordinates;
        const ring: any[] = (rawCoords.length === 1 && Array.isArray(rawCoords[0])) ? rawCoords[0] : rawCoords;
        const latLngs: [number, number][] = ring.map((pt: any) => [Number(pt[1]), Number(pt[0])]);
        
        boundaryLayerRef.current = L.polygon(latLngs, {
          color: '#ffffff',
          weight: 2.5,
          dashArray: '5, 5',
          fillOpacity: 0.05,
          fillColor: '#ffffff',
        }).addTo(map);

        if (latLngs.length > 0) {
          map.fitBounds(boundaryLayerRef.current.getBounds(), { padding: [30, 30] });
        }
      } catch (err) {
        console.warn('Failed to parse farm boundary:', err);
      }
    }

    // 2. Draw Classified Subzones
    if (inferenceResult?.subZones && inferenceResult.subZones.length > 0 && subzoneLayerGroupRef.current) {
      inferenceResult.subZones.forEach((zone) => {
        try {
          const latLngs = zone.coordinates[0].map((pt: any) => [Number(pt[1]), Number(pt[0])] as [number, number]);
          const isSelected = selectedZoneId === zone.id || activeZone?.id === zone.id;

          const poly = L.polygon(latLngs, {
            color: isSelected ? '#ffffff' : zone.color,
            weight: isSelected ? 3 : 1.5,
            fillColor: zone.color,
            fillOpacity: isSelected ? 0.85 : 0.65,
          });

          // Build Interactive Popup
          const cropSection = zone.landCoverClass === 'crop' 
            ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
                <div style="font-size: 11px; color: #475569; font-weight: 600;">Crop Type Prediction (Stage 2):</div>
                <div style="font-size: 13px; font-weight: 700; color: ${zone.isCropConfirmed ? '#15803d' : '#b45309'}; margin-top: 2px;">
                  ${zone.cropTypeLabel || 'Crop type not verified'}
                </div>
                <div style="font-size: 10px; color: #64748b;">
                  Confidence: ${(zone.cropTypeConfidence ? zone.cropTypeConfidence * 100 : 0).toFixed(0)}%
                  ${zone.isCropConfirmed ? ' (Threshold &ge; 80% met)' : ' (Below 80% &mdash; farmer verification required)'}
                </div>
              </div>
            `
            : '';

          const popupContent = `
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 220px; color: #1e293b;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 14px; color: ${zone.color};">${zone.landCoverLabel}</span>
                <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
                  ${(zone.confidence * 100).toFixed(0)}% Conf.
                </span>
              </div>
              
              ${cropSection}

              <div style="margin-top: 8px; font-size: 11px; color: #334155; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <div>Area: <strong>${zone.areaAcres.toFixed(2)} Ac</strong></div>
                <div>(${zone.areaHectares.toFixed(3)} Ha)</div>
                <div>NDVI: <strong>${zone.spectralIndices.ndvi}</strong></div>
                <div>NDWI: <strong>${zone.spectralIndices.ndwi}</strong></div>
                <div>NDBI: <strong>${zone.spectralIndices.ndbi}</strong></div>
                <div>NDRE: <strong>${zone.spectralIndices.ndre ?? '--'}</strong></div>
              </div>

              <div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8;">
                <div>Source: ${zone.source} &bull; ${zone.date}</div>
                <div>Coords: [${zone.center[0].toFixed(4)}, ${zone.center[1].toFixed(4)}]</div>
              </div>
            </div>
          `;

          poly.bindPopup(popupContent);

          poly.on('click', () => {
            setActiveZone(zone);
            if (onSelectZone) onSelectZone(zone);
          });

          subzoneLayerGroupRef.current?.addLayer(poly);
        } catch (e) {
          console.warn('Error rendering subzone polygon:', e);
        }
      });
    }
  }, [farm, inferenceResult, selectedZoneId, activeZone]);

  return (
    <div className="flex flex-col gap-4">
      {/* Map Card */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-md bg-stone-900">
        {/* Top Control Bar */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white pointer-events-auto shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold tracking-wide">Sentinel-2 Multi-Spectral Land Cover</span>
            {inferenceResult?.areaHectares !== undefined && (
              <span className="text-xs text-stone-300 ml-1 border-l border-white/20 pl-2">
                {inferenceResult.areaHectares} Ha ({inferenceResult.areaAcres} Ac)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Tile Switcher */}
            <div className="flex items-center bg-stone-900/90 backdrop-blur-md p-0.5 rounded-lg border border-white/10 text-xs shadow-lg">
              <button
                type="button"
                onClick={() => setActiveBaseLayer('esri_sat')}
                className={`px-2.5 py-1 rounded-md transition ${activeBaseLayer === 'esri_sat' ? 'bg-emerald-600 text-white font-medium' : 'text-stone-300 hover:text-white'}`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setActiveBaseLayer('osm')}
                className={`px-2.5 py-1 rounded-md transition ${activeBaseLayer === 'osm' ? 'bg-emerald-600 text-white font-medium' : 'text-stone-300 hover:text-white'}`}
              >
                Map
              </button>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Scanning...' : 'Re-scan'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Small Plot Warning Badge */}
        {inferenceResult?.isSmallPlot && (
          <div className="absolute top-14 left-3 right-3 z-[1000] bg-amber-500/95 text-stone-950 text-xs font-medium px-3.5 py-2 rounded-xl shadow-lg backdrop-blur-sm border border-amber-400 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-stone-950 shrink-0" />
            <div className="flex-1">
              <strong>Small plot alert (&lt; 0.50 Ha / ~1.235 Acres):</strong> Satellite resolution (10m) cannot reliably distinguish trees from crops in small plots. Please select crop type manually.
            </div>
          </div>
        )}

        {/* Map Viewport Container */}
        <div ref={mapContainerRef} className="h-[440px] w-full z-0 bg-stone-950" />

        {/* Not Connected State Modal / Overlay */}
        {inferenceResult && !inferenceResult.isModelConnected && (
          <div className="absolute inset-0 z-[1001] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div className="max-w-md bg-stone-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-white">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-stone-100 mb-1">Land Cover Data/Model Not Connected</h4>
              <p className="text-xs text-stone-300 leading-relaxed mb-4">
                {inferenceResult.connectionStatusMessage || 'Trained land-cover ML model checkpoint or Sentinel Hub API credentials required. Simulated or fake classifications are strictly disabled.'}
              </p>
              <div className="bg-stone-800/80 rounded-xl p-3 text-left text-xs border border-white/5 space-y-1.5 text-stone-400">
                <div className="flex items-center gap-2 text-stone-200 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Real Soil Layer is Active:</span>
                </div>
                <p className="text-[11px] pl-6 text-stone-400">
                  ISRIC SoilGrids v2.0 REST queries remain fully operational without model weights. See estimated topsoil card below.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Class Legend & Area Distribution */}
      {inferenceResult?.classBreakdown && inferenceResult.isModelConnected && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-600" />
              <span>Land Cover Classification Breakdown</span>
            </h4>
            <span className="text-xs text-stone-500">Sentinel-2 10m Multi-spectral</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {Object.entries(inferenceResult.classBreakdown).map(([classKey, item]) => {
              return (
                <div 
                  key={classKey}
                  className="rounded-lg p-2.5 border transition hover:shadow-sm"
                  style={{ backgroundColor: `${item.color}0D`, borderColor: `${item.color}40` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-xs font-semibold text-stone-800 truncate" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-stone-900">
                    {item.percentage}%
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {item.areaAcres} Ac ({item.areaHectares} Ha)
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
              <span>Click on any colored field polygon above to view spectral diagnostics and stage-2 crop confidence.</span>
            </div>
            <div className="font-medium text-stone-700">
              Total Analyzed: {inferenceResult.areaAcres} Acres
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

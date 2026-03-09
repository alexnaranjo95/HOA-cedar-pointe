import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyWithOwner } from '../lib/supabase';

interface PropertyMapProps {
  properties: PropertyWithOwner[];
  selectedPropertyId: string | null;
  onPropertyClick: (property: PropertyWithOwner) => void;
}

const STATUS_COLORS = {
  verified: { fill: '#22c55e', stroke: '#15803d' },
  hasOwner: { fill: '#3b82f6', stroke: '#1d4ed8' },
  incomplete: { fill: '#94a3b8', stroke: '#64748b' },
  clubhouse: { fill: '#9ca3af', stroke: '#6b7280' },
  selected: { stroke: '#f59e0b', weight: 3 },
};

function isClubhouse(address: string): boolean {
  return address.toLowerCase().startsWith('clubhouse');
}

const PARCEL_HALF_W = 0.0002;
const PARCEL_HALF_H = 0.0001;

function getParcelBounds(
  lat: number,
  lng: number,
  address: string
): [[number, number], [number, number]] {
  const isCtOrAve = /\b(Ct|Ave|Pl|CT|AVE|PL|Avenue)\b/i.test(address);

  let hw = PARCEL_HALF_W;
  let hh = PARCEL_HALF_H;

  if (isCtOrAve) {
    [hw, hh] = [hh, hw];
  }

  return [
    [lat - hh, lng - hw],
    [lat + hh, lng + hw],
  ];
}

function ringsToLatLngs(rings: number[][][]): L.LatLngExpression[][] {
  return rings.map(ring =>
    ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple)
  );
}

function getParcelColors(property: PropertyWithOwner) {
  if (isClubhouse(property.address)) return STATUS_COLORS.clubhouse;
  const hasOwner = property.homeowners && property.homeowners.length > 0;
  const isVerified = property.status === 'verified';

  if (isVerified) return STATUS_COLORS.verified;
  if (hasOwner) return STATUS_COLORS.hasOwner;
  return STATUS_COLORS.incomplete;
}

function buildTooltipContent(property: PropertyWithOwner): string {
  const houseNum = property.address.match(/^(\d+)/)?.[1] || '';
  const ownerName = property.homeowners?.[0]?.owner_name;

  return `<div style="font-size:12px;line-height:1.4">
    <strong>${houseNum}</strong><br/>
    <span style="color:#e2e8f0;font-size:11px">${property.address.split(',')[0]}</span>
    ${ownerName ? `<br/><span style="color:#93c5fd;font-size:11px">${ownerName}</span>` : ''}
  </div>`;
}

export default function PropertyMap({ properties, selectedPropertyId, onPropertyClick }: PropertyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const parcelsRef = useRef<Map<string, L.Polygon | L.Rectangle>>(new Map());
  const onPropertyClickRef = useRef(onPropertyClick);
  onPropertyClickRef.current = onPropertyClick;

  const initialFitDone = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [25.498, -80.455],
      zoom: 17,
      zoomControl: true,
      maxZoom: 20,
      minZoom: 13,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(mapRef.current);

    layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const buildParcels = useCallback(() => {
    if (!mapRef.current || !layerGroupRef.current || properties.length === 0) return;

    layerGroupRef.current.clearLayers();
    parcelsRef.current.clear();

    const allBounds: L.LatLngBounds[] = [];

    properties.forEach((property) => {
      if (property.latitude == null || property.longitude == null) return;

      try {
        const isSelected = property.id === selectedPropertyId;
        const colors = getParcelColors(property);
        const hasRealGeometry = property.geometry?.rings?.length > 0;

        const style: L.PathOptions = {
          color: isSelected ? STATUS_COLORS.selected.stroke : colors.stroke,
          weight: isSelected ? STATUS_COLORS.selected.weight : 1,
          fillColor: colors.fill,
          fillOpacity: isSelected ? 0.9 : 0.55,
        };

        let shape: L.Polygon | L.Rectangle;

        if (hasRealGeometry) {
          const latLngs = ringsToLatLngs(property.geometry.rings);
          shape = L.polygon(latLngs, style);
        } else {
          const bounds = getParcelBounds(property.latitude, property.longitude, property.address);
          shape = L.rectangle(bounds, style);
        }

        shape.bindTooltip(buildTooltipContent(property), {
          direction: 'top',
          offset: [0, -8],
          className: 'parcel-tooltip',
        });

        shape.on('click', () => onPropertyClickRef.current(property));

        shape.on('mouseover', () => {
          if (!isSelected) {
            shape.setStyle({ weight: 2, fillOpacity: 0.8 });
          }
        });

        shape.on('mouseout', () => {
          if (!isSelected) {
            shape.setStyle({ weight: 1, fillOpacity: 0.55 });
          }
        });

        shape.addTo(layerGroupRef.current!);
        parcelsRef.current.set(property.id, shape);
        allBounds.push(shape.getBounds());

        if (isClubhouse(property.address)) {
          const center = shape.getBounds().getCenter();
          const label = L.marker(center, {
            icon: L.divIcon({
              className: 'clubhouse-label',
              html: '<div style="font-weight:800;font-size:14px;color:#374151;text-align:center;text-transform:uppercase;letter-spacing:1px;text-shadow:0 1px 2px rgba(255,255,255,0.8);white-space:nowrap">Clubhouse</div>',
              iconSize: [100, 20],
              iconAnchor: [50, 10],
            }),
            interactive: false,
          });
          label.addTo(layerGroupRef.current!);
        }
      } catch (error) {
        console.error('Error rendering parcel for property:', property.address, error);
      }
    });

    if (allBounds.length > 0 && !selectedPropertyId && !initialFitDone.current) {
      const combinedBounds = allBounds[0];
      allBounds.slice(1).forEach(b => combinedBounds.extend(b));
      mapRef.current.fitBounds(combinedBounds, { padding: [40, 40] });
      initialFitDone.current = true;
    }

    if (selectedPropertyId) {
      const selectedParcel = parcelsRef.current.get(selectedPropertyId);
      if (selectedParcel) {
        mapRef.current.setView(
          selectedParcel.getBounds().getCenter(),
          Math.max(mapRef.current.getZoom(), 17),
          { animate: true }
        );
      }
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    buildParcels();
  }, [buildParcels]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-700 shadow-lg">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm z-[1000]">
        <div className="flex items-center gap-3 text-xs text-slate-200">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#22c55e]"></span> Verified
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#3b82f6]"></span> Owner
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#94a3b8]"></span> Incomplete
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#9ca3af]"></span> Clubhouse
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, LayoutDashboard, Grid3x3 as Grid3X3, Loader2, Search } from 'lucide-react';
import PropertyMap from './components/PropertyMap';
import ParcelGrid from './components/ParcelGrid';
import PropertyDetail from './components/PropertyDetail';
import Dashboard from './components/Dashboard';
import GapAnalysis from './components/GapAnalysis';
import { PropertyWithOwner } from './lib/supabase';
import { getAllProperties, fetchParcelGeometry } from './services/propertyService';

export default function App() {
  const [properties, setProperties] = useState<PropertyWithOwner[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingParcels, setFetchingParcels] = useState(false);
  const [view, setView] = useState<'community' | 'dashboard' | 'gaps'>('community');
  const hasFetchedParcels = useRef(false);

  const loadProperties = useCallback(async () => {
    try {
      const data = await getAllProperties();
      setProperties(data);
      return data;
    } catch (error) {
      console.error('Error loading properties:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await loadProperties();
      setLoading(false);

      const missingGeometry = data.filter(p => !p.geometry).length;
      if (missingGeometry > 0 && !hasFetchedParcels.current) {
        hasFetchedParcels.current = true;
        setFetchingParcels(true);
        try {
          await fetchParcelGeometry();
          await loadProperties();
        } catch (error) {
          console.error('Error fetching parcel geometry:', error);
        } finally {
          setFetchingParcels(false);
        }
      }
    };
    init();
  }, [loadProperties]);

  const handlePropertyClick = (property: PropertyWithOwner) => {
    setSelectedProperty(property);
  };

  const handleUpdate = async () => {
    const data = await getAllProperties();
    setProperties(data);
    if (selectedProperty) {
      const updated = data.find(p => p.id === selectedProperty.id);
      if (updated) setSelectedProperty(updated);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-800 text-white shadow-lg z-20 flex-shrink-0">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-700 rounded-lg">
              <MapPin size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Cedar Pointe</h1>
              <p className="text-xs text-slate-400">Homeowner Management</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setView('community')}
              className={`px-3 py-1.5 rounded-md transition-colors text-sm font-medium flex items-center gap-1.5 ${
                view === 'community' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 size={15} />
              Community
            </button>
            <button
              onClick={() => setView('gaps')}
              className={`px-3 py-1.5 rounded-md transition-colors text-sm font-medium flex items-center gap-1.5 ${
                view === 'gaps' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search size={15} />
              Gap Analysis
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`px-3 py-1.5 rounded-md transition-colors text-sm font-medium flex items-center gap-1.5 ${
                view === 'dashboard' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {fetchingParcels && (
          <div className="bg-sky-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm flex-shrink-0">
            <Loader2 size={14} className="animate-spin" />
            Loading parcel boundaries from Miami-Dade County GIS...
          </div>
        )}
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-slate-600 mx-auto mb-3"></div>
              <p className="text-sm text-slate-500">Loading properties...</p>
            </div>
          </div>
        ) : view === 'community' ? (
          <div className="h-full flex">
            <div className="w-[380px] flex-shrink-0 border-r border-slate-200 overflow-hidden">
              <ParcelGrid
                properties={properties}
                selectedPropertyId={selectedProperty?.id || null}
                onPropertyClick={handlePropertyClick}
              />
            </div>

            <div className="flex-1 flex">
              <div className="flex-1 p-3">
                <PropertyMap
                  properties={properties}
                  selectedPropertyId={selectedProperty?.id || null}
                  onPropertyClick={handlePropertyClick}
                />
              </div>

              {selectedProperty && (
                <div className="w-[340px] flex-shrink-0 overflow-hidden">
                  <PropertyDetail
                    property={selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    onUpdate={handleUpdate}
                  />
                </div>
              )}
            </div>
          </div>
        ) : view === 'gaps' ? (
          <GapAnalysis />
        ) : (
          <div className="h-full overflow-auto p-6">
            <Dashboard onDataUpdate={loadProperties} />
          </div>
        )}
      </main>
    </div>
  );
}

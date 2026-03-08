import { useState, useEffect } from 'react';
import { Home, Users, CheckCircle, BarChart3, Download, Search, MapPin } from 'lucide-react';
import { getStatistics } from '../services/propertyService';
import { supabase } from '../lib/supabase';


interface DashboardProps {
  onDataUpdate?: () => void;
}

export default function Dashboard({ onDataUpdate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalProperties: 0,
    propertiesWithOwners: 0,
    verifiedProperties: 0,
    completionPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [isBulkSkipTracing, setIsBulkSkipTracing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; contactsFound: number } | null>(null);
  const [isFetchingParcels, setIsFetchingParcels] = useState(false);
  const [parcelProgress, setParcelProgress] = useState({ matched: 0, failed: 0, remaining: 0, batch: 0 });
  const [parcelResults, setParcelResults] = useState<{ matched: number; failed: number } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSkipTrace = async () => {
    if (!confirm('This will perform skip tracing on all properties without owner information. This may take several minutes and consume API credits. Continue?')) {
      return;
    }

    setIsBulkSkipTracing(true);
    setBulkResults(null);
    setBulkProgress({ current: 0, total: 0 });

    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, homeowners(id)')
        .or('homeowners.is.null,homeowners->0->skip_trace_status.eq.not_traced');

      if (error) throw error;

      const propertiesToTrace = properties?.filter(p => !p.homeowners || p.homeowners.length === 0) || [];
      const propertyIds = propertiesToTrace.map(p => p.id);

      setBulkProgress({ current: 0, total: propertyIds.length });

      let successCount = 0;
      let failCount = 0;
      let totalContacts = 0;

      for (let i = 0; i < propertyIds.length; i++) {
        const { data: property } = await supabase
          .from('properties')
          .select('address')
          .eq('id', propertyIds[i])
          .single();

        if (property?.address) {
          const { performSkipTrace } = await import('../services/skipTraceService');
          const result = await performSkipTrace(propertyIds[i], property.address);

          if (result.success) {
            successCount++;
            totalContacts += result.contactsFound;
          } else {
            failCount++;
          }

          setBulkProgress({ current: i + 1, total: propertyIds.length });
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setBulkResults({
        success: successCount,
        failed: failCount,
        contactsFound: totalContacts
      });

      await loadStats();
    } catch (error) {
      console.error('Bulk skip trace error:', error);
      alert('Failed to perform bulk skip trace. Please try again.');
    } finally {
      setIsBulkSkipTracing(false);
    }
  };

  const handleFetchParcels = async () => {
    setIsFetchingParcels(true);
    setParcelResults(null);
    setParcelProgress({ matched: 0, failed: 0, remaining: 0, batch: 0 });

    let totalMatched = 0;
    let totalFailed = 0;
    let batch = 0;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-parcel-geometry`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      let hasMore = true;

      while (hasMore) {
        batch++;
        const response = await fetch(apiUrl, { method: 'POST', headers });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch parcel data');
        }

        totalMatched += data.matched || 0;
        totalFailed += data.failed || 0;
        const remaining = data.remaining || 0;

        setParcelProgress({ matched: totalMatched, failed: totalFailed, remaining, batch });

        hasMore = remaining > 0 && (data.matched > 0 || data.failed > 0);

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setParcelResults({ matched: totalMatched, failed: totalFailed });
      if (totalMatched > 0) onDataUpdate?.();
    } catch (error) {
      console.error('Parcel fetch error:', error);
      setParcelResults({ matched: totalMatched, failed: totalFailed });
      if (totalMatched > 0) onDataUpdate?.();
    } finally {
      setIsFetchingParcels(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Properties</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalProperties}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Home size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">With Owners</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.propertiesWithOwners}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Verified</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.verifiedProperties}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completion</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.completionPercentage}%</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <BarChart3 size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Data Management</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBulkSkipTrace}
            disabled={isBulkSkipTracing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors font-medium flex items-center gap-2"
          >
            <Search size={18} />
            {isBulkSkipTracing ? 'Skip Tracing...' : 'Bulk Skip Trace'}
          </button>
          <button
            onClick={handleFetchParcels}
            disabled={isFetchingParcels}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium flex items-center gap-2"
          >
            <MapPin size={18} />
            {isFetchingParcels ? 'Fetching...' : 'Fetch Parcel Boundaries'}
          </button>
          <button
            disabled
            className="px-4 py-2 bg-slate-300 text-slate-600 rounded-lg cursor-not-allowed font-medium flex items-center gap-2"
            title="Export functionality coming soon"
          >
            <Download size={18} />
            Export to CSV
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Use "Bulk Skip Trace" to automatically find owner contact information for all properties.
        </p>
      </div>

      {isBulkSkipTracing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Skip Tracing in Progress</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-blue-700 mb-1">
              <span>Processing properties...</span>
              <span>{bulkProgress.current} / {bulkProgress.total}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-2">Please wait while we search for contact information...</p>
        </div>
      )}

      {bulkResults && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Skip Trace Complete</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{bulkResults.success}</p>
              <p className="text-sm text-green-700">Successful</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{bulkResults.failed}</p>
              <p className="text-sm text-red-700">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{bulkResults.contactsFound}</p>
              <p className="text-sm text-blue-700">Contacts Found</p>
            </div>
          </div>
        </div>
      )}

      {isFetchingParcels && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-sky-900 mb-3">Fetching Parcel Boundaries</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-sky-700 mb-1">
              <span>Batch {parcelProgress.batch} -- Querying Miami-Dade County GIS...</span>
              <span>{parcelProgress.matched} matched, {parcelProgress.remaining} remaining</span>
            </div>
            <div className="w-full bg-sky-200 rounded-full h-2">
              <div
                className="bg-sky-600 h-2 rounded-full transition-all duration-500 animate-pulse"
                style={{ width: parcelProgress.remaining > 0
                  ? `${Math.max(10, (parcelProgress.matched / (parcelProgress.matched + parcelProgress.remaining)) * 100)}%`
                  : '100%'
                }}
              />
            </div>
          </div>
          <p className="text-sm text-sky-600 mt-2">
            Retrieving real property boundaries from county records (25 properties per batch)...
          </p>
        </div>
      )}

      {parcelResults && !isFetchingParcels && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-sky-900 mb-3">Parcel Boundaries Complete</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-sky-600">{parcelResults.matched}</p>
              <p className="text-sm text-sky-700">Parcels Matched</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{parcelResults.failed}</p>
              <p className="text-sm text-red-700">Not Found</p>
            </div>
          </div>
          {parcelResults.matched > 0 && (
            <p className="text-sm text-sky-700 mt-3">
              Refresh the map view to see the updated parcel boundaries.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

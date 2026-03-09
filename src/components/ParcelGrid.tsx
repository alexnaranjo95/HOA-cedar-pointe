import { useState, useMemo } from 'react';
import { Search, Home, User, ChevronDown } from 'lucide-react';
import { PropertyWithOwner } from '../lib/supabase';

interface ParcelGridProps {
  properties: PropertyWithOwner[];
  selectedPropertyId: string | null;
  onPropertyClick: (property: PropertyWithOwner) => void;
}

function getOwnerBundleKey(property: PropertyWithOwner): string {
  const owners = property.homeowners || [];
  if (owners.length === 0) return 'No Owner / Incomplete';

  // Create a stable key by sorting owner names
  return owners
    .map(h => h.owner_name)
    .sort()
    .join(' & ');
}

function extractHouseNumber(address: string): string {
  const match = address.match(/^(\d+)/);
  return match ? match[1] : '';
}

function extractStreet(address: string): string {
  const match = address.match(/SW\s+(\d+(?:st|nd|rd|th)?\s+(?:St|Ter|Ct|Ave|CT|AVE|ST|TER)(?:\s+Rd)?)/i);
  if (!match) return 'Other';
  return match[1];
}

function isClubhouse(address: string): boolean {
  return address.toLowerCase().includes('clubhouse');
}

function getStatusColor(property: PropertyWithOwner) {
  const hasOwner = property.homeowners && property.homeowners.length > 0;
  const isVerified = property.status === 'verified';
  const isClubhouseProperty = isClubhouse(property.address);

  if (isClubhouseProperty) return { bg: 'bg-purple-50', border: 'border-purple-300', dot: 'bg-purple-600', text: 'text-purple-700' };
  if (isVerified) return { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500', text: 'text-emerald-700' };
  if (hasOwner) return { bg: 'bg-blue-50', border: 'border-blue-300', dot: 'bg-blue-500', text: 'text-blue-700' };
  return { bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-300', text: 'text-slate-600' };
}

export default function ParcelGrid({ properties, selectedPropertyId, onPropertyClick }: ParcelGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'has_owner' | 'verified'>('all');

  const ownerGroups = useMemo(() => {
    const groups: Record<string, PropertyWithOwner[]> = {};

    const filtered = properties.filter(p => {
      const matchesSearch = p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.homeowners?.some(h => h.owner_name.toLowerCase().includes(searchQuery.toLowerCase())));
      if (!matchesSearch) return false;

      if (filterStatus === 'incomplete') return !p.homeowners || p.homeowners.length === 0;
      if (filterStatus === 'has_owner') return p.homeowners && p.homeowners.length > 0;
      if (filterStatus === 'verified') return p.status === 'verified';
      return true;
    });

    filtered.forEach(p => {
      const key = getOwnerBundleKey(p);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    // Sort properties within groups by house number
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const numA = parseInt(extractHouseNumber(a.address)) || 0;
        const numB = parseInt(extractHouseNumber(b.address)) || 0;
        return numA - numB;
      });
    });

    return groups;
  }, [properties, searchQuery, filterStatus]);

  const ownerNames = useMemo(() => {
    return Object.keys(ownerGroups).sort((a, b) => {
      if (a === 'No Owner / Incomplete') return 1;
      if (b === 'No Owner / Incomplete') return -1;
      return a.localeCompare(b);
    });
  }, [ownerGroups]);

  const toggleOwner = (ownerKey: string) => {
    setExpandedOwners(prev => {
      const next = new Set(prev);
      if (next.has(ownerKey)) next.delete(ownerKey);
      else next.add(ownerKey);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedOwners(new Set(ownerNames));
  };

  const collapseAll = () => {
    setExpandedOwners(new Set());
  };

  const totalFiltered = Object.values(ownerGroups).reduce((sum, arr) => sum + arr.length, 0);
  const totalWithOwner = properties.filter(p => p.homeowners && p.homeowners.length > 0).length;
  const totalVerified = properties.filter(p => p.status === 'verified').length;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Cedar Pointe Owners</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {totalVerified} verified
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {totalWithOwner} with owner
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              {properties.length - totalWithOwner} incomplete
            </span>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by owner or address..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            {(['all', 'incomplete', 'has_owner', 'verified'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 transition-colors capitalize ${filterStatus === status
                  ? 'bg-slate-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {status === 'has_owner' ? 'Has Owner' : status}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={expandAll} className="text-xs text-slate-500 hover:text-slate-700">Expand All</button>
          <span className="text-slate-300">|</span>
          <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-700">Collapse</button>
        </div>

        <p className="text-xs text-slate-400">{totalFiltered} properties / {ownerNames.length} owner bundles</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {ownerNames.map(ownerKey => {
          const group = ownerGroups[ownerKey];
          const isExpanded = expandedOwners.has(ownerKey);
          const isNoOwner = ownerKey === 'No Owner / Incomplete';

          return (
            <div key={ownerKey} className="border-b border-slate-100">
              <button
                onClick={() => toggleOwner(ownerKey)}
                className={`w-full px-4 py-3 flex flex-col hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''
                  }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    />
                    <div className="flex flex-col items-start">
                      <span className={`font-bold text-sm ${isNoOwner ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                        {ownerKey}
                      </span>
                      {group.length > 1 && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full mt-0.5">
                          {group.length} PROPERTIES
                        </span>
                      )}
                    </div>
                  </div>

                  {!isNoOwner && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                    </div>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-slate-50 grid grid-cols-1 gap-2">
                  {group.map(property => {
                    const colors = getStatusColor(property);
                    const isSelected = property.id === selectedPropertyId;
                    const houseNum = extractHouseNumber(property.address);
                    const street = extractStreet(property.address);

                    return (
                      <button
                        key={property.id}
                        onClick={() => onPropertyClick(property)}
                        className={`relative text-left p-3 rounded-lg border-2 transition-all duration-200 ${isSelected
                          ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
                          : `${colors.border} ${colors.bg} hover:shadow-sm hover:border-slate-300`
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2">
                            <Home size={14} className="text-slate-400 mt-0.5" />
                            <div>
                              <p className="font-bold text-sm text-slate-800">{houseNum} {street}</p>
                              {property.parcel_number && (
                                <p className="text-[10px] text-slate-500 font-mono">Folio: {property.parcel_number}</p>
                              )}
                            </div>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

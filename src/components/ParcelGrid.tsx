import { useState, useMemo } from 'react';
import { Search, Home, User, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { PropertyWithOwner } from '../lib/supabase';

interface ParcelGridProps {
  properties: PropertyWithOwner[];
  selectedPropertyId: string | null;
  onPropertyClick: (property: PropertyWithOwner) => void;
}

function extractStreet(address: string): string {
  const match = address.match(/SW\s+(\d+(?:st|nd|rd|th)?\s+(?:St|Ter|Ct|Ave|CT|AVE|ST|TER)(?:\s+Rd)?)/i);
  if (!match) return 'Other';
  const raw = match[1];
  const parts = raw.match(/^(\d+)(?:st|nd|rd|th)?\s+(.+)$/i);
  if (!parts) return 'Other';
  const num = parts[1];
  const type = parts[2].trim();
  const typeMap: Record<string, string> = { ct: 'Ct', ave: 'Ave', st: 'St', ter: 'Ter', 'ave rd': 'Ave' };
  const normalized = typeMap[type.toLowerCase()] || type;
  const suffix = num.endsWith('1') && !num.endsWith('11') ? 'st'
    : num.endsWith('2') && !num.endsWith('12') ? 'nd'
    : num.endsWith('3') && !num.endsWith('13') ? 'rd' : 'th';
  return `SW ${num}${suffix} ${normalized}`;
}

function extractHouseNumber(address: string): string {
  const match = address.match(/^(\d+)/);
  return match ? match[1] : '';
}

function isClubhouse(address: string): boolean {
  return address.toLowerCase().includes('clubhouse');
}

function getStatusColor(property: PropertyWithOwner) {
  const hasOwner = property.homeowners && property.homeowners.length > 0;
  const isVerified = property.status === 'verified';
  const isClubhouseProperty = isClubhouse(property.address);

  if (isClubhouseProperty) return { bg: 'bg-purple-50', border: 'border-purple-300', dot: 'bg-purple-600' };
  if (isVerified) return { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500' };
  if (hasOwner) return { bg: 'bg-blue-50', border: 'border-blue-300', dot: 'bg-blue-500' };
  return { bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-300' };
}

export default function ParcelGrid({ properties, selectedPropertyId, onPropertyClick }: ParcelGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStreets, setExpandedStreets] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'has_owner' | 'verified'>('all');

  const streetGroups = useMemo(() => {
    const groups: Record<string, PropertyWithOwner[]> = {};

    const filtered = properties.filter(p => {
      const matchesSearch = p.address.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === 'incomplete') return !p.homeowners || p.homeowners.length === 0;
      if (filterStatus === 'has_owner') return p.homeowners && p.homeowners.length > 0;
      if (filterStatus === 'verified') return p.status === 'verified';
      return true;
    });

    filtered.forEach(p => {
      const street = extractStreet(p.address);
      if (!groups[street]) groups[street] = [];
      groups[street].push(p);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const numA = parseInt(extractHouseNumber(a.address));
        const numB = parseInt(extractHouseNumber(b.address));
        return numA - numB;
      });
    });

    return groups;
  }, [properties, searchQuery, filterStatus]);

  const streetNames = Object.keys(streetGroups).sort();

  const toggleStreet = (street: string) => {
    setExpandedStreets(prev => {
      const next = new Set(prev);
      if (next.has(street)) next.delete(street);
      else next.add(street);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedStreets(new Set(streetNames));
  };

  const collapseAll = () => {
    setExpandedStreets(new Set());
  };

  const totalFiltered = Object.values(streetGroups).reduce((sum, arr) => sum + arr.length, 0);
  const totalWithOwner = properties.filter(p => p.homeowners && p.homeowners.length > 0).length;
  const totalVerified = properties.filter(p => p.status === 'verified').length;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Cedar Pointe Properties</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span className="font-medium">Clubhouse</span>
            </span>
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
            placeholder="Search by address..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            {(['all', 'incomplete', 'has_owner', 'verified'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 transition-colors capitalize ${
                  filterStatus === status
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

        <p className="text-xs text-slate-400">{totalFiltered} properties shown</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {streetNames.map(street => {
          const group = streetGroups[street];
          const isExpanded = expandedStreets.has(street);
          const streetOwnerCount = group.filter(p => p.homeowners && p.homeowners.length > 0).length;

          return (
            <div key={street} className="border-b border-slate-100">
              <button
                onClick={() => toggleStreet(street)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                  />
                  <span className="font-semibold text-sm text-slate-700">{street}</span>
                  <span className="text-xs text-slate-400">({group.length} homes)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${group.length > 0 ? (streetOwnerCount / group.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{streetOwnerCount}/{group.length}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.map(property => {
                    const colors = getStatusColor(property);
                    const isSelected = property.id === selectedPropertyId;
                    const owner = property.homeowners?.[0];
                    const houseNum = extractHouseNumber(property.address);

                    return (
                      <button
                        key={property.id}
                        onClick={() => onPropertyClick(property)}
                        className={`relative text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
                            : `${colors.border} ${colors.bg} hover:shadow-sm hover:border-slate-300`
                        }`}
                      >
                        {isClubhouse(property.address) ? (
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-sm text-purple-700">Clubhouse</span>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <Home size={12} className="text-slate-400 flex-shrink-0" />
                              <span className="font-bold text-sm text-slate-800">{houseNum}</span>
                            </div>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${colors.dot}`} />
                          </div>
                        )}

                        {!isClubhouse(property.address) && (owner ? (
                          <div className="mt-1.5">
                            <p className="text-xs text-slate-600 truncate flex items-center gap-1">
                              <User size={10} className="flex-shrink-0" />
                              {owner.owner_name}
                            </p>
                            {owner.skip_trace_status === 'completed' && (
                              <CheckCircle size={10} className="text-emerald-500 mt-0.5" />
                            )}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                            <AlertCircle size={10} />
                            No owner
                          </p>
                        ))}
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

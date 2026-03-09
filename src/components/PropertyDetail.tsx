import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Search, CheckCircle, AlertCircle, Clock, Save } from 'lucide-react';
import { PropertyWithOwner, SkipTraceContact } from '../lib/supabase';
import { createHomeowner, updateHomeowner, updateProperty } from '../services/propertyService';
import { performSkipTrace, getSkipTraceContacts } from '../services/skipTraceService';
import SkipTraceModal from './SkipTraceModal';

interface PropertyDetailProps {
  property: PropertyWithOwner;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PropertyDetail({ property, onClose, onUpdate }: PropertyDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipTracing, setIsSkipTracing] = useState(false);
  const [showSkipTraceModal, setShowSkipTraceModal] = useState(false);
  const [skipTraceContacts, setSkipTraceContacts] = useState<SkipTraceContact[]>([]);
  const [ownerData, setOwnerData] = useState({
    owner_name: '',
    phone: '',
    email: '',
    mailing_address: '',
    owner_type: 'unknown' as 'owner_occupied' | 'rental' | 'investment' | 'unknown'
  });

  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  const currentOwner = property.homeowners?.[0];

  useEffect(() => {
    if (currentOwner) {
      setOwnerData({
        owner_name: currentOwner.owner_name || '',
        phone: currentOwner.phone || '',
        email: currentOwner.email || '',
        mailing_address: currentOwner.mailing_address || '',
        owner_type: currentOwner.owner_type || 'unknown'
      });
    } else {
      setOwnerData({ owner_name: '', phone: '', email: '', mailing_address: '', owner_type: 'unknown' });
    }
    setIsEditing(false);
  }, [currentOwner, property.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (currentOwner) {
        await updateHomeowner(currentOwner.id, ownerData);
      } else {
        await createHomeowner({ ...ownerData, property_id: property.id, is_primary: true });
      }
      if (ownerData.owner_name) await updateProperty(property.id, { status: 'verified' });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving homeowner:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipTrace = async () => {
    setIsSkipTracing(true);
    try {
      const result = await performSkipTrace(property.id, property.address);
      if (result.success && result.homeownerId) {
        const contacts = await getSkipTraceContacts(result.homeownerId);
        setSkipTraceContacts(contacts);
        setShowSkipTraceModal(true);
      } else {
        alert(result.error || 'No contact information found');
      }
      onUpdate();
    } catch (error) {
      console.error('Skip trace error:', error);
      alert('Failed to perform skip trace.');
    } finally {
      setIsSkipTracing(false);
    }
  };

  const handleCategoryChange = async (field: 'ownership_type' | 'occupancy_type', value: string) => {
    setIsUpdatingCategory(true);
    try {
      await updateProperty(property.id, { [field]: value });
      onUpdate();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert('Failed to update property category.');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const skipStatus = currentOwner?.skip_trace_status;

  // Validation warning logic
  const isConflict =
    property.ownership_type === 'OWNER_OCCUPIED' &&
    (property.occupancy_type === 'RENTER' || property.occupancy_type === 'SECTION_8');

  return (
    <>
      <div className="h-full flex flex-col bg-white border-l border-slate-200">
        <div className={`text-white px-5 py-4 flex items-start justify-between flex-shrink-0 ${property.address.toLowerCase().includes('clubhouse') ? 'bg-purple-700' : 'bg-slate-800'
          }`}>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">
              {property.address.toLowerCase().includes('clubhouse') ? (
                <>Clubhouse - <span className="font-normal">{property.address.split('-')[0].trim()}</span></>
              ) : (
                property.address.split(',')[0]
              )}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">Homestead, FL 33033</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${property.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
              property.status === 'needs_review' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
              {property.status.replace('_', ' ').toUpperCase()}
            </span>
            {skipStatus === 'completed' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                <CheckCircle size={12} /> Skip Traced
              </span>
            )}
            {skipStatus === 'in_progress' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Clock size={12} /> Tracing...
              </span>
            )}
            {skipStatus === 'failed' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                <AlertCircle size={12} /> Failed
              </span>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm relative">
            {isUpdatingCategory && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg z-10">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Clock size={12} className="animate-spin" /> Updating...
                </span>
              </div>
            )}
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Property Categorization</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" title="How the property is owned">
                  Ownership Type
                </label>
                <select
                  value={property.ownership_type || 'UNKNOWN'}
                  onChange={(e) => handleCategoryChange('ownership_type', e.target.value)}
                  className="w-full text-sm py-1.5 px-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 bg-white"
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="OWNER_OCCUPIED">Owner Occupied</option>
                  <option value="LLC_OWNED">LLC Owned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" title="Who resides in the property">
                  Occupancy Type
                </label>
                <select
                  value={property.occupancy_type || 'UNKNOWN'}
                  onChange={(e) => handleCategoryChange('occupancy_type', e.target.value)}
                  className="w-full text-sm py-1.5 px-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 bg-white"
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="HOMEOWNER_OCCUPIED">Homeowner Occupied</option>
                  <option value="RENTER">Renter (Standard)</option>
                  <option value="SECTION_8">Section 8 (Gov Subsidized)</option>
                </select>
              </div>
            </div>

            {isConflict && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs flex items-start gap-1.5 text-amber-800">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <p><strong>Warning:</strong> "Owner Occupied" ownership conflicts with a rental occupancy type. Please verify.</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSkipTrace}
              disabled={isSkipTracing}
              className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-slate-300 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Search size={14} />
              {isSkipTracing ? 'Searching...' : 'Skip Trace'}
            </button>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                {currentOwner ? 'Edit' : 'Add Owner'}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Owner Name *</label>
                <input
                  type="text"
                  value={ownerData.owner_name}
                  onChange={(e) => setOwnerData({ ...ownerData, owner_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="Enter owner name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={ownerData.phone}
                  onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="owner@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mailing Address</label>
                <textarea
                  value={ownerData.mailing_address}
                  onChange={(e) => setOwnerData({ ...ownerData, mailing_address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  rows={2}
                  placeholder="If different from property"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Owner Type</label>
                <select
                  value={ownerData.owner_type}
                  onChange={(e) => setOwnerData({ ...ownerData, owner_type: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                >
                  <option value="unknown">Unknown</option>
                  <option value="owner_occupied">Owner Occupied</option>
                  <option value="rental">Rental Property</option>
                  <option value="investment">Investment Property</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !ownerData.owner_name}
                  className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:bg-slate-300 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : currentOwner ? (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-500" />
                <span className="font-medium text-sm text-slate-800">{currentOwner.owner_name}</span>
                <span className="text-xs text-slate-400 capitalize">({currentOwner.owner_type.replace('_', ' ')})</span>
              </div>

              {currentOwner.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-500" />
                  <a href={`tel:${currentOwner.phone}`} className="text-sm text-blue-600 hover:underline">
                    {currentOwner.phone}
                  </a>
                  {currentOwner.verified_phone && <CheckCircle size={12} className="text-emerald-500" />}
                  {currentOwner.phone_type && currentOwner.phone_type !== 'unknown' && (
                    <span className="text-xs text-slate-400 capitalize">({currentOwner.phone_type})</span>
                  )}
                </div>
              )}

              {currentOwner.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-500" />
                  <a href={`mailto:${currentOwner.email}`} className="text-sm text-blue-600 hover:underline">
                    {currentOwner.email}
                  </a>
                  {currentOwner.verified_email && <CheckCircle size={12} className="text-emerald-500" />}
                </div>
              )}

              {currentOwner.mailing_address && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-500 mt-0.5" />
                  <span className="text-sm text-slate-600">{currentOwner.mailing_address}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <User size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm">No owner info yet</p>
              <p className="text-xs mt-0.5">Use Skip Trace or add manually</p>
            </div>
          )}
        </div>
      </div>

      <SkipTraceModal
        isOpen={showSkipTraceModal}
        onClose={() => setShowSkipTraceModal(false)}
        contacts={skipTraceContacts}
        homeownerId={currentOwner?.id || ''}
        onContactSelected={() => {
          onUpdate();
          setShowSkipTraceModal(false);
        }}
      />
    </>
  );
}

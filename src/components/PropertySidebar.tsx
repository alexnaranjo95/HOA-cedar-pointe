import { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, Home, MapPin, Plus, Trash2, Search, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { PropertyWithOwner, Homeowner, SkipTraceContact } from '../lib/supabase';
import { createHomeowner, updateHomeowner, deleteHomeowner, updateProperty } from '../services/propertyService';
import { performSkipTrace, getSkipTraceContacts } from '../services/skipTraceService';
import NotesSection from './NotesSection';
import SkipTraceModal from './SkipTraceModal';

interface PropertySidebarProps {
  property: PropertyWithOwner | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PropertySidebar({ property, onClose, onUpdate }: PropertySidebarProps) {
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

  const currentOwner = property?.homeowners?.[0];

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
      setOwnerData({
        owner_name: '',
        phone: '',
        email: '',
        mailing_address: '',
        owner_type: 'unknown'
      });
    }
  }, [currentOwner, property]);

  const handleSave = async () => {
    if (!property) return;

    setIsSaving(true);
    try {
      if (currentOwner) {
        await updateHomeowner(currentOwner.id, ownerData);
      } else {
        await createHomeowner({
          ...ownerData,
          property_id: property.id,
          is_primary: true
        });
      }

      if (ownerData.owner_name) {
        await updateProperty(property.id, { status: 'verified' });
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving homeowner:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentOwner || !confirm('Are you sure you want to remove this homeowner?')) return;

    setIsSaving(true);
    try {
      await deleteHomeowner(currentOwner.id);
      if (property) {
        await updateProperty(property.id, { status: 'incomplete' });
      }
      onUpdate();
    } catch (error) {
      console.error('Error deleting homeowner:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipTrace = async () => {
    if (!property) return;

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
      alert('Failed to perform skip trace. Please try again.');
    } finally {
      setIsSkipTracing(false);
    }
  };

  const getSkipTraceStatus = () => {
    if (!currentOwner) return null;

    const status = currentOwner.skip_trace_status;
    const accuracy = currentOwner.skip_trace_accuracy;

    if (status === 'completed') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle size={16} />
          <span>
            Skip Traced {accuracy ? `(${Math.round(accuracy * 100)}% confidence)` : ''}
          </span>
        </div>
      );
    } else if (status === 'in_progress') {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
          <Clock size={16} />
          <span>Skip Trace in Progress...</span>
        </div>
      );
    } else if (status === 'failed') {
      return (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={16} />
          <span>Skip Trace Failed</span>
        </div>
      );
    }
    return null;
  };

  if (!property) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[2000] overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">{property.address}</h2>
            <p className="text-sm text-slate-300">
              Parcel: {property.parcel_number || property.ttrrss || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Property Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className={`font-medium ${
                property.status === 'verified' ? 'text-green-600' :
                property.status === 'needs_review' ? 'text-amber-600' :
                'text-slate-600'
              }`}>
                {property.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            {property.area_sqm && (
              <div className="flex justify-between">
                <span className="text-slate-600">Lot Size:</span>
                <span className="font-medium">{Math.round(property.area_sqm).toLocaleString()} m²</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <User size={20} />
              Homeowner Information
            </h3>
            <div className="flex gap-2">
              {!isEditing && !currentOwner && (
                <button
                  onClick={handleSkipTrace}
                  disabled={isSkipTracing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Search size={16} />
                  {isSkipTracing ? 'Searching...' : 'Skip Trace'}
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {currentOwner ? 'Edit' : 'Add Owner'}
                </button>
              )}
            </div>
          </div>

          {getSkipTraceStatus()}

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={ownerData.owner_name}
                  onChange={(e) => setOwnerData({ ...ownerData, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={ownerData.phone}
                  onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 555-5555"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="owner@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mailing Address
                </label>
                <textarea
                  value={ownerData.mailing_address}
                  onChange={(e) => setOwnerData({ ...ownerData, mailing_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="If different from property address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Owner Type
                </label>
                <select
                  value={ownerData.owner_type}
                  onChange={(e) => setOwnerData({ ...ownerData, owner_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="unknown">Unknown</option>
                  <option value="owner_occupied">Owner Occupied</option>
                  <option value="rental">Rental Property</option>
                  <option value="investment">Investment Property</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !ownerData.owner_name}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:bg-slate-100 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : currentOwner ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User size={18} className="text-slate-600 mt-1" />
                <div>
                  <p className="font-medium">{currentOwner.owner_name}</p>
                  <p className="text-sm text-slate-600 capitalize">
                    {currentOwner.owner_type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {currentOwner.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-slate-600" />
                  <div className="flex-1">
                    <a href={`tel:${currentOwner.phone}`} className="text-blue-600 hover:underline">
                      {currentOwner.phone}
                    </a>
                    {currentOwner.verified_phone && (
                      <span className="ml-2 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} /> Verified
                      </span>
                    )}
                    {currentOwner.phone_type && currentOwner.phone_type !== 'unknown' && (
                      <span className="ml-2 text-xs text-slate-500 capitalize">
                        ({currentOwner.phone_type})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {currentOwner.email && (
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-slate-600" />
                  <div className="flex-1">
                    <a href={`mailto:${currentOwner.email}`} className="text-blue-600 hover:underline">
                      {currentOwner.email}
                    </a>
                    {currentOwner.verified_email && (
                      <span className="ml-2 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {currentOwner.mailing_address && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-600 mt-1" />
                  <p className="text-sm">{currentOwner.mailing_address}</p>
                </div>
              )}

              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="mt-4 w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Remove Homeowner
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <User size={48} className="mx-auto mb-2 text-slate-300" />
              <p>No homeowner information available</p>
              <p className="text-sm mt-1">Click "Add Owner" to get started</p>
            </div>
          )}
        </div>

        <NotesSection
          propertyId={property.id}
          notes={property.notes || []}
          onUpdate={onUpdate}
        />
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
    </div>
  );
}

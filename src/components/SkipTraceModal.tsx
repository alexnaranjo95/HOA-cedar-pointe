import { useState } from 'react';
import { X, Phone, Mail, CheckCircle, AlertCircle, Ban, MapPin } from 'lucide-react';
import { SkipTraceContact } from '../lib/supabase';
import { selectPrimaryContact } from '../services/skipTraceService';
import { supabase } from '../lib/supabase';

interface SkipTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: SkipTraceContact[];
  homeownerId: string;
  onContactSelected: () => void;
}

export default function SkipTraceModal({
  isOpen,
  onClose,
  contacts,
  homeownerId,
  onContactSelected,
}: SkipTraceModalProps) {
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [homeownerData, setHomeownerData] = useState<any>(null);

  if (!isOpen) return null;

  if (isOpen && !homeownerData) {
    (async () => {
      const { data } = await supabase
        .from('homeowners')
        .select('owner_name, mailing_address, alternate_addresses, alternate_phones, alternate_emails')
        .eq('id', homeownerId)
        .maybeSingle();
      if (data) setHomeownerData(data);
    })();
  }

  const phones = contacts.filter(c => c.contact_type === 'phone');
  const emails = contacts.filter(c => c.contact_type === 'email');

  const handleSelectContact = async (contactId: string, contactType: 'phone' | 'email') => {
    setIsSaving(true);
    try {
      await selectPrimaryContact(contactId, homeownerId, contactType);
      onContactSelected();
      onClose();
    } catch (error) {
      console.error('Error selecting contact:', error);
      alert('Failed to select contact');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Skip Trace Results</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No contact information found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {homeownerData?.owner_name && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Owner Name</p>
                  <p className="text-lg font-semibold text-gray-900">{homeownerData.owner_name}</p>
                </div>
              )}

              {(homeownerData?.mailing_address || homeownerData?.alternate_addresses?.length > 0) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Mailing Addresses
                  </h3>
                  <div className="space-y-2">
                    {homeownerData?.mailing_address && (
                      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                        <p className="text-sm text-gray-600 mb-1">Current Address</p>
                        <p className="text-gray-900">{homeownerData.mailing_address}</p>
                      </div>
                    )}
                    {homeownerData?.alternate_addresses?.map((addr: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1 capitalize">{addr.type} Address</p>
                        <p className="text-gray-900">{addr.address}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {phones.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Phone Numbers ({phones.length})
                  </h3>
                  <div className="space-y-2">
                    {phones.map(phone => (
                      <div
                        key={phone.id}
                        className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {phone.contact_value}
                              </span>
                              {phone.verified && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              {phone.dnc_listed && (
                                <Ban className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-500 capitalize">
                                {phone.contact_subtype || 'Unknown Type'}
                              </span>
                              {phone.verified && (
                                <span className="text-xs text-green-600">Verified</span>
                              )}
                              {phone.dnc_listed && (
                                <span className="text-xs text-red-600">DNC Listed</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSelectContact(phone.id, 'phone')}
                            disabled={isSaving || phone.dnc_listed}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              phone.dnc_listed
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {phone.is_selected ? 'Selected' : 'Use This'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {emails.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Addresses ({emails.length})
                  </h3>
                  <div className="space-y-2">
                    {emails.map(email => (
                      <div
                        key={email.id}
                        className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {email.contact_value}
                              </span>
                              {email.verified && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            {email.verified && (
                              <span className="text-xs text-green-600 mt-1 inline-block">
                                Verified
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleSelectContact(email.id, 'email')}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {email.is_selected ? 'Selected' : 'Use This'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {homeownerData?.alternate_phones && homeownerData.alternate_phones.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Additional Phone Numbers
                  </h3>
                  <div className="space-y-2">
                    {homeownerData.alternate_phones.map((phone: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {phone.number}
                              </span>
                              {phone.verified && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500 capitalize mt-1">
                              {phone.type || 'Unknown Type'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {homeownerData?.alternate_emails && homeownerData.alternate_emails.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Additional Email Addresses
                  </h3>
                  <div className="space-y-2">
                    {homeownerData.alternate_emails.map((email: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {email.email}
                          </span>
                          {email.verified && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Property {
  id: string;
  object_id: number | null;
  ttrrss: string | null;
  parcel_number: string | null;
  address: string;
  geometry: any;
  area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  ownership_type: 'LLC_OWNED' | 'OWNER_OCCUPIED' | 'UNKNOWN';
  occupancy_type: 'SECTION_8' | 'RENTER' | 'HOMEOWNER_OCCUPIED' | 'UNKNOWN';
  status: 'verified' | 'needs_review' | 'incomplete';
  created_at: string;
  updated_at: string;
}

export interface Homeowner {
  id: string;
  property_id: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  mailing_address: string | null;
  owner_type: 'owner_occupied' | 'rental' | 'investment' | 'unknown';
  is_primary: boolean;
  skip_trace_status: 'not_traced' | 'in_progress' | 'completed' | 'failed';
  skip_trace_accuracy: number | null;
  skip_traced_at: string | null;
  verified_phone: boolean;
  verified_email: boolean;
  phone_type: 'mobile' | 'landline' | 'voip' | 'unknown';
  alternate_phones: any;
  alternate_emails: any;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  property_id: string;
  note_text: string;
  category: 'contacted' | 'no_response' | 'opted_out' | 'general' | 'follow_up';
  created_at: string;
  created_by: string;
}

export interface SkipTraceLog {
  id: string;
  homeowner_id: string | null;
  property_id: string;
  api_request: any;
  api_response: any;
  status: 'success' | 'failed' | 'no_data';
  accuracy_score: number | null;
  contacts_found: number;
  error_message: string | null;
  created_at: string;
  created_by: string;
}

export interface SkipTraceContact {
  id: string;
  homeowner_id: string;
  contact_type: 'phone' | 'email';
  contact_value: string;
  contact_subtype: string | null;
  verified: boolean;
  is_selected: boolean;
  dnc_listed: boolean;
  skip_trace_log_id: string | null;
  created_at: string;
}

export interface PropertyWithOwner extends Property {
  homeowners?: Homeowner[];
  notes?: Note[];
}

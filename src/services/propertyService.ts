import { supabase, Property, Homeowner, Note, PropertyWithOwner } from '../lib/supabase';
import { CEDAR_POINTE_ADDRESSES } from '../data/addresses';

export async function getAllProperties(): Promise<PropertyWithOwner[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      homeowners(*),
      notes(*)
    `)
    .neq('status', 'excluded')
    .order('address');

  if (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    await initializeProperties();
    return getAllProperties();
  }

  await syncMissingAddresses(data);

  return data || [];
}

function normalizeAddress(addr: string): string {
  return addr.replace(/\s+/g, ' ').trim().toLowerCase().replace(/,\s*/g, ', ');
}

async function syncMissingAddresses(existing: PropertyWithOwner[]) {
  const existingNormalized = new Set(existing.map(p => normalizeAddress(p.address)));
  const missing = CEDAR_POINTE_ADDRESSES.filter(
    addr => !existingNormalized.has(normalizeAddress(addr))
  );

  if (missing.length === 0) return;

  const { error } = await supabase
    .from('properties')
    .upsert(
      missing.map(address => ({ address, status: 'incomplete' as const })),
      { onConflict: 'address', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error syncing missing addresses:', error);
  }
}

async function initializeProperties() {
  const properties = CEDAR_POINTE_ADDRESSES.map(address => ({
    address,
    status: 'incomplete' as const
  }));

  const { error } = await supabase
    .from('properties')
    .insert(properties);

  if (error) {
    console.error('Error initializing properties:', error);
    throw error;
  }
}

export async function getPropertyById(id: string): Promise<PropertyWithOwner | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      homeowners(*),
      notes(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching property:', error);
    throw error;
  }

  return data;
}

export async function createProperty(property: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();

  if (error) {
    console.error('Error creating property:', error);
    throw error;
  }

  return data;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating property:', error);
    throw error;
  }

  return data;
}

export async function createHomeowner(homeowner: Partial<Homeowner>): Promise<Homeowner> {
  const { data, error } = await supabase
    .from('homeowners')
    .insert(homeowner)
    .select()
    .single();

  if (error) {
    console.error('Error creating homeowner:', error);
    throw error;
  }

  return data;
}

export async function updateHomeowner(id: string, updates: Partial<Homeowner>): Promise<Homeowner> {
  const { data, error } = await supabase
    .from('homeowners')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating homeowner:', error);
    throw error;
  }

  return data;
}

export async function deleteHomeowner(id: string): Promise<void> {
  const { error } = await supabase
    .from('homeowners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting homeowner:', error);
    throw error;
  }
}

export async function createNote(note: Partial<Note>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single();

  if (error) {
    console.error('Error creating note:', error);
    throw error;
  }

  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}

export async function fetchParcelGeometry(): Promise<{ matched: number; failed: number; remaining: number }> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-parcel-geometry`;
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(apiUrl, { method: 'POST', headers });
  if (!response.ok) {
    throw new Error('Failed to fetch parcel geometry');
  }
  return response.json();
}

export async function getStatistics() {
  const { data: properties } = await supabase.from('properties').select('*').neq('status', 'excluded');
  const { data: homeowners } = await supabase.from('homeowners').select('*');

  const totalProperties = properties?.length || 0;
  const propertiesWithOwners = new Set(homeowners?.map(h => h.property_id)).size;
  const verifiedProperties = properties?.filter(p => p.status === 'verified').length || 0;

  return {
    totalProperties,
    propertiesWithOwners,
    verifiedProperties,
    completionPercentage: totalProperties > 0
      ? Math.round((propertiesWithOwners / totalProperties) * 100)
      : 0
  };
}

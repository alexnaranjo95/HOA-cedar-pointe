import { supabase } from '../lib/supabase';

export interface SkipTraceResult {
  success: boolean;
  homeownerId?: string;
  contactsFound: number;
  accuracy?: number;
  error?: string;
}

interface BatchDataSkipTraceResponse {
  success: boolean;
  error?: string;
  owner_name?: string;
  phones: Array<{
    number: string;
    type: string;
    verified: boolean;
    dnc?: boolean;
  }>;
  emails: Array<{
    email: string;
    verified: boolean;
  }>;
  mailing_addresses?: Array<{
    address: string;
    type: string;
  }>;
  accuracy: number;
}

async function skipTraceSingleProperty(address: string): Promise<BatchDataSkipTraceResponse> {
  const firstNames = ['John', 'Mary', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'David', 'Linda', 'James', 'Barbara'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  const numPhones = Math.floor(Math.random() * 3) + 1;
  const numEmails = Math.floor(Math.random() * 2) + 1;
  const numAddresses = Math.floor(Math.random() * 2) + 1;

  const phones = [];
  const phoneTypes = ['mobile', 'landline', 'voip'];
  for (let i = 0; i < numPhones; i++) {
    phones.push({
      number: '(305) 555-' + Math.floor(1000 + Math.random() * 9000),
      type: phoneTypes[Math.floor(Math.random() * phoneTypes.length)],
      verified: Math.random() > 0.3,
      dnc: Math.random() > 0.85
    });
  }

  const emails = [];
  const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'example.com'];
  for (let i = 0; i < numEmails; i++) {
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    emails.push({
      email: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i > 0 ? i : ''}@${domain}`,
      verified: Math.random() > 0.35
    });
  }

  const mailingAddresses = [];
  const cities = ['Homestead', 'Miami', 'Kendall', 'Palmetto', 'Florida City', 'Doral', 'Hialeah'];
  for (let i = 0; i < numAddresses; i++) {
    const zipBase = ['33030', '33031', '33032', '33033', '33034', '33035'];
    mailingAddresses.push({
      address: `${Math.floor(1000 + Math.random() * 9000)} ${['SW', 'NW', 'SE', 'NE'][Math.floor(Math.random() * 4)]} ${Math.floor(100 + Math.random() * 300)}th St, ${cities[Math.floor(Math.random() * cities.length)]}, FL ${zipBase[Math.floor(Math.random() * zipBase.length)]}`,
      type: i === 0 ? 'current' : 'previous'
    });
  }

  const mockResponse: BatchDataSkipTraceResponse = {
    success: true,
    owner_name: `${firstName} ${lastName}`,
    phones,
    emails,
    mailing_addresses: mailingAddresses,
    accuracy: Math.floor(60 + Math.random() * 40)
  };

  await new Promise(resolve => setTimeout(resolve, 300));

  return mockResponse;
}

export async function performSkipTrace(
  propertyId: string,
  address: string
): Promise<SkipTraceResult> {
  try {
    const { data: existingHomeowner } = await supabase
      .from('homeowners')
      .select('id')
      .eq('property_id', propertyId)
      .maybeSingle();

    let homeownerId = existingHomeowner?.id;

    if (!existingHomeowner) {
      const { data: newHomeowner } = await supabase
        .from('homeowners')
        .insert({
          property_id: propertyId,
          owner_name: '',
          is_primary: true,
          skip_trace_status: 'in_progress'
        })
        .select('id')
        .single();
      homeownerId = newHomeowner?.id;
    } else {
      await supabase
        .from('homeowners')
        .update({ skip_trace_status: 'in_progress' })
        .eq('id', existingHomeowner.id);
    }

    const apiRequest = {
      address,
      include_emails: true,
      include_phones: true,
    };

    const result: BatchDataSkipTraceResponse = await skipTraceSingleProperty(address);

    if (!result.success || result.error) {
      if (existingHomeowner) {
        await supabase
          .from('homeowners')
          .update({ skip_trace_status: 'failed' })
          .eq('id', existingHomeowner.id);
      }

      await supabase.from('skip_trace_logs').insert({
        homeowner_id: homeownerId || null,
        property_id: propertyId,
        api_request: apiRequest,
        api_response: result,
        status: 'failed',
        error_message: result.error,
        contacts_found: 0,
      });

      return {
        success: false,
        error: result.error || 'Skip trace failed',
        contactsFound: 0,
      };
    }

    const contactsFound = result.phones.length + result.emails.length;

    const { data: logData } = await supabase
      .from('skip_trace_logs')
      .insert({
        homeowner_id: homeownerId || null,
        property_id: propertyId,
        api_request: apiRequest,
        api_response: result,
        status: contactsFound > 0 ? 'success' : 'no_data',
        accuracy_score: result.accuracy,
        contacts_found: contactsFound,
      })
      .select()
      .single();

    if (result.phones.length > 0 || result.emails.length > 0) {
      const contacts = [
        ...result.phones.map(phone => ({
          homeowner_id: homeownerId,
          contact_type: 'phone' as const,
          contact_value: phone.number,
          contact_subtype: phone.type,
          verified: phone.verified,
          dnc_listed: phone.dnc || false,
          skip_trace_log_id: logData?.id,
        })),
        ...result.emails.map(email => ({
          homeowner_id: homeownerId,
          contact_type: 'email' as const,
          contact_value: email.email,
          contact_subtype: null,
          verified: email.verified,
          dnc_listed: false,
          skip_trace_log_id: logData?.id,
        })),
      ];

      if (homeownerId) {
        await supabase.from('skip_trace_contacts').insert(contacts);
      }
    }

    if (homeownerId) {
      const updateData: any = {
        skip_trace_status: 'completed',
        skip_trace_accuracy: result.accuracy,
        skip_traced_at: new Date().toISOString(),
      };

      if (result.owner_name) {
        updateData.owner_name = result.owner_name;
      }

      if (result.mailing_addresses && result.mailing_addresses.length > 0) {
        const currentAddress = result.mailing_addresses.find(a => a.type === 'current');
        if (currentAddress) {
          updateData.mailing_address = currentAddress.address;
        }

        const alternateAddresses = result.mailing_addresses
          .filter(a => a.type === 'previous')
          .map(a => ({ address: a.address, type: 'previous' }));
        if (alternateAddresses.length > 0) {
          updateData.alternate_addresses = alternateAddresses;
        }
      }

      if (result.phones.length > 0) {
        const alternatePhones = result.phones.slice(1).map(p => ({
          number: p.number,
          type: p.type,
          verified: p.verified
        }));
        if (alternatePhones.length > 0) {
          updateData.alternate_phones = alternatePhones;
        }
      }

      if (result.emails.length > 0) {
        const alternateEmails = result.emails.slice(1).map(e => ({
          email: e.email,
          verified: e.verified
        }));
        if (alternateEmails.length > 0) {
          updateData.alternate_emails = alternateEmails;
        }
      }

      await supabase
        .from('homeowners')
        .update(updateData)
        .eq('id', homeownerId);
    }

    return {
      success: true,
      homeownerId,
      contactsFound,
      accuracy: result.accuracy,
    };
  } catch (error) {
    console.error('Skip trace service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      contactsFound: 0,
    };
  }
}

export async function getSkipTraceContacts(homeownerId: string) {
  const { data, error } = await supabase
    .from('skip_trace_contacts')
    .select('*')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function selectPrimaryContact(
  contactId: string,
  homeownerId: string,
  contactType: 'phone' | 'email'
) {
  const { data: contact } = await supabase
    .from('skip_trace_contacts')
    .select('contact_value, contact_subtype, verified')
    .eq('id', contactId)
    .single();

  if (!contact) {
    throw new Error('Contact not found');
  }

  await supabase
    .from('skip_trace_contacts')
    .update({ is_selected: false })
    .eq('homeowner_id', homeownerId)
    .eq('contact_type', contactType);

  await supabase
    .from('skip_trace_contacts')
    .update({ is_selected: true })
    .eq('id', contactId);

  const updateData: any = {};

  if (contactType === 'phone') {
    updateData.phone = contact.contact_value;
    updateData.phone_type = contact.contact_subtype || 'unknown';
    updateData.verified_phone = contact.verified;
  } else {
    updateData.email = contact.contact_value;
    updateData.verified_email = contact.verified;
  }

  await supabase
    .from('homeowners')
    .update(updateData)
    .eq('id', homeownerId);

  return contact;
}

export async function getSkipTraceHistory(propertyId: string) {
  const { data, error } = await supabase
    .from('skip_trace_logs')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function bulkSkipTrace(propertyIds: string[]) {
  const results = [];

  for (const propertyId of propertyIds) {
    const { data: property } = await supabase
      .from('properties')
      .select('address')
      .eq('id', propertyId)
      .single();

    if (property?.address) {
      const result = await performSkipTrace(propertyId, property.address);
      results.push({ propertyId, ...result });

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

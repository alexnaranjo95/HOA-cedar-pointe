import { supabase } from '../lib/supabase';
import {
  groupAddressesByStreet,
  findAddressGaps,
  AddressGap,
  AddressSequence,
} from '../utils/addressParser';
import { CEDAR_POINTE_ADDRESSES } from '../data/addresses';

export interface GapAnalysisReport {
  totalProperties: number;
  totalGapsFound: number;
  verifiedProperties: number;
  completionPercentage: number;
  gapsByStreet: GapsByStreetReport[];
  allGaps: AddressGap[];
  analysisDate: string;
}

export interface GapsByStreetReport {
  streetKey: string;
  direction: string;
  streetName: string;
  streetSuffix: string;
  totalNumbers: number;
  actualProperties: number;
  gapCount: number;
  gapPercentage: number;
  gaps: AddressGap[];
}

export async function analyzeAddressGaps(): Promise<GapAnalysisReport> {
  try {
    const sequences = groupAddressesByStreet(CEDAR_POINTE_ADDRESSES);
    const allGaps: AddressGap[] = [];
    const gapsByStreet: GapsByStreetReport[] = [];

    for (const sequence of sequences.values()) {
      const gaps = findAddressGaps(sequence);
      allGaps.push(...gaps);

      const totalNumbers = sequence.maxNumber - sequence.minNumber + 1;
      const gapPercentage = totalNumbers > 0 ? (gaps.length / totalNumbers) * 100 : 0;

      gapsByStreet.push({
        streetKey: sequence.key,
        direction: sequence.direction,
        streetName: sequence.streetName,
        streetSuffix: sequence.streetSuffix,
        totalNumbers,
        actualProperties: sequence.numbers.length,
        gapCount: gaps.length,
        gapPercentage,
        gaps,
      });
    }

    gapsByStreet.sort((a, b) => b.gapCount - a.gapCount);

    const { data: homeowners } = await supabase.from('homeowners').select('property_id');
    const { data: properties } = await supabase.from('properties').select('*');

    const verifiedPropertyIds = new Set(homeowners?.map(h => h.property_id) || []);
    const verifiedProperties = properties?.filter(p => p.status === 'verified').length || 0;

    const report: GapAnalysisReport = {
      totalProperties: CEDAR_POINTE_ADDRESSES.length,
      totalGapsFound: allGaps.length,
      verifiedProperties,
      completionPercentage:
        CEDAR_POINTE_ADDRESSES.length > 0
          ? Math.round((verifiedPropertyIds.size / CEDAR_POINTE_ADDRESSES.length) * 100)
          : 0,
      gapsByStreet,
      allGaps,
      analysisDate: new Date().toISOString(),
    };

    return report;
  } catch (error) {
    console.error('Error analyzing address gaps:', error);
    throw error;
  }
}

export async function saveGapsToDatabase(gaps: AddressGap[]): Promise<void> {
  const gapRecords = gaps.map(gap => ({
    street_number: gap.streetNumber,
    street_name: gap.streetName,
    full_address: gap.fullAddress,
    gap_sequence: gap.streetKey,
    is_confirmed_missing: false,
  }));

  const { error } = await supabase.from('address_gaps').insert(gapRecords);

  if (error) {
    console.error('Error saving gaps to database:', error);
    throw error;
  }
}

export async function clearGapsFromDatabase(): Promise<void> {
  const { error } = await supabase.from('address_gaps').delete().neq('id', '');

  if (error) {
    console.error('Error clearing gaps:', error);
    throw error;
  }
}

export async function getStoredGaps(): Promise<AddressGap[]> {
  const { data, error } = await supabase
    .from('address_gaps')
    .select('*')
    .order('full_address');

  if (error) {
    console.error('Error fetching stored gaps:', error);
    throw error;
  }

  return (data || []).map(row => ({
    streetNumber: row.street_number,
    streetKey: row.gap_sequence,
    streetName: row.street_name,
    streetSuffix: '',
    direction: '',
    fullAddress: row.full_address,
  }));
}

export async function saveAnalysisResult(report: GapAnalysisReport): Promise<void> {
  const metadata = {
    gapsByStreet: report.gapsByStreet.map(g => ({
      streetKey: g.streetKey,
      totalNumbers: g.totalNumbers,
      actualProperties: g.actualProperties,
      gapCount: g.gapCount,
      gapPercentage: g.gapPercentage,
    })),
  };

  const { error } = await supabase.from('address_analysis_results').insert({
    analysis_date: report.analysisDate,
    total_properties: report.totalProperties,
    total_gaps_found: report.totalGapsFound,
    verified_properties: report.verifiedProperties,
    analysis_metadata: metadata,
  });

  if (error) {
    console.error('Error saving analysis result:', error);
    throw error;
  }
}

export async function updateGapResearchStatus(
  gapId: string,
  status: 'not_started' | 'in_progress' | 'completed' | 'confirmed_missing',
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('address_research_notes')
    .upsert(
      {
        gap_id: gapId,
        research_status: status,
        public_records_found: notes,
        last_checked: new Date().toISOString(),
      },
      { onConflict: 'gap_id' }
    );

  if (error) {
    console.error('Error updating gap research status:', error);
    throw error;
  }
}

export async function getLatestAnalysisResult(): Promise<GapAnalysisReport | null> {
  const { data, error } = await supabase
    .from('address_analysis_results')
    .select('*')
    .order('analysis_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest analysis:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    totalProperties: data.total_properties,
    totalGapsFound: data.total_gaps_found,
    verifiedProperties: data.verified_properties,
    completionPercentage: 0,
    gapsByStreet: [],
    allGaps: [],
    analysisDate: data.analysis_date,
  };
}

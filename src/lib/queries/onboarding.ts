import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { missingRequiredFields } from '@/lib/validation/onboarding';

export interface OnboardingSectionView extends Tables<'onboarding_sections'> {
  missingRequired: string[];
}

export interface OnboardingSummary {
  sections: OnboardingSectionView[];
  /** Sections marked "not required" are excluded from the denominator. */
  completion: number;
  countedTotal: number;
  approved: number;
  awaitingReview: number;
  needsChanges: number;
}

export async function getOnboarding(projectId: string): Promise<OnboardingSummary> {

  const { data, error } = await supabase
    .from('onboarding_sections')
    .select('*')
    .eq('project_id', projectId)
    .order('position');

  if (error) throw new Error(`Failed to load onboarding: ${error.message}`);

  const sections: OnboardingSectionView[] = (data ?? []).map((section) => ({
    ...section,
    missingRequired: missingRequiredFields(
      section.key,
      (section.responses ?? {}) as Record<string, unknown>,
    ),
  }));

  const counted = sections.filter((s) => s.status !== 'not_required');
  const approved = counted.filter((s) => s.status === 'approved').length;

  return {
    sections,
    countedTotal: counted.length,
    approved,
    completion: counted.length === 0 ? 0 : Math.round((approved / counted.length) * 100),
    awaitingReview: sections.filter((s) => s.status === 'submitted').length,
    needsChanges: sections.filter((s) => s.status === 'needs_changes').length,
  };
}

export async function getOnboardingSection(projectId: string, key: string) {

  const { data } = await supabase
    .from('onboarding_sections')
    .select('*')
    .eq('project_id', projectId)
    .eq('key', key)
    .maybeSingle();

  return data;
}

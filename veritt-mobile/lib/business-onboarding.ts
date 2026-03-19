import { BusinessOnboarding } from '@/types/business.types';

export type OnboardingChecklistItem = {
  key: keyof Pick<
    BusinessOnboarding,
    | 'generalInfoCompleted'
    | 'staffCompleted'
    | 'productsCompleted'
    | 'ingredientsCompleted'
    | 'recipesCompleted'
    | 'fixedCostsCompleted'
    | 'areasCompleted'
    | 'providersCompleted'
  >;
  label: string;
};

export const ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  { key: 'generalInfoCompleted', label: 'Información general' },
  { key: 'staffCompleted', label: 'Equipo' },
  { key: 'productsCompleted', label: 'Productos' },
  { key: 'ingredientsCompleted', label: 'Ingredientes' },
  { key: 'recipesCompleted', label: 'Recetas' },
  { key: 'fixedCostsCompleted', label: 'Costos fijos' },
  { key: 'areasCompleted', label: 'Áreas' },
  { key: 'providersCompleted', label: 'Proveedores' },
];

export function getPendingOnboardingSteps(onboarding: BusinessOnboarding): string[] {
  return ONBOARDING_CHECKLIST.filter((item) => !onboarding[item.key]).map(
    (item) => item.label
  );
}
import { InventoryLocation } from '@/types/inventory.types'

export type BusinessType =
  | 'RESTAURANT'
  | 'CAFE'
  | 'BAR'
  | 'RETAIL'
  | 'OTHER';

// Roles R1–R6 (V8.0). Debe reflejar el enum MembershipRole del backend.
export type MembershipRole =
  | 'R1_INVENTORY'
  | 'R2_CASH'
  | 'R3_POS'
  | 'R4_MANAGER'
  | 'R5_ADMIN'
  | 'R6_OWNER'
  | 'VERITT_STAFF';

// "Managers": de R4 hacia arriba + staff interno.
export const MANAGER_ROLES: MembershipRole[] = [
  'R4_MANAGER',
  'R5_ADMIN',
  'R6_OWNER',
  'VERITT_STAFF',
];

export interface Business {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  description?: string;
  timezone: string;
  defaultCurrency: string;
  city?: string;
  state?: string;
  operationalScheduleJson?: Record<string, any>;
  operationalDayCutoffHour: number;
  inventoryLocations?: InventoryLocation[];
  userRole?: MembershipRole | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBusinessDto {
  name: string;
  slug: string;
  businessType: BusinessType;
  timezone: string;
  operationalDayCutoffHour: number;
  defaultCurrency?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  slug?: string;
  businessType?: BusinessType;
  description?: string;
  timezone?: string;
  defaultCurrency?: string;
  city?: string;
  state?: string;
  operationalScheduleJson?: Record<string, any>;
  operationalDayCutoffHour?: number;
}


export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type OnboardingStep =
  | 'general_info'
  | 'staff'
  | 'products'
  | 'ingredients'
  | 'recipes'
  | 'fixed_costs'
  | 'areas'
  | 'providers';

export interface BusinessOnboarding {
  id: string;
  businessId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep | string;
  completionPercentage: number;
  generalInfoCompleted: boolean;
  staffCompleted: boolean;
  productsCompleted: boolean;
  ingredientsCompleted: boolean;
  recipesCompleted: boolean;
  fixedCostsCompleted: boolean;
  areasCompleted: boolean;
  providersCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateBusinessOnboardingDto {
  status?: OnboardingStatus;
  currentStep?: OnboardingStep | string;
  completionPercentage?: number;
  generalInfoCompleted?: boolean;
  staffCompleted?: boolean;
  productsCompleted?: boolean;
  ingredientsCompleted?: boolean;
  recipesCompleted?: boolean;
  fixedCostsCompleted?: boolean;
  areasCompleted?: boolean;
  providersCompleted?: boolean;
}

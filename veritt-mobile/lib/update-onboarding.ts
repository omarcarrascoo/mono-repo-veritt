import { businessesApi } from '@/api/modules/businesses.api';

//STEP 1 - General Info Completed
export async function markGeneralInfoCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'staff',
    completionPercentage: 15,
    generalInfoCompleted: true,
  });
}

//STEP 2 - Staff Completed
export async function markStaffStepCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'products',
    completionPercentage: 30,
    generalInfoCompleted: true,
    staffCompleted: true,
  });
}

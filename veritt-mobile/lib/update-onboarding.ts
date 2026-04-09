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
    staffCompleted: true,
  });
}

//STEP 3 - Products Completed
export async function markProductsStepCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'ingredients',
    completionPercentage: 40,
    productsCompleted: true,
  });
}

//STEP 4 - Ingredients (Materials) Completed
export async function markIngredientsStepCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'recipes',
    completionPercentage: 50,
    ingredientsCompleted: true,
  });
}

//STEP 5 - Recipes Completed
export async function markRecipesStepCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'areas',
    completionPercentage: 65,
    recipesCompleted: true,
  });
}

//STEP 6 - Areas Completed
export async function markAreasStepCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'fixed_costs',
    completionPercentage: 75,
    areasCompleted: true,
  });
}

//STEP 7 - Providers Completed
export async function markProvidersStepCompleted(businessId: string) {
  return businessesApi.updateOnboarding(businessId, {
    status: 'IN_PROGRESS',
    currentStep: 'completed',
    completionPercentage: 90,
    providersCompleted: true,
  });
}

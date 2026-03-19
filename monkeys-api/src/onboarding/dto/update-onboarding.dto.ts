import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateOnboardingDto {
  @IsOptional() @IsIn(['DRAFT', 'IN_PROGRESS', 'READY']) status?: 'DRAFT' | 'IN_PROGRESS' | 'READY';
  @IsOptional() @IsIn(['general_info', 'staff', 'products', 'ingredients', 'recipes', 'fixed_costs', 'areas', 'providers']) currentStep?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) completionPercentage?: number;
  @IsOptional() @IsBoolean() generalInfoCompleted?: boolean;
  @IsOptional() @IsBoolean() staffCompleted?: boolean;
  @IsOptional() @IsBoolean() productsCompleted?: boolean;
  @IsOptional() @IsBoolean() ingredientsCompleted?: boolean;
  @IsOptional() @IsBoolean() recipesCompleted?: boolean;
  @IsOptional() @IsBoolean() fixedCostsCompleted?: boolean;
  @IsOptional() @IsBoolean() areasCompleted?: boolean;
  @IsOptional() @IsBoolean() providersCompleted?: boolean;
}
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PermissionsConfigService } from './permissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetRoleCapabilitiesDto } from './dto/set-role-capabilities.dto';
import type { Role } from '../common/constants/roles.constants';

@Controller('businesses/:businessId/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly config: PermissionsConfigService) {}

  // Matriz efectiva del negocio (default + override) — para la pantalla de R6.
  @Get()
  getMatrix(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.config.getMatrix(businessId, user.id);
  }

  // Configura (override completo) las capacidades de un rol.
  @Put(':role')
  setRole(
    @Param('businessId') businessId: string,
    @Param('role') role: Role,
    @CurrentUser() user: { id: string },
    @Body() dto: SetRoleCapabilitiesDto,
  ) {
    return this.config.setRole(businessId, user.id, role, dto.capabilities);
  }

  // Restaura el default de un rol (borra el override).
  @Delete(':role')
  resetRole(
    @Param('businessId') businessId: string,
    @Param('role') role: Role,
    @CurrentUser() user: { id: string },
  ) {
    return this.config.resetRole(businessId, user.id, role);
  }
}

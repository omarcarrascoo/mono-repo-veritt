import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class BusinessMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> { // <-- Corregido
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const businessId = request.params.businessId;

    if (!user?.id) throw new ForbiddenException('Unauthorized');
    if (!businessId) throw new NotFoundException('businessId param is required');

    const membership = await this.prisma.businessMembership.findFirst({
      where: {
        businessId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    // Inyectamos la membresía en el request para que los siguientes guards o el controlador la puedan usar
    request.membership = membership;
    return true;
  }
}
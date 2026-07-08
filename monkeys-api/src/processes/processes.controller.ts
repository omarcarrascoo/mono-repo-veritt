import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { CreateProcessExecutionDto } from './dto/create-process-execution.dto';

@Controller('businesses/:businessId/processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.processesService.findAll(businessId, user.id);
  }

  @Get('executions')
  findExecutions(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('processId') processId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.processesService.findExecutions(businessId, user.id, { processId, status, from, to });
  }

  @Get(':processId')
  findOne(
    @Param('businessId') businessId: string,
    @Param('processId') processId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.processesService.findOne(businessId, processId, user.id);
  }

  @Post()
  create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProcessDto,
  ) {
    return this.processesService.create(businessId, user.id, dto);
  }

  @Patch(':processId')
  update(
    @Param('businessId') businessId: string,
    @Param('processId') processId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProcessDto,
  ) {
    return this.processesService.update(businessId, processId, user.id, dto);
  }

  @Post(':processId/executions')
  startExecution(
    @Param('businessId') businessId: string,
    @Param('processId') processId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProcessExecutionDto,
  ) {
    return this.processesService.startExecution(businessId, processId, user.id, dto.areaId, dto.notes);
  }

  @Patch(':processId/executions/:executionId/complete')
  completeExecution(
    @Param('businessId') businessId: string,
    @Param('processId') processId: string,
    @Param('executionId') executionId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { notes?: string },
  ) {
    return this.processesService.completeExecution(businessId, processId, executionId, user.id, body.notes);
  }
}

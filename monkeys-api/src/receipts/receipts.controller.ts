import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { CancelReceiptDto } from './dto/cancel-receipt.dto';
import { RejectReceiptDto } from './dto/reject-receipt.dto';

@Controller('businesses/:businessId/receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReceiptDto,
  ) {
    return this.receiptsService.create(businessId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.receiptsService.findAll(businessId, user.id, { purchaseOrderId, from, to });
  }

  @Get(':receiptId')
  findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.receiptsService.findOne(businessId, receiptId, user.id);
  }

  @Post(':receiptId/cancel')
  cancel(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CancelReceiptDto,
  ) {
    return this.receiptsService.cancel(businessId, receiptId, user.id, dto);
  }

  @Post(':receiptId/authorize')
  authorize(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.receiptsService.authorize(businessId, receiptId, user.id);
  }

  @Post(':receiptId/reject')
  reject(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: RejectReceiptDto,
  ) {
    return this.receiptsService.reject(businessId, receiptId, user.id, dto.reason);
  }
}

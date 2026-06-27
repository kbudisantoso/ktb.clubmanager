import { Controller, Get, Post, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireClubContext, GetClubContext } from '../common/decorators/club-context.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import type { ClubContext } from '../common/decorators/club-context.decorator.js';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('clubs/:slug/fees/payments')
@RequireClubContext()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions([Permission.FINANCE_CREATE])
  @ApiOperation({ summary: 'Record a manual payment against a fee charge' })
  @ApiResponse({ status: 201, description: 'Payment recorded, updated charge status returned' })
  @ApiResponse({ status: 404, description: 'Fee charge not found' })
  async recordPayment(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: RecordPaymentDto,
    @CurrentUser('id') userId: string
  ) {
    return this.paymentsService.recordPayment(ctx.clubId, dto, userId);
  }

  @Get('charge/:chargeId')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'List all payments for a fee charge' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async findPaymentsForCharge(
    @GetClubContext() ctx: ClubContext,
    @Param('chargeId') chargeId: string
  ) {
    return this.paymentsService.findPaymentsForCharge(ctx.clubId, chargeId);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions([Permission.FINANCE_DELETE])
  @ApiOperation({ summary: 'Soft-delete a payment and recalculate charge status' })
  @ApiResponse({ status: 200, description: 'Payment deleted, updated charge status returned' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async softDeletePayment(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.paymentsService.softDeletePayment(ctx.clubId, id, userId);
  }
}

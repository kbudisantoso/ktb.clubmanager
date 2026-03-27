import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireClubContext, GetClubContext } from '../common/decorators/club-context.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';

import { FeeChargesService } from './fee-charges.service.js';
import { BillingRunPreviewDto } from './dto/billing-run-preview.dto.js';
import { BillingRunConfirmDto } from './dto/billing-run-confirm.dto.js';
import { FeeChargeQueryDto } from './dto/fee-charge-query.dto.js';
import type { ClubContext } from '../common/decorators/club-context.decorator.js';

@ApiTags('Fee Charges')
@ApiBearerAuth()
@Controller('clubs/:slug/fees/charges')
@RequireClubContext()
export class FeeChargesController {
  constructor(private feeChargesService: FeeChargesService) {}

  @Post('billing-run/preview')
  @RequirePermissions([Permission.FINANCE_CREATE])
  @ApiOperation({ summary: 'Preview billing run (no side effects)' })
  @ApiResponse({ status: 200, description: 'Billing run preview with counts and totals' })
  async previewBillingRun(@GetClubContext() ctx: ClubContext, @Body() dto: BillingRunPreviewDto) {
    return this.feeChargesService.previewBillingRun(ctx.clubId, dto);
  }

  @Post('billing-run/confirm')
  @RequirePermissions([Permission.FINANCE_CREATE])
  @ApiOperation({ summary: 'Execute billing run and create fee charges' })
  @ApiResponse({ status: 201, description: 'Billing run executed, charges created' })
  async confirmBillingRun(@GetClubContext() ctx: ClubContext, @Body() dto: BillingRunConfirmDto) {
    return this.feeChargesService.executeBillingRun(ctx.clubId, dto);
  }

  @Get()
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'List fee charges with computed payment status' })
  @ApiResponse({ status: 200, description: 'Paginated list of fee charges with status' })
  async findAll(@GetClubContext() ctx: ClubContext, @Query() query: FeeChargeQueryDto) {
    return this.feeChargesService.findAllWithStatus(ctx.clubId, query);
  }

  @Get('member/:memberId')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'List fee charges for a specific member' })
  @ApiResponse({ status: 200, description: 'Member fee charges with status' })
  async findByMember(@GetClubContext() ctx: ClubContext, @Param('memberId') memberId: string) {
    return this.feeChargesService.findByMember(ctx.clubId, memberId);
  }
}

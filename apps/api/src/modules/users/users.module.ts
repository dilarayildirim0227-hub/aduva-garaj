import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Public, Roles } from '../../common/security';
import { validateWithZod } from '../../common/zod-validation';
import {
  addressCreateSchema,
  addressUpdateSchema,
  appointmentCreateSchema,
  appointmentSlotQuerySchema,
  campaignCreateSchema,
  couponCreateSchema,
  favoriteSchema,
  kvkkConsentUpdateSchema,
  productAlertSchema,
  reviewCreateSchema,
  reviewModerationSchema,
} from './users.schemas';
import { UsersService } from './users.service';

@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('addresses')
  listAddresses(@CurrentUser() user: { sub: string }) {
    return this.usersService.listAddresses(user.sub);
  }

  @Post('addresses')
  createAddress(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    const dto = validateWithZod(addressCreateSchema, body);
    return this.usersService.createAddress(user.sub, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = validateWithZod(addressUpdateSchema, body);
    return this.usersService.updateAddress(user.sub, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.sub, id);
  }

  @Get('favorites')
  listFavorites(@CurrentUser() user: { sub: string }) {
    return this.usersService.listFavorites(user.sub);
  }

  @Post('favorites')
  addFavorite(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    const dto = validateWithZod(favoriteSchema, body);
    return this.usersService.addFavorite(user.sub, dto.productId);
  }

  @Delete('favorites/:productId')
  removeFavorite(@CurrentUser() user: { sub: string }, @Param('productId') productId: string) {
    return this.usersService.removeFavorite(user.sub, productId);
  }

  @Get('alerts')
  listAlerts(@CurrentUser() user: { sub: string }) {
    return this.usersService.listAlerts(user.sub);
  }

  @Post('alerts')
  upsertAlert(@CurrentUser() user: { sub: string }, @Body() body: unknown) {
    const dto = validateWithZod(productAlertSchema, body);
    return this.usersService.upsertAlert(user.sub, dto);
  }
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('product/:productId')
  listProductReviews(@Param('productId') productId: string) {
    return this.usersService.listProductReviews(productId, false);
  }

  @Post()
  createReview(@CurrentUser() user: { sub: string; email?: string }, @Body() body: unknown) {
    const dto = validateWithZod(reviewCreateSchema, body);
    return this.usersService.createReview(user.sub, user.email ?? 'musteri@aduvagaraj.com', dto);
  }

  @Roles('ADMIN', 'OPERATIONS', 'STAFF')
  @Patch(':id/moderation')
  moderateReview(@Param('id') id: string, @Body() body: unknown) {
    const dto = validateWithZod(reviewModerationSchema, body);
    return this.usersService.moderateReview(id, dto.isApproved);
  }

  @Post(':id/helpful')
  @HttpCode(HttpStatus.OK)
  voteHelpful(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.usersService.voteReviewHelpful(user.sub, id);
  }
}

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('slots')
  getSlots(@Query() query: Record<string, unknown>) {
    const dto = validateWithZod(appointmentSlotQuerySchema, {
      date: query.date ?? new Date().toISOString().slice(0, 10),
    });
    return this.usersService.getAvailableSlots(dto.date);
  }

  @Get()
  listAppointments(@CurrentUser() user: { sub: string; role?: string }) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'OPERATIONS';
    return this.usersService.listAppointments(user.sub, isAdmin);
  }

  @Post()
  createAppointment(@CurrentUser() user: { sub: string } | undefined, @Body() body: unknown) {
    const dto = validateWithZod(appointmentCreateSchema, body);
    return this.usersService.createAppointment(user?.sub ?? null, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelAppointment(@CurrentUser() user: { sub: string; role?: string }, @Param('id') id: string) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'OPERATIONS';
    return this.usersService.cancelAppointment(user.sub, id, isAdmin);
  }
}

@Controller()
export class CouponsAndCampaignsController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('coupons')
  listCoupons() {
    return this.usersService.listCoupons();
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Post('coupons')
  createCoupon(@Body() body: unknown) {
    const dto = validateWithZod(couponCreateSchema, body);
    return this.usersService.createCoupon(dto);
  }

  @Post('coupons/:code/redeem')
  @HttpCode(HttpStatus.OK)
  redeemCoupon(@CurrentUser() user: { sub: string }, @Param('code') code: string) {
    return this.usersService.redeemCouponForUser(user.sub, code);
  }

  @Public()
  @Get('campaigns')
  listCampaigns() {
    return this.usersService.listCampaigns();
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Post('campaigns')
  createCampaign(@Body() body: unknown) {
    const dto = validateWithZod(campaignCreateSchema, body);
    return this.usersService.createCampaign(dto);
  }
}

@Controller('kvkk')
export class KvkkController {
  constructor(private readonly usersService: UsersService) {}

  @Get('consents')
  getConsents(@CurrentUser() user: { sub: string }) {
    return this.usersService.getKvkkConsents(user.sub);
  }

  @Patch('consents')
  updateConsents(@CurrentUser() user: { sub: string }, @Body() body: unknown, @Ip() ip: string) {
    const dto = validateWithZod(kvkkConsentUpdateSchema, body);
    return this.usersService.updateKvkkConsents(user.sub, dto, ip);
  }

  @Get('export-my-data')
  exportMyData(@CurrentUser() user: { sub: string; email?: string }) {
    return this.usersService.exportMyPersonalData(user.sub, user.email ?? 'kullanici@aduvagaraj.com');
  }
}

import { Module } from '@nestjs/common';

@Module({
  controllers: [
    UsersController,
    ReviewsController,
    AppointmentsController,
    CouponsAndCampaignsController,
    KvkkController,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

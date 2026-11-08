import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { productListQuerySchema, type ProductListQuery } from '@aduva/shared';
import { PrismaService } from '../../common/prisma';
import { CurrentUser, JwtPayload, Public, Roles, ZodPipe } from '../../common/security';
import {
  adminProductCreateSchema,
  autocompleteQuerySchema,
  fitmentCheckQuerySchema,
  userVehicleCreateSchema,
  type AdminProductCreateInput,
  type AutocompleteQuery,
  type FitmentCheckQuery,
  type UserVehicleCreateInput,
} from './products.schemas';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  list(@Query(new ZodPipe(productListQuerySchema)) q: ProductListQuery) {
    return this.products.list(q);
  }

  @Public()
  @Get('autocomplete')
  autocomplete(@Query(new ZodPipe(autocompleteQuerySchema)) q: AutocompleteQuery) {
    return this.products.autocomplete(q);
  }

  @Public()
  @Get(':id/recommendations')
  recommendations(@Param('id') id: string, @Headers('x-cart-token') viewerKey?: string) {
    return this.products.getRecommendations(id, viewerKey);
  }

  @Public()
  @Get(':slug')
  detail(@Param('slug') slug: string, @Headers('x-cart-token') viewerKey?: string) {
    return this.products.detail(slug, viewerKey);
  }

  @Roles('ADMIN', 'OPERATIONS', 'STAFF')
  @Post()
  create(@Body(new ZodPipe(adminProductCreateSchema)) body: AdminProductCreateInput) {
    return this.products.createProduct(body);
  }
}

@Controller('fitment')
export class FitmentController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get('hierarchy')
  hierarchy() {
    return this.products.getVehicleHierarchy();
  }

  @Public()
  @Get('check')
  check(@Query(new ZodPipe(fitmentCheckQuerySchema)) q: FitmentCheckQuery) {
    return this.products.checkFitment(q);
  }
}

@Controller('garage')
export class GarageController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  listMyGarage(@CurrentUser() user: JwtPayload) {
    return { items: this.products.listUserGarage(user.sub) };
  }

  @Post()
  addMyVehicle(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodPipe(userVehicleCreateSchema)) body: UserVehicleCreateInput,
  ) {
    return this.products.addUserVehicle(user.sub, body);
  }

  @Patch(':id/primary')
  setPrimary(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { items: this.products.setPrimaryUserVehicle(user.sub, id) };
  }

  @Delete(':id')
  removeVehicle(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.products.removeUserVehicle(user.sub, id);
  }
}

@Controller()
export class StorefrontController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('catalog/bootstrap')
  bootstrap() {
    const s = this.prisma.store;
    return {
      settings: s.settings,
      vehicles: s.vehicles,
      categories: s.categories,
      banners: s.banners,
      coupons: s.coupons,
      orders: s.orders,
      appointments: s.appointments,
    };
  }

  @Roles('ADMIN', 'OPERATIONS', 'STAFF')
  @Post('admin/demo-sync')
  runDemoSync() {
    const now = new Date();
    const log = {
      id: `sync-${Date.now()}`,
      type: 'PRODUCTS' as const,
      status: 'SUCCESS' as const,
      trigger: 'MANUAL' as const,
      startedAt: new Date(now.getTime() - 1200).toISOString(),
      finishedAt: now.toISOString(),
      total: this.prisma.store.products.length,
      created: 0,
      updated: this.prisma.store.products.length,
      failed: 0,
    };
    return log;
  }

  @Roles('ADMIN', 'OPERATIONS', 'STAFF')
  @Patch('admin/products/:id/fitment')
  updateProductFitment(
    @Param('id') id: string,
    @Body()
    body: {
      fitmentVehicleIds?: string[];
      isUniversal?: boolean;
      isFeatured?: boolean;
      price?: number;
      stock?: number;
    },
  ) {
    const prd = this.prisma.store.products.find((p) => p.id === id);
    if (!prd) throw new NotFoundException('Ürün bulunamadı');
    if (body.fitmentVehicleIds) prd.fitmentVehicleIds = body.fitmentVehicleIds;
    if (body.isUniversal !== undefined) prd.isUniversal = body.isUniversal;
    if (body.isFeatured !== undefined) prd.isFeatured = body.isFeatured;
    if (body.price !== undefined) {
      prd.price = Number(body.price);
      prd.priceKurus = Math.round(Number(body.price) * 100);
    }
    if (body.stock !== undefined) prd.stock = Number(body.stock);
    return prd;
  }
}

@Module({
  controllers: [ProductsController, FitmentController, GarageController, StorefrontController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

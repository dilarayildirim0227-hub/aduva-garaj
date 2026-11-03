import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, JwtPayload, Public, Roles, ZodPipe } from '../../common/security';
import {
  cancelOrderSchema,
  createOrderSchema,
  orderStateTransitionSchema,
  paymentWebhookSchema,
  returnOrderSchema,
  shippingCalculateSchema,
  type CancelOrderInput,
  type CreateOrderInput,
  type OrderStateTransitionInput,
  type PaymentWebhookInput,
  type ReturnOrderInput,
  type ShippingCalculateInput,
} from './orders.schemas';
import { CarrierShippingAdapter, OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post()
  create(
    @Body(new ZodPipe(createOrderSchema)) body: CreateOrderInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.orders.createOrder(body, user?.sub);
  }

  @Get('my')
  listMyOrders(@CurrentUser() user: JwtPayload) {
    return { items: this.orders.listOrdersForUser(user.sub) };
  }

  @Public()
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id') id: string,
    @Body(new ZodPipe(cancelOrderSchema)) body: CancelOrderInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';
    return this.orders.cancelOrder(id, body, user?.sub, isAdmin);
  }

  @Public()
  @Post(':id/return')
  createReturn(
    @Param('id') id: string,
    @Body(new ZodPipe(returnOrderSchema)) body: ReturnOrderInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.orders.createReturnRequest(id, body, user?.sub);
  }

  @Roles('ADMIN', 'OPERATIONS', 'STAFF')
  @Patch(':id/status')
  transitionStatus(
    @Param('id') id: string,
    @Body(new ZodPipe(orderStateTransitionSchema)) body: OrderStateTransitionInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orders.transitionOrderState(id, body, user.sub);
  }
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post('webhook/iyzico')
  @HttpCode(200)
  iyzicoWebhook(@Body(new ZodPipe(paymentWebhookSchema)) body: PaymentWebhookInput) {
    return this.orders.handlePaymentWebhook(body);
  }
}

@Controller('shipping')
export class ShippingController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Get('locations')
  locations() {
    return this.orders.getAddressDirectory();
  }

  @Public()
  @Post('calculate')
  @HttpCode(200)
  calculate(@Body(new ZodPipe(shippingCalculateSchema)) body: ShippingCalculateInput) {
    return this.orders.calculateShipping(body);
  }

  @Roles('ADMIN', 'OPERATIONS', 'STAFF')
  @Post('labels/:orderNumber')
  createLabel(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { carrier?: 'YURTICI' | 'ARAS' | 'MNG' | 'PTT' },
  ) {
    const receipt = CarrierShippingAdapter.createShipmentLabel(
      body.carrier ?? 'YURTICI',
      orderNumber,
    );
    this.orders.transitionOrderState(
      orderNumber,
      {
        toStatus: 'SHIPPED',
        trackingCode: receipt.trackingCode,
        carrier: receipt.carrierName,
        note: `Kargo barkodu oluşturuldu (${receipt.trackingCode})`,
      },
      'SHIPPING_ADAPTER',
    );
    return receipt;
  }
}

@Module({
  controllers: [OrdersController, PaymentsController, ShippingController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

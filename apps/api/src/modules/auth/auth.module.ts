import { Body, Controller, Delete, Get, Headers, HttpCode, Module, Post } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  registerSchema,
  socialLoginSchema,
  type LoginInput,
  type RegisterInput,
  type SocialLoginInput,
} from '@aduva/shared';
import { CurrentUser, JwtPayload, Public, ZodPipe } from '../../common/security';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from './auth.schemas';
import { AuthService } from './auth.service';
import { ConsoleSmsProvider, NetgsmSmsProvider, SmsProvider } from './sms.provider';
import { SocialVerifier } from './social.verifier';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: RegisterInput, @Headers('user-agent') ua?: string) {
    return this.auth.register(body, ua);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Headers('user-agent') ua?: string) {
    return this.auth.login(body, ua);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password/forgot')
  @HttpCode(200)
  forgotPassword(@Body(new ZodPipe(forgotPasswordSchema)) body: ForgotPasswordInput) {
    return this.auth.requestPasswordReset(body);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password/reset')
  @HttpCode(200)
  resetPassword(@Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    return this.auth.resetPassword(body);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body(new ZodPipe(otpRequestSchema)) body: { phone: string }) {
    return this.auth.requestOtp(body.phone);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body(new ZodPipe(otpVerifySchema)) body: { phone: string; code: string }, @Headers('user-agent') ua?: string) {
    return this.auth.verifyOtp(body.phone, body.code, ua);
  }

  @Public()
  @Post('social')
  @HttpCode(200)
  social(@Body(new ZodPipe(socialLoginSchema)) body: SocialLoginInput, @Headers('user-agent') ua?: string) {
    return this.auth.socialLogin(body.provider, body.idToken, { firstName: body.firstName, lastName: body.lastName }, ua);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }, @Headers('user-agent') ua?: string) {
    return this.auth.refresh(body.refreshToken, ua);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }) {
    return this.auth.logout(body.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(200)
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.auth.logoutAll(user.sub);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: JwtPayload) {
    return this.auth.listActiveSessions(user.sub);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }

  @Delete('account')
  deleteAccount(@CurrentUser() user: JwtPayload) {
    return this.auth.deleteAccount(user.sub);
  }
}

@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    SocialVerifier,
    {
      provide: SmsProvider,
      useFactory: () =>
        process.env.SMS_PROVIDER === 'netgsm' ? new NetgsmSmsProvider() : new ConsoleSmsProvider(),
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}

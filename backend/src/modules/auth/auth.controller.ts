import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Public } from '../../common/decorators/index.js';
import { UsersService } from '../users/users.service.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, ttlToMs } from './auth.constants.js';
import { AuthService, TokenPair } from './auth.service.js';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { tokens, profile } = await this.auth.login(dto.email, dto.password);
    this.setCookies(res, tokens);
    return { user: profile, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    try {
      const tokens = await this.auth.refresh(token);
      this.setCookies(res, tokens);
      return { accessToken: tokens.accessToken };
    } catch (err) {
      this.clearCookies(res);
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.profile(user.id);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  private cookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<boolean>('cookies.secure'),
      path: '/',
      maxAge,
    };
  }

  private setCookies(res: Response, tokens: TokenPair) {
    res.cookie(
      ACCESS_COOKIE,
      tokens.accessToken,
      this.cookieOptions(ttlToMs(this.config.get<string>('jwt.accessTtl')!)),
    );
    res.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      this.cookieOptions(ttlToMs(this.config.get<string>('jwt.refreshTtl')!)),
    );
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}

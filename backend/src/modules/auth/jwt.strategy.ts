import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { permissionsForRoles } from '../../common/auth/roles.js';
import { UsersService } from '../users/users.service.js';
import { ACCESS_COOKIE } from './auth.constants.js';

const fromCookie = (req: Request): string | null => req?.cookies?.[ACCESS_COOKIE] ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      // Browser clients use the httpOnly cookie; API clients may send a Bearer token.
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.get<string>('jwt.accessSecret')!,
      ignoreExpiration: false,
    });
  }

  /** Re-load the user on every request so deactivation and role changes apply immediately. */
  async validate(payload: { sub: string }): Promise<AuthUser> {
    const user = await this.users.findActiveById(payload.sub);
    if (!user) throw new UnauthorizedException('Account is inactive or no longer exists');
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: permissionsForRoles(user.roles),
      employeeId: user.employeeId,
    };
  }
}

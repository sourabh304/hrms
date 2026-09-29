import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { permissionsForRoles } from '../../common/auth/roles.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithSecret(email);
    const valid = user && user.isActive && (await this.users.verifyPassword(password, user.passwordHash));
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');

    const tokens = await this.issueTokens(user);
    await this.users.touchLogin(user.id);
    return { tokens, profile: await this.profile(user.id) };
  }

  /**
   * Rotate refresh tokens. A refresh token that doesn't match the stored hash
   * indicates reuse of a stolen/old token, so the session is revoked entirely.
   */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expired');
    }
    const user = await this.users.findByIdWithSecrets(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Session expired');
    if (!user.refreshTokenHash || user.refreshTokenHash !== sha256(refreshToken)) {
      await this.users.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Session revoked');
    }
    return this.issueTokens(user);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const payload = this.jwt.decode(refreshToken) as { sub?: string } | null;
    if (payload?.sub) await this.users.setRefreshTokenHash(payload.sub, null);
  }

  async profile(userId: string) {
    const user = await this.users.findWithEmployee(userId);
    if (!user) throw new UnauthorizedException();
    const directReports = user.employeeId
      ? await this.employees.count({ where: { managerId: user.employeeId } })
      : 0;
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: permissionsForRoles(user.roles),
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      isManager: directReports > 0,
      directReports,
      employee: user.employee,
    };
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessTtl') as JwtSignOptions['expiresIn'],
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshTtl') as JwtSignOptions['expiresIn'],
      },
    );
    await this.users.setRefreshTokenHash(user.id, sha256(refreshToken));
    return { accessToken, refreshToken };
  }
}

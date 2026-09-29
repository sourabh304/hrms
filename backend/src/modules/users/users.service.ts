import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { Role } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { UserQueryDto } from './dto/user.dto.js';
import { User } from './entities/user.entity.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  hashPassword(password: string) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  findByEmailWithSecret(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findByIdWithSecrets(id: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect(['u.passwordHash', 'u.refreshTokenHash'])
      .where('u.id = :id', { id })
      .getOne();
  }

  findActiveById(id: string) {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  findWithEmployee(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: { employee: { designation: true, department: true, location: true } },
    });
  }

  findByEmployeeId(employeeId: string) {
    return this.repo.findOne({ where: { employeeId } });
  }

  async createAccount(input: {
    email: string;
    password: string;
    roles: Role[];
    employeeId?: string | null;
    mustChangePassword?: boolean;
  }) {
    const exists = await this.repo.exists({ where: { email: input.email.toLowerCase() } });
    if (exists) throw new BadRequestException('A user with this email already exists');
    const user = this.repo.create({
      email: input.email.toLowerCase(),
      passwordHash: await this.hashPassword(input.password),
      roles: input.roles.length ? input.roles : [Role.EMPLOYEE],
      employeeId: input.employeeId ?? null,
      mustChangePassword: input.mustChangePassword ?? false,
    });
    return this.repo.save(user);
  }

  async list(query: UserQueryDto) {
    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.employee', 'e')
      .leftJoinAndSelect('e.designation', 'd')
      .leftJoinAndSelect('e.department', 'dept')
      .orderBy('u.email', 'ASC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.search) {
      const s = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.email) LIKE :s OR LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s)',
        { s },
      );
    }
    if (query.role) qb.andWhere('u.roles LIKE :role', { role: `%${query.role}%` });
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async updateRoles(id: string, roles: Role[]) {
    const user = await this.getOrFail(id);
    user.roles = roles.length ? [...new Set(roles)] : [Role.EMPLOYEE];
    return this.repo.save(user);
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.getOrFail(id);
    user.isActive = isActive;
    if (!isActive) user.refreshTokenHash = null;
    return this.repo.save(user);
  }

  async deactivateByEmployee(employeeId: string) {
    await this.repo.update({ employeeId }, { isActive: false, refreshTokenHash: null });
  }

  /** Issue a one-time temporary password. The caller shows it to the admin once. */
  async resetPassword(id: string) {
    const user = await this.getOrFail(id);
    const temporaryPassword = `Tmp-${randomBytes(6).toString('base64url')}`;
    user.passwordHash = await this.hashPassword(temporaryPassword);
    user.mustChangePassword = true;
    user.refreshTokenHash = null;
    await this.repo.save(user);
    return { temporaryPassword };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.findByIdWithSecrets(id);
    if (!user) throw new NotFoundException('User not found');
    if (!(await this.verifyPassword(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.repo.update(id, {
      passwordHash: await this.hashPassword(newPassword),
      mustChangePassword: false,
    });
  }

  setRefreshTokenHash(id: string, hash: string | null) {
    return this.repo.update(id, { refreshTokenHash: hash });
  }

  touchLogin(id: string) {
    return this.repo.update(id, { lastLoginAt: new Date() });
  }

  async userIdsForEmployees(employeeIds: string[]): Promise<string[]> {
    if (!employeeIds.length) return [];
    const users = await this.repo.find({
      where: { employeeId: In(employeeIds), isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async userIdsForRole(role: Role): Promise<string[]> {
    const users = await this.repo
      .createQueryBuilder('u')
      .select(['u.id', 'u.roles'])
      .where('u.isActive = :active', { active: true })
      .andWhere('u.roles LIKE :role', { role: `%${role}%` })
      .getMany();
    return users.filter((u) => u.roles.includes(role)).map((u) => u.id);
  }

  private async getOrFail(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

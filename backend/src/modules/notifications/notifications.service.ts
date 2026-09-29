import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/auth/roles.js';
import { UsersService } from '../users/users.service.js';
import { Notification, NotificationType } from './entities/notification.entity.js';

export interface NotificationInput {
  title: string;
  message?: string;
  type?: NotificationType;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    private readonly users: UsersService,
  ) {}

  async notifyUsers(userIds: string[], input: NotificationInput) {
    const unique = [...new Set(userIds)];
    if (!unique.length) return;
    await this.repo.save(
      unique.map((userId) =>
        this.repo.create({
          userId,
          title: input.title,
          message: input.message ?? null,
          type: input.type ?? NotificationType.INFO,
          link: input.link ?? null,
        }),
      ),
    );
  }

  async notifyEmployees(employeeIds: (string | null | undefined)[], input: NotificationInput) {
    const ids = employeeIds.filter((id): id is string => !!id);
    await this.notifyUsers(await this.users.userIdsForEmployees(ids), input);
  }

  async notifyRole(role: Role, input: NotificationInput) {
    await this.notifyUsers(await this.users.userIdsForRole(role), input);
  }

  list(userId: string, unreadOnly = false, limit = 30) {
    return this.repo.find({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  unreadCount(userId: string) {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    await this.repo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}

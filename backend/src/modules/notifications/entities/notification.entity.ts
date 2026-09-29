import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ACTION = 'ACTION',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
export class Notification extends AppBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'simple-enum', enum: NotificationType, default: NotificationType.INFO })
  type: NotificationType;

  /** In-app route to open when the notification is clicked. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  link: string | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;
}

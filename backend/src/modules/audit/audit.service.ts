import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';
import { AuditLog } from './entities/audit-log.entity.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /** Fire-and-forget: auditing must never break the request it records. */
  record(entry: Partial<AuditLog>) {
    this.repo.save(this.repo.create(entry)).catch((err) => this.logger.warn(err.message));
  }

  async list(query: AuditQueryDto) {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.resource) qb.andWhere('a.resource = :resource', { resource: query.resource });
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });
    if (query.search) {
      qb.andWhere('(LOWER(a.userEmail) LIKE :s OR LOWER(a.path) LIKE :s)', {
        s: `%${query.search.toLowerCase()}%`,
      });
    }
    if (query.from) qb.andWhere('a.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('a.createdAt <= :to', { to: new Date(`${query.to}T23:59:59`) });
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async resources(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.resource', 'resource')
      .orderBy('resource')
      .getRawMany<{ resource: string }>();
    return rows.map((r) => r.resource);
  }
}

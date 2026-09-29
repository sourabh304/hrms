import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthUser, requireEmployeeId } from '../../common/auth/auth-user.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AssetQueryDto, AssignAssetDto, CreateAssetDto, ReturnAssetDto, UpdateAssetDto } from './dto/asset.dto.js';
import { AssetAssignment } from './entities/asset-assignment.entity.js';
import { Asset, AssetStatus } from './entities/asset.entity.js';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(AssetAssignment) private readonly assignments: Repository<AssetAssignment>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: AssetQueryDto) {
    const qb = this.assets
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.assignedTo', 'e')
      .orderBy('a.assetTag', 'ASC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.status) qb.andWhere('a.status = :s', { s: query.status });
    if (query.category) qb.andWhere('a.category = :c', { c: query.category });
    if (query.assignedToId) qb.andWhere('a.assignedToId = :e', { e: query.assignedToId });
    if (query.search) {
      qb.andWhere(
        '(LOWER(a.assetTag) LIKE :q OR LOWER(a.name) LIKE :q OR LOWER(a.serialNumber) LIKE :q OR LOWER(e.firstName) LIKE :q)',
        { q: `%${query.search.toLowerCase()}%` },
      );
    }
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async get(id: string) {
    const asset = await this.assets.findOne({ where: { id }, relations: { assignedTo: true } });
    if (!asset) throw new NotFoundException('Asset not found');
    const history = await this.assignments.find({
      where: { assetId: id },
      relations: { employee: true },
      order: { assignedAt: 'DESC' },
    });
    return { ...asset, history };
  }

  create(dto: CreateAssetDto) {
    return this.assets.save(this.assets.create({ ...dto, assetTag: dto.assetTag.toUpperCase() }));
  }

  async update(id: string, dto: UpdateAssetDto) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (dto.status === AssetStatus.ASSIGNED && !asset.assignedToId) {
      throw new BadRequestException('Use the assign action to assign an asset');
    }
    return this.assets.save(Object.assign(asset, dto));
  }

  async assign(id: string, dto: AssignAssetDto, user: AuthUser) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status !== AssetStatus.AVAILABLE) throw new BadRequestException(`Asset is ${asset.status.toLowerCase()}`);
    const now = new Date();
    await this.assignments.save(
      this.assignments.create({
        assetId: id,
        employeeId: dto.employeeId,
        assignedAt: now,
        notes: dto.notes ?? null,
        assignedById: user.employeeId,
      }),
    );
    await this.assets.update(id, { status: AssetStatus.ASSIGNED, assignedToId: dto.employeeId, assignedAt: now });
    await this.notifications.notifyEmployees([dto.employeeId], {
      title: `Asset assigned: ${asset.name} (${asset.assetTag})`,
      link: '/assets',
    });
    return this.get(id);
  }

  async return(id: string, dto: ReturnAssetDto) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status !== AssetStatus.ASSIGNED) throw new BadRequestException('Asset is not assigned');
    const open = await this.assignments.findOne({ where: { assetId: id, returnedAt: IsNull() } });
    if (open) {
      await this.assignments.update(open.id, {
        returnedAt: new Date(),
        conditionOnReturn: dto.condition,
        notes: dto.notes ?? open.notes,
      });
    }
    await this.assets.update(id, {
      status: AssetStatus.AVAILABLE,
      condition: dto.condition,
      assignedToId: null,
      assignedAt: null,
    });
    return this.get(id);
  }

  mine(user: AuthUser) {
    return this.assets.find({ where: { assignedToId: requireEmployeeId(user) }, order: { assignedAt: 'DESC' } });
  }

  async stats() {
    const rows = await this.assets
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('a.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(COALESCE(a.purchaseCost, 0))', 'value')
      .groupBy('a.status')
      .addGroupBy('a.category')
      .getRawMany<{ status: string; category: string; count: string; value: string }>();
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalValue = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + Number(r.count);
      byCategory[r.category] = (byCategory[r.category] ?? 0) + Number(r.count);
      totalValue += Number(r.value);
    }
    return { byStatus, byCategory, totalValue: Math.round(totalValue * 100) / 100 };
  }
}

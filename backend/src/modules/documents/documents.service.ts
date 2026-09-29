import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateDocumentDto, DocumentQueryDto, UpdateDocumentDto } from './dto/document.dto.js';
import { DocumentAcknowledgment } from './entities/document-acknowledgment.entity.js';
import { Document } from './entities/document.entity.js';
import { FileVisibility } from './entities/stored-file.entity.js';
import { FilesService } from './files.service.js';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly docs: Repository<Document>,
    @InjectRepository(DocumentAcknowledgment) private readonly acks: Repository<DocumentAcknowledgment>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, query: DocumentQueryDto) {
    const qb = this.docs
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.file', 'f')
      .leftJoinAndSelect('d.employee', 'e')
      .orderBy('d.updatedAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);

    if (query.scope === 'personal') {
      const target = query.employeeId ?? requireEmployeeId(user);
      if (target !== user.employeeId) assertPermission(user, Permission.DOCUMENT_MANAGE);
      qb.andWhere('d.employeeId = :t', { t: target });
    } else {
      qb.andWhere('d.employeeId IS NULL');
    }
    if (query.category) qb.andWhere('d.category = :c', { c: query.category });
    if (query.search) qb.andWhere('LOWER(d.title) LIKE :s', { s: `%${query.search.toLowerCase()}%` });

    const [rows, total] = await qb.getManyAndCount();
    const myAcks = user.employeeId && rows.length
      ? await this.acks.find({ where: { employeeId: user.employeeId, documentId: In(rows.map((r) => r.id)) } })
      : [];
    const data = rows.map((d) => ({
      ...d,
      acknowledgedAt: myAcks.find((a) => a.documentId === d.id && a.version === d.version)?.createdAt ?? null,
    }));
    return paginated(data, total, query);
  }

  async get(id: string, user: AuthUser) {
    const doc = await this.docs.findOne({ where: { id }, relations: { file: true, employee: true } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.employeeId && doc.employeeId !== user.employeeId && !hasPermission(user, Permission.DOCUMENT_MANAGE)) {
      throw new ForbiddenException();
    }
    return doc;
  }

  async create(dto: CreateDocumentDto, user: AuthUser) {
    const doc = await this.docs.save(this.docs.create({ ...dto, uploadedById: user.employeeId }));
    if (dto.fileId) {
      await this.files.link(dto.fileId, {
        visibility: dto.employeeId ? FileVisibility.PRIVATE : FileVisibility.COMPANY,
        linkedEmployeeId: dto.employeeId ?? null,
      });
    }
    if (dto.requiresAcknowledgment && !dto.employeeId) {
      const all = await this.employees.find({ where: { status: In(EMPLOYED_STATUSES) }, select: { id: true } });
      await this.notifications.notifyEmployees(all.map((e) => e.id), {
        title: `Please review and acknowledge: ${dto.title}`,
        type: NotificationType.ACTION,
        link: '/documents',
      });
    }
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const doc = await this.docs.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.docs.save(Object.assign(doc, dto));
  }

  async remove(id: string) {
    await this.docs.delete(id);
  }

  async acknowledge(id: string, user: AuthUser) {
    const employeeId = requireEmployeeId(user);
    const doc = await this.get(id, user);
    const existing = await this.acks.findOne({ where: { documentId: id, employeeId, version: doc.version } });
    return existing ?? this.acks.save(this.acks.create({ documentId: id, employeeId, version: doc.version }));
  }

  /** Compliance report: who has / hasn't acknowledged the current version. */
  async acknowledgmentReport(id: string) {
    const doc = await this.docs.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    const [employees, acks] = await Promise.all([
      this.employees.find({ where: { status: In(EMPLOYED_STATUSES) }, relations: { department: true }, order: { firstName: 'ASC' } }),
      this.acks.find({ where: { documentId: id, version: doc.version } }),
    ]);
    const rows = employees.map((e) => ({
      employee: { id: e.id, fullName: e.fullName, employeeCode: e.employeeCode, department: e.department?.name ?? null },
      acknowledgedAt: acks.find((a) => a.employeeId === e.id)?.createdAt ?? null,
    }));
    return {
      document: doc,
      total: rows.length,
      acknowledged: rows.filter((r) => r.acknowledgedAt).length,
      rows,
    };
  }

  async pendingForMe(user: AuthUser) {
    const employeeId = requireEmployeeId(user);
    const docs = await this.docs.find({ where: { requiresAcknowledgment: true, employeeId: IsNull() } });
    if (!docs.length) return [];
    const acks = await this.acks.find({ where: { employeeId, documentId: In(docs.map((d) => d.id)) } });
    return docs.filter((d) => !acks.some((a) => a.documentId === d.id && a.version === d.version));
  }
}

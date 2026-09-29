import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { Repository } from 'typeorm';
import { AuthUser, hasPermission } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { FileVisibility, StoredFile } from './entities/stored-file.entity.js';

const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|webp|gif)|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.[a-z.]+))$/;

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private readonly root: string;

  constructor(
    @InjectRepository(StoredFile) private readonly repo: Repository<StoredFile>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    config: ConfigService,
  ) {
    this.root = resolve(config.get<string>('uploads.dir') ?? 'uploads');
    mkdirSync(this.root, { recursive: true });
  }

  isAllowedType(mime: string) {
    return ALLOWED.test(mime);
  }

  async store(file: UploadedFile, user: AuthUser, visibility = FileVisibility.PRIVATE, linkedEmployeeId?: string | null) {
    const month = new Date().toISOString().slice(0, 7);
    const dir = join(this.root, month);
    mkdirSync(dir, { recursive: true });
    const name = `${randomUUID()}${extname(file.originalname).toLowerCase().slice(0, 10)}`;
    writeFileSync(join(dir, name), file.buffer);
    const saved = await this.repo.save(
      this.repo.create({
        originalName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        size: file.size,
        storagePath: `${month}/${name}`,
        visibility,
        uploadedById: user.employeeId,
        linkedEmployeeId: linkedEmployeeId ?? user.employeeId,
      }),
    );
    const { storagePath, ...meta } = saved;
    return { ...meta, url: `/api/v1/files/${saved.id}` };
  }

  async link(fileId: string, patch: Partial<Pick<StoredFile, 'visibility' | 'linkedEmployeeId'>>) {
    await this.repo.update(fileId, patch);
  }

  /** Resolve an absolute path after enforcing access rules. */
  async resolveForDownload(id: string, user: AuthUser) {
    const file = await this.repo.createQueryBuilder('f').addSelect('f.storagePath').where('f.id = :id', { id }).getOne();
    if (!file) throw new NotFoundException('File not found');

    const me = user.employeeId;
    let allowed =
      file.visibility === FileVisibility.COMPANY ||
      file.uploadedById === me ||
      file.linkedEmployeeId === me ||
      hasPermission(user, Permission.DOCUMENT_MANAGE) ||
      hasPermission(user, Permission.EXPENSE_MANAGE);
    if (!allowed && me && file.linkedEmployeeId) {
      const owner = await this.employees.findOne({ where: { id: file.linkedEmployeeId }, select: { id: true, managerId: true } });
      allowed = owner?.managerId === me;
    }
    if (!allowed) throw new ForbiddenException('You do not have access to this file');

    const absolute = resolve(this.root, file.storagePath);
    if (!absolute.startsWith(this.root)) throw new ForbiddenException();
    return { file, absolute };
  }
}

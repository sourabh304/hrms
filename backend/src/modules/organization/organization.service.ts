import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateLocationDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateLocationDto,
  UpdateSettingsDto,
} from './dto/organization.dto.js';
import { CompanySettings } from './entities/company-settings.entity.js';
import { Department } from './entities/department.entity.js';
import { Designation } from './entities/designation.entity.js';
import { Location } from './entities/location.entity.js';

export const DEFAULT_SETTINGS: Partial<CompanySettings> = {
  companyName: 'Segue',
  legalName: 'Segue Technologies Pvt. Ltd.',
  currency: 'USD',
  timezone: 'UTC',
  dateFormat: 'MMM d, yyyy',
  fiscalYearStartMonth: 1,
  weeklyOffs: ['SAT', 'SUN'],
  standardWorkHours: 8,
  probationDays: 90,
  noticePeriodDays: 30,
  employeeCodePrefix: 'SEG',
  emailDomain: 'segueit.com',
  taxSlabs: [
    { from: 0, to: 12000, ratePercent: 0 },
    { from: 12000, to: 50000, ratePercent: 10 },
    { from: 50000, to: 100000, ratePercent: 20 },
    { from: 100000, to: 200000, ratePercent: 25 },
    { from: 200000, to: null, ratePercent: 30 },
  ],
};

type GroupKey = 'departmentId' | 'designationId' | 'locationId';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Designation) private readonly designations: Repository<Designation>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
    @InjectRepository(CompanySettings) private readonly settings: Repository<CompanySettings>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  private async headcountBy(key: GroupKey): Promise<Map<string, number>> {
    const rows = await this.employees
      .createQueryBuilder('e')
      .select(`e.${key}`, 'id')
      .addSelect('COUNT(*)', 'count')
      .where('e.status IN (:...statuses)', { statuses: EMPLOYED_STATUSES })
      .groupBy(`e.${key}`)
      .getRawMany<{ id: string; count: string }>();
    return new Map(rows.map((r) => [r.id, Number(r.count)]));
  }

  private async withHeadcount<T extends ObjectLiteral & { id: string }>(rows: T[], key: GroupKey) {
    const counts = await this.headcountBy(key);
    return rows.map((r) => ({ ...r, headcount: counts.get(r.id) ?? 0 }));
  }

  private async assertUnused(key: GroupKey, id: string, label: string) {
    const count = await this.employees.count({ where: { [key]: id } });
    if (count) throw new BadRequestException(`${label} has ${count} employee(s) assigned`);
  }

  // ── Departments ──────────────────────────────────────

  async listDepartments() {
    const rows = await this.departments.find({
      relations: { head: { designation: true }, parent: true },
      order: { name: 'ASC' },
    });
    return this.withHeadcount(rows, 'departmentId');
  }

  createDepartment(dto: CreateDepartmentDto) {
    return this.departments.save(this.departments.create({ ...dto, code: dto.code.toUpperCase() }));
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.departments.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    if (dto.parentId === id) throw new BadRequestException('A department cannot be its own parent');
    Object.assign(dept, dto);
    return this.departments.save(dept);
  }

  async deleteDepartment(id: string) {
    await this.assertUnused('departmentId', id, 'Department');
    await this.departments.delete(id);
  }

  // ── Designations ─────────────────────────────────────

  async listDesignations() {
    const rows = await this.designations.find({ order: { level: 'DESC', title: 'ASC' } });
    return this.withHeadcount(rows, 'designationId');
  }

  createDesignation(dto: CreateDesignationDto) {
    return this.designations.save(this.designations.create(dto));
  }

  async updateDesignation(id: string, dto: UpdateDesignationDto) {
    const row = await this.designations.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Designation not found');
    return this.designations.save(Object.assign(row, dto));
  }

  async deleteDesignation(id: string) {
    await this.assertUnused('designationId', id, 'Designation');
    await this.designations.delete(id);
  }

  // ── Locations ────────────────────────────────────────

  async listLocations() {
    const rows = await this.locations.find({ order: { isHeadquarters: 'DESC', name: 'ASC' } });
    return this.withHeadcount(rows, 'locationId');
  }

  createLocation(dto: CreateLocationDto) {
    return this.locations.save(this.locations.create({ ...dto, code: dto.code.toUpperCase() }));
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    const row = await this.locations.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Location not found');
    return this.locations.save(Object.assign(row, dto));
  }

  async deleteLocation(id: string) {
    await this.assertUnused('locationId', id, 'Location');
    await this.locations.delete(id);
  }

  // ── Settings ─────────────────────────────────────────

  async getSettings(): Promise<CompanySettings> {
    const [existing] = await this.settings.find({ take: 1 });
    if (existing) return existing;
    return this.settings.save(this.settings.create(DEFAULT_SETTINGS));
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const current = await this.getSettings();
    Object.assign(current, dto);
    return this.settings.save(current);
  }
}

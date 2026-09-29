import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../../common/auth/roles.js';
import { RequirePermissions } from '../../common/decorators/index.js';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateLocationDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateLocationDto,
  UpdateSettingsDto,
} from './dto/organization.dto.js';
import { OrganizationService } from './organization.service.js';

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly org: OrganizationService) {}

  // Departments
  @Get('departments')
  departments() {
    return this.org.listDepartments();
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.org.createDepartment(dto);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Patch('departments/:id')
  updateDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.org.updateDepartment(id, dto);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Delete('departments/:id')
  @HttpCode(204)
  deleteDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.org.deleteDepartment(id);
  }

  // Designations
  @Get('designations')
  designations() {
    return this.org.listDesignations();
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('designations')
  createDesignation(@Body() dto: CreateDesignationDto) {
    return this.org.createDesignation(dto);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Patch('designations/:id')
  updateDesignation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDesignationDto) {
    return this.org.updateDesignation(id, dto);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Delete('designations/:id')
  @HttpCode(204)
  deleteDesignation(@Param('id', ParseUUIDPipe) id: string) {
    return this.org.deleteDesignation(id);
  }

  // Locations
  @Get('locations')
  locations() {
    return this.org.listLocations();
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('locations')
  createLocation(@Body() dto: CreateLocationDto) {
    return this.org.createLocation(dto);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Patch('locations/:id')
  updateLocation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto) {
    return this.org.updateLocation(id, dto);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Delete('locations/:id')
  @HttpCode(204)
  deleteLocation(@Param('id', ParseUUIDPipe) id: string) {
    return this.org.deleteLocation(id);
  }

  // Company settings
  @Get('settings')
  settings() {
    return this.org.getSettings();
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Put('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.org.updateSettings(dto);
  }
}

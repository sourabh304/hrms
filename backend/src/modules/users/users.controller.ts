import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission, Role, ROLE_PERMISSIONS } from '../../common/auth/roles.js';
import { RequirePermissions } from '../../common/decorators/index.js';
import { UpdateRolesDto, UpdateUserStatusDto, UserQueryDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users & Access')
@RequirePermissions(Permission.USER_MANAGE)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: UserQueryDto) {
    return this.users.list(query);
  }

  /** Role → permission matrix (read-only reference for the admin UI). */
  @Get('roles')
  roles() {
    return Object.values(Role).map((role) => ({ role, permissions: ROLE_PERMISSIONS[role] }));
  }

  @Patch(':id/roles')
  updateRoles(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRolesDto) {
    return this.users.updateRoles(id, dto.roles);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserStatusDto) {
    return this.users.setActive(id, dto.isActive);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.resetPassword(id);
  }
}

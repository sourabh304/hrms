import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { AssetsService } from './assets.service.js';
import { AssetQueryDto, AssignAssetDto, CreateAssetDto, ReturnAssetDto, UpdateAssetDto } from './dto/asset.dto.js';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.assets.mine(user);
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Get()
  list(@Query() query: AssetQueryDto) {
    return this.assets.list(query);
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Get('stats')
  stats() {
    return this.assets.stats();
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.get(id);
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assets.create(dto);
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Post(':id/assign')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignAssetDto) {
    return this.assets.assign(id, dto, user);
  }

  @RequirePermissions(Permission.ASSET_MANAGE)
  @Post(':id/return')
  returnAsset(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReturnAssetDto) {
    return this.assets.return(id, dto);
  }
}

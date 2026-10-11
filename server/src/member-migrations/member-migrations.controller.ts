import { Controller, Get, Post, Put, Delete, Body, Query, Param, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { MemberMigrationsService } from './member-migrations.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';

@Controller('member-migrations')
export class MemberMigrationsController {
  constructor(
    private readonly service: MemberMigrationsService,
    private readonly authService: AuthService,
  ) {}

  /** 查询指定成员 / 全部家族的迁徙行（登录即可） */
  @Get()
  @HttpCode(200)
  async list(
    @Query('memberId') memberId: string,
    @Headers('authorization') authorization: string,
  ) {
    requireRole(this.authService, authorization, 1);
    if (memberId) {
      const data = await this.service.findByMember(memberId);
      return { code: 200, msg: 'success', data };
    }
    const data = await this.service.getAll();
    return { code: 200, msg: 'success', data };
  }

  /** 管理员录入迁徙行 */
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: any, @Headers('authorization') authorization: string) {
    requireRole(this.authService, authorization, 3);
    const data = await this.service.create(body);
    return { code: 200, msg: '添加成功', data };
  }

  /** 管理员修改迁徙行 */
  @Put(':id')
  @HttpCode(200)
  async update(@Param('id') id: string, @Body() body: any, @Headers('authorization') authorization: string) {
    requireRole(this.authService, authorization, 3);
    const data = await this.service.update(id, body);
    return { code: 200, msg: '更新成功', data };
  }

  /** 管理员删除迁徙行 */
  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @Headers('authorization') authorization: string) {
    requireRole(this.authService, authorization, 3);
    const data = await this.service.remove(id);
    return { code: 200, msg: '删除成功', data };
  }
}
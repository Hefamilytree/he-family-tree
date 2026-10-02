import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, Headers } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';
import { assertMemberKin } from '@/common/kin-guard';

@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @HttpCode(200)
  async getAllMembers() {
    const data = await this.membersService.getAllMembers();
    return { code: 200, msg: 'success', data };
  }

  @Get('count')
  @HttpCode(200)
  async getMemberCount() {
    const data = await this.membersService.getMemberCount();
    return { code: 200, msg: 'success', data };
  }

  @Get('tree')
  @HttpCode(200)
  async getTreeData() {
    const data = await this.membersService.getTreeData();
    return { code: 200, msg: 'success', data };
  }

  // 新增成员：仅管理人员、主管理人员（3级）（新增属于全族结构编辑）
  @Post()
  @HttpCode(200)
  async createMember(@Body() body: any, @Headers('authorization') authorization: string) {
    requireRole(this.authService, authorization, 3);
    const data = await this.membersService.createMember(body);
    return { code: 200, msg: '添加成功', data };
  }

  // 修改：本人及直系2代可维护；管理人员可改全部
  @Put(':id')
  @HttpCode(200)
  async updateMember(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('authorization') authorization: string,
  ) {
    const kinRows = await this.membersService.getKinRows();
    assertMemberKin(this.authService, authorization, id, kinRows);
    const data = await this.membersService.updateMember(id, body);
    return { code: 200, msg: '更新成功', data };
  }

  // 删除：仅管理人员、主管理人员（3级）
  @Delete(':id')
  @HttpCode(200)
  async deleteMember(@Param('id') id: string, @Headers('authorization') authorization: string) {
    requireRole(this.authService, authorization, 3);
    const data = await this.membersService.deleteMember(id);
    return { code: 200, msg: '删除成功', data };
  }
}

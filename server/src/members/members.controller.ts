import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

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

  @Post()
  @HttpCode(200)
  async createMember(@Body() body: {
    name: string;
    courtesy_name?: string | null;
    gender?: string;
    birth_date?: string | null;
    birth_time?: string | null;
    phone?: string | null;
    death_date?: string | null;
    parent_id?: string | null;
    spouse_name?: string | null;
    generation?: number;
    generation_title?: string | null;
    bio?: string | null;
    is_alive?: string;
    birth_place?: string | null;
    burial_place?: string | null;
  }) {
    const data = await this.membersService.createMember(body);
    return { code: 200, msg: '添加成功', data };
  }

  @Put(':id')
  @HttpCode(200)
  async updateMember(@Param('id') id: string, @Body() body: {
    name?: string;
    courtesy_name?: string | null;
    gender?: string;
    birth_date?: string | null;
    birth_time?: string | null;
    phone?: string | null;
    death_date?: string | null;
    parent_id?: string | null;
    spouse_name?: string | null;
    generation?: number;
    generation_title?: string | null;
    bio?: string | null;
    is_alive?: string;
    birth_place?: string | null;
    burial_place?: string | null;
  }) {
    const data = await this.membersService.updateMember(id, body);
    return { code: 200, msg: '更新成功', data };
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteMember(@Param('id') id: string) {
    const data = await this.membersService.deleteMember(id);
    return { code: 200, msg: '删除成功', data };
  }
}

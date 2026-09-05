import { Controller, Get, Post, Delete, Body, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async findAll(@Query('targetType') targetType: string, @Query('targetId') targetId: string) {
    const data = await this.commentsService.findAll(targetType, targetId);
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: { targetType: string; targetId: string; userId: string; content: string }) {
    const data = await this.commentsService.create(body.targetType, body.targetId, body.userId, body.content);
    return { code: 200, msg: '评论成功', data };
  }

  @Delete()
  async delete(@Query('id') id: string) {
    const data = await this.commentsService.delete(id);
    return { code: 200, msg: 'success', data };
  }
}

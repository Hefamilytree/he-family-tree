import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Res,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { CommentsService } from './comments.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly authService: AuthService,
  ) {}

  /** 某条活动的评论（含楼中楼回复） */
  @Get()
  async findAll(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    let viewer: { userId: string; role: string } | undefined;
    if (authorization) {
      try {
        viewer = requireRole(this.authService, authorization, 1);
      } catch (e) {
        viewer = undefined;
      }
    }
    const data = await this.commentsService.findThread(targetType, targetId, viewer);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  /** 发表评论 / 回复（登录宗亲）；内容非空且最长 1000 字 */
  @Post()
  async create(
    @Body()
    body: {
      targetType: string;
      targetId: string;
      content: string;
      parentId?: string;
    },
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const decoded = requireRole(this.authService, authorization, 1);
    const content = (body.content || '').trim();
    if (!content) {
      return res
        .status(200)
        .json({ code: 400, msg: '评论内容不能为空', data: null });
    }
    if (content.length > 1000) {
      return res
        .status(200)
        .json({ code: 400, msg: '评论内容不能超过 1000 字', data: null });
    }
    const data = await this.commentsService.create(
      body.targetType,
      body.targetId,
      decoded,
      content,
      body.parentId,
    );
    return res.status(200).json({ code: 200, msg: '评论成功', data });
  }

  /** 删除评论（本人 / 管理员）；删主评论连带删其回复 */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const decoded = requireRole(this.authService, authorization, 1);
    await this.commentsService.remove(id, decoded);
    return res.status(200).json({ code: 200, msg: '删除成功', data: true });
  }
}

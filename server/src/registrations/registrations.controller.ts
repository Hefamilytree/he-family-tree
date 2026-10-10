import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Res,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { RegistrationsService } from './registrations.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';

@Controller('registrations')
export class RegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
    private readonly authService: AuthService,
  ) {}

  /** 报名名单（按查看者权限决定是否含手机号）；同时返回当前用户报名状态与总人数 */
  @Get()
  async findByActivity(
    @Query('activityId') activityId: string,
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
    const list = await this.registrationsService.findByActivity(activityId, viewer);
    let registered = false;
    if (viewer) {
      const mine = await this.registrationsService.getMyStatus(activityId, viewer.userId);
      registered = !!mine;
    }
    return res.status(200).json({
      code: 200,
      msg: 'success',
      data: { list, total: list.length, registered },
    });
  }

  /** 一键报名（登录宗亲） */
  @Post()
  async create(
    @Body() body: { activityId: string; note?: string },
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const decoded = requireRole(this.authService, authorization, 1);
    const result = await this.registrationsService.register(
      body.activityId,
      decoded,
      body.note,
    );
    return res.status(200).json({
      code: 200,
      msg: result.duplicated ? '您已报名，请勿重复操作' : '报名成功',
      data: { registered: true, record: result.data },
    });
  }

  /** 取消报名（仅本人） */
  @Delete()
  async cancel(
    @Body() body: { activityId: string },
    @Query('activityId') queryActivityId: string,
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const decoded = requireRole(this.authService, authorization, 1);
    const activityId = body?.activityId || queryActivityId;
    await this.registrationsService.cancel(activityId, decoded);
    return res.status(200).json({
      code: 200,
      msg: '已取消报名',
      data: { registered: false },
    });
  }
}

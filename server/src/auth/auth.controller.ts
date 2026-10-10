import { Controller, Post, Get, Put, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: { username: string; password: string; nickname?: string }) {
    const { username, password, nickname } = body;
    if (!username || !password) {
      return { code: 400, msg: '用户名和密码不能为空', data: null };
    }
    return this.authService.register(username, password, nickname);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    if (!username || !password) {
      return { code: 400, msg: '用户名和密码不能为空', data: null };
    }
    return this.authService.login(username, password);
  }

  @Get('profile')
  async getProfile(@Headers('authorization') authorization: string) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;

    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }

    return this.authService.getProfile(decoded.userId);
  }

  // 用户列表：仅管理人员及以上可查看（用于设置/取消管理员、转让主管理员）
  @Get('users')
  async listUsers(@Headers('authorization') authorization: string) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    return this.authService.listUsers(decoded.userId);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() body: { nickname?: string; avatar_url?: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;

    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }

    return this.authService.updateProfile(decoded.userId, body);
  }

  @Post('set-admin')
  @HttpCode(HttpStatus.OK)
  async setAdmin(
    @Headers('authorization') authorization: string,
    @Body() body: { userId: string; revoke?: boolean }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    const { userId, revoke } = body;
    if (!userId) {
      return { code: 400, msg: '用户 ID 不能为空', data: null };
    }
    return this.authService.setAdmin(decoded.userId, userId, revoke);
  }

  @Post('resign-admin')
  @HttpCode(HttpStatus.OK)
  async resignAdmin(@Headers('authorization') authorization: string) {
    if (!authorization) return { code: 401, msg: '未登录', data: null };
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded?.userId) return { code: 401, msg: '登录已失效', data: null };
    return this.authService.resignAdmin(decoded.userId);
  }

  @Post('transfer-super')
  @HttpCode(HttpStatus.OK)
  async transferSuper(
    @Headers('authorization') authorization: string,
    @Body() body: { userId?: string; targetUserId?: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    const userId = body?.userId || body?.targetUserId;
    if (!userId) {
      return { code: 400, msg: '用户 ID 不能为空', data: null };
    }
    return this.authService.transferSuper(decoded.userId, userId);
  }

  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  async wxLogin(@Body() body: { loginCode?: string; openid?: string; nickname?: string; avatar_url?: string }) {
    const b = body || ({} as any);
    // 需求3：登录唯一标识必须来自 code2Session 的真实 openid。
    if (b.loginCode) {
      return this.authService.wechatLogin(b.loginCode, b.nickname, b.avatar_url);
    }
    // 仅在非生产（本地开发/调试）允许直传 openid；生产环境一律关闭，杜绝本地临时 openid 多账号问题。
    const isProd = process.env.NODE_ENV === 'production';
    if (b.openid && !isProd) {
      return this.authService.loginByOpenid(b.openid, b.nickname, b.avatar_url);
    }
    if (b.openid && isProd) {
      return { code: 400, msg: '请使用微信授权登录，系统将自动获取您的微信身份', data: null };
    }
    return { code: 400, msg: '缺少微信登录凭证，请重新点击微信一键登录', data: null };
  }

  @Post('phone-apply')
  @HttpCode(HttpStatus.OK)
  async phoneApply(
    @Headers('authorization') authorization: string,
    @Body() body: { type?: 'bind' | 'change'; newPhone?: string; oldPhone?: string; reason?: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.type || !body?.newPhone) return { code: 400, msg: '参数不完整', data: null };
    return this.authService.submitPhoneApply(decoded.userId, body.type, body.newPhone, body.oldPhone, body.reason);
  }

  @Post('phone-review')
  @HttpCode(HttpStatus.OK)
  async phoneReview(
    @Headers('authorization') authorization: string,
    @Body() body: { appId: string; approve: boolean }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.appId) return { code: 400, msg: '申请 ID 不能为空', data: null };
    return this.authService.reviewPhoneApply(decoded.userId, body.appId, !!body.approve);
  }

  @Get('phone-apps')
  @HttpCode(HttpStatus.OK)
  async phoneApps(@Headers('authorization') authorization: string) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    return this.authService.listPhoneApps(decoded.userId);
  }

  @Post('admin-change-phone')
  @HttpCode(HttpStatus.OK)
  async adminChangePhone(
    @Headers('authorization') authorization: string,
    @Body() body: { targetUserId: string; newPhone: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.targetUserId || !body?.newPhone) return { code: 400, msg: '参数不完整', data: null };
    return this.authService.adminChangePhone(decoded.userId, body.targetUserId, body.newPhone);
  }

  @Post('migrate-apply')
  @HttpCode(HttpStatus.OK)
  async migrateApply(
    @Headers('authorization') authorization: string,
    @Body() body: { phone: string; identity?: string; reason?: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.phone) return { code: 400, msg: '请填写原手机号', data: null };
    return this.authService.applyMigration(decoded.userId, body.phone, body.identity, body.reason);
  }

  @Post('migrate-review')
  @HttpCode(HttpStatus.OK)
  async migrateReview(
    @Headers('authorization') authorization: string,
    @Body() body: { appId: string; approve: boolean }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.appId) return { code: 400, msg: '申请 ID 不能为空', data: null };
    return this.authService.reviewMigration(decoded.userId, body.appId, !!body.approve);
  }

  @Get('migrate-apps')
  @HttpCode(HttpStatus.OK)
  async migrateApps(@Headers('authorization') authorization: string) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    return this.authService.listMigrationApps(decoded.userId);
  }

  @Post('link-member')
  @HttpCode(HttpStatus.OK)
  async linkMember(
    @Headers('authorization') authorization: string,
    @Body() body: { memberId: string; phone?: string; residence?: string; generationTitle?: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    const { memberId, phone, residence, generationTitle } = body;
    if (!memberId) {
      return { code: 400, msg: '请选择要关联的宗亲', data: null };
    }
    return this.authService.linkMember(decoded.userId, memberId, phone, residence, generationTitle);
  }

  @Post('clear-data')
  @HttpCode(HttpStatus.OK)
  async clearData(@Headers('authorization') authorization: string) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    return this.authService.clearAllData(decoded.userId);
  }
}

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
    @Body() body: { userId: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    const { userId } = body;
    if (!userId) {
      return { code: 400, msg: '用户 ID 不能为空', data: null };
    }
    return this.authService.setAdmin(decoded.userId, userId);
  }

  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  async wxLogin(@Body() body: { loginCode?: string; openid?: string; nickname?: string; avatar_url?: string }) {
    const b = body || ({} as any);
    // 登录仅需 openid：loginCode 由后端 wx.login 换取 openid；不强制手机号授权
    if (b.loginCode) {
      return this.authService.wechatLogin(b.loginCode, b.nickname, b.avatar_url);
    }
    if (b.openid) {
      return this.authService.loginByOpenid(b.openid, b.nickname, b.avatar_url);
    }
    return { code: 400, msg: '缺少微信标识(openid/logincode)', data: null };
  }

  @Post('sms-code')
  @HttpCode(HttpStatus.OK)
  async smsCode(@Body() body: { phone: string; purpose?: string }) {
    if (!body || !body.phone) return { code: 400, msg: '请填写手机号', data: null };
    return this.authService.sendSmsCode(body.phone, body.purpose || 'bind');
  }

  @Post('bind-phone')
  @HttpCode(HttpStatus.OK)
  async bindPhone(
    @Headers('authorization') authorization: string,
    @Body() body: { phone: string; code: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.phone || !body?.code) return { code: 400, msg: '参数不完整', data: null };
    return this.authService.bindPhone(decoded.userId, body.phone, body.code);
  }

  @Post('change-phone')
  @HttpCode(HttpStatus.OK)
  async changePhone(
    @Headers('authorization') authorization: string,
    @Body() body: { oldPhone: string; newPhone: string; code: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.oldPhone || !body?.newPhone || !body?.code) return { code: 400, msg: '参数不完整', data: null };
    return this.authService.changePhone(decoded.userId, body.oldPhone, body.newPhone, body.code);
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

  @Post('migrate')
  @HttpCode(HttpStatus.OK)
  async migrate(
    @Headers('authorization') authorization: string,
    @Body() body: { phone: string; code?: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.phone) return { code: 400, msg: '请填写原手机号', data: null };
    return this.authService.migrateAccount(decoded.userId, body.phone, body.code);
  }

  @Post('migrate-apply')
  @HttpCode(HttpStatus.OK)
  async migrateApply(
    @Headers('authorization') authorization: string,
    @Body() body: { phone: string; reason?: string }
  ) {
    const decoded = this.authService.requireAuth(authorization);
    if ((decoded as any).code) return decoded;
    if (!body?.phone) return { code: 400, msg: '请填写原手机号', data: null };
    return this.authService.applyMigration(decoded.userId, body.phone, body.reason || '');
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

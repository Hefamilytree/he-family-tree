import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { getSupabaseClient } from '../storage/database/supabase-client';

const JWT_SECRET = process.env.JWT_SECRET || 'he-family-tree-secret-key-2024';

@Injectable()
export class AuthService {
  private get supabase() {
    return getSupabaseClient();
  }

  async register(username: string, password: string, nickname?: string) {
    // 检查用户名是否已存在
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return { code: 400, msg: '用户名已存在', data: null };
    }

    // 密码加密
    const password_hash = await bcrypt.hash(password, 10);

    // 小程序后台管理员（首个注册用户）自动成为“唯一主管理人员”；其余为未认证宗亲
    // 以是否已存在 super 作为判定，确保主管理人员全局唯一
    const { data: existingSuper } = await this.supabase
      .from('users')
      .select('id')
      .eq('role', 'super')
      .limit(1);
    const isFirst = !existingSuper || existingSuper.length === 0;

    // 创建用户
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        username,
        password_hash,
        nickname: nickname || username,
        role: isFirst ? 'super' : 'member',
      })
      .select()
      .single();

    if (error) {
      return { code: 500, msg: '注册失败', data: null };
    }

    // 生成 token
    const token = jwt.sign(
      { userId: data.id, username: data.username, role: data.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      code: 200,
      msg: '注册成功',
      data: {
        user: {
          id: data.id,
          username: data.username,
          nickname: data.nickname,
          role: data.role,
        },
        token,
      },
    };
  }

  async login(username: string, password: string) {
    // 查找用户
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return { code: 401, msg: '用户名或密码错误', data: null };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return { code: 401, msg: '用户名或密码错误', data: null };
    }

    // 生成 token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      code: 200,
      msg: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
          family_id: user.family_id,
        },
        token,
      },
    };
  }

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { code: 404, msg: '用户不存在', data: null };
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        role: data.role,
        family_id: data.family_id,
        avatar_url: data.avatar_url,
        member_id: data.member_id,
        phone: data.phone,
        residence: data.residence,
      },
    };
  }

  /**
   * 小程序端微信登录：
   *  - loginCode：Taro.login() 得到，用于后端换取 openid（账号唯一标识，永久绑定）
   *  - phoneCode：getPhoneNumber 按钮回调 code，用于换取手机号（登录必须验证手机号）
   */
  async wxCodeLogin(loginCode: string, nickname?: string, avatarUrl?: string) {
    const { code2Session } = require('./wx.api');
    const sess = await code2Session(loginCode);
    if (!sess.openid) {
      return { code: 400, msg: sess.errmsg || '获取微信标识失败', data: null };
    }
    return this.loginByOpenid(sess.openid, nickname, avatarUrl);
  }

  /**
   * 微信一键登录：
   *  - 账号唯一标识为微信 openid；一个 openid 仅能注册一次，永久绑定
   *  - 登录需验证手机号（phone 必填）
   *  - 已存在则直接登录；首次使用则自动创建账号
   */
  /** 通过 openid 登录/注册（手机号可选，登录环节不强制） */
  async loginByOpenid(openid: string, nickname?: string, avatarUrl?: string) {
    if (!openid) return { code: 400, msg: '缺少微信标识', data: null };

    const { data: existed } = await this.supabase
      .from('users')
      .select('*')
      .eq('openid', openid)
      .maybeSingle();

    if (existed) {
      // 已绑定账号：直接登录；不覆写手机号，避免清空已绑手机
      if (nickname || avatarUrl) {
        await this.supabase
          .from('users')
          .update({ nickname: nickname || existed.nickname, avatar_url: avatarUrl || existed.avatar_url })
          .eq('id', existed.id);
      }
      return this.buildWxResult(existed, '登录成功');
    }

    // 首次使用：自动注册（若数据库中已存在绑定过该手机号的账号，手机号将在登录后可选绑定）
    const { data: existingSuper } = await this.supabase
      .from('users')
      .select('id')
      .eq('role', 'super')
      .limit(1);
    const isFirst = !existingSuper || existingSuper.length === 0;

    const username = `wx_${openid.slice(-16)}`;
    const password_hash = await bcrypt.hash(openid + JWT_SECRET, 10);
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        username,
        password_hash,
        nickname: nickname || '微信宗亲',
        avatar_url: avatarUrl || null,
        openid,
        role: isFirst ? 'super' : 'member',
      })
      .select()
      .single();

    if (error) {
      return { code: 500, msg: '微信登录失败', data: null };
    }
    return this.buildWxResult(data, '注册并登录成功');
  }

  private buildWxResult(user: any, msg: string) {
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return {
      code: 200,
      msg,
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
          family_id: user.family_id,
          member_id: user.member_id,
          phone: user.phone,
          avatar_url: user.avatar_url,
        },
        token,
      },
    };
  }

  // ===== 手机号绑定 / 更换 / 迁移 =====
  private smsMap = new Map<string, { code: string; exp: number }>();

  /** 发送短信验证码（业务库手机号；开发环境在响应中返回验证码便于调试） */
  async sendSmsCode(phone: string, purpose = 'bind') {
    if (!/^1\d{10}$/.test(phone)) return { code: 400, msg: '手机号格式不正确', data: null };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.smsMap.set(purpose + ':' + phone, { code, exp: Date.now() + 5 * 60 * 1000 });
    try {
      await this.supabase.from('sms_codes').insert({ phone, code, purpose });
    } catch (e) { /* 忽略 */ }
    console.log(`[SMS] 手机号 ${phone} 验证码：${code}（仅开发预览展示）`);
    return { code: 200, msg: '验证码已发送', data: { debugCode: code } };
  }

  private verifySms(phone: string, code: string, purpose = 'bind') {
    const rec = this.smsMap.get(purpose + ':' + phone);
    if (!rec) return false;
    if (rec.exp < Date.now()) return false;
    if (rec.code !== code) return false;
    this.smsMap.delete(purpose + ':' + phone);
    return true;
  }

  private async log(action: string, operatorId: string, targetUserId: string, detail: any) {
    try {
      await this.supabase.from('auth_logs').insert({
        action, operator_id: operatorId || null, target_user_id: targetUserId || null, detail: detail || null,
      });
    } catch (e) {
      console.error('写入日志失败', e);
    }
  }

  /** 登录后绑定手机号（新绑） */
  async bindPhone(userId: string, phone: string, code: string) {
    if (!this.verifySms(phone, code, 'bind')) return { code: 400, msg: '验证码错误或已过期', data: null };
    const { data: self } = await this.supabase.from('users').select('phone, member_id').eq('id', userId).single();
    if (self && self.phone) return { code: 400, msg: '当前账号已绑定手机号，请使用「更换手机号」', data: null };
    const { data: holder } = await this.supabase.from('users').select('id').eq('phone', phone).maybeSingle();
    if (holder) return { code: 400, msg: '该手机号已被其他账号绑定', data: null };
    await this.supabase.from('users').update({ phone }).eq('id', userId);
    await this.log('bind_phone', userId, userId, { before: null, after: phone });
    const { data: me } = await this.supabase.from('users').select('member_id').eq('id', userId).single();
    if (me && me.member_id) await this.supabase.from('members').update({ phone }).eq('id', me.member_id);
    return { code: 200, msg: '手机号绑定成功', data: { phone } };
  }

  /** 更换手机号：需原手机号 + 新手机号验证码 */
  async changePhone(userId: string, oldPhone: string, newPhone: string, code: string) {
    const { data: self } = await this.supabase.from('users').select('phone').eq('id', userId).single();
    if (!self || self.phone !== oldPhone) return { code: 400, msg: '原手机号不匹配', data: null };
    if (!this.verifySms(newPhone, code, 'change')) return { code: 400, msg: '新手机号验证码错误或已过期', data: null };
    const { data: holder } = await this.supabase.from('users').select('id').eq('phone', newPhone).maybeSingle();
    if (holder && holder.id !== userId) return { code: 400, msg: '该手机号已被其他账号绑定', data: null };
    await this.supabase.from('users').update({ phone: newPhone }).eq('id', userId);
    await this.log('change_phone', userId, userId, { before: oldPhone, after: newPhone });
    return { code: 200, msg: '手机号更换成功', data: { phone: newPhone } };
  }

  /** 管理员代改手机号 */
  async adminChangePhone(operatorId: string, targetUserId: string, newPhone: string) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || (op.role !== 'super' && op.role !== 'admin')) return { code: 403, msg: '无权限', data: null };
    const { data: t } = await this.supabase.from('users').select('phone').eq('id', targetUserId).single();
    const before = t && t.phone ? t.phone : '';
    await this.supabase.from('users').update({ phone: newPhone }).eq('id', targetUserId);
    await this.log('admin_change_phone', operatorId, targetUserId, { before, after: newPhone });
    return { code: 200, msg: '已协助修改手机号', data: { phone: newPhone } };
  }

  /** 微信账号迁移：新微信登录后发起；原手机号可用则短信校验后立即迁移 */
  async migrateAccount(userId: string, phone: string, code?: string) {
    const { data: target } = await this.supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (!target) return { code: 404, msg: '未找到原手机号对应的宗亲账号', data: null };
    if (!this.verifySms(phone, code || '', 'migrate')) {
      return { code: 400, msg: '验证码错误或已过期，如原手机号不可用请走人工审核', data: null };
    }
    return this.doMigrate(userId, target.id);
  }

  /** 提交人工审核迁移申请（原手机号不可用） */
  async applyMigration(userId: string, phone: string, reason: string) {
    const { data: target } = await this.supabase.from('users').select('id, phone').eq('phone', phone).maybeSingle();
    if (!target) return { code: 404, msg: '未找到原手机号对应的宗亲账号', data: null };
    const { error } = await this.supabase.from('migration_applications').insert({
      from_user_id: target.id, to_user_id: userId, phone, reason: reason || '', status: 'pending', submitted_by: userId,
    });
    if (error) return { code: 500, msg: '提交失败', data: null };
    return { code: 200, msg: '迁移申请已提交，等待管理人员审核', data: null };
  }

  /** 管理员审核并执行迁移 */
  async reviewMigration(operatorId: string, appId: string, approve: boolean) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || (op.role !== 'super' && op.role !== 'admin')) return { code: 403, msg: '无权限', data: null };
    const { data: app } = await this.supabase.from('migration_applications').select('*').eq('id', appId).single();
    if (!app || app.status !== 'pending') return { code: 400, msg: '申请不存在或已处理', data: null };
    if (!approve) {
      await this.supabase.from('migration_applications').update({
        status: 'rejected', reviewed_by: operatorId, reviewed_at: new Date().toISOString(),
      }).eq('id', appId);
      return { code: 200, msg: '已驳回申请', data: null };
    }
    const r = await this.doMigrate(app.to_user_id, app.from_user_id, operatorId);
    await this.supabase.from('migration_applications').update({
      status: 'approved', reviewed_by: operatorId, reviewed_at: new Date().toISOString(),
    }).eq('id', appId);
    return r;
  }

  /** 管理员拉取待审核迁移申请列表 */
  async listMigrationApps(operatorId: string) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || (op.role !== 'super' && op.role !== 'admin')) return { code: 403, msg: '无权限', data: null };
    const { data } = await this.supabase
      .from('migration_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    return { code: 200, msg: 'ok', data: data || [] };
  }

  /** 执行迁移：转移旧账号身份/成员/权限至新 openid 账号，解绑旧 openid */
  private async doMigrate(newUid: string, oldUid: string, reviewerId?: string) {
    const { data: oldUser } = await this.supabase.from('users').select('*').eq('id', oldUid).single();
    const { data: newUser } = await this.supabase.from('users').select('*').eq('id', newUid).single();
    if (!oldUser || !newUser) return { code: 404, msg: '账号不存在', data: null };
    if (oldUser.id === newUser.id) return { code: 400, msg: '目标账号与当前账号相同', data: null };

    await this.supabase.from('comments').update({ user_id: newUid }).eq('user_id', oldUid);
    await this.supabase.from('registrations').update({ user_id: newUid }).eq('user_id', oldUid);
    await this.supabase.from('kin_contacts').update({ created_by: newUid }).eq('created_by', oldUid);

    await this.supabase.from('users').update({
      member_id: oldUser.member_id || null,
      family_id: oldUser.family_id || null,
      role: oldUser.role || 'member',
      nickname: oldUser.nickname || newUser.nickname,
      avatar_url: oldUser.avatar_url || newUser.avatar_url,
      phone: oldUser.phone || newUser.phone,
    }).eq('id', newUid);

    await this.supabase.from('users').update({ openid: null, member_id: null }).eq('id', oldUid);

    await this.log('migrate_account', newUid, oldUid, {
      from_openid: oldUser.openid, to_openid: newUser.openid,
      from_phone: oldUser.phone, to_phone: newUser.phone, reviewer: reviewerId || null,
    });
    return { code: 200, msg: '账号迁移成功，数据与权限已完整保留', data: null };
  }

  async updateProfile(userId: string, updates: { nickname?: string; avatar_url?: string }) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) return { code: 500, msg: '更新失败', data: null };
    return {
      code: 200,
      msg: '更新成功',
      data: { id: data.id, username: data.username, nickname: data.nickname, role: data.role },
    };
  }

  async setAdmin(operatorId: string, targetUserId: string) {
    if (!operatorId || operatorId === targetUserId) return { code: 400, msg: '参数不合法', data: null };
    const { data: operator } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!operator || operator.role !== 'super') {
      return { code: 403, msg: '仅主管理人员可设置管理人员', data: null };
    }
    const { data, error } = await this.supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', targetUserId)
      .select('id, username, role')
      .single();
    if (error || !data) return { code: 500, msg: '设置失败', data: null };
    return { code: 200, msg: '已设置为管理人员', data: { id: data.id, username: data.username, role: data.role } };
  }

  async linkMember(
    userId: string,
    memberId: string,
    phone?: string,
    residence?: string,
    generationTitle?: string
  ) {
    if (!userId || !memberId) return { code: 400, msg: '参数不完整', data: null };
    const { data: member } = await this.supabase.from('members').select('*').eq('id', memberId).single();
    if (!member) return { code: 404, msg: '所选宗亲不存在', data: null };
    // 若成员未定字辈则用传入字辈回写
    const finalTitle = member.generation_title || generationTitle || null;
    if (finalTitle && finalTitle !== member.generation_title) {
      await this.supabase.from('members').update({ generation_title: finalTitle }).eq('id', memberId);
    }
    // 更新成员登记信息
    const patch: any = { status: 2 };
    if (phone) patch.phone = phone;
    if (residence) patch.residence = residence;
    await this.supabase.from('members').update(patch).eq('id', memberId);
    // 用户关联成员并升级为认证宗亲
    await this.supabase
      .from('users')
      .update({ member_id: memberId, role: 'verified', phone: phone || undefined, residence: residence || undefined })
      .eq('id', userId);
    await this.log('link_member', userId, userId, { member_id: memberId });
    return { code: 200, msg: '宗亲信息关联成功，已成为认证宗亲', data: { member_id: memberId } };
  }

  async clearAllData(operatorId: string) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || op.role !== 'super') return { code: 403, msg: '仅主管理人员可清空数据', data: null };
    const tables = [
      'comments', 'cultural_heritage', 'economic_development', 'family_applications',
      'harmony_activities', 'kin_contacts', 'migration_applications', 'registrations',
      'spouses', 'sms_codes',
    ];
    for (const t of tables) {
      try { await this.supabase.from(t).delete().neq('id', 'x'); } catch (e) { /* 忽略 */ }
    }
    await this.supabase.from('members').delete().neq('id', 'x');
    await this.supabase.from('users').delete().neq('id', 'x');
    await this.log('clear_all_data', operatorId, operatorId, { at: new Date().toISOString() });
    return { code: 200, msg: '已清空全部数据', data: null };
  }

  /** 微信一键登录：loginCode 换取 openid 后完成登录（不强制手机号授权） */
  async wechatLogin(loginCode: string, nickname?: string, avatarUrl?: string) {
    if (!loginCode) return { code: 400, msg: '缺少登录凭证', data: null };
    const { code2Session } = require('./wx.api');
    const session = await code2Session(loginCode);
    if (!session || !session.openid) {
      // 开发环境降级：未配置 WX_APPID/WX_SECRET 时用 loginCode 作为 openid
      const devOpenid = session?.errcode === -1 ? `wx_dev_${loginCode}` : null;
      if (!devOpenid) return { code: 400, msg: '微信登录失败，请稍后重试', data: null };
      return this.loginByOpenid(devOpenid, nickname, avatarUrl);
    }
    return this.loginByOpenid(session.openid, nickname, avatarUrl);
  }

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /** 从 authorization 头解析并校验登录态；成功返回解码负载，失败返回 { code: 401, msg } */
  requireAuth(authorization?: string) {
    if (!authorization) return { code: 401, msg: '未登录', data: null };
    const token = authorization.replace('Bearer ', '');
    const decoded = this.verifyToken(token) as any;
    if (!decoded) return { code: 401, msg: 'token 无效或已过期', data: null };
    return decoded;
  }
}

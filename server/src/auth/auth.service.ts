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

  // ===== 手机号绑定 / 更换（申请-审核模型，取消短信验证码） / 迁移 =====

  private async log(action: string, operatorId: string, targetUserId: string, detail: any) {
    try {
      await this.supabase.from('auth_logs').insert({
        action, operator_id: operatorId || null, target_user_id: targetUserId || null, detail: detail || null,
      });
    } catch (e) {
      console.error('写入日志失败', e);
    }
  }

  private isManager(role?: string) {
    return role === 'super' || role === 'admin';
  }

  /** 检查某手机号是否已被其他账号占用 */
  private async phoneOccupied(phone: string, excludeUserId?: string) {
    const { data } = await this.supabase.from('users').select('id').eq('phone', phone).limit(10);
    if (!data || data.length === 0) return null;
    const hit = excludeUserId ? data.find((d) => d.id !== excludeUserId) : data[0];
    return hit ? hit.id : null;
  }

  /** 用户提交「绑定/更换手机号」申请，由管理员人工审核 */
  async submitPhoneApply(userId: string, type: 'bind' | 'change', newPhone: string, oldPhone?: string, reason?: string) {
    if (!/^1\d{10}$/.test(newPhone)) return { code: 400, msg: '手机号格式不正确', data: null };
    const { data: self } = await this.supabase.from('users').select('phone, role').eq('id', userId).single();
    const holder = await this.phoneOccupied(newPhone);
    if (holder) return { code: 400, msg: '该手机号已被其他账号绑定', data: null };

    if (type === 'bind') {
      if (self && self.phone) return { code: 400, msg: '当前账号已绑定手机号，请使用「更换手机号」', data: null };
    } else {
      if (oldPhone && self && self.phone !== oldPhone) {
        return { code: 400, msg: '原手机号与当前绑定不一致', data: null };
      }
    }
    const { error } = await this.supabase.from('phone_applications').insert({
      user_id: userId, type, old_phone: oldPhone || null, new_phone: newPhone,
      reason: reason || null, status: 'pending', submitted_by: userId,
    });
    if (error) return { code: 500, msg: '提交失败，请稍后重试', data: null };
    return { code: 200, msg: '申请已提交，等待家族管理员审核', data: null };
  }

  /** 管理员审核手机号申请：通过则写入新手机号（openid 不变） */
  async reviewPhoneApply(operatorId: string, appId: string, approve: boolean) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || !this.isManager(op.role)) return { code: 403, msg: '无权限', data: null };
    const { data: app } = await this.supabase.from('phone_applications').select('*').eq('id', appId).single();
    if (!app || app.status !== 'pending') return { code: 400, msg: '申请不存在或已处理', data: null };
    const detail = {
      applicant: app.user_id, old_phone: app.old_phone, new_phone: app.new_phone,
      reviewer: operatorId, time: new Date().toISOString(),
    };
    if (!approve) {
      await this.log('reject_phone_apply', operatorId, app.user_id, detail);
      await this.supabase.from('phone_applications').update({
        status: 'rejected', reviewed_by: operatorId, reviewed_at: new Date().toISOString(),
      }).eq('id', appId);
      return { code: 200, msg: '已驳回申请', data: null };
    }
    const holder = await this.phoneOccupied(app.new_phone, app.user_id);
    if (holder) {
      await this.supabase.from('phone_applications').update({
        status: 'rejected', reviewed_by: operatorId, reviewed_at: new Date().toISOString(),
      }).eq('id', appId);
      return { code: 400, msg: '该手机号已被其他账号绑定，自动驳回', data: null };
    }
    await this.supabase.from('users').update({ phone: app.new_phone }).eq('id', app.user_id);
    await this.log('approve_phone_apply', operatorId, app.user_id, detail);
    const { data: me } = await this.supabase.from('users').select('member_id').eq('id', app.user_id).single();
    if (me && me.member_id) await this.supabase.from('members').update({ phone: app.new_phone }).eq('id', me.member_id);
    await this.supabase.from('phone_applications').update({
      status: 'approved', reviewed_by: operatorId, reviewed_at: new Date().toISOString(),
    }).eq('id', appId);
    return { code: 200, msg: '已通过并写入新手机号', data: null };
  }

  /** 管理员拉取手机号申请列表 */
  async listPhoneApps(operatorId: string) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || !this.isManager(op.role)) return { code: 403, msg: '无权限', data: null };
    const { data } = await this.supabase
      .from('phone_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    return { code: 200, msg: 'ok', data: data || [] };
  }

  /** 管理员代改手机号（协助改动，记录操作日志） */
  async adminChangePhone(operatorId: string, targetUserId: string, newPhone: string) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || !this.isManager(op.role)) return { code: 403, msg: '无权限', data: null };
    const holder = await this.phoneOccupied(newPhone, targetUserId);
    if (holder) return { code: 400, msg: '该手机号已被其他账号绑定', data: null };
    const { data: t } = await this.supabase.from('users').select('phone, member_id').eq('id', targetUserId).single();
    const before = t && t.phone ? t.phone : '';
    await this.supabase.from('users').update({ phone: newPhone }).eq('id', targetUserId);
    if (t && t.member_id) await this.supabase.from('members').update({ phone: newPhone }).eq('id', t.member_id);
    await this.log('admin_change_phone', operatorId, targetUserId, { before, after: newPhone });
    return { code: 200, msg: '已协助修改手机号', data: { phone: newPhone } };
  }

  /** 微信账号迁移：新微信登录后发起，一律走管理员人工审核（取消短信直迁） */
  async applyMigration(userId: string, phone: string, identity?: string, reason?: string) {
    const { data: target } = await this.supabase.from('users').select('id, phone, openid').eq('phone', phone).maybeSingle();
    if (!target) return { code: 404, msg: '未找到原手机号对应的宗亲账号', data: null };
    if (target.openid) {
      // 原账号仍有 openid 关联：新 openid 申请迁移前，原账号同一时间只允许绑定一个 openid，
      // 新 openid 不能已绑定其他宗亲账号（loginByOpenid 保证 openid 唯一）。
    }
    const { error } = await this.supabase.from('migration_applications').insert({
      from_user_id: target.id, to_user_id: userId, phone,
      reason: `身份资料：${identity || '未填写'}` + (reason ? `；缘由：${reason}` : ''),
      status: 'pending', submitted_by: userId,
    });
    if (error) return { code: 500, msg: '提交失败', data: null };
    return { code: 200, msg: '迁移申请已提交，等待家族管理员审核', data: null };
  }

  /** 管理员审核并执行迁移（主管理员迁移需二次确认，前端弹窗已处理） */
  async reviewMigration(operatorId: string, appId: string, approve: boolean) {
    const { data: op } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!op || !this.isManager(op.role)) return { code: 403, msg: '无权限', data: null };
    const { data: app } = await this.supabase.from('migration_applications').select('*').eq('id', appId).single();
    if (!app || app.status !== 'pending') return { code: 400, msg: '申请不存在或已处理', data: null };
    if (!approve) {
      await this.log('reject_migration', operatorId, app.from_user_id, { app_id: appId });
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
    if (!op || !this.isManager(op.role)) return { code: 403, msg: '无权限', data: null };
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
    // 防冲突：新 openid 已绑定其他宗亲账号时不允许被覆盖
    if (newUser.member_id && newUser.member_id !== oldUser.member_id) {
      return { code: 400, msg: '新微信账号已绑定其他宗亲身份，无法迁移（请先解绑）', data: null };
    }
    if (newUser.family_id && newUser.family_id !== oldUser.family_id) {
      return { code: 400, msg: '新微信账号已属于其他家族，无法迁移', data: null };
    }

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

  async listUsers(operatorId: string) {
    const { data: operator } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', operatorId)
      .single();
    if (!operator || !['super', 'admin'].includes(operator.role)) {
      return { code: 403, msg: '仅管理人员可查看用户列表', data: null };
    }
    const { data, error } = await this.supabase
      .from('users')
      .select('id, username, nickname, avatar_url, role, phone, member_id')
      .order('created_at', { ascending: true });
    if (error) return { code: 500, msg: '查询失败', data: null };
    return { code: 200, msg: 'success', data };
  }

  async setAdmin(operatorId: string, targetUserId: string, revoke?: boolean) {
    if (!operatorId || operatorId === targetUserId) return { code: 400, msg: '参数不合法', data: null };
    const { data: operator } = await this.supabase.from('users').select('role').eq('id', operatorId).single();
    if (!operator || operator.role !== 'super') {
      return { code: 403, msg: '仅主管理人员可设置管理人员', data: null };
    }
    const nextRole = revoke ? 'verified' : 'admin';
    const { data, error } = await this.supabase
      .from('users')
      .update({ role: nextRole })
      .eq('id', targetUserId)
      .select('id, username, role')
      .single();
    if (error || !data) return { code: 500, msg: '设置失败', data: null };
    await this.log(revoke ? 'revoke_admin' : 'set_admin', operatorId, targetUserId, {
      target_role: nextRole,
    });
    return { code: 200, msg: revoke ? '已取消管理人员身份' : '已设置为管理人员', data: { id: data.id, username: data.username, role: data.role } };
  }

  /**
   * 转让主管理员：
   *  - 仅当前主管理员可操作
   *  - 目标须为已认证宗亲/管理人员（不能是游客/未认证）
   *  - 转让后：目标升为 super，原主管理员降为 admin；全程记录日志
   */
  async transferSuper(operatorId: string, targetUserId: string) {
    if (!operatorId || !targetUserId || operatorId === targetUserId) {
      return { code: 400, msg: '参数不合法（不能转让给自己）', data: null };
    }
    const { data: operator } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', operatorId)
      .single();
    if (!operator || operator.role !== 'super') {
      return { code: 403, msg: '仅主管理人员可转让主管理员身份', data: null };
    }
    const { data: target } = await this.supabase
      .from('users')
      .select('id, username, role')
      .eq('id', targetUserId)
      .single();
    if (!target) return { code: 404, msg: '目标用户不存在', data: null };
    if (!['verified', 'admin'].includes(target.role)) {
      return { code: 400, msg: '仅可转让给已认证宗亲或管理人员', data: null };
    }

    // 保证唯一：先把其余 super 降级，再置目标为 super
    await this.supabase.from('users').update({ role: 'admin' }).eq('role', 'super');
    const { data: updated, error } = await this.supabase
      .from('users')
      .update({ role: 'super' })
      .eq('id', targetUserId)
      .select('id, username, role')
      .single();
    if (error || !updated) return { code: 500, msg: '转让失败', data: null };

    await this.log('transfer_super', operatorId, targetUserId, {
      from_super: operatorId,
      to_super: targetUserId,
    });
    return { code: 200, msg: '主管理员身份已转让', data: updated };
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
    // 注意：openid 由 code2Session 稳定返回（同一微信在同一 AppID 下固定不变）。
    // 未配置 WX_APPID 时，绝不能将一次性 loginCode 当作 openid（会导致每次登录账号都不同）。
    // 测试/预览环境请使用前端直传的本地固定 openid 接口（wx-login body.openid），不经过本方法。
    if (!session || !session.openid) {
      return { code: 400, msg: '微信登录失败，请确认已配置小程序 AppID 与 Secret（测试环境请使用直传 openid 方式登录）', data: null };
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

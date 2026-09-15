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

    // 创建用户
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        username,
        password_hash,
        nickname: nickname || username,
        role: 'member',
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

  async updateProfile(userId: string, updates: { nickname?: string; avatar_url?: string }) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { code: 500, msg: '更新失败', data: null };
    }

    return {
      code: 200,
      msg: '更新成功',
      data: {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        role: data.role,
      },
    };
  }

  async setAdmin(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { code: 500, msg: '设置失败', data: null };
    }

    return {
      code: 200,
      msg: '已设置为管理员',
      data: {
        id: data.id,
        username: data.username,
        role: data.role,
      },
    };
  }

  async wechatLogin(code: string, nickname?: string, avatar_url?: string) {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    let openid: string | null = null;

    if (appid && secret) {
      try {
        const url =
          `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}` +
          `&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
        const res = await fetch(url);
        const json = (await res.json()) as any;
        if (json.openid) {
          openid = json.openid;
        } else {
          return { code: 500, msg: '微信登录失败：' + (json.errmsg || 'code 无效'), data: null };
        }
      } catch (e) {
        return { code: 500, msg: '微信登录失败，请稍后重试', data: null };
      }
    } else {
      // 未配置 WX_APPID/WX_SECRET 时（开发/本地环境）使用 code 作为降级标识
      openid = `wx_dev_${code}`;
    }

    let user: any = null;
    const { data: existing } = await this.supabase.from('users').select('*').eq('openid', openid).maybeSingle();
    if (existing) {
      user = existing;
    } else {
      const password_hash = await bcrypt.hash(String(Math.random() * 1e10), 10);
      const { data: created, error } = await this.supabase
        .from('users')
        .insert({
          openid: openid!,
          username: `wx_${(openid || 'wx').slice(-8)}`,
          nickname: nickname || '微信用户',
          password_hash,
          role: 'member',
          avatar_url: avatar_url || null,
        })
        .select()
        .single();
      if (error) {
        return { code: 500, msg: '微信登录失败，请重试', data: null };
      }
      user = created;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, member_id: user.member_id },
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
          member_id: user.member_id,
        },
        token,
      },
    };
  }

  async linkMember(
    userId: string,
    memberId: string,
    phone?: string,
    residence?: string,
    generationTitle?: string,
  ) {
    if (!userId || !memberId) {
      return { code: 400, msg: '参数不完整', data: null };
    }
    if (!phone || !phone.trim()) {
      return { code: 400, msg: '请填写手机号码', data: null };
    }
    if (!residence || !residence.trim()) {
      return { code: 400, msg: '请填写现居住地', data: null };
    }

    // 校验所选成员存在，并确定字辈（成员已有字辈则沿用；否则必须传入并回写）
    const { data: member, error: memErr } = await this.supabase
      .from('members')
      .select('id, generation_title')
      .eq('id', memberId)
      .single();
    if (memErr || !member) {
      return { code: 404, msg: '所选宗亲不存在', data: null };
    }
    const finalTitle = (member.generation_title || '').trim() || (generationTitle || '').trim();
    if (!finalTitle) {
      return { code: 400, msg: '请选择字辈', data: null };
    }
    if (!(member.generation_title || '').trim() && finalTitle) {
      // 成员原本无字辈，将本次选择回写到成员
      await this.supabase.from('members').update({ generation_title: finalTitle }).eq('id', memberId);
    }

    const { data, error } = await this.supabase
      .from('users')
      .update({ member_id: memberId, phone: phone.trim(), residence: residence.trim() })
      .eq('id', userId)
      .select()
      .single();
    if (error) {
      return { code: 500, msg: '关联失败，请重试', data: null };
    }
    return {
      code: 200,
      msg: '关联成功',
      data: {
        id: data.id,
        username: data.username,
        role: data.role,
        member_id: data.member_id,
        phone: data.phone,
        residence: data.residence,
        generation_title: finalTitle,
      },
    };
  }

  async clearAllData(userId: string) {
    const { data: me, error: meErr } = await this.supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (meErr || !me || me.role !== 'admin') {
      return { code: 403, msg: '仅主管理员可清除全部数据', data: null };
    }
    const tables = ['spouses', 'comments', 'registrations', 'economic_development', 'harmony_activities', 'cultural_heritage', 'members'];
    for (const t of tables) {
      const { error } = await this.supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        return { code: 500, msg: `清除${t}失败`, data: null };
      }
    }
    const { error: famErr } = await this.supabase.from('families').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (famErr) {
      return { code: 500, msg: '清除家族失败', data: null };
    }
    return { code: 200, msg: '已清除全部家族数据', data: null };
  }

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

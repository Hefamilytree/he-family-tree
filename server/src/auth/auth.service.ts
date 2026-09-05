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

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

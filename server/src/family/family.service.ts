import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class FamilyService {
  private getClient() {
    return getSupabaseClient();
  }

  async getFamily() {
    const client = this.getClient();
    const { data, error } = await client
      .from('families')
      .select('id, surname, family_name, hall_name, motto, description, origin, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`查询家族信息失败: ${error.message}`);
    return data && data.length > 0 ? data[0] : null;
  }

  async createFamily(
    payload: {
      surname: string;
      family_name: string;
      hall_name?: string | null;
      motto?: string | null;
      description?: string | null;
      origin?: string | null;
    },
    creatorId?: string,
  ) {
    const client = this.getClient();

    // 已有家族时，禁止再次创建（保证「唯一家族 + 唯一主管理员」）
    const { data: existed } = await client
      .from('families')
      .select('id')
      .limit(1);
    if (existed && existed.length > 0) {
      throw new Error('家族已存在，无需重复创建');
    }

    const { data, error } = await client
      .from('families')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(`创建家族失败: ${error.message}`);

    // 创建者自动成为本家族「唯一主管理员」
    if (creatorId) {
      // 若历史上已存在 super（异常数据），先降级，保证唯一
      await client
        .from('users')
        .update({ role: 'admin' })
        .eq('role', 'super')
        .neq('id', creatorId);
      await client
        .from('users')
        .update({ role: 'super' })
        .eq('id', creatorId);
    }

    return data;
  }

  async updateFamily(id: string, payload: {
    surname?: string;
    family_name?: string;
    hall_name?: string | null;
    motto?: string | null;
    description?: string | null;
    origin?: string | null;
  }) {
    const client = this.getClient();
    const { data, error } = await client
      .from('families')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`更新家族失败: ${error.message}`);
    return data;
  }
}

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
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) throw new Error(`查询家族信息失败: ${error.message}`);
    return data && data.length > 0 ? data[0] : null;
  }

  async createFamily(payload: {
    surname: string;
    family_name: string;
    hall_name?: string | null;
    motto?: string | null;
    description?: string | null;
    origin?: string | null;
  }) {
    const client = this.getClient();
    const { data, error } = await client
      .from('families')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(`创建家族失败: ${error.message}`);
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

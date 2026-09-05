import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

@Injectable()
export class RegistrationsService {
  private get supabase() { return getSupabaseClient(); }

  async findByActivity(activityId: string) {
    const { data, error } = await this.supabase
      .from('registrations')
      .select(`
        *,
        user:users(nickname, avatar_url)
      `)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(activityId: string, userId: string, memberName: string, phone: string, note?: string) {
    const { data, error } = await this.supabase
      .from('registrations')
      .insert({ activity_id: activityId, user_id: userId, member_name: memberName, phone, note })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('registrations').delete().eq('id', id);
    if (error) throw error;
    return { message: '取消报名成功' };
  }
}

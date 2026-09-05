import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { comments } from '../storage/database/shared/schema';

@Injectable()
export class CommentsService {
  private get supabase() { return getSupabaseClient(); }

  async findAll(targetType: string, targetId: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .select(`
        *,
        user:users(nickname, avatar_url)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(targetType: string, targetId: string, userId: string, content: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({ target_type: targetType, target_id: targetId, user_id: userId, content })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
    return { message: '删除成功' };
  }
}

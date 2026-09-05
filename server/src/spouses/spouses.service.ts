import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

@Injectable()
export class SpousesService {
  private get supabase() { return getSupabaseClient(); }

  async findByMember(memberId: string) {
    const { data, error } = await this.supabase
      .from('spouses')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async create(memberId: string, name: string, status: string, birthDate?: string, deathDate?: string) {
    const { data, error } = await this.supabase
      .from('spouses')
      .insert({ member_id: memberId, name, status, birth_date: birthDate, death_date: deathDate })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: { name?: string; status?: string; birth_date?: string; death_date?: string }) {
    const { data, error } = await this.supabase
      .from('spouses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('spouses').delete().eq('id', id);
    if (error) throw error;
    return { message: '删除成功' };
  }
}

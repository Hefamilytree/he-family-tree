import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

@Injectable()
export class SpousesService {
  private get supabase() { return getSupabaseClient(); }

  /** 已故配偶未填生卒/葬地时自动补全：生失考、卒失考、葬地不详 */
  private normalize(input: {
    name: string;
    status: string;
    birthDate?: string;
    deathDate?: string;
    bio?: string;
    burialPlace?: string;
  }) {
    const deceased = input.status === 'deceased';
    const birth = input.birthDate?.trim() || (deceased ? '生失考' : null);
    const death = input.deathDate?.trim() || (deceased ? '卒失考' : null);
    const burial = input.burialPlace?.trim() || (deceased ? '葬地不详' : null);
    return {
      name: input.name,
      status: input.status,
      birth_date: birth,
      death_date: death,
      bio: input.bio?.trim() || null,
      burial_place: burial,
    };
  }

  async findByMember(memberId: string) {
    const { data, error } = await this.supabase
      .from('spouses')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async create(memberId: string, name: string, status: string, birthDate?: string, deathDate?: string, bio?: string, burialPlace?: string) {
    const payload = this.normalize({ name, status, birthDate, deathDate, bio, burialPlace });
    const { data, error } = await this.supabase
      .from('spouses')
      .insert({ member_id: memberId, ...payload })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: { name?: string; status?: string; birth_date?: string | null; death_date?: string | null; bio?: string | null; burial_place?: string | null }) {
    const isEmpty = (v: unknown) => v === undefined || v === null || String(v).trim() === '';
    // 若状态变为已故，自动补全失考信息
    if (updates.status === 'deceased') {
      if (isEmpty(updates.birth_date)) updates.birth_date = '生失考';
      if (isEmpty(updates.death_date)) updates.death_date = '卒失考';
      if (isEmpty(updates.burial_place)) updates.burial_place = '葬地不详';
    }
    if (updates.bio !== undefined) updates.bio = updates.bio?.trim() || null;
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

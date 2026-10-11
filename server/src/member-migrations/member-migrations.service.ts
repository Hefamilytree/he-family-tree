import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

@Injectable()
export class MemberMigrationsService {
  private get supabase() { return getSupabaseClient(); }

  /** 查询某成员的全部迁徙行（自动附带成员世代、姓名） */
  async findByMember(memberId: string) {
    const { data, error } = await this.supabase
      .from('member_migrations')
      .select('id, member_id, era, from_place, to_place, sort_order, created_at')
      .eq('member_id', memberId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /** 查询全家族迁徙行（空白=全部），附带成员世代与姓名；供打印/列表使用 */
  async getAll(limit = 500) {
    const client = this.supabase;
    const { data: migs, error } = await client
      .from('member_migrations')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    if (!migs || migs.length === 0) return [];

    const memberIds = [...new Set<string>(migs.map((m: any) => m.member_id))];
    const { data: members, error: mErr } = await client
      .from('members')
      .select('id, name, generation, generation_title')
      .in('id', memberIds);
    if (mErr) throw mErr;
    const memberMap = new Map<string, any>((members || []).map((m: any) => [m.id, m]));

    return migs.map((m: any) => {
      const mem = memberMap.get(m.member_id) || {};
      return {
        ...m,
        member_id: m.member_id,
        member_name: mem.name || '未知',
        generation: mem.generation ?? null,
        generation_title: mem.generation_title || null,
      };
    });
  }

  async create(payload: any) {
    const memberId = payload?.memberId || payload?.member_id || payload?.memberId || '';
    if (!memberId) throw new Error('缺少成员ID');
    const { data, error } = await this.supabase
      .from('member_migrations')
      .insert({
        member_id: memberId,
        era: payload.era?.trim() || null,
        from_place: payload.fromPlace?.trim() || payload.from_place?.trim() || null,
        to_place: payload.toPlace?.trim() || payload.to_place?.trim() || null,
        sort_order: payload.sortOrder ?? payload.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: any) {
    const valid: Record<string, any> = {};
    if (updates.era !== undefined) valid.era = String(updates.era).trim();
    const fromPlace = updates.fromPlace !== undefined ? updates.fromPlace : updates.from_place;
    if (fromPlace !== undefined) valid.from_place = String(fromPlace).trim();
    const toPlace = updates.toPlace !== undefined ? updates.toPlace : updates.to_place;
    if (toPlace !== undefined) valid.to_place = String(toPlace).trim();
    if (updates.sortOrder !== undefined) valid.sort_order = updates.sortOrder;
    else if (updates.sort_order !== undefined) valid.sort_order = updates.sort_order;
    const { data, error } = await this.supabase
      .from('member_migrations')
      .update(valid)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('member_migrations').delete().eq('id', id);
    if (error) throw error;
    return { id };
  }
}
import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class MembersService {
  private getClient() {
    return getSupabaseClient();
  }

  private async getFamilyId(): Promise<string | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('families')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) throw new Error(`查询家族失败: ${error.message}`);
    return data && data.length > 0 ? data[0].id : null;
  }

  async getAllMembers() {
    const familyId = await this.getFamilyId();
    if (!familyId) return [];

    const client = this.getClient();
    const { data, error } = await client
      .from('members')
      .select('id, family_id, name, gender, birth_date, death_date, parent_id, spouse_name, generation, bio, is_alive, birth_place, created_at, updated_at')
      .eq('family_id', familyId)
      .order('generation', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(`查询成员失败: ${error.message}`);

    // 附加 parent_name
    const members = data || [];
    const memberMap = new Map(members.map((m) => [m.id, m]));
    return members.map((m) => ({
      ...m,
      parent_name: m.parent_id ? (memberMap.get(m.parent_id)?.name || null) : null,
    }));
  }

  async getMemberCount() {
    const familyId = await this.getFamilyId();
    if (!familyId) return 0;

    const client = this.getClient();
    const { count, error } = await client
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId);
    if (error) throw new Error(`统计成员失败: ${error.message}`);
    return count || 0;
  }

  async getTreeData() {
    const familyId = await this.getFamilyId();
    if (!familyId) return [];

    const client = this.getClient();
    const { data, error } = await client
      .from('members')
      .select('id, name, gender, generation, is_alive, birth_date, death_date, spouse_name, parent_id')
      .eq('family_id', familyId)
      .order('generation', { ascending: true });
    if (error) throw new Error(`查询族谱树失败: ${error.message}`);

    const members = data || [];
    // 构建树结构
    const memberMap = new Map<string, any>();
    const roots: any[] = [];

    // 第一遍：创建节点映射
    for (const m of members) {
      memberMap.set(m.id, { ...m, children: [] });
    }

    // 第二遍：建立父子关系
    for (const m of members) {
      const node = memberMap.get(m.id);
      if (m.parent_id && memberMap.has(m.parent_id)) {
        memberMap.get(m.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createMember(payload: {
    name: string;
    gender?: string;
    birth_date?: string | null;
    death_date?: string | null;
    parent_id?: string | null;
    spouse_name?: string | null;
    generation?: number;
    bio?: string | null;
    is_alive?: string;
    birth_place?: string | null;
  }) {
    const familyId = await this.getFamilyId();
    if (!familyId) throw new Error('请先创建家族信息');

    const client = this.getClient();
    const { data, error } = await client
      .from('members')
      .insert({ ...payload, family_id: familyId })
      .select()
      .single();
    if (error) throw new Error(`添加成员失败: ${error.message}`);
    return data;
  }

  async updateMember(id: string, payload: {
    name?: string;
    gender?: string;
    birth_date?: string | null;
    death_date?: string | null;
    parent_id?: string | null;
    spouse_name?: string | null;
    generation?: number;
    bio?: string | null;
    is_alive?: string;
    birth_place?: string | null;
  }) {
    const client = this.getClient();
    const { data, error } = await client
      .from('members')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`更新成员失败: ${error.message}`);
    return data;
  }

  async deleteMember(id: string) {
    const client = this.getClient();
    // 先将子代的 parent_id 置空
    const { error: updateError } = await client
      .from('members')
      .update({ parent_id: null })
      .eq('parent_id', id);
    if (updateError) throw new Error(`解除子代关联失败: ${updateError.message}`);

    const { error } = await client
      .from('members')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`删除成员失败: ${error.message}`);
    return { id };
  }
}

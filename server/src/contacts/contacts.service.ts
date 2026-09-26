import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

interface ContactRow {
  id: string;
  nickname: string | null;
  phone: string | null;
  residence: string | null;
  member_id: string | null;
  members?: {
    name: string | null;
    parent_name: string | null;
    generation: number | null;
    generation_title: string | null;
    birth_date: string | null;
    bio: string | null;
    burial_place: string | null;
  } | null;
}

interface ManualRow {
  id: string;
  name: string;
  phone: string | null;
  residence: string | null;
  generation: number | null;
  generation_title: string | null;
  bio: string | null;
}

export interface ContactItem {
  id: string;
  name: string;
  parentName: string;
  phone: string;
  residence: string;
  generation: number | null;
  generationTitle: string;
  bio: string;
  source: 'verified' | 'manual';
}

@Injectable()
export class ContactsService {
  private get supabase() {
    return getSupabaseClient();
  }

  private normalize(row: ContactRow): ContactItem {
    const m = row.members;
    return {
      id: row.id,
      name: m?.name || row.nickname || '宗亲',
      parentName: m?.parent_name || '',
      phone: row.phone || '',
      residence: row.residence || '',
      generation: m?.generation ?? null,
      generationTitle: m?.generation_title || '',
      bio: m?.bio || '',
      source: 'verified',
    };
  }

  private normalizeManual(row: ManualRow): ContactItem {
    return {
      id: row.id,
      name: row.name || '宗亲',
      parentName: '',
      phone: row.phone || '',
      residence: row.residence || '',
      generation: row.generation ?? null,
      generationTitle: row.generation_title || '',
      bio: row.bio || '',
      source: 'manual',
    };
  }

  /** 已完成宗亲认证（关联成员+手机号）的用户；两表无数据库外键，内存关联 */
  private async verifiedContacts(): Promise<ContactItem[]> {
    const [usersRes, membersRes] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, nickname, phone, residence, member_id')
        .not('member_id', 'is', null)
        .not('phone', 'is', null),
      this.supabase
        .from('members')
        .select('id, name, parent_id, generation, generation_title, birth_date, bio, burial_place, is_alive'),
    ]);
    if (usersRes.error) {
      console.error('查询通讯录失败:', usersRes.error.message);
      return [];
    }
    const memberRows = (membersRes.data || []) as any[];
    // 成员/配偶标记为非健在时，通讯录与附近宗亲隐藏（族谱后台仍保留）
    const livingMembers = memberRows.filter((m: any) => (m.is_alive ?? 'yes') === 'yes');
    const parentMap = new Map<string, string>(livingMembers.filter((m: any) => m.parent_id).map((m: any) => [m.id, m.name]));
    const memberMap = new Map<string, any>(livingMembers.map((m: any) => [m.id, m]));
    const rows: ContactRow[] = ((usersRes.data || []) as any[]).map((u) => {
      const m = u.member_id ? memberMap.get(u.member_id) : undefined;
      return {
        id: u.id,
        nickname: u.nickname,
        phone: u.phone,
        residence: u.residence,
        member_id: u.member_id,
        members: m
          ? {
              name: m.name,
              parent_name: parentMap.get(m.parent_id) || '',
              generation: m.generation,
              generation_title: m.generation_title,
              birth_date: m.birth_date,
              bio: m.bio,
              burial_place: m.burial_place,
            }
          : null,
      };
    });
    return rows.map((r) => this.normalize(r));
  }

  /** 手动维护的联系人 */
  private async manualContacts(): Promise<ContactItem[]> {
    const { data, error } = await this.supabase
      .from('kin_contacts')
      .select('id, name, phone, residence, generation, generation_title, bio')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('查询手动联系人失败:', error.message);
      return [];
    }
    return (data || []).map((r) => this.normalizeManual(r as ManualRow));
  }

  /** 通讯录：已认证宗亲 + 手动联系人，按世数排序 */
  async directory() {
    const [verified, manual] = await Promise.all([this.verifiedContacts(), this.manualContacts()]);
    const list = [...verified, ...manual].sort(
      (a, b) => (a.generation ?? 999) - (b.generation ?? 999),
    );
    return { code: 200, msg: 'success', data: { list } };
  }

  /** 附近宗亲：按居住地聚合（自动认证 + 手动），可按地区关键字过滤 */
  async nearby(keyword?: string) {
    const [verified, manual] = await Promise.all([this.verifiedContacts(), this.manualContacts()]);
    const kw = (keyword || '').trim();
    const list = [...verified, ...manual]
      .filter((c) => c.residence)
      .filter((c) => (kw ? c.residence.includes(kw) : true));

    const areaMap = new Map<string, { area: string; count: number; members: ContactItem[] }>();
    list.forEach((c) => {
      // 居住地取到市/区级前缀做聚合
      const area = (c.residence.split(/[·•,，\s\-]/)[0] || c.residence).trim();
      if (!areaMap.has(area)) areaMap.set(area, { area, count: 0, members: [] });
      const g = areaMap.get(area)!;
      g.count += 1;
      g.members.push(c);
    });
    const areas = Array.from(areaMap.values()).sort((a, b) => b.count - a.count);
    const flatList = areas.flatMap((a) => a.members);
    return { code: 200, msg: 'success', data: { areas, list: flatList, total: list.length } };
  }

  /** 新建手动联系人 */
  async create(body: {
    name?: string;
    phone?: string;
    residence?: string;
    generation?: number | null;
    generation_title?: string;
    bio?: string;
  }) {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('姓名不能为空');
    const { data, error } = await this.supabase
      .from('kin_contacts')
      .insert({
        name,
        phone: body.phone || null,
        residence: body.residence || null,
        generation: body.generation ?? null,
        generation_title: body.generation_title || null,
        bio: body.bio || null,
        source: 'manual',
      })
      .select('id, name, phone, residence, generation, generation_title, bio')
      .single();
    if (error) {
      console.error('新建联系人失败:', error.message);
      throw new BadRequestException('新建联系人失败');
    }
    return { code: 200, msg: 'success', data: this.normalizeManual(data as ManualRow) };
  }

  /** 修改手动联系人（仅手动条目可改） */
  async update(
    id: string,
    body: {
      name?: string;
      phone?: string;
      residence?: string;
      generation?: number | null;
      generation_title?: string;
      bio?: string;
    },
  ) {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('姓名不能为空');
    const { data, error } = await this.supabase
      .from('kin_contacts')
      .update({
        name,
        phone: body.phone || null,
        residence: body.residence || null,
        generation: body.generation ?? null,
        generation_title: body.generation_title || null,
        bio: body.bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, phone, residence, generation, generation_title, bio')
      .single();
    if (error) {
      console.error('修改联系人失败:', error.message);
      throw new BadRequestException('修改联系人失败');
    }
    if (!data) throw new NotFoundException('联系人不存在');
    return { code: 200, msg: 'success', data: this.normalizeManual(data as ManualRow) };
  }

  /** 删除手动联系人 */
  async remove(id: string) {
    const { error } = await this.supabase.from('kin_contacts').delete().eq('id', id);
    if (error) {
      console.error('删除联系人失败:', error.message);
      throw new BadRequestException('删除联系人失败');
    }
    return { code: 200, msg: 'success', data: true };
  }
}

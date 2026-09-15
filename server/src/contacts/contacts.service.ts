import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

interface ContactRow {
  id: string;
  nickname: string | null;
  phone: string | null;
  residence: string | null;
  member_id: string | null;
  members?: {
    name: string | null;
    generation: number | null;
    generation_title: string | null;
    birth_date: string | null;
    bio: string | null;
    burial_place: string | null;
  } | null;
}

@Injectable()
export class ContactsService {
  private get supabase() {
    return getSupabaseClient();
  }

  private normalize(row: ContactRow) {
    const m = row.members;
    return {
      id: row.id,
      name: m?.name || row.nickname || '宗亲',
      member_id: row.member_id,
      phone: row.phone || '',
      residence: row.residence || '',
      generation: m?.generation,
      generation_title: m?.generation_title || '',
      birth_date: m?.birth_date || '',
      bio: m?.bio || '',
      burial_place: m?.burial_place || '',
    };
  }

  /** 已完成宗亲认证（关联成员+手机号+居住地）的用户；两表无数据库外键，内存关联 */
  private async verifiedUsers(): Promise<ContactRow[]> {
    const [usersRes, membersRes] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, nickname, phone, residence, member_id')
        .not('member_id', 'is', null)
        .not('phone', 'is', null),
      this.supabase
        .from('members')
        .select('id, name, generation, generation_title, birth_date, bio, burial_place'),
    ]);
    if (usersRes.error) {
      console.error('查询通讯录失败:', usersRes.error.message);
      return [];
    }
    const memberMap = new Map<string, any>((membersRes.data || []).map((m: any) => [m.id, m]));
    return ((usersRes.data || []) as any[]).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      phone: u.phone,
      residence: u.residence,
      member_id: u.member_id,
      members: memberMap.get(u.member_id)
        ? {
            name: memberMap.get(u.member_id).name,
            generation: memberMap.get(u.member_id).generation,
            generation_title: memberMap.get(u.member_id).generation_title,
            birth_date: memberMap.get(u.member_id).birth_date,
            bio: memberMap.get(u.member_id).bio,
            burial_place: memberMap.get(u.member_id).burial_place,
          }
        : null,
    }));
  }

  /** 通讯录：全部已认证宗亲，按世数排序 */
  async directory() {
    const rows = await this.verifiedUsers();
    const list = rows
      .map((r) => this.normalize(r))
      .sort((a, b) => (a.generation || 0) - (b.generation || 0));
    return { code: 200, msg: 'success', data: list };
  }

  /** 附近宗亲：按居住地聚合统计 */
  async nearby(keyword?: string) {
    const rows = await this.verifiedUsers();
    const kw = (keyword || '').trim();
    const list = rows
      .map((r) => this.normalize(r))
      .filter((c) => c.residence)
      .filter((c) => (kw ? c.residence.includes(kw) : true));

    const areaMap = new Map<string, { area: string; count: number; members: ReturnType<ContactsService['normalize']>[] }>();
    list.forEach((c) => {
      // 居住地取到市/区级前缀做聚合
      const area = (c.residence.split(/[·•,，\-]/)[0] || c.residence).trim();
      if (!areaMap.has(area)) areaMap.set(area, { area, count: 0, members: [] });
      const g = areaMap.get(area)!;
      g.count += 1;
      g.members.push(c);
    });
    const areas = Array.from(areaMap.values()).sort((a, b) => b.count - a.count);
    return { code: 200, msg: 'success', data: { areas, total: list.length } };
  }
}

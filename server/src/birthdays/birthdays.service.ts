import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface MemberRow {
  id: string;
  name: string;
  courtesy_name: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_time: string | null;
  death_date: string | null;
  parent_id: string | null;
  generation: number | null;
  generation_title: string | null;
  is_alive: string | null;
}

@Injectable()
export class BirthdaysService {
  private get client() {
    return getSupabaseClient();
  }

  /**
   * 生日提醒：仅“本人及其四代直系健在亲属”。
   * 四代直系 = 上四代（父/祖父/曾祖/高祖）+ 下四代（子/孙/曾孙/玄孙）。
   * 仅从成员表提取，且亲属必须健在（is_alive=yes）。
   */
  async mine(userId: string) {
    // 1. 当前登录用户
    const { data: user, error: userErr } = await this.client
      .from('users')
      .select('id, member_id')
      .eq('id', userId)
      .single();
    if (userErr || !user) {
      return { code: 401, msg: '用户不存在', data: null };
    }
    if (!user.member_id) {
      return { code: 200, msg: '尚未关联宗亲成员，无法计算血缘亲属', data: { self: null, relatives: [] } };
    }

    // 2. 取全部成员（仅成员表）
    const { data: all, error } = await this.client
      .from('members')
      .select('id, name, courtesy_name, gender, birth_date, birth_time, death_date, parent_id, generation, generation_title, is_alive');
    if (error) return { code: 500, msg: '查询成员失败', data: null };
    const rows = (all || []) as MemberRow[];
    const byId = new Map(rows.map(r => [r.id, r]));
    const children = new Map<string, MemberRow[]>();
    rows.forEach(r => {
      if (r.parent_id) {
        const arr = children.get(r.parent_id) || [];
        arr.push(r);
        children.set(r.parent_id, arr);
      }
    });

    const self = byId.get(user.member_id) || null;

    // 3. 上四代（沿父链向上 4 层），且健在
    const ancestors: MemberRow[] = [];
    let cur = self?.parent_id || null;
    for (let i = 0; i < 4 && cur; i++) {
      const node = byId.get(cur);
      if (node && node.is_alive === 'yes') ancestors.push(node);
      cur = node?.parent_id || null;
    }

    // 4. 下四代（沿子代向下 4 层），且健在
    const descendants: MemberRow[] = [];
    let frontier = self ? (children.get(self.id) || []) : [];
    for (let level = 1; level <= 4; level++) {
      const next: MemberRow[] = [];
      frontier.forEach(n => {
        if (n.is_alive === 'yes') descendants.push(n);
        (children.get(n.id) || []).forEach(c => next.push(c));
      });
      frontier = next;
    }

    return {
      code: 200,
      msg: 'ok',
      data: {
        self: self ? this.toView(self, 0, '本人') : null,
        relatives: [
          ...ancestors.map((n, i) => this.toView(n, -(ancestors.indexOf(n) + 1), this.ancestorLabel(ancestors.indexOf(n), n.gender))),
          ...descendants.map(n => this.toView(n, this.descLevel(children, self!, n.id), this.descLabel(this.descLevel(children, self!, n.id), n.gender))),
        ],
      },
    };
  }

  private ancestorLabel(idx: number, gender?: string | null) {
    // idx 0=父母 1=祖父母 2=曾祖父母 3=高祖父母
    const sex = gender === 'female' ? '母' : '父';
    return ['父/母', '祖父/祖母', '曾祖父/曾祖母', '高祖父/高祖母'][idx] || sex;
  }

  private descLevel(children: Map<string, MemberRow[]>, self: MemberRow, targetId: string): number {
    // BFS 求层级
    let frontier = children.get(self.id) || [];
    for (let level = 1; level <= 4; level++) {
      if (frontier.some(n => n.id === targetId)) return level;
      const next: MemberRow[] = [];
      frontier.forEach(n => (children.get(n.id) || []).forEach(c => next.push(c)));
      frontier = next;
    }
    return 0;
  }

  private descLabel(level: number, gender?: string | null) {
    const sex = gender === 'female' ? '女' : '子';
    return ['子女', '孙/孙女', '曾孙/曾孙女', '玄孙/玄孙女'][level - 1] || sex;
  }

  private toView(m: MemberRow, level: number, relation: string) {
    return {
      id: m.id,
      name: m.name,
      courtesy_name: m.courtesy_name,
      gender: m.gender,
      birth_date: m.birth_date,
      birth_time: m.birth_time,
      generation: m.generation,
      generation_title: m.generation_title,
      is_alive: m.is_alive,
      level,
      relation,
    };
  }
}

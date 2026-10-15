import { Injectable, ForbiddenException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

interface DecodedUser {
  userId: string;
  role: string;
}

@Injectable()
export class CommentsService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  private async resolveProfile(userId: string) {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, nickname, member_id')
      .eq('id', userId)
      .maybeSingle();
    if (!user) return null;

    let member: any = null;
    if (user.member_id) {
      const { data: m } = await this.supabase
        .from('members')
        .select('id, name, generation, generation_title')
        .eq('id', user.member_id)
        .maybeSingle();
      member = m;
    }

    return {
      memberId: member?.id || user.member_id || null,
      memberName: member?.name || user.nickname || '宗亲',
      generationLabel:
        member?.generation != null
          ? `第${member.generation}代`
          : member?.generation_title || '',
    };
  }

  async findThread(targetType: string, targetId: string, viewer?: DecodedUser) {
    const { data, error } = await this.supabase
      .from('comments')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const isManager =
      !!viewer && ['super', 'admin'].includes(String(viewer.role).toLowerCase());

    const decorate = (c: any) => ({
      id: c.id,
      target_type: c.target_type,
      target_id: c.target_id,
      user_id: c.user_id,
      member_id: c.member_id,
      member_name: c.member_name,
      generation_label: c.generation_label,
      content: c.content,
      parent_id: c.parent_id,
      root_id: c.root_id,
      reply_to_name: c.reply_to_name,
      created_at: c.created_at,
      can_delete: isManager || (viewer ? c.user_id === viewer.userId : false),
    });

    const all = (data || []).map(decorate);
    const roots = all
      .filter((c) => !c.root_id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const repliesByRoot: Record<string, any[]> = {};
    all
      .filter((c) => c.root_id)
      .forEach((c) => {
        (repliesByRoot[c.root_id] = repliesByRoot[c.root_id] || []).push(c);
      });
    Object.values(repliesByRoot).forEach((arr) =>
      arr.sort((a, b) => (a.created_at > b.created_at ? 1 : -1)),
    );

    return roots.map((r) => ({ ...r, replies: repliesByRoot[r.id] || [] }));
  }

  async create(
    targetType: string,
    targetId: string,
    user: DecodedUser,
    content: string,
    parentId?: string,
  ) {
    const profile = await this.resolveProfile(user.userId);
    if (!profile) throw new Error('用户信息缺失');

    let rootId: string | null = null;
    let replyToName: string | null = null;

    if (parentId) {
      const { data: parent } = await this.supabase
        .from('comments')
        .select('id, root_id, member_name, target_id')
        .eq('id', parentId)
        .maybeSingle();
      if (!parent || parent.target_id !== targetId) {
        throw new ForbiddenException('回复的评论不存在');
      }
      rootId = parent.root_id || parent.id;
      replyToName = parent.member_name || null;
    }

    const row = {
      target_type: targetType,
      target_id: targetId,
      user_id: user.userId,
      member_id: profile.memberId,
      member_name: profile.memberName,
      generation_label: profile.generationLabel,
      content,
      parent_id: parentId || null,
      root_id: rootId,
      reply_to_name: replyToName,
    };

    const { data, error } = await this.supabase
      .from('comments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string, user: DecodedUser) {
    const { data: target } = await this.supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!target) throw new ForbiddenException('评论不存在');

    const isManager = ['super', 'admin'].includes(String(user.role).toLowerCase());
    if (!isManager && target.user_id !== user.userId) {
      throw new ForbiddenException('仅可删除本人发表的评论');
    }

    await this.supabase.from('comments').delete().eq('root_id', id);
    const { error } = await this.supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}

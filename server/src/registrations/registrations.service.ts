import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

interface DecodedUser {
  userId: string;
  role: string;
}

@Injectable()
export class RegistrationsService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.COZE_SUPABASE_URL!,
      process.env.COZE_SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /** 取活动（含发布人），用于判定发布者/管理员权限 */
  private async getActivity(activityId: string) {
    const { data } = await this.supabase
      .from('harmony_activities')
      .select('*')
      .eq('id', activityId)
      .maybeSingle();
    return data || null;
  }

  /** 解析报名用户的姓名 / 世系 / 成员ID / 手机号 / openid */
  private async resolveUserProfile(userId: string) {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, nickname, member_id, phone, openid')
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

    const memberName = member?.name || user.nickname || '宗亲';
    const generationLabel =
      member?.generation != null ? `第${member.generation}世` : member?.generation_title || '';

    return {
      memberId: member?.id || user.member_id || null,
      memberName,
      generationLabel,
      phone: user.phone || null,
      openid: user.openid || null,
    };
  }

  /** 当前用户对该活动的报名状态 */
  async getMyStatus(activityId: string, userId: string) {
    const { data } = await this.supabase
      .from('registrations')
      .select('id, created_at')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .maybeSingle();
    return data || null;
  }

  /**
   * 报名名单：
   *  - 普通宗亲：仅姓名 + 世系（隐藏手机号）。
   *  - 活动发布人 / 家族管理员（super/admin）：完整名单（含手机号）。
   */
  async findByActivity(activityId: string, viewer?: DecodedUser) {
    const { data, error } = await this.supabase
      .from('registrations')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const activity = await this.getActivity(activityId);
    const isManager =
      !!viewer &&
      (['super', 'admin'].includes(String(viewer.role).toLowerCase()) ||
        (activity?.user_id && activity.user_id === viewer.userId));

    return (data || []).map((r: any) => {
      const base = {
        id: r.id,
        activity_id: r.activity_id,
        user_id: r.user_id,
        member_name: r.member_name,
        generation_label: r.generation_label,
        created_at: r.created_at,
      };
      return isManager
        ? { ...base, member_id: r.member_id, phone: r.phone }
        : base;
    });
  }

  /** 报名：同一用户对同一活动仅一次（DB 唯一约束兜底） */
  async register(activityId: string, user: DecodedUser, note?: string) {
    const existed = await this.getMyStatus(activityId, user.userId);
    if (existed) return { duplicated: true, data: existed };

    const profile = await this.resolveUserProfile(user.userId);
    if (!profile) throw new Error('用户信息缺失，无法报名');

    const row = {
      activity_id: activityId,
      user_id: user.userId,
      member_id: profile.memberId,
      openid: profile.openid,
      member_name: profile.memberName,
      generation_label: profile.generationLabel,
      phone: profile.phone,
      note: note || null,
    };

    const { data, error } = await this.supabase
      .from('registrations')
      .insert(row)
      .select()
      .single();
    if (error) {
      // 并发下撞唯一约束
      if (String(error.message).includes('duplicate')) {
        const mine = await this.getMyStatus(activityId, user.userId);
        return { duplicated: true, data: mine };
      }
      throw error;
    }
    return { duplicated: false, data };
  }

  /** 取消报名：仅本人可取消自己的报名 */
  async cancel(activityId: string, user: DecodedUser) {
    const { error } = await this.supabase
      .from('registrations')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', user.userId);
    if (error) throw error;
    return true;
  }
}

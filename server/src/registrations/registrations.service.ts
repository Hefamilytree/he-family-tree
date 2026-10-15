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
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /** 鍙栨椿鍔紙鍚彂甯冧汉锛夛紝鐢ㄤ簬鍒ゅ畾鍙戝竷鑰?绠＄悊鍛樻潈闄?*/
  private async getActivity(activityId: string) {
    const { data } = await this.supabase
      .from('harmony_activities')
      .select('*')
      .eq('id', activityId)
      .maybeSingle();
    return data || null;
  }

  /** 瑙ｆ瀽鎶ュ悕鐢ㄦ埛鐨勫鍚?/ 涓栫郴 / 鎴愬憳ID / 鎵嬫満鍙?/ openid */
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

    const memberName = member?.name || user.nickname || '瀹椾翰';
    const generationLabel =
      member?.generation != null ? `第${member.generation}代` : member?.generation_title || '';

    return {
      memberId: member?.id || user.member_id || null,
      memberName,
      generationLabel,
      phone: user.phone || null,
      openid: user.openid || null,
    };
  }

  /** 褰撳墠鐢ㄦ埛瀵硅娲诲姩鐨勬姤鍚嶇姸鎬?*/
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
   * 鎶ュ悕鍚嶅崟锛?   *  - 鏅€氬畻浜诧細浠呭鍚?+ 涓栫郴锛堥殣钘忔墜鏈哄彿锛夈€?   *  - 娲诲姩鍙戝竷浜?/ 瀹舵棌绠＄悊鍛橈紙super/admin锛夛細瀹屾暣鍚嶅崟锛堝惈鎵嬫満鍙凤級銆?   */
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

  /** 鎶ュ悕锛氬悓涓€鐢ㄦ埛瀵瑰悓涓€娲诲姩浠呬竴娆★紙DB 鍞竴绾︽潫鍏滃簳锛?*/
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
      // 骞跺彂涓嬫挒鍞竴绾︽潫
      if (String(error.message).includes('duplicate')) {
        const mine = await this.getMyStatus(activityId, user.userId);
        return { duplicated: true, data: mine };
      }
      throw error;
    }
    return { duplicated: false, data };
  }

  /** 鍙栨秷鎶ュ悕锛氫粎鏈汉鍙彇娑堣嚜宸辩殑鎶ュ悕 */
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

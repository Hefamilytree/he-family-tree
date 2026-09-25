import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

@Injectable()
export class FamilyApplyService {
  private get supabase() {
    return getSupabaseClient();
  }

  async getDefaultFamily() {
    const { data } = await this.supabase
      .from('families')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1);
    return data?.[0]?.id || null;
  }

  /** 判断是否管理员（含主管理人员） */
  async isAdmin(userId: string): Promise<boolean> {
    const { data } = await this.supabase.from('users').select('role').eq('id', userId).single();
    return data?.role === 'admin' || data?.role === 'super';
  }

  /** 提交申请（需登录） */
  async apply(userId: string, body: any) {
    const { name, generation, generation_title, phone, residence, message } = body || {};
    if (!name || !name.trim()) {
      return { code: 400, msg: '请填写姓名', data: null };
    }
    if (!phone || !phone.trim()) {
      return { code: 400, msg: '请填写手机号码', data: null };
    }
    const familyId = (await this.getDefaultFamily()) || '';
    const { data, error } = await this.supabase.from('family_applications').insert({
      family_id: familyId,
      applicant_id: userId,
      name: name.trim(),
      generation: generation?.trim() || null,
      generation_title: generation_title?.trim() || null,
      phone: phone.trim(),
      residence: residence?.trim() || null,
      message: message?.trim() || null,
      status: 'pending',
    }).select().single();
    if (error) return { code: 500, msg: '提交申请失败', data: null };
    return { code: 200, msg: '申请已提交，请联系管理员授权', data };
  }

  /** 我的申请 */
  async mine(userId: string) {
    const { data, error } = await this.supabase
      .from('family_applications')
      .select('*')
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false });
    if (error) return { code: 500, msg: '查询失败', data: null };
    return { code: 200, msg: 'ok', data: data || [] };
  }

  /** 管理员收件箱 */
  async adminInbox(userId: string) {
    if (!(await this.isAdmin(userId))) return { code: 403, msg: '仅管理员可操作', data: null };
    const { data, error } = await this.supabase
      .from('family_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { code: 500, msg: '查询失败', data: null };
    return { code: 200, msg: 'ok', data: data || [] };
  }

  /** 批准（管理员）：创建对应成员并入族 */
  async approve(userId: string, id: string) {
    if (!(await this.isAdmin(userId))) return { code: 403, msg: '仅管理员可操作', data: null };
    const { data: app } = await this.supabase.from('family_applications').select('*').eq('id', id).single();
    if (!app) return { code: 404, msg: '申请不存在', data: null };
    if (app.status !== 'pending') return { code: 400, msg: '该申请已处理', data: null };

    // 创建成员并入族
    const familyId = app.family_id || (await this.getDefaultFamily());
    const memberRow: any = {
      family_id: familyId,
      name: app.name,
      is_alive: 'yes',
    };
    if (app.generation_title) memberRow.generation_title = app.generation_title;
    if (app.generation && parseInt(app.generation, 10)) memberRow.generation = parseInt(app.generation, 10);
    if (app.message) memberRow.bio = app.message;

    let memberId: string | null = null;
    if (familyId) {
      const ins = await this.supabase.from('members').insert(memberRow).select('id').single();
      if (!ins.error) memberId = ins.data?.id || null;
    }

    const { data, error } = await this.supabase
      .from('family_applications')
      .update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { code: 500, msg: '批准失败', data: null };

    // 申请人关联到新成员，并自动成为“认证宗亲”，由管理人员后续完善其宗亲信息
    if (memberId) {
      const up: any = { member_id: memberId, family_id: familyId, role: 'verified' };
      if (app.phone) up.phone = app.phone;
      if (app.residence) up.residence = app.residence;
      await this.supabase.from('users').update(up).eq('id', app.applicant_id);
    }
    return { code: 200, msg: '已批准加入家族，已成为认证宗亲', data };
  }

  /** 拒绝（管理员） */
  async reject(userId: string, id: string) {
    if (!(await this.isAdmin(userId))) return { code: 403, msg: '仅管理员可操作', data: null };
    const { data, error } = await this.supabase
      .from('family_applications')
      .update({ status: 'rejected', reviewed_by: userId, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { code: 500, msg: '操作失败', data: null };
    return { code: 200, msg: '已拒绝', data };
  }
}
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class HarmonyService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async findFamilyId() {
    const { data } = await this.supabase
      .from('families')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0].id : null;
  }

  async findByCategory(category: string) {
    const { data, error } = await this.supabase
      .from('harmony_activities')
      .select('*')
      .eq('category', category)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('harmony_activities')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  }

  async create(item: any) {
    const { data, error } = await this.supabase
      .from('harmony_activities')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, item: any) {
    const { data, error } = await this.supabase
      .from('harmony_activities')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('harmony_activities')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
}

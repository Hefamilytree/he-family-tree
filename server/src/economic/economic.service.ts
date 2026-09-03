import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class EconomicService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.COZE_SUPABASE_URL!,
      process.env.COZE_SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async findByCategory(category: string) {
    const { data, error } = await this.supabase
      .from('economic_development')
      .select('*')
      .eq('category', category)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('economic_development')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  }

  async create(item: any) {
    const { data, error } = await this.supabase
      .from('economic_development')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, item: any) {
    const { data, error } = await this.supabase
      .from('economic_development')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('economic_development')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
}

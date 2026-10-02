import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { S3Storage } from 'coze-coding-dev-sdk';

@Injectable()
export class EconomicService {
  private supabase;
  private storage: S3Storage;

  constructor() {
    this.supabase = createClient(
      process.env.COZE_SUPABASE_URL!,
      process.env.COZE_SUPABASE_SERVICE_ROLE_KEY!
    );
    this.storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  // 为 product 分类的图片 key 生成可访问的签名 URL
  private async attachImageUrls(items: any[]): Promise<any[]> {
    if (!items || items.length === 0) return items;
    const result: any[] = [];
    for (const item of items) {
      const row = { ...item };
      if (item.category === 'product' && item.image_url) {
        try {
          row.image_url = await this.storage.generatePresignedUrl({
            key: item.image_url,
            expireTime: 86400, // 1 天
          });
        } catch {
          row.image_url = '';
        }
      }
      result.push(row);
    }
    return result;
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
      .from('economic_development')
      .select('*')
      .eq('category', category)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return this.attachImageUrls(data);
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('economic_development')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return this.attachImageUrls(data);
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

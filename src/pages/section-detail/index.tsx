import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Calendar, MapPin, Phone } from 'lucide-react-taro';
import { Network } from '@/network';

interface ContentItem {
  id: string;
  title: string;
  content: string | null;
  event_date?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  sort_order?: number;
}

const SECTION_API_MAP: Record<string, string> = {
  cultural: '/api/cultural',
  harmony: '/api/harmony',
  economic: '/api/economic',
};

export default function SectionDetail() {
  const router = useRouter();
  const section = router.params.section || '';
  const category = router.params.category || '';
  const title = decodeURIComponent(router.params.title || '');

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = SECTION_API_MAP[section] || '';

  const loadData = async () => {
    if (!apiUrl) return;
    setLoading(true);
    try {
      const res = await Network.request({ url: `${apiUrl}/category/${category}` });
      console.log('板块数据:', res.data);
      setItems(res.data?.data || []);
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [category]);

  const handleAdd = () => {
    Taro.navigateTo({
      url: `/pages/section-edit/index?section=${section}&category=${category}&title=${encodeURIComponent(title)}`
    });
  };

  const handleEdit = (item: ContentItem) => {
    Taro.navigateTo({
      url: `/pages/section-edit/index?section=${section}&category=${category}&title=${encodeURIComponent(title)}&id=${item.id}`
    });
  };

  const handleDelete = async (id: string) => {
    const result = await Taro.showModal({ title: '确认删除', content: '确定要删除这条记录吗？' });
    if (!result.confirm) return;
    try {
      await Network.request({ url: `${apiUrl}/${id}`, method: 'DELETE' });
      Taro.showToast({ title: '删除成功', icon: 'success' });
      loadData();
    } catch (e) {
      Taro.showToast({ title: '删除失败', icon: 'error' });
    }
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 标题栏 */}
      <View className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Text className="text-xl font-bold" style={{ color: '#8B2500' }}>{title}</Text>
        <Button size="sm" onClick={handleAdd}>
          <Text className="text-sm">添加</Text>
        </Button>
      </View>

      {/* 内容列表 */}
      <View className="px-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </View>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Text className="block text-gray-400 text-base">暂无内容，点击右上角添加</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="space-y-3">
            {items.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <View className="flex items-start justify-between mb-2">
                    <Text className="text-base font-bold flex-1" style={{ color: '#333' }}>{item.title}</Text>
                    <View className="flex gap-2 ml-2">
                      <View onClick={() => handleEdit(item)} className="p-1">
                        <Pencil size={16} color="#8B2500" />
                      </View>
                      <View onClick={() => handleDelete(item.id)} className="p-1">
                        <Trash2 size={16} color="#999" />
                      </View>
                    </View>
                  </View>
                  {item.content && (
                    <Text className="block text-sm mb-2" style={{ color: '#666' }}>{item.content}</Text>
                  )}
                  <View className="flex flex-wrap gap-3">
                    {item.event_date && (
                      <View className="flex items-center gap-1">
                        <Calendar size={12} color="#999" />
                        <Text className="text-xs" style={{ color: '#999' }}>{item.event_date}</Text>
                      </View>
                    )}
                    {item.location && (
                      <View className="flex items-center gap-1">
                        <MapPin size={12} color="#999" />
                        <Text className="text-xs" style={{ color: '#999' }}>{item.location}</Text>
                      </View>
                    )}
                    {item.contact_name && (
                      <View className="flex items-center gap-1">
                        <Phone size={12} color="#999" />
                        <Text className="text-xs" style={{ color: '#999' }}>{item.contact_name} {item.contact_phone}</Text>
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

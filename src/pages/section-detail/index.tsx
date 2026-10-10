import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Calendar, MapPin, Phone, PhoneCall } from 'lucide-react-taro';
import { Network } from '@/network';
import { getAuthUser, canEditUnit, canOperateItem, type AuthUser } from '@/utils/permission';
import ActivityInteraction from '@/components/activity-interaction';

// 支持一键报名 + 评论的 7 个孝亲睦族活动单元
const INTERACTIVE_CATEGORIES = [
  'activity',
  'ancestor_worship',
  'coming_of_age',
  'talent',
  'elderly_care',
  'education',
  'relief',
];

interface ContentItem {
  id: string;
  title: string;
  content: string | null;
  event_date?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  note?: string | null;
  image_url?: string | null;
  sort_order?: number;
  created_by?: string | null;
  user_id?: string | null;
}

const SECTION_API_MAP: Record<string, string> = {
  cultural: '/api/cultural',
  harmony: '/api/harmony',
  economic: '/api/economic',
};

// 经济板块各分类的字段标签配置
const ECONOMIC_FIELD_CONFIG: Record<string, { titleLabel: string; contentLabel: string; showContent: boolean; showNote: boolean; showContact: boolean }> = {
  contact: { titleLabel: '家族字辈', contentLabel: '备注', showContent: true, showNote: false, showContact: true },
  relative: { titleLabel: '家族字辈', contentLabel: '现住址', showContent: true, showNote: true, showContact: true },
  entrepreneur: { titleLabel: '单位名称', contentLabel: '经营范围', showContent: true, showNote: false, showContact: true },
  product: { titleLabel: '产品名称', contentLabel: '产品详情', showContent: true, showNote: false, showContact: false },
};

export default function SectionDetail() {
  const router = useRouter();
  const section = router.params.section || '';
  const category = router.params.category || '';
  const title = decodeURIComponent(router.params.title || '');

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const authUser: AuthUser | null = getAuthUser();

  // 单元（category）级权限
  const canAdd = canEditUnit(authUser, category);
  const canEditItem = (ownerId?: string | null) =>
    canAdd && canOperateItem(authUser, ownerId);

  const apiUrl = SECTION_API_MAP[section] || '';
  const authHeader = () => {
    const token = Taro.getStorageSync('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const isEconomic = section === 'economic';
  const isInteractive =
    section === 'harmony' && INTERACTIVE_CATEGORIES.includes(category);
  const econConfig = ECONOMIC_FIELD_CONFIG[category] || { titleLabel: '标题', contentLabel: '内容', showContent: true, showNote: false, showContact: false };

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

  // 保存/删除返回本页或从首页进入时都重新拉取，确保新增内容立即显示
  useDidShow(() => { loadData(); });

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
      await Network.request({ url: `${apiUrl}/${id}`, method: 'DELETE', header: authHeader() });
      Taro.showToast({ title: '删除成功', icon: 'success' });
      loadData();
    } catch (e) {
      Taro.showToast({ title: '删除失败', icon: 'error' });
    }
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Taro.makePhoneCall({ phoneNumber: phone }).catch(() => {});
  };

  // 渲染内容主体（经济板块内容标签动态化）
  const renderMainBody = (item: ContentItem) => {
    if (isEconomic) {
      return (
        <>
          {/* 联系人信息（通讯录/附近宗亲/企业家圈） */}
          {econConfig.showContact && (
            (item.contact_name || item.contact_phone) ? (
              <View className="mb-2 flex items-center justify-between bg-[#F7F1E8] rounded-lg px-3 py-2">
                <View className="flex items-center gap-1">
                  <Text className="text-sm" style={{ color: '#6B5B4F' }}>
                    {item.contact_name || ''}{item.contact_name && item.contact_phone ? ' ' : ''}{item.contact_phone || ''}
                  </Text>
                </View>
                {item.contact_phone && (
                  <View
                    onClick={() => handleCall(item.contact_phone)}
                    className="flex items-center gap-1"
                    style={{ backgroundColor: '#8B2500', borderRadius: '16px', padding: '4px 10px' }}
                  >
                    <PhoneCall size={12} color="#FFFDF7" />
                    <Text className="text-xs" style={{ color: '#FFFDF7' }}>打电话</Text>
                  </View>
                )}
              </View>
            ) : null
          )}

          {/* 内容下调至最后（现住址/经营范围/产品详情） */}
          {econConfig.showContent && item.content && (
            <View className="mb-2">
              <Text className="block text-xs mb-1" style={{ color: '#999' }}>{econConfig.contentLabel}</Text>
              <Text className="block text-sm" style={{ color: '#666' }}>{item.content}</Text>
            </View>
          )}

          {/* 附近宗亲：个人备注 */}
          {econConfig.showNote && item.note && (
            <View className="mb-2">
              <Text className="block text-xs mb-1" style={{ color: '#999' }}>个人备注</Text>
              <Text className="block text-sm" style={{ color: '#666' }}>{item.note}</Text>
            </View>
          )}
        </>
      );
    }
    return (
      <>
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
      </>
    );
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 标题栏 */}
      <View className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Text className="text-xl font-bold" style={{ color: '#8B2500' }}>{title}</Text>
        {canAdd && (
          <Button size="sm" onClick={handleAdd}>
            <Text className="text-sm">添加</Text>
          </Button>
        )}
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
              <Text className="block text-gray-400 text-base">暂无内容{canAdd ? '，点击右上角添加' : ''}</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="space-y-3">
            {items.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <View className="flex items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="block text-xs mb-1" style={{ color: '#999' }}>
                        {isEconomic ? econConfig.titleLabel : ''}
                      </Text>
                      <Text className="text-base font-bold" style={{ color: '#333' }}>{item.title}</Text>
                    </View>
                    {canEditItem(item.created_by || item.user_id) && (
                      <View className="flex gap-2 ml-2">
                        <View onClick={() => handleEdit(item)} className="p-1">
                          <Pencil size={16} color="#8B2500" />
                        </View>
                        <View onClick={() => handleDelete(item.id)} className="p-1">
                          <Trash2 size={16} color="#999" />
                        </View>
                      </View>
                    )}
                  </View>
                  {renderMainBody(item)}
                  {isInteractive && (
                    <ActivityInteraction activityId={item.id} />
                  )}
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
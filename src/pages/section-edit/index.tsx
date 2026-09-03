import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Network } from '@/network';

const SECTION_API_MAP: Record<string, string> = {
  cultural: '/api/cultural',
  harmony: '/api/harmony',
  economic: '/api/economic',
};

export default function SectionEdit() {
  const router = useRouter();
  const section = router.params.section || '';
  const category = router.params.category || '';
  const editId = router.params.id || '';
  const title = decodeURIComponent(router.params.title || '');

  const [formTitle, setFormTitle] = useState('');
  const [content, setContent] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const apiUrl = SECTION_API_MAP[section] || '';

  useEffect(() => {
    if (editId) {
      loadItem();
    }
  }, [editId]);

  const loadItem = async () => {
    try {
      const res = await Network.request({ url: apiUrl });
      const list = res.data?.data || [];
      const item = list.find((i: any) => i.id === editId);
      if (item) {
        setFormTitle(item.title || '');
        setContent(item.content || '');
        setEventDate(item.event_date || '');
        setLocation(item.location || '');
        setContactName(item.contact_name || '');
        setContactPhone(item.contact_phone || '');
      }
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      const familyRes = await Network.request({ url: '/api/family' });
      const familyId = familyRes.data?.data?.[0]?.id;
      if (!familyId) {
        Taro.showToast({ title: '请先创建家族', icon: 'none' });
        return;
      }

      const data: any = {
        family_id: familyId,
        category,
        title: formTitle,
        content: content || null,
        sort_order: 1,
      };
      if (section === 'harmony') {
        data.event_date = eventDate || null;
        data.location = location || null;
      }
      if (section === 'economic') {
        data.contact_name = contactName || null;
        data.contact_phone = contactPhone || null;
      }

      if (editId) {
        await Network.request({ url: `${apiUrl}/${editId}`, method: 'PUT', data });
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await Network.request({ url: apiUrl, method: 'POST', data });
        Taro.showToast({ title: '添加成功', icon: 'success' });
      }
      setTimeout(() => Taro.navigateBack(), 1000);
    } catch (e) {
      console.error('保存失败:', e);
      Taro.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] p-4 pb-20">
      <Card>
        <CardContent className="p-4">
          <Text className="block text-lg font-bold mb-4" style={{ color: '#8B2500' }}>
            {editId ? '编辑' : '添加'} - {title}
          </Text>

          {/* 标题 */}
          <View className="mb-4">
            <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>标题</Text>
            <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
              <Input
                className="w-full bg-transparent"
                placeholder="请输入标题"
                value={formTitle}
                onInput={(e) => setFormTitle(e.detail.value)}
              />
            </View>
          </View>

          {/* 内容 */}
          <View className="mb-4">
            <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>内容</Text>
            <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
              <Textarea
                className="w-full bg-transparent"
                placeholder="请输入详细内容..."
                value={content}
                onInput={(e) => setContent(e.detail.value)}
                maxlength={2000}
                style={{ minHeight: '120px' }}
              />
            </View>
          </View>

          {/* 活动相关字段 */}
          {section === 'harmony' && (
            <>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>活动日期</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input
                    className="w-full bg-transparent"
                    placeholder="如：2024-04-04"
                    value={eventDate}
                    onInput={(e) => setEventDate(e.detail.value)}
                  />
                </View>
              </View>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>活动地点</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入地点"
                    value={location}
                    onInput={(e) => setLocation(e.detail.value)}
                  />
                </View>
              </View>
            </>
          )}

          {/* 经济相关字段 */}
          {section === 'economic' && (
            <>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>联系人</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入联系人姓名"
                    value={contactName}
                    onInput={(e) => setContactName(e.detail.value)}
                  />
                </View>
              </View>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>联系电话</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入联系电话"
                    value={contactPhone}
                    onInput={(e) => setContactPhone(e.detail.value)}
                  />
                </View>
              </View>
            </>
          )}

          <Button
            className="w-full mt-4"
            style={{ backgroundColor: '#8B2500', color: '#FFFDF7' }}
            onClick={handleSave}
            disabled={saving}
          >
            <Text>{saving ? '保存中...' : '保存'}</Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}

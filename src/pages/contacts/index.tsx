import React, { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Phone, MapPin, TreePine, Users, Plus, Pencil, Trash2, UserPlus } from 'lucide-react-taro';
import { Network } from '@/network';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface KinItem {
  id: string;
  name: string;
  generation?: number | null;
  generationTitle?: string;
  phone?: string;
  residence?: string;
  bio?: string;
  source?: 'verified' | 'manual';
}

interface ContactForm {
  name: string;
  generationTitle: string;
  generation: string;
  phone: string;
  residence: string;
  bio: string;
}

const emptyForm: ContactForm = {
  name: '', generationTitle: '', generation: '', phone: '', residence: '', bio: '',
};

const ContactsPage: React.FC = () => {
  const router = useRouter();
  const mode = (router.params.mode === 'nearby' ? 'nearby' : 'directory');
  const isNearby = mode === 'nearby';
  const title = isNearby ? '附近宗亲' : '通讯录';

  const [items, setItems] = useState<KinItem[]>([]);
  const [groups, setGroups] = useState<{ label: string; list: KinItem[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Network.request({
        url: `/api/contacts/${isNearby ? 'nearby' : 'directory'}`,
      });
      console.log('[contacts]', res.data);
      const list: KinItem[] = res.data?.data?.list || [];
      setItems(list);

      if (isNearby) {
        const map = new Map<string, KinItem[]>();
        list.forEach((k) => {
          const region = (k.residence || '其他地区').split(/[·•,，\s\-]/)[0] || '其他地区';
          if (!map.has(region)) map.set(region, []);
          map.get(region)!.push(k);
        });
        setGroups(Array.from(map.entries()).map(([label, l]) => ({ label, list: l })));
      }
    } catch (e) {
      console.error('加载宗亲数据失败', e);
    } finally {
      setLoading(false);
    }
  }, [isNearby]);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title });
    load();
  }, [load, title]);

  const handleCall = (phone?: string) => {
    if (!phone) {
      Taro.showToast({ title: '暂无联系电话', icon: 'none' });
      return;
    }
    Taro.makePhoneCall({ phoneNumber: phone });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (k: KinItem) => {
    setEditingId(k.id);
    setForm({
      name: k.name || '',
      generationTitle: k.generationTitle || '',
      generation: k.generation != null ? String(k.generation) : '',
      phone: k.phone || '',
      residence: k.residence || '',
      bio: k.bio || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    const gen = form.generation.trim();
    const payload = {
      name: form.name.trim(),
      generation_title: form.generationTitle.trim(),
      generation: gen ? Number(gen) : null,
      phone: form.phone.trim(),
      residence: form.residence.trim(),
      bio: form.bio.trim(),
    };
    setSaving(true);
    try {
      const url = editingId ? `/api/contacts/${editingId}` : '/api/contacts';
      await Network.request({
        url,
        method: editingId ? 'PUT' : 'POST',
        data: payload,
      });
      Taro.showToast({ title: editingId ? '已修改' : '已添加', icon: 'success' });
      setDialogOpen(false);
      load();
    } catch (e) {
      console.error('保存联系人失败', e);
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (k: KinItem) => {
    Taro.showModal({
      title: '删除联系人',
      content: `确定删除「${k.name}」吗？`,
      confirmColor: '#8B2500',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await Network.request({ url: `/api/contacts/${k.id}`, method: 'DELETE' });
          Taro.showToast({ title: '已删除', icon: 'success' });
          load();
        } catch (e) {
          console.error('删除联系人失败', e);
          Taro.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  };

  const renderCard = (k: KinItem) => {
    const isManual = k.source === 'manual';
    return (
      <Card key={`${k.source}-${k.id}`} className="overflow-hidden">
        <CardContent className="p-4">
          <View className="flex items-start justify-between">
            <View className="flex-1">
              <View className="flex items-center gap-2 flex-wrap">
                <Text className="block text-base font-bold text-stone-800">{k.name}</Text>
                {k.generationTitle ? (
                  <View className="px-2 py-1 rounded bg-red-800 bg-opacity-10">
                    <Text className="text-xs text-red-800">{k.generationTitle}字辈</Text>
                  </View>
                ) : null}
                {k.generation ? (
                  <Text className="block text-xs text-stone-400">第{k.generation}世</Text>
                ) : null}
                {isManual ? (
                  <View className="px-2 py-1 rounded bg-stone-200">
                    <Text className="text-xs text-stone-500">手动</Text>
                  </View>
                ) : (
                  <View className="px-2 py-1 rounded bg-green-800 bg-opacity-10">
                    <Text className="text-xs text-green-800">已认证</Text>
                  </View>
                )}
              </View>
              {k.residence ? (
                <View className="flex items-center gap-1 mt-2">
                  <MapPin size={13} color="#8B2500" />
                  <Text className="block text-sm text-stone-600">{k.residence}</Text>
                </View>
              ) : null}
              {k.phone ? (
                <View className="flex items-center gap-1 mt-1">
                  <Phone size={13} color="#8B2500" />
                  <Text className="block text-sm text-stone-600">{k.phone}</Text>
                </View>
              ) : null}
              {k.bio ? (
                <Text className="block text-xs text-stone-400 mt-2 line-clamp-2">{k.bio}</Text>
              ) : null}
            </View>
            <View className="ml-2 flex flex-col items-end gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCall(k.phone)}>
                <Text>拨打</Text>
              </Button>
              {isManual ? (
                <View className="flex flex-row gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(k)}>
                    <Pencil size={15} color="#8B2500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(k)}>
                    <Trash2 size={15} color="#B91C1C" />
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <View className="min-h-full pb-16" style={{ backgroundColor: '#FAF8F5' }}>
      {/* 标题栏 */}
      <View className="px-4 pt-4 pb-2 flex items-center justify-between">
        <View className="flex items-center gap-2">
          {isNearby ? <Users size={18} color="#8B2500" /> : <TreePine size={18} color="#8B2500" />}
          <Text className="text-lg font-bold" style={{ color: '#8B2500' }}>{title}</Text>
        </View>
        <Button size="sm" className="bg-red-800 text-white" onClick={openCreate}>
          <View className="flex flex-row items-center gap-1">
            <Plus size={15} color="#FFFDF7" />
            <Text className="text-white text-sm">添加</Text>
          </View>
        </Button>
      </View>
      <View className="px-4 pb-3">
        <Text className="block text-xs text-stone-500">
          {isNearby
            ? '按现居住地自动归组；可手动添加附近宗亲。'
            : '自动汇总已完成宗亲认证的族人，也可在本页手动添加与修改联系人。'}
        </Text>
      </View>

      <View className="px-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </View>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <View className="flex justify-center mb-3">
                <UserPlus size={36} color="#A8A29E" />
              </View>
              <Text className="block text-stone-500 text-sm mb-4">
                暂无宗亲，可点击右上角「添加」手动建立，族人完成认证后也会自动出现在这里。
              </Text>
              <Button className="bg-red-800 text-white" onClick={openCreate}>
                <Text>立即添加</Text>
              </Button>
            </CardContent>
          </Card>
        ) : isNearby ? (
          groups.map((g) => (
            <View key={g.label} className="mb-5">
              <View className="flex items-center gap-2 mb-2 mt-1">
                <MapPin size={15} color="#8B2500" />
                <Text className="block text-sm font-semibold text-stone-700">
                  {g.label}
                  <Text className="text-stone-400">（{g.list.length}位）</Text>
                </Text>
              </View>
              <View className="space-y-3">{g.list.map(renderCard)}</View>
            </View>
          ))
        ) : (
          <View className="space-y-3">{items.map(renderCard)}</View>
        )}
      </View>

      {/* 新增 / 编辑 联系人弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-11/12 max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{editingId ? '修改联系人' : '添加联系人'}</DialogTitle>
          </DialogHeader>
          <View className="space-y-3 py-1">
            <View>
              <Text className="block text-sm text-stone-600 mb-1">姓名 *</Text>
              <View className="bg-stone-50 rounded-xl px-3 py-2">
                <Input
                  className="w-full bg-transparent"
                  placeholder="请输入姓名"
                  value={form.name}
                  onInput={(e: any) => setForm({ ...form, name: e.detail.value })}
                />
              </View>
            </View>
            <View className="flex flex-row gap-3">
              <View className="flex-1">
                <Text className="block text-sm text-stone-600 mb-1">字辈</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="如：景"
                    value={form.generationTitle}
                    onInput={(e: any) => setForm({ ...form, generationTitle: e.detail.value })}
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="block text-sm text-stone-600 mb-1">世数</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2">
                  <Input
                    className="w-full bg-transparent"
                    type="number"
                    placeholder="如：12"
                    value={form.generation}
                    onInput={(e: any) => setForm({ ...form, generation: e.detail.value })}
                  />
                </View>
              </View>
            </View>
            <View>
              <Text className="block text-sm text-stone-600 mb-1">手机号码</Text>
              <View className="bg-stone-50 rounded-xl px-3 py-2">
                <Input
                  className="w-full bg-transparent"
                  type="number"
                  maxlength={11}
                  placeholder="11 位手机号"
                  value={form.phone}
                  onInput={(e: any) => setForm({ ...form, phone: e.detail.value })}
                />
              </View>
            </View>
            <View>
              <Text className="block text-sm text-stone-600 mb-1">现居住地</Text>
              <View className="bg-stone-50 rounded-xl px-3 py-2">
                <Input
                  className="w-full bg-transparent"
                  placeholder="如：广东深圳·南山区"
                  value={form.residence}
                  onInput={(e: any) => setForm({ ...form, residence: e.detail.value })}
                />
              </View>
            </View>
            <View>
              <Text className="block text-sm text-stone-600 mb-1">简介</Text>
              <View className="bg-stone-50 rounded-2xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '70px', backgroundColor: 'transparent' }}
                  placeholder="选填，简要备注"
                  value={form.bio}
                  onInput={(e: any) => setForm({ ...form, bio: e.detail.value })}
                />
              </View>
            </View>
          </View>
          <DialogFooter>
            <View className="flex flex-row gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                <Text>取消</Text>
              </Button>
              <Button
                className="flex-1 bg-red-800 text-white"
                disabled={saving}
                onClick={handleSave}
              >
                <Text>{saving ? '保存中...' : '保存'}</Text>
              </Button>
            </View>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default ContactsPage;

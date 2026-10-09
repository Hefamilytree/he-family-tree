import { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Network } from '@/network';
import { ImagePlus } from 'lucide-react-taro';
import { getAuthUser } from '@/utils/permission';

const SECTION_API_MAP: Record<string, string> = {
  cultural: '/api/cultural',
  harmony: '/api/harmony',
  economic: '/api/economic',
};

const ECONOMIC_FIELD_CONFIG: Record<string, { titleLabel: string; contentLabel: string }> = {
  contact: { titleLabel: '成员姓名', contentLabel: '备注' },
  relative: { titleLabel: '成员姓名', contentLabel: '现住址' },
  entrepreneur: { titleLabel: '单位名称', contentLabel: '经营范围' },
  product: { titleLabel: '产品名称', contentLabel: '产品详情' },
};

const CULTURAL_LABEL: Record<string, string> = {
  family_style: '家风',
  family_instruction: '家训',
  honor: '家族字辈',
  merit: '家史',
  migration: '迁徙轨迹',
  family_history: '家族事记',
  person_history: '前言',
  afterword: '后记',
  editorial_note: '编写说明',
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
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const apiUrl = SECTION_API_MAP[section] || '';
  const isCultural = section === 'cultural';
  const isHarmony = section === 'harmony';
  const isEconomic = section === 'economic' || section === 'other';
  const econConfig = ECONOMIC_FIELD_CONFIG[category] || { titleLabel: '标题', contentLabel: '内容' };

  const authHeader = () => {
    const token = Taro.getStorageSync('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (editId) {
      loadItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadItem = async () => {
    try {
      const res : any = await Network.request({ url: `${apiUrl}?id=${editId}` });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      if (list.length > 0) {
        const it = list[0];
        setFormTitle(it.title || '');
        setContent(it.content || '');
        setEventDate(it.event_date || '');
        setLocation(it.location || '');
        setContactName(it.contact_name || '');
        setContactPhone(it.contact_phone || '');
        setAddress(it.address || '');
        setNote(it.note || '');
        setImageKey(it.image_url || '');
        if (typeof it.image_url === 'string' && it.image_url.indexOf('http') === 0) setImagePreview(it.image_url);
      }
    } catch (e) {
      console.error('[section-edit] 加载失败:', e);
    }
  };

  const handleChooseImage = async () => {
    try {
      const res : any = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] });
      const filePath = res.tempFilePaths[0];
      setImagePreview(filePath);
      const uploadRes : any = await Network.uploadFile({ url: '/api/upload', filePath, name: 'file' });
      console.log('[section-edit] 上传响应:', uploadRes.statusCode, uploadRes.data);
      const key = uploadRes.data?.data?.imageKey || uploadRes.data?.data?.fileKey || '';
      if (key) {
        setImageKey(key);
        Taro.showToast({ title: '图片已上传', icon: 'success' });
      }
    } catch (e) {
      console.error('[section-edit] 上传失败:', e);
      setImageKey('');
      setImagePreview('');
      Taro.showToast({ title: '图片上传失败', icon: 'none' });
    }
  };

  /** 权限：文化传承需管理员(3)，孝亲/经济需认证宗亲(2) */
  const canSave = (): boolean => {
    const role = (getAuthUser()?.role || '').toLowerCase();
    const lv = role === 'super' ? 4 : role === 'admin' ? 3 : role === 'verified' ? 2 : role === 'member' ? 1 : 0;
    const need = isCultural ? 3 : 2;
    console.log('[section-edit] 保存前 当前角色:', role, '| 所需等级:', need, '| 判定:', lv >= need);
    return lv >= need;
  };

  const handleSave = async () => {
    console.log('[section-edit] ===== 点击保存 =====', { section, category, editId });
    // 1. 登录态
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    // 2. 权限（实时解析 token，不读缓存）
    if (!canSave()) {
      Taro.showToast({ title: '该板块需要管理员权限', icon: 'none', duration: 2000 });
      return;
    }
    // 3. 字段非空
    if (isCultural && !content.trim()) {
      Taro.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    if (!isCultural && !formTitle.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      // 4. 取家族（失败落到后端兜底）
      let familyId = '';
      try {
        const familyRes : any = await Network.request({ url: '/api/family' });
        const fd = familyRes.data?.data;
        familyId = Array.isArray(fd) ? (fd[0]?.id || '') : (fd?.id || '');
      } catch (e) {
        console.warn('[section-edit] 查询家族失败，交给后端兜底:', e);
      }

      const data : any = {
        category,
        title: isCultural ? (CULTURAL_LABEL[category] || title || category) : formTitle,
        content: content || null,
        sort_order: 1,
      };
      if (familyId) data.family_id = familyId;
      if (isHarmony) {
        if (eventDate) data.event_date = eventDate;
        if (location) data.location = location;
      }
      if (isEconomic) {
        if (contactName) data.contact_name = contactName;
        if (contactPhone) data.contact_phone = contactPhone;
        if (address) data.address = address;
        if (note) data.note = note;
        if (imageKey) data.image_url = imageKey;
      }

      console.log('[section-edit] 提交数据:', JSON.stringify(data));
      const res : any = editId
        ? await Network.request({ url: `${apiUrl}/${editId}`, method: 'PUT', data, header: authHeader() })
        : await Network.request({ url: apiUrl, method: 'POST', data, header: authHeader() });
      console.log('[section-edit] 保存响应 status:', res.statusCode, '| body:', res.data);

      // 5. 严格校验后端响应：任何非200或业务code非200都视为失败
      const ok = res.statusCode === 200 && res.data && (res.data.code === undefined || res.data.code === 200);
      if (!ok) {
        const msg = res.data?.message || res.data?.msg || '保存未成功';
        Taro.showToast({ title: msg, icon: 'none', duration: 2500 });
        console.error('[section-edit] 保存失败响应:', res.statusCode, res.data);
        return;
      }
      Taro.showToast({ title: editId ? '更新成功' : '添加成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (e) {
      console.error('[section-edit] 保存抛异常:', e);
      Taro.showToast({ title: '网络异常，保存失败', icon: 'none' });
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

          {!isCultural && (
            <View className="mb-4">
              <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                {econConfig.titleLabel}
              </Text>
              <Input
                className="bg-[#FFFDF7]"
                placeholder={`请输入${econConfig.titleLabel}`}
                value={formTitle}
                onInput={(e) => setFormTitle(e.detail.value)}
              />
            </View>
          )}

          {isHarmony && (
            <>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                  活动日期
                </Text>
                <Input
                  className="bg-[#FFFDF7]"
                  placeholder="如：2024-04-04"
                  value={eventDate}
                  onInput={(e) => setEventDate(e.detail.value)}
                />
              </View>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                  活动地点
                </Text>
                <Input
                  className="bg-[#FFFDF7]"
                  placeholder="请输入地点"
                  value={location}
                  onInput={(e) => setLocation(e.detail.value)}
                />
              </View>
            </>
          )}

          <View className="mb-4">
            <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
              {isCultural ? '内容' : econConfig.contentLabel}
            </Text>
            <Textarea
              className="bg-[#FFFDF7] min-h-[120px]"
              placeholder="请输入详细内容..."
              value={content}
              onInput={(e) => setContent(e.detail.value)}
              maxlength={2000}
            />
          </View>

          {isEconomic && (category === 'contact' || category === 'relative' || category === 'entrepreneur') && (
            <>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                  联系人
                </Text>
                <Input
                  className="bg-[#FFFDF7]"
                  placeholder="请输入联系人姓名"
                  value={contactName}
                  onInput={(e) => setContactName(e.detail.value)}
                />
              </View>
              <View className="mb-4">
                <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                  联系电话
                </Text>
                <Input
                  className="bg-[#FFFDF7]"
                  placeholder="请输入联系电话"
                  value={contactPhone}
                  onInput={(e) => setContactPhone(e.detail.value)}
                />
              </View>
            </>
          )}

          {isEconomic && category === 'relative' && (
            <View className="mb-4">
              <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                个人备注
              </Text>
              <Textarea
                className="bg-[#FFFDF7] min-h-[60px]"
                placeholder="请输入个人备注信息"
                value={note}
                onInput={(e) => setNote(e.detail.value)}
                maxlength={500}
              />
            </View>
          )}

          {isEconomic && category === 'product' && (
            <View className="mb-4">
              <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                产品图片
              </Text>
              <View
                className="bg-[#FFFDF7] rounded-lg border border-dashed items-center justify-center py-8"
                style={{ borderColor: '#D8CEC5' }}
                onClick={handleChooseImage}
              >
                {imagePreview ? (
                  <Image src={imagePreview} className="w-full h-40" mode="aspectFit" />
                ) : (
                  <View className="items-center">
                    <ImagePlus size={32} color="#A89A8B" />
                    <Text className="block text-sm text-center mt-2" style={{ color: '#A89A8B' }}>
                      点击上传产品图片
                    </Text>
                  </View>
                )}
              </View>
            </View>
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
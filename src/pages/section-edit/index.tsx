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

// 经济板块各分类的字段标签配置
const ECONOMIC_FIELD_CONFIG: Record<string, { titleLabel: string; contentLabel: string; showContent: boolean; showNote: boolean; showImage: boolean }> = {
  contact: { titleLabel: '家族字辈', contentLabel: '备注', showContent: true, showNote: false, showImage: false },
  relative: { titleLabel: '家族字辈', contentLabel: '现住址', showContent: true, showNote: true, showImage: false },
  entrepreneur: { titleLabel: '单位名称', contentLabel: '经营范围', showContent: true, showNote: false, showImage: false },
  product: { titleLabel: '产品名称', contentLabel: '产品详情', showContent: true, showNote: false, showImage: true },
};

// 文化传承分类标签（板块只保留内容，标题以分类标签占位）
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
  const isEconomic = section === 'economic';
  const econConfig = ECONOMIC_FIELD_CONFIG[category] || { titleLabel: '标题', contentLabel: '内容', showContent: true, showNote: false, showImage: false };

  // 统一携带登录凭证（后端写操作强制校验 token）
  const authHeader = () => {
    const token = Taro.getStorageSync('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 经济板块：标题承载主标识（字辈/单位名称），内容承载副标识（现住址/经营范围）
  const showTitleLabel = isEconomic ? econConfig.titleLabel : '标题';
  const showContentLabel = isEconomic ? econConfig.contentLabel : '内容';

  useEffect(() => {
    if (editId) {
      loadItem();
    }
  }, [editId]);

  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] });
      const filePath = res.tempFilePaths[0];
      setImagePreview(filePath);
      const uploadRes: any = await Network.uploadFile({
        url: '/api/upload',
        filePath,
        name: 'file',
      });
      console.log('上传响应:', uploadRes.data);
      const key = uploadRes.data?.data?.imageKey || uploadRes.data?.data?.fileKey || '';
      if (key) {
        setImageKey(key);
        Taro.showToast({ title: '图片已上传', icon: 'success' });
      }
    } catch (e) {
      console.error('上传失败:', e);
      setImageKey('');
      setImagePreview('');
      Taro.showToast({ title: '图片上传失败', icon: 'none' });
    }
  };

  const loadItem = async () => {
    try {
      const res = await Network.request({ url: `${apiUrl}?id=${editId}` });
      const list = res.data?.data || [];
      if (list.length > 0) {
        const item = list[0];
        setFormTitle(item.title || '');
        setContent(item.content || '');
        setEventDate(item.event_date || '');
        setLocation(item.location || '');
        setContactName(item.contact_name || '');
        setContactPhone(item.contact_phone || '');
        setAddress(item.address || '');
        setNote(item.note || '');
        setImageKey(item.image_url || '');
      }
    } catch (e) {
      console.error('加载失败:', e);
    }
  };

  const handleSave = async () => {
    const isCultural = section === 'cultural';
    const showOnlyContent = isCultural;

    // 权限校验：统一实时解析 JWT token 中的角色，绝不读取本地缓存 role 做判断
    const tokenUser = getAuthUser();
    const cachedRole = (Taro.getStorageSync('userInfo') || {}).role;
    const tokenRole = tokenUser?.role;
    console.log('[section-edit] 点击保存 -> token角色:', tokenRole, '| 本地缓存role:', cachedRole);
    if (!tokenUser || !tokenRole) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const needLevel = isCultural ? 3 : section === 'harmony' ? 2 : 2;
    const ROLE_LEVEL: Record<string, number> = { guest: 0, member: 1, verified: 2, admin: 3, super: 4 };
    if ((ROLE_LEVEL[tokenRole] ?? 0) < needLevel) {
      Taro.showToast({ title: '无编辑权限', icon: 'none' });
      return;
    }

    if (!showOnlyContent && !formTitle.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (showOnlyContent && !content.trim()) {
      Taro.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      const familyRes = await Network.request({ url: '/api/family', header: authHeader() });
      const familyPayload = familyRes.data?.data;
      const familyId = Array.isArray(familyPayload) ? familyPayload[0]?.id : familyPayload?.id;
      if (!familyId) {
        Taro.showToast({ title: '请先创建家族', icon: 'none' });
        return;
      }

      const data: any = {
        family_id: familyId,
        category,
        title: showOnlyContent ? (CULTURAL_LABEL[category] || title || category) : formTitle,
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
        data.address = address || null;
        data.note = note || null;
        if (category === 'product') {
          data.image_url = imageKey || null;
        }
      }

      if (editId) {
        await Network.request({ url: `${apiUrl}/${editId}`, method: 'PUT', data, header: authHeader() });
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await Network.request({ url: apiUrl, method: 'POST', data, header: authHeader() });
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

          {/* 标题（经济板块按分类动态命名；文化传承只保留内容、不设标题） */}
          {section !== 'cultural' && (
          <View className="mb-4">
            <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>{showTitleLabel}</Text>
            <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
              <Input
                className="w-full bg-transparent"
                placeholder={`请输入${showTitleLabel}`}
                value={formTitle}
                onInput={(e) => setFormTitle(e.detail.value)}
              />
            </View>
          </View>
          )}

          {/* 活动相关字段（活动日期/地点 优先于内容，在和谐板块） */}
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

          {/* 内容（默认显示；经济板块下调至最后，标签按分类动态命名） */}
          {section !== 'economic' && (
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
          )}

          {/* 经济相关字段（联系人/电话等） */}
          {section === 'economic' && (
            <>
              {(category === 'contact' || category === 'relative' || category === 'entrepreneur') && (
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

              {/* content 下调至最后一项 */}
              {econConfig.showContent && (
                <View className="mb-4">
                  <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>{showContentLabel}</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
                    <Textarea
                      className="w-full bg-transparent"
                      placeholder={`请输入${showContentLabel}`}
                      value={content}
                      onInput={(e) => setContent(e.detail.value)}
                      maxlength={2000}
                      style={{ minHeight: '80px' }}
                    />
                  </View>
                </View>
              )}

              {/* 附近宗亲：个人备注 */}
              {econConfig.showNote && (
                <View className="mb-4">
                  <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>个人备注</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-3 border" style={{ borderColor: '#E8E0D8' }}>
                    <Textarea
                      className="w-full bg-transparent"
                      placeholder="请输入个人备注信息"
                      value={note}
                      onInput={(e) => setNote(e.detail.value)}
                      maxlength={500}
                      style={{ minHeight: '60px' }}
                    />
                  </View>
                </View>
              )}

              {/* 产品展示：图片上传 */}
              {econConfig.showImage && (
                <View className="mb-4">
                  <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>产品图片</Text>
                  <View
                    className="bg-[#FFFDF7] rounded-lg border border-dashed items-center justify-center py-8"
                    style={{ borderColor: '#D8CEC5' }}
                    onClick={handleChooseImage}
                  >
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        className="w-full h-40"
                        mode="aspectFit"
                      />
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
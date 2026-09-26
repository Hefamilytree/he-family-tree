import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { User, Heart, LogIn, LogOut, Shield, UserPlus, Trash2, House, HandHeart, Check, X, Send } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AddressPicker from '@/components/address-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Network } from '@/network';
import { isAdmin, isSuper } from '@/utils/permission';

const roleLabel = (role?: string) => {
  const r = (role || '').toLowerCase();
  if (r === 'super') return '主管理人员';
  if (r === 'admin') return '管理人员';
  if (r === 'verified') return '认证宗亲';
  if (r === 'member') return '未认证宗亲';
  return '游客';
};

const statusText = (status?: string) => {
  switch (status) {
    case 'approved':
      return '已通过';
    case 'rejected':
      return '已驳回';
    default:
      return '待审核';
  }
};

const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 完善宗亲信息（关联宗亲树人员）
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkKeyword, setLinkKeyword] = useState('');
  const [linkPhone, setLinkPhone] = useState('');
  const [linkResidence, setLinkResidence] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [linkGenerationTitle, setLinkGenerationTitle] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberOptions, setMemberOptions] = useState<any[]>([]);
  const [memberOptionsLoaded, setMemberOptionsLoaded] = useState(false);

  // 创建家族
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [familyExists, setFamilyExists] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    surname: '',
    family_name: '',
    hall_name: '',
    motto: '',
    origin: '',
    description: '',
  });

  // 申请加入家族
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyForm, setApplyForm] = useState({
    name: '',
    generation: '',
    generation_title: '',
    phone: '',
    residence: '',
    address: { country: '中国', province: '', city: '', district: '', street: '', text: '' } as { country?: string; province?: string; city?: string; district?: string; street?: string; text?: string },
    message: '',
  });
  const [myApps, setMyApps] = useState<any[]>([]);

  // 管理员：入册审核
  const [showAdminInbox, setShowAdminInbox] = useState(false);
  const [adminApps, setAdminApps] = useState<any[]>([]);
  const [reviewingId, setReviewingId] = useState('');

  useLoad(() => {
    console.log('ProfilePage loaded');
  });

  useDidShow(() => {
    // 每次显示页面时检查登录状态
    const token = Taro.getStorageSync('token');
    const user = Taro.getStorageSync('userInfo');
    if (token && user) {
      setUserInfo(user);
      setIsLoggedIn(true);
    } else {
      setUserInfo(null);
      setIsLoggedIn(false);
    }
    // 查询是否已有家族：已有则隐藏「创建家族」入口
    Network.request({ url: '/api/family' })
      .then((res: any) => {
        setFamilyExists(!!res?.data?.data);
      })
      .catch(() => setFamilyExists(false));
  });

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token');
          Taro.removeStorageSync('userInfo');
          setUserInfo(null);
          setIsLoggedIn(false);
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      },
    });
  };

  const handleAbout = () => {
    Taro.showModal({
      title: '关于族谱修缮',
      content: '家族族谱修缮工具 v1.0\n\n帮助您记录家族血脉、传承家族文化。\n\n功能说明：\n- 族谱世系图展示\n- 家族成员管理\n- 家族信息编辑\n- 成员关系维护',
      showCancel: false,
      confirmText: '知道了',
    });
  };

  const handleOpenLink = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setLinkKeyword('');
    setLinkPhone(userInfo?.phone || '');
    setLinkResidence(userInfo?.residence || '');
    setSelectedMember(null);
    setLinkGenerationTitle('');
    setAllMembers([]);
    setMemberOptions([]);
    setMemberOptionsLoaded(false);
    setShowLinkDialog(true);
  };

  const handleSearchMembers = async (keyword: string) => {
    setLinkKeyword(keyword);
    setMemberOptionsLoaded(true);
    try {
      const token = Taro.getStorageSync('token');
      let list = allMembers;
      if (!list || list.length === 0) {
        const res = await Network.request({
          url: '/api/members',
          method: 'GET',
          header: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('关联宗亲-成员列表:', res.data);
        list = (res.data?.data || []) as any[];
        setAllMembers(list);
      }
      const kw = keyword.trim();
      setMemberOptions(
        kw ? list.filter((m: any) => (m.name || '').includes(kw)) : list
      );
    } catch (error) {
      console.error('获取成员列表失败:', error);
      setMemberOptions([]);
    }
  };

  const handleLinkMember = async () => {
    if (!userInfo?.id || !selectedMember?.id) return;
    if (!linkGenerationTitle.trim()) {
      Taro.showToast({ title: '请选择字辈', icon: 'none' });
      return;
    }
    const phone = linkPhone.trim();
    if (!phone) {
      Taro.showToast({ title: '请填写手机号码', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }
    const residence = linkResidence.trim();
    if (!residence) {
      Taro.showToast({ title: '请填写现居住地', icon: 'none' });
      return;
    }
    setLinking(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/link-member',
        method: 'POST',
        data: {
          userId: userInfo.id,
          memberId: selectedMember.id,
          name: selectedMember.name,
          phone,
          residence,
          generationTitle: linkGenerationTitle.trim(),
        },
        header: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log('关联宗亲响应:', res.data);
      if (res.data?.code === 200) {
        const updated = {
          ...userInfo,
          member_id: selectedMember.id,
          member_name: selectedMember.name,
          phone,
          residence,
          generation_title: res.data?.data?.generation_title || linkGenerationTitle.trim(),
        };
        setUserInfo(updated);
        Taro.setStorageSync('userInfo', updated);
        setShowLinkDialog(false);
        Taro.showToast({ title: '认证成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.data?.msg || '关联失败', icon: 'none' });
      }
    } catch (error) {
      console.error('关联宗亲失败:', error);
      Taro.showToast({ title: '网络错误，关联失败', icon: 'none' });
    } finally {
      setLinking(false);
    }
  };

  const handleClearData = () => {
    if (!isLoggedIn || userInfo?.role !== 'admin') {
      Taro.showToast({ title: '仅主管理员可操作', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '清除全部数据',
      content: '将删除所有家族信息、成员、配偶、家规、活动及产业等全部数据，且不可恢复。确定继续吗？',
      confirmColor: '#c53030',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const token = Taro.getStorageSync('token');
          const apiRes = await Network.request({
            url: '/api/auth/clear-data',
            method: 'POST',
            header: { Authorization: `Bearer ${token}` },
          });
          console.log('清除数据响应:', apiRes.data);
          if (apiRes.data?.code === 200) {
            Taro.showToast({ title: '已清除全部数据', icon: 'success' });
          } else {
            Taro.showToast({ title: apiRes.data?.msg || '清除失败', icon: 'none' });
          }
        } catch (error) {
          console.error('清除数据失败:', error);
          Taro.showToast({ title: '网络错误，清除失败', icon: 'none' });
        }
      },
    });
  };

  const handleSetAdmin = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '设置管理员',
      content: '确定要将当前用户设置为管理员吗？管理员可以编辑所有家族信息。',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const token = Taro.getStorageSync('token');
            const apiRes = await Network.request({
              url: '/api/auth/set-admin',
              method: 'POST',
              data: { userId: userInfo.id },
              header: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (apiRes.data.code === 200) {
              // 更新本地用户信息
              const updatedUser = { ...userInfo, role: 'admin' };
              Taro.setStorageSync('userInfo', updatedUser);
              setUserInfo(updatedUser);
              Taro.showToast({ title: '已设置为管理员', icon: 'success' });
            } else {
              Taro.showToast({ title: apiRes.data.msg || '设置失败', icon: 'none' });
            }
          } catch (error) {
            console.error('Set admin error:', error);
            Taro.showToast({ title: '网络错误', icon: 'none' });
          }
        }
      },
    });
  };

  const handleOpenCreateFamily = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setFamilyForm({ surname: '', family_name: '', hall_name: '', motto: '', origin: '', description: '' });
    setShowFamilyDialog(true);
  };

  const handleCreateFamily = async () => {
    if (!familyForm.surname.trim()) {
      Taro.showToast({ title: '请填写姓氏', icon: 'none' });
      return;
    }
    if (!familyForm.family_name.trim()) {
      Taro.showToast({ title: '请填写家族名称', icon: 'none' });
      return;
    }
    setCreatingFamily(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/family',
        method: 'POST',
        data: {
          surname: familyForm.surname.trim(),
          family_name: familyForm.family_name.trim(),
          hall_name: familyForm.hall_name.trim() || null,
          motto: familyForm.motto.trim() || null,
          origin: familyForm.origin.trim() || null,
          description: familyForm.description.trim() || null,
        },
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('创建家族响应:', res.data);
      if (res.data.code === 200) {
        Taro.showToast({ title: '家族创建成功', icon: 'success' });
        setShowFamilyDialog(false);
        setFamilyExists(true);
      } else {
        Taro.showToast({ title: res.data.msg || '创建失败', icon: 'none' });
      }
    } catch (err) {
      console.error('创建家族失败:', err);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleOpenApply = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setApplyForm({
      name: userInfo?.nickname || userInfo?.username || '',
      generation: '',
      generation_title: '',
      phone: userInfo?.phone || '',
      residence: userInfo?.residence || '',
      address: { country: '中国', province: '', city: '', district: '', street: '', text: '' },
      message: '',
    });
    loadMyApps();
    setShowApplyDialog(true);
  };

  const loadMyApps = async () => {
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/family-apply/mine',
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
      });
      setMyApps(res.data?.data || []);
    } catch (e) {
      console.error('加载申请失败:', e);
    }
  };

  const handleSubmitApply = async () => {
    if (!applyForm.name.trim()) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(applyForm.phone.trim())) {
      Taro.showToast({ title: '请填写正确的手机号码', icon: 'none' });
      return;
    }
    setSubmittingApply(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/family-apply',
        method: 'POST',
        data: {
          name: applyForm.name.trim(),
          generation: applyForm.generation.trim() || null,
          generation_title: applyForm.generation_title.trim() || null,
          phone: applyForm.phone.trim(),
          residence: (applyForm.address.text || applyForm.residence).trim() || null,
          message: applyForm.message.trim() || null,
        },
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('提交申请响应:', res.data);
      Taro.showToast({ title: res.data.msg || '申请已提交', icon: res.data.code === 200 ? 'success' : 'none' });
      if (res.data.code === 200) {
        await loadMyApps();
      }
    } catch (e) {
      console.error('提交申请失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setSubmittingApply(false);
    }
  };

  const loadAdminInbox = async () => {
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/family-apply/admin',
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.code === 200) {
        setAdminApps(res.data.data || []);
        setShowAdminInbox(true);
      } else {
        Taro.showToast({ title: res.data?.msg || '无权查看', icon: 'none' });
      }
    } catch (e) {
      console.error('加载审核列表失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setReviewingId(id);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: `/api/family-apply/${id}/${action}`,
        method: 'PUT',
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('审核响应:', res.data);
      Taro.showToast({ title: res.data.msg || '操作完成', icon: res.data.code === 200 ? 'success' : 'none' });
      if (res.data.code === 200) await loadAdminInbox();
    } catch (e) {
      console.error('审核失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setReviewingId('');
    }
  };

  return (
    <View className="min-h-screen bg-amber-50">
      {/* 用户信息区域 */}
      <View className="bg-gradient-to-b from-amber-700 to-amber-800 px-4 py-8">
        {isLoggedIn ? (
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <User size={32} color="#8B2500" />
            </View>
            <View className="flex-1">
              <Text className="block text-xl font-bold text-white">
                {userInfo?.nickname || userInfo?.username}
              </Text>
              <View className="flex items-center gap-2 mt-1">
                <Text className="text-sm text-amber-100">
                  {userInfo?.username}
                </Text>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: isAdmin(userInfo) ? '#B45309' : '#D97706' }}>
                  <Text className="text-xs text-white">{roleLabel(userInfo?.role)}</Text>
                </View>
              </View>
            </View>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-white text-white"
              onClick={handleLogout}
            >
              <LogOut size={16} color="#FFF" />
              <Text className="ml-1 text-sm">退出</Text>
            </Button>
          </View>
        ) : (
          <View className="text-center">
            <View className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <User size={32} color="#8B2500" />
            </View>
            <Text className="block text-lg text-amber-100 mb-4">
              未登录
            </Text>
            <Button
              className="bg-white text-amber-700"
              onClick={handleLogin}
            >
              <LogIn size={16} color="#8B2500" />
              <Text className="ml-2">登录 / 注册</Text>
            </Button>
          </View>
        )}
      </View>

      {/* 功能菜单 */}
      <View className="px-4 py-6 space-y-4">
        {/* 创建家族：仅在尚无家族时展示，家族创建成功后对所有成员隐藏 */}
        {isLoggedIn && !familyExists && (
          <Card
            className="bg-amber-100 border-amber-300 active:opacity-80"
            onClick={handleOpenCreateFamily}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center">
                <House size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  创建家族
                </Text>
                <Text className="block text-sm text-stone-500">
                  建立姓氏堂号与家族档案，开始修缮族谱
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 管理员功能：清除全部数据 */}
        {isLoggedIn && userInfo?.role === 'super' && (
          <Card
            className="bg-red-100 border-red-300 active:opacity-80"
            onClick={handleClearData}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center">
                <Trash2 size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-red-900">
                  清除全部数据
                </Text>
                <Text className="block text-sm text-red-500">
                  一键清除所有家族信息、成员、配偶及板块数据（仅主管理人员）
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 管理员功能：仅主管理人员可设置管理人员 */}
        {isLoggedIn && isSuper(userInfo) && (
          <Card
            className="bg-amber-100 border-amber-300 active:opacity-80"
            onClick={handleSetAdmin}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                <Shield size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  管理人员设置
                </Text>
                <Text className="block text-sm text-stone-500">
                  仅主管理人员可设置管理人员，其它人无权设置
                </Text>
              </View>
            </CardContent>
          </Card>
        )}


        <Card
          className="bg-red-900 border-red-800 text-white active:opacity-80"
          onClick={handleOpenLink}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <UserPlus size={20} color="#FFD9C8" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-white">
                完善宗亲信息
              </Text>
              <Text className="block text-sm text-red-100">
                {userInfo?.member_name
                  ? `已关联：${userInfo.member_name}（点击重新关联）`
                  : '登录后关联宗亲树人员，完善您的族谱身份'}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card
          className="bg-amber-50 border-stone-200 active:opacity-80"
          onClick={handleOpenApply}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center">
              <HandHeart size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                申请加入家族
              </Text>
              <Text className="block text-sm text-stone-500">
                填写信息提交申请，联系管理员审核授权归宗
              </Text>
            </View>
          </CardContent>
        </Card>

        {isLoggedIn && isAdmin(userInfo) && (
          <Card
            className="bg-amber-100 border-amber-300 active:opacity-80"
            onClick={loadAdminInbox}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                <Shield size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  家族入册审核
                </Text>
                <Text className="block text-sm text-stone-500">
                  处理族人入族申请，授权身份
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        <Card
          className="bg-amber-50 border-stone-200 active:opacity-80"
          onClick={handleAbout}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-stone-600 flex items-center justify-center">
              <Heart size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                关于应用
              </Text>
              <Text className="block text-sm text-stone-500">
                了解族谱修缮工具
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 底部说明 */}
      <View className="px-4 py-8 text-center">
        <Text className="block text-xs text-stone-400">
          何氏族谱修缮工具 v1.0
        </Text>
        <Text className="block text-xs text-stone-400 mt-1">
          传承家族文化 · 记录血脉亲情
        </Text>
      </View>

      {/* 完善宗亲信息 / 关联宗亲弹窗 */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-bold text-stone-800">完善宗亲信息</Text>
            </DialogTitle>
          </DialogHeader>

          <View className="space-y-3 mt-2">
            <Text className="block text-sm text-stone-500">
              {selectedMember
                ? '已选择您在宗亲树中的身份，请补全字辈、手机号码和现居住地，完成宗亲认证后将自动加入通讯录与附近宗亲。'
                : '第一步：搜索姓名关键字，在宗亲树中选择您本人。'}
            </Text>

            {!selectedMember ? (
              <>
                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">您的姓名 / 关键字</Text></Label>
                  <Input
                    className="bg-stone-50"
                    placeholder="输入姓名或关键字搜索"
                    value={linkKeyword}
                    onInput={(e) => handleSearchMembers(e.detail.value)}
                  />
                </View>
                <View className="max-h-80 overflow-y-auto space-y-2">
                  {memberOptionsLoaded && memberOptions.length === 0 ? (
                    <Text className="block text-sm text-stone-400 text-center py-4">
                      未找到匹配的宗亲，请检查姓名或联系管理员录入。
                    </Text>
                  ) : (
                    memberOptions.map((m: any) => (
                      <View
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <View>
                          <Text className="block text-sm font-semibold text-stone-800">
                            {m.name || m.username || '未署名'}
                          </Text>
                          <Text className="block text-xs text-stone-500 mt-1">
                            {m.generation_title || (m.generation ? `第${m.generation}世` : '')}
                            {m.birth_date || m.death_date ? ` · ${m.birth_date || ''}${m.birth_date && m.death_date ? '-' : ''}${m.death_date || ''}` : ''}
                          </Text>
                        </View>
                        <Button
                          size="sm"
                          className="bg-amber-700 text-white"
                          onClick={() => { setSelectedMember(m); if (m.generation_title) setLinkGenerationTitle(m.generation_title); }}
                        >
                          <Text>选择</Text>
                        </Button>
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : (
              <>
                <View className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between">
                  <View>
                    <Text className="block text-sm font-semibold text-stone-800">
                      {selectedMember.name || selectedMember.username || '未署名'}
                    </Text>
                    <Text className="block text-xs text-stone-500 mt-1">
                      {selectedMember.generation_title || (selectedMember.generation ? `第${selectedMember.generation}世` : '')}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedMember(null); setLinkGenerationTitle(''); }}
                  >
                    <Text>重选</Text>
                  </Button>
                </View>

                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">字辈（必填）</Text></Label>
                  <Input
                    className="bg-stone-50"
                    placeholder="请输入您的字辈，如：景"
                    value={linkGenerationTitle}
                    onInput={(e) => setLinkGenerationTitle(e.detail.value)}
                  />
                </View>

                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">手机号码（必填）</Text></Label>
                  <Input
                    className="bg-stone-50"
                    type="number"
                    placeholder="请输入手机号码"
                    value={linkPhone}
                    onInput={(e) => setLinkPhone(e.detail.value)}
                  />
                </View>

                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">现居住地（必填）</Text></Label>
                  <Input
                    className="bg-stone-50"
                    placeholder="如：广东省深圳市·南山区"
                    value={linkResidence}
                    onInput={(e) => setLinkResidence(e.detail.value)}
                  />
                </View>
              </>
            )}
          </View>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              <Text>关闭</Text>
            </Button>
            {selectedMember && (
              <Button
                className="bg-red-800 text-white"
                disabled={linking}
                onClick={() => handleLinkMember()}
              >
                <Text>{linking ? '提交中...' : '完成宗亲认证'}</Text>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建家族弹窗 */}
      <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-bold text-stone-800">创建家族</Text>
            </DialogTitle>
          </DialogHeader>

          <View className="space-y-3 mt-2 max-h-96 overflow-y-auto">
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">姓氏（必填）</Text></Label>
              <Input
                className="bg-stone-50"
                placeholder="如：何"
                value={familyForm.surname}
                onInput={(e) => setFamilyForm({ ...familyForm, surname: e.detail.value })}
              />
            </View>
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">家族名称（必填）</Text></Label>
              <Input
                className="bg-stone-50"
                placeholder="如：庐江何氏家族"
                value={familyForm.family_name}
                onInput={(e) => setFamilyForm({ ...familyForm, family_name: e.detail.value })}
              />
            </View>
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">堂号</Text></Label>
              <Input
                className="bg-stone-50"
                placeholder="如：庐江堂"
                value={familyForm.hall_name}
                onInput={(e) => setFamilyForm({ ...familyForm, hall_name: e.detail.value })}
              />
            </View>
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">祖训 / 族训</Text></Label>
              <Textarea
                className="bg-stone-50"
                placeholder="如：忠孝传家，耕读继世"
                value={familyForm.motto}
                onInput={(e) => setFamilyForm({ ...familyForm, motto: e.detail.value })}
              />
            </View>
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">家族起源</Text></Label>
              <Textarea
                className="bg-stone-50"
                placeholder="简述家族起源与迁徙"
                value={familyForm.origin}
                onInput={(e) => setFamilyForm({ ...familyForm, origin: e.detail.value })}
              />
            </View>
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">家族简介</Text></Label>
              <Textarea
                className="bg-stone-50"
                placeholder="家族概况说明"
                value={familyForm.description}
                onInput={(e) => setFamilyForm({ ...familyForm, description: e.detail.value })}
              />
            </View>
          </View>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowFamilyDialog(false)}>
              <Text>取消</Text>
            </Button>
            <Button
              className="bg-red-800 text-white"
              disabled={creatingFamily}
              onClick={handleCreateFamily}
            >
              <Text>{creatingFamily ? '创建中...' : '创建'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 申请加入家族 */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandHeart size={20} color="#134E4A" />
              <Text>申请加入家族</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block">
                填写族人信息提交申请，由家族管理员审核通过后即可归宗授权。
              </Text>
            </DialogDescription>
          </DialogHeader>

          <View className="flex flex-col gap-3">
            <View className="flex flex-col gap-1">
              <Label>姓名 *</Label>
              <View className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                <Input
                  className="w-full"
                  value={applyForm.name}
                  placeholder="您的姓名"
                  onInput={(e) => setApplyForm({ ...applyForm, name: e.detail.value })}
                />
              </View>
            </View>

            <View className="flex flex-row gap-3">
              <View className="flex-1 flex flex-col gap-1">
                <Label>字辈</Label>
                <View className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                  <Input
                    className="w-full"
                    value={applyForm.generation}
                    placeholder="所属字辈"
                    onInput={(e) => setApplyForm({ ...applyForm, generation: e.detail.value })}
                  />
                </View>
              </View>
              <View className="flex-1 flex flex-col gap-1">
                <Label>世代称谓</Label>
                <View className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                  <Input
                    className="w-full"
                    value={applyForm.generation_title}
                    placeholder="如：第18世"
                    onInput={(e) => setApplyForm({ ...applyForm, generation_title: e.detail.value })}
                  />
                </View>
              </View>
            </View>

            <View className="flex flex-col gap-1">
              <Label>手机号码 *</Label>
              <View className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                <Input
                  className="w-full"
                  type="number"
                  maxlength={11}
                  value={applyForm.phone}
                  placeholder="11位手机号"
                  onInput={(e) => setApplyForm({ ...applyForm, phone: e.detail.value })}
                />
              </View>
            </View>

            <View className="flex flex-col gap-1">
              <Label>现居住地</Label>
              <AddressPicker
                value={applyForm.address}
                streetPlaceholder="街道 / 小区名称（选填）"
                onChange={(v) => setApplyForm({ ...applyForm, address: v, residence: v.text || '' })}
              />
            </View>

            <View className="flex flex-col gap-1">
              <Label>申请人留言</Label>
              <View className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                <Textarea
                  style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                  maxlength={200}
                  value={applyForm.message}
                  placeholder="简单介绍您的家族渊源…"
                  onInput={(e) => setApplyForm({ ...applyForm, message: e.detail.value })}
                />
              </View>
            </View>

            {myApps.length > 0 && (
              <View className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex flex-col gap-2">
                <Text className="block text-sm font-semibold text-teal-800">
                  我的申请记录
                </Text>
                {myApps.map((it) => (
                  <View key={it.id} className="flex flex-row items-center justify-between gap-2">
                    <Text className="block text-sm text-teal-700 flex-1">
                      {it.name}（{it.statusLabel || statusText(it.status)}）
                    </Text>
                    {it.status === 'pending' && (
                      <Text className="block text-xs text-amber-600 whitespace-nowrap">
                        等待审核
                      </Text>
                    )}
                  </View>
                ))}
                {myApps.some((it) => it.status === 'pending') && (
                  <Text className="block text-xs text-stone-500">
                    审核通过前无法加入，请留意申请状态。
                  </Text>
                )}
              </View>
            )}
          </View>

          <DialogFooter>
            <Button
              className="bg-stone-200 text-stone-700"
              onClick={() => setShowApplyDialog(false)}
            >
              <Text>取消</Text>
            </Button>
            <Button
              className="bg-teal-800 text-white"
              disabled={submittingApply}
              onClick={handleSubmitApply}
            >
              <Send size={16} color="#FFFDF7" />
              <Text>{submittingApply ? '提交中...' : '提交申请'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 管理员：入册审核 */}
      <Dialog open={showAdminInbox} onOpenChange={setShowAdminInbox}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={20} color="#134E4A" />
              <Text>家族入册审核</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block">
                审核族人入族申请，通过后自动创建家族成员并授权身份。
              </Text>
            </DialogDescription>
          </DialogHeader>

          {adminApps.length === 0 ? (
            <View className="py-10 flex flex-col items-center gap-2">
              <Text className="block text-sm text-stone-400">
                暂无待处理的申请
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-3">
              {adminApps.map((it) => (
                <View
                  key={it.id}
                  className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2"
                >
                  <View className="flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center gap-2">
                      <Text className="block text-base font-semibold text-stone-800">
                        {it.name}
                      </Text>
                      {it.generation && (
                        <Text className="block text-sm text-stone-500">
                          {it.generation_title || ''}·{it.generation}
                        </Text>
                      )}
                    </View>
                    <Badge
                      className={
                        it.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : it.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                      }
                    >
                      <Text>{statusText(it.status)}</Text>
                    </Badge>
                  </View>
                  <Text className="block text-sm text-stone-600">
                    手机号：{it.phone || '-'}
                  </Text>
                  {it.residence && (
                    <Text className="block text-sm text-stone-600">
                      居住地：{it.residence}
                    </Text>
                  )}
                  {it.message && (
                    <Text className="block text-sm text-stone-500">
                      留言：{it.message}
                    </Text>
                  )}
                  {it.status === 'pending' && (
                    <View className="flex flex-row gap-2 mt-1">
                      <Button
                        className="flex-1 bg-emerald-700 text-white"
                        disabled={reviewingId === it.id}
                        onClick={() => handleReview(it.id, 'approve')}
                      >
                        <Check size={16} color="#FFFDF7" />
                        <Text>{reviewingId === it.id ? '处理中...' : '通过'}</Text>
                      </Button>
                      <Button
                        className="flex-1 bg-red-700 text-white"
                        disabled={reviewingId === it.id}
                        onClick={() => handleReview(it.id, 'reject')}
                      >
                        <X size={16} color="#FFFDF7" />
                        <Text>驳回</Text>
                      </Button>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <DialogFooter>
            <Button
              className="bg-stone-200 text-stone-700"
              onClick={() => setShowAdminInbox(false)}
            >
              <Text>关闭</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default ProfilePage;

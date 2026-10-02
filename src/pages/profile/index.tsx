import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { User, Heart, LogIn, LogOut, Shield, UserPlus, Trash2, House, HandHeart, Check, X, Send, Phone, Smartphone, RefreshCw, KeyRound } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { isAdmin, isSuper, permissionLevel } from '@/utils/permission';

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

  // 主管理员操作（设置管理人员 / 转让主管理员）
  const [showSuperActionDialog, setShowSuperActionDialog] = useState(false);
  const [adminCandidates, setAdminCandidates] = useState<any[]>([]);
  const [loadingAdminCandidates, setLoadingAdminCandidates] = useState(false);
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

  // ===== 账号与安全：手机号绑定 / 更换 / 微信账号迁移 =====
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  // 手机号绑定（新弹已合并到完善宗亲信息，保留占位供禁用态）
  const bindLoading = false;
  // 更换手机号
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [oldPhone, setOldPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  // 微信账号迁移
  const [showMigrate, setShowMigrate] = useState(false);
  const [migratePhone, setMigratePhone] = useState('');
  const [migrateReason, setMigrateReason] = useState('');
  const [migrateLoading, setMigrateLoading] = useState(false);
  // 管理员：协助改手机号与迁移审核
  const [showAdminMigrateReview, setShowAdminMigrateReview] = useState(false);
  const [migrateApps, setMigrateApps] = useState<any[]>([]);
  // 管理员：手机号申请审核
  const [showAdminPhoneReview, setShowAdminPhoneReview] = useState(false);
  const [phoneApps, setPhoneApps] = useState<any[]>([]);
  const [phoneAppsLoading, setPhoneAppsLoading] = useState(false);
  const [sortUid, setSortUid] = useState('');
  const [adminNewPhone, setAdminNewPhone] = useState('');
  const [adminPhoneSubmit, setAdminPhoneSubmit] = useState(false);

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
    if (!isLoggedIn || userInfo?.role !== 'super') {
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

  // 加载可设为管理员/可转让的成员（认证宗亲或管理人员，排除自己）
  const loadAdminCandidates = async () => {
    setLoadingAdminCandidates(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/users',
        header: { Authorization: `Bearer ${token}` },
      });
      const payload = res.data?.data;
      const list: any[] = Array.isArray(payload) ? payload : (payload?.list || []);
      setAdminCandidates(
        list.filter(
          (u) =>
            u.id !== userInfo?.id &&
            ['verified', 'admin'].includes(u.role),
        ),
      );
    } catch (e) {
      console.error('加载成员失败:', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoadingAdminCandidates(false);
    }
  };

  const handleSetAdmin = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (userInfo?.role !== 'super') {
      Taro.showToast({ title: '仅主管理人员可操作', icon: 'none' });
      return;
    }
    setShowSuperActionDialog(true);
    loadAdminCandidates();
  };

  // 管理人员自行辞职
  const handleResignAdmin = async () => {
    const modal = await Taro.showModal({
      title: '辞去管理人员',
      content: '确定辞去管理人员身份吗？辞职后将成为认证宗亲。',
    });
    if (!modal.confirm) return;
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/resign-admin',
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.code === 200) {
        const local = { ...userInfo, role: 'verified' };
        Taro.setStorageSync('userInfo', local);
        setUserInfo(local);
        Taro.showToast({ title: '已辞去管理人员', icon: 'success' });
      } else {
        Taro.showToast({ title: res.data?.msg || '操作失败', icon: 'none' });
      }
    } catch (e) {
      console.error('resign admin error:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
  };

  // 设置/取消某成员为管理人员
  const handleToggleAdmin = async (target: any) => {
    const makeAdmin = target.role !== 'admin';
    const modal = await Taro.showModal({
      title: makeAdmin ? '设为管理人员' : '取消管理人员',
      content: makeAdmin
        ? `确定将「${target.nickname || target.username}」设为管理人员吗？其将拥有所有板块编辑权限。`
        : `确定取消「${target.nickname || target.username}」的管理人员身份吗？`,
    });
    if (!modal.confirm) return;
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/set-admin',
        method: 'POST',
        data: { userId: target.id, revoke: !makeAdmin },
        header: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.code === 200) {
        Taro.showToast({ title: '操作成功', icon: 'success' });
        loadAdminCandidates();
      } else {
        Taro.showToast({ title: res.data?.msg || '操作失败', icon: 'none' });
      }
    } catch (e) {
      console.error('toggle admin error:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
  };

  // 转让主管理员（二次确认）
  const handleTransferSuper = async (target: any) => {
    const first = await Taro.showModal({
      title: '转让主管理员',
      content: `确定将主管理员身份转让给「${target.nickname || target.username}」吗？转让后您将成为普通管理人员，此操作需二次确认。`,
      confirmText: '继续',
    });
    if (!first.confirm) return;
    const second = await Taro.showModal({
      title: '最终确认',
      content: '再次确认：转让后管理权限立即转移，且全程记录日志。是否确认转让？',
      confirmText: '确认转让',
      confirmColor: '#C62828',
    });
    if (!second.confirm) return;
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/transfer-super',
        method: 'POST',
        data: { userId: target.id },
        header: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.code === 200) {
        // 原主管理员已降为 admin，更新本地登录态
        const local = { ...userInfo, role: 'admin' };
        Taro.setStorageSync('userInfo', local);
        setUserInfo(local);
        Taro.showToast({ title: '已转让主管理员身份', icon: 'success' });
        setShowSuperActionDialog(false);
      } else {
        Taro.showToast({ title: res.data?.msg || '转让失败', icon: 'none' });
      }
    } catch (e) {
      console.error('transfer super error:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
  };

  const handleOpenCreateFamily = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (userInfo?.role !== 'super') {
      Taro.showToast({ title: '仅主管理人员可创建家族', icon: 'none' });
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

  // ===== 手机号绑定（申请-审核制） =====
  // ===== 更换手机号（申请-审核制；本人变更提交申请，管理员走 handleAdminChangePhone） =====
  const handleChangePhone = async () => {
    if (!/^1\d{10}$/.test(oldPhone.trim())) {
      Taro.showToast({ title: '请填写原手机号', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(newPhone.trim())) {
      Taro.showToast({ title: '请填写新手机号', icon: 'none' });
      return;
    }
    // 本人更换：提交申请，管理员审核通过后生效
    setChangeLoading(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/phone-apply',
        method: 'POST',
        data: { type: 'change', oldPhone: oldPhone.trim(), newPhone: newPhone.trim() },
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('更换手机号申请:', res.data);
      if (res.data?.code === 200) {
        setShowChangePhone(false);
        setOldPhone('');
        setNewPhone('');
        Taro.showToast({ title: '更换申请已提交，等待管理员审核', icon: 'success' });
      } else {
        Taro.showToast({ title: res.data?.msg || '提交失败', icon: 'none' });
      }
    } catch (e) {
      console.error('更换申请失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setChangeLoading(false);
    }
  };

  // ===== 微信账号迁移（人工审核制） =====
  const openMigrate = () => {
    setMigratePhone('');
    setMigrateReason('');
    setShowMigrate(true);
  };

  const confirmMigrate = async () => {
    const isSuperAct = userInfo?.role === 'super';
    const doMigrate = async () => {
      setMigrateLoading(true);
      try {
        const token = Taro.getStorageSync('token');
        const res = await Network.request({
          url: '/api/auth/migrate-apply',
          method: 'POST',
          data: { phone: migratePhone.trim(), reason: migrateReason.trim() },
          header: { Authorization: `Bearer ${token}` },
        });
        console.log('迁移申请响应:', res.data);
        if (res.data?.code === 200) {
          setShowMigrate(false);
          Taro.showToast({ title: '迁移申请已提交，等待管理员审核', icon: 'success' });
        } else {
          Taro.showToast({ title: res.data?.msg || '操作失败', icon: 'none' });
        }
      } catch (e) {
        console.error('迁移申请失败:', e);
        Taro.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        setMigrateLoading(false);
      }
    };

    // 主管理员迁移：二次确认
    if (isSuperAct) {
      Taro.showModal({
        title: '迁移主管理员账号',
        content:
          '您正在申请迁移主管理人员账号身份。迁移后管理权限将转移给新微信账号，需谨慎操作。确定继续吗？',
        confirmColor: '#c53030',
        success: (r) => {
          if (r.confirm) doMigrate();
        },
      });
    } else {
      doMigrate();
    }
  };

  // ===== 管理员：协助改手机号 =====
  const handleAdminChangePhone = async () => {
    if (!sortUid.trim()) {
      Taro.showToast({ title: '请填写成员用户ID', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(adminNewPhone.trim())) {
      Taro.showToast({ title: '请填写正确的新手机号', icon: 'none' });
      return;
    }
    setAdminPhoneSubmit(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/admin-change-phone',
        method: 'POST',
        data: { targetUserId: sortUid.trim(), newPhone: adminNewPhone.trim() },
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('管理员改手机号:', res.data);
      if (res.data?.code === 200) {
        Taro.showToast({ title: '已协助修改', icon: 'success' });
        setAdminNewPhone('');
      } else {
        Taro.showToast({ title: res.data?.msg || '操作失败', icon: 'none' });
      }
    } catch (e) {
      console.error('操作失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setAdminPhoneSubmit(false);
    }
  };

  // ===== 管理员：迁移审核 =====
  const loadMigrateApps = async () => {
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/migrate-apps',
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('迁移审核列表:', res.data);
      if (res.data?.code === 200) {
        setMigrateApps(res.data.data || []);
      } else {
        setMigrateApps([]);
      }
    } catch (e) {
      console.error('加载迁移申请失败:', e);
      setMigrateApps([]);
    }
  };

  const openAdminMigrateReview = async () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setShowAdminMigrateReview(true);
    await loadMigrateApps();
  };

  const handleReviewMigration = async (appId: string, approve: boolean) => {
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/migrate-review',
        method: 'POST',
        data: { appId, approve },
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('审核迁移:', res.data);
      if (res.data?.code === 200) {
        Taro.showToast({ title: approve ? '已通过迁移' : '已驳回', icon: 'success' });
        await loadMigrateApps();
      } else {
        Taro.showToast({ title: res.data?.msg || '操作失败', icon: 'none' });
      }
    } catch (e) {
      console.error('审核失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
  };

  // ===== 管理员：手机号申请审核 =====
  const loadPhoneApps = async () => {
    setPhoneAppsLoading(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/phone-apps',
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('手机号申请列表:', res.data);
      setPhoneApps(res.data?.data || []);
    } catch (e) {
      console.error('加载手机号申请失败:', e);
      setPhoneApps([]);
    } finally {
      setPhoneAppsLoading(false);
    }
  };

  const openAdminPhoneReview = async () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setShowAdminPhoneReview(true);
    await loadPhoneApps();
  };

  const handleReviewPhone = async (appId: string, approve: boolean) => {
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/phone-review',
        method: 'POST',
        data: { appId, approve },
        header: { Authorization: `Bearer ${token}` },
      });
      console.log('审核手机号申请:', res.data);
      if (res.data?.code === 200) {
        Taro.showToast({ title: approve ? '已通过并写入手机号' : '已驳回', icon: 'success' });
        await loadPhoneApps();
      } else {
        Taro.showToast({ title: res.data?.msg || '操作失败', icon: 'none' });
      }
    } catch (e) {
      console.error('审核失败:', e);
      Taro.showToast({ title: '网络错误', icon: 'none' });
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
        {/* 创建家族：仅主管理人员可见，非主管理员不再展示创建家族弹窗入口 */}
        {isLoggedIn && userInfo?.role === 'super' && !familyExists && (
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

        {/* 管理员功能：仅主管理人员可设置/撤销管理人员、转让主管理员 */}
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
                  管理人员与主管理员转让
                </Text>
                <Text className="block text-sm text-stone-500">
                  授权 / 撤销管理人员，或将主管理员转让给认证宗亲
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 管理人员自行辞职：仅 admin 可见（主管理员须先转让） */}
        {isLoggedIn && userInfo?.role === 'admin' && (
          <Card
            className="bg-stone-50 border-stone-200 active:opacity-80"
            onClick={handleResignAdmin}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-stone-600 flex items-center justify-center">
                <Shield size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  辞去管理人员
                </Text>
                <Text className="block text-sm text-stone-500">
                  辞职后成为认证宗亲，保留族谱身份
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        <Card
          className="bg-stone-50 border-stone-200 active:opacity-80"
          onClick={() => {
            if (!isLoggedIn) {
              Taro.showToast({ title: '请先登录', icon: 'none' });
              return;
            }
            setShowAccountDialog(true);
          }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center">
              <Phone size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                账号与安全
              </Text>
              <Text className="block text-sm text-stone-500">
                {userInfo?.phone
                  ? `已绑定：${userInfo.phone}（点击管理手机号 / 微信账号）`
                  : '绑定手机号，用于族人联络与账号找回'}
              </Text>
            </View>
          </CardContent>
        </Card>

        {isLoggedIn && !userInfo?.member_id && (
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
                选择宗亲树中的本人、填写父辈与手机号，认证后自动加入通讯录
              </Text>
            </View>
          </CardContent>
        </Card>
        )}

        {/* 申请加入家族：仅游客 / 未认证成员可见，认证宗亲及以上不显示 */}
        {(!isLoggedIn || permissionLevel(userInfo) < 2) && (
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
        )}

        {/* 辞去管理员：普通管理员可见，主管理员需先转让 */}
        {isLoggedIn && userInfo.role === 'admin' && (
        <Card
          className="bg-orange-50 border-orange-200 active:opacity-80"
          onClick={handleResignAdmin}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
              <LogOut size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                辞去管理员
              </Text>
              <Text className="block text-sm text-stone-500">
                辞去后成为认证宗亲，不再拥有管理权限
              </Text>
            </View>
          </CardContent>
        </Card>
        )}

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
                  <Label><Text className="block text-sm text-stone-600 mb-1">父辈姓名</Text></Label>
                  <View className="bg-stone-50 rounded-xl px-3 py-2">
                    <Text className="block text-sm text-stone-700">
                      {(selectedMember as any).parent_name ||
                        (allMembers.find((x: any) => x.id === (selectedMember as any).parent_id)?.name) ||
                        '未关联父辈（可不填）'}
                    </Text>
                  </View>
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

      {/* ===== 账号与安全弹窗 ===== */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={20} color="#134E4A" />
              <Text>账号与安全</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block">
                管理您的联系手机号与账号信息。
              </Text>
            </DialogDescription>
          </DialogHeader>

          <View className="flex flex-col gap-3">
            {/* 手机号展示 */}
            <View className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <Phone size={16} color="#6B5B4F" />
                <Text className="block text-sm text-stone-700">
                  {userInfo?.phone ? `当前手机号：${userInfo.phone}` : '未绑定手机号'}
                </Text>
              </View>
              {userInfo?.phone && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <Text>已绑定</Text>
                </Badge>
              )}
            </View>

            {/* 绑定手机号：与「完善宗亲信息」合并，填写姓名/父辈/手机后自动加入通讯录 */}
            {!userInfo?.phone && (
              <Button
                className="w-full bg-teal-800 text-white"
                disabled={bindLoading}
                onClick={() => {
                  setShowAccountDialog(false);
                  setTimeout(() => handleOpenLink(), 200);
                }}
              >
                <Phone size={16} color="#FFF" />
                <Text className="text-sm ml-1">绑定手机号（完善宗亲信息）</Text>
              </Button>
            )}

            {/* 更换手机号 */}
            {userInfo?.phone && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOldPhone(userInfo.phone);
                  setNewPhone('');
                  setShowChangePhone(true);
                }}
              >
                <RefreshCw size={16} color="#6B5B4F" />
                <Text className="text-sm">更换手机号</Text>
              </Button>
            )}

            {/* 微信账号迁移 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={openMigrate}
            >
              <Smartphone size={16} color="#6B5B4F" />
              <Text className="text-sm">迁移微信账号</Text>
            </Button>

            {/* 管理员：协助修改手机号 + 迁移审核 */}
            {isAdmin(userInfo) && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                <Text className="block text-sm font-semibold text-stone-700">管理功能</Text>
                <View className="flex flex-row gap-2">
                  <View className="flex-1 bg-stone-50 rounded-xl px-3 py-2">
                    <Input
                      className="w-full"
                      value={sortUid}
                      placeholder="成员用户ID（协助改手机号）"
                      onInput={(e) => setSortUid(e.detail.value)}
                    />
                  </View>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!sortUid.trim()) {
                        Taro.showToast({ title: '请填写成员用户ID', icon: 'none' });
                        return;
                      }
                      setShowChangePhone(true);
                    }}
                  >
                    <Text>改号</Text>
                  </Button>
                </View>
                <Button
                  className="w-full bg-amber-700 text-white"
                  onClick={openAdminMigrateReview}
                >
                  <KeyRound size={16} color="#FFFDF7" />
                  <Text className="text-sm">迁移人工审核</Text>
                </Button>
                <Button
                  className="w-full bg-teal-700 text-white"
                  onClick={openAdminPhoneReview}
                >
                  <Phone size={16} color="#FFFDF7" />
                  <Text className="text-sm">手机号申请审核</Text>
                </Button>
              </View>
            )}
          </View>

          <DialogFooter>
            <Button
              className="bg-stone-200 text-stone-700"
              onClick={() => setShowAccountDialog(false)}
            >
              <Text>关闭</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 更换手机号弹窗 */}
      <Dialog open={showChangePhone} onOpenChange={setShowChangePhone}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-bold text-stone-800">
                {userInfo?.role === 'admin' || userInfo?.role === 'super'
                  ? sortUid
                    ? '管理员协助更换手机号'
                    : '更换手机号'
                  : '更换手机号'}
              </Text>
            </DialogTitle>
          </DialogHeader>

          <View className="space-y-3 mt-2">
            {sortUid ? (
              <View>
                <Label><Text className="block text-sm text-stone-600 mb-1">新手机号</Text></Label>
                <Input
                  className="bg-stone-50"
                  type="number"
                  maxlength={11}
                  value={adminNewPhone}
                  placeholder="请输入新手机号"
                  onInput={(e) => setAdminNewPhone(e.detail.value)}
                />
              </View>
            ) : (
              <>
                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">原手机号</Text></Label>
                  <Input
                    className="bg-stone-50"
                    type="number"
                    maxlength={11}
                    value={oldPhone}
                    placeholder="请输入原手机号"
                    onInput={(e) => setOldPhone(e.detail.value)}
                  />
                </View>
                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">新手机号</Text></Label>
                  <View className="flex flex-row gap-2 items-end">
                    <View className="flex-1 bg-stone-50 rounded-xl px-3 py-2">
                      <Input
                        className="w-full"
                        type="number"
                        maxlength={11}
                        value={newPhone}
                        placeholder="请输入新手机号"
                        onInput={(e) => setNewPhone(e.detail.value)}
                      />
                    </View>
                  </View>
                </View>
                <Text className="block text-xs text-stone-400">
                  提交后由家族管理员人工审核，审核通过后生效。
                </Text>
              </>
            )}
          </View>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowChangePhone(false)}>
              <Text>取消</Text>
            </Button>
            <Button
              className="bg-teal-800 text-white"
              disabled={changeLoading || adminPhoneSubmit}
              onClick={() => {
                if (sortUid) {
                  handleAdminChangePhone();
                } else {
                  handleChangePhone();
                }
              }}
            >
              <Text>确认更换</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 微信账号迁移弹窗 */}
      <Dialog open={showMigrate} onOpenChange={setShowMigrate}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} color="#134E4A" />
              <Text>迁移微信账号</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block">
                已在新微信登录本小程序后，可将原家族的宗亲身份、权限与族谱数据迁移到新微信账号。请填写原家族手机号并说明原因，由家族管理员人工审核后迁移。
              </Text>
            </DialogDescription>
          </DialogHeader>

          <View className="flex flex-col gap-3">
            <View className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <Smartphone size={16} color="#6B5B4F" />
                <Text className="block text-sm text-stone-700">
                  当前微信：{userInfo?.nickname || userInfo?.username}（将接收原家族数据）
                </Text>
              </View>
            </View>

            {/* 原手机号 */}
            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">原家族绑定手机号 *</Text></Label>
              <Input
                className="bg-stone-50"
                type="number"
                maxlength={11}
                value={migratePhone}
                placeholder="请输入原家族账号绑定的手机号"
                onInput={(e) => setMigratePhone(e.detail.value)}
              />
            </View>

            <View>
              <Label><Text className="block text-sm text-stone-600 mb-1">迁移原因说明</Text></Label>
              <View className="bg-stone-50 rounded-xl px-3 py-2">
                <Textarea
                  style={{ width: '100%', minHeight: '70px', backgroundColor: 'transparent' }}
                  maxlength={200}
                  value={migrateReason}
                  placeholder="如更换微信号、原微信号丢失等，请简要说明情况，由管理员人工审核"
                  onInput={(e) => setMigrateReason(e.detail.value)}
                />
              </View>
              <Text className="block text-xs text-stone-400 mt-1">
                提交后由家族管理员人工审核，审核通过后迁移。主管理员迁移将二次确认。
              </Text>
            </View>

            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Text className="block text-xs leading-5 text-amber-800">
                迁移核验通过后：原微信账号将解绑，您在新的微信登录即可看到原家族全部成员信息、宗亲身份与权限；迁移操作将全程记录日志。
              </Text>
            </View>
          </View>

          <DialogFooter className="mt-2">
            <Button
              className="bg-stone-200 text-stone-700"
              onClick={() => setShowMigrate(false)}
            >
              <Text>取消</Text>
            </Button>
            <Button
              className="bg-teal-800 text-white"
              disabled={migrateLoading}
              onClick={confirmMigrate}
            >
              <Text>{migrateLoading ? '处理中...' : '提交审核申请'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 管理员：迁移人工审核弹窗 */}
      <Dialog open={showAdminMigrateReview} onOpenChange={setShowAdminMigrateReview}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={20} color="#134E4A" />
              <Text>迁移人工审核</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block">
                审核族人微信账号迁移申请，通过后将原家族身份与数据迁移至新微信。
              </Text>
            </DialogDescription>
          </DialogHeader>

          {migrateApps.length === 0 ? (
            <View className="py-10 flex flex-col items-center gap-2">
              <Text className="block text-sm text-stone-400">
                暂无待审核的迁移申请
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-3">
              {migrateApps.map((it) => (
                <View key={it.id} className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2">
                  <Text className="block text-base font-semibold text-stone-800">
                    原手机号：{it.phone || '-'}
                  </Text>
                  <Text className="block text-sm text-stone-600">
                    申请人：{it.submitted_by ? '（已登录用户发起）' : '-'}
                  </Text>
                  {it.reason && (
                    <Text className="block text-sm text-stone-500">
                      原因：{it.reason}
                    </Text>
                  )}
                  <Text className="block text-sm text-stone-500">
                    {it.created_at ? `提交时间：${new Date(it.created_at).toLocaleString()}` : ''}
                  </Text>
                  <View className="flex flex-row gap-2 mt-1">
                    <Button
                      className="flex-1 bg-emerald-700 text-white"
                      onClick={() => handleReviewMigration(it.id, true)}
                    >
                      <Check size={16} color="#FFFDF7" />
                      <Text>通过并迁移</Text>
                    </Button>
                    <Button
                      className="flex-1 bg-red-700 text-white"
                      onClick={() => handleReviewMigration(it.id, false)}
                    >
                      <X size={16} color="#FFFDF7" />
                      <Text>驳回</Text>
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}

          <DialogFooter>
            <Button
              className="bg-stone-200 text-stone-700"
              onClick={() => setShowAdminMigrateReview(false)}
            >
              <Text>关闭</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 管理员：手机号申请审核弹窗 */}
      <Dialog open={showAdminPhoneReview} onOpenChange={setShowAdminPhoneReview}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone size={20} color="#134E4A" />
              <Text>手机号申请审核</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block">
                审核族人提交的手机号绑定 / 更换申请，通过后为对应账号写入新手机号（开放号不变，操作写入日志）。
              </Text>
            </DialogDescription>
          </DialogHeader>

          {phoneAppsLoading ? (
            <View className="py-10 flex flex-col items-center gap-2">
              <Text className="block text-sm text-stone-400">加载中...</Text>
            </View>
          ) : phoneApps.length === 0 ? (
            <View className="py-10 flex flex-col items-center gap-2">
              <Text className="block text-sm text-stone-400">暂无待处理的手机号申请</Text>
            </View>
          ) : (
            <View className="flex flex-col gap-3">
              {phoneApps.map((it) => (
                <View key={it.id} className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2">
                  <View className="flex items-center justify-between">
                    <Text className="block text-base font-semibold text-stone-800">
                      {it.type === 'bind' ? '绑定手机号' : '更换手机号'}
                    </Text>
                    {it.status === 'pending' ? (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Text>待审核</Text>
                      </Badge>
                    ) : it.status === 'approved' ? (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <Text>已通过</Text>
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">
                        <Text>已驳回</Text>
                      </Badge>
                    )}
                  </View>
                  <Text className="block text-sm text-stone-600">
                    新手机号：{it.new_phone || '-'}
                  </Text>
                  {it.old_phone && (
                    <Text className="block text-sm text-stone-500">
                      原手机号：{it.old_phone}
                    </Text>
                  )}
                  {it.reason && (
                    <Text className="block text-sm text-stone-500">
                      说明：{it.reason}
                    </Text>
                  )}
                  <Text className="block text-sm text-stone-400">
                    {it.created_at ? `提交时间：${new Date(it.created_at).toLocaleString()}` : ''}
                  </Text>
                  {it.status === 'pending' && (
                    <View className="flex flex-row gap-2 mt-1">
                      <Button
                        className="flex-1 bg-emerald-700 text-white"
                        onClick={() => handleReviewPhone(it.id, true)}
                      >
                        <Check size={16} color="#FFFDF7" />
                        <Text>通过</Text>
                      </Button>
                      <Button
                        className="flex-1 bg-red-700 text-white"
                        onClick={() => handleReviewPhone(it.id, false)}
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
              onClick={() => setShowAdminPhoneReview(false)}
            >
              <Text>关闭</Text>
            </Button>
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

      {/* 主管理员操作：设置/取消管理人员、转让主管理员 */}
      <Dialog open={showSuperActionDialog} onOpenChange={setShowSuperActionDialog}>
        <DialogContent className="bg-[#FFFDF7] rounded-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={20} color="#B45309" />
              <Text>主管理员操作</Text>
            </DialogTitle>
          </DialogHeader>

          <View className="py-2">
            {loadingAdminCandidates ? (
              <View className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </View>
            ) : adminCandidates.length === 0 ? (
              <Text className="block text-stone-400 text-sm text-center py-6">
                暂无可操作的认证宗亲/管理人员
              </Text>
            ) : (
              <View className="space-y-3">
                {adminCandidates.map((u) => (
                  <View key={u.id} className="rounded-xl border p-3" style={{ borderColor: '#E8E0D8' }}>
                    <View className="flex items-center justify-between mb-2">
                      <View>
                        <Text className="block text-sm font-semibold text-stone-800">
                          {u.nickname || u.username}
                        </Text>
                        <Text className="block text-xs text-stone-400">
                          {u.role === 'admin' ? '管理人员' : '认证宗亲'}
                        </Text>
                      </View>
                    </View>
                    <View className="flex flex-row gap-2">
                      <Button
                        size="sm"
                        variant={u.role === 'admin' ? 'outline' : 'default'}
                        className="flex-1"
                        onClick={() => handleToggleAdmin(u)}
                      >
                        <Text>{u.role === 'admin' ? '取消管理员' : '设为管理员'}</Text>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-800 text-white"
                        onClick={() => handleTransferSuper(u)}
                      >
                        <Text>转让主管理员</Text>
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuperActionDialog(false)}>
              <Text>关闭</Text>
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

import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { Network } from '@/network';
import { MessageCircle } from 'lucide-react-taro';

export default function LoginPage() {
  const [wxLoading, setWxLoading] = useState(false);

  const isMiniApp = [Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any);

  useLoad(() => {
    console.log('LoginPage loaded');
  });

  const handleWechatLogin = async () => {
    if (!isMiniApp) {
      Taro.showToast({ title: '请在微信小程序中使用微信一键登录', icon: 'none' });
      return;
    }
    setWxLoading(true);
    try {
      const loginRes: any = await Taro.login();
      if (!loginRes || !loginRes.code) {
        Taro.showToast({ title: '获取微信授权失败', icon: 'none' });
        return;
      }
      const res = await Network.request({
        url: '/api/auth/wechat-login',
        method: 'POST',
        data: { code: loginRes.code },
      });
      console.log('WeChat login response:', res.data);
      if (res.data.code === 200) {
        Taro.setStorageSync('token', res.data.data.token);
        Taro.setStorageSync('userInfo', res.data.data.user);
        Taro.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          Taro.navigateBack();
        }, 1200);
      } else {
        Taro.showToast({ title: res.data.msg || '微信登录失败', icon: 'none' });
      }
    } catch (error) {
      console.error('WeChat login error:', error);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setWxLoading(false);
    }
  };

  return (
    <View className="min-h-screen bg-amber-50 px-6 py-10">
      {/* 标题区域 */}
      <View className="text-center mt-12 mb-16">
        <Text className="block text-4xl font-bold text-red-900" style={{ fontFamily: 'STKaiti, KaiTi, serif' }}>
          何氏族谱
        </Text>
        <Text className="block text-sm text-stone-500 mt-3">
          传承家族文化 · 记录血脉亲情
        </Text>
      </View>

      {/* 微信一键登录 */}
      <View className="mt-8">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-4"
          onClick={handleWechatLogin}
          disabled={wxLoading}
        >
          <MessageCircle size={20} color="#ffffff" className="mr-2" />
          <Text className="text-base">{wxLoading ? '授权中...' : '微信一键登录'}</Text>
        </Button>
        <Text className="block text-xs text-stone-400 text-center mt-6">
          登录即代表同意使用微信授权创建账号，无需额外注册
        </Text>
        {!isMiniApp && (
          <Text className="block text-xs text-amber-700 text-center mt-2">
            微信一键登录仅在微信小程序中可用
          </Text>
        )}
      </View>
    </View>
  );
}

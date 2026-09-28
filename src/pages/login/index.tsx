/* eslint-disable no-restricted-syntax -- 微信 getPhoneNumber 必须使用 @tarojs/components 原生 Button 的 open-type */
import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Button as WxButton } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { Network } from '@/network';
import { MessageCircle } from 'lucide-react-taro';

export default function LoginPage() {
  const [wxLoading, setWxLoading] = useState(false);

  const isMiniApp = [Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any);

  useLoad(() => {
    console.log('LoginPage loaded');
  });

  /** 手机号授权回调（open-type=getPhoneNumber） */
  const onGetPhone = async (e: any) => {
    const phoneCode = e?.detail?.code;
    if (!phoneCode) {
      Taro.showToast({ title: '需授权手机号方可登录', icon: 'none' });
      return;
    }
    setWxLoading(true);
    try {
      const loginRes: any = await Taro.login();
      if (!loginRes?.code) {
        Taro.showToast({ title: '获取微信标识失败', icon: 'none' });
        return;
      }
      const res = await Network.request({
        url: '/api/auth/wx-login',
        method: 'POST',
        data: { loginCode: loginRes.code, phoneCode },
      });
      console.log('WeChat login response:', res.data);
      if (res.data.code === 200) {
        Taro.setStorageSync('token', res.data.data.token);
        Taro.setStorageSync('userInfo', res.data.data.user);
        Taro.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1000);
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
        <Text className="block text-sm text-stone-500 mt-3">传承家族文化 · 记录血脉亲情</Text>
      </View>

      {/* 微信一键登录（小程序）：先取微信标识，再授权验证手机号 */}
      <View className="mt-8">
        {isMiniApp ? (
          <WxButton
            openType="getPhoneNumber"
            onGetPhoneNumber={onGetPhone}
            loading={wxLoading}
            className="w-full bg-emerald-600 text-white rounded-full py-3"
          >
            <View className="flex flex-row items-center justify-center">
              <MessageCircle size={20} color="#ffffff" className="mr-2" />
              <Text className="text-base text-white">{wxLoading ? '授权中...' : '微信一键登录'}</Text>
            </View>
          </WxButton>
        ) : (
          <Button
            className="w-full bg-emerald-600 text-white rounded-full py-4"
            onClick={() => Taro.showToast({ title: '请在微信小程序中使用微信一键登录', icon: 'none' })}
          >
            <Text className="text-base">微信一键登录</Text>
          </Button>
        )}
        <Text className="block text-xs text-stone-400 text-center mt-6">
          一个微信号仅可创建一个账号，账号与微信号永久绑定
        </Text>
      </View>
    </View>
  );
}

import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { Network } from '@/network';
import { MessageCircle, ShieldCheck } from 'lucide-react-taro';

export default function LoginPage() {
  const [wxLoading, setWxLoading] = useState(false);

  const isMiniApp = [Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any);

  /** 判定是否为测试环境（游客 AppID 或未绑定真实 AppID），此时 openid 无法由后端换取稳定标识 */
  const getAppId = () => {
    try {
      const info: any = Taro.getAccountInfoSync?.();
      const appId = info?.miniProgram?.appId || '';
      return appId;
    } catch (e) {
      return '';
    }
  };

  /** 测试环境下使用本地持久化的固定虚拟 openid，保证同一微信多次登录账号稳定不变 */
  const getOrCreateDevOpenid = () => {
    const KEY = 'dev_openid_fixed';
    let openid = Taro.getStorageSync(KEY);
    if (!openid) {
      openid = 'devwx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      Taro.setStorageSync(KEY, openid);
    }
    return openid;
  };

  /** 微信一键登录：仅 wx.login 获取 openid，不再强制手机号授权 */
  const onWxLogin = async () => {
    setWxLoading(true);
    try {
      const appId = getAppId();
      // 测试/预览环境（游客 AppID 或未配置真实 AppID）：直接传本地固定 openid，保证账号稳定且不新建重复记录
      const isTourist = !appId || appId === 'touristappid' || appId.indexOf('wx') !== 0;
      let payload: any;
      if (isTourist) {
        payload = { openid: getOrCreateDevOpenid(), nickname: '微信宗亲' };
      } else {
        const loginRes: any = await Taro.login();
        if (!loginRes?.code) {
          Taro.showToast({ title: '获取微信标识失败', icon: 'none' });
          return;
        }
        payload = { loginCode: loginRes.code };
      }
      const res = await Network.request({
        url: '/api/auth/wx-login',
        method: 'POST',
        data: payload,
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
      Taro.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
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

      {/* 微信一键登录：仅获取 openid，登录不再强制手机号 */}
      <View className="mt-8">
        {isMiniApp ? (
          <Button
            className="w-full bg-emerald-600 text-white rounded-full py-4"
            onClick={onWxLogin}
            disabled={wxLoading}
          >
            <MessageCircle size={20} color="#ffffff" className="mr-2" />
            <Text className="text-base text-white">{wxLoading ? '登录中...' : '微信一键登录'}</Text>
          </Button>
        ) : (
          <Button
            className="w-full bg-emerald-600 text-white rounded-full py-4"
            onClick={() => Taro.showToast({ title: '请在微信小程序中使用微信一键登录', icon: 'none' })}
          >
            <MessageCircle size={20} color="#ffffff" className="mr-2" />
            <Text className="text-base">微信一键登录</Text>
          </Button>
        )}

        <View className="mt-6 flex items-start gap-2 bg-white rounded-xl p-4">
          <ShieldCheck size={18} color="#6B5B4F" className="mt-1 flex-shrink-0" />
          <Text className="block text-xs leading-5 text-stone-500 flex-1">
            仅用于标识您的微信身份并登录族谱，登录环节不再强制获取手机号。手机号可在登录后在「我的-账号与安全」中自愿绑定，用于族人联络与账号找回。登录即代表您已阅读并同意《隐私政策》。
          </Text>
        </View>

        <Text className="block text-xs text-stone-400 text-center mt-4">
          一个微信号仅可创建一个账号，账号与微信号永久绑定
        </Text>
      </View>
    </View>
  );
}
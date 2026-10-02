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

  /** 登录成功后落地登录态（缓存 token 与用户信息） */
  const applyLogin = (data: any) => {
    Taro.setStorageSync('token', data.token);
    Taro.setStorageSync('userInfo', data.user);
    Taro.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  /** 微信一键登录：仅 wx.login 获取 openid，不再强制手机号授权 */
  const onWxLogin = async () => {
    setWxLoading(true);
    try {
      const appId = getAppId();
      // 需要真实微信 openid：优先用 wx.login 换取 code，由后端 code2Session 换取稳定 openid
      // 适用于已绑定真实 AppID 且后端已配置 WX_APPID/WX_SECRET 的环境
      const wantsRealOpenid = !!appId && appId !== 'touristappid' && appId.indexOf('wx') === 0;

      // 首次使用 loginCode：成功后保持真实 openid；失败（如后端未配置微信凭证）则降级为本地固定 openid
      if (wantsRealOpenid) {
        try {
          const loginRes: any = await Taro.login();
          const code = loginRes?.code;
          if (code) {
            const res = await Network.request({
              url: '/api/auth/wx-login',
              method: 'POST',
              data: { loginCode: code, nickname: '微信宗亲' },
            });
            console.log('WeChat login (real) response:', res.data);
            if (res.data.code === 200) {
              applyLogin(res.data.data);
              return;
            }
            console.warn('loginCode 登录失败，降级为本地 openid 登录:', res.data.msg);
          }
        } catch (e) {
          console.warn('wx.login/loginCode 异常，降级为本地 openid 登录:', e);
        }
      }

      // 测试/预览环境，或后端未配置微信凭证时的保底方案：直传本地固定 openid，账号稳定不重复新建
      const res2 = await Network.request({
        url: '/api/auth/wx-login',
        method: 'POST',
        data: { openid: getOrCreateDevOpenid(), nickname: '微信宗亲' },
      });
      console.log('WeChat login (dev) response:', res2.data);
      if (res2.data.code === 200) {
        applyLogin(res2.data.data);
      } else {
        Taro.showToast({ title: res2.data.msg || '微信登录失败', icon: 'none' });
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
            登录即代表您已阅读并同意《隐私政策》。手机号可在登录后自愿绑定，用于族人联络与账号找回。
          </Text>
        </View>
      </View>
    </View>
  );
}
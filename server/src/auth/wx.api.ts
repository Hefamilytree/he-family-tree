/**
 * code2Session：通过小程序登录凭证 code，换取微信真实 openid。
 *
 * 安全约束（需求3）：
 *  - 用户唯一标识必须来自微信接口返回的真实 openid，严禁本地/模拟 openid。
 *  - 调用失败时返回明确错误（errcode/errmsg），由上层给出友好提示，绝不自动降级。
 */
import * as https from 'https';

interface WxLoginResponse {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 调用微信 code2Session。
 * 成功：返回 { openid, unionid?, session_key }。
 * 失败：返回 { errcode, errmsg }（不抛假数据）。
 */
export function code2Session(jsCode: string): Promise<WxLoginResponse> {
  const WX_APPID = process.env.WX_APPID || process.env.WECHAT_APPID || '';
  const WX_SECRET = process.env.WX_SECRET || process.env.WECHAT_SECRET || '';

  if (!jsCode) {
    return Promise.resolve({ errcode: -100, errmsg: '缺少登录凭证 code' });
  }
  if (!WX_APPID || !WX_SECRET) {
    // 后端未配置微信凭证：明确报错，禁止伪造 openid
    return Promise.resolve({
      errcode: -101,
      errmsg: '服务端未配置微信 AppID/AppSecret，请先在开放平台完成绑定',
    });
  }

  const url =
    `https://api.weixin.qq.com/sns/jscode2session` +
    `?appid=${encodeURIComponent(WX_APPID)}` +
    `&secret=${encodeURIComponent(WX_SECRET)}` +
    `&js_code=${encodeURIComponent(jsCode)}` +
    `&grant_type=authorization_code`;

  return new Promise((resolve) => {
    https
      .get(url, (resp) => {
        let raw = '';
        resp.on('data', (chunk) => (raw += chunk));
        resp.on('end', () => {
          try {
            const parsed = JSON.parse(raw) as WxLoginResponse;
            if (!parsed.openid) {
              resolve({
                errcode: parsed.errcode ?? -102,
                errmsg: parsed.errmsg || '获取微信标识失败，请稍后重试',
              });
            } else {
              resolve(parsed);
            }
          } catch (e) {
            resolve({ errcode: -103, errmsg: '微信服务返回解析失败' });
          }
        });
      })
      .on('error', (err) => {
        resolve({ errcode: -104, errmsg: `无法连接微信服务：${err.message}` });
      });
  });
}

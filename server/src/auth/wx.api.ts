import * as https from 'https';

/**
 * 微信开放能力：通过 AppID / AppSecret 交换 openid 与手机号。
 * 凭证来自环境变量 WX_APPID / WX_SECRET（在小程序后台与项目绑定后配置）。
 */

function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

export async function code2Session(loginCode: string): Promise<{ openid?: string; errcode?: number; errmsg?: string }> {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  if (!appid || !secret) {
    return { errcode: -1, errmsg: '未配置 WX_APPID/WX_SECRET' };
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(
    loginCode
  )}&grant_type=authorization_code`;
  return getJson(url);
}

export async function getPhoneNumber(phoneCode: string): Promise<{ phoneNumber?: string; errcode?: number; errmsg?: string }> {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  if (!appid || !secret) {
    return { errcode: -1, errmsg: '未配置 WX_APPID/WX_SECRET' };
  }
  // 1. 取 access_token
  const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const tokenRes = await getJson(tokenUrl);
  if (!tokenRes.access_token) return tokenRes;
  // 2. 换手机号
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        host: 'api.weixin.qq.com',
        path: `/wxa/business/getuserphonenumber?access_token=${tokenRes.access_token}`,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(body);
            resolve(j.phone_info ? { phoneNumber: j.phone_info.phoneNumber } : j);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify({ code: phoneCode }));
    req.end();
  });
}

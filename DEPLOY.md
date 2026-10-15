# 何氏族谱小程序 - 免费部署上线指南

## 第一步：注册 Supabase 数据库（免费永久）



1. 打开 [https://supabase.com](https://supabase.com) ，点击 Start your project

2. 用 GitHub 或邮箱注册

3. 点击 New Project

4. 填写：

* Name: he-family-tree

* Database Password: 设一个密码并保存

* Region: Northeast Asia (Tokyo) 选最近的

1. 等待项目创建完成（约 2 分钟）

2. 进入项目后，点左侧 Settings（齿轮图标）→ API

3. 记录以下三个值：

* Project URL → 填入 SUPABASE\_URL

* anon public key → 填入 SUPABASE\_ANON\_KEY

* service\_role key → 填入 SUPABASE\_SERVICE\_ROLE\_KEY（这个是私密的）

## 第二步：在 Supabase 中创建数据表



1. 在 Supabase 项目左侧点 SQL Editor

2. 点 New Query

3. 粘贴下方全部 SQL 并运行：



```
-- 家族信息表
CREATE TABLE families (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  surname varchar(50) NOT NULL,
  family_name varchar(100) NOT NULL,
  hall_name varchar(100),
  motto text,
  description text,
  origin text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- 成员表
CREATE TABLE members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  courtesy_name varchar(100),
  gender varchar(10) DEFAULT 'male' NOT NULL,
  birth_date varchar(20),
  death_date varchar(20),
  phone varchar(32),
  parent_id varchar(36),
  spouse_name varchar(100),
  generation integer DEFAULT 1 NOT NULL,
  generation_title varchar(100),
  bio text,
  avatar_url text,
  is_alive varchar(10) DEFAULT 'yes' NOT NULL,
  birth_place varchar(200),
  burial_place varchar(200) DEFAULT '葬地不详',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);

-- 用户表
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  openid varchar(255) UNIQUE,
  nickname varchar(100),
  phone varchar(32),
  role varchar(20) DEFAULT 'member',
  member_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 文化传承表
CREATE TABLE cultural_heritage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id varchar(36),
  category varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  content text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- 孝亲睦族活动表
CREATE TABLE harmony_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id varchar(36),
  title varchar(200) NOT NULL,
  description text,
  activity_date varchar(20),
  location varchar(200),
  status varchar(20) DEFAULT 'published',
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 发展经济表
CREATE TABLE economic_development (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id varchar(36),
  category varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  content text,
  image_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 评论表
CREATE TABLE comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type varchar(50) NOT NULL,
  target_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  member_name varchar(100),
  content text NOT NULL,
  parent_id uuid,
  root_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 活动报名表
CREATE TABLE registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  member_name varchar(100),
  phone varchar(32),
  note text,
  created_at timestamptz DEFAULT now()
);

-- 配偶表
CREATE TABLE spouses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  status varchar(20) DEFAULT 'alive',
  birth_date varchar(20),
  death_date varchar(20),
  bio text,
  burial_place varchar(200),
  created_at timestamptz DEFAULT now()
);

-- 通讯录表
CREATE TABLE kin_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(64) NOT NULL,
  phone varchar(32),
  residence varchar(255),
  generation integer,
  generation_title varchar(32),
  bio text,
  source varchar(16) DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- 生日提醒表
CREATE TABLE birthdays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id varchar(36) NOT NULL,
  name varchar(100),
  birth_date varchar(20) NOT NULL,
  lunar boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

## 第三步：部署后端到 Render（免费永久）



1. 先把代码推到 GitHub：

* 在 [https://github.com](https://github.com) 新建一个仓库，名字比如 he-family-tree

* 把项目代码上传（可以用 GitHub Desktop 或网页上传）

1. 打开 [https://render.com](https://render.com) ，用 GitHub 注册

2. 点 New → Web Service

3. 连接你的 GitHub 仓库 he-family-tree

4. 配置：

* Name: he-family-tree-api

* Runtime: Node

* Build Command: `cd server && npm install && npm run build`

* Start Command: `cd server && node dist/main.js`

* Plan: Free

1. 在 Environment 中添加以下变量：

* WX\_APPID = wx8e85742d04d7aca7

* WX\_SECRET = 180ebacf23f9adf1257f5efb5e0cf7c2

* SUPABASE\_URL = （第一步从 Supabase 拿到的）

* SUPABASE\_ANON\_KEY = （第一步从 Supabase 拿到的）

* SUPABASE\_SERVICE\_ROLE\_KEY = （第一步从 Supabase 拿到的）

* JWT\_SECRET = he-family-tree-secret-2024

* NODE\_ENV = production

1. 点 Deploy，等待部署完成（约 2-3 分钟）

2. 部署成功后会得到一个网址，如：

   `https://he-family-tree-api.onrender.com`

## 第四步：配置小程序请求地址



1. 打开微信开发者工具

2. 修改 dist/common.js 中的请求地址，改为 Render 的网址：

   `https://he-family-tree-api.onrender.com`

3. 在微信公众平台（[mp.weixin.qq.com](https://mp.weixin.qq.com)）→ 开发管理 → 开发设置 → 服务器域名

4. 在 request 合法域名中添加：

   `https://he-family-tree-api.onrender.com`

## 第五步：验证



1. 在微信开发者工具中编译预览

2. 点击微信登录

3. 应该能正常登录了

## 注意事项



* Render 免费版 15 分钟无请求会休眠，第一次打开小程序需等待约 30 秒唤醒

* Supabase 免费版 7 天无访问会暂停，在 Supabase 后台点一下即可恢复

* 以后要换国内服务器，只需把后端代码部署到国内 VPS，然后改小程序的请求域名即可
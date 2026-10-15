-- 何氏族谱小程序 - 数据库建表脚本
-- 在 Supabase SQL Editor 中粘贴并运行

-- 家族信息表
CREATE TABLE IF NOT EXISTS families (
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
CREATE TABLE IF NOT EXISTS members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  courtesy_name varchar(100),
  gender varchar(10) DEFAULT 'male' NOT NULL,
  birth_date varchar(20),
  birth_time varchar(20),
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
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  openid varchar(255) UNIQUE,
  nickname varchar(100),
  phone varchar(32),
  role varchar(20) DEFAULT 'member',
  member_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 文化传承表
CREATE TABLE IF NOT EXISTS cultural_heritage (
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
CREATE TABLE IF NOT EXISTS harmony_activities (
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
CREATE TABLE IF NOT EXISTS economic_development (
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
CREATE TABLE IF NOT EXISTS comments (
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
CREATE TABLE IF NOT EXISTS registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  member_name varchar(100),
  phone varchar(32),
  note text,
  created_at timestamptz DEFAULT now()
);

-- 配偶表
CREATE TABLE IF NOT EXISTS spouses (
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
CREATE TABLE IF NOT EXISTS kin_contacts (
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
CREATE TABLE IF NOT EXISTS birthdays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id varchar(36) NOT NULL,
  name varchar(100),
  birth_date varchar(20) NOT NULL,
  lunar boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 健康检查表
CREATE TABLE IF NOT EXISTS health_check (
  id serial PRIMARY KEY,
  updated_at timestamptz DEFAULT now()
);

-- 家族申请表
CREATE TABLE IF NOT EXISTS family_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id varchar(36),
  applicant_id varchar(36),
  name varchar(64) NOT NULL,
  generation varchar(64),
  generation_title varchar(32),
  phone varchar(32),
  residence varchar(255),
  message text,
  status varchar(16) DEFAULT 'pending' NOT NULL,
  reviewed_by varchar(36),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 插入一条测试数据
INSERT INTO families (surname, family_name, hall_name, description) 
VALUES ('何', '何氏族谱', '庐江堂', '何氏家族族谱小程序') 
ON CONFLICT DO NOTHING;

-- 完成提示
SELECT 'Tables created successfully! 12 tables ready.' AS result;

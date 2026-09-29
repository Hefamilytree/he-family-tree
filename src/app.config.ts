export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/members/index',
    'pages/family/index',
    'pages/profile/index',
    'pages/section-detail/index',
    'pages/section-edit/index',
    'pages/contacts/index',
    'pages/export/index',
    'pages/export-preview/index',
    'pages/login/index',
    'pages/register/index',
    'pages/birthdays/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FAF8F5',
    navigationBarTitleText: '何氏族谱',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#6B5B4F',
    selectedColor: '#8B2500',
    backgroundColor: '#FFFDF7',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '族谱',
        iconPath: './assets/tabbar/scroll-text.png',
        selectedIconPath: './assets/tabbar/scroll-text-active.png',
      },
      {
        pagePath: 'pages/members/index',
        text: '成员',
        iconPath: './assets/tabbar/users.png',
        selectedIconPath: './assets/tabbar/users-active.png',
      },
      {
        pagePath: 'pages/family/index',
        text: '宗亲树',
        iconPath: './assets/tabbar/tree-pine.png',
        selectedIconPath: './assets/tabbar/tree-pine-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png',
      }
    ]
  },
  // 隐私保护相关配置（微信小程序端生效）
  __usePrivacyCheck__: true,
  permission: {
    'scope.userInfo': {
      desc: '用于完善您的族谱个人信息'
    }
  }
})

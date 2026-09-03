export default typeof definePageConfig === 'function'
  ? definePageConfig({
    pages: [
      'pages/index/index',
      'pages/members/index',
      'pages/family/index',
      'pages/profile/index'
    ],
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#FAF8F5',
      navigationBarTitleText: '家族族谱',
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
          iconPath: './assets/tabbar/tree-pine.png',
          selectedIconPath: './assets/tabbar/tree-pine-active.png',
        },
        {
          pagePath: 'pages/members/index',
          text: '成员',
          iconPath: './assets/tabbar/users.png',
          selectedIconPath: './assets/tabbar/users-active.png',
        },
        {
          pagePath: 'pages/family/index',
          text: '家族',
          iconPath: './assets/tabbar/book-open.png',
          selectedIconPath: './assets/tabbar/book-open-active.png',
        },
        {
          pagePath: 'pages/profile/index',
          text: '我的',
          iconPath: './assets/tabbar/user.png',
          selectedIconPath: './assets/tabbar/user-active.png',
        }
      ]
    }
  })
  : {
    pages: [
      'pages/index/index',
      'pages/members/index',
      'pages/family/index',
      'pages/profile/index'
    ],
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#FAF8F5',
      navigationBarTitleText: '家族族谱',
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
          iconPath: './assets/tabbar/tree-pine.png',
          selectedIconPath: './assets/tabbar/tree-pine-active.png',
        },
        {
          pagePath: 'pages/members/index',
          text: '成员',
          iconPath: './assets/tabbar/users.png',
          selectedIconPath: './assets/tabbar/users-active.png',
        },
        {
          pagePath: 'pages/family/index',
          text: '家族',
          iconPath: './assets/tabbar/book-open.png',
          selectedIconPath: './assets/tabbar/book-open-active.png',
        },
        {
          pagePath: 'pages/profile/index',
          text: '我的',
          iconPath: './assets/tabbar/user.png',
          selectedIconPath: './assets/tabbar/user-active.png',
        }
      ]
    }
  }

export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '登录',
      navigationBarBackgroundColor: '#FAF8F5',
    })
  : {
      navigationBarTitleText: '登录',
      navigationBarBackgroundColor: '#FAF8F5',
    };

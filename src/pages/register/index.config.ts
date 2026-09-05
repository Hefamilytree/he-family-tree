export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '注册',
      navigationBarBackgroundColor: '#FAF8F5',
    })
  : {
      navigationBarTitleText: '注册',
      navigationBarBackgroundColor: '#FAF8F5',
    };

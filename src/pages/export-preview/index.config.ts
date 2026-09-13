export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '打印预览', navigationBarBackgroundColor: '#FAF8F5', enableShareAppMessage: true })
  : { navigationBarTitleText: '打印预览', navigationBarBackgroundColor: '#FAF8F5' }
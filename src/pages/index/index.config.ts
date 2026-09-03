export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '族谱' })
  : { navigationBarTitleText: '族谱' }

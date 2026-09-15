export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '通讯录' })
  : { navigationBarTitleText: '通讯录' };

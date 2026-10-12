import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Network } from '@/network'
import { getAuthUser, permissionLevel } from '@/utils/permission'
import { Users, MessageSquare, CornerDownRight, Trash2, UserCheck } from 'lucide-react-taro'

interface RegItem {
  id: string
  member_name: string
  generation_label?: string
  phone?: string
  created_at: string
}

interface CommentNode {
  id: string
  member_name: string
  generation_label?: string
  content: string
  created_at: string
  can_delete: boolean
  reply_to_name?: string | null
  replies?: CommentNode[]
}

interface Props {
  activityId: string
}

const authHeader = () => {
  const token = Taro.getStorageSync?.('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const fmtTime = (iso: string) => {
  try {
    const d = new Date(iso)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch (e) {
    return ''
  }
}

/**
 * 活动互动区：一键报名 / 取消报名、报名名单、评论 + 楼中楼回复。
 * 仅用于孝亲睦族 7 个活动类单元。
 */
export default function ActivityInteraction({ activityId }: Props) {
  const [registered, setRegistered] = useState(false)
  const [regList, setRegList] = useState<RegItem[]>([])
  const [regTotal, setRegTotal] = useState(0)
  const [regBusy, setRegBusy] = useState(false)

  const [comments, setComments] = useState<CommentNode[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [openReply, setOpenReply] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  // 是否具备报名/评论资格：认证宗亲（2级）及以上
  const [canInteract, setCanInteract] = useState(false)

  const requireLogin = (): boolean => {
    const token = Taro.getStorageSync?.('token')
    if (!token) {
      Taro.showToast({ title: '请先登录后再操作', icon: 'none' })
      return false
    }
    // 报名 / 评论仅认证宗亲（2级）及以上
    if (permissionLevel(getAuthUser()) < 2) {
      Taro.showToast({ title: '请先完成宗亲认证后再操作', icon: 'none' })
      return false
    }
    return true
  }

  const loadAll = async () => {
    setCanInteract(permissionLevel(getAuthUser()) >= 2)
    try {
      const [regRes, cmtRes] = await Promise.all([
        Network.request({
          url: `/api/registrations?activityId=${activityId}`,
          header: authHeader(),
        }),
        Network.request({
          url: `/api/comments?targetType=harmony&targetId=${activityId}`,
          header: authHeader(),
        }),
      ])
      console.log('[ActivityInteraction] registrations:', regRes.data)
      console.log('[ActivityInteraction] comments:', cmtRes.data)
      const reg = regRes.data?.data
      if (reg) {
        setRegList(reg.list || [])
        setRegTotal(reg.total || 0)
        setRegistered(!!reg.registered)
      }
      setComments(cmtRes.data?.data || [])
    } catch (e) {
      console.error('加载互动数据失败:', e)
    } finally {
      setLoaded(true)
    }
  }

  // 进入即加载；返回列表页会整体重建
  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleRegister = async () => {
    if (!requireLogin() || regBusy) return
    setRegBusy(true)
    try {
      if (registered) {
        const res = await Network.request({
          url: '/api/registrations',
          method: 'DELETE',
          header: authHeader(),
          data: { activityId },
        })
        console.log('取消报名响应:', res.data)
        if (res.data?.code === 200) {
          Taro.showToast({ title: '已取消报名', icon: 'none' })
        }
      } else {
        const res = await Network.request({
          url: '/api/registrations',
          method: 'POST',
          header: authHeader(),
          data: { activityId },
        })
        console.log('报名响应:', res.data)
        if (res.data?.code === 200) {
          Taro.showToast({ title: '报名成功', icon: 'success' })
        } else {
          Taro.showToast({ title: res.data?.msg || '报名失败', icon: 'none' })
        }
      }
      await loadAll()
    } catch (e) {
      console.error('报名操作失败:', e)
      Taro.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      setRegBusy(false)
    }
  }

  const submitComment = async () => {
    if (!requireLogin()) return
    const content = commentText.trim()
    if (!content) {
      Taro.showToast({ title: '评论内容不能为空', icon: 'none' })
      return
    }
    if (content.length > 1000) {
      Taro.showToast({ title: '评论不能超过1000字', icon: 'none' })
      return
    }
    const res = await Network.request({
      url: '/api/comments',
      method: 'POST',
      header: authHeader(),
      data: { targetType: 'harmony', targetId: activityId, content },
    })
    console.log('发评论响应:', res.data)
    if (res.data?.code === 200) {
      setCommentText('')
      Taro.showToast({ title: '评论成功', icon: 'success' })
      await loadAll()
    } else {
      Taro.showToast({ title: res.data?.msg || '评论失败', icon: 'none' })
    }
  }

  const submitReply = async (rootId: string, parentId: string) => {
    if (!requireLogin()) return
    const content = (replyDraft[parentId] || '').trim()
    if (!content) {
      Taro.showToast({ title: '回复内容不能为空', icon: 'none' })
      return
    }
    const res = await Network.request({
      url: '/api/comments',
      method: 'POST',
      header: authHeader(),
      data: {
        targetType: 'harmony',
        targetId: activityId,
        content,
        parentId,
      },
    })
    console.log('回复响应:', res.data)
    if (res.data?.code === 200) {
      setReplyDraft({ ...replyDraft, [parentId]: '' })
      setOpenReply({ ...openReply, [rootId]: true })
      Taro.showToast({ title: '回复成功', icon: 'success' })
      await loadAll()
    } else {
      Taro.showToast({ title: res.data?.msg || '回复失败', icon: 'none' })
    }
  }

  const handleDeleteComment = async (id: string) => {
    const r = await Taro.showModal({ title: '删除评论', content: '确定删除这条评论吗？' })
    if (!r.confirm) return
    const res = await Network.request({
      url: `/api/comments/${id}`,
      method: 'DELETE',
      header: authHeader(),
    })
    if (res.data?.code === 200) {
      Taro.showToast({ title: '已删除', icon: 'success' })
      await loadAll()
    } else {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const renderReplies = (node: CommentNode, rootId: string) => {
    const replies = node.replies || []
    const showBox = openReply[rootId]
    return (
      <View className="mt-2 pl-3 border-l-2" style={{ borderColor: '#EAD9C9' }}>
        {replies.map((rp) => (
          <View key={rp.id} className="mb-2">
            <View className="flex items-start gap-1">
              <CornerDownRight size={14} color="#B08968" className="mt-1" />
              <View className="flex-1">
                <View className="flex items-center justify-between">
                  <Text className="text-xs font-semibold" style={{ color: '#8B2500' }}>
                    {rp.member_name}
                    {rp.generation_label ? ` · ${rp.generation_label}` : ''}
                    {rp.reply_to_name ? ` 回复 ${rp.reply_to_name}` : ''}
                  </Text>
                  {rp.can_delete && (
                    <View onClick={() => handleDeleteComment(rp.id)} className="p-1">
                      <Trash2 size={13} color="#B08968" />
                    </View>
                  )}
                </View>
                <Text className="block text-sm mt-1" style={{ color: '#555' }}>{rp.content}</Text>
                <Text className="block text-xs mt-1" style={{ color: '#AAA' }}>{fmtTime(rp.created_at)}</Text>
              </View>
            </View>
          </View>
        ))}

        {canInteract && (
          <View
            className="flex items-center gap-1"
            onClick={() => setOpenReply({ ...openReply, [rootId]: !showBox })}
          >
            <MessageSquare size={13} color="#8B2500" />
            <Text className="text-xs" style={{ color: '#8B2500' }}>{showBox ? '收起回复' : '写回复'}</Text>
          </View>
        )}

        {showBox && (
          <View className="mt-2">
            <Textarea
              value={replyDraft[node.id] || ''}
              onInput={(e: any) => setReplyDraft({ ...replyDraft, [node.id]: e.detail.value })}
              maxlength={1000}
              placeholder={`回复 ${node.member_name}…`}
            />
            <View className="flex justify-end mt-1">
              <Button size="sm" onClick={() => submitReply(rootId, node.id)}>
                <Text className="text-xs">发送回复</Text>
              </Button>
            </View>
          </View>
        )}
      </View>
    )
  }

  return (
    <View className="mt-3 pt-3 border-t" style={{ borderColor: '#EAD9C9' }}>
      {/* 一键报名 */}
      <Button
        className="w-full rounded-full py-2"
        onClick={handleToggleRegister}
        disabled={regBusy || !canInteract}
      >
        <View className="flex items-center justify-center gap-2 w-full">
          {registered ? (
            <>
              <UserCheck size={16} color="#FFFDF7" />
              <Text className="text-sm text-white">{regBusy ? '处理中…' : '取消报名'}</Text>
            </>
          ) : (
            <>
              <Users size={16} color="#FFFDF7" />
              <Text className="text-sm text-white">
                {!canInteract ? '认证宗亲后可报名' : regBusy ? '处理中…' : '一键报名'}
              </Text>
            </>
          )}
        </View>
      </Button>

      {/* 报名名单 */}
      <View className="mt-2">
        <Text className="block text-xs font-semibold mb-1" style={{ color: '#6B5B4F' }}>
          已报名 {regTotal} 人
        </Text>
        {regList.length === 0 ? (
          <Text className="block text-xs" style={{ color: '#B0A090' }}>还没有人报名，快来抢占名额～</Text>
        ) : (
          <View className="flex flex-wrap gap-2">
            {regList.map((p) => (
              <View
                key={p.id}
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: '#F3E9DD' }}
              >
                <Text className="text-xs" style={{ color: '#6B5B4F' }}>
                  {p.member_name}{p.generation_label ? ` ${p.generation_label}` : ''}{p.phone ? ` ${p.phone}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 评论区 */}
      <View className="mt-4">
        <Text className="block text-sm font-semibold mb-2" style={{ color: '#6B5B4F' }}>
          评论{comments.length ? ` (${comments.length})` : ''}
        </Text>

        {canInteract ? (
          <>
            <Textarea
              value={commentText}
              onInput={(e: any) => setCommentText(e.detail.value)}
              maxlength={1000}
              placeholder="友善发言，说点什么…（最多1000字）"
            />
            <View className="flex justify-end mt-1 mb-3">
              <Button size="sm" onClick={submitComment}>
                <Text className="text-xs">发表评论</Text>
              </Button>
            </View>
          </>
        ) : (
          <View className="mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: '#F3E9DD' }}>
            <Text className="block text-xs text-center" style={{ color: '#8B2500' }}>
              完成宗亲认证后可发表评论与回复
            </Text>
          </View>
        )}

        {loaded && comments.length === 0 && (
          <Text className="block text-xs mb-2" style={{ color: '#B0A090' }}>暂无评论，快来抢沙发～</Text>
        )}

        {comments.map((c) => (
          <View key={c.id} className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#FBF5EE' }}>
            <View className="flex items-start justify-between">
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: '#8B2500' }}>
                  {c.member_name}{c.generation_label ? ` · ${c.generation_label}` : ''}
                </Text>
              </View>
              {c.can_delete && (
                <View onClick={() => handleDeleteComment(c.id)} className="p-1">
                  <Trash2 size={14} color="#B08968" />
                </View>
              )}
            </View>
            <Text className="block text-sm mt-1" style={{ color: '#555' }}>{c.content}</Text>
            <Text className="block text-xs mt-1" style={{ color: '#AAA' }}>{fmtTime(c.created_at)}</Text>
            {renderReplies(c, c.id)}
          </View>
        ))}
      </View>
    </View>
  )
}

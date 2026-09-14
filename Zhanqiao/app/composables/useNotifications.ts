/** 未读通知数量，由 app.vue 初始化，通知页与页头共享 */
export function useUnreadNotifications() {
  return useState<number>('notifications:unread', () => 0)
}

export const notificationTypeLabels: Record<string, string> = {
  project_approved: '项目已上线',
  project_rejected: '项目未通过',
  post_approved: '文章已发布',
  post_rejected: '文章未通过',
  comment_reply: '有人回复你',
  content_comment: '有人评论你的内容',
}

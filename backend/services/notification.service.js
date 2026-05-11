import supabase from '../config/supabase.js';

const MAX_LIMIT = 100;

function normalizeLimit(value, fallback = 20) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeNotificationPayload(input = {}) {
  const userId = input.userId ?? input.user_id;
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  const type = input.type === undefined || input.type === null || input.type === ''
    ? null
    : String(input.type).trim();

  if (!userId) {
    throw { status: 400, message: 'userId is required' };
  }
  if (!title) {
    throw { status: 400, message: 'title is required' };
  }
  if (!message) {
    throw { status: 400, message: 'message is required' };
  }

  return {
    user_id: userId,
    title: title.slice(0, 255),
    message,
    type: type ? type.slice(0, 100) : null,
    metadata: input.metadata ?? null,
  };
}

export async function createNotification(input) {
  const payload = normalizeNotificationPayload(input);
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createNotificationSafe(input) {
  if (!input?.userId && !input?.user_id) {
    return null;
  }

  try {
    return await createNotification(input);
  } catch (error) {
    console.warn('Failed to create notification:', error?.message || error);
    return null;
  }
}

export async function getNotificationsForUser(userId, query = {}) {
  if (!userId) throw { status: 401, message: 'User id not found in token' };

  const limit = normalizeLimit(query.limit);
  let request = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (String(query.unreadOnly || '').toLowerCase() === 'true') {
    request = request.eq('is_read', false);
  }

  const { data, error } = await request;
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) throw { status: 401, message: 'User id not found in token' };

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function markNotificationRead(userId, notificationId) {
  if (!userId) throw { status: 401, message: 'User id not found in token' };
  if (!notificationId) throw { status: 400, message: 'notificationId is required' };

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw { status: 404, message: 'Notification not found' };
  return data;
}

export async function markAllNotificationsRead(userId) {
  if (!userId) throw { status: 401, message: 'User id not found in token' };

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) throw error;
  return data || [];
}

export async function deleteNotification(userId, notificationId) {
  if (!userId) throw { status: 401, message: 'User id not found in token' };
  if (!notificationId) throw { status: 400, message: 'notificationId is required' };

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw { status: 404, message: 'Notification not found' };
  return data;
}

export default {
  createNotification,
  createNotificationSafe,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};

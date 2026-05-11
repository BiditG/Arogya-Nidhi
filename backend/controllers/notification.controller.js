import notificationService from '../services/notification.service.js';
import { sendSuccess, sendError } from '../util/response.util.js';

function getAuthUserId(req) {
  return req.user?.userId || req.user?.sub || req.user?.id || null;
}

export async function getNotifications(req, res) {
  try {
    const userId = getAuthUserId(req);
    const [notifications, unreadCount] = await Promise.all([
      notificationService.getNotificationsForUser(userId, req.query),
      notificationService.getUnreadNotificationCount(userId),
    ]);

    return sendSuccess(res, { notifications, unreadCount }, 'Notifications fetched');
  } catch (error) {
    return sendError(res, error.message || error, error.status || 500);
  }
}

export async function markNotificationRead(req, res) {
  try {
    const userId = getAuthUserId(req);
    const notification = await notificationService.markNotificationRead(userId, req.params.id);
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    return sendError(res, error.message || error, error.status || 500);
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const userId = getAuthUserId(req);
    const notifications = await notificationService.markAllNotificationsRead(userId);
    return sendSuccess(res, notifications, 'Notifications marked as read');
  } catch (error) {
    return sendError(res, error.message || error, error.status || 500);
  }
}

export async function deleteNotification(req, res) {
  try {
    const userId = getAuthUserId(req);
    const notification = await notificationService.deleteNotification(userId, req.params.id);
    return sendSuccess(res, notification, 'Notification deleted');
  } catch (error) {
    return sendError(res, error.message || error, error.status || 500);
  }
}

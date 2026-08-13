import Toast from 'react-native-toast-message';

export type AppNotificationKind = 'success' | 'delete' | 'error';

export type AppNotification = {
  kind: AppNotificationKind;
  title: string;
  message?: string;
};

const TOAST_TYPE_BY_KIND: Record<AppNotificationKind, string> = {
  success: 'appSuccess',
  delete: 'appDelete',
  error: 'appError',
};

const DEFAULT_VISIBILITY_MS = 3000;

function showNotification(notification: AppNotification) {
  Toast.show({
    type: TOAST_TYPE_BY_KIND[notification.kind],
    text1: notification.title,
    text2: notification.message,
    position: 'top',
    visibilityTime: DEFAULT_VISIBILITY_MS,
  });
}

export const notify = {
  success: (title: string, message?: string) =>
    showNotification({ kind: 'success', title, message }),
  deleted: (title: string, message?: string) =>
    showNotification({ kind: 'delete', title, message }),
  error: (title: string, message?: string) =>
    showNotification({ kind: 'error', title, message }),
  hide: () => Toast.hide(),
};
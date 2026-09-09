import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2 } from 'lucide-react';
import { useNotificationStore, NotificationItem } from '../../stores/notificationStore';

export const GlobalNotification: React.FC = () => {
  const { notifications, removeNotification, clearAll } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div
      id="global-notification-container"
      aria-live="assertive"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {notifications.length > 1 && (
        <div className="flex justify-end pointer-events-auto mb-0.5">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-xs hover:bg-slate-50 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa tất cả ({notifications.length})</span>
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <NotificationCard
            key={notif.id}
            notification={notif}
            onClose={() => removeNotification(notif.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationCardProps {
  notification: NotificationItem;
  onClose: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onClose }) => {
  const { id, type, title, message, duration } = notification;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50/95 border-emerald-200 text-emerald-950',
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      barColor: 'bg-emerald-500',
      Icon: CheckCircle2
    },
    error: {
      bg: 'bg-rose-50/95 border-rose-200 text-rose-950',
      iconColor: 'text-rose-600',
      badgeBg: 'bg-rose-100 text-rose-800',
      barColor: 'bg-rose-500',
      Icon: AlertCircle
    },
    warning: {
      bg: 'bg-amber-50/95 border-amber-200 text-amber-950',
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-100 text-amber-800',
      barColor: 'bg-amber-500',
      Icon: AlertTriangle
    },
    info: {
      bg: 'bg-indigo-50/95 border-indigo-200 text-indigo-950',
      iconColor: 'text-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      barColor: 'bg-indigo-500',
      Icon: Info
    }
  }[type];

  const IconComponent = typeConfig.Icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      id={`notification-${id}`}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-lg backdrop-blur-md p-3.5 transition-all ${typeConfig.bg}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-xl ${typeConfig.badgeBg} shrink-0 mt-0.5`}>
          <IconComponent className={`w-4 h-4 ${typeConfig.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          {title && (
            <h4 className="text-xs font-bold tracking-tight mb-0.5 text-slate-900">
              {title}
            </h4>
          )}
          <p className="text-xs text-slate-700 leading-relaxed break-words font-medium">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress animation bar if auto-dismissing */}
      {duration && duration > 0 ? (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-0.5 ${typeConfig.barColor}`}
        />
      ) : null}
    </motion.div>
  );
};

export default GlobalNotification;

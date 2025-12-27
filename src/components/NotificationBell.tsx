import { useEffect, useMemo, useState } from "react";
import axiosPublic from "../utils/axios/axiosPublic";

type Notification = {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

// With cookie-based auth, read a lightweight non-sensitive `user` cookie storing the id for convenience
const readUserIdFromCookie = (): string | null => {
  try {
    const match = typeof document !== 'undefined' ? document.cookie.match(/user=([^;]+)/) : null;
    if (!match) return null;
    const userStr = decodeURIComponent(match[1]);
    const user = JSON.parse(userStr);
    return user?._id || null;
  } catch { return null; }
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = useMemo(readUserIdFromCookie, []);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axiosPublic.get(`/notifications/user/${userId}`);
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [userId]);

  const unread = items.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    await axiosPublic.patch(`/notifications/${id}/read`);
    setItems(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  return (
    <div className="sz-bell-wrapper">
      <button className="sz-bell" onClick={() => setOpen(v => !v)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="sz-badge">{unread}</span>}
      </button>
      {open && (
        <div className="sz-popover">
          <div className="sz-popover-head">
            <span>Notifications</span>
            <button className="sz-refresh" onClick={fetchNotifications}>↻</button>
          </div>
          <div className="sz-popover-body">
            {loading ? (
              <div className="sz-empty">Loading...</div>
            ) : items.length === 0 ? (
              <div className="sz-empty">No notifications</div>
            ) : (
              items.map(n => (
                <div key={n._id} className={`sz-item ${n.isRead ? '' : 'unread'}`}>
                  <div className="sz-title">{n.title}</div>
                  <div className="sz-msg">{n.message}</div>
                  {!n.isRead && <button className="sz-mark" onClick={() => markAsRead(n._id)}>Mark as read</button>}
                  <div className="sz-time">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <style>{`
        .sz-bell-wrapper{ position:relative }
        .sz-bell{ position:relative; background:transparent; border:none; font-size:20px; cursor:pointer }
        .sz-badge{ position:absolute; top:-6px; right:-6px; background:#e11d48; color:#fff; border-radius:999px; font-size:10px; padding:0 6px; line-height:16px }
        .sz-popover{ position:absolute; right:0; top:36px; width:320px; background:#fff; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,.15); overflow:hidden; z-index:1001 }
        .sz-popover-head{ display:flex; justify-content:space-between; align-items:center; padding:.5rem .75rem; border-bottom:1px solid #f0f0f0; font-weight:600 }
        .sz-refresh{ background:transparent; border:none; cursor:pointer; font-size:16px }
        .sz-popover-body{ max-height:360px; overflow:auto }
        .sz-empty{ padding:1rem; text-align:center; color:#666 }
        .sz-item{ padding:.6rem .75rem; border-bottom:1px solid #f7f7f7 }
        .sz-item.unread{ background:#f7faff }
        .sz-title{ font-weight:600; margin-bottom:2px }
        .sz-msg{ color:#444; font-size:.9rem }
        .sz-time{ color:#888; font-size:.75rem; margin-top:4px }
        .sz-mark{ margin-top:6px; background:#eef2ff; border:none; padding:.25rem .5rem; border-radius:6px; cursor:pointer }
      `}</style>
    </div>
  );
}



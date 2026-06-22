import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";

type TopbarProps = {
  title: string;
};

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

function Topbar({ title }: TopbarProps) {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  function handleLogout() {
    localStorage.clear();
    window.location.reload();
  }

  async function loadNotifications() {
    try {
      const data = await apiRequest("/notifications");
      setNotifications(data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "SIN ROL";
  const initial = userName.charAt(0).toUpperCase();

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">
          Gestión académica y corrección inteligente
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-2xl"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-96 bg-white border rounded-2xl shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="font-bold">Notificaciones</h3>
              </div>

              {notifications.length === 0 ? (
                <div className="p-4 text-slate-500 text-sm">
                  No tienes notificaciones.
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={async () => {
                      try {
                        await apiRequest(
                          `/notifications/${notification.id}/read`,
                          {
                            method: "PUT",
                          },
                        );

                        const destination =
                          notification.link ||
                          (notification.type === "RESULTADO_PUBLICADO"
                            ? "exams"
                            : null);

                        if (destination) {
                          localStorage.setItem("redirectPage", destination);
                          window.location.reload();
                        }
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    className={`p-4 border-b cursor-pointer hover:bg-slate-100 ${
                      notification.read ? "bg-white" : "bg-blue-50"
                    }`}
                  >
                    <h4 className="font-semibold text-sm">
                      {notification.title}
                    </h4>

                    <p className="text-sm text-slate-600 mt-1">
                      {notification.message}
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">{userName}</p>
            <p className="text-xs text-slate-500">{userRole}</p>
          </div>

          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {initial}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

export default Topbar;

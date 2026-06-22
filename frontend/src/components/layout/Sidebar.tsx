type SidebarProps = {
  currentPage: string;
  onChangePage: (page: string) => void;
};

const adminItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "courses", label: "Materias", icon: "📚" },
  { id: "users", label: "Usuarios", icon: "👥" },
];

const teacherItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "courses", label: "Materias", icon: "📚" },
];

const studentItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "courses", label: "Mis materias", icon: "📚" },
  { id: "exams", label: "Mis exámenes", icon: "📝" },
];

function Sidebar({ currentPage, onChangePage }: SidebarProps) {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const menuItems =
    user?.role === "ADMIN"
      ? adminItems
      : user?.role === "DOCENTE"
        ? teacherItems
        : studentItems;

  return (
    <aside className="w-72 min-h-screen bg-slate-950 text-white p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold">EvaluaCode</h1>
        <p className="text-sm text-slate-400">Panel académico</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangePage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              currentPage === item.id
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "DOCENTE" | "ESTUDIANTE";
  createdAt: string;
};

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [view, setView] = useState<"list" | "form">("list");

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState<"DOCENTE" | "ESTUDIANTE">("DOCENTE");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    try {
      const data = await apiRequest("/users");
      setUsers(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar usuarios");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("DOCENTE");
    setEditingUser(null);
  }

  function openCreateForm() {
    resetForm();
    setError("");
    setSuccess("");
    setView("form");
  }

  function openEditForm(user: User) {
    setEditingUser(user);

    setName(user.name);
    setEmail(user.email);
    setPassword("");

    if (user.role === "DOCENTE" || user.role === "ESTUDIANTE") {
      setRole(user.role);
    }

    setError("");
    setSuccess("");
    setView("form");
  }

  async function handleSubmitUser(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email) {
      setError("Nombre y email son obligatorios");
      return;
    }

    if (!editingUser && !password) {
      setError("La contraseña es obligatoria");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const body = {
        name,
        email,
        password,
        role,
      };

      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        setSuccess("Usuario actualizado correctamente");
      } else {
        await apiRequest("/users", {
          method: "POST",
          body: JSON.stringify(body),
        });

        setSuccess("Usuario creado correctamente");
      }

      resetForm();

      await loadUsers();

      setView("list");
    } catch (error: any) {
      setError(error.message || "Error al guardar usuario");
    }
  }

  async function handleDeleteUser(userId: number) {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este usuario?",
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/users/${userId}`, {
        method: "DELETE",
      });

      setSuccess("Usuario eliminado correctamente");

      loadUsers();
    } catch (error: any) {
      setError(error.message || "Error al eliminar usuario");
    }
  }

  if (view === "form") {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              {editingUser ? "Editar usuario" : "Crear usuario"}
            </h2>

            <p className="text-slate-500 mt-1">
              Gestiona docentes y estudiantes.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setView("list");
            }}
            className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl"
          >
            Volver al listado
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <form onSubmit={handleSubmitUser} className="space-y-5">
            <div>
              <label className="text-sm font-medium">Nombre completo</label>

              <input
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del usuario"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>

              <input
                type="email"
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Contraseña</label>

              <input
                type="password"
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  editingUser ? "Dejar vacío para mantener" : "Contraseña"
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Rol</label>

              <select
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "DOCENTE" | "ESTUDIANTE")
                }
              >
                <option value="DOCENTE">Docente</option>

                <option value="ESTUDIANTE">Estudiante</option>
              </select>
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
              {editingUser ? "Guardar cambios" : "Crear usuario"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Usuarios</h2>

          <p className="text-slate-500 mt-1">
            Gestiona docentes y estudiantes.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
        >
          Crear usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-slate-500">
              <th className="py-4 font-medium">Nombre</th>

              <th className="py-4 font-medium">Email</th>

              <th className="py-4 font-medium">Rol</th>

              <th className="py-4 font-medium">Fecha registro</th>

              <th className="py-4 font-medium">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b hover:bg-slate-50 transition"
              >
                <td className="py-5 font-semibold text-slate-900">
                  {user.name}
                </td>

                <td className="py-5 text-slate-600">{user.email}</td>

                <td className="py-5">
                  <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium">
                    {user.role}
                  </span>
                </td>

                <td className="py-5 text-sm text-slate-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                <td className="py-5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(user)}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center text-slate-500 py-10">
            No hay usuarios registrados.
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersPage;

import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

type Stats = {
  role: "ADMIN" | "DOCENTE" | "ESTUDIANTE";

  totalUsers?: number;
  totalStudents?: number;
  totalTeachers?: number;

  totalCourses?: number;
  totalExams?: number;

  totalSubmissions?: number;
  pendingSubmissions?: number;

  averageScore?: number;

  pendingExams?: number;
  submittedExams?: number;
  publishedResults?: number;
};

type Card = {
  label: string;
  value: string | number | undefined;
  icon: string;
};

function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/dashboard")
      .then(setStats)
      .catch((error) => setError(error.message || "Error al cargar dashboard"));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border text-slate-500">
          Cargando dashboard...
        </div>
      </div>
    );
  }

  const adminCards: Card[] =
    stats.role === "ADMIN"
      ? [
          { label: "Usuarios", value: stats.totalUsers, icon: "👥" },
          { label: "Docentes", value: stats.totalTeachers, icon: "👨‍🏫" },
          { label: "Estudiantes", value: stats.totalStudents, icon: "🎓" },
          { label: "Materias", value: stats.totalCourses, icon: "📚" },
          { label: "Exámenes", value: stats.totalExams, icon: "📝" },
        ]
      : [];

  const teacherCards: Card[] =
    stats.role === "DOCENTE"
      ? [
          { label: "Mis materias", value: stats.totalCourses, icon: "📚" },
          { label: "Exámenes", value: stats.totalExams, icon: "📝" },
          { label: "Entregas", value: stats.totalSubmissions, icon: "📦" },
          {
            label: "Pendientes",
            value: stats.pendingSubmissions,
            icon: "⏳",
          },
          {
            label: "Promedio",
            value: Number(stats.averageScore ?? 0).toFixed(1),
            icon: "📊",
          },
        ]
      : [];

  const studentCards: Card[] =
    stats.role === "ESTUDIANTE"
      ? [
          { label: "Mis materias", value: stats.totalCourses, icon: "📚" },
          { label: "Exámenes", value: stats.totalExams, icon: "📝" },
          {
            label: "Pendientes",
            value: stats.pendingExams,
            icon: "⏳",
          },
          {
            label: "Enviados",
            value: stats.submittedExams,
            icon: "📤",
          },
          {
            label: "Resultados",
            value: stats.publishedResults,
            icon: "🏆",
          },
        ]
      : [];

  const cards =
    stats.role === "ADMIN"
      ? adminCards
      : stats.role === "DOCENTE"
        ? teacherCards
        : studentCards;

  const summaryTitle =
    stats.role === "ADMIN"
      ? "Administración del sistema"
      : stats.role === "DOCENTE"
        ? "Actividad docente"
        : "Mi progreso académico";

  const summaryText =
    stats.role === "ADMIN"
      ? "Supervisa usuarios, materias, docentes, estudiantes y exámenes registrados en la plataforma."
      : stats.role === "DOCENTE"
        ? "Revisa tus materias, exámenes, entregas recibidas y el promedio general de tus evaluaciones."
        : "Consulta tus materias, exámenes pendientes, entregas enviadas y resultados publicados.";

  const secondTitle =
    stats.role === "ADMIN"
      ? "Control académico"
      : stats.role === "DOCENTE"
        ? "Corrección inteligente"
        : "Seguimiento de evaluaciones";

  const secondText =
    stats.role === "ADMIN"
      ? "El administrador mantiene la estructura base del sistema: usuarios, materias y asignaciones."
      : stats.role === "DOCENTE"
        ? "Las respuestas pueden ser corregidas con IA y luego validadas manualmente por el docente."
        : "Cuando el docente publique tus resultados, podrás revisar tu nota final y el feedback recibido.";

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
          >
            <div className="text-3xl mb-3">{card.icon}</div>

            <p className="text-sm text-slate-500">{card.label}</p>

            <h3 className="text-3xl font-bold text-slate-900">
              {card.value ?? 0}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="text-lg font-bold mb-4">{summaryTitle}</h3>

          <p className="text-slate-600">{summaryText}</p>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="text-lg font-bold mb-4">{secondTitle}</h3>

          <p className="text-slate-600">{secondText}</p>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;

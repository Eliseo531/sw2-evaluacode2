import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CoursesPage from "./pages/CoursesPage";
import ExamsPage from "./pages/ExamsPage";
import QuestionsPage from "./pages/QuestionsPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import UsersPage from "./pages/UsersPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token")),
  );

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [currentPage, setCurrentPage] = useState(() => {
    const redirectPage = localStorage.getItem("redirectPage");

    if (redirectPage) {
      localStorage.removeItem("redirectPage");
      return redirectPage;
    }

    return "dashboard";
  });

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const pageTitle =
    currentPage === "dashboard"
      ? "Dashboard"
      : currentPage === "courses"
        ? "Materias"
        : currentPage === "exams"
          ? "Exámenes"
          : currentPage === "questions"
            ? "Preguntas"
            : "Entregas";

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar currentPage={currentPage} onChangePage={setCurrentPage} />

      <main className="flex-1">
        <Topbar title={pageTitle} />

        {currentPage === "dashboard" && <DashboardPage />}
        {currentPage === "courses" && <CoursesPage />}
        {currentPage === "users" && user?.role === "ADMIN" && <UsersPage />}
        {currentPage === "exams" && <ExamsPage />}
        {currentPage === "questions" && user?.role !== "ESTUDIANTE" && (
          <QuestionsPage />
        )}
        {currentPage === "submissions" && <SubmissionsPage />}
      </main>
    </div>
  );
}

export default App;

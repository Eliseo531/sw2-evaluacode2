import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Breadcrumb from "../components/ui/Breadcrumb";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Course = {
  id: number;
  name: string;
  code: string;
  group: string;
  description?: string;
};

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type CourseMember = {
  id: number;
  role: "DOCENTE" | "ESTUDIANTE";
  user: User;
};

type Question = {
  id: number;
  type: "TEORICA" | "CODIGO" | "DIAGRAMA_FLUJO";
  statement: string;
  expectedAnswer?: string;
  score: number;
  rubric?: string;
};

type Exam = {
  id: number;
  title: string;
  description?: string;
  status: "BORRADOR" | "PUBLICADO" | "EN_EVALUACION" | "FINALIZADO";
  type: "TEORICO" | "PROGRAMACION" | "MIXTO";
  examDate?: string;
  examTime?: string;
  durationMinutes?: number | null;
  createdAt: string;
  course: Course;
  questions: Question[];
};
type Answer = {
  id: number;
  content: string;
  fileUrl?: string | null;
  aiScore?: number | null;
  finalScore?: number | null;
  feedback?: string | null;
  question: Question;
};

type Submission = {
  id: number;
  examId: number;
  studentId: number;
  submittedAt: string;
  finalScore?: number | null;
  aiScore?: number | null;
  status: string;
  student: {
    id: number;
    name: string;
    email: string;
  };
  answers: Answer[];
};

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [publishingAll, setPublishingAll] = useState(false);

  const [examView, setExamView] = useState<"list" | "form" | "details">("list");
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [examStatus, setExamStatus] = useState<
    "BORRADOR" | "PUBLICADO" | "EN_EVALUACION" | "FINALIZADO"
  >("BORRADOR");
  const [examType, setExamType] = useState<
    "TEORICO" | "PROGRAMACION" | "MIXTO"
  >("TEORICO");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [examDetailTab, setExamDetailTab] = useState<
    "questions" | "submissions" | "plagiarism" | "security"
  >("questions");

  const [view, setView] = useState<
    | "courses"
    | "courseForm"
    | "courseDetail"
    | "examDetail"
    | "submissionDetail"
  >("courses");
  const [activeTab, setActiveTab] = useState<
    "info" | "exams" | "members" | "stats"
  >("info");

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"DOCENTE" | "ESTUDIANTE">(
    "ESTUDIANTE",
  );
  const [userSearch, setUserSearch] = useState("");

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isStudent = currentUser?.role === "ESTUDIANTE";
  const isAdmin = currentUser?.role === "ADMIN";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [questionView, setQuestionView] = useState<"list" | "form">("list");

  const [questionType, setQuestionType] = useState<
    "TEORICA" | "CODIGO" | "DIAGRAMA_FLUJO"
  >("TEORICA");

  const [plagiarismRiskFilter, setPlagiarismRiskFilter] = useState<
    "TODOS" | "ALTO" | "MEDIO" | "BAJO" | "MINIMO"
  >("TODOS");

  const [classReport, setClassReport] = useState<any>(null);
  const [loadingClassReport, setLoadingClassReport] = useState(false);

  const [questionStatement, setQuestionStatement] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [questionScore, setQuestionScore] = useState("");
  const [questionRubric, setQuestionRubric] = useState("");
  const [correctingSubmissionId, setCorrectingSubmissionId] = useState<
    number | null
  >(null);

  const [studentReport, setStudentReport] = useState<any>(null);
  const [loadingStudentReport, setLoadingStudentReport] = useState(false);
  const [reportView, setReportView] = useState<"course" | "student" | "class">(
    "course",
  );

  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examDurationMinutes, setExamDurationMinutes] = useState("");
  const [courseReport, setCourseReport] = useState<any>(null);
  const [manualScores, setManualScores] = useState<Record<number, string>>({});
  const [manualFeedbacks, setManualFeedbacks] = useState<
    Record<number, string>
  >({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [plagiarismReport, setPlagiarismReport] = useState<any>(null);
  const [analyzingPlagiarism, setAnalyzingPlagiarism] = useState(false);

  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loadingSecurityLogs, setLoadingSecurityLogs] = useState(false);

  async function loadCourses() {
    try {
      const data = await apiRequest("/courses");
      setCourses(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar materias");
    }
  }

  async function loadUsers() {
    try {
      const data = await apiRequest("/users");
      setUsers(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar usuarios");
    }
  }

  async function loadMembers(courseId: number) {
    try {
      const data = await apiRequest(`/courses/${courseId}/members`);
      setMembers(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar participantes");
    }
  }

  async function loadExams() {
    try {
      const data = await apiRequest("/exams");
      setExams(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar exámenes");
    }
  }

  function resetExamForm() {
    setExamTitle("");
    setExamDescription("");
    setExamStatus("BORRADOR");
    setExamType("TEORICO");
    setExamDate("");
    setExamTime("");
    setExamDurationMinutes("");
    setEditingExam(null);
  }

  function openCreateExamForm() {
    setError("");
    setSuccess("");
    resetExamForm();
    setExamView("form");
  }

  async function exportClassReportToExcel() {
    if (!classReport) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte de clase");

    worksheet.columns = [
      { header: "Estudiante", key: "student", width: 30 },
      ...classReport.exams.map((exam: any) => ({
        header: exam.title,
        key: `exam_${exam.id}`,
        width: 22,
      })),
      { header: "Promedio", key: "average", width: 15 },
    ];

    classReport.rows.forEach((row: any) => {
      const rowData: any = {
        student: row.studentName,
        average: row.average,
      };

      row.scores.forEach((score: any) => {
        rowData[`exam_${score.examId}`] =
          score.finalScore !== null
            ? score.finalScore
            : score.status === "NO_ENVIADO"
              ? "No enviado"
              : "Pendiente";
      });

      worksheet.addRow(rowData);
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });
    });

    worksheet.getColumn("student").alignment = {
      vertical: "middle",
      horizontal: "left",
    };

    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `reporte-clase-${classReport.course.code}.xlsx`);
  }

  function exportClassReportToPDF() {
    if (!classReport) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.text("Reporte de clase", 14, 15);

    doc.setFontSize(10);
    doc.text(`${classReport.course.name} - ${classReport.course.code}`, 14, 22);

    const headers = [
      "Estudiante",
      ...classReport.exams.map((exam: any) => exam.title),
      "Promedio",
    ];

    const rows = classReport.rows.map((row: any) => [
      row.studentName,
      ...row.scores.map((score: any) =>
        score.finalScore !== null
          ? score.finalScore
          : score.status === "NO_ENVIADO"
            ? "No enviado"
            : "Pendiente",
      ),
      row.average,
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        halign: "center",
      },
      bodyStyles: {
        halign: "center",
      },
      columnStyles: {
        0: {
          halign: "left",
          cellWidth: 45,
        },
      },
    });

    doc.save(`reporte-clase-${classReport.course.code}.pdf`);
  }

  function openEditExamForm(exam: Exam) {
    setError("");
    setSuccess("");

    setEditingExam(exam);
    setExamTitle(exam.title);
    setExamDescription(exam.description || "");
    setExamStatus(exam.status);
    setExamType(exam.type);
    setExamDate(exam.examDate ? exam.examDate.split("T")[0] : "");
    setExamTime(exam.examTime || "");
    setExamDurationMinutes(String(exam.durationMinutes || ""));

    setExamView("form");
  }

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCourse) return;

    if (!examTitle.trim()) {
      setError("El título del examen es obligatorio");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const body = {
        title: examTitle,
        description: examDescription,
        courseId: selectedCourse.id,
        status: examStatus,
        type: examType,
        examDate,
        examTime,
        durationMinutes: examDurationMinutes
          ? Number(examDurationMinutes)
          : null,
      };

      if (editingExam) {
        await apiRequest(`/exams/${editingExam.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        setSuccess("Examen actualizado correctamente");
      } else {
        await apiRequest("/exams", {
          method: "POST",
          body: JSON.stringify(body),
        });

        setSuccess("Examen creado correctamente");
      }

      resetExamForm();
      await loadExams();
      setExamView("list");
    } catch (error: any) {
      setError(error.message || "Error al guardar examen");
    }
  }

  useEffect(() => {
    loadCourses();
    loadExams();

    if (!isStudent) {
      loadUsers();
    }
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setGroup("");
    setDescription("");
    setEditingCourse(null);
  }

  function openCreateForm() {
    setError("");
    setSuccess("");
    resetForm();
    setView("courseForm");
  }

  function openExamDetails(exam: Exam) {
    setSelectedExam(exam);
    setExamDetailTab("questions");
    setQuestionView("list");
    setError("");
    setSuccess("");
    setView("examDetail");
  }

  function openEditForm(course: Course) {
    setError("");
    setSuccess("");
    setEditingCourse(course);
    setName(course.name);
    setCode(course.code);
    setGroup(course.group);
    setDescription(course.description || "");
    setView("courseForm");
  }

  function openCourseDetails(course: Course) {
    setError("");
    setSuccess("");
    setSelectedCourse(course);
    setSelectedUserId("");
    setUserSearch("");
    setMemberRole("ESTUDIANTE");
    setActiveTab("info");
    setExamView("list");

    if (!isStudent) {
      loadMembers(course.id);
    }

    setView("courseDetail");
  }

  async function handleSubmitCourse(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !code.trim() || !group.trim()) {
      setError("El nombre, la sigla y el grupo son obligatorios");
      return;
    }

    try {
      setError("");
      setSuccess("");

      if (editingCourse) {
        await apiRequest(`/courses/${editingCourse.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, code, group, description }),
        });

        setSuccess("Materia actualizada correctamente");
      } else {
        await apiRequest("/courses", {
          method: "POST",
          body: JSON.stringify({ name, code, group, description }),
        });

        setSuccess("Materia registrada correctamente");
      }

      resetForm();
      await loadCourses();
      setView("courses");
    } catch (error: any) {
      setError(error.message || "Error al guardar materia");
    }
  }

  async function handleDeleteCourse(courseId: number) {
    if (!window.confirm("¿Seguro que deseas eliminar esta materia?")) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/courses/${courseId}`, {
        method: "DELETE",
      });

      setSuccess("Materia eliminada correctamente");
      loadCourses();
    } catch (error: any) {
      setError(error.message || "Error al eliminar materia");
    }
  }
  async function handleDeleteExam(examId: number) {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este examen? Esta acción también puede eliminar sus preguntas y entregas asociadas.",
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/exams/${examId}`, {
        method: "DELETE",
      });

      setSuccess("Examen eliminado correctamente");

      await loadExams();
    } catch (error: any) {
      setError(error.message || "Error al eliminar examen");
    }
  }
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCourse) return;

    if (!selectedUserId) {
      setError("Debes seleccionar un usuario");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/courses/${selectedCourse.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          userId: Number(selectedUserId),
          role: memberRole,
        }),
      });

      setSuccess("Participante agregado correctamente");
      setSelectedUserId("");
      setUserSearch("");
      setMemberRole("ESTUDIANTE");

      loadMembers(selectedCourse.id);
    } catch (error: any) {
      setError(error.message || "Error al agregar participante");
    }
  }

  function resetQuestionForm() {
    setQuestionType("TEORICA");
    setQuestionStatement("");
    setExpectedAnswer("");
    setQuestionScore("");
    setQuestionRubric("");
    setEditingQuestion(null);
  }

  function openCreateQuestionForm() {
    setError("");
    setSuccess("");
    resetQuestionForm();
    setQuestionView("form");
  }

  function openEditQuestionForm(question: Question) {
    setError("");
    setSuccess("");

    setEditingQuestion(question);
    setQuestionType(question.type);
    setQuestionStatement(question.statement);
    setExpectedAnswer(question.expectedAnswer || "");
    setQuestionScore(String(question.score));
    setQuestionRubric(question.rubric || "");

    setQuestionView("form");
  }

  function openSubmissionDetail(submission: Submission) {
    setSelectedSubmission(submission);

    const initialScores: Record<number, string> = {};
    const initialFeedbacks: Record<number, string> = {};

    submission.answers.forEach((answer) => {
      initialScores[answer.id] = String(answer.finalScore ?? "");
      initialFeedbacks[answer.id] = answer.feedback ?? "";
    });

    setManualScores(initialScores);
    setManualFeedbacks(initialFeedbacks);

    setError("");
    setSuccess("");
    setView("submissionDetail");
  }

  function getSecuritySummaryByStudent() {
    const summaryMap = new Map<number, any>();

    securityLogs.forEach((log) => {
      const studentId = log.student.id;

      if (!summaryMap.has(studentId)) {
        summaryMap.set(studentId, {
          studentId,
          studentName: log.student.name,
          totalEvents: 0,
          tabChanges: 0,
          copyEvents: 0,
          pasteEvents: 0,
          startEvents: 0,
          submitEvents: 0,
        });
      }

      const current = summaryMap.get(studentId);

      current.totalEvents += 1;

      if (log.type === "CAMBIO_PESTAÑA") current.tabChanges += 1;
      if (log.type === "COPIAR") current.copyEvents += 1;
      if (log.type === "PEGAR") current.pasteEvents += 1;
      if (log.type === "INICIO_EXAMEN") current.startEvents += 1;
      if (log.type === "ENVIO_EXAMEN") current.submitEvents += 1;
    });

    return Array.from(summaryMap.values()).map((item) => {
      const suspiciousScore =
        item.tabChanges * 2 + item.copyEvents * 1 + item.pasteEvents * 3;

      let risk = "BAJO";

      if (suspiciousScore >= 6) risk = "ALTO";
      else if (suspiciousScore >= 3) risk = "MEDIO";

      return {
        ...item,
        suspiciousScore,
        risk,
      };
    });
  }

  function getSecurityRiskClass(risk: string) {
    if (risk === "ALTO") return "bg-red-100 text-red-700";
    if (risk === "MEDIO") return "bg-orange-100 text-orange-700";
    return "bg-green-100 text-green-700";
  }

  function getSecurityEventClass(type: string) {
    if (type === "CAMBIO_PESTAÑA") return "bg-red-100 text-red-700";
    if (type === "PEGAR") return "bg-orange-100 text-orange-700";
    if (type === "COPIAR") return "bg-yellow-100 text-yellow-700";
    if (type === "INICIO_EXAMEN") return "bg-blue-100 text-blue-700";
    if (type === "ENVIO_EXAMEN") return "bg-green-100 text-green-700";
    return "bg-slate-100 text-slate-700";
  }
  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedExam) return;

    if (!questionStatement.trim() || !questionScore.trim()) {
      setError("El enunciado y el puntaje son obligatorios");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const body = {
        examId: selectedExam.id,
        type: questionType,
        statement: questionStatement,
        expectedAnswer,
        score: Number(questionScore),
        rubric: questionRubric,
      };

      if (editingQuestion) {
        await apiRequest(`/questions/${editingQuestion.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        setSuccess("Pregunta actualizada correctamente");
      } else {
        await apiRequest("/questions", {
          method: "POST",
          body: JSON.stringify(body),
        });

        setSuccess("Pregunta creada correctamente");
      }

      resetQuestionForm();
      setQuestionView("list");

      await loadExams();

      const updatedExams = await apiRequest("/exams");
      const updatedExam = updatedExams.find(
        (exam: Exam) => exam.id === selectedExam.id,
      );

      if (updatedExam) {
        setSelectedExam(updatedExam);
      }
    } catch (error: any) {
      setError(error.message || "Error al guardar pregunta");
    }
  }

  async function loadSecurityLogsByExam(examId: number) {
    try {
      setLoadingSecurityLogs(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(`/security/exam/${examId}`);

      setSecurityLogs(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar reporte de seguridad");
    } finally {
      setLoadingSecurityLogs(false);
    }
  }

  async function loadSubmissionsByExam(examId: number) {
    try {
      const data = await apiRequest(`/submissions/exam/${examId}`);
      setSubmissions(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar entregas");
    }
  }

  async function handleSaveManualGrade(answerId: number) {
    if (!selectedSubmission || !selectedExam) return;

    const finalScore = manualScores[answerId];
    const feedback = manualFeedbacks[answerId];

    if (finalScore === undefined || finalScore === "") {
      setError("Debes ingresar una nota final");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/corrections/answer/${answerId}/manual-grade`,
        {
          method: "PUT",
          body: JSON.stringify({
            finalScore: Number(finalScore),
            feedback,
          }),
        },
      );

      setSelectedSubmission(data.submission);
      setSuccess("Nota manual guardada correctamente");

      await loadSubmissionsByExam(selectedExam.id);
    } catch (error: any) {
      setError(error.message || "Error al guardar nota manual");
    }
  }

  async function analyzePlagiarismByExam(examId: number) {
    try {
      setAnalyzingPlagiarism(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(`/plagiarism/exam/${examId}`);

      setPlagiarismReport(data);
      setSuccess("Análisis de similitud completado");
    } catch (error: any) {
      setError(error.message || "Error al analizar similitud");
    } finally {
      setAnalyzingPlagiarism(false);
    }
  }

  function getFilteredPlagiarismMatches() {
    if (!plagiarismReport) return [];

    if (plagiarismRiskFilter === "TODOS") {
      return plagiarismReport.matches;
    }

    return plagiarismReport.matches.filter(
      (match: any) => match.risk === plagiarismRiskFilter,
    );
  }

  function getRiskCount(risk: string) {
    if (!plagiarismReport) return 0;

    return plagiarismReport.matches.filter((match: any) => match.risk === risk)
      .length;
  }

  function getRiskBadgeClass(risk: string) {
    if (risk === "ALTO") return "bg-red-100 text-red-700";
    if (risk === "MEDIO") return "bg-orange-100 text-orange-700";
    if (risk === "BAJO") return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-700";
  }

  async function loadCourseReport(courseId: number) {
    try {
      const data = await apiRequest(`/reports/course/${courseId}`);

      console.log("REPORTE:", data);

      setCourseReport(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar reporte");
    }
  }

  async function loadStudentReport(courseId: number, studentId: number) {
    try {
      setLoadingStudentReport(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/reports/course/${courseId}/student/${studentId}`,
      );

      setStudentReport(data);
      setReportView("student");
    } catch (error: any) {
      setError(error.message || "Error al cargar reporte individual");
    } finally {
      setLoadingStudentReport(false);
    }
  }

  async function loadClassReport(courseId: number) {
    try {
      setLoadingClassReport(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(`/reports/course/${courseId}/class`);

      setClassReport(data);
      setReportView("class");
    } catch (error: any) {
      setError(error.message || "Error al cargar reporte de clase");
    } finally {
      setLoadingClassReport(false);
    }
  }

  async function handleRemoveMember(memberId: number) {
    if (!selectedCourse) return;

    if (!window.confirm("¿Seguro que deseas quitar este participante?")) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/courses/${selectedCourse.id}/members/${memberId}`, {
        method: "DELETE",
      });

      setSuccess("Participante eliminado correctamente");
      await loadMembers(selectedCourse.id);
    } catch (error: any) {
      setError(error.message || "Error al eliminar participante");
    }
  }

  const trendData =
    courseReport?.studentPerformance
      ?.reduce((acc: any[], item: any) => {
        const existing = acc.find((exam) => exam.examTitle === item.examTitle);

        if (existing) {
          existing.total += Number(item.finalScore || 0);
          existing.count += 1;
        } else {
          acc.push({
            examTitle: item.examTitle,
            total: Number(item.finalScore || 0),
            count: 1,
          });
        }

        return acc;
      }, [])
      .map((exam: any) => ({
        examen: exam.examTitle,
        promedio: Number((exam.total / exam.count).toFixed(2)),
      })) || [];
  if (
    view === "submissionDetail" &&
    selectedSubmission &&
    selectedExam &&
    selectedCourse
  ) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb
              items={[
                {
                  label: "Materias",
                  onClick: () => {
                    setSelectedExam(null);
                    setSelectedCourse(null);
                    setView("courses");
                  },
                },
                {
                  label: selectedCourse.name,
                  onClick: () => {
                    setSelectedExam(null);
                    setView("courseDetail");
                  },
                },
                {
                  label: selectedExam.title,
                },
              ]}
            />

            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              Entrega de {selectedSubmission?.student.name}
            </h2>

            <p className="text-slate-500 mt-1">
              {selectedSubmission?.student.email}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedSubmission(null);
              setView("examDetail");
              setExamDetailTab("submissions");
            }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-3 rounded-xl"
          >
            Volver a entregas
          </button>
        </div>

        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Estado</p>
            <h3 className="text-xl font-bold mt-2">
              {selectedSubmission.status}
            </h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Nota IA</p>
            <h3 className="text-xl font-bold mt-2">
              {selectedSubmission.aiScore ?? "Pendiente"}
            </h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Nota final</p>
            <h3 className="text-xl font-bold mt-2">
              {selectedSubmission.finalScore ?? "Pendiente"}
            </h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Fecha de envío</p>
            <h3 className="text-sm font-bold mt-2">
              {new Date(selectedSubmission.submittedAt).toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold">Respuestas del estudiante</h3>
              <p className="text-slate-500 mt-1">
                Revisa cada respuesta, feedback y nota asignada.
              </p>
            </div>
            <button
              disabled={correctingSubmissionId === selectedSubmission.id}
              onClick={async () => {
                try {
                  setCorrectingSubmissionId(selectedSubmission.id);
                  setError("");
                  setSuccess("");

                  await apiRequest(
                    `/corrections/submission/${selectedSubmission.id}`,
                    {
                      method: "POST",
                    },
                  );

                  setSuccess("Entrega corregida con IA correctamente");

                  await loadSubmissionsByExam(selectedExam.id);

                  const updatedSubmissions = await apiRequest(
                    `/submissions/exam/${selectedExam.id}`,
                  );

                  const updatedSubmission = updatedSubmissions.find(
                    (submission: Submission) =>
                      submission.id === selectedSubmission.id,
                  );

                  if (updatedSubmission) {
                    setSelectedSubmission(updatedSubmission);
                  }
                } catch (error: any) {
                  setError(error.message || "Error al corregir con IA");
                } finally {
                  setCorrectingSubmissionId(null);
                }
              }}
              className={`px-5 py-3 rounded-xl text-white ${
                correctingSubmissionId === selectedSubmission.id
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {correctingSubmissionId === selectedSubmission.id
                ? "Corrigiendo con IA..."
                : "Corregir con IA"}
            </button>
            <button
              onClick={async () => {
                if (!selectedSubmission) return;

                try {
                  setError("");
                  setSuccess("");

                  const data = await apiRequest(
                    `/submissions/${selectedSubmission.id}/publish`,
                    {
                      method: "PUT",
                    },
                  );

                  setSelectedSubmission({
                    ...selectedSubmission,
                    status: data.submission.status,
                  });

                  setSuccess("Resultado publicado correctamente");

                  if (selectedExam) {
                    await loadSubmissionsByExam(selectedExam.id);
                  }
                } catch (error: any) {
                  setError(error.message || "Error al publicar resultado");
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl"
            >
              Publicar resultado
            </button>
            ;
          </div>

          <div className="space-y-5">
            {selectedSubmission.answers.map((answer, index) => (
              <div key={answer.id} className="border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">
                      Pregunta {index + 1} • {answer.question.type}
                    </p>

                    <h4 className="text-lg font-bold mt-2">
                      {answer.question.statement}
                    </h4>
                  </div>

                  <div className="bg-slate-100 px-4 py-2 rounded-xl text-sm">
                    {answer.question.score} pts
                  </div>
                </div>

                <div className="mt-5 bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500 mb-2">
                    Respuesta del estudiante
                  </p>
                  <p className="text-slate-800 whitespace-pre-wrap">
                    {answer.content}
                  </p>

                  {answer.fileUrl && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-500 mb-2">
                        Imagen enviada por el estudiante
                      </p>

                      <img
                        src={answer.fileUrl}
                        alt="Imagen enviada por el estudiante"
                        className="max-w-xl rounded-xl border shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {answer.feedback && (
                  <div className="mt-4 bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-700 font-semibold mb-2">
                      Feedback IA
                    </p>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {answer.feedback}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-4 flex-wrap">
                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm">
                    Nota IA: {answer.aiScore ?? "Pendiente"}
                  </span>

                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm">
                    Nota final: {answer.finalScore ?? "Pendiente"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div>
                    <label className="text-sm font-medium">
                      Nota final docente
                    </label>
                    <input
                      type="number"
                      className="w-full mt-1 px-4 py-3 border rounded-xl"
                      value={manualScores[answer.id] ?? ""}
                      onChange={(e) =>
                        setManualScores({
                          ...manualScores,
                          [answer.id]: e.target.value,
                        })
                      }
                      min={0}
                      max={answer.question.score}
                      placeholder={`Máximo ${answer.question.score}`}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Feedback docente
                    </label>
                    <textarea
                      className="w-full mt-1 px-4 py-3 border rounded-xl"
                      value={manualFeedbacks[answer.id] ?? ""}
                      onChange={(e) =>
                        setManualFeedbacks({
                          ...manualFeedbacks,
                          [answer.id]: e.target.value,
                        })
                      }
                      placeholder="Comentario del docente"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleSaveManualGrade(answer.id)}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl text-sm"
                >
                  Guardar revisión manual
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "examDetail" && selectedExam && selectedCourse) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb
              items={[
                {
                  label: "Materias",
                  onClick: () => {
                    setSelectedSubmission(null);
                    setSelectedExam(null);
                    setSelectedCourse(null);
                    setView("courses");
                  },
                },
                {
                  label: selectedCourse.name,
                  onClick: () => {
                    setSelectedSubmission(null);
                    setSelectedExam(null);
                    setView("courseDetail");
                  },
                },
                {
                  label: selectedExam.title,
                  onClick: () => {
                    setSelectedSubmission(null);
                    setView("examDetail");
                  },
                },
                {
                  label: selectedSubmission?.student.name || "Entrega",
                },
              ]}
            />

            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              {selectedExam.title}
            </h2>

            <p className="text-slate-500 mt-1">
              {selectedExam.type} • {selectedExam.status}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedExam(null);
              setActiveTab("exams");
              setExamView("list");
              setView("courseDetail");
            }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-3 rounded-xl"
          >
            Volver a exámenes
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setExamDetailTab("questions")}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              examDetailTab === "questions"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Preguntas
          </button>

          <button
            onClick={() => {
              setExamDetailTab("submissions");
              loadSubmissionsByExam(selectedExam.id);
            }}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              examDetailTab === "submissions"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Entregas
          </button>

          <button
            onClick={() => setExamDetailTab("plagiarism")}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              examDetailTab === "plagiarism"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Similitud
          </button>

          <button
            onClick={() => {
              setExamDetailTab("security");
              loadSecurityLogsByExam(selectedExam.id);
            }}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              examDetailTab === "security"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Seguridad
          </button>
        </div>

        {examDetailTab === "questions" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">Preguntas</h3>
                <p className="text-slate-500 mt-1">
                  Preguntas registradas para este examen.
                </p>
              </div>

              {questionView === "list" && (
                <button
                  onClick={openCreateQuestionForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                >
                  Crear pregunta
                </button>
              )}
            </div>

            {questionView === "form" && (
              <form onSubmit={handleCreateQuestion} className="space-y-5">
                <div>
                  <label className="text-sm font-medium">
                    Tipo de pregunta
                  </label>

                  <select
                    className="w-full mt-1 px-4 py-3 border rounded-xl"
                    value={questionType}
                    onChange={(e) =>
                      setQuestionType(
                        e.target.value as
                          | "TEORICA"
                          | "CODIGO"
                          | "DIAGRAMA_FLUJO",
                      )
                    }
                  >
                    {selectedExam.type === "TEORICO" && (
                      <option value="TEORICA">Teórica</option>
                    )}

                    {selectedExam.type === "PROGRAMACION" && (
                      <>
                        <option value="CODIGO">Código</option>
                        <option value="DIAGRAMA_FLUJO">
                          Diagrama de flujo
                        </option>
                      </>
                    )}

                    {selectedExam.type === "MIXTO" && (
                      <>
                        <option value="TEORICA">Teórica</option>
                        <option value="CODIGO">Código</option>
                        <option value="DIAGRAMA_FLUJO">
                          Diagrama de flujo
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Enunciado</label>
                  <textarea
                    className="w-full mt-1 px-4 py-3 border rounded-xl"
                    value={questionStatement}
                    onChange={(e) => setQuestionStatement(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Respuesta esperada
                  </label>
                  <textarea
                    className="w-full mt-1 px-4 py-3 border rounded-xl"
                    value={expectedAnswer}
                    onChange={(e) => setExpectedAnswer(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Puntaje</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-4 py-3 border rounded-xl"
                    value={questionScore}
                    onChange={(e) => setQuestionScore(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Rúbrica</label>
                  <textarea
                    className="w-full mt-1 px-4 py-3 border rounded-xl"
                    value={questionRubric}
                    onChange={(e) => setQuestionRubric(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
                    {editingQuestion ? "Guardar cambios" : "Guardar pregunta"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetQuestionForm();
                      setQuestionView("list");
                    }}
                    className="bg-slate-200 hover:bg-slate-300 px-6 py-3 rounded-xl"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {questionView === "list" && (
              <div className="space-y-4">
                {selectedExam.questions.map((question, index) => (
                  <div key={question.id} className="border rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">
                          Pregunta {index + 1} • {question.type}
                        </p>

                        <h4 className="font-bold mt-2 text-lg">
                          {question.statement}
                        </h4>
                      </div>

                      <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm">
                        {question.score} pts
                      </span>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => openEditQuestionForm(question)}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm"
                        >
                          Editar
                        </button>

                        <button
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "¿Seguro que deseas eliminar esta pregunta?",
                              )
                            ) {
                              return;
                            }

                            try {
                              setError("");
                              setSuccess("");

                              await apiRequest(`/questions/${question.id}`, {
                                method: "DELETE",
                              });

                              setSuccess("Pregunta eliminada correctamente");

                              await loadExams();

                              const updatedExams = await apiRequest("/exams");
                              const updatedExam = updatedExams.find(
                                (exam: Exam) => exam.id === selectedExam.id,
                              );

                              if (updatedExam) {
                                setSelectedExam(updatedExam);
                              }
                            } catch (error: any) {
                              setError(
                                error.message || "Error al eliminar pregunta",
                              );
                            }
                          }}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {question.expectedAnswer && (
                      <p className="text-slate-600 mt-4">
                        <strong>Respuesta esperada:</strong>{" "}
                        {question.expectedAnswer}
                      </p>
                    )}

                    {question.rubric && (
                      <p className="text-slate-600 mt-2">
                        <strong>Rúbrica:</strong> {question.rubric}
                      </p>
                    )}
                  </div>
                ))}

                {selectedExam.questions.length === 0 && (
                  <div className="border rounded-xl p-8 text-center text-slate-500">
                    Este examen todavía no tiene preguntas.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {examDetailTab === "submissions" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">Entregas del examen</h3>

                <p className="text-slate-500 mt-1">
                  Revisa las entregas enviadas por los estudiantes.
                </p>
              </div>

              <div className="flex gap-3 items-center">
                <div className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-medium">
                  {submissions.length} entregas
                </div>

                <button
                  disabled={analyzingPlagiarism}
                  onClick={async () => {
                    await analyzePlagiarismByExam(selectedExam.id);
                    setExamDetailTab("plagiarism");
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${
                    analyzingPlagiarism
                      ? "bg-orange-400 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {analyzingPlagiarism ? "Analizando..." : "Analizar similitud"}
                </button>

                <button
                  disabled={publishingAll}
                  onClick={async () => {
                    if (!selectedExam) return;

                    try {
                      setPublishingAll(true);
                      setError("");
                      setSuccess("");

                      const data = await apiRequest(
                        `/submissions/exam/${selectedExam.id}/publish-all`,
                        {
                          method: "PUT",
                        },
                      );

                      await loadSubmissionsByExam(selectedExam.id);

                      setSuccess(
                        `Resultados publicados correctamente. Total actualizados: ${data.updatedCount}`,
                      );
                    } catch (error: any) {
                      setError(error.message || "Error al publicar resultados");
                    } finally {
                      setPublishingAll(false);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${
                    publishingAll
                      ? "bg-purple-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  {publishingAll ? "Publicando..." : "Publicar todos"}
                </button>
              </div>
            </div>

            {submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-slate-500">
                      <th className="py-4 font-medium">Estudiante</th>

                      <th className="py-4 font-medium">Estado</th>

                      <th className="py-4 font-medium">Nota IA</th>

                      <th className="py-4 font-medium">Nota final</th>

                      <th className="py-4 font-medium">Fecha envío</th>

                      <th className="py-4 font-medium">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b hover:bg-slate-50 transition"
                      >
                        <td className="py-5">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {submission.student.name}
                            </p>
                          </div>
                        </td>

                        <td className="py-5">
                          <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium">
                            {submission.status}
                          </span>
                        </td>

                        <td className="py-5">
                          <span className="bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-xs font-medium">
                            {submission.aiScore ?? "Pendiente"}
                          </span>
                        </td>

                        <td className="py-5">
                          <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-medium">
                            {submission.finalScore ?? "Pendiente"}
                          </span>
                        </td>

                        <td className="py-5 text-sm text-slate-600">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </td>

                        <td className="py-5">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => openSubmissionDetail(submission)}
                              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium"
                            >
                              Ver detalle
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  setError("");
                                  setSuccess("");

                                  await apiRequest(
                                    `/corrections/submission/${submission.id}`,
                                    {
                                      method: "POST",
                                    },
                                  );

                                  setSuccess(
                                    "Entrega corregida con IA correctamente",
                                  );

                                  await loadSubmissionsByExam(selectedExam.id);
                                } catch (error: any) {
                                  setError(
                                    error.message ||
                                      "Error al corregir entrega",
                                  );
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
                            >
                              Corregir IA
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dashed rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">📦</div>

                <h4 className="text-xl font-bold text-slate-800">
                  No hay entregas
                </h4>

                <p className="text-slate-500 mt-2">
                  Todavía ningún estudiante ha enviado este examen.
                </p>
              </div>
            )}
          </div>
        )}

        {examDetailTab === "plagiarism" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Análisis de similitud</h3>
                  <p className="text-slate-500 mt-1">
                    Comparación automática entre respuestas del examen.
                  </p>
                </div>

                <button
                  disabled={analyzingPlagiarism}
                  onClick={() => analyzePlagiarismByExam(selectedExam.id)}
                  className={`px-5 py-3 rounded-xl text-sm font-medium text-white ${
                    analyzingPlagiarism
                      ? "bg-orange-400 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {analyzingPlagiarism
                    ? "Analizando..."
                    : "Reanalizar similitud"}
                </button>
              </div>

              {!plagiarismReport ? (
                <div className="border border-dashed rounded-2xl p-12 text-center">
                  <div className="text-5xl mb-4">🧪</div>
                  <h4 className="text-xl font-bold text-slate-800">
                    Sin análisis todavía
                  </h4>
                  <p className="text-slate-500 mt-2">
                    Presiona “Reanalizar similitud” para comparar las entregas.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">Coincidencias</p>
                      <h4 className="text-3xl font-bold mt-2">
                        {plagiarismReport.totalMatches}
                      </h4>
                    </div>

                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">Riesgo alto</p>
                      <h4 className="text-3xl font-bold mt-2 text-red-600">
                        {getRiskCount("ALTO")}
                      </h4>
                    </div>

                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">Riesgo medio</p>
                      <h4 className="text-3xl font-bold mt-2 text-orange-600">
                        {getRiskCount("MEDIO")}
                      </h4>
                    </div>

                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">
                        Entregas analizadas
                      </p>
                      <h4 className="text-3xl font-bold mt-2">
                        {plagiarismReport.totalSubmissions}
                      </h4>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap mb-6">
                    {["TODOS", "ALTO", "MEDIO", "BAJO", "MINIMO"].map(
                      (risk) => (
                        <button
                          key={risk}
                          onClick={() => setPlagiarismRiskFilter(risk as any)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            plagiarismRiskFilter === risk
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {risk}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="space-y-4">
                    {getFilteredPlagiarismMatches().map(
                      (match: any, index: number) => (
                        <div key={index} className="border rounded-2xl p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span
                                className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold ${getRiskBadgeClass(
                                  match.risk,
                                )}`}
                              >
                                Riesgo {match.risk}
                              </span>

                              <h4 className="font-bold mt-3 text-lg">
                                {match.question}
                              </h4>

                              <p className="text-sm text-slate-500 mt-1">
                                Tipo: {match.type}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-slate-500">
                                Similitud
                              </p>
                              <h4 className="text-3xl font-bold">
                                {match.similarity}%
                              </h4>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                            <div className="bg-slate-50 rounded-xl p-4">
                              <p className="font-semibold">
                                {match.studentA.name}
                              </p>

                              <p className="text-slate-700 whitespace-pre-wrap">
                                {match.answerA || "Sin respuesta textual"}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4">
                              <p className="font-semibold">
                                {match.studentB.name}
                              </p>

                              <p className="text-slate-700 whitespace-pre-wrap">
                                {match.answerB || "Sin respuesta textual"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}

                    {getFilteredPlagiarismMatches().length === 0 && (
                      <div className="border rounded-xl p-8 text-center text-slate-500">
                        No hay coincidencias para el filtro seleccionado.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {examDetailTab === "security" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">Reporte de seguridad</h3>
                <p className="text-slate-500 mt-1">
                  Actividades registradas durante el examen.
                </p>
              </div>

              <button
                disabled={loadingSecurityLogs}
                onClick={() => loadSecurityLogsByExam(selectedExam.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
              >
                {loadingSecurityLogs ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            {securityLogs.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border rounded-xl p-5">
                    <p className="text-sm text-slate-500">
                      Eventos registrados
                    </p>
                    <h4 className="text-3xl font-bold mt-2">
                      {securityLogs.length}
                    </h4>
                  </div>

                  <div className="border rounded-xl p-5">
                    <p className="text-sm text-slate-500">Cambios de pestaña</p>
                    <h4 className="text-3xl font-bold mt-2 text-red-600">
                      {
                        securityLogs.filter(
                          (log) => log.type === "CAMBIO_PESTAÑA",
                        ).length
                      }
                    </h4>
                  </div>

                  <div className="border rounded-xl p-5">
                    <p className="text-sm text-slate-500">Copiar / pegar</p>
                    <h4 className="text-3xl font-bold mt-2 text-orange-600">
                      {
                        securityLogs.filter(
                          (log) =>
                            log.type === "COPIAR" || log.type === "PEGAR",
                        ).length
                      }
                    </h4>
                  </div>

                  <div className="border rounded-xl p-5">
                    <p className="text-sm text-slate-500">
                      Estudiantes observados
                    </p>
                    <h4 className="text-3xl font-bold mt-2">
                      {getSecuritySummaryByStudent().length}
                    </h4>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border">
                  <h4 className="text-xl font-bold mb-4">
                    Riesgo automático por estudiante
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-3">Estudiante</th>
                          <th className="py-3">Cambios pestaña</th>
                          <th className="py-3">Copiar</th>
                          <th className="py-3">Pegar</th>
                          <th className="py-3">Puntaje sospecha</th>
                          <th className="py-3">Riesgo</th>
                        </tr>
                      </thead>

                      <tbody>
                        {getSecuritySummaryByStudent().map((student) => (
                          <tr key={student.studentId} className="border-b">
                            <td className="py-4 font-semibold">
                              {student.studentName}
                            </td>

                            <td className="py-4">{student.tabChanges}</td>
                            <td className="py-4">{student.copyEvents}</td>
                            <td className="py-4">{student.pasteEvents}</td>
                            <td className="py-4">{student.suspiciousScore}</td>

                            <td className="py-4">
                              <span
                                className={`px-3 py-2 rounded-xl text-xs font-medium ${getSecurityRiskClass(
                                  student.risk,
                                )}`}
                              >
                                {student.risk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <h4 className="text-xl font-bold mb-4">Detalle de eventos</h4>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-3">Estudiante</th>
                        <th className="py-3">Evento</th>
                        <th className="py-3">Detalle</th>
                        <th className="py-3">Fecha</th>
                      </tr>
                    </thead>

                    <tbody>
                      {securityLogs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="py-4 font-semibold">
                            {log.student.name}
                          </td>

                          <td className="py-4">
                            <span
                              className={`px-3 py-2 rounded-xl text-xs font-medium ${getSecurityEventClass(
                                log.type,
                              )}`}
                            >
                              {log.type}
                            </span>
                          </td>

                          <td className="py-4 text-slate-600">
                            {log.detail || "Sin detalle"}
                          </td>

                          <td className="py-4 text-slate-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border border-dashed rounded-2xl p-12 text-center text-slate-500">
                No hay eventos de seguridad registrados para este examen.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (view === "courseDetail" && selectedCourse) {
    const filteredUsers = users.filter((user) => {
      const search = userSearch.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);

      const matchesRole = user.role === memberRole;

      const alreadyMember = members.some(
        (member) => member.user.id === user.id,
      );

      return matchesSearch && matchesRole && !alreadyMember;
    });

    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Gestionar materia
            </h2>
            <p className="text-slate-500 mt-1">
              {selectedCourse.name} • {selectedCourse.code} • Grupo{" "}
              {selectedCourse.group}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedCourse(null);
              setMembers([]);
              setActiveTab("info");
              setView("courses");
            }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-3 rounded-xl"
          >
            Volver a materias
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              activeTab === "info"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Información
          </button>

          <button
            onClick={() => setActiveTab("exams")}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              activeTab === "exams"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Exámenes
          </button>

          {!isStudent && (
            <button
              onClick={() => {
                setActiveTab("members");

                if (selectedCourse) {
                  loadMembers(selectedCourse.id);
                }
              }}
              className={`px-5 py-3 rounded-xl text-sm font-medium ${
                activeTab === "members"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              Participantes
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab("stats");

              if (selectedCourse) {
                loadCourseReport(selectedCourse.id);
              }
            }}
            className={`px-5 py-3 rounded-xl text-sm font-medium ${
              activeTab === "stats"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Estadísticas
          </button>
        </div>

        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {activeTab === "info" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h3 className="text-2xl font-bold mb-6">
              Información de la materia
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border rounded-xl p-5">
                <p className="text-sm text-slate-500">Nombre</p>
                <h4 className="text-xl font-bold mt-2">
                  {selectedCourse.name}
                </h4>
              </div>

              <div className="border rounded-xl p-5">
                <p className="text-sm text-slate-500">Sigla</p>
                <h4 className="text-xl font-bold mt-2">
                  {selectedCourse.code}
                </h4>
              </div>

              <div className="border rounded-xl p-5">
                <p className="text-sm text-slate-500">Grupo</p>
                <h4 className="text-xl font-bold mt-2">
                  {selectedCourse.group}
                </h4>
              </div>
            </div>

            <div className="border rounded-xl p-5 mt-6">
              <p className="text-sm text-slate-500">Descripción</p>
              <p className="text-slate-700 mt-2">
                {selectedCourse.description || "Sin descripción"}
              </p>
            </div>
          </div>
        )}

        {activeTab === "exams" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Exámenes</h3>
                <p className="text-slate-500 mt-1">
                  Exámenes asociados a esta materia.
                </p>
              </div>

              {!isStudent && examView === "list" && (
                <button
                  onClick={openCreateExamForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                >
                  {editingExam ? "Editar examen" : "Crear examen"}
                </button>
              )}
            </div>

            {examView === "form" && (
              <div className="mt-6 border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-xl font-bold">
                      {editingExam ? "Editar examen" : "Crear examen"}
                    </h4>
                    <p className="text-slate-500 text-sm mt-1">
                      Materia: {selectedCourse.name} ({selectedCourse.code})
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      resetExamForm();
                      setExamView("list");
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl"
                  >
                    Cancelar
                  </button>
                </div>

                <form onSubmit={handleCreateExam} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium">
                      Título del examen
                    </label>
                    <input
                      className="w-full mt-1 px-4 py-3 border rounded-xl"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="Ej: Primer Parcial de Programación"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">
                        Tipo de examen
                      </label>
                      <select
                        className="w-full mt-1 px-4 py-3 border rounded-xl"
                        value={examType}
                        onChange={(e) =>
                          setExamType(
                            e.target.value as
                              | "TEORICO"
                              | "PROGRAMACION"
                              | "MIXTO",
                          )
                        }
                      >
                        <option value="TEORICO">Teórico</option>
                        <option value="PROGRAMACION">Programación</option>
                        <option value="MIXTO">Mixto</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Estado</label>
                      <select
                        className="w-full mt-1 px-4 py-3 border rounded-xl"
                        value={examStatus}
                        onChange={(e) =>
                          setExamStatus(
                            e.target.value as
                              | "BORRADOR"
                              | "PUBLICADO"
                              | "EN_EVALUACION"
                              | "FINALIZADO",
                          )
                        }
                      >
                        <option value="BORRADOR">Borrador</option>
                        <option value="PUBLICADO">Publicado</option>
                        <option value="EN_EVALUACION">En evaluación</option>
                        <option value="FINALIZADO">Finalizado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">
                        Fecha del examen
                      </label>
                      <input
                        type="date"
                        className="w-full mt-1 px-4 py-3 border rounded-xl"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Duración del examen en minutos
                      </label>

                      <input
                        type="number"
                        className="w-full mt-1 px-4 py-3 border rounded-xl"
                        value={examDurationMinutes}
                        onChange={(e) => setExamDurationMinutes(e.target.value)}
                        placeholder="Ej: 60"
                        min={1}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Hora del examen
                      </label>
                      <input
                        type="time"
                        className="w-full mt-1 px-4 py-3 border rounded-xl"
                        value={examTime}
                        onChange={(e) => setExamTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <textarea
                      className="w-full mt-1 px-4 py-3 border rounded-xl"
                      value={examDescription}
                      onChange={(e) => setExamDescription(e.target.value)}
                      placeholder="Describe el objetivo o instrucciones generales del examen"
                    />
                  </div>

                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
                    {editingExam ? "Guardar cambios" : "Guardar examen"}
                  </button>
                </form>
              </div>
            )}

            {examView === "list" && (
              <div className="mt-6 space-y-4">
                {exams
                  .filter((exam) => exam.course?.id === selectedCourse.id)
                  .map((exam) => (
                    <div
                      key={exam.id}
                      className="border rounded-2xl p-5 flex items-start justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-xl font-bold">{exam.title}</h4>

                        <p className="text-sm text-slate-500 mt-1">
                          {exam.type} • {exam.status}
                        </p>

                        <div className="flex gap-3 mt-4 flex-wrap">
                          {exam.examDate && (
                            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm">
                              {new Date(exam.examDate).toLocaleDateString()}
                            </span>
                          )}

                          {exam.examTime && (
                            <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm">
                              {exam.examTime}
                            </span>
                          )}

                          <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm">
                            {exam.questions?.length || 0} preguntas
                          </span>
                        </div>

                        {exam.description && (
                          <p className="text-slate-600 mt-4">
                            {exam.description}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => openExamDetails(exam)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm"
                        >
                          Gestionar examen
                        </button>

                        {!isStudent && (
                          <>
                            <button
                              onClick={() => openEditExamForm(exam)}
                              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => handleDeleteExam(exam.id)}
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                {exams.filter((exam) => exam.course?.id === selectedCourse.id)
                  .length === 0 && (
                  <div className="border rounded-2xl p-8 text-center text-slate-500">
                    Esta materia todavía no tiene exámenes registrados.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && !isStudent && (
          <div className="space-y-6">
            {isAdmin && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="text-2xl font-bold mb-6">
                  Agregar participante
                </h3>

                <form
                  onSubmit={handleAddMember}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="text-sm font-medium">
                      Buscar usuario
                    </label>

                    <input
                      className="w-full mt-1 px-4 py-3 border rounded-xl"
                      placeholder={
                        memberRole === "DOCENTE"
                          ? "Buscar docente por nombre o correo"
                          : "Buscar estudiante por nombre o correo"
                      }
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setSelectedUserId("");
                      }}
                    />

                    <select
                      className="w-full mt-3 px-4 py-3 border rounded-xl"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">Seleccionar usuario</option>

                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.email} ({user.role})
                        </option>
                      ))}
                    </select>

                    {filteredUsers.length === 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        No se encontraron usuarios disponibles.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Rol en la materia
                    </label>

                    <select
                      className="w-full mt-1 px-4 py-3 border rounded-xl"
                      value={memberRole}
                      onChange={(e) => {
                        setMemberRole(
                          e.target.value as "DOCENTE" | "ESTUDIANTE",
                        );
                        setSelectedUserId("");
                        setUserSearch("");
                      }}
                    >
                      <option value="ESTUDIANTE">Estudiante</option>
                      <option value="DOCENTE">Docente</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
                      Agregar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-2xl font-bold mb-6">
                Participantes de la materia
              </h3>

              {members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="border rounded-xl p-5 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-bold">{member.user.name}</h4>

                        <p className="text-sm text-slate-500">
                          {member.user.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="bg-slate-100 px-3 py-2 rounded-xl text-xs">
                          {member.role}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-2xl p-8 text-center text-slate-500">
                  No hay participantes registrados.
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {reportView === "class" && classReport ? (
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setReportView("course");
                    setClassReport(null);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl"
                >
                  Volver al reporte del curso
                </button>

                <button
                  onClick={exportClassReportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
                >
                  Exportar Excel
                </button>

                <button
                  onClick={exportClassReportToPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl"
                >
                  Exportar PDF
                </button>

                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-2xl font-bold">Reporte de clase</h3>
                  <p className="text-slate-500 mt-1">
                    {classReport.course.name} • {classReport.course.code}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-3">Estudiante</th>

                        {classReport.exams.map((exam: any) => (
                          <th key={exam.id} className="py-3">
                            {exam.title}
                          </th>
                        ))}

                        <th className="py-3">Promedio</th>
                      </tr>
                    </thead>

                    <tbody>
                      {classReport.rows.map((row: any) => (
                        <tr key={row.studentId} className="border-b">
                          <td className="py-4">
                            <p className="font-semibold">{row.studentName}</p>
                          </td>

                          {row.scores.map((score: any) => (
                            <td key={score.examId} className="py-4">
                              {score.finalScore !== null ? (
                                <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-medium">
                                  {score.finalScore}
                                </span>
                              ) : score.status === "NO_ENVIADO" ? (
                                <span className="bg-red-100 text-red-700 px-3 py-2 rounded-xl text-xs font-medium">
                                  No enviado
                                </span>
                              ) : (
                                <span className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl text-xs font-medium">
                                  Pendiente
                                </span>
                              )}
                            </td>
                          ))}

                          <td className="py-4 font-bold">{row.average}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : reportView === "student" && studentReport ? (
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setReportView("course");
                    setStudentReport(null);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl"
                >
                  Volver al reporte del curso
                </button>

                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-2xl font-bold">
                    Reporte individual de {studentReport.student.name}
                  </h3>

                  <p className="text-slate-500 mt-1">
                    {studentReport.course.name} • {studentReport.course.code}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border">
                    <p className="text-sm text-slate-500">Promedio</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {studentReport.summary.averageScore}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border">
                    <p className="text-sm text-slate-500">Exámenes enviados</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {studentReport.summary.submittedExams}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border">
                    <p className="text-sm text-slate-500">Pendientes</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {studentReport.summary.pendingExams}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border">
                    <p className="text-sm text-slate-500">Nota más alta</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {studentReport.summary.highestScore}
                    </h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-2xl font-bold mb-6">
                    Detalle de exámenes
                  </h3>

                  <div className="space-y-5">
                    {studentReport.exams.map((exam: any) => (
                      <div key={exam.examId} className="border rounded-2xl p-5">
                        <div className="flex justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-bold">
                              {exam.examTitle}
                            </h4>
                            <p className="text-slate-500 mt-1">
                              Estado: {exam.submissionStatus}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-slate-500">Nota final</p>
                            <h4 className="text-2xl font-bold">
                              {exam.finalScore ?? "Pendiente"}
                            </h4>
                          </div>
                        </div>

                        <div className="mt-5 space-y-4">
                          {exam.answers.map((answer: any) => (
                            <div
                              key={answer.answerId}
                              className="bg-slate-50 rounded-xl p-4"
                            >
                              <p className="font-semibold">
                                {answer.questionStatement}
                              </p>

                              <p className="text-sm text-slate-500 mt-2">
                                Puntaje: {answer.finalScore ?? "Pendiente"} /{" "}
                                {answer.maxScore}
                              </p>

                              {answer.feedback && (
                                <p className="text-slate-700 mt-3 whitespace-pre-wrap">
                                  <strong>Feedback:</strong> {answer.feedback}
                                </p>
                              )}
                            </div>
                          ))}

                          {exam.answers.length === 0 && (
                            <p className="text-slate-500">
                              Este examen todavía no fue enviado por el
                              estudiante.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : !courseReport ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border text-center text-slate-500">
                Cargando reporte...
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <button
                    disabled={loadingClassReport}
                    onClick={() => {
                      if (!selectedCourse) return;

                      loadClassReport(selectedCourse.id);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                  >
                    {loadingClassReport
                      ? "Cargando..."
                      : "Ver reporte de clase"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <p className="text-sm text-slate-500">Promedio general</p>
                    <h3 className="text-4xl font-bold mt-3">
                      {courseReport.summary.averageScore}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <p className="text-sm text-slate-500">Nota más alta</p>
                    <h3 className="text-4xl font-bold mt-3">
                      {courseReport.summary.highestScore}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <p className="text-sm text-slate-500">Nota más baja</p>
                    <h3 className="text-4xl font-bold mt-3">
                      {courseReport.summary.lowestScore}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <p className="text-sm text-slate-500">
                      Entregas calificadas
                    </p>
                    <h3 className="text-4xl font-bold mt-3">
                      {courseReport.summary.totalGradedSubmissions}
                    </h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-2xl font-bold mb-6">
                    Distribución de notas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">0 - 50</p>
                      <h4 className="text-3xl font-bold mt-2">
                        {courseReport.gradeDistribution.low}
                      </h4>
                    </div>

                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">51 - 70</p>
                      <h4 className="text-3xl font-bold mt-2">
                        {courseReport.gradeDistribution.medium}
                      </h4>
                    </div>

                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">71 - 85</p>
                      <h4 className="text-3xl font-bold mt-2">
                        {courseReport.gradeDistribution.good}
                      </h4>
                    </div>

                    <div className="border rounded-xl p-5">
                      <p className="text-sm text-slate-500">86 - 100</p>
                      <h4 className="text-3xl font-bold mt-2">
                        {courseReport.gradeDistribution.excellent}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="text-2xl font-bold mb-6">
                      Distribución gráfica de notas
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "0 - 50",
                              value: courseReport.gradeDistribution.low,
                            },
                            {
                              name: "51 - 70",
                              value: courseReport.gradeDistribution.medium,
                            },
                            {
                              name: "71 - 85",
                              value: courseReport.gradeDistribution.good,
                            },
                            {
                              name: "86 - 100",
                              value: courseReport.gradeDistribution.excellent,
                            },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          <Cell fill="#ef4444" />
                          <Cell fill="#f97316" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#22c55e" />
                        </Pie>

                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="text-2xl font-bold mb-6">
                      Tendencia del curso
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <XAxis dataKey="examen" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="promedio"
                          stroke="#2563eb"
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    <p className="text-slate-500 text-sm mt-4">
                      Evolución del promedio general del curso por examen.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border overflow-x-auto">
                  <h3 className="text-2xl font-bold mb-6">
                    Rendimiento por estudiante
                  </h3>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-3">Estudiante</th>
                        <th className="py-3">Examen</th>
                        <th className="py-3">Estado</th>
                        <th className="py-3">Nota IA</th>
                        <th className="py-3">Nota final</th>
                        <th className="py-3">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {courseReport.studentPerformance.map(
                        (item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="py-4">
                              <p className="font-semibold">
                                {item.studentName}
                              </p>
                            </td>

                            <td className="py-4">{item.examTitle}</td>
                            <td className="py-4">{item.status}</td>
                            <td className="py-4">
                              {item.aiScore ?? "Pendiente"}
                            </td>
                            <td className="py-4">
                              {item.finalScore ?? "Pendiente"}
                            </td>

                            <td className="py-4">
                              <button
                                disabled={loadingStudentReport}
                                onClick={() => {
                                  if (!selectedCourse) return;

                                  loadStudentReport(
                                    selectedCourse.id,
                                    item.studentId,
                                  );
                                }}
                                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm"
                              >
                                {loadingStudentReport
                                  ? "Cargando..."
                                  : "Ver reporte"}
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-2xl font-bold mb-6">
                    Preguntas con mayor dificultad
                  </h3>

                  <div className="space-y-4">
                    {courseReport.difficultQuestions.map((question: any) => (
                      <div
                        key={question.questionId}
                        className="border rounded-xl p-5"
                      >
                        <p className="text-sm text-slate-500">
                          {question.type} • Dificultad{" "}
                          {question.difficultyPercent}%
                        </p>

                        <h4 className="font-bold mt-2">{question.statement}</h4>

                        <p className="text-slate-600 mt-2">
                          Promedio obtenido: {question.averageObtained} /{" "}
                          {question.maxScore}
                        </p>
                      </div>
                    ))}

                    {courseReport.difficultQuestions.length === 0 && (
                      <p className="text-slate-500">
                        No hay preguntas evaluadas todavía.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-2xl font-bold mb-6">
                    Errores frecuentes detectados
                  </h3>

                  <div className="space-y-4">
                    {courseReport.frequentErrors.map(
                      (errorItem: any, index: number) => (
                        <div key={index} className="border rounded-xl p-5">
                          <p className="text-sm text-slate-500">
                            {errorItem.studentName}
                          </p>

                          <h4 className="font-bold mt-2">
                            {errorItem.question}
                          </h4>

                          <p className="text-slate-600 mt-2">
                            {errorItem.feedback}
                          </p>
                        </div>
                      ),
                    )}

                    {courseReport.frequentErrors.length === 0 && (
                      <p className="text-slate-500">
                        No hay feedback registrado todavía.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (view === "courseForm") {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {editingCourse ? "Editar materia" : "Crear materia"}
            </h2>
            <p className="text-slate-500 mt-1">
              {editingCourse
                ? "Actualiza los datos de la materia seleccionada."
                : "Registra una nueva materia académica."}
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setView("courses");
            }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-3 rounded-xl"
          >
            Volver al listado
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitCourse} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <input
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Programación I"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Sigla</label>
                <input
                  className="w-full mt-1 px-4 py-3 border rounded-xl"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej: INF-121"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Grupo</label>
                <input
                  className="w-full mt-1 px-4 py-3 border rounded-xl"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="Ej: SB"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción breve de la materia"
              />
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
              {editingCourse ? "Guardar cambios" : "Guardar materia"}
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
          <h2 className="text-3xl font-bold text-slate-900">
            {isStudent ? "Mis materias" : "Materias"}
          </h2>
          <p className="text-slate-500 mt-1">
            {isStudent
              ? "Materias en las que estás matriculado."
              : "Listado de materias registradas en el sistema."}
          </p>
        </div>

        {!isStudent && (
          <button
            onClick={openCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
          >
            Crear materia
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h3 className="text-2xl font-bold mb-6">
          {isStudent ? "Mis materias" : "Materias registradas"}
        </h3>

        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="border rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-bold">{course.name}</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {course.code} • Grupo {course.group}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-medium">
                    {course.code}
                  </div>

                  <button
                    onClick={() => openCourseDetails(course)}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Gestionar
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditForm(course)}
                        className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {course.description && (
                <p className="text-slate-600 mt-4">{course.description}</p>
              )}
            </div>
          ))}

          {courses.length === 0 && (
            <p className="text-slate-500">
              {isStudent
                ? "No tienes materias asignadas."
                : "No hay materias registradas"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoursesPage;

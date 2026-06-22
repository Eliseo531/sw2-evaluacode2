import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

type Course = {
  id: number;
  name: string;
  code: string;
  group?: string;
};

type Question = {
  id: number;
  examId: number;
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
  submissions?: {
    id: number;
    status: string;
    submittedAt: string;
    aiScore?: number | null;
    finalScore?: number | null;
  }[];
};

type EvaluationAnswer = {
  id: number;
  content: string;
  fileUrl?: string | null;
  aiScore?: number | null;
  finalScore?: number | null;
  feedback?: string | null;
  question: Question;
};

type Evaluation = {
  id: number;
  status: string;
  submittedAt: string;
  aiScore?: number | null;
  finalScore?: number | null;
  exam: Exam;
  answers: EvaluationAnswer[];
};

function ExamsPage() {
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isStudent = currentUser?.role === "ESTUDIANTE";

  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [view, setView] = useState<"list" | "form" | "answer" | "evaluation">(
    "list",
  );
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState<
    "BORRADOR" | "PUBLICADO" | "EN_EVALUACION" | "FINALIZADO"
  >("BORRADOR");

  const [type, setType] = useState<"TEORICO" | "PROGRAMACION" | "MIXTO">(
    "TEORICO",
  );

  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerFiles, setAnswerFiles] = useState<Record<number, string>>({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadExams() {
    try {
      const data = await apiRequest("/exams");
      setExams(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar exámenes");
    }
  }

  async function loadCourses() {
    try {
      const data = await apiRequest("/courses");
      setCourses(data);
    } catch (error: any) {
      setError(error.message || "Error al cargar materias");
    }
  }

  useEffect(() => {
    loadExams();

    if (!isStudent) {
      loadCourses();
    }
  }, []);

  function getExamAvailability(exam: Exam) {
    if (!exam.examDate || !exam.examTime || !exam.durationMinutes) {
      return {
        status: "SIN_CONFIGURAR",
        message: "Examen sin configuración",
      };
    }

    const dateOnly = new Date(exam.examDate).toISOString().split("T")[0];

    const startDate = new Date(`${dateOnly}T${exam.examTime}:00`);

    const endDate = new Date(
      startDate.getTime() + exam.durationMinutes * 60000,
    );

    const now = new Date();

    if (now < startDate) {
      return {
        status: "PENDIENTE",
        message: "Aún no habilitado",
      };
    }

    if (now > endDate) {
      return {
        status: "CERRADO",
        message: "Tiempo finalizado",
      };
    }

    return {
      status: "DISPONIBLE",
      message: "Disponible",
    };
  }

  function getExamEndTime(exam: Exam) {
    if (!exam.examDate || !exam.examTime || !exam.durationMinutes) {
      return null;
    }

    const dateOnly = new Date(exam.examDate).toISOString().split("T")[0];

    const start = new Date(`${dateOnly}T${exam.examTime}:00`);

    const end = new Date(start.getTime() + exam.durationMinutes * 60000);

    return end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCourseId("");
    setStatus("BORRADOR");
    setType("TEORICO");
    setExamDate("");
    setExamTime("");
    setEditingExam(null);
  }

  function openCreateForm() {
    resetForm();
    setError("");
    setSuccess("");
    setView("form");
  }

  function openEditForm(exam: Exam) {
    setEditingExam(exam);
    setTitle(exam.title);
    setDescription(exam.description || "");
    setCourseId(String(exam.course.id));
    setStatus(exam.status);
    setType(exam.type);
    setExamDate(exam.examDate ? exam.examDate.split("T")[0] : "");
    setExamTime(exam.examTime || "");
    setView("form");
  }

  function openAnswerExam(exam: Exam) {
    setSelectedExam(exam);
    setAnswers({});
    setAnswerFiles({});
    setError("");
    setSuccess("");
    setView("answer");

    registerExamActivity(
      exam.id,
      "INICIO_EXAMEN",
      "El estudiante inició el examen",
    );
  }

  async function openEvaluation(exam: Exam) {
    try {
      setError("");
      setSuccess("");

      const data = await apiRequest(`/submissions/my/exam/${exam.id}`);

      setSelectedExam(exam);
      setEvaluation(data);
      setView("evaluation");
    } catch (error: any) {
      setError(error.message || "Error al cargar evaluación");
    }
  }

  async function uploadAnswerImage(questionId: number, file: File) {
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/submissions/answer-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error al subir imagen");
    }

    setAnswerFiles((prev) => ({
      ...prev,
      [questionId]: data.fileUrl,
    }));
  }

  async function handleSubmitExam(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !courseId) {
      setError("El título y la materia son obligatorios");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const body = {
        title,
        description,
        courseId: Number(courseId),
        status,
        type,
        examDate,
        examTime,
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

      resetForm();
      await loadExams();
      setView("list");
    } catch (error: any) {
      setError(error.message || "Error al guardar examen");
    }
  }

  async function handleDeleteExam(examId: number) {
    if (!window.confirm("¿Seguro que deseas eliminar este examen?")) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/exams/${examId}`, {
        method: "DELETE",
      });

      setSuccess("Examen eliminado correctamente");
      loadExams();
    } catch (error: any) {
      setError(error.message || "Error al eliminar examen");
    }
  }

  async function registerExamActivity(
    examId: number,
    type: string,
    detail?: string,
  ) {
    try {
      await apiRequest("/security/activity", {
        method: "POST",
        body: JSON.stringify({
          examId,
          type,
          detail,
        }),
      });
    } catch (error) {
      console.error("Error registrando actividad:", error);
    }
  }
  useEffect(() => {
    if (view !== "answer" || !selectedExam) return;

    const examId = selectedExam.id;

    function handleVisibilityChange() {
      if (document.hidden) {
        registerExamActivity(
          examId,
          "CAMBIO_PESTAÑA",
          "El estudiante salió de la pestaña del examen",
        );
      }
    }

    function handleCopy() {
      registerExamActivity(
        examId,
        "COPIAR",
        "El estudiante copió contenido durante el examen",
      );
    }

    function handlePaste() {
      registerExamActivity(
        examId,
        "PEGAR",
        "El estudiante pegó contenido durante el examen",
      );
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [view, selectedExam]);

  async function handleSendAnswers(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedExam) return;

    const formattedAnswers = selectedExam.questions.map((question) => ({
      questionId: question.id,
      content: answers[question.id] || "",
      fileUrl: answerFiles[question.id] || null,
    }));

    const hasEmptyAnswer = formattedAnswers.some((answer) => {
      return !answer.content.trim() && !answer.fileUrl;
    });

    if (hasEmptyAnswer) {
      setError(
        "Debes responder todas las preguntas con texto o subir una imagen antes de enviar el examen",
      );
      return;
    }

    try {
      setError("");
      setSuccess("");

      await apiRequest("/submissions", {
        method: "POST",
        body: JSON.stringify({
          examId: selectedExam.id,
          answers: formattedAnswers,
        }),
      });

      await registerExamActivity(
        selectedExam.id,
        "ENVIO_EXAMEN",
        "El estudiante envió el examen",
      );

      setSuccess("Examen enviado correctamente");
      setSelectedExam(null);
      setAnswers({});
      setAnswerFiles({});
      setView("list");

      await loadExams();
    } catch (error: any) {
      setError(error.message || "Error al enviar examen");
    }
  }

  if (view === "evaluation" && selectedExam && evaluation) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Evaluación del examen
            </h2>

            <p className="text-slate-500 mt-1">
              {selectedExam.title} • {selectedExam.course?.name}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedExam(null);
              setEvaluation(null);
              setView("list");
            }}
            className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl"
          >
            Volver a mis exámenes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Estado</p>
            <h3 className="text-xl font-bold mt-2">{evaluation.status}</h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Nota IA</p>
            <h3 className="text-xl font-bold mt-2">
              {evaluation.aiScore ?? "Pendiente"}
            </h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Nota final</p>
            <h3 className="text-xl font-bold mt-2">
              {evaluation.finalScore ?? "Pendiente"}
            </h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Fecha de envío</p>
            <h3 className="text-sm font-bold mt-2">
              {new Date(evaluation.submittedAt).toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="text-2xl font-bold mb-6">Detalle por pregunta</h3>

          <div className="space-y-5">
            {evaluation.answers.map((answer, index) => (
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
                  <p className="text-sm text-slate-500 mb-2">Tu respuesta</p>

                  <p className="text-slate-800 whitespace-pre-wrap">
                    {answer.content || "Respuesta por imagen"}
                  </p>

                  {answer.fileUrl && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-500 mb-2">
                        Imagen enviada
                      </p>

                      <img
                        src={answer.fileUrl}
                        alt="Respuesta enviada"
                        className="max-w-xl rounded-xl border shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {answer.feedback && (
                  <div className="mt-4 bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-700 font-semibold mb-2">
                      Feedback
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
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (view === "answer" && selectedExam) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Responder examen
            </h2>

            <p className="text-slate-500 mt-1">
              {selectedExam.title} • {selectedExam.course?.name}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedExam(null);
              setAnswers({});
              setAnswerFiles({});
              setView("list");
            }}
            className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl"
          >
            Volver
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

        <form onSubmit={handleSendAnswers} className="space-y-6">
          {selectedExam.questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white rounded-2xl p-6 shadow-sm border"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Pregunta {index + 1} • {question.type}
                  </p>

                  <h3 className="text-xl font-bold mt-2">
                    {question.statement}
                  </h3>
                </div>

                <div className="bg-slate-100 px-4 py-2 rounded-xl text-sm h-fit">
                  {question.score} pts
                </div>
              </div>

              <textarea
                className="w-full mt-5 px-4 py-3 border rounded-xl min-h-36"
                placeholder={
                  question.type === "CODIGO"
                    ? "Escribe aquí tu código o explicación..."
                    : question.type === "DIAGRAMA_FLUJO"
                      ? "Describe aquí la lógica de tu diagrama..."
                      : "Escribe tu respuesta..."
                }
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [question.id]: e.target.value,
                  })
                }
              />

              {(question.type === "CODIGO" ||
                question.type === "DIAGRAMA_FLUJO") && (
                <div className="mt-4">
                  <label className="text-sm font-medium">
                    Subir imagen del código o diagrama
                  </label>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="w-full mt-1 px-4 py-3 border rounded-xl"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];

                      if (!file) return;

                      try {
                        setError("");
                        await uploadAnswerImage(question.id, file);
                      } catch (error: any) {
                        setError(error.message || "Error al subir imagen");
                      }
                    }}
                  />

                  {answerFiles[question.id] && (
                    <div className="mt-3">
                      <p className="text-green-600 text-sm mb-2">
                        Imagen subida correctamente
                      </p>

                      <img
                        src={answerFiles[question.id]}
                        alt="Imagen enviada por el estudiante"
                        className="max-w-xl rounded-xl border shadow-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {selectedExam.questions.length === 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border text-center text-slate-500">
              Este examen todavía no tiene preguntas registradas.
            </div>
          )}

          {selectedExam.questions.length > 0 && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
              Enviar examen
            </button>
          )}
        </form>
      </div>
    );
  }

  if (view === "form" && !isStudent) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              {editingExam ? "Editar examen" : "Crear examen"}
            </h2>

            <p className="text-slate-500 mt-1">
              Configura un examen para una materia.
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

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <form onSubmit={handleSubmitExam} className="space-y-5">
            <div>
              <label className="text-sm font-medium">Título</label>

              <input
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Primer Parcial"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Materia</label>

              <select
                className="w-full mt-1 px-4 py-3 border rounded-xl"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Seleccionar materia</option>

                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo de examen</label>

                <select
                  className="w-full mt-1 px-4 py-3 border rounded-xl"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
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
                <label className="text-sm font-medium">Fecha</label>

                <input
                  type="date"
                  className="w-full mt-1 px-4 py-3 border rounded-xl"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Hora</label>

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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el objetivo del examen"
              />
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
              {editingExam ? "Guardar cambios" : "Crear examen"}
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
          <h2 className="text-3xl font-bold">
            {isStudent ? "Mis exámenes" : "Exámenes"}
          </h2>

          <p className="text-slate-500 mt-1">
            {isStudent
              ? "Exámenes asignados a tus materias."
              : "Gestiona exámenes por materia."}
          </p>
        </div>

        {!isStudent && (
          <button
            onClick={openCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
          >
            Crear examen
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

      <div className="space-y-4">
        {exams.map((exam) => {
          const alreadySubmitted =
            exam.submissions && exam.submissions.length > 0;

          const availability = getExamAvailability(exam);

          return (
            <div
              key={exam.id}
              className="bg-white rounded-2xl p-6 shadow-sm border"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="text-2xl font-bold">{exam.title}</h3>

                  <p className="text-slate-500 mt-1">
                    {exam.course?.name} ({exam.course?.code})
                  </p>

                  <div className="flex gap-3 mt-4 flex-wrap">
                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm">
                      {exam.type}
                    </span>

                    <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm">
                      {exam.status}
                    </span>

                    {exam.examDate && (
                      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm">
                        {new Date(exam.examDate).toLocaleDateString()} • Inicio
                      </span>
                    )}

                    {exam.examTime && (
                      <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm">
                        {exam.examTime} hrs
                      </span>
                    )}

                    {exam.durationMinutes && (
                      <span className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm">
                        {exam.durationMinutes} min
                      </span>
                    )}

                    {exam.durationMinutes && (
                      <span className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm">
                        Finaliza: {getExamEndTime(exam)}
                      </span>
                    )}

                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm">
                      {exam.questions?.length || 0} preguntas
                    </span>

                    {isStudent && alreadySubmitted && (
                      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm">
                        Enviado
                      </span>
                    )}

                    {isStudent && !alreadySubmitted && (
                      <span
                        className={`px-4 py-2 rounded-xl text-sm ${
                          availability.status === "DISPONIBLE"
                            ? "bg-green-100 text-green-700"
                            : availability.status === "PENDIENTE"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {availability.message}
                      </span>
                    )}
                  </div>

                  {exam.description && (
                    <p className="text-slate-600 mt-5">{exam.description}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  {isStudent ? (
                    alreadySubmitted ? (
                      exam.submissions?.[0]?.status === "PUBLICADO" ? (
                        <button
                          onClick={() => openEvaluation(exam)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm"
                        >
                          Ver evaluación
                        </button>
                      ) : (
                        <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium">
                          Resultado pendiente
                        </div>
                      )
                    ) : availability.status === "DISPONIBLE" ? (
                      <button
                        onClick={() => openAnswerExam(exam)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm"
                      >
                        Ver / responder
                      </button>
                    ) : (
                      <div
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                          availability.status === "PENDIENTE"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {availability.message}
                      </div>
                    )
                  ) : (
                    <>
                      <button
                        onClick={() => openEditForm(exam)}
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
            </div>
          );
        })}

        {exams.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border text-center text-slate-500">
            {isStudent
              ? "No tienes exámenes asignados todavía."
              : "No hay exámenes registrados."}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamsPage;

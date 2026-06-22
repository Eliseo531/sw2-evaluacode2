import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

type Exam = {
  id: number;
  title: string;
};

type Question = {
  id: number;
  examId: number;
  type: string;
  statement: string;
  expectedAnswer?: string;
  score: number;
  rubric?: string;
};

function QuestionsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [examId, setExamId] = useState("");
  const [type, setType] = useState("TEORICA");
  const [statement, setStatement] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [score, setScore] = useState("");
  const [rubric, setRubric] = useState("");

  async function loadExams() {
    const data = await apiRequest("/exams");
    setExams(data);
  }

  async function loadQuestions(selectedExamId: string) {
    if (!selectedExamId) return;

    const data = await apiRequest(`/questions/exam/${selectedExamId}`);
    setQuestions(data);
  }

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    loadQuestions(examId);
  }, [examId]);

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();

    await apiRequest("/questions", {
      method: "POST",
      body: JSON.stringify({
        examId,
        type,
        statement,
        expectedAnswer,
        score: Number(score),
        rubric,
      }),
    });

    setType("TEORICA");
    setStatement("");
    setExpectedAnswer("");
    setScore("");
    setRubric("");

    loadQuestions(examId);
  }

  return (
    <div className="p-8 space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-2xl font-bold mb-6">Registrar pregunta</h2>

        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Examen</label>
            <select
              className="w-full mt-1 px-4 py-3 border rounded-xl"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            >
              <option value="">Seleccionar examen</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Tipo de pregunta</label>
            <select
              className="w-full mt-1 px-4 py-3 border rounded-xl"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="TEORICA">Teórica</option>
              <option value="CODIGO">Código</option>
              <option value="DIAGRAMA_FLUJO">Diagrama de flujo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Enunciado</label>
            <textarea
              className="w-full mt-1 px-4 py-3 border rounded-xl"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Respuesta esperada</label>
            <textarea
              className="w-full mt-1 px-4 py-3 border rounded-xl"
              value={expectedAnswer}
              onChange={(e) => setExpectedAnswer(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Puntaje</label>
            <input
              className="w-full mt-1 px-4 py-3 border rounded-xl"
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Rúbrica</label>
            <textarea
              className="w-full mt-1 px-4 py-3 border rounded-xl"
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
            />
          </div>

          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl">
            Registrar pregunta
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-2xl font-bold mb-6">Preguntas registradas</h2>

        {!examId && (
          <p className="text-slate-500">Selecciona un examen para ver sus preguntas.</p>
        )}

        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="border rounded-2xl p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    {question.type}
                  </span>
                  <h3 className="text-lg font-bold mt-3">{question.statement}</h3>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">Puntaje</p>
                  <p className="text-2xl font-bold">{question.score}</p>
                </div>
              </div>

              {question.expectedAnswer && (
                <p className="text-slate-600 mt-4">
                  <strong>Respuesta esperada:</strong> {question.expectedAnswer}
                </p>
              )}

              {question.rubric && (
                <p className="text-slate-600 mt-2">
                  <strong>Rúbrica:</strong> {question.rubric}
                </p>
              )}
            </div>
          ))}

          {examId && questions.length === 0 && (
            <p className="text-slate-500">Este examen todavía no tiene preguntas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuestionsPage;
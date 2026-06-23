import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";
import { uploadAnswerImage } from "../../config/upload.js";

const router = Router();

function getExamDateRange(
  examDate: Date,
  examTime: string,
  durationMinutes: number,
) {
  const year = examDate.getUTCFullYear();
  const month = String(examDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(examDate.getUTCDate()).padStart(2, "0");

  const dateOnly = `${year}-${month}-${day}`;

  const startDate = new Date(`${dateOnly}T${examTime}:00-04:00`);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  return {
    startDate,
    endDate,
  };
}

router.post(
  "/",
  authenticateToken,
  authorizeRoles("ESTUDIANTE"),
  async (req: AuthRequest, res) => {
    try {
      const { examId, answers } = req.body;

      if (!examId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({
          message: "El examen y las respuestas son obligatorios",
        });
      }

      const exam = await prisma.exam.findUnique({
        where: { id: Number(examId) },
        include: { questions: true },
      });

      if (!exam) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      if (exam.status !== "PUBLICADO") {
        return res.status(400).json({ message: "El examen no está publicado" });
      }

      if (!exam.examDate || !exam.examTime || !exam.durationMinutes) {
        return res.status(400).json({
          message: "El examen no tiene fecha, hora o duración configurada",
        });
      }

      const { startDate, endDate } = getExamDateRange(
        exam.examDate,
        exam.examTime,
        exam.durationMinutes,
      );

      const now = new Date();

      if (now < startDate) {
        return res.status(400).json({
          message: "El examen aún no está habilitado",
        });
      }

      if (now > endDate) {
        return res.status(400).json({
          message: "El tiempo para responder el examen terminó",
        });
      }

      const existingSubmission = await prisma.submission.findFirst({
        where: {
          examId: Number(examId),
          studentId: req.user!.id,
        },
      });

      if (existingSubmission) {
        return res.status(400).json({
          message: "Ya enviaste este examen",
        });
      }

      const examQuestionIds = exam.questions.map((question) => question.id);

      const invalidAnswer = answers.find(
        (answer: any) => !examQuestionIds.includes(Number(answer.questionId)),
      );

      if (invalidAnswer) {
        return res.status(400).json({
          message: "Una o más respuestas no pertenecen a este examen",
        });
      }

      const emptyAnswer = answers.find((answer: any) => {
        const content = answer.content || "";
        const fileUrl = answer.fileUrl || null;

        return !content.trim() && !fileUrl;
      });

      if (emptyAnswer) {
        return res.status(400).json({
          message: "Todas las preguntas deben tener texto o imagen",
        });
      }

      const submission = await prisma.submission.create({
        data: {
          examId: Number(examId),
          studentId: req.user!.id,
          status: "PENDIENTE",
          answers: {
            create: answers.map((answer: any) => ({
              questionId: Number(answer.questionId),
              content: answer.content || "",
              fileUrl: answer.fileUrl || null,
            })),
          },
        },
        include: {
          answers: true,
        },
      });

      return res.status(201).json({
        message: "Examen enviado correctamente",
        submission,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al enviar examen",
        error,
      });
    }
  },
);

router.get(
  "/exam/:examId",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const examId = Number(req.params.examId);

      const submissions = await prisma.submission.findMany({
        where: { examId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          exam: {
            include: {
              course: true,
            },
          },
          answers: {
            include: {
              question: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

      return res.json(submissions);
    } catch (error) {
      return res.status(500).json({
        message: "Error al listar entregas del examen",
        error,
      });
    }
  },
);

router.put(
  "/exam/:examId/publish-all",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const examId = Number(req.params.examId);

      const submissionsToPublish = await prisma.submission.findMany({
        where: {
          examId,
          status: {
            in: ["PENDIENTE", "CORREGIDO", "REVISADO_DOCENTE"],
          },
        },
        include: {
          exam: true,
        },
      });

      const result = await prisma.submission.updateMany({
        where: {
          examId,
          status: {
            in: ["PENDIENTE", "CORREGIDO", "REVISADO_DOCENTE"],
          },
        },
        data: {
          status: "PUBLICADO",
        },
      });

      if (submissionsToPublish.length > 0) {
        await prisma.notification.createMany({
          data: submissionsToPublish.map((submission) => ({
            userId: submission.studentId,
            title: "Resultado publicado",
            message: `Tu resultado del examen "${submission.exam.title}" ya está disponible.`,
            type: "RESULTADO_PUBLICADO",
            link: "exams",
          })),
        });
      }

      return res.json({
        message: "Resultados publicados correctamente",
        updatedCount: result.count,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al publicar resultados",
        error,
      });
    }
  },
);

router.get(
  "/my/exam/:examId",
  authenticateToken,
  authorizeRoles("ESTUDIANTE"),
  async (req: AuthRequest, res) => {
    try {
      const examId = Number(req.params.examId);

      const submission = await prisma.submission.findFirst({
        where: {
          examId,
          studentId: req.user!.id,
          status: "PUBLICADO",
        },
        include: {
          exam: true,
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!submission) {
        return res.status(404).json({
          message: "La evaluación aún no fue publicada",
        });
      }

      return res.json(submission);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener evaluación",
        error,
      });
    }
  },
);

router.post(
  "/answer-image",
  authenticateToken,
  authorizeRoles("ESTUDIANTE"),
  uploadAnswerImage.single("image"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No se recibió ninguna imagen",
        });
      }

      return res.status(201).json({
        message: "Imagen subida correctamente",
        fileUrl: `/uploads/answers/${req.file.filename}`,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al subir imagen",
        error,
      });
    }
  },
);

router.put(
  "/:submissionId/publish",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const submissionId = Number(req.params.submissionId);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { exam: true },
      });

      if (!submission) {
        return res.status(404).json({
          message: "Entrega no encontrada",
        });
      }

      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "PUBLICADO" },
      });

      await prisma.notification.create({
        data: {
          userId: updatedSubmission.studentId,
          title: "Resultado publicado",
          message: `Tu resultado del examen "${submission.exam.title}" ya está disponible.`,
          type: "RESULTADO_PUBLICADO",
          link: "exams",
        },
      });

      return res.json({
        message: "Resultado publicado correctamente",
        submission: updatedSubmission,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al publicar resultado",
        error,
      });
    }
  },
);

export default router;

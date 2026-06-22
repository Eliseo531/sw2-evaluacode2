import { Router } from "express";
import prisma from "../../config/prisma.js";
import { correctAnswerWithAI } from "../ai/openai.service.js";
import { authenticateToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.post(
  "/answer/:answerId",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);

      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
        include: {
          question: true,
          submission: true,
        },
      });

      if (!answer) {
        return res.status(404).json({
          message: "Respuesta no encontrada",
        });
      }

      const correction = await correctAnswerWithAI({
        question: answer.question.statement,
        expectedAnswer: answer.question.expectedAnswer,
        studentAnswer: answer.content || "",
        maxScore: answer.question.score,
        rubric: answer.question.rubric,
        fileUrl: answer.fileUrl,
      });

      const updatedAnswer = await prisma.answer.update({
        where: { id: answerId },
        data: {
          aiScore: correction.score,
          finalScore: correction.score,
          feedback: correction.feedback,
        },
      });

      return res.json({
        message: "Respuesta corregida con IA",
        correction,
        answer: updatedAnswer,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al corregir respuesta",
        error,
      });
    }
  },
);

router.post(
  "/submission/:submissionId",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req, res) => {
    try {
      const submissionId = Number(req.params.submissionId);

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!submission) {
        return res.status(404).json({
          message: "Entrega no encontrada",
        });
      }

      if (submission.answers.length === 0) {
        return res.status(400).json({
          message: "La entrega no tiene respuestas para corregir",
        });
      }

      let totalAiScore = 0;
      const correctedAnswers = [];

      for (const answer of submission.answers) {
        const correction = await correctAnswerWithAI({
          question: answer.question.statement,
          expectedAnswer: answer.question.expectedAnswer,
          studentAnswer: answer.content || "",
          maxScore: answer.question.score,
          rubric: answer.question.rubric,
          fileUrl: answer.fileUrl,
        });

        const updatedAnswer = await prisma.answer.update({
          where: { id: answer.id },
          data: {
            aiScore: correction.score,
            finalScore: correction.score,
            feedback: correction.feedback,
          },
        });

        totalAiScore += Number(correction.score);

        correctedAnswers.push({
          answer: updatedAnswer,
          correction,
        });
      }

      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          aiScore: totalAiScore,
          finalScore: totalAiScore,
          status: "CORREGIDO",
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      return res.json({
        message: "Entrega corregida correctamente",
        submission: updatedSubmission,
        correctedAnswers,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al corregir entrega",
        error,
      });
    }
  },
);

router.put(
  "/answer/:answerId/manual-grade",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req, res) => {
    try {
      const answerId = Number(req.params.answerId);
      const { finalScore, feedback } = req.body;

      if (finalScore === undefined || finalScore === null) {
        return res.status(400).json({
          message: "La nota final es obligatoria",
        });
      }

      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
        include: {
          submission: true,
          question: true,
        },
      });

      if (!answer) {
        return res.status(404).json({
          message: "Respuesta no encontrada",
        });
      }

      const maxScore = Number(answer.question.score);
      const numericScore = Number(finalScore);

      if (Number.isNaN(numericScore)) {
        return res.status(400).json({
          message: "La nota final debe ser un número válido",
        });
      }

      if (numericScore < 0 || numericScore > maxScore) {
        return res.status(400).json({
          message: `La nota debe estar entre 0 y ${maxScore}`,
        });
      }

      await prisma.answer.update({
        where: { id: answerId },
        data: {
          finalScore: numericScore,
          feedback,
        },
      });

      const updatedAnswers = await prisma.answer.findMany({
        where: {
          submissionId: answer.submissionId,
        },
      });

      const totalFinalScore = updatedAnswers.reduce((total, item) => {
        return total + Number(item.finalScore ?? 0);
      }, 0);

      const updatedSubmission = await prisma.submission.update({
        where: {
          id: answer.submissionId,
        },
        data: {
          finalScore: totalFinalScore,
          status: "REVISADO_DOCENTE",
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      return res.json({
        message: "Nota manual guardada correctamente",
        submission: updatedSubmission,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al guardar nota manual",
        error,
      });
    }
  },
);

export default router;

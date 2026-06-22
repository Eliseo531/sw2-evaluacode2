import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const { examId, type, statement, expectedAnswer, score, rubric } =
        req.body;

      if (!examId || !type || !statement || !score) {
        return res.status(400).json({
          message: "Faltan datos obligatorios",
        });
      }

      const question = await prisma.question.create({
        data: {
          examId: Number(examId),
          type,
          statement,
          expectedAnswer,
          score: Number(score),
          rubric,
        },
      });

      return res.status(201).json({
        message: "Pregunta creada correctamente",
        question,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al crear pregunta",
        error,
      });
    }
  },
);

router.get("/exam/:examId", authenticateToken, async (req, res) => {
  try {
    const examId = Number(req.params.examId);

    const questions = await prisma.question.findMany({
      where: {
        examId,
      },
    });

    return res.json(questions);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar preguntas",
      error,
    });
  }
});

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const questionId = Number(req.params.id);
      const { type, statement, expectedAnswer, score, rubric } = req.body;

      if (!type || !statement || score === undefined) {
        return res.status(400).json({
          message: "El tipo, enunciado y puntaje son obligatorios",
        });
      }

      const question = await prisma.question.update({
        where: { id: questionId },
        data: {
          type,
          statement,
          expectedAnswer,
          score: Number(score),
          rubric,
        },
      });

      return res.json({
        message: "Pregunta actualizada correctamente",
        question,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al actualizar pregunta",
        error,
      });
    }
  },
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const questionId = Number(req.params.id);

      await prisma.question.delete({
        where: { id: questionId },
      });

      return res.json({
        message: "Pregunta eliminada correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al eliminar pregunta",
        error,
      });
    }
  },
);

export default router;

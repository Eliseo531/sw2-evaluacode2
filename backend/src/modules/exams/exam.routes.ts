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
      const {
        title,
        description,
        courseId,
        status,
        type,
        examDate,
        examTime,
        durationMinutes,
      } = req.body;

      if (!title || !courseId) {
        return res.status(400).json({
          message: "El título y la materia son obligatorios",
        });
      }

      const exam = await prisma.exam.create({
        data: {
          title,
          description,
          courseId: Number(courseId),
          status: status || "BORRADOR",
          type: type || "TEORICO",
          examDate: examDate ? new Date(examDate) : null,
          examTime: examTime || null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        },
        include: {
          course: true,
          questions: true,
        },
      });

      return res.status(201).json({
        message: "Examen creado correctamente",
        exam,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al crear examen",
        error,
      });
    }
  },
);

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    const exams = await prisma.exam.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : user.role === "DOCENTE"
            ? {
                course: {
                  OR: [
                    { teacherId: user.id },
                    {
                      members: {
                        some: {
                          userId: user.id,
                          role: "DOCENTE",
                        },
                      },
                    },
                  ],
                },
              }
            : {
                status: "PUBLICADO",
                course: {
                  members: {
                    some: {
                      userId: user.id,
                      role: "ESTUDIANTE",
                    },
                  },
                },
              },

      include: {
        course: true,
        questions: true,
        submissions: {
          where:
            user.role === "ESTUDIANTE"
              ? {
                  studentId: user.id,
                }
              : {},
          select: {
            id: true,
            status: true,
            submittedAt: true,
            aiScore: true,
            finalScore: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(exams);
  } catch (error) {
    return res.status(500).json({
      message: "Error al listar exámenes",
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
      const examId = Number(req.params.id);

      const {
        title,
        description,
        courseId,
        status,
        type,
        examDate,
        examTime,
        durationMinutes,
      } = req.body;

      if (!title || !courseId || !status || !type) {
        return res.status(400).json({
          message:
            "El título, la materia, el estado y el tipo son obligatorios",
        });
      }

      const exam = await prisma.exam.update({
        where: {
          id: examId,
        },
        data: {
          title,
          description,
          courseId: Number(courseId),
          status,
          type,
          examDate: examDate ? new Date(examDate) : null,
          examTime: examTime || null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        },
        include: {
          course: true,
          questions: true,
        },
      });

      return res.json({
        message: "Examen actualizado correctamente",
        exam,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al actualizar examen",
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
      const examId = Number(req.params.id);

      await prisma.exam.delete({
        where: {
          id: examId,
        },
      });

      return res.json({
        message: "Examen eliminado correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al eliminar examen",
        error,
      });
    }
  },
);

export default router;

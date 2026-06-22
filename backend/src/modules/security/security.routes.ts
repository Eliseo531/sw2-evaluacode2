import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.post(
  "/activity",
  authenticateToken,
  authorizeRoles("ESTUDIANTE"),
  async (req: AuthRequest, res) => {
    try {
      const { examId, type, detail } = req.body;

      if (!examId || !type) {
        return res.status(400).json({
          message: "El examen y el tipo de actividad son obligatorios",
        });
      }

      const log = await prisma.examActivityLog.create({
        data: {
          examId: Number(examId),
          studentId: req.user!.id,
          type,
          detail: detail || null,
        },
      });

      const exam = await prisma.exam.findUnique({
        where: { id: Number(examId) },
        include: {
          course: {
            include: {
              members: {
                where: {
                  role: "DOCENTE",
                },
              },
            },
          },
        },
      });

      const student = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          name: true,
        },
      });

      if (exam) {
        const logs = await prisma.examActivityLog.findMany({
          where: {
            examId: Number(examId),
            studentId: req.user!.id,
          },
        });

        const tabChanges = logs.filter(
          (item) => item.type === "CAMBIO_PESTAÑA",
        ).length;

        const copyEvents = logs.filter((item) => item.type === "COPIAR").length;

        const pasteEvents = logs.filter((item) => item.type === "PEGAR").length;

        const suspiciousScore =
          tabChanges * 2 + copyEvents * 1 + pasteEvents * 3;

        if (suspiciousScore >= 6) {
          const teacherIds = Array.from(
            new Set([
              exam.course.teacherId,
              ...exam.course.members.map((member) => member.userId),
            ]),
          ).filter(Boolean);

          for (const teacherId of teacherIds) {
            const existingAlert = await prisma.notification.findFirst({
              where: {
                userId: teacherId,
                type: "ALERTA_RIESGO_ALTO",
                message: {
                  contains: `${student?.name || "Un estudiante"} presentó riesgo alto durante el examen "${exam.title}"`,
                },
                read: false,
              },
            });

            if (!existingAlert) {
              await prisma.notification.create({
                data: {
                  userId: teacherId,
                  title: "Alerta de riesgo alto",
                  message: `${
                    student?.name || "Un estudiante"
                  } presentó riesgo alto durante el examen "${
                    exam.title
                  }". Revisa el reporte de seguridad.`,
                  type: "ALERTA_RIESGO_ALTO",
                  link: "courses",
                },
              });
            }
          }
        }
      }

      return res.status(201).json({
        message: "Actividad registrada correctamente",
        log,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al registrar actividad",
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

      const logs = await prisma.examActivityLog.findMany({
        where: {
          examId,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          exam: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json(logs);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener reporte de seguridad",
        error,
      });
    }
  },
);

export default router;

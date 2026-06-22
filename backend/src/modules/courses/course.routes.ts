import { Router } from "express";
import prisma from "../../config/prisma.js";
import { authenticateToken, AuthRequest } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const { name, code, group, description } = req.body;

      if (!name || !code || !group) {
        return res.status(400).json({
          message: "El nombre, la sigla y el grupo son obligatorios",
        });
      }

      const course = await prisma.course.create({
        data: {
          name,
          code,
          group,
          description,
          teacherId: req.user!.id,
        },
      });

      return res.status(201).json({
        message: "Materia registrada correctamente",
        course,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al registrar materia",
        error,
      });
    }
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user!;

      const courses = await prisma.course.findMany({
        where:
          user.role === "ADMIN"
            ? {}
            : user.role === "DOCENTE"
            ? {
                OR: [
                  {
                    teacherId: user.id,
                  },
                  {
                    members: {
                      some: {
                        userId: user.id,
                        role: "DOCENTE",
                      },
                    },
                  },
                ],
              }
            : {
                members: {
                  some: {
                    userId: user.id,
                    role: "ESTUDIANTE",
                  },
                },
              },

        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json(courses);
    } catch (error) {
      return res.status(500).json({
        message: "Error al listar materias",
        error,
      });
    }
  }
);

router.get(
  "/:courseId/members",
  authenticateToken,
  authorizeRoles("ADMIN", "DOCENTE"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.courseId);

      const members = await prisma.courseMember.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              group: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json(members);
    } catch (error) {
      return res.status(500).json({
        message: "Error al listar participantes",
        error,
      });
    }
  }
);

router.post(
  "/:courseId/members",
  authenticateToken,
  authorizeRoles("ADMIN", "DOCENTE"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.courseId);
      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({
          message: "El usuario y el rol son obligatorios",
        });
      }

      if (!["DOCENTE", "ESTUDIANTE"].includes(role)) {
        return res.status(400).json({
          message: "Rol inválido para la materia",
        });
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        return res.status(404).json({
          message: "Materia no encontrada",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return res.status(404).json({
          message: "Usuario no encontrado",
        });
      }

      const member = await prisma.courseMember.create({
        data: {
          courseId,
          userId: Number(userId),
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              group: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: "Participante agregado correctamente",
        member,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Este usuario ya está registrado en la materia",
        });
      }

      return res.status(500).json({
        message: "Error al agregar participante",
        error,
      });
    }
  }
);

router.delete(
  "/:courseId/members/:memberId",
  authenticateToken,
  authorizeRoles("ADMIN", "DOCENTE"),
  async (req: AuthRequest, res) => {
    try {
      const memberId = Number(req.params.memberId);

      await prisma.courseMember.delete({
        where: { id: memberId },
      });

      return res.json({
        message: "Participante eliminado correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al eliminar participante",
        error,
      });
    }
  }
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.id);
      const { name, code, group, description } = req.body;

      if (!name || !code || !group) {
        return res.status(400).json({
          message: "El nombre, la sigla y el grupo son obligatorios",
        });
      }

      const course = await prisma.course.update({
        where: { id: courseId },
        data: {
          name,
          code,
          group,
          description,
        },
      });

      return res.json({
        message: "Materia actualizada correctamente",
        course,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al actualizar materia",
        error,
      });
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.id);

      await prisma.course.delete({
        where: { id: courseId },
      });

      return res.json({
        message: "Materia eliminada correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al eliminar materia",
        error,
      });
    }
  }
);

export default router;
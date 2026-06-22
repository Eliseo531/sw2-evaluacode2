import { Router } from "express";
import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js";
import { authenticateToken } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "DOCENTE"),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.json(users);
    } catch (error) {
      return res.status(500).json({
        message: "Error al listar usuarios",
        error,
      });
    }
  },
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          message: "Nombre, email, contraseña y rol son obligatorios",
        });
      }

      if (!["DOCENTE", "ESTUDIANTE"].includes(role)) {
        return res.status(400).json({
          message: "Solo se pueden crear usuarios DOCENTE o ESTUDIANTE",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Ya existe un usuario con ese email",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return res.status(201).json({
        message: "Usuario creado correctamente",
        user,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al crear usuario",
        error,
      });
    }
  },
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { name, email, password, role } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({
          message: "Nombre, email y rol son obligatorios",
        });
      }

      if (!["DOCENTE", "ESTUDIANTE", "ADMIN"].includes(role)) {
        return res.status(400).json({
          message: "Rol inválido",
        });
      }

      const dataToUpdate: any = {
        name,
        email,
        role,
      };

      if (password && password.trim() !== "") {
        dataToUpdate.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return res.json({
        message: "Usuario actualizado correctamente",
        user,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Ya existe un usuario con ese email",
        });
      }

      return res.status(500).json({
        message: "Error al actualizar usuario",
        error,
      });
    }
  },
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      await prisma.user.delete({
        where: { id: userId },
      });

      return res.json({
        message: "Usuario eliminado correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al eliminar usuario",
        error,
      });
    }
  },
);

export default router;

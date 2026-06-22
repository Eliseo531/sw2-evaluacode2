import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener notificaciones",
      error,
    });
  }
});

router.put("/:id/read", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notificationId = Number(req.params.id);

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        read: true,
      },
    });

    return res.json({
      message: "Notificación marcada como leída",
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al marcar notificación",
      error,
    });
  }
});

router.put("/read-all", authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return res.json({
      message: "Todas las notificaciones fueron marcadas como leídas",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al marcar notificaciones",
      error,
    });
  }
});

export default router;

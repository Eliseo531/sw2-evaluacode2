import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    if (user.role === "ADMIN") {
      const [
        totalUsers,
        totalTeachers,
        totalStudents,
        totalCourses,
        totalExams,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "DOCENTE" } }),
        prisma.user.count({ where: { role: "ESTUDIANTE" } }),
        prisma.course.count(),
        prisma.exam.count(),
      ]);

      return res.json({
        role: "ADMIN",
        totalUsers,
        totalTeachers,
        totalStudents,
        totalCourses,
        totalExams,
      });
    }

    if (user.role === "DOCENTE") {
      const courses = await prisma.course.findMany({
        where: {
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
        include: {
          exams: {
            include: {
              submissions: true,
            },
          },
        },
      });

      const exams = courses.flatMap((course) => course.exams);
      const submissions = exams.flatMap((exam) => exam.submissions);

      const pendingSubmissions = submissions.filter(
        (submission) => submission.status === "PENDIENTE",
      ).length;

      const gradedSubmissions = submissions.filter(
        (submission) => submission.finalScore !== null,
      );

      const averageScore =
        gradedSubmissions.length > 0
          ? gradedSubmissions.reduce(
              (sum, submission) => sum + Number(submission.finalScore),
              0,
            ) / gradedSubmissions.length
          : 0;

      return res.json({
        role: "DOCENTE",
        totalCourses: courses.length,
        totalExams: exams.length,
        totalSubmissions: submissions.length,
        pendingSubmissions,
        averageScore: Number(averageScore.toFixed(2)),
      });
    }

    if (user.role === "ESTUDIANTE") {
      const courseMembers = await prisma.courseMember.findMany({
        where: {
          userId: user.id,
          role: "ESTUDIANTE",
        },
        include: {
          course: {
            include: {
              exams: {
                where: {
                  status: "PUBLICADO",
                },
                include: {
                  submissions: {
                    where: {
                      studentId: user.id,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const courses = courseMembers.map((member) => member.course);
      const exams = courses.flatMap((course) => course.exams);

      const submittedExams = exams.filter(
        (exam) => exam.submissions.length > 0,
      );
      const pendingExams = exams.filter(
        (exam) => exam.submissions.length === 0,
      );

      const publishedResults = submittedExams.filter(
        (exam) => exam.submissions[0]?.status === "PUBLICADO",
      );

      return res.json({
        role: "ESTUDIANTE",
        totalCourses: courses.length,
        totalExams: exams.length,
        pendingExams: pendingExams.length,
        submittedExams: submittedExams.length,
        publishedResults: publishedResults.length,
      });
    }

    return res.status(400).json({
      message: "Rol no válido",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al cargar dashboard",
      error,
    });
  }
});

export default router;

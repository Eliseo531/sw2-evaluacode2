import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

router.get(
  "/course/:courseId",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.courseId);

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          members: {
            where: {
              role: "ESTUDIANTE",
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          exams: {
            include: {
              questions: true,
              submissions: {
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
              },
            },
          },
        },
      });

      if (!course) {
        return res.status(404).json({
          message: "Materia no encontrada",
        });
      }

      const submissions = course.exams.flatMap((exam) =>
        exam.submissions.map((submission) => ({
          ...submission,
          examTitle: exam.title,
        })),
      );

      const gradedSubmissions = submissions.filter(
        (submission) => submission.finalScore !== null,
      );

      const scores = gradedSubmissions.map((submission) =>
        Number(submission.finalScore),
      );

      const averageScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      const gradeDistribution = {
        low: scores.filter((score) => score <= 50).length,
        medium: scores.filter((score) => score > 50 && score <= 70).length,
        good: scores.filter((score) => score > 70 && score <= 85).length,
        excellent: scores.filter((score) => score > 85).length,
      };

      const studentPerformance = gradedSubmissions.map((submission) => ({
        studentId: submission.student.id,
        studentName: submission.student.name,
        studentEmail: submission.student.email,
        examTitle: submission.examTitle,
        status: submission.status,
        aiScore: submission.aiScore,
        finalScore: submission.finalScore,
        submittedAt: submission.submittedAt,
      }));

      const allAnswers = submissions.flatMap((submission) =>
        submission.answers.map((answer) => ({
          ...answer,
          studentName: submission.student.name,
        })),
      );

      const questionStatsMap = new Map<
        number,
        {
          questionId: number;
          statement: string;
          type: string;
          maxScore: number;
          totalScore: number;
          answersCount: number;
        }
      >();

      allAnswers.forEach((answer) => {
        const questionId = answer.question.id;

        if (!questionStatsMap.has(questionId)) {
          questionStatsMap.set(questionId, {
            questionId,
            statement: answer.question.statement,
            type: answer.question.type,
            maxScore: Number(answer.question.score),
            totalScore: 0,
            answersCount: 0,
          });
        }

        const current = questionStatsMap.get(questionId)!;

        current.totalScore += Number(answer.finalScore ?? answer.aiScore ?? 0);
        current.answersCount += 1;
      });

      const difficultQuestions = Array.from(questionStatsMap.values())
        .map((question) => {
          const averageObtained =
            question.answersCount > 0
              ? question.totalScore / question.answersCount
              : 0;

          const difficultyPercent =
            question.maxScore > 0
              ? 100 - (averageObtained / question.maxScore) * 100
              : 0;

          return {
            questionId: question.questionId,
            statement: question.statement,
            type: question.type,
            maxScore: question.maxScore,
            averageObtained: Number(averageObtained.toFixed(2)),
            difficultyPercent: Number(difficultyPercent.toFixed(2)),
          };
        })
        .sort((a, b) => b.difficultyPercent - a.difficultyPercent);

      const frequentErrors = allAnswers
        .filter((answer) => answer.feedback)
        .map((answer) => ({
          question: answer.question.statement,
          studentName: answer.studentName,
          feedback: answer.feedback,
        }))
        .slice(0, 10);

      return res.json({
        summary: {
          averageScore: Number(averageScore.toFixed(2)),
          highestScore,
          lowestScore,
          totalSubmissions: submissions.length,
          totalGradedSubmissions: gradedSubmissions.length,
          totalStudents: course.members.length,
          totalExams: course.exams.length,
        },
        gradeDistribution,
        studentPerformance,
        difficultQuestions,
        frequentErrors,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al generar reporte",
        error,
      });
    }
  },
);

router.get(
  "/course/:courseId/student/:studentId",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.courseId);
      const studentId = Number(req.params.studentId);

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          members: {
            where: {
              userId: studentId,
              role: "ESTUDIANTE",
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          exams: {
            include: {
              questions: true,
              submissions: {
                where: {
                  studentId,
                },
                include: {
                  answers: {
                    include: {
                      question: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!course) {
        return res.status(404).json({
          message: "Materia no encontrada",
        });
      }

      if (course.members.length === 0) {
        return res.status(404).json({
          message: "El estudiante no está matriculado en esta materia",
        });
      }

      const student = course.members[0].user;

      const examReports = course.exams.map((exam) => {
        const submission = exam.submissions[0] || null;

        return {
          examId: exam.id,
          examTitle: exam.title,
          examStatus: exam.status,
          examDate: exam.examDate,
          examTime: exam.examTime,
          durationMinutes: exam.durationMinutes,
          submitted: Boolean(submission),
          submittedAt: submission?.submittedAt || null,
          submissionStatus: submission?.status || "NO_ENVIADO",
          aiScore: submission?.aiScore || null,
          finalScore: submission?.finalScore || null,
          answers:
            submission?.answers.map((answer) => ({
              answerId: answer.id,
              questionId: answer.question.id,
              questionType: answer.question.type,
              questionStatement: answer.question.statement,
              maxScore: answer.question.score,
              content: answer.content,
              fileUrl: answer.fileUrl,
              aiScore: answer.aiScore,
              finalScore: answer.finalScore,
              feedback: answer.feedback,
            })) || [],
        };
      });

      const gradedExams = examReports.filter(
        (exam) => exam.finalScore !== null,
      );

      const scores = gradedExams.map((exam) => Number(exam.finalScore));

      const averageScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      return res.json({
        course: {
          id: course.id,
          name: course.name,
          code: course.code,
          group: course.group,
        },
        student,
        summary: {
          totalExams: course.exams.length,
          submittedExams: examReports.filter((exam) => exam.submitted).length,
          gradedExams: gradedExams.length,
          pendingExams: examReports.filter((exam) => !exam.submitted).length,
          averageScore: Number(averageScore.toFixed(2)),
          highestScore,
          lowestScore,
        },
        exams: examReports,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al generar reporte individual",
        error,
      });
    }
  },
);

router.get(
  "/course/:courseId/class",
  authenticateToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const courseId = Number(req.params.courseId);

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          members: {
            where: { role: "ESTUDIANTE" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          exams: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              submissions: true,
            },
          },
        },
      });

      if (!course) {
        return res.status(404).json({
          message: "Materia no encontrada",
        });
      }

      const students = course.members.map((member) => member.user);

      const exams = course.exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        status: exam.status,
        examDate: exam.examDate,
      }));

      const rows = students.map((student) => {
        const examScores = exams.map((exam) => {
          const fullExam = course.exams.find((item) => item.id === exam.id);

          const submission = fullExam?.submissions.find(
            (item) => item.studentId === student.id,
          );

          return {
            examId: exam.id,
            examTitle: exam.title,
            status: submission?.status || "NO_ENVIADO",
            finalScore: submission?.finalScore ?? null,
            aiScore: submission?.aiScore ?? null,
            submittedAt: submission?.submittedAt ?? null,
          };
        });

        const scoredExams = examScores.filter(
          (item) => item.finalScore !== null,
        );

        const average =
          scoredExams.length > 0
            ? scoredExams.reduce(
                (sum, item) => sum + Number(item.finalScore),
                0,
              ) / scoredExams.length
            : 0;

        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          scores: examScores,
          average: Number(average.toFixed(2)),
        };
      });

      return res.json({
        course: {
          id: course.id,
          name: course.name,
          code: course.code,
          group: course.group,
        },
        exams,
        rows,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al generar reporte de clase",
        error,
      });
    }
  },
);

export default router;

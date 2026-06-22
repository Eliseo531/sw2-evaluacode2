import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  authenticateToken,
  AuthRequest,
} from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";

const router = Router();

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateSimilarity(textA: string, textB: string) {
  const wordsA = new Set(normalizeText(textA).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeText(textB).split(" ").filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter((word) => wordsB.has(word));
  const union = new Set([...wordsA, ...wordsB]);

  return Math.round((intersection.length / union.size) * 100);
}

function getRisk(similarity: number) {
  if (similarity >= 85) return "ALTO";
  if (similarity >= 65) return "MEDIO";
  if (similarity >= 45) return "BAJO";
  return "MINIMO";
}

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
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      const matches: any[] = [];

      for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
          const submissionA = submissions[i];
          const submissionB = submissions[j];

          for (const answerA of submissionA.answers) {
            const answerB = submissionB.answers.find(
              (answer) => answer.questionId === answerA.questionId,
            );

            if (!answerB) continue;

            const similarity = calculateSimilarity(
              answerA.content || "",
              answerB.content || "",
            );

            if (similarity >= 45) {
              matches.push({
                questionId: answerA.question.id,
                question: answerA.question.statement,
                type: answerA.question.type,
                studentA: {
                  id: submissionA.student.id,
                  name: submissionA.student.name,
                  email: submissionA.student.email,
                },
                studentB: {
                  id: submissionB.student.id,
                  name: submissionB.student.name,
                  email: submissionB.student.email,
                },
                answerA: answerA.content,
                answerB: answerB.content,
                similarity,
                risk: getRisk(similarity),
              });
            }
          }
        }
      }

      matches.sort((a, b) => b.similarity - a.similarity);

      return res.json({
        examId,
        totalSubmissions: submissions.length,
        totalMatches: matches.length,
        matches,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al analizar similitud",
        error,
      });
    }
  },
);

export default router;

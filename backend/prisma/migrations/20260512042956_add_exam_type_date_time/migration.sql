-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('TEORICO', 'PROGRAMACION', 'MIXTO');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "examDate" TIMESTAMP(3),
ADD COLUMN     "examTime" TEXT,
ADD COLUMN     "type" "ExamType" NOT NULL DEFAULT 'TEORICO';

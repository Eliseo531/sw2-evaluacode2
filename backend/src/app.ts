import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./modules/auth/auth.routes.js";
import courseRoutes from "./modules/courses/course.routes.js";
import examRoutes from "./modules/exams/exam.routes.js";
import questionRoutes from "./modules/questions/question.routes.js";
import submissionRoutes from "./modules/submissions/submission.routes.js";
import correctionRoutes from "./modules/corrections/correction.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import reportRoutes from "./modules/reports/report.routes.js";
import plagiarismRoutes from "./modules/plagiarism/plagiarism.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import securityRoutes from "./modules/security/security.routes.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "EvaluaCode API funcionando",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/corrections", correctionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/plagiarism", plagiarismRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/security", securityRoutes);

export default app;

import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CorrectionInput = {
  question: string;
  expectedAnswer?: string | null;
  studentAnswer: string;
  maxScore: number;
  rubric?: string | null;
  fileUrl?: string | null;
};

function getImageDataUrl(fileUrl: string) {
  const relativePath = fileUrl.replace(/^\/uploads\//, "uploads/");
  const imagePath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`No se encontró la imagen: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  const extension = path.extname(imagePath).replace(".", "").toLowerCase();

  const mimeType =
    extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : extension === "webp"
        ? "image/webp"
        : "image/png";

  return `data:${mimeType};base64,${base64Image}`;
}

export async function correctAnswerWithAI(input: CorrectionInput) {
  const prompt = `
Eres un docente evaluador de programación.

Corrige la respuesta del estudiante de forma objetiva.

Pregunta:
${input.question}

Respuesta esperada:
${input.expectedAnswer || "No especificada"}

Rúbrica:
${input.rubric || "Evalúa exactitud, lógica, claridad y completitud."}

Puntaje máximo:
${input.maxScore}

Respuesta escrita del estudiante:
${input.studentAnswer || "El estudiante no escribió texto."}

${
  input.fileUrl
    ? "El estudiante también adjuntó una imagen. Analiza cuidadosamente la imagen porque puede contener código escrito a mano, pseudocódigo o un diagrama de flujo."
    : "El estudiante no adjuntó imagen."
}

Instrucciones:
- Si hay imagen, evalúa también el contenido visual.
- Si es diagrama de flujo, revisa inicio, entrada, proceso, decisión, salida y fin.
- Si es código, revisa lógica, sintaxis aproximada, variables, condiciones y resultado.
- No inventes información que no aparezca en texto o imagen.
- La nota debe estar entre 0 y ${input.maxScore}.

Devuelve solamente un JSON válido con esta estructura:
{
  "score": number,
  "feedback": string,
  "errors": string[],
  "suggestions": string[]
}
`;

  const content: any[] = [
    {
      type: "input_text",
      text: prompt,
    },
  ];

  if (input.fileUrl) {
    const imageDataUrl = getImageDataUrl(input.fileUrl);

    content.push({
      type: "input_image",
      image_url: imageDataUrl,
    });
  }

  const response = await client.responses.create({
    model: "gpt-5.5",
    input: [
      {
        role: "user",
        content,
      },
    ],
  });

  const text = response.output_text.trim();

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("La IA no devolvió un JSON válido");
    }

    return JSON.parse(jsonMatch[0]);
  }
}

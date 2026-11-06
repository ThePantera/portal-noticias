import "server-only";
import { env } from "@/server/env";

/**
 * Pedido mínimo a la API de mensajes de Claude con salida estructurada (ADR 0012). Se usa
 * HTTP directo en lugar del SDK oficial para no sumar una dependencia: es un solo pedido sin
 * herramientas ni streaming.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export class ClaudeError extends Error {
  constructor(
    readonly code: "unconfigured" | "refused" | "failed",
    message: string,
  ) {
    super(message);
  }
}

export type ClaudeUsage = { input_tokens: number; output_tokens: number };

type ApiResponse = {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
  usage?: ClaudeUsage;
  error?: { message?: string };
};

/** Pide una respuesta JSON que cumpla `schema` y la devuelve sin validar (la valida quien llama). */
export async function generateJson(options: {
  system: string;
  user: string;
  schema: object;
  maxTokens?: number;
}): Promise<{ data: unknown; usage: ClaudeUsage | null }> {
  if (!env.ANTHROPIC_API_KEY) throw new ClaudeError("unconfigured", "Falta ANTHROPIC_API_KEY.");

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: env.AUTOPUBLISH_MODEL,
        max_tokens: options.maxTokens ?? 8000,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
        output_config: { effort: "low", format: { type: "json_schema", schema: options.schema } },
      }),
      signal: AbortSignal.timeout(40_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Claude: el pedido falló", error);
    throw new ClaudeError("failed", "La API de Claude no respondió.");
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse;
  if (!response.ok) {
    throw new ClaudeError(
      "failed",
      `La API de Claude respondió ${response.status}: ${body.error?.message ?? ""}`,
    );
  }
  if (body.stop_reason === "refusal")
    throw new ClaudeError("refused", "El modelo no quiso escribir esta nota.");
  if (body.stop_reason === "max_tokens") throw new ClaudeError("failed", "La respuesta quedó cortada.");

  const text = body.content?.find((block) => block.type === "text")?.text ?? "";
  try {
    return { data: JSON.parse(text), usage: body.usage ?? null };
  } catch {
    throw new ClaudeError("failed", "La respuesta no es JSON válido.");
  }
}

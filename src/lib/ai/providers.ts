import type { AiRuntimeConfig, GameTranslationInput, TranslatedGameContent } from "./types";
import { normalizeTranslatedContent, parseTranslatedContent, validateTranslatedContent } from "./quality";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const AI_REQUEST_TIMEOUT_MS = 12_000;

export async function translateGameContent(input: GameTranslationInput, config: AiRuntimeConfig): Promise<TranslatedGameContent> {
  const messages = buildTranslationMessages(input);
  const startedAt = Date.now();
  console.log("[ai-provider] translate.start", { provider: config.provider, model: config.model, title: input.title });
  const raw = await callDeepSeek(messages, config);
  const output = normalizeTranslatedContent(input, parseTranslatedContent(raw));
  validateTranslatedContent(input, output);
  console.log("[ai-provider] translate.success", { provider: config.provider, model: config.model, title: input.title, durationMs: Date.now() - startedAt });
  return output;
}

export async function testAiProvider(config: AiRuntimeConfig) {
  await translateGameContent({
    title: "City Car Stunt 2",
    short_description: "Drive fast cars through stunt tracks and finish each route before time runs out.",
    long_description: "City Car Stunt 2 is a driving game with futuristic cars, ramps and routes for one or two players.",
    how_to_play: "Choose a car, start the game and use the keyboard to drive through the route.",
    controls: ["Arrow keys or WASD to drive", "Space for handbrake"],
    features: ["Two player mode", "Stunt tracks", "Custom cars"],
    seo_title: "City Car Stunt 2 Oyna",
    seo_description: "Play City Car Stunt 2 online.",
  }, config);
}

function buildTranslationMessages(input: GameTranslationInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "Bol Oyun için oyun metinlerini doğal Türkçeye dönüştüren bir editörsün.",
        "Oyun adını ve özel isimleri koru; title alanını çevirme veya yeniden adlandırma.",
        "Çocukların anlayacağı sade, akıcı Türkçe kullan.",
        "SEO spam yapma, bilinmeyen geliştirici/tarih/platform bilgisi uydurma.",
        "Kaynakta kontroller veya özellikler boşsa gerçek dışı tuş uydurma; güvenli ve genel Türkçe ifade kullan.",
        "Sadece geçerli JSON döndür. Markdown, açıklama veya kod bloğu kullanma.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        instruction: "Aşağıdaki oyun metinlerini Türkçeleştir. JSON anahtarlarını aynen koru.",
        required_json_shape: {
          short_description: "string",
          long_description: "string",
          how_to_play: "string",
          controls: ["string"],
          features: ["string"],
          seo_title: `${input.title} Oyna`,
          seo_description: "string",
        },
        keep_game_title_exactly: input.title,
        source: input,
      }),
    },
  ];
}

async function callDeepSeek(messages: ChatMessage[], config: AiRuntimeConfig) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.2,
    max_tokens: 1800,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
  };
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as ChatCompletionResponse & { error?: { message?: string } } | null;
    console.log("[ai-provider] http.response", { provider: config.provider, model: config.model, status: response.status, ok: response.ok, durationMs: Date.now() - startedAt });
    if (!response.ok) throw new Error(payload?.error?.message || `${config.provider} isteği başarısız: HTTP ${response.status}`);
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${config.provider} boş içerik döndürdü.`);
    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`${config.provider} isteği zaman aşımına uğradı.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

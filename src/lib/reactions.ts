/**
 * Reacciones con emojis en las notas (ADR 0010). Código puro: lo usan el servidor, para
 * validar, y el navegador, para el selector.
 */

/** Los que se ofrecen a un toque, debajo de cada nota. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🤯", "🔥", "🚀", "🤓", "🐛"] as const;

const words = (list: string) => list.split(" ");

/** El selector completo. Cualquier otro emoji se puede escribir o pegar. */
export const REACTION_GROUPS: ReadonlyArray<{ name: string; emojis: readonly string[] }> = [
  {
    name: "Caras",
    emojis: words(
      "😀 😁 😂 🤣 😊 😍 🥰 😎 🤩 🥳 😏 🤔 🫡 🤨 😐 🙄 😬 😮 😯 😲 🤯 😳 🥺 😢 😭 😤 😡 🤬 😱 😴 🤮 🤡 💀 👻 👽 🤖",
    ),
  },
  {
    name: "Gestos",
    emojis: words("👍 👎 👏 🙌 🙏 🤝 💪 👀 🫶 ✌️ 🤞 🤘 👌 🤌 🫠 🤷"),
  },
  {
    name: "IT y ciencia",
    emojis: words(
      "💻 🖥️ ⌨️ 🖱️ 📱 🔌 🔋 💾 💿 🕹️ 🎮 👾 🐛 🐞 🧠 🤖 🛰️ 🚀 🛸 🔬 🧪 🧬 📡 🔒 🔓 🔑 🛡️ ⚙️ 🛠️ 🧰 📈 📉",
    ),
  },
  {
    name: "Símbolos",
    emojis: words("❤️ 🧡 💛 💚 💙 💜 🖤 💔 🔥 ✨ ⚡ 💯 ✅ ❌ ⚠️ ❓ ❗ 💡 🎯 🏆 🎉 🍿 ☕ 🍕"),
  },
];

/** Cuántos emojis distintos puede dejar una misma persona en una nota. */
export const MAX_REACTIONS_PER_VISITOR = 6;
/** Cuántos emojis distintos puede acumular una nota: más no entran en pantalla. */
export const MAX_EMOJIS_PER_ARTICLE = 40;
/** Reacciones que se pueden sumar desde una misma IP en la ventana (frena bots sin login). */
export const MAX_REACTIONS_PER_IP = 120;
export const IP_WINDOW_MS = 60 * 60 * 1000;
/** Mismo emoji en la misma nota desde una IP: deja reaccionar a una casa u oficina. */
export const MAX_SAME_REACTION_PER_IP = 8;

export type ReactionCount = { emoji: string; count: number };
export type ReactionSummary = { reactions: ReactionCount[]; mine: string[] };

const VARIATION_SELECTOR = "️";
// La propiedad RGI_Emoji (flag `v`) existe en Node 20+ y en los navegadores desde 2023.
// Se arma con el constructor para no exigirle ES2024 al compilador.
let rgiEmoji: RegExp | null | undefined;
function rgiPattern(): RegExp | null {
  if (rgiEmoji === undefined) {
    try {
      rgiEmoji = new RegExp("^\\p{RGI_Emoji}$", "v");
    } catch {
      rgiEmoji = null;
    }
  }
  return rgiEmoji;
}

/**
 * Devuelve el emoji en su forma canónica si `value` es exactamente un emoji, o null.
 * Acepta la forma sin selector de variación ("❤" se guarda como "❤️").
 */
export function normalizeEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) return null;
  const pattern = rgiPattern();
  if (!pattern) {
    // Navegador viejo: un chequeo aproximado; el servidor valida de verdad.
    return /^\p{Extended_Pictographic}/u.test(trimmed) ? trimmed : null;
  }
  if (pattern.test(trimmed)) return trimmed;
  const withSelector = trimmed.endsWith(VARIATION_SELECTOR) ? null : `${trimmed}${VARIATION_SELECTOR}`;
  return withSelector && pattern.test(withSelector) ? withSelector : null;
}

/** Primero las más usadas; a igual cantidad, la que llegó antes. */
export function sortReactions(
  rows: ReadonlyArray<ReactionCount & { firstAt: Date | null }>,
): ReactionCount[] {
  return [...rows]
    .sort((a, b) => b.count - a.count || (a.firstAt?.getTime() ?? 0) - (b.firstAt?.getTime() ?? 0))
    .map(({ emoji, count }) => ({ emoji, count }));
}

/** Aplica en el navegador, sin esperar al servidor, el efecto de tocar un emoji. */
export function toggleLocally(summary: ReactionSummary, emoji: string): ReactionSummary {
  const had = summary.mine.includes(emoji);
  const exists = summary.reactions.some((r) => r.emoji === emoji);
  const reactions = exists
    ? summary.reactions
        .map((r) => (r.emoji === emoji ? { ...r, count: r.count + (had ? -1 : 1) } : r))
        .filter((r) => r.count > 0)
    : [...summary.reactions, { emoji, count: 1 }];
  const mine = had ? summary.mine.filter((e) => e !== emoji) : [...summary.mine, emoji];
  return { reactions, mine };
}

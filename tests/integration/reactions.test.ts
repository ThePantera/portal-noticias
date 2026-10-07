import { beforeEach, describe, expect, it } from "vitest";
import { MAX_REACTIONS_PER_VISITOR, MAX_SAME_REACTION_PER_IP } from "@/lib/reactions";
import { createArticle, transitionArticle } from "@/server/services/article-commands";
import { getReactionSummary, hashIdentifier, toggleReaction } from "@/server/services/reactions";
import { createAuthorAndCategory, resetDatabase, testDb } from "./setup/db";

beforeEach(resetDatabase);

async function setup() {
  const { author, category } = await createAuthorAndCategory();
  await testDb.user.update({ where: { id: author.id }, data: { role: "ADMIN" } });
  const admin = { id: author.id, role: "ADMIN" as const };
  const create = async (title: string) =>
    (
      await createArticle(admin, {
        title,
        excerpt: "Bajada.",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Hola." }] }],
        },
        categoryId: category.id,
        tags: [],
      })
    ).id;
  const published = await create("Nota publicada");
  await transitionArticle(admin, published, "publish");
  const draft = await create("Borrador");
  return { published, draft };
}

const reactor = (name: string, ip = "203.0.113.7") => ({
  visitorHash: hashIdentifier(name),
  ipHash: hashIdentifier(ip),
});

describe("reacciones", () => {
  it("cada navegador pone y saca su reacción y el conteo se agrupa por emoji", async () => {
    const { published } = await setup();
    const ana = reactor("ana");
    const beto = reactor("beto");
    await toggleReaction(published, "🔥", ana);
    await toggleReaction(published, "🔥", beto);
    const result = await toggleReaction(published, "🐛", beto);
    expect(result).toEqual({
      ok: true,
      summary: {
        reactions: [
          { emoji: "🔥", count: 2 },
          { emoji: "🐛", count: 1 },
        ],
        mine: ["🔥", "🐛"],
      },
    });
    expect(await getReactionSummary(published, ana.visitorHash)).toMatchObject({ mine: ["🔥"] });
    expect(await getReactionSummary(published, null)).toMatchObject({ mine: [] });

    // Tocar de nuevo la saca.
    await toggleReaction(published, "🔥", ana);
    expect(await getReactionSummary(published, ana.visitorHash)).toEqual({
      reactions: [
        { emoji: "🔥", count: 1 },
        { emoji: "🐛", count: 1 },
      ],
      mine: [],
    });
  });

  it("sólo las notas publicadas tienen reacciones", async () => {
    const { draft } = await setup();
    expect(await getReactionSummary(draft, null)).toBeNull();
    expect(await getReactionSummary("no-existe", null)).toBeNull();
    expect(await toggleReaction(draft, "🔥", reactor("ana"))).toEqual({ ok: false, reason: "missing" });
    expect(await testDb.articleReaction.count()).toBe(0);
  });

  it("pone topes por navegador y por IP, pero sacar siempre se puede", async () => {
    const { published } = await setup();
    const ana = reactor("ana");
    const emojis = ["🔥", "🐛", "🚀", "🤓", "🤯", "👍", "😂"];
    for (const emoji of emojis.slice(0, MAX_REACTIONS_PER_VISITOR)) {
      expect((await toggleReaction(published, emoji, ana)).ok).toBe(true);
    }
    expect(await toggleReaction(published, "😂", ana)).toEqual({ ok: false, reason: "visitor-limit" });
    expect((await toggleReaction(published, "🔥", ana)).ok).toBe(true);

    for (let i = 1; i < MAX_SAME_REACTION_PER_IP; i++) {
      expect((await toggleReaction(published, "🐛", reactor(`bot-${i}`))).ok).toBe(true);
    }
    expect(await toggleReaction(published, "🐛", reactor("bot-final"))).toEqual({
      ok: false,
      reason: "ip-limit",
    });
    // Desde otra conexión sí entra.
    expect((await toggleReaction(published, "🐛", reactor("bot-final", "198.51.100.1"))).ok).toBe(true);
  });

  it("al borrar la nota se borran sus reacciones", async () => {
    const { published } = await setup();
    await toggleReaction(published, "🔥", reactor("ana"));
    await testDb.article.delete({ where: { id: published } });
    expect(await testDb.articleReaction.count()).toBe(0);
  });
});

import { readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const catalogFile = new URL("../site/data/wines.json", import.meta.url);
const skill = await readFile(new URL("../.agents/skills/wine-research/SKILL.md", import.meta.url), "utf8");
const previous = JSON.parse(await readFile(catalogFile, "utf8"));
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const includeOfficialCopy = process.env.TJ_MEDIA_PERMISSION === "true";
const category = "beverages/wine-beer-liquor";
const officialPage = "https://www.traderjoes.com/home/products/pdp/";
const officialHost = "www.traderjoes.com";

function httpsUrl(value, host, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" && !url.username && !url.password &&
      (!host || url.hostname === host) ? url.href : null;
  } catch {
    return null;
  }
}

async function request(url, options, label, timeout = 30_000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) })
    .catch(() => { throw new Error(`${label} could not be reached`); });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response.json().catch(() => { throw new Error(`${label} returned invalid JSON`); });
}

async function collectPages(fetchPage, source) {
  const items = new Map();
  let expected;
  for (let page = 1; page <= 100; page++) {
    const result = await fetchPage(page);
    expected ??= result.total;
    if (!Number.isInteger(expected) || expected < 1 || result.total !== expected ||
        !Array.isArray(result.rows) || !result.rows.length) {
      throw new Error(`${source} returned an empty or inconsistent page ${page}`);
    }
    for (const row of result.rows) {
      if (typeof row.id !== "string" || !/^\d+$/.test(row.id) || !row.name || items.has(row.id)) {
        throw new Error(`${source} returned an invalid or duplicate SKU`);
      }
      items.set(row.id, row);
    }
    if (items.size === expected) return [...items.values()];
    if (items.size > expected) break;
  }
  throw new Error(`${source} pagination did not match the reported total`);
}

async function officialCategory() {
  return collectPages(async (page) => {
    const url = new URL("https://www.traderjoes.com/api/graphql");
    url.searchParams.set("query", `{
      products(filter:{published:{eq:true},category_url_path:{eq:"${category}"}},pageSize:50,currentPage:${page}){
        total_count items { sku item_title item_description retail_price sales_size sales_uom_description primary_image }
      }
    }`);
    const result = await request(url, {}, "Trader Joe’s category");
    const products = result.data?.products;
    if (result.errors?.length || !products) throw new Error("Trader Joe’s category query failed");
    return {
      total: products.total_count,
      rows: products.items?.map((item) => ({
        id: item.sku, name: item.item_title, url: officialPage + item.sku,
        price: Number(item.retail_price) > 0 ? Number(item.retail_price) : null,
        size: [item.sales_size, item.sales_uom_description].filter(Boolean).join(" "),
        image: httpsUrl(item.primary_image, officialHost, officialPage),
        description: item.item_description || "",
      })).map((item) => ({ ...item, image: item.image?.includes("/content/dam/") ? item.image : null })),
    };
  }, "Trader Joe’s category");
}

async function serp(params) {
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({ ...params, api_key: process.env.SERPAPI_API_KEY });
  const result = await request(url, {}, "Trader Joe’s via SerpApi");
  if (result.error) throw new Error("SerpApi could not read Trader Joe’s");
  return result;
}

async function officialSearch() {
  return collectPages(async (page) => {
    const result = await serp({ engine: "trader_joes", q: "wine", category_id: "200", page });
    return {
      total: result.search_information?.total_results,
      rows: result.organic_results?.map((item) => ({
        id: item.product_id, name: item.title,
        url: httpsUrl(item.link, officialHost) || officialPage + item.product_id,
        price: Number.isFinite(item.extracted_price) ? item.extracted_price : null, size: item.size || "",
        image: httpsUrl(item.thumbnail, officialHost), description: "",
      })),
    };
  }, "Trader Joe’s wine search");
}

const text = { type: "string" };
const enumeration = (...values) => ({ type: "string", enum: values });
const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});
const bilingual = object({ en: text, zh: text });
const schema = object({
  type: enumeration("red", "white", "rose", "sparkling", "other", "exclude"),
  region: bilingual,
  officialNotes: bilingual,
  reputation: bilingual,
  comparison: nullable(object({
    kind: enumeration("confirmed", "possible", "sameProducer", "style"), name: text, note: bilingual,
    totalWineUrl: nullable(text), productUrl: nullable(text), image: nullable(text),
  })),
  score: nullable({ type: "integer", minimum: 0, maximum: 100 }),
  confidence: enumeration("low", "medium", "high"),
  rationale: bilingual,
  sources: { type: "array", items: object({
    label: text, url: text, role: enumeration("review", "comparison", "origin", "official"),
  }) },
});

async function research(listing) {
  const result = await request("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model, store: false,
      instructions: skill,
      input: `Research the following catalog listing. If excluded, other text fields may be empty. Use the supplied official product URL as a starting point.\n${JSON.stringify(listing)}`,
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      text: { format: { type: "json_schema", name: "wine_research", strict: true, schema } },
    }),
  }, "OpenAI wine research", 150_000);
  const output = result.output ?? [];
  const searched = output.filter((entry) => entry.type === "web_search_call" && entry.status === "completed");
  const messages = output.filter((entry) => entry.type === "message").flatMap((entry) => entry.content);
  const answer = messages.find((entry) => entry.type === "output_text");
  if (result.status !== "completed" || !searched.length || !answer?.text) {
    throw new Error("AI research returned incomplete evidence");
  }
  const wine = JSON.parse(answer.text);
  if (wine.type === "exclude") return wine;
  const consulted = new Set([
    ...searched.flatMap((entry) => (entry.action?.sources ?? []).map((source) => source.url)),
    ...messages.flatMap((entry) => (entry.annotations ?? []).map((annotation) => annotation.url)),
    listing.url,
  ].map((url) => httpsUrl(url)).filter(Boolean));
  wine.sources = wine.sources.filter((source) => consulted.has(httpsUrl(source.url)));
  if (wine.score !== null && !wine.sources.some((source) => source.role === "review")) {
    wine.score = null;
    wine.confidence = "low";
    wine.rationale = { en: "Insufficient verified tasting evidence for a score.", zh: "缺少可核实的品鉴资料，暂不评分。" };
  }
  if (wine.comparison && !wine.sources.some((source) => source.role ===
      (wine.comparison.kind === "style" ? "comparison" : "origin"))) wine.comparison = null;
  if (wine.comparison) {
    const comparison = wine.comparison;
    const totalWine = httpsUrl(comparison.totalWineUrl);
    const product = httpsUrl(comparison.productUrl);
    const retailer = totalWine && new URL(totalWine);
    const sku = retailer?.hostname === "www.totalwine.com" &&
      retailer.pathname.match(/^\/wine\/.+\/p\/(\d+)\/?$/)?.[1];
    comparison.totalWineUrl = sku && consulted.has(totalWine) ? totalWine : null;
    comparison.productUrl = consulted.has(product) ? product : null;
    if (comparison.totalWineUrl) {
      const image = `https://www.totalwine.com/dynamic/x1000,sq/images/${sku}/${sku}-1-fr.png`;
      comparison.image = await fetch(image, { method: "HEAD", signal: AbortSignal.timeout(8_000) })
        .then((response) => response.ok && response.headers.get("content-type")?.startsWith("image/") ? image : null)
        .catch(() => null);
    } else {
      const image = httpsUrl(comparison.image);
      comparison.image = consulted.has(image) ? image : null;
    }
  }
  return wine;
}

async function refresh() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Set the OPENAI_API_KEY Actions secret.");
  let coverage = "category";
  let listings;
  try {
    listings = await officialCategory();
  } catch (error) {
    if (!process.env.SERPAPI_API_KEY) throw error;
    console.warn(`${error.message}. Using the official wine search via SerpApi.`);
    coverage = "search";
    listings = await officialSearch();
  }
  if (previous.coverage === "category" && coverage === "search") {
    throw new Error("The full category is unavailable. Keeping the last full catalog.");
  }
  const cache = previous.research ?? {};
  const previousById = new Map(previous.wines.map((wine) => [wine.id, wine]));
  const processed = new Set(listings.map((listing) => listing.id));
  const researchCache = {};
  const wines = [];
  for (const listing of listings) {
    const fingerprint = createHash("sha256").update(JSON.stringify({ skill, model, coverage, listing })).digest("hex");
    const previousWine = previousById.get(listing.id);
    let analysis = process.env.RERATE_ALL === "true" ? null : cache[listing.id];
    let description = listing.description;
    let image = listing.image;
    if (analysis?.fingerprint !== fingerprint) {
      console.log(`Researching ${listing.id} (${wines.length} wines so far)`);
      if (coverage === "search") {
        const details = (await serp({ engine: "trader_joes_product", product_id: listing.id })).product_results;
        if (!details || details.product_id !== listing.id) throw new Error(`Invalid detail record for ${listing.id}`);
        description = details.description || "";
        image = httpsUrl(details.images?.[0], officialHost) || image;
      }
      try {
        const wine = await research({ ...listing, description });
        analysis = { fingerprint, wine };
      } catch (error) {
        throw new Error(`SKU ${listing.id}: ${error.message}`, { cause: error });
      }
    } else {
      if (coverage === "search" && includeOfficialCopy && previousWine &&
          !Object.hasOwn(previousWine, "description")) {
        const details = (await serp({ engine: "trader_joes_product", product_id: listing.id })).product_results;
        if (!details || details.product_id !== listing.id) throw new Error(`Invalid detail record for ${listing.id}`);
        description = details.description || "";
        image = httpsUrl(details.images?.[0], officialHost) || image;
      } else if (coverage === "search" && previousWine) {
        description = previousWine.description;
        image = previousWine.image || image;
      }
    }
    researchCache[listing.id] = analysis;
    if (analysis.wine.type === "exclude") continue;
    const { description: _description, image: _image, ...facts } = listing;
    const wine = { ...facts, ...analysis.wine, listed: "current", image: image || previousWine?.image };
    if (!wine.comparison && previousWine?.name === wine.name && previousWine.comparison) {
      wine.comparison = previousWine.comparison;
      wine.sources = [...wine.sources, ...previousWine.sources.filter((source) => ["comparison", "origin"].includes(source.role))];
    }
    if (includeOfficialCopy && description) wine.description = description;
    wines.push(wine);
  }
  if (!wines.length) throw new Error("No wines identified. Keeping the last catalog.");
  for (const wine of previous.wines) {
    if (!processed.has(wine.id)) wines.push({ ...wine, listed: "archive" });
  }
  const next = { coverage, updatedAt: new Date().toISOString(), wines, research: researchCache };
  if (JSON.stringify({ ...next, updatedAt: null }) === JSON.stringify({ ...previous, updatedAt: null })) {
    console.log("Catalog and research are current.");
    return;
  }
  const pending = new URL("wines.json.tmp", catalogFile);
  await writeFile(pending, JSON.stringify(next, null, 2) + "\n");
  await rename(pending, catalogFile);
  console.log(`Catalog contains ${wines.length} wines from ${listings.length} listings.`);
}

await refresh().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

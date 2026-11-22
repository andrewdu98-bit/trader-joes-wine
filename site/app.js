const copy = {
  en: {
    brand: "The Wine Aisle", guide: "An independent Trader Joe’s wine guide",
    headline: ["Good wine.", "Grocery prices."],
    intro: "Find your next bottle with tasting notes, premium comparisons, and AI scores informed by published reviews.",
    browse: "Browse the aisle", searchLabel: "Search wines", search: "Search wine, region, year or lot", sortLabel: "Sort wines",
    catalogSort: "Catalog order", topRated: "Highest rated", lowPrice: "Lowest price", byName: "Name A–Z",
    footer: "Independent guide. Prices and availability vary by store.", source: "Trader Joe’s wine search",
    sample: "Sample catalog", snapshot: "Official listings and catalog archive",
    reserveOnly: "Trader Joe’s Reserve", archive: "Archived listing", reserve: "Reserve",
    petit: "Petit Reserve", grand: "Grand Reserve", platinum: "Platinum Reserve", diamond: "Diamond Reserve", growers: "Grower’s Reserve", gran: "Gran Reserva",
    tierLabel: "Filter by Reserve tier", anyTier: "Any Reserve tier", lot: (n) => `Lot ${n}`, listing: "Release record",
    premiumPick: "Premium comparison", comparisonCount: (n) => `${n} premium comparisons`, originDetails: "Producer and lot evidence",
    totalWine: "View at Total Wine", viewProducer: "View comparison wine", currentOnly: "Currently listed",
    styleNote: "Comparable in style. An origin link is unconfirmed.", producerNote: "Separate bottling. A shared lot has not been established.", searchCoverage: "Official wine search", categoryCoverage: "Official online category",
    updated: "Updated", all: "All wines", red: "Red", white: "White", rose: "Rosé", sparkling: "Sparkling", other: "Other wine",
    count: (n) => `${n} ${n === 1 ? "wine" : "wines"}`,
    loading: "Loading wines…", failed: "The wine catalog could not be loaded. Try refreshing this page.",
    empty: "No wines match your filters.", view: "View wine details", unpriced: "Price unavailable",
    score: "AI score", unrated: "Unrated", confidence: "Evidence confidence",
    scoreMethod: "The AI score weighs quality (60 points), value (25), and character or typicity (15).",
    low: "Low", medium: "Moderate", high: "High", close: "Close",
    officialNotes: "Tasting notes", officialDescription: "Trader Joe’s description", reputation: "What it’s known for",
    sameProducer: "Premium wine from the same producer", confirmed: "Confirmed original bottling", possible: "Possible origin", style: "Premium style comparison",
    noComparison: "No sourced premium comparison yet.", sources: "Sources", official: "Trader Joe’s product page",
    review: "Review", comparison: "Comparison", origin: "Origin", language: "Language", wineStyle: "Wine style",
  },
  zh: {
    brand: "葡萄酒货架", guide: "独立的 Trader Joe’s 葡萄酒指南",
    headline: ["好酒入口，", "平价入手。"],
    intro: "参考品鉴笔记、高价酒款对比和基于公开评论的 AI 评分，挑选下一瓶酒。",
    browse: "浏览酒款", searchLabel: "搜索酒款", search: "搜索酒名、产区、年份或批次", sortLabel: "排序酒款",
    catalogSort: "目录顺序", topRated: "评分从高到低", lowPrice: "价格从低到高", byName: "按英文酒名排序",
    footer: "独立指南。价格与供货因门店而异。", source: "Trader Joe’s 官方酒款搜索",
    sample: "样本酒单", snapshot: "官网在列与历史目录",
    reserveOnly: "Trader Joe’s Reserve 系列", archive: "历史目录", reserve: "Reserve",
    petit: "Petit Reserve", grand: "Grand Reserve", platinum: "Platinum Reserve", diamond: "Diamond Reserve", growers: "Grower’s Reserve", gran: "Gran Reserva",
    tierLabel: "按 Reserve 系列筛选", anyTier: "所有 Reserve 系列", lot: (n) => `Lot ${n}`, listing: "发行记录",
    premiumPick: "高端参考", comparisonCount: (n) => `${n} 款附高端对比`, originDetails: "酒庄与批次线索",
    totalWine: "查看 Total Wine 商品页", viewProducer: "查看参考酒款", currentOnly: "仅看当前在列",
    styleNote: "同风格参考，尚无证据表明两款酒同源。", producerNote: "独立酒款，尚无证据表明两款酒属于同一批次。", searchCoverage: "官方葡萄酒搜索", categoryCoverage: "官方线上分类",
    updated: "更新于", all: "全部", red: "红葡萄酒", white: "白葡萄酒", rose: "桃红", sparkling: "起泡酒", other: "其他酒款",
    count: (n) => `${n} 款酒`,
    loading: "正在加载酒单…", failed: "酒单加载失败，请刷新页面重试。",
    empty: "没有符合筛选条件的酒款。", view: "查看酒款详情", unpriced: "暂无价格",
    score: "AI 评分", unrated: "暂无评分", confidence: "证据可信度",
    scoreMethod: "AI 评分由酒款品质（60 分）、性价比（25 分）及风格特色或典型性（15 分）组成。",
    low: "低", medium: "中", high: "高", close: "关闭",
    officialNotes: "品鉴笔记", officialDescription: "Trader Joe’s 官方描述", reputation: "口碑与特色",
    sameProducer: "同一酒庄的高端酒款", confirmed: "已证实的原版酒款", possible: "可能的来源", style: "高价同风格参考",
    noComparison: "暂无有来源支持的高价参考酒款。", sources: "参考来源", official: "Trader Joe’s 官方产品页",
    review: "品鉴评论", comparison: "对比参考", origin: "来源调查", language: "语言", wineStyle: "葡萄酒类型",
  },
};
const $ = (selector) => document.querySelector(selector);
const styleFilters = ["all", "red", "white", "rose", "sparkling", "other"];
const reserveTiers = ["petit", "reserve", "grand", "platinum", "diamond", "growers", "gran"];
const browserLocales = { en: "en-US", zh: "zh-Hans" };
const languages = [...document.querySelectorAll("[data-language]")];

let language = "en";
try { if (localStorage.getItem("wine-language") === "zh") language = "zh"; } catch {}
let style = "all";
let catalog;
let loadFailed = false;
let openWine;
const words = () => copy[language];
const localized = (value) => value?.[language] || "";
const scoreText = (wine) => wine.score == null ? words().unrated : `${words().score} ${wine.score}/100`;
const priceText = (wine) => wine.price == null ? words().unpriced :
  new Intl.NumberFormat(browserLocales[language], { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" }).format(wine.price);

function element(tag, value) {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}

function verifiedLink(label, url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    const link = element("a", label);
    link.href = parsed.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  } catch {
    return null;
  }
}

function reserveTier(wine) {
  if (reserveTiers.includes(wine.reserveTier)) return wine.reserveTier;
  const match = wine.name.match(/^(?:Trader Joe[’']s\s+)?(?:Organic\s+)?(?:(Petit|Grand|Platinum|Plat|Diamond|Grower[’']s)\s+)?(?:Reserve|Rsv)\b/i);
  if (!match) return "";
  const tier = match[1]?.toLowerCase() || "reserve";
  return ({ plat: "platinum", "grower’s": "growers", "grower's": "growers" })[tier] || tier;
}

function releaseName(wine) {
  return [
    wine.name,
    wine.vintage && !wine.name.includes(wine.vintage) && wine.vintage,
    wine.lot && !/\blot\b/i.test(wine.name) && words().lot(wine.lot),
  ].filter(Boolean).join(" · ");
}

function releaseLink(wine) {
  const t = words();
  return verifiedLink(t.official, wine.url) || (
    wine.listed === "archive" && verifiedLink(t.listing,
      wine.sources.find((source) => source.role === "review" || source.role === "listing")?.url)
  );
}

function bottlePhoto(url, name) {
  const photo = verifiedLink(name, url);
  if (!photo) return null;
  const image = document.createElement("img");
  image.src = photo.href;
  image.alt = name;
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  return image;
}

function renderDetails(wine) {
  const t = words();
  const title = element("h2", releaseName(wine));
  title.id = "wine-title";
  const body = [
    title,
    element("p", [t[wine.type], t[reserveTier(wine)], localized(wine.region), priceText(wine), wine.size, wine.listed === "archive" && t.archive].filter(Boolean).join(" · ")),
  ];
  const official = releaseLink(wine);
  if (official) body.push(official);
  for (const key of ["officialNotes", "reputation"]) {
    if (localized(wine[key])) body.push(element("h3", t[key]), element("p", localized(wine[key])));
  }
  if (localized(wine.originNotes)) {
    body.push(element("h3", t.originDetails), element("p", localized(wine.originNotes)));
  }
  body.push(element("h3", wine.comparison ? t[wine.comparison.kind] : t.style));
  if (wine.comparison) {
    const comparison = wine.comparison;
    const panel = element("div", "");
    panel.className = "comparison-panel";
    const photo = bottlePhoto(comparison.image, comparison.name);
    if (photo) {
      photo.addEventListener("error", () => photo.remove());
      panel.append(photo);
    }
    const summary = element("div", "");
    summary.append(element("strong", comparison.name), element("p", localized(comparison.note)));
    if (comparison.kind === "style" || comparison.kind === "sameProducer") {
      const note = element("p", comparison.kind === "style" ? t.styleNote : t.producerNote);
      note.className = "comparison-note";
      summary.append(note);
    }
    const retailer = verifiedLink(t.totalWine, comparison.totalWineUrl);
    const producer = verifiedLink(t.viewProducer, comparison.productUrl);
    if (retailer || producer) summary.append(retailer || producer);
    panel.append(summary);
    body.push(panel);
  } else {
    body.push(element("p", t.noComparison));
  }
  body.push(element("h3", scoreText(wine)));
  const rationale = localized(wine.rationale);
  if (rationale) body.push(element("p", rationale));
  if (wine.score != null) body.push(element("p", `${t.confidence} · ${t[wine.confidence]}`), element("p", t.scoreMethod));
  if (wine.description) {
    const original = element("p", wine.description);
    original.lang = "en";
    body.push(element("h3", t.officialDescription), original);
  }
  const list = document.createElement("ul");
  const sources = [{ label: t.official, url: wine.url }, ...wine.sources.filter((source) => source.role !== "official" || source.url !== wine.url)];
  for (const source of sources) {
    const label = source.role ? `${t[source.role]} · ${source.label}` : source.label;
    const link = verifiedLink(label, source.url);
    if (link) {
      const item = document.createElement("li");
      item.append(link);
      list.append(item);
    }
  }
  body.push(element("h3", t.sources), list);
  $("#detail-content").replaceChildren(...body);
}

function renderCard(wine) {
  const card = $("#card").content.cloneNode(true);
  const art = card.querySelector(".wine-art");
  art.dataset.style = wine.type;
  if (wine.image && verifiedLink(wine.name, wine.image)) {
    const image = bottlePhoto(wine.image, wine.name);
    image.addEventListener("error", () => {
      image.remove();
      art.setAttribute("aria-hidden", "true");
    });
    art.removeAttribute("aria-hidden");
    art.append(image);
  }
  card.querySelector(".wine-style").textContent = words()[wine.type];
  card.querySelector(".wine-region").textContent = localized(wine.region);
  const title = releaseName(wine);
  card.querySelector("h3").textContent = title;
  const tier = card.querySelector(".wine-tier");
  const labels = [words()[reserveTier(wine)], wine.listed === "archive" && words().archive].filter(Boolean);
  tier.hidden = !labels.length;
  tier.textContent = labels.join(" · ");
  const notes = card.querySelector(".wine-notes");
  notes.textContent = localized(wine.officialNotes) || localized(wine.reputation);
  notes.hidden = !notes.textContent;
  const comparison = card.querySelector(".card-comparison");
  if (wine.comparison) {
    comparison.hidden = false;
    comparison.append(element("span", words().premiumPick), element("strong", wine.comparison.name));
  }
  const official = card.querySelector(".official-link");
  const link = releaseLink(wine);
  if (link) {
    official.href = link.href;
    official.textContent = wine.url ? "Trader Joe’s" : link.textContent;
    official.setAttribute("aria-label", `${link.textContent} · ${title}`);
  } else official.remove();
  card.querySelector(".price").textContent = priceText(wine);
  card.querySelector(".score").textContent = scoreText(wine);
  const button = card.querySelector(".view");
  button.textContent = words().view;
  button.setAttribute("aria-label", `${words().view} · ${title}`);
  const showWine = () => {
    openWine = wine;
    renderDetails(wine);
    $("#details").showModal();
  };
  button.addEventListener("click", showWine);
  comparison.addEventListener("click", showWine);
  return card;
}

function renderCatalog() {
  const t = words();
  if (!catalog) {
    $("#count").textContent = loadFailed ? t.failed : t.loading;
    return;
  }
  const label = { sample: t.sample, search: t.searchCoverage, category: t.categoryCoverage, snapshot: t.snapshot }[catalog.coverage];
  const updated = catalog.updatedAt && new Intl.DateTimeFormat(browserLocales[language], {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Detroit",
  }).format(new Date(catalog.updatedAt));
  $("#coverage").textContent = updated ? `${label} · ${t.updated} ${updated}` : label;
  const terms = $("#search").value.toLowerCase().split(/\s+/).filter(Boolean);
  const selectedTier = $("#reserve-tier").value;
  const reserveOnly = $("#reserve").checked;
  const currentOnly = $("#current-only").checked;
  const wines = catalog.wines.filter((wine) => {
    const tier = reserveTier(wine);
    if ((style !== "all" && wine.type !== style) || (reserveOnly && !tier) ||
        (selectedTier && tier !== selectedTier) || (currentOnly && wine.listed === "archive")) return false;
    const searchable = [
      releaseName(wine), wine.lot && `#${wine.lot}`, wine.lot && `批次 ${wine.lot}`, wine.region?.en, wine.region?.zh,
      t[wine.type], t[tier], wine.comparison?.name, wine.originNotes?.en, wine.originNotes?.zh, wine.id,
    ].join(" ").toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  const byName = (a, b) => a.name.localeCompare(b.name, "en");
  const rankings = {
    catalog: () => 0,
    score: (a, b) => (b.score ?? -1) - (a.score ?? -1) || byName(a, b),
    price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || byName(a, b),
    name: byName,
  };
  wines.sort(rankings[$("#sort").value]);
  const compared = wines.filter((wine) => wine.comparison).length;
  $("#count").textContent = wines.length ? [t.count(wines.length), compared && t.comparisonCount(compared)].filter(Boolean).join(" · ") : t.empty;
  $("#wines").replaceChildren(...wines.map(renderCard));
}

for (const value of styleFilters) {
  const button = element("button", words()[value]);
  button.type = "button";
  button.dataset.style = value;
  button.addEventListener("click", () => {
    style = value;
    updateFilters();
    renderCatalog();
  });
  $(".filters").append(button);
}

for (const tier of reserveTiers) {
  const option = element("option", words()[tier]);
  option.value = tier;
  option.dataset.copy = tier;
  $("#reserve-tier").append(option);
}

function updateFilters() {
  for (const button of $(".filters").children) {
    button.textContent = words()[button.dataset.style];
    button.setAttribute("aria-pressed", String(style === button.dataset.style));
  }
}

function setLanguage() {
  const t = words();
  document.documentElement.lang = browserLocales[language];
  document.title = t.brand;
  for (const node of document.querySelectorAll("[data-copy]")) {
    const value = t[node.dataset.copy];
    if (Array.isArray(value)) node.replaceChildren(value[0], document.createElement("br"), value[1]);
    else node.textContent = value;
  }
  for (const button of languages) button.setAttribute("aria-pressed", String(language === button.dataset.language));
  $(".languages").setAttribute("aria-label", t.language);
  $(".filters").setAttribute("aria-label", t.wineStyle);
  $(".close").setAttribute("aria-label", t.close);
  $("#search").placeholder = t.search;
  updateFilters();
  renderCatalog();
  if ($("#details").open && openWine) renderDetails(openWine);
}

for (const button of languages) {
  button.addEventListener("click", () => {
    language = button.dataset.language;
    try { localStorage.setItem("wine-language", language); } catch {}
    setLanguage();
  });
}
$("#search").addEventListener("input", renderCatalog);
$("#sort").addEventListener("change", renderCatalog);
$("#reserve").addEventListener("change", renderCatalog);
$("#reserve-tier").addEventListener("change", renderCatalog);
$("#current-only").addEventListener("change", renderCatalog);
$("#details").addEventListener("close", () => { openWine = undefined; });
setLanguage();

try {
  const catalogUrl = new URL("./data/wines.json", import.meta.url);
  catalogUrl.search = new URL(import.meta.url).search;
  const response = await fetch(catalogUrl, { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  catalog = await response.json();
} catch (error) {
  loadFailed = true;
  console.error(error);
}
renderCatalog();

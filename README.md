# The Wine Aisle

A static English and Simplified Chinese guide to wines listed by Trader Joe’s. Each bottle has tasting notes, a short explanation of its reputation, a premium comparison when supported, and an AI score with links to the evidence.

## Preview

Run `python3 -m http.server 8000 --directory site` and open [localhost:8000](http://localhost:8000/). The checked-in snapshot contains three sourced sample wines.

## GitHub Pages and manual refresh

1. In **Settings → Pages**, select **GitHub Actions** as the source. To publish the existing snapshot, run **Actions → Refresh and publish wine catalog** on the default branch with **Publish the saved catalog** checked.
2. Add `OPENAI_API_KEY` under **Settings → Secrets and variables → Actions → Secrets**. The default model is `gpt-5-mini`. Set the `OPENAI_MODEL` repository variable to override it with a model supporting Responses web search and structured output.
3. Run the same workflow with **Publish the saved catalog** unchecked. It reads Trader Joe’s category pages through the site’s GraphQL endpoint, then uses the [wine research skill](.agents/skills/wine-research/SKILL.md) to research new and changed listings before publishing. The action saves the generated snapshot to the default branch, which must allow pushes from the workflow token. **Re-research every listing** also refreshes existing reviews and comparisons. There is no scheduled trigger.
4. If direct requests are blocked, add an optional `SERPAPI_API_KEY` Actions secret. The fallback reads Trader Joe’s keyword results for `wine` in category 200 and fetches official product details. The site labels this keyword-based coverage, and the workflow preserves the last full-category snapshot if the direct category is unavailable. Both providers can incur usage charges. See [SerpApi search](https://serpapi.com/trader-joes-search-api) and [product lookup](https://serpapi.com/trader-joes-product-api).

Trader Joe’s [says its online catalog omits some items](https://www.traderjoes.com/home/products/category/wine-beer-and-liquor-200). Coverage is online listings, and store stock and prices can vary. A failed refresh keeps the previous snapshot. AI scores summarize cited evidence and may be omitted if tasting evidence is thin.

The site defaults to original summaries and generic bottle illustrations because [Trader Joe’s terms require written permission to republish its content](https://www.traderjoes.com/home/terms-of-use). With that permission, set the `TJ_MEDIA_PERMISSION` repository variable to `true` and refresh to display the official product image URL and the original English description alongside the bilingual notes.

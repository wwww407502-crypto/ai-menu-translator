function mergeMultiPageResults(pageResults) {
  if (!pageResults.length) return { items: [], parseWarnings: ['No pages parsed'] };
  if (pageResults.length === 1) return pageResults[0];

  const merged = pageResults[0];
  const parseWarnings = merged.parseWarnings || [];
  const seenNames = new Set();

  for (const item of merged.items || []) {
    const key = (item.originalName || '').toLowerCase().trim();
    if (key) seenNames.add(key);
  }

  for (let i = 1; i < pageResults.length; i++) {
    const page = pageResults[i];
    (page.parseWarnings || []).forEach(w =>
      parseWarnings.push(`Page ${i + 1}: ${w}`)
    );

    for (const item of page.items || []) {
      const key = (item.originalName || '').toLowerCase().trim();
      if (!key || seenNames.has(key)) continue;
      seenNames.add(key);
      merged.items.push(item);
    }
  }

  parseWarnings.push(`Merged ${pageResults.length} pages — ${merged.items.length} items`);
  merged.parseWarnings = parseWarnings;
  merged.pageCount = pageResults.length;

  return merged;
}

module.exports = { mergeMultiPageResults };

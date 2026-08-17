const text = (value) => String(value ?? '').trim()
const normalized = (value) => text(value).toLocaleLowerCase()

function keywordsFor(profile) {
  const source = Array.isArray(profile?.roleKeywords) ? profile.roleKeywords : typeof profile?.roleKeywords === 'string' ? profile.roleKeywords.split(/[\n,，]/) : []
  return [...new Set(source.map(text).filter(Boolean))]
}

export function recommendProfile(profiles, analysis) {
  const haystack = normalized([analysis?.pageTitle, analysis?.contextText].filter(Boolean).join(' '))
  if (!haystack) return null

  const candidates = (Array.isArray(profiles) ? profiles : []).map((profile) => {
    const matchedKeywords = keywordsFor(profile).filter((keyword) => haystack.includes(normalized(keyword)))
    return { profile, matchedKeywords }
  }).filter(({ profile, matchedKeywords }) => profile?.id && matchedKeywords.length)

  if (!candidates.length) return null
  const winner = candidates.reduce((best, candidate) => candidate.matchedKeywords.length > best.matchedKeywords.length ? candidate : best)
  return { profileId: winner.profile.id, label: text(winner.profile.label) || 'Resume', matchedKeywords: winner.matchedKeywords }
}

export function calculateSupport(items) {
  const counts = { total: 0, ready: 0, manual: 0, sensitive: 0, unsupported: 0, skipped: 0 }
  for (const item of Array.isArray(items) ? items : []) {
    counts.total += 1
    if (item?.status === 'ready' || item?.status === 'filled') counts.ready += 1
    else if (item?.status === 'manual') counts.manual += 1
    else if (item?.status === 'sensitive') counts.sensitive += 1
    else if (item?.status === 'unsupported') counts.unsupported += 1
    else if (item?.status === 'skipped') counts.skipped += 1
  }
  return { ...counts, percentage: counts.total ? Math.round((counts.ready / counts.total) * 100) : 0 }
}

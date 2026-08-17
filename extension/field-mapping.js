const compact = (value) => String(value ?? '').trim()
const comparable = (value) => compact(value).toLocaleLowerCase().replace(/\s+/g, ' ')

function profileFields(profile) {
  return profile?.fields && typeof profile.fields === 'object' ? profile.fields : {}
}

function customAnswer(field, profile) {
  const label = comparable(field.label)
  return (Array.isArray(profile?.customAnswers) ? profile.customAnswers : []).find((answer) => {
    const target = comparable(answer?.label)
    return target && (label === target || label.includes(target) || target.includes(label))
  })?.value
}

export function buildFillPlan(fields, profile) {
  return fields.map((field) => {
    if (field.sensitive || field.key === 'declaration') return { ...field, status: 'sensitive', reason: '敏感声明、同意或平等机会题必须由本人填写' }
    if (field.kind === 'file' || field.key === 'resume') return { ...field, status: 'unsupported', reason: '简历文件需由本人选择和上传' }
    const directValue = compact(profileFields(profile)[field.key])
    const value = directValue || compact(customAnswer(field, profile))
    if (value) return { ...field, status: 'ready', value, reason: directValue ? '已匹配当前资料' : '已匹配自定义答案' }
    if (field.required || field.key !== 'unknown') return { ...field, status: 'manual', reason: '未找到已审核的填写内容' }
    return { ...field, status: 'skipped', reason: '非必填且未识别的字段' }
  })
}

export function normalizeAiMappings(mappings, fields, profile) {
  const allowedValues = new Set([
    ...Object.values(profileFields(profile)).map(compact),
    ...(Array.isArray(profile?.customAnswers) ? profile.customAnswers.map((answer) => compact(answer?.value)) : []),
  ].filter(Boolean))
  const knownFields = new Map(fields.map((field) => [field.fieldId, field]))
  return Object.fromEntries((Array.isArray(mappings) ? mappings : []).flatMap((mapping) => {
    if (!mapping || typeof mapping !== 'object') return []
    const fieldId = compact(mapping.fieldId)
    const value = compact(mapping.value)
    const field = knownFields.get(fieldId)
    if (!field || field.sensitive || field.kind === 'file' || !value || !allowedValues.has(value)) return []
    return [[fieldId, value]]
  }))
}

export function applyAiMappings(plan, mappings) {
  return plan.map((item) => mappings[item.fieldId] && item.status === 'manual' ? { ...item, status: 'ready', value: mappings[item.fieldId], reason: '已由 AI 映射到当前资料中的已审核值' } : item)
}

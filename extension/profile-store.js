export const STORAGE_KEY = 'job-workbench-autofill-v1'

export const FIELD_KEYS = ['name', 'email', 'phone', 'education', 'school', 'degree', 'major', 'graduationDate', 'city', 'linkedIn', 'github', 'portfolio', 'workAuthorization']

const defaultFields = () => Object.fromEntries(FIELD_KEYS.map((key) => [key, '']))

const defaultProvider = () => ({
  protocol: 'openai-compatible',
  baseUrl: '',
  model: 'gpt-4o-mini',
  apiKey: '',
  headersJson: '{}',
  requestTemplate: '{"model":{{modelJson}},"prompt":{{promptJson}}}',
  responsePath: 'choices.0.message.content',
})

const idFor = () => typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const stringValue = (value) => typeof value === 'string' ? value.trim() : ''

function normalizeAnswers(value) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const candidate = item
    const label = stringValue(candidate.label)
    const answer = stringValue(candidate.value)
    return label && answer ? [{ id: stringValue(candidate.id) || `answer-${index + 1}`, label, value: answer }] : []
  })
}

export function createProfile(label = '我的简历', id = idFor()) {
  return { id, label: stringValue(label) || '我的简历', fields: defaultFields(), customAnswers: [] }
}

export function normalizeProfile(value, index = 0) {
  if (!value || typeof value !== 'object') return createProfile(`我的简历 ${index + 1}`)
  const candidate = value
  return {
    id: stringValue(candidate.id) || `profile-${index + 1}`,
    label: stringValue(candidate.label) || `我的简历 ${index + 1}`,
    fields: { ...defaultFields(), ...(candidate.fields && typeof candidate.fields === 'object' ? Object.fromEntries(FIELD_KEYS.map((key) => [key, stringValue(candidate.fields[key])])) : {}) },
    customAnswers: normalizeAnswers(candidate.customAnswers),
  }
}

export function normalizeState(value) {
  const candidate = value && typeof value === 'object' ? value : {}
  const profiles = Array.isArray(candidate.profiles) && candidate.profiles.length ? candidate.profiles.map(normalizeProfile) : [createProfile()]
  const requestedActiveId = stringValue(candidate.activeProfileId)
  const providerInput = candidate.provider && typeof candidate.provider === 'object' ? candidate.provider : {}
  const provider = {
    ...defaultProvider(),
    protocol: providerInput.protocol === 'custom-json' ? 'custom-json' : 'openai-compatible',
    baseUrl: stringValue(providerInput.baseUrl),
    model: stringValue(providerInput.model) || defaultProvider().model,
    apiKey: stringValue(providerInput.apiKey),
    headersJson: stringValue(providerInput.headersJson) || '{}',
    requestTemplate: stringValue(providerInput.requestTemplate) || defaultProvider().requestTemplate,
    responsePath: stringValue(providerInput.responsePath) || defaultProvider().responsePath,
  }
  return {
    version: 1,
    profiles,
    activeProfileId: profiles.some((profile) => profile.id === requestedActiveId) ? requestedActiveId : profiles[0].id,
    provider,
  }
}

export async function loadState(storage = chrome.storage.local) {
  const stored = await storage.get(STORAGE_KEY)
  return normalizeState(stored[STORAGE_KEY])
}

export async function saveState(state, storage = chrome.storage.local) {
  const normalized = normalizeState(state)
  await storage.set({ [STORAGE_KEY]: normalized })
  return normalized
}

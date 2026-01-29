import { useState, useMemo } from 'react'

// Prix des modèles ($/1M tokens)
const MODELS = {
  // OpenAI
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    provider: 'OpenAI',
    input: 0.05,
    output: 0.40,
    pass2Model: 'gpt-5-mini',
    pass2Input: 0.25,
    pass2Output: 2.00,
    webSearchCost: 10.00,
    logo: '🟢',
    color: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    input: 0.25,
    output: 2.00,
    pass2Model: 'gpt-5-mini',
    pass2Input: 0.25,
    pass2Output: 2.00,
    webSearchCost: 10.00,
    logo: '🟢',
    color: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
  },
  'gpt-5.2': {
    name: 'GPT-5.2',
    provider: 'OpenAI',
    input: 1.75,
    output: 14.00,
    pass2Model: 'gpt-5-mini',
    pass2Input: 0.25,
    pass2Output: 2.00,
    webSearchCost: 10.00,
    logo: '🟢',
    color: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
  },
  // Google
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    input: 0.10,
    output: 0.40,
    pass2Model: 'gemini-2.5-flash-lite',
    pass2Input: 0.10,
    pass2Output: 0.40,
    webSearchCost: 35.00,
    logo: '🔵',
    color: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash',
    provider: 'Google',
    input: 0.50,
    output: 3.00,
    pass2Model: 'gemini-2.5-flash-lite',
    pass2Input: 0.10,
    pass2Output: 0.40,
    webSearchCost: 35.00,
    logo: '🔵',
    color: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
  },
  'gemini-3-pro-preview': {
    name: 'Gemini 3 Pro',
    provider: 'Google',
    input: 2.00,
    output: 12.00,
    pass2Model: 'gemini-2.5-flash-lite',
    pass2Input: 0.10,
    pass2Output: 0.40,
    webSearchCost: 35.00,
    logo: '🔵',
    color: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
  },
  // Mistral
  'mistral-small-latest': {
    name: 'Mistral Small',
    provider: 'Mistral AI',
    input: 0.10,
    output: 0.30,
    pass2Model: 'mistral-small-latest',
    pass2Input: 0.10,
    pass2Output: 0.30,
    webSearchCost: 30.00,
    logo: '🟠',
    color: 'from-orange-500/20 to-orange-600/10',
    border: 'border-orange-500/30',
    accent: 'text-orange-400',
  },
  'mistral-medium-3': {
    name: 'Mistral Medium 3',
    provider: 'Mistral AI',
    input: 0.40,
    output: 2.00,
    pass2Model: 'mistral-small-latest',
    pass2Input: 0.10,
    pass2Output: 0.30,
    webSearchCost: 30.00,
    logo: '🟠',
    color: 'from-orange-500/20 to-orange-600/10',
    border: 'border-orange-500/30',
    accent: 'text-orange-400',
  },
  'mistral-large-3': {
    name: 'Mistral Large 3',
    provider: 'Mistral AI',
    input: 0.50,
    output: 1.50,
    pass2Model: 'mistral-small-latest',
    pass2Input: 0.10,
    pass2Output: 0.30,
    webSearchCost: 30.00,
    logo: '🟠',
    color: 'from-orange-500/20 to-orange-600/10',
    border: 'border-orange-500/30',
    accent: 'text-orange-400',
  },
} as const

type ModelKey = keyof typeof MODELS

// Tokens moyens estimés par prompt
// Hypothèses : prompt ~35 mots, réponse ~400 mots (1 mot ≈ 1.3 tokens)
const AVG_TOKENS = {
  pass1Input: 50,      // Prompt utilisateur (~35 mots)
  pass1Output: 500,    // Réponse LLM (~400 mots)
  pass2Input: 600,     // Réponse Pass 1 + prompt d'extraction
  pass2Output: 100,    // JSON structuré des mentions
}

// Fréquences de refresh
const FREQUENCIES = {
  daily: { label: 'Quotidien', runsPerMonth: 30 },
  weekly: { label: 'Hebdomadaire', runsPerMonth: 4 },
  monthly: { label: 'Mensuel', runsPerMonth: 1 },
} as const

type FrequencyKey = keyof typeof FREQUENCIES

function formatCurrency(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(4)}`
  }
  return `$${value.toFixed(2)}`
}

function App() {
  const [promptCount, setPromptCount] = useState<number>(100)
  const [selectedModels, setSelectedModels] = useState<ModelKey[]>(['gpt-5-nano'])
  const [webSearchPercent, setWebSearchPercent] = useState<number>(100)
  const [frequency, setFrequency] = useState<FrequencyKey>('weekly')

  const toggleModel = (modelKey: ModelKey) => {
    const model = MODELS[modelKey]
    const provider = model.provider

    setSelectedModels(prev => {
      // Si déjà sélectionné, on désélectionne
      if (prev.includes(modelKey)) {
        return prev.filter(m => m !== modelKey)
      }
      // Sinon, on remplace le modèle du même provider (un seul par famille)
      const withoutSameProvider = prev.filter(m => MODELS[m].provider !== provider)
      return [...withoutSameProvider, modelKey]
    })
  }

  const runsPerMonth = FREQUENCIES[frequency].runsPerMonth

  const calculations = useMemo(() => {
    return selectedModels.map(modelKey => {
      const model = MODELS[modelKey]

      // Pass 1 cost
      const pass1InputCost = (promptCount * AVG_TOKENS.pass1Input / 1_000_000) * model.input
      const pass1OutputCost = (promptCount * AVG_TOKENS.pass1Output / 1_000_000) * model.output
      const pass1Total = pass1InputCost + pass1OutputCost

      // Pass 2 cost
      const pass2InputCost = (promptCount * AVG_TOKENS.pass2Input / 1_000_000) * model.pass2Input
      const pass2OutputCost = (promptCount * AVG_TOKENS.pass2Output / 1_000_000) * model.pass2Output
      const pass2Total = pass2InputCost + pass2OutputCost

      // Web search / grounding cost (basé sur le % de prompts avec web search)
      const webSearchCalls = promptCount * (webSearchPercent / 100)
      const webSearchTotal = (webSearchCalls / 1000) * model.webSearchCost

      const totalPerRun = pass1Total + pass2Total + webSearchTotal
      const totalMonthly = totalPerRun * runsPerMonth

      return {
        modelKey,
        model,
        pass1Total,
        pass2Total,
        webSearchTotal,
        totalPerRun,
        totalMonthly,
        breakdown: {
          pass1Input: pass1InputCost,
          pass1Output: pass1OutputCost,
          pass2Input: pass2InputCost,
          pass2Output: pass2OutputCost,
        }
      }
    })
  }, [promptCount, selectedModels, webSearchPercent, runsPerMonth])

  const grandTotalPerRun = calculations.reduce((sum, c) => sum + c.totalPerRun, 0)
  const grandTotalMonthly = calculations.reduce((sum, c) => sum + c.totalMonthly, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent" />

      <div className="relative max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 mb-4 tracking-wide uppercase">
            Estimateur de coût
          </div>
          <h1 className="text-3xl font-light tracking-tight mb-2">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              GEO Cost Calculator
            </span>
          </h1>
          <p className="text-zinc-500 text-sm font-light">
            Spark x VizibAI
          </p>
        </header>

        {/* Main content */}
        <div className="space-y-5">
          {/* Prompt count input */}
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-5">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Nombre de prompts
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={promptCount}
                onChange={(e) => setPromptCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-32 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 text-lg font-medium text-white focus:outline-none focus:border-zinc-500 transition-colors"
                min="0"
              />
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setPromptCount(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      promptCount === preset
                        ? 'bg-white text-zinc-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model selection */}
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-5">
            <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wider">
              Modèles LLM <span className="text-zinc-600">(1 par provider)</span>
            </label>
            <div className="space-y-4">
              {['OpenAI', 'Google', 'Mistral AI'].map(provider => {
                const providerModels = (Object.keys(MODELS) as ModelKey[]).filter(
                  k => MODELS[k].provider === provider
                )
                const providerEmoji = provider === 'OpenAI' ? '🟢' : provider === 'Google' ? '🔵' : '🟠'
                return (
                  <div key={provider}>
                    <div className="text-xs text-zinc-500 mb-2 flex items-center gap-2">
                      <span>{providerEmoji}</span>
                      <span>{provider}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {providerModels.map(modelKey => {
                        const model = MODELS[modelKey]
                        const isSelected = selectedModels.includes(modelKey)
                        return (
                          <button
                            key={modelKey}
                            onClick={() => toggleModel(modelKey)}
                            className={`relative p-4 rounded-xl border transition-all duration-300 text-left ${
                              isSelected
                                ? `bg-gradient-to-br ${model.color} ${model.border} border-2`
                                : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <div className="font-medium text-white text-sm">{model.name}</div>
                            <div className="text-xs text-zinc-500 mt-1">
                              ${model.input} / ${model.output}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Frequency selector */}
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-5">
            <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wider">
              Fréquence de refresh
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FREQUENCIES) as FrequencyKey[]).map(freq => {
                const { label, runsPerMonth: runs } = FREQUENCIES[freq]
                const isSelected = frequency === freq
                return (
                  <button
                    key={freq}
                    onClick={() => setFrequency(freq)}
                    className={`p-3 rounded-lg border transition-all duration-300 ${
                      isSelected
                        ? 'bg-white text-zinc-900 border-white'
                        : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600 text-white'
                    }`}
                  >
                    <div className="font-medium text-sm">{label}</div>
                    <div className={`text-xs ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      {runs}x / mois
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Web search percentage */}
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-medium text-sm">Web Search / Grounding</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  OpenAI: $10/1k • Gemini: $35/1k • Mistral: $30/1k
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-medium text-white">{webSearchPercent}%</div>
                <div className="text-xs text-zinc-500">des prompts</div>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={webSearchPercent}
              onChange={(e) => setWebSearchPercent(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between mt-1.5 text-xs text-zinc-600">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Results */}
          {calculations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs text-zinc-400 uppercase tracking-wider">Estimation des coûts</h2>

              {calculations.map(({ modelKey, model, pass1Total, pass2Total, webSearchTotal, totalPerRun, totalMonthly, breakdown }) => (
                <div
                  key={modelKey}
                  className={`bg-gradient-to-br ${model.color} backdrop-blur-sm rounded-xl border ${model.border} p-4`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{model.logo}</span>
                      <div>
                        <div className="font-medium text-white text-sm">{model.name}</div>
                        <div className="text-xs text-zinc-400">{model.provider}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-medium ${model.accent}`}>
                        {formatCurrency(totalMonthly)}
                      </div>
                      <div className="text-xs text-zinc-500">par mois</div>
                      <div className="text-xs text-zinc-600">
                        {formatCurrency(totalPerRun)} / exéc.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <div className="text-zinc-500 mb-0.5">Pass 1</div>
                      <div className="text-white font-medium">{formatCurrency(pass1Total)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-0.5">Pass 2</div>
                      <div className="text-white font-medium">{formatCurrency(pass2Total)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-0.5">
                        {modelKey.includes('gemini') ? 'Grounding' : 'Web Search'}
                      </div>
                      <div className="text-white font-medium">
                        {webSearchPercent > 0 ? formatCurrency(webSearchTotal) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand total */}
              {calculations.length >= 1 && (
                <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-zinc-400 text-sm">Total {calculations.length > 1 ? 'tous modèles' : ''}</div>
                      <div className="text-xs text-zinc-600">
                        {formatCurrency(grandTotalPerRun)} × {runsPerMonth}/mois
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-medium text-white">
                        {formatCurrency(grandTotalMonthly)}
                      </div>
                      <div className="text-xs text-zinc-500">par mois</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hypothèses */}
          <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl border border-zinc-800/50 p-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Hypothèses</h3>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-zinc-800/30 rounded-lg p-2">
                <div className="text-zinc-500">Pass 1 In</div>
                <div className="text-white font-medium">50 tok</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-2">
                <div className="text-zinc-500">Pass 1 Out</div>
                <div className="text-white font-medium">500 tok</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-2">
                <div className="text-zinc-500">Pass 2 In</div>
                <div className="text-white font-medium">600 tok</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-2">
                <div className="text-zinc-500">Pass 2 Out</div>
                <div className="text-white font-medium">100 tok</div>
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-2 text-center">
              1 mot ≈ 1.3 tokens • Web Search = {webSearchPercent}% des prompts
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

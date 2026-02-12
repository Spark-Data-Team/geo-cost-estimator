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

// Fréquences de refresh (runs par an)
const FREQUENCIES = {
  daily: { label: 'Quotidien', runsPerYear: 365 },
  weekly: { label: 'Hebdomadaire', runsPerYear: 52 },
  monthly: { label: 'Mensuel', runsPerYear: 12 },
} as const

type FrequencyKey = keyof typeof FREQUENCIES

function formatCurrency(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(4)}`
  }
  return `$${value.toFixed(2)}`
}

function App() {
  const [projectCount, setProjectCount] = useState<number>(1)
  const [promptCount, setPromptCount] = useState<number>(100)
  const [selectedModels, setSelectedModels] = useState<ModelKey[]>(['gpt-5-nano'])
  const [webSearchPercent, setWebSearchPercent] = useState<number>(100)
  const [frequency, setFrequency] = useState<FrequencyKey>('weekly')

  const toggleModel = (modelKey: ModelKey) => {
    const model = MODELS[modelKey]
    const provider = model.provider

    setSelectedModels(prev => {
      if (prev.includes(modelKey)) {
        return prev.filter(m => m !== modelKey)
      }
      const withoutSameProvider = prev.filter(m => MODELS[m].provider !== provider)
      return [...withoutSameProvider, modelKey]
    })
  }

  const runsPerYear = FREQUENCIES[frequency].runsPerYear

  const calculations = useMemo(() => {
    return selectedModels.map(modelKey => {
      const model = MODELS[modelKey]

      const pass1InputCost = (promptCount * AVG_TOKENS.pass1Input / 1_000_000) * model.input
      const pass1OutputCost = (promptCount * AVG_TOKENS.pass1Output / 1_000_000) * model.output
      const pass1Total = pass1InputCost + pass1OutputCost

      const pass2InputCost = (promptCount * AVG_TOKENS.pass2Input / 1_000_000) * model.pass2Input
      const pass2OutputCost = (promptCount * AVG_TOKENS.pass2Output / 1_000_000) * model.pass2Output
      const pass2Total = pass2InputCost + pass2OutputCost

      const webSearchCalls = promptCount * (webSearchPercent / 100)
      const webSearchTotal = (webSearchCalls / 1000) * model.webSearchCost

      const totalPerRun = pass1Total + pass2Total + webSearchTotal
      const totalYearly = totalPerRun * runsPerYear

      return {
        modelKey,
        model,
        pass1Total,
        pass2Total,
        webSearchTotal,
        totalPerRun,
        totalYearly,
      }
    })
  }, [promptCount, selectedModels, webSearchPercent, runsPerYear])

  const perProjectPerRun = calculations.reduce((sum, c) => sum + c.totalPerRun, 0)
  const perProjectYearly = calculations.reduce((sum, c) => sum + c.totalYearly, 0)
  const grandTotalPerRun = perProjectPerRun * projectCount
  const grandTotalYearly = perProjectYearly * projectCount

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <div className="max-w-3xl mx-auto px-8 py-16">

        {/* Header */}
        <header className="mb-16">
          <p className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-4">
            Estimateur de coût
          </p>
          <h1 className="text-3xl font-light tracking-tight text-zinc-100">
            GEO Cost Calculator
          </h1>
          <p className="text-sm text-zinc-600 mt-1 font-light">
            Spark × VizibAI
          </p>
        </header>

        {/* Main content */}
        <div className="space-y-12">

          {/* Project count */}
          <section>
            <label className="block text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
              Nombre de projets
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={projectCount}
                onChange={(e) => setProjectCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-transparent border-b border-zinc-700 px-1 py-2 text-2xl font-light text-zinc-100 focus:outline-none focus:border-accent transition-colors duration-300 tabular-nums"
                min="1"
              />
              <div className="flex gap-1.5">
                {[1, 5, 10, 25, 50].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setProjectCount(preset)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-all duration-200 ${
                      projectCount === preset
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Prompt count */}
          <section>
            <label className="block text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
              Nombre de prompts <span className="text-zinc-600 normal-case tracking-normal">(par projet)</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={promptCount}
                onChange={(e) => setPromptCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-28 bg-transparent border-b border-zinc-700 px-1 py-2 text-2xl font-light text-zinc-100 focus:outline-none focus:border-accent transition-colors duration-300 tabular-nums"
                min="0"
              />
              <div className="flex gap-1.5">
                {[50, 100, 500, 750, 1000, 5000].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setPromptCount(preset)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-all duration-200 ${
                      promptCount === preset
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Model selection */}
          <section>
            <label className="block text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-6">
              Modèles LLM <span className="text-zinc-600 normal-case tracking-normal">(1 par provider)</span>
            </label>
            <div className="space-y-8">
              {['OpenAI', 'Google', 'Mistral AI'].map(provider => {
                const providerModels = (Object.keys(MODELS) as ModelKey[]).filter(
                  k => MODELS[k].provider === provider
                )
                return (
                  <div key={provider}>
                    <div className="text-xs font-medium text-zinc-400 mb-3 tracking-wide">
                      {provider}
                    </div>
                    <div className="space-y-0.5">
                      {providerModels.map(modelKey => {
                        const model = MODELS[modelKey]
                        const isSelected = selectedModels.includes(modelKey)
                        return (
                          <button
                            key={modelKey}
                            onClick={() => toggleModel(modelKey)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-left group ${
                              isSelected
                                ? 'bg-zinc-800/80 border-l-2 border-accent'
                                : 'hover:bg-zinc-900 border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                isSelected ? 'bg-accent' : 'bg-zinc-700 group-hover:bg-zinc-500'
                              }`} />
                              <span className={`text-sm transition-colors duration-200 ${
                                isSelected ? 'text-zinc-100 font-medium' : 'text-zinc-400 group-hover:text-zinc-300'
                              }`}>
                                {model.name}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-600 tabular-nums">
                              ${model.input} / ${model.output}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Frequency selector */}
          <section>
            <label className="block text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
              Fréquence de refresh
            </label>
            <div className="inline-flex bg-zinc-900 rounded-full p-1">
              {(Object.keys(FREQUENCIES) as FrequencyKey[]).map(freq => {
                const { label, runsPerYear: runs } = FREQUENCIES[freq]
                const isSelected = frequency === freq
                return (
                  <button
                    key={freq}
                    onClick={() => setFrequency(freq)}
                    className={`px-5 py-2 rounded-full text-sm transition-all duration-200 ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {label}
                    <span className={`ml-1.5 text-xs ${isSelected ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {runs}×
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Web search percentage */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Web Search / Grounding
                </label>
                <div className="text-[11px] text-zinc-600 mt-0.5 tabular-nums">
                  OpenAI $10/1k · Gemini $35/1k · Mistral $30/1k
                </div>
              </div>
              <div className="text-2xl font-light text-accent tabular-nums">
                {webSearchPercent}<span className="text-sm text-zinc-500 ml-0.5">%</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={webSearchPercent}
                onChange={(e) => setWebSearchPercent(parseInt(e.target.value))}
                className="w-full"
                style={{ '--slider-progress': `${webSearchPercent}%` } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-zinc-700">
              <span>0%</span>
              <span>100%</span>
            </div>
          </section>

          {/* Results */}
          {calculations.length > 0 && (
            <section>
              <h2 className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] mb-6">
                Estimation des coûts
              </h2>

              <div className="divide-y divide-zinc-800/50">
                {calculations.map(({ modelKey, model, totalPerRun, totalYearly }) => (
                  <div
                    key={modelKey}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <div className="text-sm text-zinc-200">{model.name}</div>
                      <div className="text-xs text-zinc-600 mt-0.5">{model.provider}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-light text-zinc-100 tabular-nums">
                        {formatCurrency(totalYearly)}
                        <span className="text-xs text-zinc-600 ml-1.5">/an</span>
                      </div>
                      <div className="text-xs text-zinc-600 tabular-nums">
                        {formatCurrency(totalPerRun)} / exéc.
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand total */}
              {calculations.length >= 1 && (
                <div className="mt-6 pt-6 border-t border-zinc-700 space-y-4">
                  {projectCount > 1 && (
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-sm text-zinc-500">Par projet</div>
                        <div className="text-xs text-zinc-600 tabular-nums">
                          {formatCurrency(perProjectPerRun)} × {runsPerYear}/an
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-light text-zinc-300 tabular-nums">
                          {formatCurrency(perProjectYearly)}
                          <span className="text-xs text-zinc-600 ml-1.5">/an</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-sm text-zinc-400">
                        Total{projectCount > 1 ? ` ${projectCount} projets` : ''}{calculations.length > 1 ? ' · tous modèles' : ''}
                      </div>
                      <div className="text-xs text-zinc-600 tabular-nums">
                        {formatCurrency(grandTotalPerRun)} × {runsPerYear}/an
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-light text-accent tabular-nums">
                        {formatCurrency(grandTotalYearly)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">par an</div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Hypothèses */}
          <section className="pt-4">
            <div className="border-t border-zinc-800/50 pt-8">
              <h3 className="text-[11px] text-zinc-600 uppercase tracking-[0.2em] mb-4">
                Hypothèses
              </h3>
              <div className="flex items-center gap-6 text-xs text-zinc-600 tabular-nums">
                <span>Pass 1 In: <span className="text-zinc-400">50 tok</span></span>
                <span>Pass 1 Out: <span className="text-zinc-400">500 tok</span></span>
                <span>Pass 2 In: <span className="text-zinc-400">600 tok</span></span>
                <span>Pass 2 Out: <span className="text-zinc-400">100 tok</span></span>
              </div>
              <p className="text-[11px] text-zinc-700 mt-3">
                1 mot ≈ 1.3 tokens · Web Search = {webSearchPercent}% des prompts
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default App

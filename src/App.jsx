import React, { useEffect, useMemo, useRef, useState } from 'react'
import './css/style.css'

const currencies = {
	USD: 'Dólar Americano',
	EUR: 'Euro',
	BRL: 'Real Brasileiro',
	GBP: 'Libra Esterlina',
	JPY: 'Iene Japonês',
	CHF: 'Franco Suíço',
	CAD: 'Dólar Canadense',
	AUD: 'Dólar Australiano',
	CNY: 'Yuan Chinês',
	ARS: 'Peso Argentino',
	MXN: 'Peso Mexicano'
}

function formatMoneyBR(valueInCents) {
	const value = (valueInCents ?? 0) / 100
	return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function App() {
	const [amountCents, setAmountCents] = useState(0)
	const [from, setFrom] = useState('CHF')
	const [to, setTo] = useState('USD')
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
	const [rate, setRate] = useState(null)
	const [result, setResult] = useState(null)
	const [loading, setLoading] = useState(false)
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme')
        if (saved) return saved
        return 'light'
    })
    const [locale, setLocale] = useState(() => (navigator.language || 'pt-BR'))
	const amountInputRef = useRef(null)
    const [copiedResult, setCopiedResult] = useState(false)
    const [copiedRate, setCopiedRate] = useState(false)

	// Formatação ao digitar: sempre trata como centavos
	const handleAmountInput = (e) => {
		const digits = e.target.value.replace(/\D/g, '')
		setAmountCents(Number(digits))
	}

    const amountFormatted = useMemo(() => new Intl.NumberFormat(locale || 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((amountCents ?? 0) / 100), [amountCents, locale])

    function getCurrencySymbol(code) {
        const map = {
            USD: '$',
            EUR: '€',
            BRL: 'R$',
            GBP: '£',
            JPY: '¥',
            CHF: 'Fr',
            CAD: '$',
            AUD: '$',
            CNY: '¥',
            ARS: '$',
            MXN: '$'
        }
        return map[code] || code
    }

    function isControlKey(e) {
        const ctrl = e.ctrlKey || e.metaKey
        const allowed = [
            'Backspace', 'Delete', 'Tab', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End'
        ]
        if (allowed.includes(e.key)) return true
        // atalhos
        if (ctrl && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return true
        return false
    }

    function handleAmountKeyDown(e) {
        if (isControlKey(e)) return
        const isDigit = /\d/.test(e.key)
        if (!isDigit) e.preventDefault()
    }

    function handleAmountPaste(e) {
        e.preventDefault()
        const text = (e.clipboardData || window.clipboardData).getData('text') || ''
        const digits = text.replace(/\D/g, '')
        setAmountCents(Number(digits))
    }

    function handleDateKeyDown(e) {
        if (isControlKey(e)) return
        const isDigit = /\d/.test(e.key)
        const isDash = e.key === '-'
        if (!isDigit && !isDash) e.preventDefault()
    }

    function handleDatePaste(e) {
        e.preventDefault()
        const text = (e.clipboardData || window.clipboardData).getData('text') || ''
        const digits = text.replace(/\D/g, '')
        if (digits.length >= 8) {
            const y = digits.slice(0, 4)
            const m = digits.slice(4, 6)
            const d = digits.slice(6, 8)
            const formatted = `${y}-${m}-${d}`
            setDate(formatted)
        }
    }

	useEffect(() => {
		if (amountInputRef.current) {
			amountInputRef.current.value = amountFormatted
		}
	}, [amountFormatted])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    function clampDateToToday(dStr) {
        const input = new Date(dStr)
        const today = new Date()
        if (input > today) {
            return today.toISOString().slice(0, 10)
        }
        return dStr
    }

    async function providerExchangerateHost(fromC, toC, d, amountStr) {
        // Tenta o convert
        const convertUrl = `https://api.exchangerate.host/convert?from=${fromC}&to=${toC}&date=${d}&amount=${amountStr}`
        let resp = await fetch(convertUrl)
        if (resp.ok) {
            const data = await resp.json()
            if (typeof data?.info?.rate === 'number' && typeof data?.result === 'number') {
                return { rate: data.info.rate, result: data.result }
            }
        }
        // Fallback histórico
        const histUrl = `https://api.exchangerate.host/${d}?base=${fromC}&symbols=${toC}`
        resp = await fetch(histUrl)
        if (resp.ok) {
            const data = await resp.json()
            const r = data?.rates?.[toC]
            if (typeof r === 'number') {
                const res = parseFloat(amountStr) * r
                return { rate: r, result: res }
            }
        }
        throw new Error('exchangerate.host indisponível')
    }

    async function providerFrankfurter(fromC, toC, d, amountStr) {
        // Obter taxa (rate) sem amount para evitar valores já convertidos
        const frankUrl = `https://api.frankfurter.app/${d}?from=${fromC}&to=${toC}`
        const resp = await fetch(frankUrl)
        if (!resp.ok) throw new Error('frankfurter.app indisponível')
        const data = await resp.json()
        const r = data?.rates?.[toC]
        if (typeof r !== 'number') throw new Error('Taxa não disponível (frankfurter)')
        const res = parseFloat(amountStr) * r
        return { rate: r, result: res }
    }

    async function convert() {
        if (!amountCents || amountCents <= 0) return
        setLoading(true)
        try {
            const amount = (amountCents / 100).toFixed(2)
            const safeDate = clampDateToToday(date)
            // Provider chain
            let out
            try {
                out = await providerExchangerateHost(from, to, safeDate, amount)
            } catch (_) {
                out = await providerFrankfurter(from, to, safeDate, amount)
            }
            setRate(out.rate)
            setResult(out.result)
        } catch (e) {
            setRate(null)
            setResult(null)
            alert(e.message || 'Erro ao converter')
        } finally {
            setLoading(false)
        }
    }

    function handleSubmit(e) {
        e.preventDefault()
        convert()
    }

	function swap() {
		setFrom(to)
		setTo(from)
	}

	async function copy(text, target) {
		try {
			await navigator.clipboard.writeText(text)
			if (target === 'result') {
				setCopiedResult(true)
				setTimeout(() => setCopiedResult(false), 1500)
			} else if (target === 'rate') {
				setCopiedRate(true)
				setTimeout(() => setCopiedRate(false), 1500)
			}
		} catch {}
	}

    return (
        <div className="container">
            {/* Header mobile */}
            <div className="mobile-header">
                <div className="header-content">
                    <h1>{locale.startsWith('pt') ? 'Conversor de Moedas' : 'Currency Converter'}</h1>
                    <div className="theme-toggle" title={theme === 'dark' ? (locale.startsWith('pt') ? 'Tema escuro' : 'Dark theme') : (locale.startsWith('pt') ? 'Tema claro' : 'Light theme')}>
                        <button type="button" className={`switch ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={locale.startsWith('pt') ? 'Alternar tema' : 'Toggle theme'}>
                            <span className="knob" />
                            <span className="theme-icon sun">☀️</span>
                            <span className="theme-icon moon">🌙</span>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Espaçador invisível para mobile */}
            <div className="mobile-spacer"></div>
            
            {/* Título desktop */}
            <h1 className="page-title">{locale.startsWith('pt') ? 'Conversor de Moedas' : 'Currency Converter'}</h1>
            
            {/* Toggle tema desktop */}
            <div className="theme-toggle" title={theme === 'dark' ? (locale.startsWith('pt') ? 'Tema escuro' : 'Dark theme') : (locale.startsWith('pt') ? 'Tema claro' : 'Light theme')}>
                <button type="button" className={`switch ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={locale.startsWith('pt') ? 'Alternar tema' : 'Toggle theme'}>
                    <span className="knob" />
                </button>
            </div>
            <div className="converter-card">
                <form onSubmit={handleSubmit}>
                <div className="input-group formatted-input">
					<label htmlFor="amount">Valor</label>
					<div className="input-with-prefix">
						<input
							ref={amountInputRef}
							id="amount"
							placeholder="0,00"
							inputMode="numeric"
					onInput={handleAmountInput}
							onKeyDown={handleAmountKeyDown}
							onPaste={handleAmountPaste}
					onFocus={(e) => {
						// posiciona o cursor sempre à esquerda
						e.target.setSelectionRange(0, 0)
					}}
						/>
						<span className="currency-prefix">{getCurrencySymbol(from)}</span>
					</div>
				</div>

                <div className="currency-selectors">
                    <div className="currency-group">
                        <label htmlFor="fromCurrency">De</label>
                        <div className="select-wrapper">
                            <select id="fromCurrency" value={from} onChange={(e) => setFrom(e.target.value)}>
                                {Object.entries(currencies).map(([code, name]) => (
                                    <option key={code} value={code}>{`${code} - ${name}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="swap-icon" onClick={swap}>
                        <span>⇄</span>
                    </div>

                    <div className="currency-group">
                        <label htmlFor="toCurrency">Para</label>
                        <div className="select-wrapper">
                            <select id="toCurrency" value={to} onChange={(e) => setTo(e.target.value)}>
                                {Object.entries(currencies).map(([code, name]) => (
                                    <option key={code} value={code}>{`${code} - ${name}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="date-selector">
                    <label htmlFor="conversionDate">Data da Cotação</label>
                    <input
                        id="conversionDate"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        inputMode="numeric"
                        onKeyDown={handleDateKeyDown}
                        onPaste={handleDatePaste}
                    />
				</div>

                <button id="convertBtn" type="submit" disabled={loading}>
					{loading ? 'Convertendo...' : 'Converter'}
				</button>

				<div className="loader-container" id="loader" style={{ display: loading ? 'flex' : 'none', opacity: loading ? 1 : 0 }}>
					<div className="loader" />
				</div>

				<div className="result-container" id="resultContainer" style={{ opacity: result != null || rate != null ? 1 : 0 }}>
                <div className="result-box">
                    <h3>Valor Convertido</h3>
                    <div className="result-content">
							<p id="convertedResult">{result != null ? `${result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}</p>
							<button type="button" className={`copy-btn ${copiedResult ? 'copied' : ''}`} onClick={() => copy(result != null ? `${result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '', 'result')} title="Copiar resultado">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
							{copiedResult && <span className="copy-message" role="status" aria-live="polite">Copiado!</span>}
						</div>
					</div>
					<div className="result-box">
						<h3>Taxa</h3>
						<div className="result-content">
							<p id="conversionRate">{rate != null ? `${rate.toFixed(2)}` : '--'}</p>
							<button type="button" className={`copy-btn ${copiedRate ? 'copied' : ''}`} onClick={() => copy(rate != null ? `${rate.toFixed(2)}` : '', 'rate')} title="Copiar taxa">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
							{copiedRate && <span className="copy-message" role="status" aria-live="polite">Copiado!</span>}
						</div>
					</div>
                </div>
                </form>
			</div>
			<footer className="app-footer">
				<small>
					{locale.startsWith('pt') ? 'Cotações de ' : 'Rates by '}<a href="https://exchangerate.host" target="_blank" rel="noreferrer">exchangerate.host</a> {locale.startsWith('pt') ? 'e ' : 'and '}<a href="https://www.frankfurter.app" target="_blank" rel="noreferrer">frankfurter.app</a> · {new Date().getFullYear()}<br/>
					{locale.startsWith('pt') ? 'Criado como hobby por ' : 'Built for fun by '}<a href="https://leonardomartins.dev" target="_blank" rel="noreferrer">leonardomartins.dev</a>. {locale.startsWith('pt') ? 'Espero que possa ajudar você 🙂' : 'Hope it helps you 🙂'}
				</small>
			</footer>
		</div>
	)
}


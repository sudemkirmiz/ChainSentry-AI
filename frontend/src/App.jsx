import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Text Constants (Multilingual) ───
const TRANSLATIONS = {
  EN: {
    logo: 'ChainSentry', logoSuffix: 'AI',
    connectWallet: 'Connect Core Wallet', disconnect: 'Disconnect',
    tabCode: 'PASTE CODE', tabAddress: 'C-CHAIN ADDRESS',
    codePlaceholder: '// Paste your Solidity smart contract code here...',
    addressPlaceholder: '0x... Enter Avalanche C-Chain contract address',
    analyze: 'ANALYZE NOW', analyzing: 'SCANNING...',
    summaryTitle: 'ANALYSIS REPORT', riskLevel: 'Risk Level', vulnCount: 'Vulnerabilities',
    gasSavings: 'Estimated Gas Savings',
    descLabel: 'DESCRIPTION', solutionLabel: 'SOLUTION', gasLabel: 'GAS OPTIMIZATION',
    secureCode: 'SECURE CODE', copyCode: 'Copy', copied: 'Copied!',
    lineLabel: 'LINE', noVuln: 'No vulnerabilities detected.', noVulnSub: 'Contract appears secure.',
    waiting: 'Upload a contract to begin security analysis...', errorDefault: 'Analysis failed. Check backend connection.',
    pdfBtn: 'Download PDF Report', exportTxt: 'TXT', exportJson: 'JSON',
    snowtraceWarning: '⚠ Requires SNOWTRACE_API_KEY in backend .env',
    executiveSummary: 'AI Audit Summary',
    risks: { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', unknown: 'UNKNOWN' },
    retryBtn: 'TRY AGAIN',
    pdfTitle: 'ChainSentry AI - Smart Contract Security Audit',
    pdfDate: 'Date',
    pdfTotalRisk: 'Overall Risk Level',
    pdfAiSummary: 'AI Audit Summary:',
    pdfCols: ['Error Type', 'Line', 'Description', 'Solution'],
    pdfSavings: 'Estimated Gas Savings'
  },
  TR: {
    logo: 'ChainSentry', logoSuffix: 'AI',
    connectWallet: 'Core Cüzdanı Bağla', disconnect: 'Bağlantıyı Kes',
    tabCode: 'KODU YAPIŞTIR', tabAddress: 'C-CHAIN ADRESİ',
    codePlaceholder: '// Solidity akıllı kontrat kodunuzu buraya yapıştırın...',
    addressPlaceholder: '0x... Avalanche C-Chain kontrat adresi girin',
    analyze: 'ŞİMDİ ANALİZ ET', analyzing: 'TARANIYOR...',
    summaryTitle: 'ANALİZ RAPORU', riskLevel: 'Risk Seviyesi', vulnCount: 'Zafiyetler',
    gasSavings: 'Tahmini Gas Tasarrufu',
    descLabel: 'AÇIKLAMA', solutionLabel: 'ÇÖZÜM', gasLabel: 'GAS OPZİTİMİZASYONU',
    secureCode: 'GÜVENLİ KOD', copyCode: 'Kopyala', copied: 'Kopyalandı!',
    lineLabel: 'SATIR', noVuln: 'Zafiyet tespit edilmedi.', noVulnSub: 'Kontrat güvenli görünüyor.',
    waiting: 'Güvenlik analizini başlatmak için bir kontrat yükleyin...', errorDefault: 'Analiz başarısız. Backend bağlantısını kontrol edin.',
    pdfBtn: 'PDF Raporunu İndir', exportTxt: 'TXT', exportJson: 'JSON',
    snowtraceWarning: '⚠ Backend .env dosyasında SNOWTRACE_API_KEY gerektirir',
    executiveSummary: 'Yapay Zeka Denetim Özeti',
    risks: { critical: 'KRİTİK', high: 'YÜKSEK', medium: 'ORTA', low: 'DÜŞÜK', unknown: 'BİLİNMİYOR' },
    retryBtn: 'TEKRAR DENE',
    pdfTitle: 'ChainSentry AI - Akıllı Kontrat Güvenlik Denetimi',
    pdfDate: 'Tarih',
    pdfTotalRisk: 'Genel Risk Seviyesi',
    pdfAiSummary: 'Yapay Zeka Denetim Özeti:',
    pdfCols: ['Zafiyet Türü', 'Satır', 'Açıklama', 'Çözüm'],
    pdfSavings: 'Tahmini Gas Tasarrufu'
  },
  ES: {
    logo: 'ChainSentry', logoSuffix: 'AI',
    connectWallet: 'Conectar Billetera Core', disconnect: 'Desconectar',
    tabCode: 'PEGAR CÓDIGO', tabAddress: 'DIRECCIÓN C-CHAIN',
    codePlaceholder: '// Pegue su código de contrato inteligente Solidity aquí...',
    addressPlaceholder: '0x... Ingrese la dirección del contrato Avalanche C-Chain',
    analyze: 'ANALIZAR AHORA', analyzing: 'ESCANEANDO...',
    summaryTitle: 'REPORTE DE ANÁLISIS', riskLevel: 'Nivel de Riesgo', vulnCount: 'Vulnerabilidades',
    gasSavings: 'Ahorro Estimado de Gas',
    descLabel: 'DESCRIPCIÓN', solutionLabel: 'SOLUCIÓN', gasLabel: 'OPTIMIZACIÓN DE GAS',
    secureCode: 'CÓDIGO SEGURO', copyCode: 'Copiar', copied: '¡Copiado!',
    lineLabel: 'LÍNEA', noVuln: 'No se detectaron vulnerabilidades.', noVulnSub: 'El contrato parece seguro.',
    waiting: 'Sube un contrato para comenzar el análisis de seguridad...', errorDefault: 'El análisis falló. Compruebe la conexión del backend.',
    pdfBtn: 'Descargar Reporte PDF', exportTxt: 'TXT', exportJson: 'JSON',
    snowtraceWarning: '⚠ Requiere SNOWTRACE_API_KEY en .env del backend',
    executiveSummary: 'Resumen de Auditoría de IA',
    risks: { critical: 'CRÍTICO', high: 'ALTO', medium: 'MEDIO', low: 'BAJO', unknown: 'DESCONOCIDO' },
    retryBtn: 'INTENTAR DE NUEVO',
    pdfTitle: 'ChainSentry AI - Auditoría de Seguridad de Contratos Inteligentes',
    pdfDate: 'Fecha',
    pdfTotalRisk: 'Nivel de Riesgo General',
    pdfAiSummary: 'Resumen de Auditoría de IA:',
    pdfCols: ['Tipo de Error', 'Línea', 'Descripción', 'Solución'],
    pdfSavings: 'Ahorro Estimado de Gas'
  },
  ZH: {
    logo: 'ChainSentry', logoSuffix: 'AI',
    connectWallet: '连接Core钱包', disconnect: '断开连接',
    tabCode: '粘贴代码', tabAddress: 'C-CHAIN地址',
    codePlaceholder: '// 在此粘贴您的Solidity智能合约代码...',
    addressPlaceholder: '0x... 输入Avalanche C-Chain合约地址',
    analyze: '立即分析', analyzing: '正在扫描...',
    summaryTitle: '分析报告', riskLevel: '风险等级', vulnCount: '漏洞',
    gasSavings: '预计 Gas 节省',
    descLabel: '描述', solutionLabel: '解决方案', gasLabel: 'GAS 优化',
    secureCode: '安全代码', copyCode: '复制', copied: '已复制！',
    lineLabel: '行', noVuln: '未检测到漏洞。', noVulnSub: '合约看起来很安全。',
    waiting: '上传合约以开始安全分析...', errorDefault: '分析失败。请检查后端连接。',
    pdfBtn: '下载 PDF 报告', exportTxt: 'TXT', exportJson: 'JSON',
    snowtraceWarning: '⚠ 后端 .env 中需要 SNOWTRACE_API_KEY',
    executiveSummary: '人工智能审计摘要',
    risks: { critical: '危急', high: '高', medium: '中', low: '低', unknown: '未知' },
    retryBtn: '重试',
    pdfTitle: 'ChainSentry AI - 智能合约安全审计',
    pdfDate: '日期',
    pdfTotalRisk: '总体风险等级',
    pdfAiSummary: '人工智能审计摘要:',
    pdfCols: ['错误类型', '行', '描述', '解决方案'],
    pdfSavings: '预计 Gas 节省'
  }
};

const API_BASE = 'http://127.0.0.1:8000';

// ─── Helpers ───
const riskKey = (r) => typeof r === 'string' ? r.toLowerCase() : 'unknown';
const badgeClass = (k) => ({ critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }[k] || 'badge-low');

export default function App() {
  // Wallet
  const [walletAddr, setWalletAddr] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Language
  const [lang, setLang] = useState('EN');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.EN;

  // Input
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'address'
  const [code, setCode] = useState('');
  const [contractAddr, setContractAddr] = useState('');

  // Analysis
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const reportRef = useRef(null);

  // ─── Computed: aggregate gas savings from vulnerabilities ───
  const totalSavingsUsd = useMemo(() => {
    if (!result) return null;
    // Try top-level first
    if (result.estimated_savings_usd && result.estimated_savings_usd !== 'N/A') {
      return result.estimated_savings_usd;
    }
    // Aggregate from individual vulnerabilities
    const vulns = result.vulnerabilities || [];
    let total = 0;
    let found = false;
    for (const v of vulns) {
      const val = parseFloat(v.estimated_savings_usd);
      if (!isNaN(val) && val > 0) { total += val; found = true; }
    }
    return found ? `$${total.toFixed(4)}` : 'N/A';
  }, [result]);

  // ─── Toast helper ───
  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Wallet Connection (Native Core / MetaMask) ───
  const connectWallet = async () => {
    setWalletLoading(true);
    try {
      const provider = window.avalanche || window.ethereum;
      if (!provider) {
        showToast('No wallet detected. Install Core Wallet or MetaMask.', 'error');
        return;
      }
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts?.[0]) setWalletAddr(accounts[0]);
    } catch (e) {
      showToast(e.message || 'Wallet connection rejected.', 'error');
    } finally {
      setWalletLoading(false);
    }
  };

  const disconnectWallet = () => setWalletAddr(null);

  // Listen for account changes
  useEffect(() => {
    const provider = window.avalanche || window.ethereum;
    if (!provider) return;
    const handler = (accs) => setWalletAddr(accs?.[0] || null);
    provider.on?.('accountsChanged', handler);
    return () => provider.removeListener?.('accountsChanged', handler);
  }, []);

  // ─── Analyze ───
  const handleAnalyze = async () => {
    if (activeTab === 'code' && !code.trim()) {
      setErrorMsg('Please enter smart contract code.');
      setStatus('error');
      return;
    }
    if (activeTab === 'address' && !contractAddr.trim()) {
      setErrorMsg('Please enter a contract address.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const isCode = activeTab === 'code';
      const endpoint = isCode ? '/analyze' : '/analyze-address';
      const payload = {
        language: lang.toLowerCase()
      };
      if (activeTab === 'code') {
        payload.contract_code = code;
      } else {
        payload.contract_address = contractAddr;
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setStatus('success');
    } catch (e) {
      setErrorMsg(e.message || t.errorDefault);
      setStatus('error');
      showToast(e.message || t.errorDefault, 'error');
    }
  };

  // ─── Copy ───
  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // ─── PDF Download (Text-based with jsPDF + autoTable) ───
  const handleDownloadPdf = () => {
    if (!result) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    let y = 20;

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text(t.pdfTitle, w / 2, y, { align: 'center' });
    y += 10;

    // Subtitle (Date & Risk)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString(lang === 'TR' ? 'tr-TR' : lang === 'ES' ? 'es-ES' : lang === 'ZH' ? 'zh-CN' : 'en-US');
    const riskStr = t.risks[riskKey(result.risk_level)] || result.risk_level;
    doc.text(`${t.pdfDate}: ${dateStr} | ${t.pdfTotalRisk}: ${riskStr}`, w / 2, y, { align: 'center' });
    y += 15;

    // Executive Summary
    if (result.executive_summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 153, 204);
      doc.text(t.pdfAiSummary, 14, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const splitText = doc.splitTextToSize(result.executive_summary, w - 28);
      doc.text(splitText, 14, y);
      y += (splitText.length * 5) + 10;
    }

    // Vulnerabilities Table
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      const rows = result.vulnerabilities.map(v => [
        v.error_type,
        v.line_number?.toString() || '-',
        v.description,
        v.solution
      ]);

      autoTable(doc, {
        startY: y,
        head: [t.pdfCols],
        body: rows,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10, cellPadding: 4, textColor: [40, 40, 40] },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 15, halign: 'center' }
        }
      });
      y = doc.lastAutoTable.finalY + 15;
    }

    // Gas Savings Footer
    if (totalSavingsUsd && totalSavingsUsd !== 'N/A') {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 153, 51);
      doc.text(`${t.pdfSavings}: ${totalSavingsUsd}`, w - 14, y, { align: 'right' });
    }

    doc.save('ChainSentry_Audit_Report.pdf');
  };

  // ─── Export ───
  const handleExport = (fmt) => {
    if (!result) return;
    let content, mime, ext;
    if (fmt === 'json') {
      content = JSON.stringify(result, null, 2);
      mime = 'application/json'; ext = 'json';
    } else {
      content = `${t.reportHeader}\n${'='.repeat(40)}\n`;
      content += `${t.riskLevel}: ${t.risks[riskKey(result.risk_level)]}\n`;
      content += `${t.vulnCount}: ${result.vulnerabilities?.length || 0}\n`;
      if (result.estimated_savings_usd) content += `${t.gasSavings}: ${result.estimated_savings_usd}\n`;
      content += '\n';
      result.vulnerabilities?.forEach((v, i) => {
        content += `[${i + 1}] ${v.error_type} (${t.lineLabel}: ${v.line_number})\n`;
        content += `${t.descLabel}: ${v.description}\n`;
        content += `${t.solutionLabel}: ${v.solution}\n`;
        if (v.gas_optimization) content += `${t.gasLabel}: ${v.gas_optimization}\n`;
        if (v.fixed_code_snippet) content += `${t.secureCode}:\n${v.fixed_code_snippet}\n`;
        content += '-'.repeat(40) + '\n';
      });
      mime = 'text/plain'; ext = 'txt';
    }
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `chainsentry_report.${ext}`; a.click(); URL.revokeObjectURL(a.href);
  };

  // ─── Shorthand ─────
  const rk = result ? riskKey(result.risk_level) : null;

  return (
    <div className="min-h-screen bg-[#08142b] grid-bg scanline font-sans flex flex-col">

      {/* ═══════════ HEADER ═══════════ */}
      <header className="sticky top-0 z-50 bg-[#060e20ee] backdrop-blur-lg border-b border-[#94a3b830] px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-4">
          <img src="/image_new_logo.png" alt="ChainSentry AI Logo" className="w-[44px] h-[44px] object-contain drop-shadow-[0_0_10px_rgba(0,210,255,0.4)]" />
          <h1 className="hidden sm:block font-display text-xl font-bold tracking-widest text-slate-300" style={{ textShadow: '0 0 10px rgba(148,163,184,0.3)' }}>
            ChainSentry <span className="neon-electric-blue">AI</span>
          </h1>
        </div>

        {/* Language Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#060e20] rounded-lg metal-border p-1">
          {['EN', 'TR', 'ES', 'ZH'].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`px-4 py-1.5 rounded-md text-[11px] font-display font-bold tracking-widest transition-all ${l === lang ? 'bg-[#00d2ff15] neon-electric-blue border border-[#00d2ff40]' : 'text-slate-500 hover:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Wallet */}
        <div>
          {walletAddr ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs neon-cyan bg-[#00ffff10] px-4 py-2 rounded-lg metal-border-cyan">
                {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
              </span>
              <button onClick={disconnectWallet}
                className="text-[11px] font-display font-bold tracking-wider text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-all">
                ✕
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={walletLoading}
              className="cyber-btn text-[11px] px-6 py-2.5 rounded-lg">
              {walletLoading ? '...' : t.connectWallet}
            </button>
          )}
        </div>
      </header>

      {/* ═══════════ MAIN GRID ═══════════ */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden" style={{ height: 'calc(100vh - 66px)' }}>

        {/* ═══ LEFT PANEL ═══ */}
        <section className="flex flex-col bg-[#060e20] metal-border rounded-xl overflow-hidden shadow-2xl">

          {/* Tabs */}
          <div className="flex items-center border-b border-[#94a3b820] bg-[#08142b]">
            <button className={`cyber-tab flex-1 py-3 ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}>
              ◈ {t.tabCode}
            </button>
            <button className={`cyber-tab flex-1 py-3 ${activeTab === 'address' ? 'active' : ''}`}
              onClick={() => setActiveTab('address')}>
              ◈ {t.tabAddress}
            </button>
          </div >

          {/* Input Area */}
          < div className="flex-1 p-4 flex flex-col overflow-hidden" >
            {activeTab === 'code' ? (
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={t.codePlaceholder}
                className="cyber-textarea flex-1 w-full rounded-lg p-5 custom-scrollbar"
              />
            ) : (
              <div className="flex flex-col gap-5">
                <input
                  value={contractAddr}
                  onChange={e => setContractAddr(e.target.value)}
                  placeholder={t.addressPlaceholder}
                  className="cyber-input w-full rounded-lg px-5 py-3.5"
                />
                <p className="text-xs text-[#00d2ff80] font-mono">
                  {t.snowtraceWarning}
                </p>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <div className="p-5 pt-0">
            <button onClick={handleAnalyze} disabled={status === 'loading'}
              className="cyber-btn w-full py-4 rounded-lg text-[13px] uppercase">
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-[#00ffff] border-t-transparent rounded-full inline-block" style={{ animation: 'cyberSpin 0.8s linear infinite' }} />
                  {t.analyzing}
                </span>
              ) : (
                <>▶ {t.analyze}</>
              )}
            </button>
          </div>
        </section>

        {/* ═══ RIGHT PANEL ═══ */}
        <section className="flex flex-col bg-[#060e20] metal-border rounded-xl overflow-hidden shadow-2xl">

          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#94a3b820] bg-[#08142b]">
            <h2 className="font-display text-xs font-bold tracking-[0.2em] text-slate-300">{t.summaryTitle}</h2>
            {status === 'success' && result && (
              <div className="flex gap-2">
                <button onClick={handleDownloadPdf}
                  className="text-[10px] font-display font-black tracking-wider px-3 py-1.5 rounded metal-border-blue neon-electric-blue hover:bg-[#00d2ff10] transition-all">
                  {t.pdfBtn}
                </button>
                <button onClick={() => handleExport('txt')} className="text-[10px] font-display font-bold tracking-wider px-3 py-1.5 rounded metal-border text-slate-400 hover:text-white hover:bg-[#94a3b810] transition-all">{t.exportTxt}</button>
                <button onClick={() => handleExport('json')} className="text-[10px] font-display font-bold tracking-wider px-3 py-1.5 rounded metal-border-cyan neon-cyan hover:bg-[#00ffff10] transition-all">{t.exportJson}</button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">

            {/* IDLE */}
            {status === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                <div className="w-16 h-16 rounded-full border border-[#00ffff30] flex items-center justify-center shadow-[0_0_20px_#00ffff10]">
                  <span className="text-3xl opacity-40 neon-cyan">🛡</span>
                </div>
                <p className="text-sm font-sans font-medium text-center max-w-[250px] leading-relaxed text-slate-400">{t.waiting}</p>
              </div>
            )}

            {/* LOADING */}
            {status === 'loading' && (
              <div className="h-full flex flex-col items-center justify-center gap-6">
                <div className="relative flex items-center justify-center">
                  <div className="cyber-pulse-ring" />
                  <div className="cyber-spinner" />
                </div>
                <p className="font-display text-xs font-bold tracking-[0.3em] neon-cyan animate-pulse">{t.analyzing}</p>
              </div>
            )}

            {/* ERROR */}
            {status === 'error' && (
              <div className="h-full flex flex-col items-center justify-center gap-5 animate-in">
                <div className="w-16 h-16 rounded-full border border-red-500/40 flex items-center justify-center bg-red-500/10">
                  <span className="text-3xl neon-red">✕</span>
                </div>
                <p className="text-[15px] font-sans text-red-400 text-center max-w-[300px] leading-relaxed">{errorMsg || t.errorDefault}</p>
                <button onClick={() => setStatus('idle')} className="text-[11px] font-display font-bold tracking-widest text-slate-300 metal-border rounded-lg px-6 py-2.5 hover:bg-[#94a3b815] transition-all mt-2">
                  {t.retryBtn}
                </button>
              </div>
            )}
            {/* SUCCESS */}
            {status === 'success' && result && (
              <div id="pdf-report-container" ref={reportRef} className="space-y-6 animate-in">

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Risk */}
                  <div className="bg-[#08142b] rounded-xl p-4 metal-border">
                    <p className="text-[10px] font-display font-medium tracking-widest text-slate-400 mb-2">{t.riskLevel}</p>
                    <span className={`inline-block px-3 py-1.5 rounded-md text-[12px] font-display font-black tracking-widest uppercase shadow-sm ${badgeClass(rk)}`}>
                      {t.risks[rk]}
                    </span>
                  </div>
                  {/* Count */}
                  <div className="bg-[#08142b] rounded-xl p-4 metal-border">
                    <p className="text-[10px] font-display font-medium tracking-widest text-slate-400 mb-2">{t.vulnCount}</p>
                    <span className="text-3xl font-black text-slate-200 font-display">{result.vulnerabilities?.length || 0}</span>
                  </div>
                  {/* Savings */}
                  <div className="bg-[#08142b] rounded-xl p-4 metal-border-cyan">
                    <p className="text-[10px] font-display font-medium tracking-widest text-slate-400 mb-2">{t.gasSavings}</p>
                    <span className="text-[22px] font-bold neon-cyan font-display">
                      {totalSavingsUsd}
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                {result.executive_summary && (
                  <div className="bg-[#0b1731] rounded-xl p-6 metal-border-blue relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d2ff10] blur-3xl rounded-full" />
                    <p className="text-[11px] font-display font-bold tracking-widest neon-electric-blue mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]"></span>
                      {t.executiveSummary}
                    </p>
                    <p className="text-[14px] text-slate-300 leading-relaxed font-sans">{result.executive_summary}</p>
                  </div>
                )}

                {/* Vulnerability Cards */}
                {result.vulnerabilities?.length > 0 ? (
                  result.vulnerabilities.map((v, i) => {
                    const vk = riskKey(result.risk_level);
                    const accentMap = { critical: '#ff3b5c', high: '#ff9f0a', medium: '#ffd60a', low: '#00ffff' };
                    const accent = accentMap[vk] || '#00ffff';
                    return (
                      <div key={i} className="bg-[#08142b] rounded-xl metal-border overflow-hidden relative group hover:border-slate-500 transition-all shadow-lg" style={{ borderLeftColor: accent, borderLeftWidth: '4px' }}>
                        <div className="p-6 space-y-4">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <h3 className="font-display text-[15px] font-black tracking-wide pr-4" style={{ color: accent, textShadow: `0 0 10px ${accent}40` }}>
                              {v.error_type}
                            </h3>
                            <span className="font-mono text-[11px] font-semibold text-slate-400 bg-[#060e20] px-2.5 py-1 rounded metal-border shrink-0">
                              {t.lineLabel}: {v.line_number}
                            </span>
                          </div>

                          {/* Description */}
                          <div>
                            <p className="text-[10px] font-display font-semibold tracking-widest text-slate-500 mb-1.5">{t.descLabel}</p>
                            <p className="text-[14px] text-slate-300 leading-relaxed font-sans">{v.description}</p>
                          </div>

                          {/* Solution */}
                          <div className="bg-[#061022] rounded-lg p-4 metal-border">
                            <p className="text-[10px] font-display font-semibold tracking-widest neon-electric-blue mb-1.5">{t.solutionLabel}</p>
                            <p className="text-[14px] text-[#8ab4f8] leading-relaxed font-sans">{v.solution}</p>
                          </div>

                          {/* Gas Optimization */}
                          {v.gas_optimization && (
                            <div className="bg-[#0a1622] rounded-lg p-4 metal-border-cyan">
                              <p className="text-[10px] font-display font-semibold tracking-widest neon-cyan mb-1.5">{t.gasLabel}</p>
                              <p className="text-[14px] text-[#bdf8f8] leading-relaxed font-sans">{v.gas_optimization}</p>
                            </div>
                          )}

                          {/* Estimated Savings */}
                          {v.estimated_savings_usd && v.estimated_savings_usd !== 'N/A' && (
                            <div className="text-right pt-2">
                              <span className="inline-block font-mono font-bold text-[13px] neon-cyan bg-[#00ffff10] px-4 py-1.5 rounded-full metal-border-cyan shadow-sm">
                                💰 ~${v.estimated_savings_usd} USD
                              </span>
                            </div>
                          )}

                          {/* Fixed Code */}
                          {v.fixed_code_snippet && (
                            <div className="bg-[#060e20] rounded-lg metal-border overflow-hidden mt-3">
                              <div className="flex justify-between items-center px-4 py-2 bg-[#08142b] border-b border-[#94a3b820]">
                                <span className="text-[10px] font-display font-medium tracking-widest text-slate-400">{t.secureCode}</span>
                                <button onClick={() => handleCopy(v.fixed_code_snippet, i)}
                                  className="text-[11px] font-display font-bold text-[#00d2ff] hover:text-[#00ffff] transition-colors bg-[#00d2ff10] px-2 py-0.5 rounded border border-[#00d2ff30]">
                                  {copiedIdx === i ? `✓ ${t.copied}` : `⧉ ${t.copyCode}`}
                                </button>
                              </div>
                              <pre className="p-4 text-[13px] font-mono text-[#e2e8f0] leading-relaxed overflow-x-auto custom-scrollbar bg-[#050b16]">
                                <code>{v.fixed_code_snippet}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 bg-[#08142b] rounded-xl metal-border">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50 text-[#00ffff] drop-shadow-[0_0_15px_#00ffff40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h3 className="neon-cyan font-display text-[15px] font-bold tracking-widest">{t.noVuln}</h3>
                    <p className="text-slate-400 text-sm mt-2">{t.noVulnSub}</p>
                  </div>
                )}
              </div>
            )}
          </div >
        </section >
      </main >

      {/* ═══════════ TOAST ═══════════ */}
      {
        toast && (
          <div className={`fixed bottom-6 right-6 z-[200] max-w-sm px-5 py-3 rounded-lg border shadow-2xl toast-enter ${toast.type === 'error'
            ? 'bg-[#1a0a10] border-red-500/30 text-red-400'
            : 'bg-[#0a1a0d] border-[#39ff1430] text-[#39ff14]'
            }`}>
            <p className="text-sm">{toast.msg}</p>
          </div>
        )
      }
    </div >
  );
}

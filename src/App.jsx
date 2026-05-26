import { useState, useEffect } from 'react';
import { Wrench, Hammer, Ruler, LogOut, ArrowRight, CheckCircle2, ChevronLeft, Drill, Shield, Loader2, MapPin, Home, HardHat, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './index.css';

const API_URL = "https://script.google.com/macros/s/AKfycbxaK4yCTAi6KyLO_iIKXJwhpIyNrwLRvfhWnEWhdryjS7awA36hcg9Jm4n3tBny46oF7A/exec";

const DESTINOS = [
  { id: 'Interno', label: 'Interno', icon: <Home size={20} /> },
  { id: 'Obra',    label: 'Obra',    icon: <HardHat size={20} /> },
];

const COLORS = ['#ffffff', '#4ade80', '#f87171', '#60a5fa', '#fbbf24'];

const getCategoryIcon = (categoryName) => {
  const n = (categoryName || '').toLowerCase();
  if (n.includes('elétrica') || n.includes('bateria') || n.includes('furadeira') || n.includes('parafusadeira')) return <Drill size={24} />;
  if (n.includes('medida') || n.includes('medição') || n.includes('trena')) return <Ruler size={24} />;
  if (n.includes('epi') || n.includes('segurança')) return <Shield size={24} />;
  if (n.includes('manual') || n.includes('martelo')) return <Hammer size={24} />;
  return <Wrench size={24} />;
};

export default function App() {
  // --- STATES DE LOGIN/ROLE ---
  const [userRole, setUserRole]           = useState(null); // 'admin' | 'viewer' | null
  const [loginMode, setLoginMode]         = useState('select'); // 'select' | 'adminLogin'
  const [adminPassword, setAdminPassword] = useState('');
  const [showLoginPanel, setShowLoginPanel] = useState(false);

  // --- STATES DE NAVEGAÇÃO ---
  const [currentStep, setCurrentStep]     = useState('categories'); // 'categories', 'tools', 'action', 'success', 'reports'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTool, setSelectedTool]   = useState(null);
  const [targetWorker, setTargetWorker]   = useState('');
  const [destino, setDestino]             = useState('');  // 'Interno' | 'Obra'
  const [nomeObra, setNomeObra]           = useState('');  // Nome da obra

  // --- DATA ---
  const [toolsDb, setToolsDb]     = useState([]);
  const [historyDb, setHistoryDb] = useState([]);
  const [categories, setCategories] = useState([]);

  // --- LOADING ---
  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // ---- API ----
  const fetchTools = async () => {
    try {
      setLoading(true);
      setLoadingMsg('Sincronizando com a base...');
      const res  = await fetch(API_URL);
      const data = await res.json();
      
      // Suporte para o código antigo (que retornava array direto) e para o novo (com relatórios)
      if (Array.isArray(data)) {
        setToolsDb(data);
        const uniqueCats = [...new Set(data.map(t => t.category))];
        setCategories(uniqueCats.map(c => ({ id: c, name: c })));
        setHistoryDb([]);
      } else {
        setToolsDb(data.tools || []);
        setHistoryDb(data.history || []);
        const uniqueCats = [...new Set((data.tools || []).map(t => t.category))];
        setCategories(uniqueCats.map(c => ({ id: c, name: c })));
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar na planilha! Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTools(); }, []);

  // ---- HANDLERS ----
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'drevo1234') {
      setUserRole('admin');
      setAdminPassword('');
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentStep('categories');
    setShowLoginPanel(false);
    setLoginMode('select');
  };

  const selectCategory = (cat)  => { setSelectedCategory(cat);  setCurrentStep('tools'); };
  const selectTool     = (tool) => { setSelectedTool(tool);      setCurrentStep('action'); };

  const goBack = () => {
    if (currentStep === 'tools')  setCurrentStep('categories');
    if (currentStep === 'action') { setCurrentStep('tools'); setTargetWorker(''); setDestino(''); setNomeObra(''); }
    if (currentStep === 'reports') setCurrentStep('categories');
  };

  const handleAction = async (actionType) => {
    setLoading(true);
    setLoadingMsg(actionType === 'retirar' ? 'Registrando retirada...' : 'Registrando devolução...');

    const destinoFinal = destino === 'Obra' && nomeObra.trim() ? `Obra - ${nomeObra.trim()}` : destino;

    const payload = {
      action:     actionType === 'retirar' ? 'Retirou' : 'Devolveu',
      workerName: actionType === 'retirar' ? targetWorker : selectedTool.worker,
      destino:    actionType === 'retirar' ? destinoFinal : '',
      toolId:     selectedTool.id,
      toolName:   selectedTool.name,
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      await fetchTools();
      setCurrentStep('success');
      setTimeout(() => {
        setCurrentStep('categories');
        setSelectedCategory(null);
        setSelectedTool(null);
        setTargetWorker('');
        setDestino('');
        setNomeObra('');
      }, 3000);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar ação! Tente novamente.');
      setLoading(false);
    }
  };

  const canRetirar = targetWorker.trim().length >= 3 && destino !== '' && (destino !== 'Obra' || nomeObra.trim().length >= 2);

  // ---- PROCESSAMENTO DE RELATÓRIOS ----
  const toolsInUse = toolsDb.filter(t => t.status !== 'Disponível');
  
  // Agrupar retiradas por destino
  const destinoCount = historyDb.filter(h => h.action === 'Retirou').reduce((acc, h) => {
    const d = h.destino.startsWith('Obra') ? 'Obras' : (h.destino || 'Não informado');
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const pieDataDestino = Object.keys(destinoCount).map(k => ({ name: k, value: destinoCount[k] }));

  // Agrupar por marceneiro
  const workerCount = historyDb.filter(h => h.action === 'Retirou').reduce((acc, h) => {
    acc[h.worker] = (acc[h.worker] || 0) + 1;
    return acc;
  }, {});
  const barDataWorkers = Object.keys(workerCount).map(k => ({ name: k, Retiradas: workerCount[k] })).sort((a,b) => b.Retiradas - a.Retiradas).slice(0, 5);


  // ---- RENDER ----
  return (
    <>
      <div className="app-bg" />

      {loading && (
        <div className="loading-overlay animate-fade-in">
          <Loader2 size={48} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <h3 style={{ marginTop: '1rem', fontWeight: 500 }}>{loadingMsg}</h3>
        </div>
      )}

      {/* ====== TELA DE ACESSO ====== */}
      {userRole === null && (
        <div className="center-screen">
          {!showLoginPanel ? (
            <div className="animate-fade-in landing-hero">
              <img src={`${import.meta.env.BASE_URL}drevo_logo.png`} alt="Drevo" className="brand-logo" />
              <p className="brand-tagline">Almoxarifado · Controle de Ferramentas</p>
              <button
                className="btn-primary"
                style={{ marginTop: '2rem', padding: '1rem 3rem', borderRadius: '50px', fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}
                onClick={() => setShowLoginPanel(true)}
              >
                Acessar
              </button>
            </div>
          ) : (
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '380px', position: 'relative' }}>
              <button
                onClick={() => { setShowLoginPanel(false); setLoginMode('select'); setAdminPassword(''); }}
                style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}
              >×</button>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <img src={`${import.meta.env.BASE_URL}drevo_logo.png`} alt="Drevo" style={{ height: '120px', marginBottom: '0.5rem', objectFit: 'contain', filter: 'invert(1) hue-rotate(180deg) saturate(3)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {loginMode === 'select' ? 'Como deseja acessar?' : 'Digite a senha do administrador'}
                </p>
              </div>

              {loginMode === 'select' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => setLoginMode('adminLogin')}>
                    Sou Administrador
                  </button>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', background: 'transparent', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}
                    onClick={() => setUserRole('viewer')}
                  >
                    Consultar Ferramentas <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Senha"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoFocus
                    required
                  />
                  <button className="btn-primary" style={{ width: '100%' }} type="submit" disabled={adminPassword.length < 3}>
                    Entrar <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                    onClick={() => { setLoginMode('select'); setAdminPassword(''); }}
                  >← Voltar</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== APP PRINCIPAL ====== */}
      {userRole !== null && (
        <div className="app-shell animate-fade-in">
          {/* Header */}
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src={`${import.meta.env.BASE_URL}drevo_logo.png`} alt="Drevo" style={{ height: '28px', objectFit: 'contain', filter: 'invert(1) hue-rotate(180deg) saturate(3)' }} />
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Almoxarifado</p>
              </div>
            </div>
            <div className="user-tag">
              <span style={{ fontWeight: 600 }}>{userRole === 'admin' ? 'Administrador' : 'Consulta'}</span>
              <button onClick={handleLogout} style={{ color: 'var(--error)', padding: '0.25rem' }} title="Sair">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            {currentStep !== 'categories' && currentStep !== 'success' && (
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <ChevronLeft size={20} /> Voltar
              </button>
            )}

            {/* CATEGORIAS */}
            {currentStep === 'categories' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>O que você procura?</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Selecione uma categoria.</p>
                  </div>
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => setCurrentStep('reports')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <BarChart3 size={16} /> Relatórios
                    </button>
                  )}
                </div>

                {categories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Nenhuma categoria encontrada.
                  </div>
                ) : (
                  <div className="grid-cards">
                    {categories.map(cat => (
                      <div key={cat.id} className="card" onClick={() => selectCategory(cat)}>
                        <div className="icon-wrapper">{getCategoryIcon(cat.name)}</div>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FERRAMENTAS */}
            {currentStep === 'tools' && selectedCategory && (
              <div className="animate-fade-in">
                <h3 style={{ marginBottom: '1rem' }}>{selectedCategory.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {toolsDb.filter(t => t.category === selectedCategory.name).map(tool => {
                    const isAvailable = tool.status === 'Disponível';
                    return (
                      <div key={tool.id} className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '1rem' }} onClick={() => selectTool(tool)}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 500 }}>{tool.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>ID #{tool.id}</div>
                        </div>
                        <div>
                          {isAvailable
                            ? <span className="badge badge-success">Disponível</span>
                            : <span className="badge badge-busy">Com {tool.worker}</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                  {toolsDb.filter(t => t.category === selectedCategory.name).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma ferramenta nesta categoria.</div>
                  )}
                </div>
              </div>
            )}

            {/* AÇÃO */}
            {currentStep === 'action' && selectedTool && (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div className="icon-wrapper" style={{ margin: '0 auto 1.25rem auto', width: '72px', height: '72px' }}>
                  {getCategoryIcon(selectedTool.category)}
                </div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{selectedTool.name}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
                  {selectedTool.status === 'Disponível'
                    ? 'Disponível no almoxarifado'
                    : `Em uso por ${selectedTool.worker}`}
                </p>

                {/* ADMIN: Retirar */}
                {userRole === 'admin' && selectedTool.status === 'Disponível' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Para quem?
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nome do Marceneiro"
                      value={targetWorker}
                      onChange={(e) => setTargetWorker(e.target.value)}
                    />

                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>
                      Destino
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {DESTINOS.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => { setDestino(d.id); setNomeObra(''); }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: destino === d.id ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                            background: destino === d.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: destino === d.id ? 700 : 400,
                          }}
                        >
                          {d.icon}
                          <span style={{ fontSize: '0.95rem' }}>{d.label}</span>
                        </button>
                      ))}
                    </div>

                    {destino === 'Obra' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Qual obra?
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Nome ou endereço"
                          value={nomeObra}
                          onChange={(e) => setNomeObra(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}

                    <button
                      className="btn-primary"
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => handleAction('retirar')}
                      disabled={!canRetirar}
                    >
                      Retirar Ferramenta
                    </button>
                  </div>
                )}

                {/* ADMIN: Devolver */}
                {userRole === 'admin' && selectedTool.status === 'Emprestado' && (
                  <button
                    className="btn-primary"
                    style={{ background: 'transparent', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', boxShadow: 'none', maxWidth: '280px', margin: '0 auto' }}
                    onClick={() => handleAction('devolver')}
                  >
                    Devolver Ferramenta
                  </button>
                )}

                {/* VIEWER: Somente leitura */}
                {userRole === 'viewer' && (
                  <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <MapPin size={20} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
                    <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Modo Consulta</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Para retirar ou devolver, fale com o almoxarife.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* RELATÓRIOS (NOVO) */}
            {currentStep === 'reports' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <TrendingUp size={24} color="var(--primary)" />
                  <h3 style={{ margin: 0 }}>Painel de Relatórios</h3>
                </div>

                {historyDb.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <p>Atualize a planilha (Apps Script) e faça movimentações para gerar dados.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* STATS RÁPIDOS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Ferramentas em Uso</p>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--error)', margin: 0 }}>{toolsInUse.length}</h2>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total de Retiradas</p>
                        <h2 style={{ fontSize: '2.5rem', color: '#4ade80', margin: 0 }}>{historyDb.filter(h => h.action === 'Retirou').length}</h2>
                      </div>
                    </div>

                    {/* GRÁFICO: DESTINO */}
                    {pieDataDestino.length > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem', textAlign: 'center' }}>Saídas: Obras vs Interno</h4>
                        <div style={{ height: '200px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pieDataDestino} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, value}) => `${name} (${value})`}>
                                {pieDataDestino.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* GRÁFICO: TOP MARCENEIROS */}
                    {barDataWorkers.length > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem', textAlign: 'center' }}>Top 5 Marceneiros (Retiradas)</h4>
                        <div style={{ height: '200px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barDataWorkers} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                              <XAxis dataKey="name" tick={{fill: '#9ca3af', fontSize: 12}} />
                              <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
                              <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
                              <Bar dataKey="Retiradas" fill="#ffffff" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* LISTA DE FERRAMENTAS EM USO */}
                    {toolsInUse.length > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <Clock size={18} color="var(--text-muted)" />
                          <h4 style={{ margin: 0 }}>Em uso neste momento</h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {toolsInUse.map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                              <span style={{ fontWeight: 500 }}>{t.name}</span>
                              <span style={{ color: 'var(--text-muted)' }}>com {t.worker}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUCESSO */}
            {currentStep === 'success' && (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ação Registrada!</h3>
                <p style={{ color: 'var(--text-muted)' }}>A planilha foi atualizada com sucesso.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2rem' }}>Redirecionando...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

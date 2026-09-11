import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import { 
  TrendingUp, 
  BarChart2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Percent, 
  ShieldAlert,
  Layers,
  ArrowLeft
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import './Analytics.css';

export default function Analytics({ onBack, userRole = 'admin' }) {
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';
  const isAdmin = userRole === 'admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'annual'

  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAnalyticsData();
  }, [isAdmin]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch projects, payments, and expenses concurrently
      const [projRes, payRes, expRes] = await Promise.all([
        supabase.from('projects').select('id, project_name, client_name, deposit_received, base_contract_value, created_at, start_date'),
        supabase.from('project_payments').select('id, project_id, amount, payment_date, created_at'),
        supabase.from('expenses_and_hours').select('id, project_id, category, cost_amount, date, created_at')
      ]);

      if (projRes.error) throw projRes.error;
      if (payRes.error) throw payRes.error;
      if (expRes.error) throw expRes.error;

      setProjects(projRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  // Helper month label formatter
  const getMonthLabel = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const months = isSpanish ? monthsEs : monthsEn;
    return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };

  // Aggregated data calculation
  const aggregatedData = useMemo(() => {
    const periodMap = {};

    // 1. Process Project Deposits (Income)
    projects.forEach(p => {
      const dep = parseFloat(p.deposit_received) || 0;
      if (dep > 0) {
        const dateStr = p.created_at || p.start_date || new Date().toISOString();
        const d = new Date(dateStr);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        const yearKey = `${y}`;
        const key = viewMode === 'monthly' ? monthKey : yearKey;

        if (!periodMap[key]) {
          periodMap[key] = { key, income: 0, expenses: 0, dateObj: d };
        }
        periodMap[key].income += dep;
      }
    });

    // 2. Process Client Payments (Income)
    payments.forEach(pay => {
      const amt = parseFloat(pay.amount) || 0;
      if (amt > 0) {
        const dateStr = pay.payment_date || pay.created_at || new Date().toISOString();
        const d = new Date(dateStr);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        const yearKey = `${y}`;
        const key = viewMode === 'monthly' ? monthKey : yearKey;

        if (!periodMap[key]) {
          periodMap[key] = { key, income: 0, expenses: 0, dateObj: d };
        }
        periodMap[key].income += amt;
      }
    });

    // 3. Process Expenses
    expenses.forEach(exp => {
      const amt = parseFloat(exp.cost_amount) || 0;
      if (amt > 0) {
        const dateStr = exp.date || exp.created_at || new Date().toISOString();
        const d = new Date(dateStr);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        const yearKey = `${y}`;
        const key = viewMode === 'monthly' ? monthKey : yearKey;

        if (!periodMap[key]) {
          periodMap[key] = { key, income: 0, expenses: 0, dateObj: d };
        }
        periodMap[key].expenses += amt;
      }
    });

    // Sort periods chronologically
    const sortedKeys = Object.keys(periodMap).sort();
    return sortedKeys.map(key => {
      const item = periodMap[key];
      const netProfit = item.income - item.expenses;
      const margin = item.income > 0 ? Math.round((netProfit / item.income) * 1000) / 10 : 0;
      let label = key;
      if (viewMode === 'monthly') {
        const [yr, mo] = key.split('-');
        const dateTemp = new Date(Date.UTC(parseInt(yr, 10), parseInt(mo, 10) - 1, 1));
        label = getMonthLabel(dateTemp.toISOString());
      }

      return {
        key,
        label,
        income: Math.round(item.income * 100) / 100,
        expenses: Math.round(item.expenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        margin
      };
    });
  }, [projects, payments, expenses, viewMode, isSpanish]);

  // Overall totals
  const totalIncome = useMemo(() => aggregatedData.reduce((sum, d) => sum + d.income, 0), [aggregatedData]);
  const totalExpenses = useMemo(() => aggregatedData.reduce((sum, d) => sum + d.expenses, 0), [aggregatedData]);
  const totalNetProfit = totalIncome - totalExpenses;
  const overallMargin = totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) : '0.0';

  if (!isAdmin) {
    return (
      <div className="analytics-container">
        <div style={{
          background: '#fff',
          border: '1px solid var(--arka-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--arka-navy)', margin: '0 0 8px' }}>
            {t('analytics.accessRestrictedTitle') || 'Acceso Restringido'}
          </h2>
          <p style={{ color: 'var(--arka-text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
            {t('analytics.accessRestrictedText') || 'El módulo de Análisis de Desempeño está estrictamente reservado para administradores.'}
          </p>
          {onBack && (
            <button className="nav-action-btn back-nav-btn" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>{t('common.backToDashboard')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#0D1726',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '12.5px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--arka-gold)', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px' }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <div key={`tooltip-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', margin: '3px 0' }}>
              <span style={{ color: entry.color, fontWeight: 600 }}>{entry.name}:</span>
              <span style={{ fontWeight: 700 }}>{formatToUSD(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="studio-pill">{t('analytics.studioPill') || 'Performance & Financial Insights'}</span>
          </div>
          <h1 className="analytics-title">{t('analytics.title') || 'Análisis de Desempeño'}</h1>
          <p className="analytics-subtitle">
            {t('analytics.subtitle') || 'Supervisa el flujo de caja, ingresos totales, costos directos y márgenes de ganancia.'}
          </p>
        </div>

        {/* View Mode Toggle: Monthly vs Annual */}
        <div className="analytics-toggle-group">
          <button
            type="button"
            className={`analytics-toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            <Calendar size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-2px' }} />
            {t('analytics.monthlyView') || 'Vista Mensual'}
          </button>
          <button
            type="button"
            className={`analytics-toggle-btn ${viewMode === 'annual' ? 'active' : ''}`}
            onClick={() => setViewMode('annual')}
          >
            <Layers size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-2px' }} />
            {t('analytics.annualView') || 'Vista Anual'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="analytics-kpi-grid">
        {/* Total Income */}
        <div className="analytics-kpi-card income">
          <div className="analytics-kpi-label">{t('analytics.totalIncome') || 'Ingresos Totales (Recaudado)'}</div>
          <div className="analytics-kpi-value" style={{ color: 'var(--arka-gold)' }}>
            {formatToUSD(totalIncome)}
          </div>
          <div className="analytics-kpi-subtext">
            <ArrowUpRight size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#10b981' }} />
            {' '}{t('analytics.incomeSubtext') || 'Anticipos + Abonos cobrados'}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="analytics-kpi-card expenses">
          <div className="analytics-kpi-label">{t('analytics.totalExpenses') || 'Costos y Gastos Totales'}</div>
          <div className="analytics-kpi-value" style={{ color: '#475569' }}>
            {formatToUSD(totalExpenses)}
          </div>
          <div className="analytics-kpi-subtext">
            <ArrowDownRight size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#ef4444' }} />
            {' '}{t('analytics.expensesSubtext') || 'Materiales, mano de obra y extras'}
          </div>
        </div>

        {/* Net Profit */}
        <div className="analytics-kpi-card profit">
          <div className="analytics-kpi-label">{t('analytics.netProfit') || 'Utilidad Bruta Neta'}</div>
          <div className="analytics-kpi-value" style={{ color: totalNetProfit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatToUSD(totalNetProfit)}
          </div>
          <div className="analytics-kpi-subtext">
            {t('analytics.profitSubtext') || 'Ingresos menos gastos directos'}
          </div>
        </div>

        {/* Profit Margin */}
        <div className="analytics-kpi-card margin">
          <div className="analytics-kpi-label">{t('analytics.profitMargin') || 'Margen de Utilidad'}</div>
          <div className="analytics-kpi-value" style={{ color: 'var(--arka-navy)' }}>
            {overallMargin}%
          </div>
          <div className="analytics-kpi-subtext">
            <Percent size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />
            {' '}{t('analytics.marginSubtext') || 'Rendimiento promedio general'}
          </div>
        </div>
      </div>

      {/* Main Income vs Expenses Bar Chart */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-header">
          <div>
            <h2 className="analytics-chart-title">
              {t('analytics.incomeVsExpensesTitle') || 'Ingresos vs Gastos'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--arka-text-secondary)' }}>
              {viewMode === 'monthly' ? (t('analytics.monthlyCompSub') || 'Comparativa mensual acumulada') : (t('analytics.annualCompSub') || 'Comparativa anual histórica')}
            </p>
          </div>

          <div className="analytics-chart-legend-custom">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#B48C3C' }}></span>
              <span>{t('analytics.incomeLegend') || 'Ingresos'}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#64748B' }}></span>
              <span>{t('analytics.expensesLegend') || 'Gastos'}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arka-text-secondary)' }}>
            {t('common.loading')}
          </div>
        ) : aggregatedData.length === 0 ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arka-text-secondary)' }}>
            {t('analytics.noData') || 'No hay suficientes datos registrados para graficar.'}
          </div>
        ) : (
          <div style={{ width: '100%', height: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aggregatedData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis 
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="income" 
                  name={isSpanish ? 'Ingresos' : 'Income'} 
                  fill="#B48C3C" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={45} 
                />
                <Bar 
                  dataKey="expenses" 
                  name={isSpanish ? 'Gastos' : 'Expenses'} 
                  fill="#64748B" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={45} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cash Flow / Net Profit Trend Area Chart */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-header">
          <div>
            <h2 className="analytics-chart-title">
              {t('analytics.netProfitTrendTitle') || 'Evolución de Flujo Neto y Utilidad'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--arka-text-secondary)' }}>
              {t('analytics.netProfitTrendSub') || 'Tendencia de rentabilidad por periodo'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arka-text-secondary)' }}>
            {t('common.loading')}
          </div>
        ) : aggregatedData.length === 0 ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arka-text-secondary)' }}>
            {t('analytics.noData') || 'No hay suficientes datos registrados para graficar.'}
          </div>
        ) : (
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={aggregatedData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis 
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="netProfit" 
                  name={isSpanish ? 'Utilidad Neta' : 'Net Profit'} 
                  stroke="#10B981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabular Breakdown Table */}
      <div className="analytics-table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--arka-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--arka-navy)' }}>
            {t('analytics.breakdownTableTitle') || 'Detalle Financiero por Período'}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--arka-text-secondary)' }}>
            {aggregatedData.length} {viewMode === 'monthly' ? (t('analytics.periodsMonthly') || 'meses') : (t('analytics.periodsAnnual') || 'años')}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{viewMode === 'monthly' ? (t('analytics.colMonth') || 'Mes') : (t('analytics.colYear') || 'Año')}</th>
                <th style={{ textAlign: 'right' }}>{t('analytics.colIncome') || 'Ingresos'}</th>
                <th style={{ textAlign: 'right' }}>{t('analytics.colExpenses') || 'Gastos'}</th>
                <th style={{ textAlign: 'right' }}>{t('analytics.colNetProfit') || 'Utilidad Neta'}</th>
                <th style={{ textAlign: 'right' }}>{t('analytics.colMargin') || 'Margen %'}</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedData.map((row) => (
                <tr key={row.key}>
                  <td style={{ fontWeight: 600, color: 'var(--arka-navy)' }}>{row.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--arka-gold)' }}>
                    {formatToUSD(row.income)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#475569' }}>
                    {formatToUSD(row.expenses)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: row.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatToUSD(row.netProfit)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {row.margin}%
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--arka-text-secondary)' }}>
                    {t('analytics.noData') || 'No hay datos registrados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

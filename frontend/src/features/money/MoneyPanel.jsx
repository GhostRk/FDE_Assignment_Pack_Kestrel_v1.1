import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AsyncState } from '../../components/AsyncState';
import { DataTable } from '../../components/DataTable';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader } from '../../components/SectionHeader';
import { inr, percent } from '../../utils/format';

export function MoneyPanel() {
  const { data, loading, error, reload } = useAsyncData(api.money, []);
  const [syncing, setSyncing] = useState(false);
  const money = data?.data;
  const carriers = money?.freight_by_carrier || [];
  const leakage = money?.return_leakage_by_category || [];
  const worstCarrier = carriers[0];
  const worstLeakage = leakage[0];
  const sync = async () => { setSyncing(true); try { await api.syncMoney(); await reload(); } finally { setSyncing(false); } };

  return <section id="money" className="panel">
    <SectionHeader eyebrow="03 · Money" title="Freight and return leakage" description="Q1 FY 2026–27 · Carrier bills are reconciled against delivered cases." action={<button className="secondary-button" onClick={sync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing invoices…' : 'Sync freight invoices'}</button>} />
    <AsyncState loading={loading} error={error}>
      <div className="metric-grid">
        <MetricCard label="Highest freight cost / case" value={inr(worstCarrier?.freight_cost_per_case_inr)} detail={worstCarrier?.carrier_name} tone="danger" />
        <MetricCard label="Highest return leakage" value={percent(worstLeakage?.return_leakage_pct)} detail={worstLeakage?.category} tone="warning" />
        <MetricCard label="Invoice sync status" value={data?.meta?.invoice_sync_status?.invoice_count || 0} detail="Invoices in local reporting store" />
        <MetricCard label="Unmatched invoices" value={carriers.reduce((sum, row) => sum + row.unmatched_invoice_count, 0)} detail="Requires reconciliation" tone="warning" />
      </div>
      <p className="data-warning">{data?.meta?.data_quality_warning}</p>
      <div className="two-column">
        <article className="subpanel"><h3>Freight by carrier</h3><DataTable rows={carriers} columns={[
          { label: 'Carrier', key: 'carrier_name' }, { label: 'Cost / case', render: (row) => <b>{inr(row.freight_cost_per_case_inr)}</b> }, { label: 'Matched cost', render: (row) => inr(row.matched_freight_cost_inr) }, { label: 'Unmatched', key: 'unmatched_invoice_count' },
        ]} /></article>
        <article className="subpanel"><h3>Return leakage by category</h3><DataTable rows={leakage} columns={[
          { label: 'Category', key: 'category' }, { label: 'Leakage', render: (row) => percent(row.return_leakage_pct) }, { label: 'Credit value', render: (row) => inr(row.credit_note_value_inr) },
        ]} /></article>
      </div>
    </AsyncState>
  </section>;
}

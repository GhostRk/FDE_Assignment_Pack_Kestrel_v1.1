import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AsyncState } from '../../components/AsyncState';
import { DataTable } from '../../components/DataTable';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader } from '../../components/SectionHeader';
import { inr, percent } from '../../utils/format';

const CITIES = ['Mumbai', 'Bengaluru', 'Delhi NCR', 'Chennai'];

export function PricingPanel() {
  const [city, setCity] = useState('Mumbai');
  const { data, loading, error, reload } = useAsyncData(() => api.prices(city), [city]);
  const [syncing, setSyncing] = useState(false);
  const pricing = data?.data;
  const skuRows = pricing?.by_sku || [];
  const categories = pricing?.by_category || [];
  const worst = skuRows[0];
  const sync = async () => { setSyncing(true); try { await api.syncPrices(); await reload(); } finally { setSyncing(false); } };

  return <section id="pricing" className="panel">
    <SectionHeader eyebrow="04 · Price position" title="MRP against the shelf" description="Only exact product-type, category, and pack matches are compared." action={<div className="header-actions"><select value={city} onChange={(event) => setCity(event.target.value)}>{CITIES.map((item) => <option key={item}>{item}</option>)}</select><button className="secondary-button" onClick={sync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync prices'}</button></div>} />
    <AsyncState loading={loading} error={error}>
      <div className="metric-grid">
        <MetricCard label="Largest MRP gap" value={inr(worst?.price_gap_inr)} detail={worst?.product_name} tone="danger" />
        <MetricCard label="Comparable SKUs" value={skuRows.length} detail={`${city} exact matches`} />
        <MetricCard label="Most exposed category" value={inr(categories[0]?.average_price_gap_inr)} detail={categories[0]?.category} tone="warning" />
        <MetricCard label="Price observation" value={worst?.last_seen_date || '—'} detail="Latest item in current ranking" />
      </div>
      <div className="two-column">
        <article className="subpanel"><h3>Category price position</h3><DataTable rows={categories} columns={[
          { label: 'Category', key: 'category' }, { label: 'Avg. MRP gap', render: (row) => inr(row.average_price_gap_inr) }, { label: 'SKUs above competitor', render: (row) => `${row.above_competitor_count} / ${row.comparable_sku_count}` },
        ]} /></article>
        <article className="subpanel"><h3>Largest SKU gaps</h3><DataTable rows={skuRows.slice(0, 6)} columns={[
          { label: 'SKU', render: (row) => <span title={row.product_name}>{row.product_name}</span> }, { label: 'Gap', render: (row) => <b className={row.price_gap_inr > 0 ? 'danger-text' : 'success-text'}>{inr(row.price_gap_inr)} · {percent(row.price_gap_pct_of_mrp)}</b> }, { label: 'Competitor', key: 'competitor_retailer' },
        ]} /></article>
      </div>
    </AsyncState>
  </section>;
}

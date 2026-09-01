import { api } from '../../api/client';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AsyncState } from '../../components/AsyncState';
import { DataTable } from '../../components/DataTable';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader } from '../../components/SectionHeader';
import { inr, integer } from '../../utils/format';

export function ColdChainPanel() {
  const { data, loading, error } = useAsyncData(api.coldChain, []);
  const overview = data?.data;
  const excursions = overview?.temperature_excursions || [];
  const nearExpiry = overview?.near_expiry_stock?.by_warehouse || [];
  const returns = overview?.cold_chain_returns || [];
  const latestExcursion = excursions.at(-1);
  const mostExposed = nearExpiry[0];
  const returnValue = returns.reduce((sum, row) => sum + row.credit_note_value_inr, 0);

  return <section id="cold-chain" className="panel">
    <SectionHeader eyebrow="02 · Cold chain" title="Temperature, expiry, and spoilage risk" description="Q1 view · Near-expiry threshold: 30 days." />
    <AsyncState loading={loading} error={error}>
      <div className="metric-grid">
        <MetricCard label="Latest excursions" value={`${latestExcursion?.excursions_per_100_deliveries || 0} / 100`} detail={latestExcursion?.month} tone="danger" />
        <MetricCard label="Most near-expiry stock" value={integer(mostExposed?.available_cases)} detail={mostExposed?.warehouse_name} tone="warning" />
        <MetricCard label="Cold-chain return value" value={inr(returnValue)} detail="Q1 credit notes" tone="warning" />
        <MetricCard label="Inventory snapshot" value={overview?.near_expiry_stock?.snapshot_date || '—'} detail="Latest available snapshot" />
      </div>
      <div className="two-column">
        <article className="subpanel"><h3>Temperature excursions</h3><DataTable rows={excursions} columns={[
          { label: 'Month', key: 'month' }, { label: 'Chilled deliveries', render: (row) => integer(row.chilled_deliveries) }, { label: 'Excursions', key: 'excursion_count' }, { label: 'Per 100', render: (row) => row.excursions_per_100_deliveries },
        ]} /></article>
        <article className="subpanel"><h3>Near-expiry stock by warehouse</h3><DataTable rows={nearExpiry.slice(0, 5)} columns={[
          { label: 'Warehouse', key: 'warehouse_name' }, { label: 'Available cases', render: (row) => integer(row.available_cases) }, { label: 'Batches', key: 'batch_count' },
        ]} /></article>
      </div>
    </AsyncState>
  </section>;
}

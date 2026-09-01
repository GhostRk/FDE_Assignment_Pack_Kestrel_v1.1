import { useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { api } from '../../api/client';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AsyncState } from '../../components/AsyncState';
import { DataTable } from '../../components/DataTable';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader } from '../../components/SectionHeader';
import { percent, integer } from '../../utils/format';

const GROUPS = ['region', 'warehouse', 'route', 'outlet'];

export function ServicePanel() {
  const [groupBy, setGroupBy] = useState('region');
  const { data, loading, error } = useAsyncData(() => api.service(groupBy), [groupBy]);
  const rows = data?.data || [];
  const worstFill = rows[0];
  const worstOnTime = [...rows].sort((a, b) => a.on_time_delivery_pct - b.on_time_delivery_pct)[0];
  const totals = rows.reduce((acc, row) => ({ ordered: acc.ordered + row.ordered_eaches, delivered: acc.delivered + row.delivered_eaches, orders: acc.orders + row.order_count }), { ordered: 0, delivered: 0, orders: 0 });

  return <section id="service" className="panel">
    <SectionHeader eyebrow="01 · Service" title="Where service is breaking" description="Q1 FY 2026–27 · Worst performers are ranked first." action={
      <label className="select-wrap"><ArrowDownUp size={15} /><select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>{GROUPS.map((group) => <option key={group} value={group}>By {group}</option>)}</select></label>
    } />
    <AsyncState loading={loading} error={error}>
      <div className="metric-grid">
        <MetricCard label="Overall fill rate" value={percent(100 * totals.delivered / totals.ordered)} detail="Measured in eaches" tone="warning" />
        <MetricCard label="Worst fill rate" value={percent(worstFill?.fill_rate_pct)} detail={worstFill?.name} tone="danger" />
        <MetricCard label="Worst on-time rate" value={percent(worstOnTime?.on_time_delivery_pct)} detail={worstOnTime?.name} tone="danger" />
        <MetricCard label="Orders assessed" value={integer(totals.orders)} detail="Delivered and partial orders" />
      </div>
      {data?.meta?.data_quality_warning && <p className="data-warning">{data.meta.data_quality_warning}</p>}
      <DataTable rows={rows} columns={[
        { label: groupBy[0].toUpperCase() + groupBy.slice(1), key: 'name' },
        { label: 'Fill rate', render: (row) => <b className="danger-text">{percent(row.fill_rate_pct)}</b> },
        { label: 'On-time', render: (row) => percent(row.on_time_delivery_pct) },
        { label: 'Strict OTIF', render: (row) => percent(row.strict_otif_pct) },
        { label: 'Orders', render: (row) => integer(row.order_count) },
      ]} />
    </AsyncState>
  </section>;
}

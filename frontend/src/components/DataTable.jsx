export function DataTable({ columns, rows, emptyMessage = 'No data is available.' }) {
  if (!rows?.length) return <p className="empty-state">{emptyMessage}</p>;
  return <div className="table-wrap"><table>
    <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id || row.name || row.category || row.route_code || index}>
      {columns.map((column) => <td key={column.label}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
    </tr>)}</tbody>
  </table></div>;
}

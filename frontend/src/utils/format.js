export const percent = (value) => `${Number(value || 0).toFixed(2)}%`;
export const integer = (value) => new Intl.NumberFormat('en-IN').format(Math.round(value || 0));
export const inr = (value) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value || 0)}`;

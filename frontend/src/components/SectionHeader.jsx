export function SectionHeader({ eyebrow, title, description, action }) {
  return <div className="section-header">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
    {action}
  </div>;
}

export default function AdminPageHeader({
  eyebrow = "MushMush Admin",
  title,
  description,
  action,
}) {
  return (
    <header className="admin-page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {description && <span>{description}</span>}
      </div>
      {action}
    </header>
  );
}

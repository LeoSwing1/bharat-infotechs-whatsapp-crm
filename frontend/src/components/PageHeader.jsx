export default function PageHeader({ title, actions }) {
  return (
    <div className="topbar">
      <h2>{title}</h2>
      <div className="flex-gap">{actions}</div>
    </div>
  );
}

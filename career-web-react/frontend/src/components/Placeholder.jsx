// État vide générique ("Importe un CV pour débloquer cette page", etc.).
export function Placeholder({ title, text }) {
  return (
    <section className="placeholder card">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

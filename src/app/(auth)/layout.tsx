export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="K C Model School & College emblem" className="auth-logo" />
        <h1 className="auth-title">K C Model School &amp; College</h1>
        <p className="muted center">Employee System</p>
        {children}
      </div>
      <p className="muted small center">Knowledge · Discipline · Morality</p>
    </div>
  );
}

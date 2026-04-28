import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="mx-auto max-w-2xl text-center px-6">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="GestorAdv" className="h-14 w-14 rounded-xl object-contain shadow-lg" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            GestorAdv
          </h1>
        </div>

        <p className="mb-2 text-xl text-muted-foreground">
          Sistema Gerenciador para Escritórios de Advocacia
        </p>
        <p className="mb-10 text-sm text-muted-foreground">
          Automação inteligente, controle de prazos e gestão completa de processos
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 hover:shadow-lg"
          >
            Acessar o Sistema
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-border bg-card px-8 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary"
          >
            Criar Conta
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            title="Controle de Prazos"
            description="Alertas automáticos e monitoramento de prazos processuais"
          />
          <FeatureCard
            title="IA Integrada"
            description="Geração de peças jurídicas e triagem de clientes com IA"
          />
          <FeatureCard
            title="Gestão Completa"
            description="Processos, clientes, documentos e financeiro em um só lugar"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-left shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

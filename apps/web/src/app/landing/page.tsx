import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">GA</div>
            <span className="text-xl font-bold text-foreground">GestorAdv</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Entrar</Link>
            <Link href="#contato" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Agendar Consulta</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Resolva seu problema jurídico<br />com quem entende do assunto
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Escritório especializado em Direito Civil, Trabalhista, Família e Criminal.
          Atendimento humanizado e soluções eficientes para o seu caso.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <a href="#contato" className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90">
            Fale com um Advogado
          </a>
          <a href="#areas" className="rounded-lg border border-border px-8 py-3 text-sm font-semibold text-foreground hover:bg-secondary">
            Nossas Áreas de Atuação
          </a>
        </div>
      </section>

      {/* Areas */}
      <section id="areas" className="border-t border-border bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">Áreas de Atuação</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Direito Civil', desc: 'Contratos, responsabilidade civil, direito imobiliário e cobranças' },
              { title: 'Direito Trabalhista', desc: 'Verbas rescisórias, horas extras, assédio moral e acidentes de trabalho' },
              { title: 'Direito de Família', desc: 'Divórcio, guarda de filhos, pensão alimentícia e inventário' },
              { title: 'Direito Criminal', desc: 'Defesa criminal, habeas corpus, recursos e execução penal' },
            ].map((area) => (
              <div key={area.title} className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">{area.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section id="contato" className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Agende sua Consulta</h2>
          <p className="mb-8 text-muted-foreground">Preencha o formulário e entraremos em contato em até 24 horas</p>
          <form className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Seu nome completo" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Telefone</label>
                <input type="tel" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Área de interesse</label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                <option>Direito Civil</option>
                <option>Direito Trabalhista</option>
                <option>Direito de Família</option>
                <option>Direito Criminal</option>
                <option>Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descreva seu caso brevemente</label>
              <textarea rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Conte-nos sobre sua situação..." />
            </div>
            <button type="submit" className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
              Enviar e Agendar Consulta
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Ao enviar, você concorda com nossa política de privacidade (LGPD).
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>GestorAdv - Sistema para Escritórios de Advocacia</p>
        </div>
      </footer>
    </div>
  );
}

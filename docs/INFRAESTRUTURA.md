# Infraestrutura — base de conhecimento (levantamento de mercado)

Este documento é **material bruto de pesquisa**, não decisão. Preços, specs e latência coletados via busca na web (incluindo fóruns/Reddit/Hacker News para preço real, não só marketing) — mudam com frequência, confirme antes de orçar de verdade.

- **Decisão e por quê escolhemos cada provedor:** `docs/ARCHITECTURE.md` §5.
- **Custo mensal estimado do que já foi escolhido:** `docs/ARCHITECTURE.md` §6.

Fontes originais coletadas em 17/08/2026 (Postgres/Deploy/VPS/E-mail) e 24/08/2026 (Blob storage) — ver seção "Fontes" ao final de cada bloco.

---

## 1. Banco de dados PostgreSQL gerenciado

Fica fora da tabela geral (seção 2) por não ser comparável a VPS: um Postgres gerenciado já inclui HA, backups e patching no preço.

| Provedor | Free tier | Preço de entrada (produção) | Cobrança | Região no Brasil? | Diferenciais |
| --- | --- | --- | --- | --- | --- |
| **Neon** | Sim — 0,5 GB, 100 CU-h/mês, 10 branches | Pay-as-you-go, sem mínimo ($0,106/CU-h) | Compute/CU-h + storage/GB-mês | **Sim — sa-east-1** | Branching copy-on-write, scale-to-zero, autoscaling |
| **PlanetScale Postgres** | Não existe | US$5/mês (single-node) · US$15/mês (HA) | Fixo por cluster + storage | **Sim — sa-east-1** | HA padrão, failover <30s, branching a partir de backups |
| **Railway** | Só trial | US$5/mês (Hobby, inclui US$5 de uso) | Uso por segundo | Não (US/EU/Singapura) | DX simples, sem HA "enterprise" nativa |
| **Render** | Sim — 1GB, expira em 30 dias | US$6/mês (Basic-256mb) + US$25 fee de workspace Pro | Instância fixa + fee de workspace | Não | Deploy via Blueprints/IaC, backups automáticos |
| **DigitalOcean Managed DB** | Não | US$15,15/mês (single-node); HA desde US$60/mês | Instância fixa + storage extra | **Sim — São Paulo** | Backup diário + PITR grátis, réplicas de leitura |
| **AWS RDS / Aurora PostgreSQL** | Sim — 750h db.t3/t4g.micro + 20GB, 12 meses | ~US$12/mês (db.t4g.micro, us-east-1; sa-east-1 ~20-40% mais caro) | On-demand/hora + storage/IOPS | **Sim — sa-east-1** | Multi-AZ HA, read replicas; Aurora Serverless v2 desde US$0,12/ACU-h |
| **Google Cloud SQL** | Não (só crédito trial) | ~US$8-15/mês (shared-core) + storage | Compute/segundo + storage | **Sim — southamerica-east1** (~20-40% mais caro que us-central1) | Integração IAM/BigQuery, descontos por uso sustentado |
| **Aiven for PostgreSQL** | Sim — 1 vCPU/1GB, sempre grátis | US$19/mês (dev); HA real US$75/mês | Hourly, all-inclusive | Não | Multi-cloud, preço tudo incluso, Terraform |
| **Crunchy Bridge** | Não | US$70/mês (Standard-4, produção real) | Hourly, all-inclusive | **Sim — via AWS São Paulo** | BYOC, PostGIS/pgvector/Citus, connection pooling nativo |
| **Timescale Cloud (Tiger Data)** | Trial 30 dias, sem cartão | US$30/mês (Performance) | Hourly compute + storage por uso | **Sim — única região SA, via AWS** | Extensão time-series (hypertables), também pgvector/pgai |

**Preço detalhado Neon** (usado no cálculo de `docs/ARCHITECTURE.md` §6): compute US$0,106/CU-h (plano Launch) · storage US$0,35/GB-mês · sem mínimo mensal desde dez/2025 · autosuspend em 5 min de inatividade no free tier.

**Comparação always-on, spec equivalente ~1-2vCPU/4GB** (24/08/2026 — usada em `docs/ARCHITECTURE.md` §5.1 pra confirmar o trade-off de manter Neon): Neon (1 CU, 730h × US$0,106 + storage) ≈ US$77-80/mês · DigitalOcean Managed DB (Growth, 2vCPU/4GB, já inclui 60GB storage + backup + PITR) ≈ US$60,90/mês · AWS RDS db.t4g.medium (2vCPU/4GB, us-east-1 US$0,065/h ≈ US$47,45/mês; sa-east-1 soma ~20-40%) ≈ US$47-66/mês + storage à parte. Fontes: [Managed PostgreSQL Comparison 2026](https://selfhost.dev/blog/managed-postgresql-comparison-2026/) · [db.t4g.medium pricing — Vantage](https://instances.vantage.sh/aws/rds/db.t4g.medium) · [AWS RDS Cost Breakdown 2026](https://selfhost.dev/blog/aws-rds-cost-breakdown-2026/).

---

## 2. Tabela geral — deploy, VPS e e-mail

| Categoria | Provedor / Plano | Preço/mês (USD) | Specs / Capacidade | Região no Brasil? | Latência SP → fora LatAm | Observação-chave |
| --- | --- | --- | --- | --- | --- | --- |
| Deploy | **Heroku** (Basic) | US$7 | 1 vCPU / 512MB | Não | ~110–140ms | PaaS clássico, sem região LatAm |
| Deploy | **Fly.io** (shared-cpu-1x) | ~US$2–6 | 1 vCPU comp. / 256MB–1GB | **Sim — GRU** | ~1–5ms | Região BR desde o início, cobrança por segundo |
| Deploy | **Railway** (Hobby) | ~US$5–15 | uso por segundo | Não | ~110–140ms | Fatura pode surpreender — cobrança por uso real |
| Deploy | **Render** (Starter) | US$7 | 512MB always-on | Não | ~110–140ms | Preço fixo previsível, caro em escala |
| Deploy | **DigitalOcean App Platform** | ~US$12 | produção básica | Não | ~109ms | Egress extra ($0,02/GiB) pega desavisado |
| Deploy | **Google Cloud Run** | US$0–10 (variável) | pay-per-use, escala a zero | **Sim — southamerica-east1** | ~1–5ms | Caso real: fatura de US$4.676 em 6 semanas por má config |
| Deploy | **AWS App Runner** | ~US$13–18 | 2GB | Não | ~110–140ms | **Descontinuado p/ novos clientes a partir de abr/2026** |
| Deploy | **Koyeb** | US$29 (Pro) | — | Não | ~110–220ms | Adquirida pela Mistral AI (fev/2026), foco virou IA/GPU |
| Deploy | **Northflank** | ~US$5–10/container | — | Sim, só via BYOC | ~1–5ms (se BYOC em SP) | ~40% mais barato que Railway por recurso-hora |
| VPS | **DigitalOcean** (Basic Droplet) | US$24 | 2 vCPU / 4GB / 80GB SSD | Não | ~109ms | — |
| VPS | **Hetzner** (CX22) | ~US$5 | 2 vCPU / 4GB / 40GB NVMe | Não | ~110–130ms (estimado) | Mais barato por spec, sem região BR |
| VPS | **Vultr** (Cloud Compute) | US$20 | 2 vCPU / 4GB / 80GB SSD | **Sim — São Paulo** | ~1–5ms | — |
| VPS | **Linode / Akamai** (4GB) | US$24 (ou US$12 no 2GB) | 2 vCPU / 4GB / 80GB SSD | **Sim — São Paulo** | ~1–5ms | — |
| VPS | **Contabo** (Cloud VPS 4) | ~US$6 | 4 vCPU / 8GB / 100GB SSD | Não | ~109ms | Mais barato por spec, sem região BR |
| VPS | **AWS Lightsail** | US$10–12 | 2 vCPU / 2–4GB / 60GB SSD | **Sim — sa-east-1 (desde jun/2026)** | ~1–5ms | — |
| E-mail (caixa) | **Hostinger Email** (Premium) | ~US$4/caixa | 50GB | N/A | N/A | Ver seção 3 |
| E-mail (caixa) | **Titan Business** | US$0,99/usuário | 10GB | N/A | N/A | Ver seção 3 |
| E-mail (caixa) | **Google Workspace** (Business Starter) | US$8,40/usuário | 30GB pooled | N/A | N/A | Ver seção 3 |
| E-mail (caixa) | **Zoho Mail** (Lite) | US$1/usuário | 5–10GB | N/A | N/A | Ver seção 3 |
| E-mail (automático) | **Amazon SES** | ~US$1 / 10 mil e-mails | pay-as-you-go | N/A | N/A | Mais barato para volume |
| E-mail (automático) | **Resend** (Pro) | US$20 / 50 mil e-mails | API/SMTP | N/A | N/A | Melhor DX |
| E-mail (automático) | **SendGrid** (Essentials) | US$19,95 / 50 mil e-mails | API/SMTP | N/A | N/A | Enterprise-grade |
| E-mail (automático) | **Mailgun** (Foundation) | US$35 / 50 mil e-mails | API/SMTP | N/A | N/A | — |
| E-mail (automático) | **Postmark** | US$15 / 10 mil incluídos | API/SMTP, só transacional | N/A | N/A | Referência de deliverability |

**Preço detalhado Fly.io** (usado no cálculo de `docs/ARCHITECTURE.md` §6): shared-cpu-1x/256MB ≈ US$1,94/mês always-on · +1GB RAM total ≈ US$3,18/mês. **Sem free tier desde 2024** — só trial de 2h ou 7 dias (o que vier primeiro) com US$5 de crédito; depois exige cartão.

**Preço detalhado Zoho Mail**: plano **Forever Free** — até 5 usuários, 1 domínio, 5GB/usuário, só webmail (sem IMAP/POP), anexo até 25MB. Plano **Lite** (US$1/usuário/mês) remove essas limitações.

---

## 3. Caixa de e-mail comum dá pra usar para envio automático?

Curto: tecnicamente sim, na prática não deveria — exceto em volume baixo.

| Provedor | Envio automático via SMTP é possível? | Limite diário | Permitido pelos termos? | Risco prático |
| --- | --- | --- | --- | --- |
| **Gmail / Google Workspace** (SMTP padrão) | Sim | 2.000/dia por usuário | Tolerado em volume baixo | Bloqueio de envio por 24h ao exceder |
| **Gmail / Google Workspace** (SMTP Relay dedicado) | Sim — uso oficial | 10.000/dia por usuário (org pode chegar a milhões) | **Sim**, recomendado pelo Google | Sem bounce/analytics robustos |
| **Zoho Mail** | Sim, tecnicamente | ~50–500/hora externos (dinâmico) | **Não** — termos proíbem "bulk/burst sending" | Throttling, risco de suspensão por abuso |
| **Hostinger Email** | Sim, tecnicamente | 100 a 3.000/dia conforme plano | Não claramente endereçado | Antiabuso pode bloquear rajadas mesmo dentro do limite |
| **Titan Email** | Sim, tecnicamente | ~500/dia (até 5.000/dia com SPF/DKIM/DMARC ok) | Desaconselhado p/ campanhas | Bloqueio até reset; reputação de domínio pode cair |

**Veredito**: pra volume baixo (dezenas a poucas centenas/dia), SMTP de caixa comum funciona — principalmente SMTP Relay do Google Workspace. Fora isso, sempre serviço transacional dedicado (SES/Resend/SendGrid/Mailgun/Postmark). Zoho proíbe uso em massa nos termos; Hostinger/Titan aplicam throttling que derruba entregabilidade sem aviso.

---

## 4. Leitura rápida (levantamento original)

- **Deploy sensível a latência no Brasil**: Fly.io (GRU) e Google Cloud Run (southamerica-east1) são as únicas com região física no Brasil.
- **Cuidado com billing variável**: Cloud Run e Railway cobram por uso real — há casos documentados de fatura explosiva (ex: US$4.676 em 6 semanas no Cloud Run).
- **Evite AWS App Runner** para projetos novos — descontinuado a partir de abr/2026.
- **VPS com presença no Brasil**: Vultr, Linode/Akamai e AWS Lightsail rodam em São Paulo. Hetzner e Contabo são mais baratos mas ficam a ~110ms+ de distância.
- **Postgres gerenciado**: dá pra ficar 100% em São Paulo com Neon, PlanetScale, DigitalOcean, AWS, GCP, Crunchy Bridge ou Timescale.
- **Envio automático**: nunca use caixa comum para volume real.

### Fontes (Postgres/Deploy/VPS/E-mail, 17/08/2026)

**Postgres**: [Neon Pricing](https://neon.com/pricing) · [PlanetScale Pricing](https://planetscale.com/pricing) · [Railway Pricing](https://docs.railway.com/pricing/plans) · [Render Regions](https://render.com/docs/regions) · [DigitalOcean PostgreSQL Pricing](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/) · [AWS RDS Cost Breakdown 2026](https://selfhost.dev/blog/aws-rds-cost-breakdown-2026/) · [Google Cloud SQL Pricing](https://cloud.google.com/sql/pricing) · [Aiven PostgreSQL Pricing](https://aiven.io/pricing/postgresql) · [Crunchy Bridge Pricing](https://www.crunchydata.com/pricing) · [Tiger Data Pricing](https://www.tigerdata.com/pricing)

**Deploy**: [Heroku Pricing](https://www.heroku.com/pricing/) · [Fly.io Pricing](https://fly.io/docs/about/pricing/) · [Railway vs Render 2026](https://selfhost.dev/blog/railway-vs-render-pricing-2026-verdict/) · [DigitalOcean App Platform Pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/) · [Cloud Run Pricing](https://cloud.google.com/run/pricing) · [HN: Cloud Run cost me $4,676 in 6 weeks](https://news.ycombinator.com/item?id=46378065) · [Encore: End of AWS App Runner](https://encore.dev/articles/end-of-app-runner) · [Koyeb Pricing FAQ](https://www.koyeb.com/docs/faqs/pricing) · [Northflank Pricing 2026](https://www.budgetforge.dev/tools/northflank-pricing-2026)

**VPS**: [DigitalOcean Pricing](https://www.digitalocean.com/pricing/droplets) · [Hetzner Cloud Locations](https://docs.hetzner.com/cloud/general/locations/) · [Vultr — São Paulo](https://blogs.vultr.com/ol-brasil-vultrs-20th-cloud-location-is-in-so-paulo) · [Akamai Cloud Pricing](https://www.akamai.com/cloud/pricing) · [Contabo Pricing](https://cybernews.com/best-web-hosting/contabo-review/pricing/) · [AWS Lightsail novas regiões](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-lightsail-aws-regions/) · [WonderNetwork — latências medidas](https://wondernetwork.com/pings/Sao%20Paulo)

**E-mail**: [Hostinger Business Email](https://www.hostinger.com/business-email) · [Google Workspace Pricing](https://workspace.google.com/pricing) · [Zoho Mail Pricing](https://www.zoho.com/mail/zohomail-pricing.html) · [Amazon SES Pricing](https://www.saaspricepulse.com/blog/amazon-ses-pricing-per-1000-emails-2026) · [Resend Pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing) · [SendGrid Pricing](https://www.vendr.com/marketplace/twilio-sendgrid) · [Mailgun Pricing](https://costbench.com/software/email-api/mailgun/) · [Postmark Pricing](https://checkthat.ai/brands/postmark/pricing) · [Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace) · [Gmail SMTP Relay](https://knowledge.workspace.google.com/admin/gmail/advanced/route-outgoing-smtp-relay-messages-through-google) · [Zoho Mail rates/limits](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html) · [Hostinger Email limits](https://www.hostinger.com/support/4625828-parameters-and-limits-of-hostinger-email/) · [Titan Email limits](https://www.hostinger.com/support/5326155-parameters-and-limits-of-titan-email-at-hostinger/)

---

## 5. Blob / object storage

Comparativo levantado pra decidir onde guardar o comprovante de pagamento (`payment_receipts`, upload via signed URL — `CLAUDE.md` §5).

| Provedor | Free tier | Preço storage | Egress (download) | Região perto do Peru | Observação |
| --- | --- | --- | --- | --- | --- |
| **Tigris (Fly.io)** | 5GB + 10k Class A + 100k Class B/mês | US$0,02/GB-mês | **US$0 sempre** | Distribuído globalmente (edge), nativo do Fly.io | S3-compatible, `fly storage create`, mesma fatura do compute |
| **Cloudflare R2** | 10GB + 1M Class A + 10M Class B/mês | US$0,015/GB-mês | **US$0 sempre** | Edge global da Cloudflare (PoP em SP) | S3-compatible. Cotado pra comprovante e backup, não escolhido — ver `docs/ARCHITECTURE.md` §5.4 (Tigris venceu por integração com o compute) |
| **AWS S3** (sa-east-1) | 5GB/12 meses (free tier padrão) | ~US$0,040/GB-mês (SP ~75% mais caro que us-east-1) | ~US$0,11/GB | **Sim — região nativa** | IAM, Object Lock (WORM), versionamento, CloudTrail — mais maduro em compliance |
| **Google Cloud Storage** (southamerica-east1) | Só crédito trial | ~US$0,023–0,026/GB-mês | ~US$0,12/GB | **Sim — região nativa** | Integração IAM/BigQuery |
| **Backblaze B2** | 10GB grátis | US$6/TB (~US$0,006/GB-mês) | Grátis só via parceiro CDN (Cloudflare/Bunny) até 3x o armazenado; senão US$0,01/GB | Não — só US/EU | Mais barato por GB armazenado, mas sem região LatAm |
| **Wasabi** | Não | ~US$6,99/TB (~US$0,0069/GB-mês) | US$0 | Não — só US/EU/AP | Duração mínima de armazenamento de 90 dias (billing, não bloqueia exclusão) |
| **DigitalOcean Spaces** | Não | US$5/mês flat (250GB + 1TB transfer incluso) | US$0,01/GB acima do incluso | Não — mais perto é Toronto (TOR1) | Regiões confirmadas: NYC3, AMS3, LON1, SGP1, SFO2/3, TOR1, FRA1, BLR1, SYD1 |

### Fontes (Blob storage, 24/08/2026)

[5 Cheap S3-Compatible Storage Providers 2026](https://sliplane.io/blog/cheap-s3-compatible-storage-providers) · [Object Storage Comparison 2026 — Mixpeek](https://mixpeek.com/blog/object-storage-comparison-2026) · [S3 Pricing Comparison 2026 — Infratally](https://infratally.com/articles/s3-alternatives-object-storage/) · [AWS S3 vs R2 vs Spaces vs Wasabi vs B2 — Nubbo](https://nubbo.app/blog/s3-vs-r2-vs-spaces-vs-wasabi-vs-backblaze-b2/) · [Cloudflare R2 Pricing Explained 2026](https://mecanik.dev/en/posts/cloudflare-r2-pricing-explained-real-costs-vs-s3-and-backblaze/) · [R2 Pricing — EgressCost.com](https://egresscost.com/cloudflare/) · [Tigris Pricing](https://www.tigrisdata.com/pricing/) · [Fly.io ❤️ Tigris](https://fly.io/hello/tigris/) · [Tigris Global Object Storage — Fly Docs](https://fly.io/docs/tigris/) · [Switching from S3 to Tigris on Fly.io](https://benhoyt.com/writings/flyio-and-tigris/) · [DigitalOcean Regional Availability 2026](https://www.digitalocean.com/community/conceptual-articles/regional-availability) · [Spaces Availability — DigitalOcean Docs](https://docs.digitalocean.com/products/spaces/details/availability/)

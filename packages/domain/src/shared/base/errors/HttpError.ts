export interface HttpErrorParams {
  status?: number;
  reason: string;
  message: string;
  path?: string;
  cause?: unknown;
}

/**
 * `status` é a única noção de HTTP dentro de @ooc/domain — exceção
 * deliberada à regra "domínio nunca importa framework/infra"
 * (CLAUDE.md §5), pra reaproveitar o mesmo vocabulário de erro entre
 * apps/api e qualquer bounded context futuro, em vez de duplicar essa
 * classe em cada consumidor. `reason` é a chave estável (candidata a
 * i18n em apps/app) — `message` é só para log/Swagger, nunca vai na
 * resposta HTTP pública (CLAUDE.md §4).
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly reason: string;
  public readonly path?: string;

  constructor(params: HttpErrorParams) {
    super(params.message, { cause: params.cause });
    this.name = new.target.name;
    this.status = params.status ?? 500;
    this.reason = params.reason;
    this.path = params.path;
  }
}

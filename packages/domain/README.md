# @ooc/domain

Domínio DDD puro: entidades, regras de negócio e casos de uso. **Sem
Fastify, sem provedor de banco, sem Redis** — não importa nada de `apps/api`
nem de `packages/queue`. Quem depende deste pacote é `apps/api` (e, no
futuro, possivelmente `apps/app`).

Esboço baseado no template `Psykka/template-ddd`, adaptado para viver num
pacote separado (o template original é um único app Fastify). Vai mudar
quando o próximo ajuste do template chegar.

## Estrutura

```
src/
  shared/base/
    BaseModel.ts        # entidade com id
    BaseUseCase.ts       # abstract run(input): Promise<output> — equivalente ao "BaseService" do template
    IBaseRepository.ts   # contrato CRUD que a infraestrutura implementa
  example/                # contexto de exemplo — apagar quando o 1º contexto real (enrollment, payment...) entrar
    Example.ts             # entidade
    ExampleRepository.ts    # só a interface (porta). Implementação concreta mora em apps/api/src/infra
    CreateExampleUseCase.ts  # caso de uso
  index.ts                   # barrel
```

Cada bounded context ganha sua própria pasta (entidade + porta de
repositório + usecases juntos), em vez de pastas genéricas por tipo de
arquivo (`entities/`, `value-objects/`...) — é o agrupamento que o template
usa.

## Regra

O pacote de domínio nunca implementa acesso a banco, fila ou HTTP — só
define a **interface** (porta) que a infraestrutura (`apps/api`) precisa
implementar.

import { Example, type IExampleRepository } from "@ooc/domain";

/**
 * Stub deliberado — guarda em memória enquanto não decidimos se o acesso a
 * dados do apps/api usa @supabase/supabase-js (como o apps/app) ou Drizzle
 * direto na connection string do Supabase. Trocar por uma implementação real
 * não muda o usecase nem a rota, só o que entra no container.
 */
export class InMemoryExampleRepository implements IExampleRepository {
  private readonly items = new Map<string, Example>();

  async create(item: Example): Promise<Example> {
    this.items.set(item.id, item);
    return item;
  }

  async findById(id: string): Promise<Example | null> {
    return this.items.get(id) ?? null;
  }

  async paginate(page: number, limit: number): Promise<Example[]> {
    const start = (page - 1) * limit;
    return Array.from(this.items.values()).slice(start, start + limit);
  }

  async update(id: string, item: Partial<Example>): Promise<Example | null> {
    const existing = this.items.get(id);

    if (!existing) {
      return null;
    }

    Object.assign(existing, item);
    return existing;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

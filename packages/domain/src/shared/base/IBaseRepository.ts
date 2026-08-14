import type { BaseModel } from "./BaseModel.js";

export interface IBaseRepository<T extends BaseModel> {
  create(item: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  paginate(page: number, limit: number): Promise<T[]>;
  update(id: string, item: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

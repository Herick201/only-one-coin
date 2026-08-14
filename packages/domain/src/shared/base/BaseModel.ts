export abstract class BaseModel {
  public readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
}

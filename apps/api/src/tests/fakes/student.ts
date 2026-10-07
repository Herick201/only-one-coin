import type { Guardian, IGuardianRepository, IStudentRepository, NationalIdType, Student } from "@ooc/domain";

/** A detached copy, the way a row read back from the database would be —
 * the usecase mutating its entity must not rewrite the "table" behind it. */
function copy<T extends object>(entity: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(entity) as object) as T, entity);
}

/**
 * In-memory stand-ins for the student ports, shared by every student usecase
 * test so a port change breaks one fake, not several copies of it.
 */
export class FakeStudentRepository implements IStudentRepository {
  public readonly rows = new Map<string, Student>();
  public readonly created: Student[] = [];
  public readonly updated: Student[] = [];

  constructor(...onFile: Student[]) {
    for (const student of onFile) this.rows.set(student.id, copy(student));
  }

  async create(student: Student): Promise<Student> {
    this.rows.set(student.id, copy(student));
    this.created.push(student);
    return student;
  }

  async findById(id: string): Promise<Student | null> {
    const row = this.rows.get(id);
    return row ? copy(row) : null;
  }

  async findByNationalId(params: { nationalIdType: NationalIdType; nationalId: string }): Promise<Student | null> {
    for (const student of this.rows.values()) {
      if (student.nationalIdType === params.nationalIdType && student.nationalId === params.nationalId) {
        return copy(student);
      }
    }
    return null;
  }

  async update(student: Student): Promise<Student> {
    this.rows.set(student.id, copy(student));
    this.updated.push(student);
    return student;
  }
}

export class FakeGuardianRepository implements IGuardianRepository {
  public readonly rows = new Map<string, Guardian>();
  public readonly created: Guardian[] = [];
  public readonly updated: Guardian[] = [];

  constructor(...onFile: Guardian[]) {
    for (const guardian of onFile) this.rows.set(guardian.studentId, copy(guardian));
  }

  async create(guardian: Guardian): Promise<Guardian> {
    this.rows.set(guardian.studentId, copy(guardian));
    this.created.push(guardian);
    return guardian;
  }

  async findByStudentId(studentId: string): Promise<Guardian | null> {
    const row = this.rows.get(studentId);
    return row ? copy(row) : null;
  }

  async update(guardian: Guardian): Promise<Guardian> {
    this.rows.set(guardian.studentId, copy(guardian));
    this.updated.push(guardian);
    return guardian;
  }
}

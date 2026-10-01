import type {
  AuditLogEntry,
  Course,
  IAuditLogRepository,
  ICourseRepository,
  IPlanRepository,
  Plan,
  PlanPrice,
} from "@ooc/domain";

/**
 * In-memory stand-ins for the catalog ports. Shared by every catalog usecase
 * test so a port change breaks one fake, not five copies of it.
 */
export class FakeAuditLogRepository implements IAuditLogRepository {
  public readonly appended: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.appended.push(entry);
  }
}

export class FakeCourseRepository implements ICourseRepository {
  public readonly rows = new Map<string, Course>();

  async create(course: Course): Promise<Course> {
    this.rows.set(course.id, course);
    return course;
  }

  async findById(id: string): Promise<Course | null> {
    return this.rows.get(id) ?? null;
  }

  async update(course: Course): Promise<Course> {
    this.rows.set(course.id, course);
    return course;
  }
}

export class FakePlanRepository implements IPlanRepository {
  public readonly plans = new Map<string, Plan>();
  public readonly prices: PlanPrice[] = [];

  async createWithPrice(plan: Plan, price: PlanPrice): Promise<void> {
    this.plans.set(plan.id, plan);
    this.prices.push(price);
  }

  async findById(id: string): Promise<Plan | null> {
    return this.plans.get(id) ?? null;
  }

  async rename(plan: Plan): Promise<void> {
    this.plans.set(plan.id, plan);
  }

  async addPrice(price: PlanPrice): Promise<void> {
    this.prices.push(price);
  }
}

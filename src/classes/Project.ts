import { v4 as uuidv4 } from "uuid";

export type ProjectStatus = "pending" | "active" | "finished";
export type UserRole = "architect" | "engineer" | "developer";

export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";

export interface ITodo {
  id: string;
  title: string;
  status: TodoStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface IProject {
  id?: string;
  name: string;
  description: string;
  status: ProjectStatus;
  userRole: UserRole;
  finishDate?: Date | string | null;

  // Extra fields (optional but supported)
  cost?: number;
  progress?: number;

  // UI extras to keep stable between sessions
  iconBg?: string;

  // Stored ToDos
  todos?: ITodo[];
}

type UpdateProjectData = Partial<
  Omit<IProject, "finishDate" | "todos"> & { finishDate?: Date | string | null }
>;

export class Project {
  // Domain
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  userRole: UserRole;
  finishDate: Date;

  cost: number;
  progress: number;

  // ToDos
  todos: ITodo[] = [];

  // UI-related stable properties
  iconBg: string;

  // UI element (card)
  ui: HTMLDivElement;

  // Palette for random icon backgrounds (5-6 colors)
  static readonly ICON_COLORS: string[] = [
    "#ca8134",
    "#2E86AB",
    "#6C5CE7",
    "#16A085",
    "#C0392B",
    "#7F8C8D",
  ];

  constructor(data: IProject) {
    // Required fields
    this.id = data.id ?? uuidv4();
    this.name = (data.name ?? "").trim();
    this.description = (data.description ?? "").trim();
    this.status = data.status;
    this.userRole = data.userRole;

    // Date normalization: allow Date | ISO string | null/undefined
    this.finishDate = Project.normalizeDate(data.finishDate);

    // Optional numeric fields
    this.cost = typeof data.cost === "number" ? data.cost : 0;
    this.progress = typeof data.progress === "number" ? data.progress : 0;

    // Stable random color (if importing, preserve)
    this.iconBg =
      data.iconBg ??
      Project.ICON_COLORS[Math.floor(Math.random() * Project.ICON_COLORS.length)];

    // ToDos import (if any)
    if (Array.isArray(data.todos)) {
      this.todos = data.todos.map((t) => Project.normalizeTodo(t));
    }

    // Create UI card (kept for your current UI-driven prototype)
    this.ui = this.createCardUI();
    this.syncCardUI();
  }

  // ---------- Public API (used by ProjectsManager / index.ts) ----------

  /** Updates domain fields and refreshes UI card */
  update(data: UpdateProjectData) {
    if (typeof data.name === "string") this.name = data.name.trim();
    if (typeof data.description === "string")
      this.description = data.description.trim();
    if (data.status) this.status = data.status;
    if (data.userRole) this.userRole = data.userRole;
    if ("finishDate" in data) this.finishDate = Project.normalizeDate(data.finishDate);

    if (typeof data.cost === "number") this.cost = data.cost;
    if (typeof data.progress === "number") this.progress = data.progress;

    if (typeof data.iconBg === "string" && data.iconBg.trim()) {
      this.iconBg = data.iconBg.trim();
    }

    this.syncCardUI();
  }

  /** Adds a ToDo to this project */
  addTodo(title: string, status: TodoStatus = "pending"): ITodo {
    const now = new Date().toISOString();
    const todo: ITodo = {
      id: uuidv4(),
      title: title.trim(),
      status,
      createdAt: now,
      updatedAt: now,
    };
    this.todos.push(todo);
    return todo;
  }

  /** Updates a ToDo by id */
  updateTodo(id: string, data: Partial<Pick<ITodo, "title" | "status">>): ITodo | undefined {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    if (typeof data.title === "string") todo.title = data.title.trim();
    if (data.status) todo.status = data.status;
    todo.updatedAt = new Date().toISOString();
    return todo;
  }

  /** Deletes a ToDo by id */
  deleteTodo(id: string) {
    this.todos = this.todos.filter((t) => t.id !== id);
  }

  /** Serialization for export (includes todos) */
  toJSON(): IProject {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      userRole: this.userRole,
      finishDate: this.finishDate.toISOString(),
      cost: this.cost,
      progress: this.progress,
      iconBg: this.iconBg,
      todos: this.todos.map((t) => ({ ...t })),
    };
  }

  // ---------- UI (Project Card) ----------

  private createCardUI(): HTMLDivElement {
    const card = document.createElement("div");
    card.className = "project-card";

    // Pass per-card random color via CSS variable
    card.style.setProperty("--project-icon-bg", this.iconBg);

    card.innerHTML = `
      <div class="card-header">
        <div class="project-icon" data-project-icon></div>
        <div class="project-main">
          <h5 data-project-name></h5>
          <p data-project-description></p>
        </div>
      </div>

      <div class="card-content">
        <div class="card-property">
          <p class="muted">Status</p>
          <p data-project-status></p>
        </div>
        <div class="card-property">
          <p class="muted">Role</p>
          <p data-project-role></p>
        </div>
        <div class="card-property">
          <p class="muted">Cost</p>
          <p data-project-cost></p>
        </div>
        <div class="card-property">
          <p class="muted">Estimated Progress</p>
          <p data-project-progress></p>
        </div>
      </div>
    `;
    return card;
  }

  /** Refreshes card fields (call after update/import/etc.) */
  syncCardUI() {
    // keep bg stable if changed
    this.ui.style.setProperty("--project-icon-bg", this.iconBg);

    const icon = this.ui.querySelector("[data-project-icon]") as HTMLElement | null;
    const name = this.ui.querySelector("[data-project-name]") as HTMLElement | null;
    const desc = this.ui.querySelector("[data-project-description]") as HTMLElement | null;
    const status = this.ui.querySelector("[data-project-status]") as HTMLElement | null;
    const role = this.ui.querySelector("[data-project-role]") as HTMLElement | null;
    const cost = this.ui.querySelector("[data-project-cost]") as HTMLElement | null;
    const prog = this.ui.querySelector("[data-project-progress]") as HTMLElement | null;

    // IMPORTANT: uppercase must be done by CSS rule (text-transform),
    // so here we set raw initials without forcing uppercase in JS.
    if (icon) icon.textContent = Project.getProjectInitials(this.name);

    if (name) name.textContent = this.name;
    if (desc) desc.textContent = this.description;

    if (status) status.textContent = this.status;
    if (role) role.textContent = this.userRole;

    if (cost) cost.textContent = `$${this.cost}`;
    if (prog) prog.textContent = `${Math.round(this.progress * 100)}%`;
  }

  // ---------- Helpers ----------

  /** Prefer first letter of first 2 words (Hospital Center => HC). If single word, take first 2 chars. */
  static getProjectInitials(projectName: string): string {
    const cleaned = (projectName ?? "").trim();
    if (!cleaned) return "--";

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const a = words[0].charAt(0) || "-";
      const b = words[1].charAt(0) || "-";
      return `${a}${b}`;
    }
    // Single word => first 2 letters
    return cleaned.substring(0, 2);
  }

  static normalizeDate(value: Date | string | null | undefined): Date {
    if (!value) return new Date(); // default date if not specified
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  }

  static normalizeTodo(t: Partial<ITodo>): ITodo {
    const now = new Date().toISOString();
    const status = (t.status as TodoStatus) ?? "pending";

    return {
      id: typeof t.id === "string" && t.id.trim() ? t.id : uuidv4(),
      title: typeof t.title === "string" ? t.title.trim() : "",
      status,
      createdAt: typeof t.createdAt === "string" ? t.createdAt : now,
      updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : now,
    };
  }
}

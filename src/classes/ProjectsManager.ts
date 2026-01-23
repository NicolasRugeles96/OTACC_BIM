import { IProject, ITodo, Project, TodoStatus } from "./Project";

type DetailsEls = {
  root: HTMLElement;
  // Project text nodes
  nameTitle: HTMLElement | null; // [data-project-info="name"]
  descriptionText: HTMLElement | null; // [data-project-info="description"] (si existe)
  // Optional fields in details (si existen los data-attrs)
  statusText: HTMLElement | null; // [data-project-info="status"]
  roleText: HTMLElement | null; // [data-project-info="role"]
  costText: HTMLElement | null; // [data-project-info="cost"]
  finishDateText: HTMLElement | null; // [data-project-info="finishDate"]
  progressText: HTMLElement | null; // [data-project-info="progress"]

  // Edit UI
  editBtn: HTMLElement | null; // button#edit-project-btn (lo añadiremos si no existe)
  editModal: HTMLDialogElement | null; // dialog#edit-project-modal (lo añadiremos si no existe)
  editForm: HTMLFormElement | null; // form#edit-project-form (lo añadiremos si no existe)

  // Todos UI
  todosContainer: HTMLElement | null; // #todos-list (lo añadiremos si no existe)
  addTodoBtn: HTMLElement | null; // #add-todo-btn (ya tienes un icon add en ToDo header; lo hookearemos)
  todoModal: HTMLDialogElement | null; // dialog#todo-modal (lo añadiremos)
  todoForm: HTMLFormElement | null; // form#todo-form (lo añadiremos)
};

export class ProjectsManager {
  list: Project[] = [];
  ui: HTMLElement;

  // Active project (details page)
  activeProjectId: string | null = null;

  constructor(container: HTMLElement) {
    this.ui = container;

    // Default project (prototipo)
    this.newProject({
      name: "Default Project",
      description: "This is just a default app project",
      status: "pending",
      userRole: "architect",
      finishDate: new Date(),
    });

    // Hook details page controls (edit + todos). Safe even if elements don't exist yet.
    this.bindDetailsPage();
  }

  // ----------------- CRUD Projects -----------------

  newProject(data: IProject) {
    // Validation: name length >= 5
    const normalizedName = (data.name ?? "").trim();
    if (normalizedName.length < 5) {
      throw new Error("Project name must be at least 5 characters long.");
    }

    // Unique by name (case-insensitive) for creation
    const nameInUse = this.list.some(
      (p) => p.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (nameInUse) {
      throw new Error(`A project with the name "${normalizedName}" already exists`);
    }

    // Create
    const project = new Project({ ...data, name: normalizedName });

    // Card click => open details
    project.ui.addEventListener("click", () => {
      this.openDetails(project.id);
    });

    // Render card
    this.ui.append(project.ui);
    this.list.push(project);

    return project;
  }

  getProject(id: string) {
    return this.list.find((p) => p.id === id);
  }

  /** Find project by name (case-insensitive) */
  getProjectByName(name: string) {
    const n = (name ?? "").trim().toLowerCase();
    return this.list.find((p) => p.name.trim().toLowerCase() === n);
  }

  deleteProject(id: string) {
    const project = this.getProject(id);
    if (!project) return;
    project.ui.remove();
    this.list = this.list.filter((p) => p.id !== id);

    if (this.activeProjectId === id) {
      this.activeProjectId = null;
    }
  }

  /** Update an existing project in-place and refresh card + details if active */
  updateProject(id: string, data: Partial<IProject>) {
    const project = this.getProject(id);
    if (!project) return;

    // If name is being changed, validate length and uniqueness
    if (typeof data.name === "string") {
      const newName = data.name.trim();
      if (newName.length < 5) {
        throw new Error("Project name must be at least 5 characters long.");
      }
      const nameInUse = this.list.some(
        (p) =>
          p.id !== project.id &&
          p.name.trim().toLowerCase() === newName.toLowerCase()
      );
      if (nameInUse) {
        throw new Error(`A project with the name "${newName}" already exists`);
      }
    }

    project.update(data);

    // If active, refresh details UI
    if (this.activeProjectId === project.id) {
      this.renderDetails(project);
      this.renderTodos(project);
    }
  }

  // ----------------- Details Page -----------------

  openDetails(projectId: string) {
    const project = this.getProject(projectId);
    if (!project) return;

    const projectsPage = document.getElementById("projects-page");
    const detailsPage = document.getElementById("project-details");
    if (!(projectsPage && detailsPage)) return;

    projectsPage.style.display = "none";
    detailsPage.style.display = "flex";

    this.activeProjectId = project.id;
    this.renderDetails(project);
    this.renderTodos(project);
  }

  private renderDetails(project: Project) {
    const els = this.getDetailsElements();
    if (!els) return;

    // Generic fields
    if (els.nameTitle) els.nameTitle.textContent = project.name;
    if (els.descriptionText) els.descriptionText.textContent = project.description;

    // Optional nodes if you add them later
    if (els.statusText) els.statusText.textContent = project.status;
    if (els.roleText) els.roleText.textContent = project.userRole;
    if (els.costText) els.costText.textContent = `$${project.cost}`;
    if (els.finishDateText)
      els.finishDateText.textContent = project.finishDate
        ? project.finishDate.toISOString().slice(0, 10)
        : "";
    if (els.progressText)
      els.progressText.textContent = `${Math.round(project.progress * 100)}%`;
  }

  // ----------------- ToDos -----------------

  /** Adds a todo to active project and re-renders list */
  addTodoToActiveProject(title: string, status: TodoStatus) {
    const project = this.getActiveProject();
    if (!project) return;

    if (!title.trim()) {
      throw new Error("ToDo title cannot be empty.");
    }

    project.addTodo(title, status);
    this.renderTodos(project);
  }

  updateTodoInActiveProject(todoId: string, data: Partial<Pick<ITodo, "title" | "status">>) {
    const project = this.getActiveProject();
    if (!project) return;

    const updated = project.updateTodo(todoId, data);
    if (!updated) return;
    this.renderTodos(project);
  }

  private renderTodos(project: Project) {
    const els = this.getDetailsElements();
    if (!els || !els.todosContainer) return;

    els.todosContainer.innerHTML = "";

    if (!project.todos.length) {
      const empty = document.createElement("div");
      empty.className = "todo-empty";
      empty.textContent = "No ToDos yet.";
      els.todosContainer.append(empty);
      return;
    }

    for (const todo of project.todos) {
      const item = document.createElement("div");
      item.className = "todo-item";
      item.dataset.todoId = todo.id;
      item.dataset.todoStatus = todo.status;

      // Visual status via CSS classes (we set a class to drive bg color)
      item.classList.add(`todo-${todo.status}`);

      item.innerHTML = `
        <div class="todo-row">
          <div class="todo-left">
            <span class="material-icons-round todo-icon">checklist</span>
            <p class="todo-title"></p>
          </div>
          <div class="todo-right">
            <select class="todo-status-select" aria-label="ToDo status">
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
            <span class="material-icons-round todo-edit" title="Edit">edit</span>
          </div>
        </div>
      `;

      const titleEl = item.querySelector(".todo-title") as HTMLElement | null;
      if (titleEl) titleEl.textContent = todo.title;

      const select = item.querySelector(".todo-status-select") as HTMLSelectElement | null;
      if (select) {
        select.value = todo.status;
        select.addEventListener("change", () => {
          const value = select.value as TodoStatus;
          this.updateTodoInActiveProject(todo.id, { status: value });
        });
      }

      const editBtn = item.querySelector(".todo-edit") as HTMLElement | null;
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          // open todo modal in edit mode
          this.openTodoModal({ mode: "edit", todo });
        });
      }

      els.todosContainer.append(item);
    }
  }

  private getActiveProject(): Project | undefined {
    if (!this.activeProjectId) return;
    return this.getProject(this.activeProjectId);
  }

  // ----------------- Export / Import -----------------

  exportToJSON(fileName: string = "projects") {
    // Use Project.toJSON to avoid serializing DOM & methods
    const payload = this.list.map((p) => p.toJSON());
    const json = JSON.stringify(payload, null, 2);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFromJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      const json = reader.result;
      if (!json) return;

      let projects: IProject[] = [];
      try {
        projects = JSON.parse(json as string) as IProject[];
      } catch (e) {
        alert("Invalid JSON file.");
        return;
      }

      for (const incoming of projects) {
        // Merge logic:
        // 1) If has id and exists => update
        // 2) Else if name exists => update
        // 3) Else create new
        const incomingName = (incoming.name ?? "").trim();

        const existingById =
          typeof incoming.id === "string" ? this.getProject(incoming.id) : undefined;
        const existingByName = incomingName ? this.getProjectByName(incomingName) : undefined;

        const existing = existingById ?? existingByName;

        if (existing) {
          // Update existing project in place
          existing.update({
            name: incomingName || existing.name,
            description: incoming.description ?? existing.description,
            status: (incoming.status as any) ?? existing.status,
            userRole: (incoming.userRole as any) ?? existing.userRole,
            finishDate: incoming.finishDate ?? existing.finishDate,
            cost: typeof incoming.cost === "number" ? incoming.cost : existing.cost,
            progress:
              typeof incoming.progress === "number" ? incoming.progress : existing.progress,
            iconBg: incoming.iconBg ?? existing.iconBg,
          });

          // Merge todos (replace by id, add missing)
          if (Array.isArray(incoming.todos)) {
            // Replace full list for simplicity & determinism
            existing.todos = incoming.todos.map((t) => ({ ...t })) as any;
          }

          // Refresh UI card
          existing.syncCardUI();

          // If it is active, refresh details
          if (this.activeProjectId === existing.id) {
            this.renderDetails(existing);
            this.renderTodos(existing);
          }
          continue;
        }

        // If it's new: validate name (same rule)
        if (incomingName.length < 5) {
          // skip invalid imports silently (or alert)
          continue;
        }

        // Create new project card
        const created = new Project({
          ...incoming,
          name: incomingName,
        });

        created.ui.addEventListener("click", () => {
          this.openDetails(created.id);
        });

        this.ui.append(created.ui);
        this.list.push(created);
      }
    });

    input.addEventListener("change", () => {
      const filesList = input.files;
      if (!filesList || !filesList[0]) return;
      reader.readAsText(filesList[0]);
    });

    input.click();
  }

  // ----------------- Details bindings (Edit Project + Todo Modal) -----------------

  private bindDetailsPage() {
    // Edit project button + modal + form
    const els = this.getDetailsElements();
    if (!els) return;

    // Bind edit button if exists
    if (els.editBtn) {
      els.editBtn.addEventListener("click", () => {
        const project = this.getActiveProject();
        if (!project) return;
        this.openEditModal(project);
      });
    }

    // Bind edit form submit
    if (els.editForm) {
      els.editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const project = this.getActiveProject();
        if (!project) return;

        const formData = new FormData(els.editForm!);

        const name = String(formData.get("name") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim();
        const status = String(formData.get("status") ?? project.status) as any;
        const userRole = String(formData.get("userRole") ?? project.userRole) as any;
        const finishDateRaw = formData.get("finishDate");
        const finishDate =
          finishDateRaw && String(finishDateRaw).trim()
            ? new Date(String(finishDateRaw))
            : new Date(); // default if not specified

        try {
          this.updateProject(project.id, {
            name,
            description,
            status,
            userRole,
            finishDate,
          });
          els.editModal?.close();
        } catch (err) {
          alert(String(err));
        }
      });
    }

    // Add ToDo button
    if (els.addTodoBtn) {
      els.addTodoBtn.addEventListener("click", () => {
        this.openTodoModal({ mode: "create" });
      });
    }

    // Todo form submit (create / edit)
    if (els.todoForm) {
      els.todoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const project = this.getActiveProject();
        if (!project) return;

        const form = els.todoForm!;
        const formData = new FormData(form);
        const title = String(formData.get("title") ?? "").trim();
        const status = String(formData.get("status") ?? "pending") as TodoStatus;
        const todoId = String(formData.get("todoId") ?? "").trim(); // hidden field

        try {
          if (todoId) {
            this.updateTodoInActiveProject(todoId, { title, status });
          } else {
            this.addTodoToActiveProject(title, status);
          }
          form.reset();
          els.todoModal?.close();
        } catch (err) {
          alert(String(err));
        }
      });
    }
  }

  private openEditModal(project: Project) {
    const els = this.getDetailsElements();
    if (!els || !els.editModal || !els.editForm) return;

    // Prefill
    const form = els.editForm;
    (form.querySelector("[name='name']") as HTMLInputElement | null)?.setAttribute(
      "value",
      project.name
    );
    const nameInput = form.querySelector("[name='name']") as HTMLInputElement | null;
    if (nameInput) nameInput.value = project.name;

    const descInput = form.querySelector("[name='description']") as HTMLTextAreaElement | null;
    if (descInput) descInput.value = project.description;

    const statusSelect = form.querySelector("[name='status']") as HTMLSelectElement | null;
    if (statusSelect) statusSelect.value = project.status;

    const roleSelect = form.querySelector("[name='userRole']") as HTMLSelectElement | null;
    if (roleSelect) roleSelect.value = project.userRole;

    const dateInput = form.querySelector("[name='finishDate']") as HTMLInputElement | null;
    if (dateInput) dateInput.value = project.finishDate.toISOString().slice(0, 10);

    els.editModal.showModal();
  }

  private openTodoModal(opts: { mode: "create" } | { mode: "edit"; todo: ITodo }) {
    const els = this.getDetailsElements();
    if (!els || !els.todoModal || !els.todoForm) return;

    const form = els.todoForm;

    const todoIdInput = form.querySelector("[name='todoId']") as HTMLInputElement | null;
    const titleInput = form.querySelector("[name='title']") as HTMLInputElement | null;
    const statusSelect = form.querySelector("[name='status']") as HTMLSelectElement | null;

    if (opts.mode === "create") {
      if (todoIdInput) todoIdInput.value = "";
      if (titleInput) titleInput.value = "";
      if (statusSelect) statusSelect.value = "pending";
    } else {
      if (todoIdInput) todoIdInput.value = opts.todo.id;
      if (titleInput) titleInput.value = opts.todo.title;
      if (statusSelect) statusSelect.value = opts.todo.status;
    }

    els.todoModal.showModal();
  }

  // ----------------- DOM helpers -----------------

  private getDetailsElements(): DetailsEls | null {
    const root = document.getElementById("project-details");
    if (!root) return null;

    const nameTitle = root.querySelector("[data-project-info='name']") as HTMLElement | null;
    const descriptionText = root.querySelector(
      "[data-project-info='description']"
    ) as HTMLElement | null;

    const statusText = root.querySelector(
      "[data-project-info='status']"
    ) as HTMLElement | null;
    const roleText = root.querySelector("[data-project-info='role']") as HTMLElement | null;
    const costText = root.querySelector("[data-project-info='cost']") as HTMLElement | null;
    const finishDateText = root.querySelector(
      "[data-project-info='finishDate']"
    ) as HTMLElement | null;
    const progressText = root.querySelector(
      "[data-project-info='progress']"
    ) as HTMLElement | null;

    const editBtn = document.getElementById("edit-project-btn") as HTMLElement | null;
    const editModal = document.getElementById("edit-project-modal") as HTMLDialogElement | null;
    const editForm = document.getElementById("edit-project-form") as HTMLFormElement | null;

    const todosContainer = document.getElementById("todos-list") as HTMLElement | null;
    const addTodoBtn = document.getElementById("add-todo-btn") as HTMLElement | null;

    const todoModal = document.getElementById("todo-modal") as HTMLDialogElement | null;
    const todoForm = document.getElementById("todo-form") as HTMLFormElement | null;

    return {
      root,
      nameTitle,
      descriptionText,
      statusText,
      roleText,
      costText,
      finishDateText,
      progressText,
      editBtn,
      editModal,
      editForm,
      todosContainer,
      addTodoBtn,
      todoModal,
      todoForm,
    };
  }
}

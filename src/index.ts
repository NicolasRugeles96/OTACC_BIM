import { IProject, ProjectStatus, UserRole } from "./classes/Project";
import { ProjectsManager } from "./classes/ProjectsManager";

function showModal(id: string) {
  const modal = document.getElementById(id);
  if (modal && modal instanceof HTMLDialogElement) {
    modal.showModal();
  } else {
    console.warn("The provided modal wasn't found. ID: ", id);
  }
}

function closeModal(id: string) {
  const modal = document.getElementById(id);
  if (modal && modal instanceof HTMLDialogElement) {
    modal.close();
  } else {
    console.warn("The provided modal wasn't found. ID: ", id);
  }
}

/** Normalize strings coming from <select> options */
function normalizeRole(value: unknown): UserRole {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "architect") return "architect";
  if (v === "engineer") return "engineer";
  if (v === "developer") return "developer";
  return "architect";
}

function normalizeStatus(value: unknown): ProjectStatus {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "pending") return "pending";
  if (v === "active") return "active";
  if (v === "finished") return "finished";
  if (v.includes("pend")) return "pending";
  if (v.includes("acti")) return "active";
  if (v.includes("fin")) return "finished";
  return "pending";
}

function normalizeFinishDate(value: unknown): Date {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date(); // default if not specified
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

// ---------------- App bootstrap ----------------

const projectsListUI = document.getElementById("projects-list") as HTMLElement | null;
if (!projectsListUI) {
  throw new Error("projects-list container was not found. Check index.html id='projects-list'.");
}

const projectsManager = new ProjectsManager(projectsListUI);

// ---------------- Sidebar navigation ----------------

// ✅ Click on sidebar "Projects" returns to initial UI (projects list)
const navProjects = document.getElementById("nav-projects");
if (navProjects) {
  navProjects.addEventListener("click", () => {
    const projectsPage = document.getElementById("projects-page");
    const detailsPage = document.getElementById("project-details");
    if (!(projectsPage && detailsPage)) return;

    detailsPage.style.display = "none";
    projectsPage.style.display = "flex";
  });
}

// Optional: placeholder for Users
const navUsers = document.getElementById("nav-users");
if (navUsers) {
  navUsers.addEventListener("click", () => {
    // For now: do nothing or show a message
    // alert("Users page not implemented yet.");
  });
}

// ---------------- New Project modal ----------------

const newProjectBtn = document.getElementById("new-project-btn");
if (newProjectBtn) {
  newProjectBtn.addEventListener("click", () => showModal("new-project-modal"));
} else {
  console.warn("New projects button was not found");
}

const cancelNewProjectBtn = document.getElementById("cancel-new-project-btn");
if (cancelNewProjectBtn) {
  cancelNewProjectBtn.addEventListener("click", () => closeModal("new-project-modal"));
}

// Form submit
const projectForm = document.getElementById("new-project-form");
if (projectForm && projectForm instanceof HTMLFormElement) {
  projectForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(projectForm);

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    // ✅ Simple validation requested
    if (name.length < 5) {
      alert("Project name must be at least 5 characters long.");
      return;
    }

    const status = normalizeStatus(formData.get("status"));
    const userRole = normalizeRole(formData.get("userRole"));
    const finishDate = normalizeFinishDate(formData.get("finishDate"));

    const projectData: IProject = {
      name,
      description,
      status,
      userRole,
      finishDate,
    };

    try {
      const project = projectsManager.newProject(projectData);
      console.log("Created project:", project);

      projectForm.reset();
      closeModal("new-project-modal");
    } catch (err) {
      alert(String(err));
    }
  });
} else {
  console.warn("The project form was not found. Check the ID!");
}

// ---------------- Export / Import ----------------

const exportProjectsBtn = document.getElementById("export-projects-btn");
if (exportProjectsBtn) {
  exportProjectsBtn.addEventListener("click", () => {
    projectsManager.exportToJSON();
  });
}

const importProjectsBtn = document.getElementById("import-projects-btn");
if (importProjectsBtn) {
  importProjectsBtn.addEventListener("click", () => {
    projectsManager.importFromJSON();
  });
}

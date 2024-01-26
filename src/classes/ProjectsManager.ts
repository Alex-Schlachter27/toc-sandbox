import { IProject, Project } from "./Project"

export class ProjectsManager {
  list: Project[] = []
  ui: HTMLElement

  constructor(container: HTMLElement) {
    this.ui = container
    this.newProject({
      name: "Default Project",
      description: "This is just a default app project",
      status: "pending",
      userRole: "architect",
      finishDate: new Date()
    })
  }

  newProject(data: IProject) {
    const projectNames = this.list.map((project) => {
      return project.name
    })
    const nameInUse = projectNames.includes(data.name)
    if (nameInUse) {
      throw new Error(`A project with the name "${data.name}" already exists`)
    }
    const project = new Project(data)
    project.ui.addEventListener("click", () => {
      const projectsPage = document.getElementById("projects-page")
      const detailsPage = document.getElementById("project-details")
      if (!(projectsPage && detailsPage)) { return }
      projectsPage.style.display = "none"
      detailsPage.style.display = "flex"
      this.setDetailsPage(project)
    })
    this.ui.append(project.ui)
    this.list.push(project)	
    return project
  }

  private setDetailsPage(project: Project) {
    console.log(project)
    const detailsPage = document.getElementById("project-details")
    if (!detailsPage) { return }
    const name = detailsPage.querySelector("[data-project-info='name']")
    const description = detailsPage.querySelector("[data-project-info='description']")
    if (name) { name.textContent = project.name }
    if (description) { description.textContent = project.description }

    const mainPage = document.getElementById("project-dashboard")
    if (!mainPage) { return }
    const nameMain = detailsPage.querySelector("[data-project-info='name']")
    const descriptionMain = detailsPage.querySelector("[data-project-info='description']")
    const status = mainPage.querySelector("[data-project-info='status']")
    const userRole = mainPage.querySelector("[data-project-info='userRole']")
    const finishDate = mainPage.querySelector("[data-project-info='finishDate']")
    const cost = mainPage.querySelector("[data-project-info='cost']")
    const progress = mainPage.querySelector("[data-project-info='progress']")
    if (nameMain) { nameMain.textContent = project.name }
    if (descriptionMain) { descriptionMain.textContent = project.description }
    if (status) { status.textContent = project.status }
    if (userRole) { userRole.textContent = project.userRole }
    if (finishDate) { finishDate.textContent = project.finishDate.toISOString().split('T')[0].toString() }
    if (cost) { cost.textContent = project.cost.toString() }
    if (progress) { 
      progress.textContent = project.progress.toString() + " %"
    }
  }

  getProject(id: string) {
    const project = this.list.find((project) => {
      return project.id === id
    })
    return project
  }
  
  deleteProject(id: string) {
    const project = this.getProject(id)
    if (!project) { return }
    project.ui.remove()
    const remaining = this.list.filter((project) => {
      return project.id !== id
    })
    this.list = remaining
  }
  
  exportToJSON(fileName: string = "projects") {
    const json = JSON.stringify(this.list, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }
  
  importFromJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      const json = reader.result
      if (!json) { return }
      const projects: IProject[] = JSON.parse(json as string)
      for (const project of projects) {
        try {
          this.newProject(project)
        } catch (error) {
          
        }
      }
    })
    input.addEventListener('change', () => {
      const filesList = input.files
      if (!filesList) { return }
      reader.readAsText(filesList[0])
    })
    input.click()
  }
}
let currentProjectId: string | null = null

export function setClientProjectId(projectId: string | null) {
  currentProjectId = projectId
}

export function getClientProjectId() {
  return currentProjectId
}

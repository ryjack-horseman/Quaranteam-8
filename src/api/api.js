const API_TOKEN = '5eb1122c-36fd-435d-b318-02dc21ea111d'

/**
 * Fetch all projects
 *
 * @async
 * @returns {Promise<Array>}
 */
const fetchProjectsAsync = async () => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/projects?token=${API_TOKEN}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

/**
 * Fetch all stories in project with project ID {@param projectId}
 *
 * @async
 * @param {string} projectId
 * @returns {Promise<Array>}
 */
const fetchProjectStoriesAsync = async (projectId) => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/projects/${projectId}/stories?token=${API_TOKEN}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

/* Fetch all stories in all projects. Returns a promise */

/**
 * @async
 * @returns {Promise<Array>}
 */
const fetchStoriesAsync = async () => {
  return await fetchProjectsAsync()
    .then(projects => {
      return Promise.all(projects.map(project => fetchProjectStoriesAsync(project.id)))
    })
    .then(allProjectsStories => {
      // Remove projects that have no stories
      // Flatten the array to an array of story objects
      return allProjectsStories
        .filter(projectStories => projectStories.length > 0)
        .flat()
    })
}

exports.fetchStoriesAsync = fetchStoriesAsync

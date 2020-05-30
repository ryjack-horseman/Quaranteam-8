/**
 * TYPE DECLARATIONS
 *
 * @typedef Project
 * @type {Object}
 * @property {string} id - ID of the project
 *
 *
 * @typedef Story
 * @type {Object}
 * @property {boolean} completed - Whether the story is completed
 * @property {?string} completed_at - String representation of the time of
 *                                    completion
 * @property {number} estimate - Story point estimate
 * @property {string} id - ID of the story
 * @property {string} name - Name of the story
 * @property {Array<string>} owner_ids - Member IDs of members assigned to the
 *                                       story
 *
 *
 * @typedef BasicMember - Basic (not modified/enhanced by us) member object
 *                        fetched from Clubhouse
 * @type {Object}
 * @property {string} id - ID of the member
 * @property {Object} profile - Profile of the member containing personal info
 * @property {string} profile.name - Name of the member
 *
 *
 * @typedef Member - BasicMember that we have enhanced with additional
 *                   attributes (i.e. points)
 * @type {Object}
 * @property {string} id - ID of the member
 * @property {number} points - Total story points completed by the member
 * @property {Object} profile - Profile of the member containing personal info
 * @property {string} profile.name - Name of the member
 *
 *
 * @typedef MemberDisplay - Sub-object of BasicMember, with simplified structure
 * @type {Object}
 * @property {string} workspace - Name of the member's workspace
 * @property {name} name - Name of the member
 * @property {string} icon - URL of the member's display icon
 *
 *
 * @typedef MemberInfo - Member object, containing workspace info (but less
 *                       member info than BasicMember), fetched from Clubhouse
 * @type {Object}
 * @property {string} id - ID of the member
 * @property {string} name - Name of the member
 * @property {Object} workspace2 - Info about the member's workspace
 * @property {string} workspace2.url_slug - Member's workspace URL slug
 *
 *
 * @typedef Progress
 * @type {Object}
 * @property {number} completed - Number of story points completed
 * @property {number} total - Number of total story points
 */

/**
 * Signed-in member's API key
 *
 * @type {?string}
 */
var API_TOKEN = null

/**
 * Name of the workspace (workspace URL slug, actually) that the signed-in
 * member is a part of
 *
 * @type {?string}
 */
var WORKSPACE = null

/**
 * Signed-in member's member ID
 *
 * @type {?string}
 */
var MEMBER_ID = null

/**
 * Object mapping member ID -> member object. Contains all members
 *
 * @type {?Object<string, Member>}
 */
var MEMBER_MAP = null

/**
 * All stories in the workspace
 *
 * @type {?Array<Story>}
 */
var STORIES = null

/**
 * A promise to all global variables being initialized; promise that fulfills
 * when all global vars are initialized. Once all global vars are initialized
 * (without errors), all methods can execute correctly.
 *
 * @type {?Promise<void>}
 *
 * @see setup
 */
var SETUP = null

/**
 * All iterations in the workspace
 * 
 * @type {?Array<Iteration>}
 */
var CURRENT_ITERATION = null

/**
 * Fetch all projects
 *
 * @async
 * @returns {Promise<Array<Project>>} A promise to all projects in the workspace
 */
const fetchProjectsAsync = async () => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/projects?token=${API_TOKEN}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

/**
 * Fetch all stories in a project
 *
 * @async
 * @param {string} projectId - ID of the project
 * @returns {Promise<Array<Story>>} A promise to all stories in the project
 */
const fetchProjectStoriesAsync = async (projectId) => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/projects/${projectId}/stories?token=${API_TOKEN}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

/**
 * Fetch all stories in all projects
 *
 * @async
 * @returns {Promise<Array<Story>>} A promise to all stories in the workspace
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

/**
 * Fetch info about a member
 *
 * @async
 * @param {string} apiToken - Member's API token
 * @returns {Promise<MemberInfo>} A promise to the member info object
 */
const fetchMemberInfoAsync = async (apiToken) => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/member?token=${apiToken}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

/**
 * Fetch all members in the workspace
 *
 * @async
 * @returns {Promise<Array<BasicMember>>} A promise to the array of member objects
 */
const fetchMembersAsync = async () => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/members?token=${API_TOKEN}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

/**
 * Fetch a list of all iterations in the workspace
 * 
 * @async
 * @returns {Promise<Array>}
 */
const fetchSprintTimelineAsync = async () => {
  const res = await fetch(`https://api.clubhouse.io/api/v3/iterations?token=${API_TOKEN}`, {
    headers: { 'Content-Type': 'application/json'}
  })
  console.log(res)
  return res.json()
}

/**
 * Check if a story is complete
 *
 * @param {Story} story - Story to check
 * @returns {boolean} True if the story is complete, false otherwise
 */
const isComplete = story => story.completed === true

/**
 * Get stories - using optional filters - from the set of all stories in the
 * workspace (STORIES).
 *
 * @param {Object<string, boolean>} [params] - Optional parameter to specify
 *                                             filter flags.
 * @param {boolean} [params.memberOnly=false] - Flag to only include stories
 *                                              assigned to the signed-in
 *                                              member.
 * @param {boolean} [params.incompleteOnly=false] - Flag to only include stories
 *                                                  that are incomplete.
 * @param {boolean} [params.completeOnly=false] - Flag to only include stories
 *                                                that are complete.
 * @returns {?Array<Story>} Stories specified by the filters (if any). If no
 *                          filters are specified, returns all stories in the
 *                          workspace (STORIES). If STORIES is null, returns
 *                          null.
 */
const getStories = ({ memberOnly = false, incompleteOnly = false, completeOnly = false } = {}) => {
  if (!STORIES) {
    console.log('getStories called before api::STORIES assigned')
    return null
  }

  let stories = STORIES
  if (memberOnly) {
    stories = stories.filter(story => story.owner_ids.indexOf(MEMBER_ID) !== -1)
  }
  if (incompleteOnly) {
    stories = stories.filter(story => !isComplete(story))
  }
  if (completeOnly) {
    stories = stories.filter(story => isComplete(story))
  }
  return stories
}

/**
 * Get incomplete stories that are assigned to the signed-in member
 *
 * @returns {?Array<Story>} Incomplete stories assigned to the signed-in member.
 *                          If STORIES is null, returns null.
 *
 * @see getStories
 */
const getMyIncompleteStories = () => {
  return getStories({ memberOnly: true, incompleteOnly: true })
}

/**
 * Get all incomplete stories in the workspace
 *
 * @returns {?Array<Story>} All incomplete stories in the workspace. If STORIES
 *                          is null, returns null.
 *
 * @see getStories
 */
const getAllIncompleteStories = () => {
  return getStories({ incompleteOnly: true })
}

/**
 * Get stories to show in the battle log - all completed stories sorted by most
 * recently completed.
 *
 * @returns {?Array<Story>} Stories for battle log. If STORIES is null, returns null
 */
const getBattleLog = () => {
  const stories = getStories({ completeOnly: true })

  if (!stories) {
    return null
  }

  stories.sort((a, b) => {
    const dateA = Date.parse(
      a.completed_at_override
        ? a.completed_at_override
        : a.completed_at)
    const dateB = Date.parse(
      b.completed_at_override
        ? b.completed_at_override
        : b.completed_at)

    if (dateA > dateB) {
      return -1
    } else if (dateA === dateB) {
      return 0
    } else {
      return 1
    }
  })
  return stories
}

/**
 * Get the name of a member
 *
 * @param {string} memberId - ID of the member to get the name of
 * @returns {string} Name of the specified member
 */
const getMemberName = (memberId) => {
  return MEMBER_MAP[memberId].profile.name
}

/**
 * Get the display info - workspace, name, and display icon - of the signed-in
 * member.
 *
 * @returns {MemberDisplay} The display info of the signed-in member
 */
const getMemberProfile = () => {
  // Relevant user profile details
  if (MEMBER_MAP[MEMBER_ID].profile.display_icon) {
    return {
      workspace: WORKSPACE,
      name: MEMBER_MAP[MEMBER_ID].profile.name,
      icon: MEMBER_MAP[MEMBER_ID].profile.display_icon.url
    }
  } else {
    return {
      workspace: WORKSPACE,
      name: MEMBER_MAP[MEMBER_ID].profile.name,
      icon: 'https://cdn.patchcdn.com/assets/layout/contribute/user-default.png'
    }
  }
}

/**
 * Get the sprint timeline details - start & end dates and remaining days
 * 
 * @returns {SprintDetails} The sprint information
 */
const getSprintTimeline = () => {
  console.log(CURRENT_ITERATION)
  console.log(CURRENT_ITERATION.filter(iter => iter.status == 'started'))
  CURRENT_ITERATION = CURRENT_ITERATION.filter(iter => iter.status == 'started')

  if(CURRENT_ITERATION[0]){
    //calculate days remaining based on current & end dates
    var s = new Date(CURRENT_ITERATION[0].start_date)
    var c = new Date()
    var e = new Date(CURRENT_ITERATION[0].end_date)
    var remaining = ( e.getTime() - c.getTime() ) / (1000 * 3600 * 24)

    if(remaining < 0){
      remaining = 0
    }
    
    console.log(s)
    console.log(e)
    console.log(remaining)
    return {
      start: s,
      end: e,
      remaining: remaining
    }
  }
  else{

  }
}

/**
 * Set the value of API_TOKEN to undefined
 */
const removeApiToken = () => {
  API_TOKEN = undefined
}

/**
 * Get the overall progress of stories, in terms of points completed
 *
 * @returns {Progress} Completed points and total points
 */
const getProgress = () => {
  let completed = 0
  let total = 0
  getStories().map(story => {
    if (story.estimate) {
      if (isComplete(story)) {
        completed += story.estimate
      }
      total += story.estimate
    }
  })
  return { completed, total }
}

/**
 * Method to be called during the sign-in process once the member's API token,
 * ID, and workspace are known. Initializes global variables that are known, and
 * triggers the initialization of all other global variables (by calling setup).
 *
 * @param {string} apiToken - API token of the member signing in
 * @param {string} memberId - Member ID of the member signing in
 * @param {string} workspace - Workspace of the member signing in
 *
 * @see setup
 */
const onLogin = (apiToken, memberId, workspace) => {
  // Init global vars that don't require fetching
  API_TOKEN = apiToken
  MEMBER_ID = memberId
  WORKSPACE = workspace

  // Init global vars that require fetching
  setup()
}

/**
 * Get the SETUP promise. If SETUP hasn't been initialized yet, create it.
 * Otherwise, return the existing promise - do not recreate/restart it.
 *
 * @returns {?Promise<void>} A promise to all global variables being initialized
 *                           without error and all methods being ready for
 *                           execution.
 *
 * @see SETUP
 */
const setup = () => {
  if (!SETUP) {
    SETUP = new Promise((resolve, reject) => {
      chrome.storage.sync.get(['api_token', 'member_id', 'workspace'], store => {
        API_TOKEN = store.api_token
        MEMBER_ID = store.member_id
        WORKSPACE = store.workspace

        Promise.all([
          fetchStoriesAsync()
            .then(stories => {
              STORIES = stories
            }),
          fetchMembersAsync()
            .then(members => {
              MEMBER_MAP = {}
              members.map(member => {
                MEMBER_MAP[member.id] = member
              })
            }),
          fetchSprintTimelineAsync()
            .then(iterations => {CURRENT_ITERATION = iterations}
              
              /*iterations => {
              CURRENT_ITERATION = {}
              iterations.map(iteration => {
                CURRENT_ITERATION[iteration.id] = iteration
              }) 
            }*/
            )
        ])
          .then(() => {
            resolve('All globals are setup')
          })
      })
    })
  }
  return SETUP
}

module.exports = {
  fetchMemberInfoAsync,
  getMyIncompleteStories,
  getAllIncompleteStories,
  getBattleLog,
  getMemberName,
  getMemberProfile,
  getSprintTimeline,
  getProgress,
  onLogin,
  setup,
  removeApiToken
}

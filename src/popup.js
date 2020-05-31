import {
  setup,
  getMyIncompleteStories,
  getAllIncompleteStories,
  completeStoriesAsync,
  //  revertCompleteStoriesAsync,
  getBattleLog,
  getTopWarriors,
  getAllMembers,
  getMemberName,
  getMemberProfile,
  getProgress,
  removeApiToken
} from './api/api'

// Story values for health bar
var COMPLETED
var TOTAL

// Member profile button and info
const profileContainer = document.getElementById('profileContainer')
// const memberProfile = document.getElementById('memberProfile')
const memberIcon = document.getElementById('memberIcon')
const memberName = document.getElementById('memberName')
const memberTeam = document.getElementById('memberTeam')

const healthText = document.getElementById('healthText')
const healthLeft = document.getElementById('healthLeft')

// Member menu and menu buttons
const memberMenu = document.getElementById('memberMenu')
const signoutButton = document.getElementById('signoutButton')

// Element to create fancy animated tab highlight
// const selectedTabBG = document.getElementById("selectedTabBG");

// Tab elements
const myStoriesTab = document.getElementById('myStoriesTab')
const allStoriesTab = document.getElementById('allStoriesTab')
const battleLogTab = document.getElementById('battleLogTab')

// Containers for actual elements
const myStories = document.getElementById('myStories')
const allStories = document.getElementById('allStories')
const battleLog = document.getElementById('battleLog')

// Top 3 point earners

const warrior1Name = document.getElementById('warrior1Name')
const warrior1Points = document.getElementById('warrior1Points')
const warrior2Name = document.getElementById('warrior2Name')
const warrior2Points = document.getElementById('warrior2Points')
const warrior3Name = document.getElementById('warrior3Name')
const warrior3Points = document.getElementById('warrior3Points')

// Event listener for open honor menu
const membersList = document.getElementById('membersList')
const membersListContainer = document.getElementById('membersListContainer')
const membersListButton = document.getElementById('membersListButton')
membersListButton.addEventListener('click', () => toggleMembersList())

// Click event listeners for tabs
myStoriesTab.addEventListener('click', () => selectTab(0))
allStoriesTab.addEventListener('click', () => selectTab(1))
battleLogTab.addEventListener('click', () => selectTab(2))

/**
 * Signout by removing all items from StorageArea storage.sync
 */
const signout = () => {
  chrome.storage.sync.clear((clear) => {
    if (chrome.runtime.lastError === undefined) {
      console.log('storage cleared')
      // remove the api token in use from api.js
      removeApiToken()
      // load the login page
      window.location.href = 'login.html'
    } else {
      alert('Error trying to clear storage')
    }
  })
}

/**
 * Show member profile menu
 */
const toggleMemberMenu = () => {
  if (profileContainer.classList.contains('closed')) {
    profileContainer.classList.remove('closed')
    profileContainer.classList.add('open')
  } else {
    profileContainer.classList.remove('open')
    profileContainer.classList.add('closed')
  }
}

/**
 * Close member profile menu on outside click
 */
document.body.addEventListener('click', (event) => {
  if (event.target.id.length > 0) {
    if (!event.target.id.substring(0, 5) === 'member' && memberMenu.classList.contains('show')) {
      toggleMemberMenu()
    }
  } else {
    if (memberMenu.classList.contains('show')) {
      toggleMemberMenu()
    }
  }
})
profileContainer.addEventListener('click', toggleMemberMenu)
signoutButton.addEventListener('click', signout)

/**
 * Apply appropriate styles to selected tab and panel item
 *
 * @param {number} tabIndex - index of tab
 */
function selectTab (tabIndex) {
  // Close profile menu if it's open
  if (memberMenu.classList.contains('show')) {
    toggleMemberMenu()
  }
  // Deselect previously selected tab and hide previously selected panel item
  var selectedTabs = document.getElementsByClassName('selected')
  while (selectedTabs.length > 0) {
    selectedTabs[0].classList.remove('selected')
  }

  switch (tabIndex) {
    // My Stories
    case 0:
      myStoriesTab.classList.add('selected')
      myStories.classList.add('selected')
      break
    // All Stories
    case 1:
      allStoriesTab.classList.add('selected')
      allStories.classList.add('selected')
      break
    // Battle Log
    case 2:
      battleLogTab.classList.add('selected')
      battleLog.classList.add('selected')
      break

    default:
  }
}

/**
 * Complete story onClick
 *
 * @param {Story} story the story to be completed
 * @param {*} storyNode the child story node to be removed from the myStories and allStories tabs
 * @param {string} tabName the name of the tab from where the complete story button was clicked
 */
function completeStory (story, storyNode, tabName) {
  completeStoriesAsync(story.id)
    .then((data) => {
      console.log(data)
      try {
        switch (tabName) {
          case 'myStoriesTab': {
            // update the health bar values and color
            COMPLETED += story.estimate
            healthLeft.style.width = ((TOTAL - COMPLETED) / TOTAL) * 100 + '%'
            healthText.innerText = `${TOTAL - COMPLETED} / ${TOTAL}`
            updateHealthBarColor()

            // remove from myStories tab
            myStories.removeChild(storyNode)
            // find the node that corresponds to the allStories container
            const newNode = getStoryNodeFromContainer(allStories, story.name)
            if (newNode) {
              // remove from allStories tab
              allStories.removeChild(newNode)
            }
            break
          }
          case 'allStoriesTab': {
            // find the node that corresponds to the myStories container
            const newNode = getStoryNodeFromContainer(myStories, story.name)
            if (newNode) {
              // remove from myStories tab
              myStories.removeChild(newNode)
            }
            // remove from allStories tab
            allStories.removeChild(newNode)
            break
          }
          default: {
            /*
              This case should never be reached. The complete story button should
              only be available in the myStories tab and the allStoriesTab
            */
            throw new Error(`Button error. I do not know which tab 
              ${getMemberProfile().name} was under when completing the story 
              ${story.name}`)
          }
        }
      } catch (e) {
        console.error(`${e.name}: ${e.message}`)
      }
      // add the completed story to the battleLog tab
      addToBattleLogTab(story)
    })
  console.log('complete story', story)
}

/**
 * Estimate the amount of story points a story is worth
 * (ensure that the value is at least 0 instead of null)
 *
 * @param {number} storyPoints the number of story points allocated to a
 * specific story
 * @returns {number} the number of points the story is worth
 */
const estimateStoryPoints = storyPoints => {
  return storyPoints === null ? 0 : storyPoints
}

/**
 * Return the node associated with the passed in story name
 *
 * @param {*} nodeContainer container of all stories associated with a specific
 * tab in the DOM
 * @param {*} storyName the name of the story of the node we want to retrieve
 * @returns the node associated with the story name
 */
const getStoryNodeFromContainer = (nodeContainer, storyName) => {
  for (const element of nodeContainer.children) {
    if (element.innerHTML.includes(storyName)) {
      return element
    }
  }
  // should never reach this statement if function is invoked from proper context
  return null
}
/**
 * Adds the passed in story to the myStories tab
 * @param {*} story the story to add to the myStories tab
 */
const addToMyStoriesTab = story => {
  const storyDiv = document.createElement('div')
  const storyButton = document.createElement('div')
  storyDiv.classList.add('story')
  storyButton.classList.add('story-button')
  storyButton.innerHTML = '<img src="images/sword.png" >'
  storyDiv.innerHTML = '<div class="name">' + story.name + '</div>'
  storyDiv.innerHTML += '<div class="points">' + estimateStoryPoints(story.estimate) + ' DMG</div>'
  storyDiv.prepend(storyButton)
  myStories.appendChild(storyDiv)

  var counter = 0
  var pressHoldEvent = new CustomEvent('pressHold')
  var pressHoldDuration = 50
  var timerID
  storyButton.addEventListener('mousedown', pressingDown, false)
  storyButton.addEventListener('mouseup', notPressingDown, false)
  storyButton.addEventListener('pressHold', finishHold, false)

  /**
   * Sets timer for story completion mousedown event
   */
  function pressingDown () {
    // Start the timer
    requestAnimationFrame(timer)
  }
  /**
   * Resets timer for sotry completion mouseup event
   */
  function notPressingDown () {
    // Stop the timer
    cancelAnimationFrame(timerID)
    counter = 0
  }
  /**
   * Estabilishs timer action during story completion mousedown event
   */
  function timer () {
    if (counter < pressHoldDuration) {
      timerID = requestAnimationFrame(timer)
      counter++
    } else {
      storyButton.dispatchEvent(pressHoldEvent)
    }
  }
  /**
   * Completes story when pressHoldDuration threshold is met
   */
  function finishHold () {
    completeStory(story, storyDiv, 'myStoriesTab')
  }
}
/**
 * Adds the passed in story to the allStories tab
 * @param {*} story the story to add to the allStories tab
 */
const addToAllStoriesTab = story => {
  const ownerNames = story.owner_ids.length > 0
    ? story.owner_ids.map(memberId => getMemberName(memberId))
    : ['Unassigned']

  console.log(ownerNames)
  const storyDiv = document.createElement('div')
  const storyButton = document.createElement('div')
  storyDiv.classList.add('story')
  storyButton.classList.add('story-button')
  storyButton.innerHTML = '<img src="images/sword.png" >'
  storyDiv.innerHTML = '<div class="name">' + story.name + '</div>'
  storyDiv.innerHTML += '<div class="points">' + story.estimate + ' DMG</div>'
  const ownersDiv = document.createElement('div')
  ownersDiv.classList.add('owners')
  ownerNames.forEach(ownerName => {
    const ownerDiv = document.createElement('div')
    ownerDiv.innerHTML = ownerName
    ownersDiv.append(ownerDiv)
  })
  storyButton.addEventListener('click', () => completeStory(story, storyDiv, 'allStoriesTab'))
  storyDiv.prepend(storyButton)
  storyDiv.append(ownersDiv)
  allStories.appendChild(storyDiv)
}
/**
 * Add the passed in story to the battleLog tab
 * @param {*} story the story to add to the battleLog tab
 */
const addToBattleLogTab = story => {
  const ownerNames = story.owner_ids.length > 0
    ? story.owner_ids.map(memberId => getMemberName(memberId)).join(', ')
    : 'unassigned'
  const actionDiv = document.createElement('div')
  actionDiv.classList.add('action')
  actionDiv.innerHTML = ownerNames + ' completed ' + story.name + ' dealing ' + estimateStoryPoints(story.estimate) + ' DMG'

  battleLog.prepend(actionDiv)
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    setup()
      .then(() => {
        /* Get member info for profile button */
        const memberProfile = getMemberProfile()
        memberName.innerHTML = memberProfile.name
        memberIcon.src = memberProfile.icon
        memberTeam.innerHTML = memberProfile.role /* sets role of member not organization/team */

        /* Get top warraiors and update text */
        const topWarriors = getTopWarriors()
        warrior1Name.innerText = `${topWarriors[0].name}`
        warrior2Name.innerText = `${topWarriors[1].name}`
        warrior3Name.innerText = `${topWarriors[2].name}`

        memberIcon.src = memberProfile.icon
        memberName.innerHTML = memberProfile.name
        memberTeam.innerHTML = memberProfile.workspace

        warrior1Points.innerText = `${topWarriors[0].points}` + ' DMG'
        warrior2Points.innerText = `${topWarriors[1].points}` + ' DMG'
        warrior3Points.innerText = `${topWarriors[2].points}` + ' DMG'

        updateHealthBar()
        /* Populate tabs */

        // My Stories
        getMyIncompleteStories().map(story => {
          addToMyStoriesTab(story)
        })

        getAllIncompleteStories().map(story => {
          addToAllStoriesTab(story)
        })

        getBattleLog().map(story => {
          addToBattleLogTab(story)
        })

        const allMembers = getAllMembers()
        allMembers.forEach(member => {
          const memberDiv = document.createElement('div')
          memberDiv.classList.add('member')
          const memberName = document.createElement('div')
          memberName.innerHTML = member.profile.name
          const honorButton = document.createElement('div')
          honorButton.classList.add('honor')
          honorButton.innerHTML = 'Honor'
          honorButton.addEventListener('click', () => honorMember(member))
          memberDiv.appendChild(memberName)
          memberDiv.appendChild(honorButton)
          membersList.appendChild(memberDiv)
        })
      })
  },
  false
) // addEventListener()

/**
 * Calculate the amount of health the boss has left and display it as a health
 * bar in the DOM
 */
function updateHealthBar () {
  /* Set progress bar values */
  const { completed, total } = getProgress()
  COMPLETED = completed
  TOTAL = total
  healthLeft.style.width = ((total - completed) / total) * 100 + '%'
  healthText.innerText = `${total - completed} / ${total}`
  updateHealthBarColor()
}

/**
 * Update the color of the health bar display depending on how much health left
 */
function updateHealthBarColor () {
  /* Set progress bar color change */
  const greenThreshold = (2 / 5) * TOTAL
  const yellowThreshold = (1 / 5) * TOTAL
  healthLeft.classList.add((TOTAL - COMPLETED > greenThreshold) ? 'healthBarGreenState'
    : (TOTAL - COMPLETED > yellowThreshold) ? 'healthBarYellowState'
      : 'healthBarRedState')
}

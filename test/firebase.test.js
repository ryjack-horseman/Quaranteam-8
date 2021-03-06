import {
  memberLogin,
  honorDatabaseMember,
  workspaceRef
} from '../src/db/firebase'
import {
  setup,
  getAllMembers
} from '../src/popup-backend'

import * as realFetch from 'node-fetch'

/** FETCH MOCK */
/**
 * Like normal fetch, but if resource URL starts with Heroku CORS proxy address,
 * remove it; like normal fetch, but doesn't use CORS proxy.
 */
const fetchMock = jest.fn().mockImplementation((resource, init = {}) => {
  const corsProxyUrl = 'https://cors-anywhere.herokuapp.com'
  const corsPrefix = corsProxyUrl + '/'
  if (resource.startsWith(corsPrefix)) {
    resource = resource.substring(corsPrefix.length)
  }
  return realFetch(resource, init)
})

global.fetch = fetchMock
/** FETCH MOCK */

const testAPIToken = '5ed2b278-d7a6-4344-b33f-94b8901aa75a'
const memberID = '5ecdd3de-0125-4888-802a-5d3ba46ca0dc'
const workspace = 'quarantest8'
const myName = '_Test User_'

/** CHROME STORAGE MOCK */
/**
 * Local version of storage (mocking chrome.storage.sync) to be used by the get
 * and set mocks.
 */
const chromeStorage = {
  api_token: testAPIToken,
  member_id: memberID,
  workspace: workspace,
  name: myName
}

/**
 * Mocks a successful (no storage error) behavior of chrome.sync.storage.get
 */
const chromeStorageGetMock = jest.fn().mockImplementation((keys = null, callback) => {
  let items = null
  if (!keys) {
    // If keys is null, return everything in storage
    items = chromeStorage
  } else if (typeof keys === 'string') {
    // If keys is a string specifying one key, return only that key-value pair
    // If the key doesn't exist in storage, return empty object
    items = Object.prototype.hasOwnProperty.call(chromeStorage, keys)
      ? { [keys]: chromeStorage[keys] }
      : {}
  } else if (Array.isArray(keys)) {
    // If keys is an array, return all of the key-value pairs found in storage
    items = {}
    keys.map(k => {
      if (Object.prototype.hasOwnProperty.call(chromeStorage, k)) {
        items[k] = chromeStorage[k]
      }
    })
  }
  callback(items)
})

const chromeStorageSetMock = jest.fn().mockImplementation(() => console.log('TODO'))

const chromeStorageClearMock = jest.fn().mockImplementation(() => console.log('TODO'))

/**
 * Local version of chrome (mocking chrome). Used to access
 * chrome.storage.sync.get, chrome.storage.sync.set,
 * chrome.storage.sync.clear, and chrome.runtime.lastError.
 *
 * If there is a storage error, then chrome.runtime.lastError should not be
 * undefined.
 */
const chromeMock = {
  storage: {
    sync: {
      get: chromeStorageGetMock,
      set: chromeStorageSetMock,
      clear: chromeStorageClearMock
    }
  },
  runtime: {
    lastError: undefined
  }
}

global.chrome = chromeMock
/** CHROME STORAGE MOCK */

// Test User ID's
const user1ID = '5ed2c520-5486-4d9d-9882-3067306a2700'
const user2ID = '5ecdd3de-0125-4888-802a-5d3ba46ca0dc'
const user3ID = '5ecdd3a1-62b4-4aa9-9a45-b774c82b4e27'
const user4ID = '5ecdd412-7a37-4aa4-b555-8006d2fb7ce6'
const user5ID = '5ecdd438-2c26-445b-bfa5-cbb113f47484'

const users = [user1ID, user2ID, user3ID, user4ID, user5ID]

// const iterationId = 1 // Will be used in the future when we are able to add iterations in the honor system

/**
 * Unit Test 1
 * We are creating a user that will have no honors, so the honoredBy should be empty or null
 */

it('Test Member Login for USER 1', done => {
  // Set up our popup backend
  setup()
    .then(() => {
      // Log in the user using the firebase.js script
      memberLogin(user1ID, getAllMembers().map(member => { return member.id }), workspace /*, iterationId */)
        .then(() => {
          // Grab the values of the current user in the db
          workspaceRef.child(2).child(user1ID).once('value').then((dataSnapshot) => {
            // Save variables to test, then clear db
            var honoredByTest = dataSnapshot.val().honoredBy
            var honorsRemainingTest = dataSnapshot.val().honorRecognitionsRemaining

            // Clear the test database to keep each test clean
            workspaceRef.remove()

            // Expect the honored_by to be empty (false)
            expect(honoredByTest).toBe(false)
            // Expect the remaining recognitions to be 3
            expect(honorsRemainingTest).toBe(3)

            done()
          })
        })
    })
})

/**
 * Unit Test 2
 * USER 1 will honor USER 2 once
 */
it('Test usage of honorDatabaseMember once', done => {
  // Set up our popup backend
  setup()
    .then(() => {
      // Log in the user using the firebase.js script
      memberLogin(user1ID, getAllMembers().map(member => { return member.id }), workspace /*, iterationId */)
        .then(() => {
          // Perform the honoring
          honorDatabaseMember(user1ID, user2ID).then(() => {
            // First check that USER1 sent the honor
            workspaceRef.child(2).child(user1ID).once('value', (dataSnapshot) => {
              // Save variables to test, then clear db
              var honoredByTest1 = dataSnapshot.val().honoredBy
              var honorsRemainingTest1 = dataSnapshot.val().honorRecognitionsRemaining

              // Expect the honoredBy to be empty (false)
              expect(honoredByTest1).toBe(false)
              // Expect the remaining recognitions to be 2
              expect(honorsRemainingTest1).toBe(2)

              // Now check that USER2 received the honor
              workspaceRef.child(2).child(user2ID).once('value', (dataSnapshot) => {
                // Save variables to test, then clear db
                var honoredByTest2 = dataSnapshot.val().honoredBy
                var honorsRemainingTest2 = dataSnapshot.val().honorRecognitionsRemaining

                // Clear the test database to keep each test clean
                workspaceRef.remove()

                // Expect the honoredBy to have 1 honor by user1
                expect(honoredByTest2).toHaveProperty(user1ID)
                // Expect the remaining recognitions to be 3
                expect(honorsRemainingTest2).toBe(3)

                done()
              })
            })
          })
        })
    })
})

/**
 * Unit Test 3
 * USER 1 will honor USER 2 TWICE
 * End result should be the same as Unit Test 2
 */
it('Test usage of honorDatabaseMember once', done => {
  // Set up our popup backend
  setup()
    .then(() => {
      // Log in the user using the firebase.js script
      memberLogin(user1ID, getAllMembers().map(member => { return member.id }), workspace /*, iterationId */)
        .then(() => {
          // Perform the honoring
          honorDatabaseMember(user1ID, user2ID).then(() => {
            honorDatabaseMember(user1ID, user2ID).then(() => {
              // First check that USER1 sent the honor and still has both honors
              workspaceRef.child(2).child(user1ID).once('value', (dataSnapshot) => {
                var honoredByTest1 = dataSnapshot.val().honoredBy
                var honorsRemainingTest1 = dataSnapshot.val().honorRecognitionsRemaining

                // Expect the honoredBy to be empty (false)
                expect(honoredByTest1).toBe(false)
                // Expect the remaining recognitions to be 2, second honor did not get used up
                expect(honorsRemainingTest1).toBe(2)

                // Now check that USER2 received the honor
                workspaceRef.child(2).child(user2ID).once('value', (dataSnapshot) => {
                  var honoredByTest2 = dataSnapshot.val().honoredBy
                  var honorsRemainingTest2 = dataSnapshot.val().honorRecognitionsRemaining

                  // Clear the test database to keep each test clean
                  workspaceRef.remove()

                  // Expect the honoredBy to have only 1 honor by user1
                  expect(honoredByTest2).toHaveProperty(user1ID)
                  // Expect the remaining recognitions to be 3
                  expect(honorsRemainingTest2).toBe(3)

                  done()
                })
              })
            })
          })
        })
    })
})

/**
 * Unit Test 4
 * USER 1 attempts to honor 4 people (USER 2, USER 3, USER 4, USER 5)
 * Only USER's 2,3,4 should get the honors because of the 3 honor limit
 */
it('Test usage of honorDatabaseMember once', done => {
  // Set up our popup backend
  setup()
    .then(() => {
      // Log in the user using the firebase.js script
      memberLogin(user1ID, getAllMembers().map(member => { return member.id }), workspace /*, iterationId */)
        .then(() => {
          // Perform the honoring
          honorDatabaseMember(user1ID, user2ID).then(() => {
            honorDatabaseMember(user1ID, user3ID).then(() => {
              honorDatabaseMember(user1ID, user4ID).then(() => {
                honorDatabaseMember(user1ID, user5ID).then(() => {
                  // First check that USER1 has 0 honors
                  workspaceRef.child(2).child(user1ID).once('value', (dataSnapshot) => {
                    var honoredByTest = dataSnapshot.val().honoredBy
                    var honorsRemainingTest = dataSnapshot.val().honorRecognitionsRemaining

                    // Expect the honoredBy to be empty (false)
                    expect(honoredByTest).toBe(false)
                    // Expect the remaining recognitions to be 2, second honor did not get used up
                    expect(honorsRemainingTest).toBe(0)

                    // Define a recursive function that will go through each user and check the honors
                    const checkUser = (currUser) => {
                      // Just keep going recursively for all non USER5
                      if (currUser < 4) {
                        // Check that USER5 did NOT receive any honors
                        workspaceRef.child(2).child(users[currUser]).once('value', (dataSnapshot) => {
                          honoredByTest = dataSnapshot.val().honoredBy
                          honorsRemainingTest = dataSnapshot.val().honorRecognitionsRemaining

                          // Expect the honoredBy to have only 1 honor by user1
                          expect(honoredByTest).toHaveProperty(user1ID)
                          // Expect the remaining recognitions to be 3
                          expect(honorsRemainingTest).toBe(3)

                          checkUser(currUser + 1)
                        })
                      } else {
                        // Now check that USER 5 did not receive any honors
                        workspaceRef.child(2).child(user5ID).once('value', (dataSnapshot) => {
                          honoredByTest = dataSnapshot.val().honoredBy
                          honorsRemainingTest = dataSnapshot.val().honorRecognitionsRemaining

                          // Clear the test database to keep each test clean
                          workspaceRef.remove()

                          // Expect USER5 to not have any honors because USER1 ran out
                          expect(honoredByTest).toBe(false)
                          // Expect the remaining recognitions to be 3
                          expect(honorsRemainingTest).toBe(3)

                          done()
                        })
                      }
                    }
                    // Call the recursive function
                    checkUser(1)
                  })
                })
              })
            })
          })
        })
    })
})

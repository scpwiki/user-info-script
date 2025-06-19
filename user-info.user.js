/*
 * Wikidot additional user info userscript
 *
 * For installation instructions, see https://05command.wikidot.com/user-scripts
 */

// ==UserScript==
// @name        Wikidot additional user info script
// @description Adds additional user information on user information
// @version     v0.0.3
// @updateURL   https://github.com/scpwiki/user-info-script/raw/main/user-info.user.js
// @downloadURL https://github.com/scpwiki/user-info-script/raw/main/user-info.user.js
// @supportURL  https://www.wikidot.com/account/messages#/new/4598089
// @include     http://www.wikidot.com/user:info/*
// @include     https://www.wikidot.com/user:info/*
// @include     https://scp-wiki.wikidot.com/system:user/*
// ==/UserScript==

function getUserId() {
  const element = document.querySelector('a.btn.btn-default.btn-xs');
  const userIdRegex = /https?:\/\/www\.wikidot\.com\/account\/messages#\/new\/(\d+)/;
  const matches = element.href.match(userIdRegex);
  return matches[1];
}

let FETCHED_DATA = false;
const USER_ID = getUserId();
let USERNAME;
let WIKIDOT_JOIN_DATE;
let WIKIDOT_DAYS;
let SITE_JOIN_DATE = null;
let SITE_DAYS = null;

async function fetchUserInfo(userId) {
  if (FETCHED_DATA) {
    return;
  }

  // Fetch request HTML and write into hidden element for querying
  const dateRegex = /([^,]+, [0-9]{2}:[0-9]{2}) \(([0-9]+ days) .+\)/;
  const element = document.createElement('html');
  element.innerHTML = await new Promise(resolve => (
    unsafeWindow.OZONE.ajax.requestModule('users/UserInfoWinModule', {user_id: userId}, resolve)
  ));

  // Get username from header
  USERNAME = element.querySelector('h1').innerText;

  // Get data from fields
  const fields = element.querySelectorAll('tr');
  let i;

  // The first date field is the Wikidot join date
  for (i = 0; i < fields.length; i++) {
    const field = fields[i];
    const matches = field.innerText.match(dateRegex);
    if (matches === null) {
      // This isn't a date, keep moving
      continue;
    }

    // This *is* a date, so extract the fields and quit searching
    // (but save index so we can get the second one)
    WIKIDOT_JOIN_DATE = new Date(matches[1]);
    WIKIDOT_DAYS = matches[2];
  }

  // The second date field (if it exists) is the site join date
  let siteJoinDate = null;
  let siteDays = null;
  for (; i < fields.length; i++) {
    // Same logic, as above
    const field = fields[i];
    const matches = field.innerText.match(dateRegex);
    if (matches === null) {
      continue;
    }

    SITE_JOIN_DATE = new Date(matches[1]);
    SITE_DAYS = matches[2];
  }

  FETCHED_DATA = true;
}

function addDescriptionEntry(descriptionList, key, value, insertIndex) {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.innerText = key;
  dd.innerText = value;

  if (insertIndex === -1) {
    // -1 means append to end
    descriptionList.appendChild(dt);
    descriptionList.appendChild(dd);
  } else {
    // 0+ means add at that index
    const insertBeforeElement = descriptionList.children[insertIndex];
    if (!insertBeforeElement) {
      alert(`Invalid insertion index: ${insertIndex} (only ${descriptionList.children.length} items)`);
      return;
    }

    descriptionList.insertBefore(dt, insertBeforeElement);
    descriptionList.insertBefore(dd, insertBeforeElement);
  }
}

function insertFields(infoElement) {
  const descriptionList = infoElement.querySelector('dl.dl-horizontal');
  if (!descriptionList) {
    alert('No description list in user info area?');
    return;
  }

  // Add new info elements
  addDescriptionEntry(descriptionList, 'User ID:', USER_ID, 0);
  addDescriptionEntry(descriptionList, 'User name:', USERNAME, 1);

  const infoLine = `${USERNAME} (W: ${WIKIDOT_DAYS}, S: ${SITE_DAYS || 'none'}, ID: ${USER_ID})`;
  addDescriptionEntry(descriptionList, 'Info line:', infoLine, -1);
}

function main() {
  // Set up observer to insert info every time the profile is switched to
  console.log('Creating observer for user profile');
  const element = document.getElementById('user-info-area');
  const observer = new MutationObserver(() => {
    const profileElement = element.querySelector('div.profile-box');
    if (profileElement !== null) {
      // This is the right tab, update
      // note that fetchUserInfo() only runs once
      fetchUserInfo(USER_ID);
      insertFields(element);
    }

    observer.observe(element, { childList: true });
  });
}

main();

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
let SITE_JOIN_DATE;

async function fetchUserInfo(userId) {
  if (FETCHED_DATA) {
    console.debug('Already fetched user profile information');
    return;
  }

  // Fetch request HTML and write into hidden element for querying
  console.log('Fetching user profile information');
  const element = document.createElement('html');
  element.innerHTML = await new Promise(resolve => (
    unsafeWindow.OZONE.ajax.requestModule('users/UserInfoWinModule', {user_id: userId}, resolve)
  ));

  // Get username from header
  USERNAME = element.querySelector('h1').innerText;
  console.log(`Got username: ${USERNAME}`);

  // Get data from fields
  const fields = element.querySelectorAll('tr td');
  let i;

  // The first date field is the Wikidot join date
  for (i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.classList.contains('active')) {
      // Ignore keys
      continue;
    }

    const value = field.innerText.trim();
    const date = new Date(value);
    if (isNaN(date)) {
      // This isn't a date, keep moving
      continue;
    }

    // This *is* a date, so extract the fields and quit searching
    // (but save index so we can get the second one)
    WIKIDOT_JOIN_DATE = date;
    console.log(`Got wikidot join date: ${WIKIDOT_JOIN_DATE}`);
  }

  // The second date field (if it exists) is the site join date
  SITE_JOIN_DATE = null;
  for (; i < fields.length; i++) {
    // Same logic, as above
    const field = fields[i];
    const matches = field.innerText.match(dateRegex);
    if (matches === null) {
      continue;
    }

    SITE_JOIN_DATE = new Date(matches[1]);
    console.log(`Got wikidot join date: ${SITE_JOIN_DATE}`);
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

// From https://stackoverflow.com/a/11252167
function treatAsUTC(date) {
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date;
}

function daysBetween(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

function daysString(date) {
  if (date === undefined) {
    // indicates an error
    throw new Error('Undefined date value from user profile fetch');
  } else if (date === null) {
    // date missing, not an error
    return 'none';
  }

  const days = Math.trunc(daysBetween(date, new Date()));
  return `${days} days`;
}

function insertFields(infoElement) {
  const descriptionList = infoElement.querySelector('dl.dl-horizontal');
  if (!descriptionList) {
    alert('No description list in user info area?');
    return;
  }

  // Add new info elements
  addDescriptionEntry(descriptionList, 'User ID:', USER_ID, 0);
  addDescriptionEntry(descriptionList, 'User name:', USERNAME, 2);

  const wikidotDays = daysString(WIKIDOT_JOIN_DATE);
  const siteDays = daysString(SITE_JOIN_DATE);
  const infoLine = `${USERNAME} (W: ${wikidotDays}, S: ${siteDays}, ID: ${USER_ID})`;
  addDescriptionEntry(descriptionList, 'Info line:', infoLine, -1);
}

async function main() {
  // Set up observer to insert info every time the profile is switched to
  console.log('Creating observer for user profile');
  const element = document.getElementById('user-info-area');
  const observer = new MutationObserver(async () => {
    const profileElement = element.querySelector('div.profile-box');
    if (profileElement !== null) {
      // This is the right tab, update
      // note that fetchUserInfo() only runs once
      await fetchUserInfo(USER_ID);
      insertFields(element);
    }

  });

  observer.observe(element, { childList: true });
}

main();

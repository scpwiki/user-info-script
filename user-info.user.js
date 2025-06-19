/*
 * Wikidot additional user info userscript
 *
 * For installation instructions, see https://05command.wikidot.com/user-scripts
 *
 * Contact: https://www.wikidot.com/account/messages#/new/4598089
 */

// ==UserScript==
// @name        Wikidot additional user info script
// @description Adds additional user information on user information
// @version     v0.0.7
// @updateURL   https://github.com/scpwiki/user-info-script/raw/main/user-info.user.js
// @downloadURL https://github.com/scpwiki/user-info-script/raw/main/user-info.user.js
// @include     http://www.wikidot.com/user:info/*
// @include     https://www.wikidot.com/user:info/*
// @include     https://scp-wiki.wikidot.com/system:user/*
// ==/UserScript==

function getUserId() {
  const element = document.querySelector('a.btn.btn-default.btn-xs');
  const userIdRegex = /https?:\/\/www\.wikidot\.com\/account\/messages#\/new\/(\d+)/;
  const matches = element.href.match(userIdRegex);
  if (matches === null) {
    alert(`Private message href doesn't match regex: ${element.href}`);
    return;
  }

  return matches[1];
}

function getUsername() {
  // NOTE: This username does *not* preserve leading or trailing whitespace
  //       (The element we are extracting from here does not preserve it)
  const element = document.querySelector('h1.profile-title');
  return element.innerText.trim();
}

function getDateFromSpan(odate) {
  const timestampRegex = /time_(\d+)/;
  for (let i = 0; i < odate.classList.length; i++) {
    const matches = odate.classList[i].match(timestampRegex);
    const timestamp = parseInt(matches[1]);
    return new Date(timestamp * 1000);
  }

  throw new Error('No time_ class in odate span');
}

function getDates(descriptionList) {
  const [wikidotDateElement, siteDateElement] = descriptionList.querySelectorAll('dd span.odate');
  const wikidotDate = getDateFromSpan(wikidotDateElement);
  const siteDate = siteDateElement ? getDateFromSpan(siteDateElement) : null;
  return { wikidotDatee, siteDate };
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
  if (date === null) {
    // date missing, not an error
    return 'none';
  }

  const days = Math.trunc(daysBetween(date, new Date()));
  return `${days} days`;
}

function insertFields(infoElement) {
  console.log('Reading fields');
  const descriptionList = infoElement.querySelector('dl.dl-horizontal');
  if (!descriptionList) {
    alert('No description list in user info area?');
    return;
  }

  const userId = getUserId();
  const username = getUsername();
  const { wikidotDate, siteDate } = getDates(infoElement);
  console.debug({ userId, username, wikidotDate, siteDate });

  // Add fields
  console.log('Inserting fields');
  addDescriptionEntry(descriptionList, 'User ID:', userId, 0);

  const wikidotDays = daysString(wikidotDate);
  const siteDays = daysString(siteDate);
  console.debug({ wikidotDays, siteDays });
  const infoLine = `${username} (W: ${wikidotDays}, S: ${siteDays}, ID: ${USER_ID})`;
  addDescriptionEntry(descriptionList, 'Info line:', infoLine, -1);
}

function main() {
  // Initial insertion of fields
  const element = document.getElementById('user-info-area');
  insertFields(element);

  // Set up observer to insert info every time the profile is switched to
  console.debug('Creating observer for user profile');
  const observer = new MutationObserver(async () => {
    const profileElement = element.querySelector('div.profile-box');
    if (profileElement !== null) {
      // This is the right tab, update
      insertFields(element);
    }
  });

  observer.observe(element, { childList: true });
}

main();

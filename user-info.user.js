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
// @version     v0.3.1
// @updateURL   https://github.com/scpwiki/user-info-script/raw/main/user-info.user.js
// @downloadURL https://github.com/scpwiki/user-info-script/raw/main/user-info.user.js
// @include     http://www.wikidot.com/user:info/*
// @include     https://www.wikidot.com/user:info/*
// @include     https://scp-wiki.wikidot.com/system:user/*
// @include     http://scp-sandbox-3.wikidot.com/system:user/*
// @include     https://scp-sandbox-3.wikidot.com/system:user/*
// @include     https://techcheck.wikidot.com/system:user/*
// ==/UserScript==

const SITE_PROFILES = {
  'SCP Wiki': 'https://scp-wiki.wikidot.com/system:user/',
  'SCP Sandbox III': 'https://scp-sandbox-3.wikidot.com/system:user/',
};

const CSS = `
#uinfo-site-days.pending {
  color: red;
}
`;

const JS = `
const UINFO = {
  updateSiteDays: async function(userId) {
    const element = document.getElementById('uinfo-site-days');
    if (element === null) {
      console.error('No #uinfo-site-days element');
      return;
    }
    const { siteDate } = await UINFO.fetchSiteDays(userId);
    element.innerText = UINFO.daysString(siteDate);
    element.removeAttribute('onclick');
    element.classList.remove('pending');
  },

  fetchSiteDays: async function(userId) {
    const response = await new Promise((resolve) => (
      OZONE.ajax.requestModule('users/UserInfoWinModule', { user_id: userId }, resolve)
    ));

    // for parsing the HTML response
    const element = document.createElement('html');
    element.innerHTML = response.body;

    // Get dates from the table
    const [wikidotElement, siteElement] = element.querySelectorAll('tr td span.odate');
    const wikidotDate = UINFO.getDateFromSpan(wikidotElement);
    const siteDate = siteElement ? UINFO.getDateFromSpan(siteElement) : null;
    console.log({ wikidotDate, siteDate });
    return { wikidotDate, siteDate };
  },

  // copied from below
  getDateFromSpan: function(odate) {
    for (let i = 0; i < odate.classList.length; i++) {
      const klass = odate.classList[i];
      if (klass.startsWith('time_')) {
        // is the time_ class
        const timestamp = parseInt(klass.substr(5));
        return new Date(timestamp * 1000);
      }
    }

    throw new Error('No time_ class in odate span');
  },

  treatAsUTC: function(date) {
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
  },

  daysBetween: function(startDate, endDate) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (UINFO.treatAsUTC(endDate) - UINFO.treatAsUTC(startDate)) / millisecondsPerDay;
  },

  daysString: function(date) {
    if (date === null) {
      // date missing, not an error
      return 'none';
    }

    const days = Math.trunc(UINFO.daysBetween(date, new Date()));
    return days + ' days';
  },
};
`;

function getUserId() {
  const element = document.querySelector('a.btn.btn-default.btn-xs');
  const userIdRegex = /https?:\/\/www\.wikidot\.com\/account\/messages#\/new\/(\d+)/;
  const matches = element.href.match(userIdRegex);
  if (matches === null) {
    throw new Error(`Private message href doesn't match regex: ${element.href}`);
  }

  return matches[1];
}

function getUserSlug() {
  let url = window.location.href;
  if (url.endsWith('/')) {
    // Trim trailing slash if present
    url = url.slice(0, -1);
  }

  // Get last URL part, containing the user slug
  return url.substring(url.lastIndexOf('/') + 1);
}

function getUsername() {
  // NOTE: This username does *not* preserve leading or trailing whitespace
  //       (The element we are extracting from here does not preserve it)
  const element = document.querySelector('h1.profile-title');
  return element.innerText.trim();
}

function getDateFromSpan(odate) {
  for (let i = 0; i < odate.classList.length; i++) {
    const klass = odate.classList[i];
    if (klass.startsWith('time_')) {
      // is the time_ class
      const timestamp = parseInt(klass.substr(5));
      return new Date(timestamp * 1000);
    }
  }

  throw new Error('No time_ class in odate span');
}

function getWikidotDate(descriptionList) {
  // only one date (user creation) for www user:info
  const element = descriptionList.querySelector('dd span.odate');
  return getDateFromSpan(element);
}

function addDescriptionEntry(descriptionList, key, value, insertIndex) {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.innerText = key;
  dd.innerHTML = value;

  if (insertIndex === -1) {
    // -1 means append to end
    descriptionList.appendChild(dt);
    descriptionList.appendChild(dd);
  } else {
    // 0+ means add at that index
    const insertBeforeElement = descriptionList.children[insertIndex];
    if (!insertBeforeElement) {
      throw new Error(`Invalid insertion index: ${insertIndex} (only ${descriptionList.children.length} items)`);
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
    throw new Error('No description list in user info area?');
  }

  const userId = getUserId();
  const userSlug = getUserSlug();
  const username = getUsername();
  const wikidotDate = getWikidotDate(infoElement);
  const wikidotDays = daysString(wikidotDate);
  console.debug({ userId, userSlug, username, wikidotDate, wikidotDays });

  // Add fields
  console.log('Inserting fields');
  addDescriptionEntry(descriptionList, 'User ID:', userId, 0);
  addDescriptionEntry(descriptionList, 'User slug:', userSlug, 2);

  const infoLine = `${username} (W: ${wikidotDays}, S: <span id="uinfo-site-days" class="pending" onclick="UINFO.updateSiteDays(${userId})">[CLICK ME]</span>, ID: ${userId})`;
  addDescriptionEntry(descriptionList, 'Info line:', infoLine, -1);

  const siteProfiles = [];
  const siteEntries = Object.entries(SITE_PROFILES);
  for (let i = 0; i < siteEntries.length; i++) {
    const [siteName, siteProfileUrl] = siteEntries[i];
    if (!window.location.href.startsWith(siteProfileUrl)) {
      // Only add if it's not the current site
      siteProfiles.push(`<a href="${siteProfileUrl}${userSlug}" target="_blank">${siteName}</a>`);
    }
  }

  if (siteProfiles.length) {
    addDescriptionEntry(descriptionList, 'Site profiles:', siteProfiles.join(', '), -1);
  }

  const userProfileLink = `<a href="javascript:WIKIDOT.page.listeners.userInfo(${userId});">Open dialog</a>`;
  addDescriptionEntry(descriptionList, 'Site member modal:', userProfileLink, -1);
}

function main() {
  // Add styling
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = CSS;
  document.head.appendChild(styleSheet);

  // Add scripts
  const scriptBlock = document.createElement('script');
  scriptBlock.type = 'text/javascript';
  scriptBlock.innerHTML = JS;
  document.head.appendChild(scriptBlock);

  // Initial insertion of fields
  const element = document.getElementById('user-info-area');
  insertFields(element);

  // Set up observer to insert info every time the profile is switched to
  console.debug('Creating observer for user profile');
  const observer = new MutationObserver(async () => {
    const profileElement = element.querySelector('div.profile-box');
    if (profileElement !== null) {
      // This is the right tab, update
      console.debug('Observer found a switch to the profile tab, updating');
      insertFields(element);
    }
  });

  observer.observe(element, { childList: true });
}

main();

/*
 * Wikidot additional user info userscript
 *
 * For installation instructions, see https://05command.wikidot.com/user-scripts
 */

// ==UserScript==
// @name        Wikidot additional user info script
// @description Adds additional user information on user information
// @version     v0.0.1
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

function addDescriptionEntry(descriptionList, key, value, insertIndex) {
  const insertBeforeElement = descriptionList.children[insertIndex];
  if (!insertBeforeElement) {
    alert(`Invalid insertion index: ${insertIndex} (only ${descriptionList.children.length} items)`);
    return;
  }

  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.innerText = key;
  dd.innerText = value;
  descriptionList.insertBefore(dt, insertBeforeElement);
  descriptionList.insertBefore(dd, insertBeforeElement);
}

function main() {
  const infoElement = document.getElementById('user-info-area');
  if (!infoElement) {
    alert('No user info area?');
    return;
  }

  const descriptionList = infoElement.querySelector('dl.dl-horizontal');
  if (!descriptionList) {
    alert('No description list in user info area?');
    return;
  }

  // Add user ID
  const userId = getUserId();
  addDescriptionEntry(descriptionList, 'User ID:', userId, 0);
}

main();

import fetch from './helper';

const apiUrl = '/api/libraries';
const inviteUsersUrl = '/api/contentActions/inviteUsers';

export function getLibrariesList() {
  return fetch(apiUrl);
}

export function addLibrary(body) {
  if (!body || !body.name) {
    return Promise.reject('Invalid body');
  }

  return fetch(apiUrl, {
    method: 'post',
    body: JSON.stringify(body),
  });
}

export function deleteLibrary(body) {
  // body is an array of ids
  if (!body || !body instanceof Array) {
    return Promise.reject('Invalid body');
  }

  return fetch(apiUrl, {
    method: 'delete',
    body: JSON.stringify(body),
  });
}

export function getInvitedUsers(libraryIds) {
  if (!libraryIds) {
    return Promise.reject('Invalid libraryIds');
  }

  const path = (libraryIds instanceof Array) ? libraryIds.join(',') : libraryIds;

  return fetch(inviteUsersUrl + '/' + path);
}

export function inviteUsers(body) {
  if (!body || !body.libraries instanceof Array) {
    return Promise.reject('Invalid body');
  }

  return fetch(inviteUsersUrl, {
    method: 'put',
    body: JSON.stringify(body),
  });
}
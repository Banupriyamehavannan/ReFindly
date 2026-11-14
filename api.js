const API_URL = "/api/items/";

function getErrorMessage(data, fallback) {
  const messages = Object.values(data)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => typeof value === "string");
  return messages.join(" ") || fallback;
}

async function getCsrfToken() {
  let token = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="))
    ?.split("=")[1];

  if (!token) {
    const response = await fetch("/api/auth/csrf/", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not start a secure session. Please try again.");
    token = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];
  }

  if (!token) throw new Error("Could not start a secure session. Please try again.");
  return decodeURIComponent(token);
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": await getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "The request could not be completed."));
  }
  return data;
}

export async function getItems({ type = "", search = "" } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search.trim()) params.set("search", search.trim());
  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error("Could not load listings. Please try again.");
  return response.json();
}

export function checkAccount(payload) {
  return postJson("/api/auth/check-account/", payload);
}

export function registerAccount(payload) {
  return postJson("/api/auth/register/", payload);
}

export function loginAccount(payload) {
  return postJson("/api/auth/login/", payload);
}

export async function getCurrentAccount() {
  const response = await fetch("/api/auth/me/", { credentials: "same-origin" });
  if (response.status === 401 || response.status === 403) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Could not load your account."));
  }
  return data;
}

export function logoutAccount() {
  return postJson("/api/auth/logout/", {});
}

export function adminLogin(payload) {
  return postJson("/api/admin/login/", payload);
}

export async function getAdminDashboard() {
  const response = await fetch("/api/admin/dashboard/", {
    credentials: "same-origin",
  });
  if (response.status === 403) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Could not load the admin dashboard."));
  }
  return data;
}

export function logoutAdmin() {
  return postJson("/api/admin/logout/", {});
}

export async function deleteAdminItem(itemId) {
  const response = await fetch(`/api/admin/items/${itemId}/`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "X-CSRFToken": await getCsrfToken() },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Could not delete the item."));
  }
}

export async function createItem(formData) {
  const response = await fetch(API_URL, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRFToken": await getCsrfToken() },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, "Could not post the item. Please check the details and try again."),
    );
  }
  return data;
}

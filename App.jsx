import { useEffect, useRef, useState } from "react";
import {
  checkAccount,
  createItem,
  getCurrentAccount,
  getAdminDashboard,
  getItems,
  adminLogin,
  deleteAdminItem,
  loginAccount,
  logoutAdmin,
  registerAccount,
} from "./api.js";
import facultyImage from "./faculty.jpg";
import heroImage from "./lf.jpg";
import logo from "./logo.jpg";
import studentImage from "./student.jpg";

const categories = {
  electronics: "Electronics",
  documents: "Documents",
  accessories: "Accessories",
  bags: "Bags",
  other: "Other",
};

const filters = [
  { value: "", label: "All items" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
];

const roleLabels = { student: "Student", faculty: "Faculty" };

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTelUri(phone) {
  const digits = phone.replace(/\D/g, "");
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

function getPageFromPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/lost_find") return "lost_find";
  if (path === "/admin-panel") return "admin_panel";
  return "home";
}

function App() {
  const [page, setPage] = useState(getPageFromPath);
  const [items, setItems] = useState([]);
  const [revealedContactId, setRevealedContactId] = useState(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [step, setStep] = useState("role");
  const [role, setRole] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [authError, setAuthError] = useState("");
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const modalRef = useRef(null);

  function navigate(nextPage) {
    const path = {
      home: "/",
      lost_find: "/lost_find",
      admin_panel: "/admin-panel",
    }[nextPage];
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function handlePopState() {
      setPage(getPageFromPath());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    getCurrentAccount()
      .then(setAccount)
      .catch((requestError) => setAuthError(requestError.message));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (modalOpen || adminLoginOpen) modalRef.current?.scrollTo({ top: 0 });
  }, [modalOpen, adminLoginOpen, step]);

  useEffect(() => {
    if (page !== "lost_find") return undefined;

    let active = true;
    setLoading(true);
    getItems({ type: filter, search: query })
      .then((data) => {
        if (active) {
          setItems(data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, filter, query]);

  useEffect(() => {
    if (page !== "admin_panel") return undefined;

    let active = true;
    setAdminLoading(true);
    setAdminError("");
    getAdminDashboard()
      .then((data) => {
        if (!active) return;
        if (data) {
          setAdminDashboard(data);
        } else {
          setAdminDashboard(null);
          setAdminLoginOpen(true);
        }
      })
      .catch((requestError) => {
        if (active) setAdminError(requestError.message);
      })
      .finally(() => {
        if (active) setAdminLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  function openItemModal() {
    setAuthError("");
    setFormError("");
    setStep(account ? "item" : "role");
    setRole("");
    setCollegeId("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function closeAdminLogin() {
    setAdminLoginOpen(false);
    if (page === "admin_panel" && !adminDashboard) navigate("home");
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAdminActionLoading(true);
    setAdminLoginError("");
    try {
      await adminLogin({
        username: formData.get("username"),
        password: formData.get("password"),
      });
      setAdminLoginOpen(false);
      navigate("admin_panel");
    } catch (requestError) {
      setAdminLoginError(requestError.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleAdminLogout() {
    setAdminActionLoading(true);
    setAdminError("");
    try {
      await logoutAdmin();
      setAdminDashboard(null);
      navigate("home");
    } catch (requestError) {
      setAdminError(requestError.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleDeleteAdminItem(item) {
    if (!window.confirm(`Delete "${item.item_name}"? This cannot be undone.`)) return;

    setDeletingItemId(item.id);
    setAdminError("");
    try {
      await deleteAdminItem(item.id);
      const data = await getAdminDashboard();
      if (data) {
        setAdminDashboard(data);
      } else {
        setAdminDashboard(null);
        setAdminLoginOpen(true);
      }
    } catch (requestError) {
      setAdminError(requestError.message);
    } finally {
      setDeletingItemId(null);
    }
  }

  function handleNavigation(event, nextPage) {
    event.preventDefault();
    navigate(nextPage);
  }

  async function handleAccountCheck(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("college_id").trim();
    setCollegeId(id);
    setAccountLoading(true);
    setAuthError("");

    try {
      const result = await checkAccount({ college_id: id, role });
      if (result.exists && !result.role_matches) {
        setAuthError(
          `This College ID is registered as a ${roleLabels[result.registered_role] || "different"} account. Select the matching account type.`,
        );
        return;
      }
      setStep(result.exists ? "login" : "register");
    } catch (requestError) {
      setAuthError(requestError.message);
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = formData.get("full_name").trim();
    const password = formData.get("password");
    if (password !== formData.get("confirm_password")) {
      setAuthError("The passwords do not match.");
      return;
    }

    setSaving(true);
    setAuthError("");
    try {
      const signedInAccount = await registerAccount({
        college_id: collegeId,
        full_name: fullName,
        role,
        password,
      });
      setAccount(signedInAccount);
      setStep("item");
    } catch (requestError) {
      setAuthError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setAuthError("");
    try {
      const signedInAccount = await loginAccount({
        college_id: collegeId,
        role,
        password: formData.get("password"),
      });
      setAccount(signedInAccount);
      setStep("item");
    } catch (requestError) {
      setAuthError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setFormError("");
    try {
      await createItem(new FormData(form));
      form.reset();
      closeModal();
      if (page !== "lost_find") {
        navigate("lost_find");
      } else {
        setItems(await getItems({ type: filter, search: query }));
      }
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  function goBackInModal() {
    setAuthError("");
    if (step === "account") {
      setStep("role");
      setRole("");
    } else if (step === "login" || step === "register") {
      setStep("account");
    }
  }

  const modalTitle = {
    role: "Choose your account type",
    account: `${roleLabels[role]} account`,
    login: "Welcome back",
    register: "Create your account",
    item: "Register an item",
  }[step];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(event) => handleNavigation(event, "home")}
          aria-label="ReFindly home"
        >
          <img className="brand-mark" src={logo} alt="" />
          <span>ReFindly<span className="brand-dot">.</span></span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a
            className={page === "home" ? "nav-active" : ""}
            href="/"
            onClick={(event) => handleNavigation(event, "home")}
          >
            Home
          </a>
          <a
            className={page === "lost_find" ? "nav-active" : ""}
            href="/lost_find"
            onClick={(event) => handleNavigation(event, "lost_find")}
          >
            Lost &amp; Found
          </a>
          <a
            className={page === "admin_panel" ? "nav-active" : ""}
            href="/admin-panel"
            onClick={(event) => {
              event.preventDefault();
              setAdminLoginError("");
              setAdminLoginOpen(true);
            }}
          >
            Admin Panel
          </a>
        </nav>
        <button className="button button-dark top-cta" onClick={openItemModal}>
          <span aria-hidden="true">＋</span> Register an item
        </button>
      </header>

      <main>
        {page === "home" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> OUR COMMUNITY. HERE TO HELP.</div>
                <h1>Lost things<br />find their way<span className="hero-period">.</span></h1>
                <p className="hero-description">
                  ReFindly helps students and faculty report lost items and return
                  found belongings to the people who need them.
                </p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={openItemModal}>
                    Register an item
                  </button>
                  <a
                    className="text-link"
                    href="/lost_find"
                    onClick={(event) => handleNavigation(event, "lost_find")}
                  >
                    Browse lost &amp; found <span aria-hidden="true">↓</span>
                  </a>
                </div>
                <div className="community-note">
                  <div className="avatar-stack" aria-hidden="true"><span>S</span><span>F</span><span>R</span></div>
                  <span>A community that cares</span>
                </div>
              </div>
              <div className="hero-art" aria-label="Lost and found items">
                <div className="art-sun" />
                <div className="art-circle art-circle-one" />
                <div className="art-circle art-circle-two" />
                <img className="hero-image" src={heroImage} alt="Lost and found" />
                <div className="art-note art-note-right">Found together <span>↗</span></div>
                <div className="art-sparkle sparkle-one">✳</div>
                <div className="art-sparkle sparkle-two">✦</div>
              </div>
              <div className="hero-bottom">
                <span>01 — COMMUNITY FIRST</span>
                <span>A small post can make a big difference.</span>
              </div>
            </section>

            <section className="how-section" id="how-it-works">
              <div className="how-intro">
                <div className="section-kicker">SIMPLE. MEANINGFUL.</div>
                <h2>Three steps<br />to help.</h2>
              </div>
              <div className="how-step"><span>01</span><div><h3>Register an item</h3><p>Sign in as a student or faculty member and share the details.</p></div></div>
              <div className="how-step"><span>02</span><div><h3>Browse listings</h3><p>Search lost and found items by name or category.</p></div></div>
              <div className="how-step"><span>03</span><div><h3>Make a connection</h3><p>Contact the person who posted and help return the item.</p></div></div>
            </section>
          </>
        ) : page === "lost_find" ? (
          <section className="listings-section" id="listings">
            <div className="section-heading">
              <div>
                <div className="section-kicker">CAMPUS COMMUNITY LISTINGS</div>
                <h1>Lost &amp; found <span>items</span></h1>
              </div>
              <div className="listing-count">{items.length.toString().padStart(2, "0")} <span>items</span></div>
            </div>

            <div className="toolbar">
              <div className="filter-tabs" role="group" aria-label="Filter listings">
                {filters.map((option) => (
                  <button
                    key={option.value}
                    className={`filter-tab ${filter === option.value ? "selected" : ""}`}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search items..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search items"
                />
                <span className="search-shortcut">⌘ K</span>
              </label>
            </div>

            {error && <div className="notice error-notice">{error}</div>}
            {loading ? (
              <div className="empty-state"><span className="loader" /> Loading listings...</div>
            ) : items.length ? (
              <div className="item-grid">
                {items.map((item) => (
                  <article className={`item-card ${item.status === "resolved" ? "item-resolved" : ""}`} key={item.id}>
                    <div className="item-visual">
                      {item.image ? (
                        <img src={item.image} alt={item.item_name} />
                      ) : (
                        <div className={`item-placeholder placeholder-${item.category}`}>
                          <span className="placeholder-symbol">
                            {item.category === "electronics" ? "⌁" : item.category === "documents" ? "▤" : item.category === "bags" ? "▣" : "✳"}
                          </span>
                          <span className="placeholder-word">{categories[item.category] || "Item"}</span>
                        </div>
                      )}
                      <span className={`type-badge ${item.item_type}`}>
                        <span />{item.item_type === "lost" ? "Lost" : "Found"}
                      </span>
                      {item.status === "resolved" && <span className="resolved-badge">Resolved</span>}
                    </div>
                    <div className="item-content">
                      <div className="item-meta">{categories[item.category] || "Other"} <span>·</span> {formatDate(item.date)}</div>
                      <h2>{item.item_name}</h2>
                      <p className="item-description">{item.description}</p>
                      <div className="item-location"><span aria-hidden="true">⌖</span> {item.location}</div>
                      <div className="item-footer">
                        <span className="contact-name"><span className="contact-avatar">{item.contact_name?.charAt(0)}</span>{item.contact_name}</span>
                        <button
                          className="contact-link"
                          type="button"
                          aria-expanded={revealedContactId === item.id}
                          aria-controls={`contact-${item.id}`}
                          onClick={() => setRevealedContactId(
                            revealedContactId === item.id ? null : item.id,
                          )}
                        >
                          Contact <span aria-hidden="true">↗</span>
                        </button>
                      </div>
                      <div
                        className="contact-details"
                        id={`contact-${item.id}`}
                        hidden={revealedContactId !== item.id}
                      >
                        <span>{item.contact_phone}</span>
                        <a href={`tel:${getTelUri(item.contact_phone)}`}>Call</a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">⌕</span>
                <strong>No listings yet</strong>
                <span>Be the first to register an item and help someone in your community.</span>
                <button className="button button-primary" onClick={openItemModal}>Register an item</button>
              </div>
            )}
          </section>
        ) : (
          <section className="admin-section">
            <div className="section-heading admin-heading">
              <div>
                <div className="section-kicker">REFINDLY ADMINISTRATION</div>
                <h1>Admin <span>dashboard</span></h1>
              </div>
              <button
                className="button button-dark"
                onClick={handleAdminLogout}
                disabled={adminActionLoading}
              >
                {adminActionLoading ? "Please wait..." : "Sign out"}
              </button>
            </div>

            {adminError && <div className="notice error-notice">{adminError}</div>}
            {adminLoading ? (
              <div className="empty-state"><span className="loader" /> Loading admin data...</div>
            ) : adminDashboard ? (
              <>
                <div className="admin-stats">
                  <article className="admin-stat"><span>Students</span><strong>{adminDashboard.counts.students}</strong></article>
                  <article className="admin-stat"><span>Faculty</span><strong>{adminDashboard.counts.faculty}</strong></article>
                  <article className="admin-stat"><span>Found items</span><strong>{adminDashboard.counts.found_items}</strong></article>
                  <article className="admin-stat"><span>Lost items</span><strong>{adminDashboard.counts.lost_items}</strong></article>
                  <article className="admin-stat"><span>Total items</span><strong>{adminDashboard.counts.total_items}</strong></article>
                </div>

                <div className="admin-items-heading">
                  <h2>All listings</h2>
                  <span>{adminDashboard.items.length} items</span>
                </div>
                {adminDashboard.items.length ? (
                  <div className="admin-items">
                    {adminDashboard.items.map((item) => (
                      <article className="admin-item" key={item.id}>
                        <div className="admin-item-info">
                          <span className={`admin-type ${item.item_type}`}>
                            {item.item_type === "lost" ? "Lost" : "Found"}
                          </span>
                          <strong>{item.item_name}</strong>
                          <span>{item.location} · {formatDate(item.date)}</span>
                        </div>
                        <button
                          className="button admin-delete-button"
                          onClick={() => handleDeleteAdminItem(item)}
                          disabled={deletingItemId === item.id}
                        >
                          {deletingItemId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">There are no listings to manage.</div>
                )}
              </>
            ) : (
              !adminError && <div className="empty-state">Sign in to view the admin dashboard.</div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <a
          className="brand footer-brand"
          href="/"
          onClick={(event) => handleNavigation(event, "home")}
        >
          <img className="brand-mark" src={logo} alt="" />
          <span>ReFindly<span className="brand-dot">.</span></span>
        </a>
        <span>What goes around, comes around. <span className="footer-heart">♥</span></span>
        <span>© 2026 ReFindly</span>
      </footer>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <div>
                <div className="modal-brand">
                  <img src={logo} alt="" />
                  <span>ReFindly</span>
                </div>
                <div className="section-kicker">REFINDLY CAMPUS COMMUNITY</div>
                <h2 id="modal-title">{modalTitle}</h2>
              </div>
              <button className="close-button" onClick={closeModal} aria-label="Close">×</button>
            </div>

            {step !== "role" && step !== "item" && (
              <button className="modal-back-button" onClick={goBackInModal}>← Back</button>
            )}

            {step === "role" && (
              <div className="auth-content">
                <p className="auth-description">Choose your role to continue.</p>
                <div className="role-options">
                  <button className="role-choice" onClick={() => { setRole("student"); setStep("account"); }}>
                    <img className="role-icon" src={studentImage} alt="" />
                    <strong>Student</strong>
                    <span>Continue as a student</span>
                  </button>
                  <button className="role-choice" onClick={() => { setRole("faculty"); setStep("account"); }}>
                    <img className="role-icon" src={facultyImage} alt="" />
                    <strong>Faculty</strong>
                    <span>Continue as faculty</span>
                  </button>
                </div>
              </div>
            )}

            {step === "account" && (
              <form className="item-form" onSubmit={handleAccountCheck}>
                <p className="auth-description">
                  Enter your College ID. We’ll check whether you already have a {roleLabels[role]} account.
                </p>
                <label>College ID
                  <input
                    name="college_id"
                    value={collegeId}
                    onChange={(event) => setCollegeId(event.target.value)}
                    autoCapitalize="characters"
                    required
                  />
                </label>
                {authError && <div className="notice error-notice">{authError}</div>}
                <button className="button button-primary submit-button" type="submit" disabled={accountLoading}>
                  {accountLoading ? "Checking..." : "Continue"}
                </button>
              </form>
            )}

            {step === "login" && (
              <form className="item-form" onSubmit={handleLogin}>
                <p className="auth-description">
                  An account was found for <strong>{collegeId}</strong>. Sign in as {roleLabels[role]}.
                </p>
                <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
                {authError && <div className="notice error-notice">{authError}</div>}
                <button className="button button-primary submit-button" type="submit" disabled={saving}>
                  {saving ? "Signing in..." : "Sign in"}
                </button>
              </form>
            )}

            {step === "register" && (
              <form className="item-form" onSubmit={handleRegister}>
                <p className="auth-description">
                  No account was found for <strong>{collegeId}</strong>. Create a {roleLabels[role]} account.
                </p>
                <label>Full name<input name="full_name" maxLength="150" autoComplete="name" required /></label>
                <div className="form-row">
                  <label>Password<input name="password" type="password" minLength="8" autoComplete="new-password" required /></label>
                  <label>Confirm password<input name="confirm_password" type="password" minLength="8" autoComplete="new-password" required /></label>
                </div>
                {authError && <div className="notice error-notice">{authError}</div>}
                <button className="button button-primary submit-button" type="submit" disabled={saving}>
                  {saving ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}

            {step === "item" && (
              <form className="item-form" onSubmit={handleSubmitItem}>
                <p className="auth-description">
                  Signed in as {account?.full_name || account?.college_id} ({roleLabels[account?.role] || "Member"}).
                </p>
                <div className="form-type">
                  <label><input type="radio" name="item_type" value="lost" defaultChecked /><span>Lost</span></label>
                  <label><input type="radio" name="item_type" value="found" /><span>Found</span></label>
                </div>
                <label>Item name<input name="item_name" maxLength="120" placeholder="e.g. Black wallet" required /></label>
                <label>Category
                  <select name="category" defaultValue="other" required>
                    {Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
                <label>Description<textarea name="description" maxLength="1000" rows="3" placeholder="Describe the item, including its color and identifying details..." required /></label>
                <div className="form-row">
                  <label>Location<input name="location" maxLength="180" placeholder="Place or area" required /></label>
                  <label>Date<input name="date" type="date" required /></label>
                </div>
                <div className="form-row">
                  <label>Your name<input name="contact_name" maxLength="100" defaultValue={account?.full_name || ""} required /></label>
                  <label>Phone number<input name="contact_phone" type="tel" maxLength="20" placeholder="10-digit phone number" required /></label>
                </div>
                <label>Photo <span className="optional-label">(optional)</span><input name="image" type="file" accept="image/*" /></label>
                {formError && <div className="notice error-notice">{formError}</div>}
                <button className="button button-primary submit-button" type="submit" disabled={saving}>
                  {saving ? "Posting..." : "Post listing"} <span aria-hidden="true">↗</span>
                </button>
                <p className="privacy-note">Your phone number will be visible on this listing.</p>
              </form>
            )}
          </section>
        </div>
      )}

      {adminLoginOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeAdminLogin();
        }}>
          <section className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
            <div className="modal-header">
              <div>
                <div className="modal-brand">
                  <img src={logo} alt="" />
                  <span>ReFindly</span>
                </div>
                <div className="section-kicker">ADMINISTRATION</div>
                <h2 id="admin-login-title">Admin sign in</h2>
              </div>
              <button className="close-button" onClick={closeAdminLogin} aria-label="Close">×</button>
            </div>
            <form className="item-form" onSubmit={handleAdminLogin}>
              <label>Username<input name="username" autoComplete="username" required /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
              {adminLoginError && <div className="notice error-notice">{adminLoginError}</div>}
              <button className="button button-primary submit-button" type="submit" disabled={adminActionLoading}>
                {adminActionLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;

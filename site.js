/* TrustNest site-wide helpers.
   Sign-in UI lives in auth.js (the "Sign In" button in the nav).
   window.TrustNestUser() returns the signed-in student { name, email, college }
   or null, so pages can prefill names on letters, reviews and reports. */
(function () {
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  window.TrustNestUser = function () {
    var s = read("tn_auth_session") || read("tn_user");
    if (!s || !s.name) return null;
    var email = s.email || "";
    return { name: s.name, email: email, college: /\.(edu|ac)(\.[a-z]{2})?$/i.test(email.split("@")[1] || "") };
  };
  // clean up the old demo sign-in so it doesn't linger
  try { localStorage.removeItem("tn_user"); } catch (e) {}
})();

/**
 * cloud.js — Google sign-in and Realtime Database sync.
 *
 * Each signed-in Google account gets one private node at users/{uid}.
 * Local typing still writes to localStorage immediately; cloud writes are
 * debounced. A live listener applies the other device's saves as they happen.
 *
 * Depends on: firebase-config.js, Firebase compat SDK, state.js, main.js
 * (rerenderAllFromState — resolved when auth events fire).
 */

var CLOUD_SAVE_DELAY_MS = 900;
var cloudUser = null;
var cloudSaveTimer = null;
var skipCloudSave = false;
var firebaseAppReady = false;
var cloudDb = null;
var cloudAuth = null;
var liveUserRef = null;
var lastWriteAt = 0;
var applyingRemote = false;

function isFirebaseConfigured(){
  return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.apiKey.indexOf("PASTE_") !== 0 && FIREBASE_CONFIG.apiKey.length > 8);
}

function userRef(){
  if (!cloudDb || !cloudUser) return null;
  return cloudDb.ref("users/" + cloudUser.uid);
}

function setAuthStatus(text){
  var node = el("auth-status");
  if (node) node.textContent = text || "";
}

function renderAuthBar(){
  var signIn = el("btn-sign-in");
  var userBox = el("auth-user");
  if (!signIn || !userBox) return;

  if (!cloudUser){
    signIn.hidden = false;
    userBox.hidden = true;
    if (el("auth-hint") && !el("auth-hint").classList.contains("error")){
      setAuthHint("Use the same Google account on every device.");
    }
    return;
  }

  signIn.hidden = true;
  userBox.hidden = false;
  setAuthHint("");
  el("auth-name").textContent = cloudUser.displayName || cloudUser.email || "Signed in";
  var photo = el("auth-photo");
  if (cloudUser.photoURL){
    photo.src = cloudUser.photoURL;
    photo.hidden = false;
  } else {
    photo.removeAttribute("src");
    photo.hidden = true;
  }
}

function payloadFromState(){
  return JSON.parse(JSON.stringify(STATE));
}

function scheduleCloudSave(){
  if (skipCloudSave || applyingRemote || !firebaseAppReady || !cloudUser) return;
  setAuthStatus("Saving…");
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(flushCloudSave, CLOUD_SAVE_DELAY_MS);
}

function flushCloudSave(){
  if (cloudSaveTimer){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = null;
  }
  var ref = userRef();
  if (!cloudUser || !ref) return Promise.resolve();
  lastWriteAt = Date.now();
  return ref.set({
    data: payloadFromState(),
    updatedAt: lastWriteAt
  }).then(function(){
    setAuthStatus("Saved to your Google account");
  }).catch(function(err){
    console.warn("Cloud save failed", err);
    var hint = (err && err.message) ? err.message : "Couldn't reach the cloud";
    setAuthStatus("Cloud save failed — still saved on this device");
    if (/permission|denied|401|403/i.test(hint)){
      window.alert(
        "Google signed in, but the database blocked the save.\n\n" +
        "In Firebase: Realtime Database → Rules, paste the rules from database.rules.json and Publish."
      );
    }
  });
}

function applyCloudState(cloudState){
  skipCloudSave = true;
  applyingRemote = true;
  replaceState(JSON.parse(JSON.stringify(cloudState)));
  rerenderAllFromState();
  skipCloudSave = false;
  applyingRemote = false;
}

function cloudRecord(snap){
  var val = snap && snap.val ? snap.val() : null;
  if (!val || !val.data) return null;
  return val;
}

function syncOnSignIn(){
  var ref = userRef();
  if (!ref) return Promise.resolve();
  setAuthStatus("Loading your data…");
  return ref.once("value").then(function(snap){
    var rec = cloudRecord(snap);
    var cloudState = rec ? rec.data : null;
    var cloudHas = stateHasUserData(cloudState);
    var localHas = stateHasUserData(STATE);

    if (rec && rec.updatedAt) lastWriteAt = rec.updatedAt;

    var pending = Promise.resolve();
    if (cloudHas && localHas && statesDiffer(STATE, cloudState)){
      var useCloud = window.confirm(
        "This Google account already has saved restaurant data, and this device has different numbers.\n\n" +
        "OK = load the cloud copy (typical on a new phone or laptop).\n" +
        "Cancel = keep this device's numbers and overwrite the cloud."
      );
      if (useCloud) applyCloudState(cloudState);
      else pending = flushCloudSave();
    } else if (cloudHas && !localHas){
      applyCloudState(cloudState);
    } else if (localHas && !cloudHas){
      pending = flushCloudSave();
    }
    return pending.then(function(){
      setAuthStatus("Saved to your Google account");
      startLiveSync();
    });
  }).catch(function(err){
    console.warn("Cloud load failed", err);
    setAuthStatus("Couldn't load cloud data — using this device");
    startLiveSync();
  });
}

function startLiveSync(){
  var ref = userRef();
  if (!ref) return;
  stopLiveSync();
  liveUserRef = ref;
  liveUserRef.on("value", function(snap){
    if (applyingRemote || skipCloudSave) return;
    var rec = cloudRecord(snap);
    if (!rec) return;
    if (rec.updatedAt && rec.updatedAt === lastWriteAt) return;
    if (!stateHasUserData(rec.data)) return;
    if (!statesDiffer(STATE, rec.data)){
      if (rec.updatedAt) lastWriteAt = rec.updatedAt;
      return;
    }
    lastWriteAt = rec.updatedAt || Date.now();
    applyCloudState(rec.data);
    setAuthStatus("Updated from another device");
  });
}

function stopLiveSync(){
  if (liveUserRef){
    liveUserRef.off("value");
    liveUserRef = null;
  }
}

function setAuthHint(text, isError){
  var node = el("auth-hint");
  if (!node) return;
  node.textContent = text || "";
  node.classList.toggle("error", !!isError);
}

function authErrorMessage(err){
  var code = err && err.code;
  if (code === "auth/unauthorized-domain"){
    return "This site's domain isn't allowed yet. In Firebase: Authentication → Settings → Authorized domains, add localhost and seasonkhadka.github.io.";
  }
  if (code === "auth/operation-not-allowed"){
    return "Google sign-in is not enabled yet. In Firebase: Authentication → Sign-in method → Google → Enable.";
  }
  if (code === "auth/popup-blocked"){
    return "The sign-in popup was blocked. Allow popups, or wait — retrying without a popup.";
  }
  if (code === "auth/popup-closed-by-user") return "";
  if (code === "auth/unauthorized-continue-uri"){
    return "Add seasonkhadka.github.io under Firebase Authentication → Authorized domains.";
  }
  return (err && err.message) || "Sign-in failed.";
}

function googleProvider(){
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function signInWithGoogle(){
  if (!isFirebaseConfigured() || !cloudAuth){
    setAuthHint("Cloud save is not connected yet.", true);
    return;
  }
  var provider = googleProvider();
  el("btn-sign-in").disabled = true;
  setAuthHint("Opening Google…");
  // Popups are blocked on GitHub Pages and most phones. Redirect is reliable.
  cloudAuth.signInWithRedirect(provider).catch(function(err){
    el("btn-sign-in").disabled = false;
    var msg = authErrorMessage(err);
    if (msg){
      setAuthHint(msg, true);
      window.alert(msg);
    }
  });
}

function signOutGoogle(){
  if (cloudSaveTimer){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = null;
  }
  stopLiveSync();
  if (!cloudAuth) return;
  return flushCloudSave().then(function(){
    return cloudAuth.signOut();
  }).catch(function(){
    return cloudAuth.signOut();
  });
}

function initCloud(){
  renderAuthBar();
  el("btn-sign-in").addEventListener("click", signInWithGoogle);
  el("btn-sign-out").addEventListener("click", signOutGoogle);

  if (!isFirebaseConfigured()) return;
  if (typeof firebase === "undefined"){
    console.warn("Firebase SDK failed to load.");
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  cloudAuth = firebase.auth();
  cloudDb = firebase.database();
  firebaseAppReady = true;

  cloudAuth.getRedirectResult().catch(function(err){
    el("btn-sign-in").disabled = false;
    var msg = authErrorMessage(err);
    if (msg) setAuthHint(msg, true);
  });

  cloudAuth.onAuthStateChanged(function(user){
    cloudUser = user || null;
    renderAuthBar();
    if (cloudUser) syncOnSignIn();
    else {
      stopLiveSync();
      setAuthStatus("");
    }
  });
}

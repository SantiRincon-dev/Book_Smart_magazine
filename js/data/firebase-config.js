/**
 * FIREBASE: the project the live counters talk to (see js/live.js).
 *
 * A plain script (it only sets a global), like the manifest, so it works when a
 * page is opened by double click. These values are NOT secrets: a Firebase web
 * app's keys are public by design and identify the project; what protects the
 * data is the rules file (firestore.rules), which must be published in the
 * Firebase console (Firestore Database > Rules).
 *
 *   enabled   false turns the live counters off: every counter then works from
 *             this browser alone (localStorage), exactly as before.
 *   version   the Firebase JS SDK that is loaded from Google's CDN.
 */
window.BOOK_SMART_FIREBASE = {
  enabled: true,
  version: '12.12.0',
  config: {
    apiKey: "AIzaSyAIfeqkzMJnGoj1_0e5VmbCdnyY1Coalms",
    authDomain: "magazine-votes.firebaseapp.com",
    projectId: "magazine-votes",
    storageBucket: "magazine-votes.firebasestorage.app",
    messagingSenderId: "233827381729",
    appId: "1:233827381729:web:77b57b5524002b00e1e2a0",
    measurementId: "G-6F9PWNKE59"
  }
};

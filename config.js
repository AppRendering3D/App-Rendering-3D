/* Collegamento al database Firebase delle app 3D (progetto «App 3D»).
   Questi valori non sono segreti: servono al sito per sapere a quale progetto collegarsi.
   La protezione dei dati sta nelle regole del database (firestore.rules). */
window.APP3D_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC-OqNF1Ag6RHT_KpExcD_h6_UHuwLgDD4',
  authDomain: 'apprendering3d.firebaseapp.com',
  projectId: 'apprendering3d',
  storageBucket: 'apprendering3d.firebasestorage.app',
  messagingSenderId: '740096788257',
  appId: '1:740096788257:web:12e840958c28ffd1f6e060'
};

/* App che si aprono senza email e password (per ora nessuna; possibili: 'casa', 'bordo').
   Deve corrispondere alla funzione libera() in firestore.rules. */
window.APP3D_LIBERE = [];

/* Modello di Gemini usato dall'AI (Firebase › AI Logic). Se Google lo ritira, basta cambiare il nome qui. */
window.APP3D_AI_MODEL = 'gemini-3.8-flash';

/* ID della chiave reCAPTCHA Enterprise (Google Cloud Fraud Defense) per App Check: senza, Gemini rifiuta le richieste.
   È una chiave pubblica: nessuna chiave segreta va messa qui. */
window.APP3D_RECAPTCHA = '';

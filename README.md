# App 3D

Sito con due app, separato da qualsiasi altro sito:

- **Casa Nuova 3D** (`casa/`): archivio di case. Ogni casa ha pianta, arredi, impianti e vista 3D. «Nuova casa da planimetria» parte da zero e tiene le case precedenti.
- **Bordo 3D** (`bordo/`): archivio di barche con carena 3D, interni, impianti e preventivi.

I dati stanno su Firebase (progetto «App 3D»). Si entra con email e password.
Il primo che si registra diventa amministratore; gli altri aspettano l'approvazione e
l'amministratore sceglie a quali app può entrare ognuno (Home › Persone e permessi).

## File

| File | A cosa serve |
|---|---|
| `index.html` | Home: scelta dell'app, persone e permessi, account |
| `config.js` | Collegamento al progetto Firebase (dati non segreti) |
| `fb3d.js` | Accesso, approvazione, permessi e salvataggio su Firebase |
| `firestore.rules` | Regole del database: da incollare in Firebase › Firestore › Regole |
| `casa/` | Casa Nuova 3D, con le foto del catalogo in `casa/foto/` |
| `bordo/` | Bordo 3D |

## Portare i dati dalle app su Claude

- Casa: nell'app su Claude, Progetto › «Esporta copia del progetto». Sul sito, archivio › «Importa una copia (file)».
- Bordo: nella barca su Claude, «Esporta copia». Sul sito, archivio › «Importa».

## Cosa non c'è sul sito

La lettura automatica delle misure dalle foto dei mobili usa Claude: sul sito la foto si
aggiunge lo stesso, le misure si scrivono a mano.

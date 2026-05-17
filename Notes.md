# PROGETTO WEB SICURO E PERSONALIZZATO

Piccolo progetto per dimostrare alcune vulnerabilità viste a lezione.
Il prototipo è una applicazione di una lavanderia, gestita da un amministratore.
L'amministratore può vedere chi ha prenotato il lavaggio, e potenzialmente cancellare la sua prenotazione o terminare un lavaggio.

Gli utenti possono solo prenotare un lavaggio o una asgiugatura se c'è disponibilità.
Gli utenti possono anche lasciare un commento o una nota per segnalare dei malfunzionamenti.

Attualmente nella lavanderia sono disponibili solo 2 lavatrici e 1 asciugatrice.

---

## TECH STACK
### Back-end
* SQLite
* Python + Flsk come framework 
### Front-end

* HTML
* CSS
* Javascript

DEPENDENCIES
```
pip install flask
```

STRUTTURA DELLA CARTELLA
```
Versione-vulnerabile/
├── app.py               # Server principale (inizializza l'app e registra i moduli)
├── laundry.db           # Database SQLite
└── api/
    ├── auth.py          # Gestione autenticazione
    ├── machines.py      # Gestione lavatrici/asciugatrici e prenotazioni
    └── notes.py         # Gestione bacheca segnalazioni
```


TODO:

* creazione della rotta profilo: es. mostrare le prenotazioni recenti
* per il profilo admin: mostrare tutte le prenotazioni

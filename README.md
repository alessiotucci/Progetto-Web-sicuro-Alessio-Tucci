# Progetto-Web-sicuro-Alessio-Tucci
Progetto universitario (secure web): dimostrazione di almeno un attacco e relativo meccanismo di difesa tra quelli affrontati durante il corso  Ciascun progetto dovrà essere accompagnato da una breve relazione che illustri e motivi le scelte fatte.


---
## Lavanderia del collegio
This small web-app is made by Alessio Tucci to showcase some web vulnerabilities. 

### SQLite - Database 
#### Resources:

### Python + Flask - Backend
#### Resources:

### Javascript - Frontend
#### Resources: 

## CRUD PART
### 2. Tabella di Pianificazione CRUD

| **Entità (Tabella)** | **Create (POST)** | **Read (GET)** | **Update (PUT/PATCH)** | **Delete (DELETE)** |
| --- | --- | --- | --- | --- |
| **Users** | Registrazione `User` | Lista completa (`Admin`) | Modifica permessi (`Admin`) | Cancella utente (`Admin`) |
| **Machines** | Aggiunge macchina (`Admin`) | Stato di tutte (`User/Admin`) | Modifica stato (`Admin`) | Rimuove macchina (`Admin`) |
| **Session** | Nuova prenotazione (`User/Admin`) | Storico globale (`Admin`), Personale (`User`) | Modifica orario (`Admin`) | Annulla prenotazione (`User/Admin`) |
| **Notes** | Nuova nota (`User/Admin`) | Lista note (`User/Admin`) | -   | Cancella nota (`Admin`) |

### 3. Db schema
<img width="749" height="372" alt="image" src="https://github.com/user-attachments/assets/f61cbdc2-9835-44ce-a37f-4dcbefb11e3e" />

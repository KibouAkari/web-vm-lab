# Cloud VM Starter – Azure Web Lab

Dieses Projekt ermöglicht es, virtuelle Maschinen (VMs) in Azure direkt über eine Web-Oberfläche zu starten, zu stoppen, zu verlängern und zu löschen. Es besteht aus einem **Frontend (Next.js)** und einem **Backend (Azure Functions)**.

---

## Projektstruktur

```
web-vm-lab/
│
├── frontend/   # Next.js Web-App
│   ├── src/app/...
│   ├── .env.local.example
│   ├── README.md
│   └── ...
│
├── backend/    # Azure Functions API
│   ├── src/functions/vmManager.js
│   ├── src/functions/vmCleanup/
│   ├── local.settings.example.json
│   ├── README.md
│   └── ...
│
└── README.md   # Dieses Dokument
```

---

## Features

- **VM Lifecycle Management:**  
  Starte, stoppe, lösche und verlängere Azure VMs per Web-Interface.
- **Automatische VM-Löschung:**  
  VMs werden nach Ablauf automatisch entfernt (Timer-Trigger).
- **Status-Abfrage:**  
  Zeigt VM-Status, IP-Adresse und OS-Typ an.
- **Sicherheitsfeatures:**  
  Temporäre Passwörter, Firewall nur für Benutzer-IP.
- **Cloud-init/Setup:**  
  Automatische Konfiguration für Linux und Windows VMs.
- **Logging & Error Handling:**  
  Alle Aktionen werden geloggt, Fehler werden ans Frontend zurückgegeben.

---

## Schnellstart

### 1. **Backend lokal starten**

```sh
cd backend
npm install
cp local.settings.example.json local.settings.json
# Trage deine Azure-Daten ein
func start
```

### 2. **Frontend lokal starten**

```sh
cd frontend
npm install
cp .env.local.example .env.local
# Trage die API-URL deiner Azure Function ein
npm run dev
```

### 3. **Deployment**

- **Backend:**  
  Mit Azure CLI oder VS Code Extension deployen.  
  Secrets im Azure Portal unter "Configuration" setzen.
- **Frontend:**  
  Mit Azure Static Web Apps oder App Service deployen.  
  API-URL als Umgebungsvariable setzen.

---

## Hinweise zur Sicherheit

- **Secrets niemals committen!**  
  `.env.local` und `local.settings.json` sind in `.gitignore`.
- **Produktiv:**  
  VM-Daten sollten in einer Datenbank gespeichert werden (z.B. Azure Table Storage).

---

## Weitere Infos

- **Frontend:** Siehe `frontend/README.md`
- **Backend:** Siehe `backend/README.md`

---

**Fragen oder Probleme?**  
Erstelle ein Issue

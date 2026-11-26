# Nexora CRM Prototype Documentation

## Overview

Nexora CRM is a bespoke recruitment and staffing CRM platform designed specifically for Nexora Staffing LLP. It provides an intuitive, high-performance interface for managing candidates, client accounts, open requisitions, pipeline workflows, and team access.

---

## Architecture & Views

### 1. Dashboard (`/`)
- **Key Metrics (KPIs):** Active Leads, Talent Pool Size, Open Jobs, Monthly Placements.
- **Pipeline Snapshot:** Real-time visual distribution of candidates across recruitment stages.
- **Tasks & Reminders:** Urgent and daily recruiting follow-ups.
- **Activity Stream:** Audit-tracked team actions.

### 2. Leads Management (`/leads`)
- Tracking and qualification of new prospective client companies and recruitment mandates.
- Conversion workflow turning prospective leads into active clients and job requisitions.

### 3. Candidate Database (`/candidates`)
- Complete talent profiles with skills, experience, location, and contact information.
- Quick filtering by role, location, and pipeline stage.

### 4. Jobs / Requisitions (`/jobs`)
- Management of active client hiring mandates.
- Application and applicant tracking per opening.

### 5. Visual Pipeline / Kanban (`/pipeline`)
- Interactive drag-and-drop board for candidate stages:
  1. **New**
  2. **Screening**
  3. **Interview**
  4. **Offer**
  5. **Placed**

### 6. Client Accounts (`/clients`)
- Client company directory with industry tags, assigned account managers, and open job counters.

### 7. Import & Export (`/import`)
- Multi-format data exchange supporting CSV and Excel (`.xlsx`) formats.
- Sample template generator and import history logging.

### 8. Safe Profile Links (`/profiles`)
- SSRF-safe URL storage and preview cards for LinkedIn, GitHub, and portfolio URLs.
- **Zero-scraping guarantee:** Complies with platform terms of service by storing normalized URLs and user-entered metadata only.

### 9. Tasks & Notes (`/tasks`, `/notes`)
- Recruiter reminders and shared context notes attached to talent and client records.

### 10. Team, Security & Settings (`/team`, `/settings`, `/activity`)
- Role-Based Access Control (RBAC): `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`.
- Full audit event logging (`CrmAuditEvent`) for traceability.
- Theme switching (Light / Dark mode).

---

## Running the Application

### Option A: Next.js Web App
```powershell
cd C:\Users\Krupa\Downloads\Nexora\crm
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

### Option B: Standalone HTML Prototype
Double-click `CRM Prototype.html` to open it in any web browser without needing a Node.js runtime.

# Nexora Candidate Sourcing — Technical Implementation Blueprint

**Stack:** Next.js + Node.js + Prisma + PostgreSQL (Neon)  
**Automation:** n8n  
**AI qualification:** OpenAI API  
**Lead destination:** Nexora CRM + Google Sheets  
**LinkedIn access:** Normal LinkedIn account

---

## 1. Project objective

Build Candidate Intelligence as an extension of the existing Nexora CRM, not as a separate application.

The system should:

- Help recruiters discover candidates manually on LinkedIn.
- Capture candidate information through authorized intake channels, such as a Nexora application form, referrals, or recruiter-entered records.
- Validate and deduplicate candidate records.
- Match candidates against specific job requirements using AI.
- Save candidate records and qualification results in Nexora.
- Synchronize approved candidate fields to Google Sheets.
- Assign candidates to recruiters and create follow-up tasks.
- Provide reporting on sourcing and qualification activity.

**LinkedIn restriction:** A normal LinkedIn account does not provide assumed access to Recruiter APIs, bulk exports, or automated profile extraction. Do not scrape LinkedIn or automate connection requests, messages, or browser activity. Use LinkedIn for manual discovery and candidate opt-in; automate the workflow after information enters an authorized Nexora intake channel.

## 2. Recommended architecture

```text
LinkedIn manual discovery / Referrals / Nexora application form
                              |
                              v
                    Candidate Intake API
                 Validation / Consent / Dedupe
                              |
                              v
                     Nexora Backend API
                   Node.js / Prisma / Neon
                              |
                 +------------+-------------+
                 |                          |
                 v                          v
          AI Qualification              n8n Workflows
          OpenAI API                    Background automation
                 |                          |
                 v                          v
        Qualification results        Google Sheets sync
                 |                          |
                 +------------+-------------+
                              |
                              v
                         Nexora CRM
                  Primary source of truth
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| Next.js App Router | Candidate Intelligence interface |
| Existing Node.js API | Business logic and API endpoints |
| Prisma | Database access and migrations |
| Neon PostgreSQL | Primary database |
| OpenAI API | Structured, job-related candidate matching |
| n8n | Workflow orchestration and integration retries |
| Google Sheets API | Reporting and synchronized candidate register |
| Private file storage | Resume storage and signed access URLs |
| Existing Nexora authentication | User identity and access control |

Keep existing organizations, users, leads, contacts, permissions, and CRM workflows. Do not create duplicate systems.

## 3. LinkedIn sourcing workflow

1. Recruiter searches LinkedIn manually using job titles, skills, location, and experience.
2. Recruiter reviews a profile and decides whether to contact the person.
3. Candidate is invited to submit their details through a Nexora application form, or information is entered by an authorized recruiter where permitted.
4. Candidate-provided or otherwise lawfully obtained information enters Nexora.
5. Nexora validates the record and checks for duplicates.
6. AI evaluates the candidate against a specific job requirement.
7. Recruiter reviews the evaluation and decides the next action.
8. Nexora synchronizes approved fields to Google Sheets.

A LinkedIn profile URL can be stored as a reference. Do not automatically extract profile data from it. A profile URL alone is not consent to enrich or process personal information.

## 4. Database design

### Proposed models

| Model | Purpose |
|---|---|
| `CandidateSourcingProfile` | Candidate-specific sourcing fields linked to an existing CRM Lead |
| `SourcingProject` | Sourcing campaigns and categories |
| `JobRequirement` | Skills, experience, location, and job criteria |
| `CandidateQualification` | Job-specific AI evaluation and score |
| `CandidateActivity` | Recruiter and candidate activity history |
| `IntegrationOutbox` | Reliable event delivery to n8n |
| `IntegrationSync` | Google Sheets and integration synchronization state |

### Proposed Prisma schema

> This is an additive proposal. Adapt ID types, enum names, and relation definitions to the actual Nexora schema. Connect `leadId`, `organizationId`, and user IDs to existing models before migration.

```prisma
enum CandidateSource {
  LINKEDIN
  REFERRAL
  WEBSITE
  JOB_BOARD
  MANUAL
  OTHER
}

enum CandidateSourcingStatus {
  NEW
  AI_QUALIFIED
  PENDING_REVIEW
  CONTACTED
  INTERESTED
  QUALIFIED
  SUBMITTED
  REJECTED
  ON_HOLD
}

enum QualificationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  NEEDS_REVIEW
}

enum CandidateAvailability {
  IMMEDIATE
  WITHIN_15_DAYS
  WITHIN_30_DAYS
  WITHIN_60_DAYS
  NOT_AVAILABLE
  UNKNOWN
}

enum SyncStatus {
  PENDING
  PROCESSING
  SYNCED
  FAILED
}

model CandidateSourcingProfile {
  id                    String @id @default(cuid())
  organizationId        String
  leadId                String @unique

  source                CandidateSource
  sourceProfileUrl      String?
  sourceNotes           String?

  currentTitle          String?
  currentCompany        String?
  locationCity          String?
  locationState         String?
  country               String @default("USA")

  experienceYears       Decimal? @db.Decimal(4, 1)
  skills                String[]
  resumeUrl             String?

  availability          CandidateAvailability @default(UNKNOWN)
  workAuthorization     String?
  authorizationVerified Boolean @default(false)

  consentStatus         String @default("PENDING")
  consentCapturedAt     DateTime?
  consentSource         String?

  status                CandidateSourcingStatus @default(NEW)
  assignedToId          String?

  createdById           String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  qualifications        CandidateQualification[]
  activities            CandidateActivity[]

  @@unique([organizationId, sourceProfileUrl])
  @@index([organizationId, status])
  @@index([organizationId, assignedToId])
  @@index([organizationId, createdAt])
}

model SourcingProject {
  id              String @id @default(cuid())
  organizationId  String

  name            String
  description     String?
  category        String?
  isActive        Boolean @default(true)

  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  requirements    JobRequirement[]

  @@index([organizationId, isActive])
}

model JobRequirement {
  id              String @id @default(cuid())
  organizationId  String
  projectId       String

  title           String
  description     String?
  location        String?
  requiredSkills  String[]
  preferredSkills String[]

  minExperience   Decimal? @db.Decimal(4, 1)
  maxExperience   Decimal? @db.Decimal(4, 1)

  isActive        Boolean @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         SourcingProject @relation(
    fields: [projectId],
    references: [id],
    onDelete: Cascade
  )

  qualifications  CandidateQualification[]

  @@index([organizationId, isActive])
  @@index([projectId])
}

model CandidateQualification {
  id                String @id @default(cuid())
  organizationId    String

  candidateId       String
  requirementId     String

  overallScore      Int
  skillsScore       Int
  experienceScore   Int
  locationScore     Int
  requirementsScore Int

  status            QualificationStatus @default(PENDING)
  explanation       String?
  strengths         Json?
  gaps              Json?

  model             String?
  promptVersion     String?
  evaluatedAt       DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  candidate         CandidateSourcingProfile @relation(
    fields: [candidateId],
    references: [id],
    onDelete: Cascade
  )

  requirement       JobRequirement @relation(
    fields: [requirementId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([candidateId, requirementId])
  @@index([organizationId, overallScore])
}

model CandidateActivity {
  id              String @id @default(cuid())
  organizationId  String
  candidateId     String

  activityType    String
  description     String?
  metadata        Json?

  performedById   String?
  createdAt       DateTime @default(now())

  candidate       CandidateSourcingProfile @relation(
    fields: [candidateId],
    references: [id],
    onDelete: Cascade
  )

  @@index([candidateId, createdAt])
  @@index([organizationId, activityType])
}

model IntegrationOutbox {
  id              String @id @default(cuid())
  organizationId  String

  eventType       String
  aggregateId     String
  payload         Json

  status          SyncStatus @default(PENDING)
  attempts        Int @default(0)
  nextAttemptAt   DateTime?
  processedAt     DateTime?
  lastError       String?

  createdAt       DateTime @default(now())

  @@index([status, nextAttemptAt])
  @@index([organizationId, createdAt])
}

model IntegrationSync {
  id              String @id @default(cuid())
  organizationId  String

  provider        String
  entityType      String
  entityId        String
  externalId      String?

  status          SyncStatus @default(PENDING)
  attempts        Int @default(0)
  lastError       String?
  syncedAt        DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, provider, entityType, entityId])
  @@index([organizationId, status])
}
```

### Schema implementation notes

- Add a real Prisma relation from `CandidateSourcingProfile.leadId` to the existing Lead model after checking its name and ID type.
- Connect organization and user IDs to existing models.
- Do not duplicate candidate name, email, phone, or other contact fields already stored on the CRM Lead.
- Integrate candidate statuses with the existing CRM status model carefully.
- Consider using a dedicated consent enum and consent-evidence model instead of free-form strings.
- Protect work-authorization information and avoid storing passport or immigration documents in ordinary candidate fields.
- Add data-retention, correction, and deletion workflows.
- Ensure unique constraints behave correctly for nullable profile URLs and across organizations.

### Why use an outbox?

Create the candidate, activity, and outbox event in one database transaction. A background worker then delivers the event to n8n. If Google Sheets is unavailable, the candidate remains saved in Nexora and the event can be retried.

## 5. API endpoint design

Use the existing API conventions. The following is a proposed `/api/v1` namespace.

### Candidate endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/candidates` | Create candidate |
| GET | `/api/v1/candidates` | List and filter candidates |
| GET | `/api/v1/candidates/:id` | Candidate details |
| PATCH | `/api/v1/candidates/:id` | Update candidate |
| PATCH | `/api/v1/candidates/:id/status` | Change status |
| POST | `/api/v1/candidates/:id/assign` | Assign recruiter |
| POST | `/api/v1/candidates/:id/qualify` | Queue AI qualification |
| GET | `/api/v1/candidates/:id/qualifications` | Qualification history |
| POST | `/api/v1/candidates/:id/activities` | Add activity |

### Sourcing project endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/sourcing/projects` | Create project |
| GET | `/api/v1/sourcing/projects` | List projects |
| GET | `/api/v1/sourcing/projects/:id` | Project details |
| PATCH | `/api/v1/sourcing/projects/:id` | Update project |
| POST | `/api/v1/sourcing/projects/:id/requirements` | Create job requirement |
| GET | `/api/v1/sourcing/projects/:id/candidates` | List project candidates |

### Integration endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/integrations/n8n/candidate-intake` | Receive authorized intake |
| POST | `/api/v1/integrations/n8n/sync-status` | Update workflow result |
| POST | `/api/v1/integrations/n8n/qualification-result` | Save qualification result |
| POST | `/api/v1/integrations/google-sheets/sync` | Trigger Sheets sync |
| GET | `/api/v1/integrations/health` | Integration health |

### Candidate creation request example

```json
{
  "source": "LINKEDIN",
  "sourceProfileUrl": "https://www.linkedin.com/in/example/",
  "currentTitle": "Software Developer",
  "currentCompany": "Example Technologies",
  "locationCity": "New York",
  "locationState": "New York",
  "country": "USA",
  "experienceYears": 4,
  "skills": [
    "Node.js",
    "React",
    "TypeScript",
    "PostgreSQL"
  ],
  "availability": "WITHIN_30_DAYS",
  "consentStatus": "GRANTED",
  "consentSource": "NEXORA_APPLICATION_FORM",
  "requirementId": "req_example_id"
}
```

The request must come from an authenticated recruiter or verified candidate submission. A LinkedIn URL alone must not be treated as consent.

### Candidate creation response example

```json
{
  "success": true,
  "data": {
    "candidateId": "candidate_123",
    "leadId": "lead_123",
    "status": "NEW",
    "qualificationStatus": "PENDING",
    "sheetSyncStatus": "PENDING"
  }
}
```

Use the existing validation library or Zod, authentication middleware, organization-level authorization, rate limiting, cursor pagination, and idempotency keys. Derive the organization from the authenticated session rather than trusting a client-supplied organization ID.

## 6. AI qualification engine

Evaluate candidates against a specific job requirement. A candidate may be a strong match for one role and a weak match for another.

### Initial configurable scoring weights

| Criterion | Weight |
|---|---:|
| Technical skills | 40% |
| Relevant experience | 25% |
| Job requirements | 25% |
| Location compatibility | 10% |
| **Total** | **100%** |

Initial review thresholds:

| Score | Suggested handling |
|---|---|
| 80–100 | High-priority recruiter review |
| 60–79 | Manual review |
| 0–59 | Low-priority review |

These are configurable triage thresholds, not hiring decisions. Use only job-related criteria. Do not score or infer protected characteristics, age, race, religion, disability, or other sensitive traits. Work authorization must be separately and appropriately verified, not inferred by AI.

### Qualification workflow

```text
Candidate resume + job description
                |
                v
Extract job-related information
                |
                v
Compare against job requirements
                |
                v
Generate structured evaluation
                |
                v
Validate output and score ranges
                |
                v
Save qualification in Nexora
                |
                v
Recruiter reviews result
```

### Example structured output

```json
{
  "overallScore": 87,
  "scores": {
    "skills": 92,
    "experience": 85,
    "requirements": 90,
    "location": 70
  },
  "strengths": [
    "Strong Node.js experience",
    "React and TypeScript knowledge",
    "PostgreSQL experience"
  ],
  "gaps": [
    "Cloud deployment experience needs verification"
  ],
  "recommendation": "HIGH_PRIORITY_REVIEW",
  "explanation": "Matches most required technical skills and experience. Recruiter should verify remaining requirements."
}
```

Persist the model name, prompt version, job-requirement version, score breakdown, evaluation date, strengths, gaps, and explanation. Use structured output and validate it server-side. AI results should never overwrite verified candidate facts or make autonomous hiring decisions.

## 7. n8n workflows

n8n should orchestrate background work. Nexora remains the system of record and owns business rules.

### Workflow 1 — Candidate intake

```text
Webhook Trigger
      |
      v
Verify API Authentication
      |
      v
Validate Candidate Payload
      |
      v
Check Duplicate Candidate
      |
      v
Create / Update Nexora Candidate
      |
      v
Create Candidate Activity
      |
      v
Queue Qualification Event
      |
      v
Respond with Success
```

Suggested webhook: `POST /webhook/nexora/candidate-intake`

Example event:

```json
{
  "event": "candidate.created",
  "candidateId": "candidate_123",
  "organizationId": "org_123",
  "requirementId": "req_123",
  "source": "LINKEDIN"
}
```

Prefer an outbox worker delivering signed events to n8n instead of allowing a public webhook to create arbitrary CRM records.

### Workflow 2 — AI qualification

```text
Webhook / Queue Trigger
        |
        v
Fetch Candidate from Nexora API
        |
        v
Fetch Job Requirement
        |
        v
Check Resume Availability
        |
        v
Extract Relevant Information
        |
        v
OpenAI Structured Evaluation
        |
        v
Validate AI Response
        |
        v
POST Qualification Result to Nexora
        |
        v
Notify Assigned Recruiter
```

Send only the minimum information needed for job-related evaluation. Use private resume access and avoid unnecessary personal data in prompts and logs.

### Workflow 3 — Google Sheets synchronization

```text
Webhook Trigger
      |
      v
Fetch Candidate Details
      |
      v
Search Sheet by Candidate ID
      |
      v
Existing Row?
    /     \
  Yes      No
   |        |
   v        v
Update    Append
 Row       Row
   \        /
    \      /
       v
Update Nexora Sync Status
```

Suggested webhook: `POST /webhook/nexora/sheets-sync`

Use Candidate ID as the stable row key. Update existing rows rather than appending duplicates. Keep Nexora as the source of truth; spreadsheet edits should not silently overwrite CRM records.

### Workflow 4 — Recruiter assignment

```text
Qualification Completed
        |
        v
Check Organization Rules
        |
        v
Find Eligible Recruiter
        |
        v
Assign Candidate in Nexora
        |
        v
Create Follow-up Task
        |
        v
Notify Recruiter
```

Assignment can use job category, recruiter specialization, workload, and organization permissions.

### Workflow 5 — Failed integration recovery

```text
Scheduled Trigger
       |
       v
Fetch Failed Outbox Events
       |
       v
Check Retry Eligibility
       |
       v
Retry Failed Operation
       |
       v
Update Integration Status
       |
       v
Max Attempts Exceeded?
       |
       v
Notify Administrator
```

Use exponential backoff, for example 1 minute, 5 minutes, 15 minutes, and 1 hour, with a configurable retry limit. Make all event handlers idempotent.

## 8. Suggested codebase structure

Adapt this to Nexora's actual directory conventions rather than moving existing modules unnecessarily.

```text
src/
├── app/
│   ├── (dashboard)/
│   │   └── candidate-intelligence/
│   │       ├── page.tsx
│   │       ├── candidates/
│   │       ├── projects/
│   │       ├── requirements/
│   │       ├── automation/
│   │       └── analytics/
│   └── api/
│       └── v1/
│           ├── candidates/
│           ├── sourcing/
│           └── integrations/
├── modules/
│   └── candidate-sourcing/
│       ├── candidate.service.ts
│       ├── candidate.repository.ts
│       ├── candidate.validation.ts
│       ├── qualification.service.ts
│       ├── scoring.service.ts
│       ├── project.service.ts
│       ├── assignment.service.ts
│       ├── consent.service.ts
│       └── candidate.types.ts
├── integrations/
│   ├── openai/
│   │   ├── client.ts
│   │   └── qualification.ts
│   ├── google-sheets/
│   │   └── sync.ts
│   └── n8n/
│       └── client.ts
├── jobs/
│   ├── outbox-worker.ts
│   └── retry-worker.ts
└── lib/
    ├── prisma.ts
    ├── auth.ts
    └── permissions.ts
```

### Candidate creation service example

This illustrates the transaction pattern. It assumes the existing Lead has already been validated and the proposed models have been integrated.

```typescript
import { prisma } from "@/lib/prisma";

type CreateCandidateInput = {
  organizationId: string;
  leadId: string;
  createdById: string;
  source: "LINKEDIN" | "REFERRAL" | "WEBSITE" | "MANUAL" | "OTHER";
  sourceProfileUrl?: string;
  skills: string[];
  requirementId?: string;
};

export async function createCandidate(
  input: CreateCandidateInput
) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidateSourcingProfile.create({
      data: {
        organizationId: input.organizationId,
        leadId: input.leadId,
        createdById: input.createdById,
        source: input.source,
        sourceProfileUrl: input.sourceProfileUrl,
        skills: input.skills,
        status: "NEW"
      }
    });

    await tx.candidateActivity.create({
      data: {
        organizationId: input.organizationId,
        candidateId: candidate.id,
        activityType: "CANDIDATE_CREATED",
        description: "Candidate added to sourcing pipeline",
        performedById: input.createdById
      }
    });

    await tx.integrationOutbox.create({
      data: {
        organizationId: input.organizationId,
        eventType: "candidate.created",
        aggregateId: candidate.id,
        payload: {
          candidateId: candidate.id,
          requirementId: input.requirementId ?? null
        }
      }
    });

    return candidate;
  });
}
```

Before production use, add organization ownership checks, duplicate handling, consent validation, and idempotency protection. Confirm the Lead relation and actual Prisma model names.

## 9. Neon PostgreSQL configuration

Use a pooled connection for application traffic and a direct connection for migrations, following the configuration supported by the installed Prisma version.

```bash
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require"

DIRECT_URL="postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require"
```

Do not commit credentials. Store them in the deployment environment and rotate them if exposed. Verify the installed Prisma major version before changing datasource configuration because Prisma connection configuration differs by version.

## 10. Security and reliability checklist

| Area | Requirement |
|---|---|
| Authentication | Reuse Nexora authentication |
| Authorization | Organization-level access control |
| Webhooks | HMAC signatures or strong service credentials |
| API | Rate limiting and request validation |
| Database | Tenant isolation |
| Candidate data | Consent evidence and retention |
| Resumes | Private storage and signed URLs |
| AI | Structured output validation |
| Integrations | Idempotency and retry handling |
| Audit | Record candidate and recruiter actions |

Additional safeguards:

1. Never expose OpenAI, Google, or n8n credentials in frontend code.
2. Do not allow n8n to connect directly to the production database.
3. Derive organization access from the authenticated user and verify it on every request.
4. Maintain audit logs for candidate information changes.
5. Provide candidate data correction and deletion workflows.
6. Do not use protected characteristics to rank candidates.
7. Keep work-authorization declarations separate from AI-generated scores.
8. Do not submit candidate data to clients without appropriate authorization.
9. Minimize personal data sent to AI providers and integration logs.
10. Restrict resume access and define retention periods.

## 11. Candidate Intelligence UI

Add a section to the existing Nexora dashboard:

**Candidate Intelligence**
- Overview
- Candidate Database
- Sourcing Projects
- Job Requirements
- AI Qualification
- Automation
- Google Sheets Sync
- Analytics

Suggested candidate database columns:

| Field | Description |
|---|---|
| Candidate | Name from existing CRM Lead |
| Category | Job category |
| Location | City and state |
| Skills | Candidate skills |
| Experience | Relevant experience |
| AI Score | Job-specific match score |
| Status | Sourcing pipeline status |
| Assigned Recruiter | Responsible employee |
| Source | LinkedIn, referral, website, etc. |
| Updated | Last record update |

Suggested dashboard metrics:
- Total candidate records
- Candidates awaiting review
- Qualification completion rate
- Candidates by job category
- Candidates by sourcing source
- Recruiter workload
- Google Sheets sync failures

Use actual database values; do not display placeholder metrics as live figures.

## 12. Development roadmap

| Stage | Deliverables | Estimate |
|---|---|---:|
| 1 | CRM audit, schema design, migrations | 2 days |
| 2 | Candidate APIs and project management | 3 days |
| 3 | Candidate Intelligence UI | 3 days |
| 4 | AI qualification service | 2 days |
| 5 | n8n and Google Sheets integrations | 3 days |
| 6 | Testing, security, and deployment | 2 days |
| **Total** | **Initial implementation estimate** | **15 working days** |

Estimates assume the existing CRM foundation is functional and do not include delays for third-party account approvals or integration access.

### Testing checklist

- [ ] Candidate creation and editing
- [ ] Duplicate candidate detection
- [ ] Organization isolation
- [ ] Recruiter assignment permissions
- [ ] AI scoring against multiple job requirements
- [ ] AI failure and retry handling
- [ ] Google Sheets insert and update
- [ ] Outbox delivery and recovery
- [ ] Invalid webhook signature rejection
- [ ] Candidate consent and deletion
- [ ] Production migration and rollback testing

## 13. First development task: codebase audit

Before changing the schema or creating modules, inspect the actual Nexora repository.

Audit:

1. Existing Prisma schema and relationships.
2. Lead, Contact, and Company models.
3. Authentication and permission middleware.
4. Organization/tenant architecture.
5. Existing API structure.
6. Existing webhook and background-job infrastructure.
7. Deployment and environment configuration.

The audit should produce:

- Existing architecture report.
- Database changes required.
- Files to modify and files to create.
- API integration plan.
- Migration and rollback strategy.
- Ordered implementation checklist.

**Do not begin by blindly applying the proposed Prisma schema.** First map it to the real repository so the implementation reuses existing models and does not break current CRM functionality.

---

## Reference documentation

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma documentation](https://www.prisma.io/docs)
- [Neon documentation](https://neon.tech/docs)
- [n8n documentation](https://docs.n8n.io/)
- [OpenAI API documentation](https://platform.openai.com/docs/)
- [Google Sheets API](https://developers.google.com/workspace/sheets/api)
- [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement)

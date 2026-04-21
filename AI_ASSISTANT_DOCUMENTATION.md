# Arogya Nidhi AI Assistant - Technical Documentation

## Executive Summary

The AI Assistant is an intelligent appointment-booking system that guides patients through a multi-step booking process using natural language interaction. It leverages Google's Gemini API for natural language understanding and employs sophisticated state management to handle conversational context. The system includes automatic symptom-based specialty routing, date/time normalization, and session persistence.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [State Management](#state-management)
5. [LLM Integration](#llm-integration)
6. [Context Provided to LLM](#context-provided-to-llm)
7. [Prompt Engineering](#prompt-engineering)
8. [Symptom Triage System](#symptom-triage-system)
9. [Multi-Step Booking Workflow](#multi-step-booking-workflow)
10. [API Endpoints](#api-endpoints)
11. [Key Functions](#key-functions)
12. [Configuration & Environment](#configuration--environment)

---

## System Architecture

### High-Level Overview

```
Frontend (Patient Portal)
         ↓
    HTTP Request
  ("/api/ai/assistant")
         ↓
  aiController.js (Route Handler)
         ↓
  aiAssistant.service.js (Business Logic)
         ├─ Session State (In-Memory Map)
         ├─ Gemini API (LLM Call)
         ├─ dashboardService (Doctor/Booking DB)
         └─ Helper Functions (Parsing, Formatting)
         ↓
  HTTP Response
  (Reply + Actions)
         ↓
Frontend (Display Response)
```

### Technology Stack

- **LLM Provider**: Google Gemini API (gemini-2.5-flash)
- **State Management**: In-memory Map (key: userId, value: session object)
- **Database Integration**: Supabase via dashboardService
- **API Framework**: Express.js
- **Validation**: Zod (schema validation)
- **Authentication**: JWT-based (patient role required)

---

## Core Components

### 1. **aiAssistant.service.js**
   - Main service file handling all assistant logic
   - ~650 lines of code
   - Exports: `{ processMessage(userId, message) }`

### 2. **aiController.js**
   - HTTP endpoint handlers
   - Routes requests to aiAssistant.service
   - Extracts userId from JWT token
   - Returns formatted JSON responses

### 3. **aiRoute.js**
   - Defines POST endpoints:
     - `/api/ai/assistant` - Main booking assistant (authenticated)
     - `/api/ai/diagnose` - Symptom diagnosis (public)

### 4. **dashboardService**
   - Provides doctor availability data
   - Books appointments in database
   - Methods called:
     - `getAvailableDoctors({ specialty, page, limit })`
     - `bookAppointment(userId, { doctorId, scheduledAt, durationMinutes, patientNotes })`

---

## Data Flow

### Request Journey

1. **Frontend sends message**
   ```javascript
   POST /api/ai/assistant
   Body: { message: "I have chest pain" }
   Headers: { Authorization: "Bearer <jwt>" }
   ```

2. **Controller extracts userId** from JWT token

3. **Service processes message**
   ```
   processMessage(userId, message)
   ├─ Get or create session for userId
   ├─ Call Gemini API with context
   ├─ Parse Gemini response
   ├─ Update session state
   ├─ Fetch doctor data if needed
   ├─ Generate response with actions
   └─ Return to controller
   ```

4. **Response returned to frontend**
   ```javascript
   {
     success: true,
     reply: "Possible reasons include...",
     stage: "doctor",
     actions: [
       { type: "doctor", label: "1. Dr. Rajesh Sharma · रु1500", value: "doctor-id" }
     ]
   }
   ```

### Session State Lifecycle

```
New User
   ↓
Initial Request → Create Session (step: 'specialty')
   ↓
User Selects Specialty → Fetch Doctors → Update State (step: 'doctor')
   ↓
User Selects Doctor → Query Availability (step: 'date')
   ↓
User Selects Date → Fetch Time Slots (step: 'time')
   ↓
User Selects Time → Prompt for Notes (step: 'notes')
   ↓
User Adds Notes → Show Summary (step: 'confirm')
   ↓
User Confirms → Book Appointment → Reset Session
```

---

## State Management

### Session Object Structure

```javascript
{
  step: 'specialty' | 'doctor' | 'date' | 'time' | 'notes' | 'confirm',
  draft: {
    specialty: 'Cardiology' | null,          // Selected specialty
    doctorId: 'uuid' | null,                  // Selected doctor ID
    doctorName: 'Dr. Name' | null,            // Cleaned doctor name
    date: 'YYYY-MM-DD' | null,               // ISO date string
    time: 'HH:mm' | null,                    // 24-hour time format
    notes: 'Patient notes' | null            // Optional booking notes
  },
  doctors: [                                   // Available doctors for selected specialty
    {
      id: 'uuid',
      name: 'Doctor Name',
      specialty: 'Cardiology',
      consultationFee: 1500,
      user: { name: 'Full Name' }
    }
  ]
}
```

### In-Memory Session Map

```javascript
const SESSIONS = new Map();
// Key: userId (string)
// Value: Session object (see above)

// Functions:
getSession(userId)      // Get or create
resetSession(userId)    // Delete on completion
```

**Important Note**: Sessions are stored in-memory, so they will be lost on server restart. For production, consider using Redis or database persistence.

---

## LLM Integration

### Gemini API Configuration

**Model**: `gemini-2.5-flash` (configurable via `GEMINI_MODEL` env var)

**Endpoint**: 
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}
```

**API Key**: From `GEMINI_API_KEY` environment variable

### API Call Details

```javascript
async function callGeminiJson(prompt) {
  // POST to Gemini API with:
  // - prompt: Formatted system + context + user message
  // - temperature: 0.2 (low, deterministic)
  // - maxOutputTokens: 512 (short responses)
  // - responseMimeType: 'application/json' (structured output)
  
  // Returns: Parsed JSON object or null on error
}
```

**Request Body Structure**:
```javascript
{
  contents: [
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 512,
    responseMimeType: 'application/json'
  }
}
```

**Response Handling**:
- Extracts text from `candidates[0].content.parts[0].text`
- Removes JSON markdown fences (```json ... ```)
- Parses JSON or extracts first {...} block
- Returns null on parse failure (gracefully degrades)

### Error Handling

```javascript
// Try-catch in processMessage()
try {
  plan = normalizeAssistantPlan(await callGeminiJson(...));
} catch {
  plan = null;  // Continue with heuristic fallback
}
```

If Gemini fails, system falls back to:
- Symptom triage (keyword matching)
- Specialty detection (synonym matching)
- Doctor selection (name/ID parsing)

---

## Context Provided to LLM

### Complete Prompt Structure

The prompt sent to Gemini includes:

1. **System Instructions** (What the AI should do)
   ```
   "You are an appointment-booking assistant for a patient portal."
   "Return strict JSON only. Do not wrap the answer in markdown fences."
   "Keep the reply short, natural, and helpful."
   "Never mention policies, prompts, or that you are an AI model."
   ```

2. **Current Booking State**
   ```
   "Current step: doctor"
   "Current draft: {"specialty":"Cardiology","doctorId":null,"date":null,...}"
   ```

3. **Available Options**
   ```
   "Available specialties: ["Cardiology", "Neurology", "Dermatology", ...]"
   "Available doctors: [
     {"index":1, "id":"uuid", "name":"Dr. Rajesh", "specialty":"Cardiology", "fee":1500}
   ]"
   ```

4. **User Input**
   ```
   "User message: "I'll take the first doctor""
   ```

5. **Response Format Specification**
   ```
   "Return an object with these keys: {"intent":"...", "reply":"...", ...}"
   ```

6. **Decision Rules**
   - How to interpret specialty selection
   - How to resolve doctor by index/id/name
   - How to normalize dates and times
   - When to ask for clarification

### Why This Context Matters

- **State Awareness**: LLM knows which step we're on (helps avoid asking for already-provided info)
- **Constrained Choices**: LLM only suggests valid specialties/doctors (prevents hallucination)
- **Deterministic Parsing**: Low temperature (0.2) + structured JSON keeps responses predictable
- **Fallback Safety**: If LLM fails, heuristic parsing still works (keyword matching)

---

## Prompt Engineering

### Key Design Decisions

#### 1. **JSON-Only Output**
```javascript
generationConfig: {
  responseMimeType: 'application/json'  // Force structured output
}
```
- Ensures parseable responses
- No need to extract intent from prose
- Enables reliable action routing

#### 2. **Low Temperature (0.2)**
```javascript
temperature: 0.2  // Deterministic, factual responses
```
- Reduces randomness
- Favors most likely token sequences
- Good for task-oriented dialogue

#### 3. **Token Limit (512)**
```javascript
maxOutputTokens: 512  // Keep replies short
```
- Encourages concise messages
- Reduces latency
- Fits UI constraints

#### 4. **Intent Classification**
```
"intent": "specialty|doctor|date|time|notes|confirm|restart|clarify"
```
- Tells frontend what user is trying to do
- Enables UI-side validation
- Helps detect conversation derailments

#### 5. **Null-Safe Design**
All output fields can be `null`:
- Only filled fields are applied
- Graceful degradation if parsing fails
- Heuristic functions fill gaps

### Example Prompt Output

```javascript
{
  "intent": "doctor",
  "reply": "Got it! Dr. Rajesh is available. What date works best?",
  "specialty": null,
  "doctorSelection": "1",        // User said "first one"
  "date": null,
  "time": null,
  "notes": null,
  "confirm": null,
  "restart": false
}
```

---

## Symptom Triage System

### Purpose

Allow patients to describe symptoms naturally and be automatically routed to the correct specialty without first selecting it explicitly.

### Triage Rules Database

```javascript
const TRIAGE_RULES = [
  {
    specialty: 'Cardiology',
    keywords: ['heart pain', 'chest pain', 'chest tightness', 'palpitation', ...],
    causeHint: 'Possible reasons include acidity, muscle strain, anxiety, ...'
  },
  // ... more specialties
]
```

### Triage Detection Flow

```
User Input: "I have chest pain"
   ↓
detectSymptomTriage(text)
   ├─ Normalize text to lowercase
   ├─ Search for matching keywords in TRIAGE_RULES
   ├─ Find specialty for matched rule
   └─ Return { specialty, causeHint }
   ↓
Specialty Auto-Selected: Cardiology
   ↓
Show Cause Hint + Doctor List
```

### Integration with Main Flow

```javascript
if (!session.draft.specialty) {
  const triage = detectSymptomTriage(text);
  const specialty = resolveSpecialtyCandidate(plan?.specialty) 
    || findSpecialty(text) 
    || triage?.specialty;  // ← Triage as fallback
  // ... proceed with auto-selected specialty
}
```

### Example Response with Triage

**User**: "I'm having chest pain and palpitations"

**Response**:
```javascript
{
  reply: "Possible reasons include acidity, muscle strain, anxiety, or reduced blood flow to the heart. 
           Please consult a Cardiologist. Here are available Cardiologist professionals you can choose from. 
           I found these available doctors. Pick one by number or tap a doctor.",
  stage: "doctor",
  actions: [
    { type: "doctor", label: "1. Dr. Rajesh Sharma · रु1500", value: "doctor-uuid" }
  ]
}
```

---

## Multi-Step Booking Workflow

### Step-by-Step Breakdown

#### **Step 1: Specialty Selection**
```
Prompt: "Tell me the specialty you need: Cardiology, Neurology, ..."
User Responds: "I have heart problems" or "Cardiology"
Action: Fetch available doctors for that specialty

Branch:
  ✓ Found doctors → Move to Step 2
  ✗ No doctors → Ask to choose another specialty
```

#### **Step 2: Doctor Selection**
```
Prompt: "I found these available doctors. Pick one by number or tap a doctor."
Display: Numbered list with fees
User Responds: "1" or "Dr. Rajesh" or doctor ID
Action: Validate selection against available doctors list

Branch:
  ✓ Valid doctor → Move to Step 3
  ✗ Invalid → Re-display doctor list
```

#### **Step 3: Date Selection**
```
Prompt: "Which date would you like? You can type YYYY-MM-DD or use quick options."
Quick Options: Today | Tomorrow | Day After Tomorrow
User Responds: "tomorrow" or "2026-04-22" or "2026-04-23"
Action: Parse date, validate it's in future, store as YYYY-MM-DD

Branch:
  ✓ Valid date → Move to Step 4
  ✗ Invalid/past date → Re-prompt
```

#### **Step 4: Time Selection**
```
Prompt: "Now choose a time. You can type a time like 10:00 AM or tap one of the suggested slots."
Available Slots: 09:00, 10:00, 11:00, 12:00, 14:00, 15:00, 16:00, 17:00
User Responds: "10:00 AM" or "10:00" or "2"
Action: Parse time, validate against available slots, store as HH:mm

Special Handling:
  - Convert 12-hour to 24-hour format (10 AM → 10:00, 2 PM → 14:00)
  - Reject time if already booked (catch from dashboardService)
  - If conflict, re-prompt for alternative time

Branch:
  ✓ Valid time → Move to Step 5
  ✗ Invalid/booked → Re-display available slots
```

#### **Step 5: Notes Collection (Optional)**
```
Prompt: "Optional: add a short note for the doctor, or type skip to continue."
User Responds: "I have been experiencing this for 2 weeks" or "skip"
Action: Store note (or null if skipped)

Rules:
  - Accept any text as note
  - Recognize skip keywords: "skip", "no", "none", "n/a"
  - Move to next step regardless

Branch:
  ✓ Always → Move to Step 6 (Confirmation)
```

#### **Step 6: Confirmation**
```
Prompt: "Please confirm: Dr. Rajesh Sharma, April 22, 2026 at 10:00 AM. 
         Reply yes to book or no to change details."
User Responds: "yes", "confirm", "book" OR "no", "change", "edit", "back"

Branch A - Positive Confirmation:
  ✓ Call bookAppointment() API
  ✓ On success: Return confirmation message + reset session
  ✗ On conflict: Re-prompt for new time (slot was booked between selection and confirmation)

Branch B - Negative Confirmation:
  → Clear date/time/notes, return to doctor selection
  → Allow user to change doctor, date, time, or notes

Branch C - No Response:
  → Re-display confirmation prompt
```

### State Transitions Diagram

```
        ┌─────────────────────┐
        │    START / RESTART  │
        └──────────┬──────────┘
                   ↓
        ┌─────────────────────┐
        │   SPECIALTY STAGE   │
        │  (Select Specialty) │
        └──────────┬──────────┘
                   ↓
        ┌─────────────────────┐
        │    DOCTOR STAGE     │
        │   (Pick Doctor)     │
        └──────────┬──────────┘
                   ↓
        ┌─────────────────────┐
        │     DATE STAGE      │
        │    (Choose Date)    │
        └──────────┬──────────┘
                   ↓
        ┌─────────────────────┐
        │     TIME STAGE      │
        │    (Choose Time)    │
        └──────────┬──────────┘
                   ↓
        ┌─────────────────────┐
        │     NOTES STAGE     │
        │   (Add Notes)       │
        └──────────┬──────────┘
                   ↓
        ┌─────────────────────┐
        │    CONFIRM STAGE    │
        │  (Review & Confirm) │
        └────┬────────────────┘
             │
        ┌────┴──────────────────────────┐
        │                               │
   YES/CONFIRM                   NO/CHANGE
        │                               │
        ↓                               ↓
    ┌────────────┐          ┌──────────────────┐
    │  BOOK &    │          │ BACK TO DOCTOR   │
    │  SUCCESS   │          │ (Clear date/time │
    │  DONE      │          │  & notes)        │
    └────────────┘          └────────┬─────────┘
                                     │
                                     └─ Loop back to DOCTOR stage

    At any point: "restart" keyword resets entire session
```

---

## API Endpoints

### POST `/api/ai/assistant`

**Authentication**: Required (Patient role)

**Request**:
```javascript
{
  message: string (1-2000 chars)
}
```

**Response** (Success):
```javascript
{
  success: true,
  reply: string,                    // AI's natural language response
  stage: 'specialty' | 'doctor' | 'date' | 'time' | 'notes' | 'confirm' | 'done',
  actions: [                        // Available quick-action buttons
    {
      type: 'specialty' | 'doctor' | 'date' | 'time' | 'notes' | 'confirm' | 'restart',
      label: string,                // Button text
      value: string,                // Button value
      doctorName?: string,          // Extra data (for doctors)
      specialty?: string
    }
  ],
  bookingPreview?: {                // On confirm stage
    specialty: string,
    doctorName: string,
    date: string,
    time: string,
    notes: string | null
  },
  booking?: {                       // On success stage
    id: string,
    patientId: string,
    doctorId: string,
    doctor: { user: { name: string } },
    scheduledAt: string (ISO),
    status: string
  }
}
```

**Response** (Error):
```javascript
{
  success: false,
  message: string  // Error description
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad request (validation failed)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (not a patient)
- `500`: Server error

### POST `/api/ai/diagnose` (Public)

**Authentication**: None required

**Request**:
```javascript
{
  messages: [
    { text: "I have chest pain" }
  ]
}
```

**Response**:
```javascript
{
  success: true,
  reply: "Based on your symptoms... please consult a doctor. (AI integration coming soon)"
}
```

**Note**: Currently returns a placeholder response. Could be extended with actual diagnosis logic.

---

## Key Functions

### Session Management

#### `getSession(userId)`
- Returns existing session or creates new one
- Initializes all draft fields to null
- Doctors array starts empty
- Step defaults to 'specialty'

#### `resetSession(userId)`
- Deletes session from in-memory Map
- Called on successful booking or restart
- Clears all conversation state

### Text Normalization

#### `normalizeText(text)`
- Converts to lowercase
- Trims whitespace
- Enables case-insensitive matching
```javascript
normalizeText("TOMORROW") === normalizeText("tomorrow")  // true
```

### Specialty Resolution

#### `findSpecialty(input)`
- Keyword-based specialty detection
- Searches in specialty keys and synonyms
```javascript
findSpecialty("heart problem")     // → Cardiology object
findSpecialty("back pain")         // → Orthopedics object
```

#### `resolveSpecialtyCandidate(value)`
- Resolves Gemini's specialty output
- Handles typos via synonym matching
- Returns null if not found

### Doctor Selection

#### `resolveDoctorCandidate(plan, doctors, fallbackText)`
- Resolves doctor by multiple methods:
  1. Exact ID match
  2. Numeric index (1-based)
  3. Name substring match
- Falls back to `parseDoctorChoice()` if plan fails

#### `parseDoctorChoice(input, doctors)`
- Tries ID match first
- Then numeric index
- Then name matching
- Returns null if no match

### Date/Time Parsing

#### `parseDateInput(input)`
- Recognizes: "today", "tomorrow", "day after tomorrow"
- Parses ISO format: "2026-04-22"
- Parses natural: "April 22"
- Returns Date object or null

#### `parseTimeInput(input)`
- Recognizes: "10:00 AM", "10:00 am", "10 AM", "2:30 PM"
- Handles 12-hour to 24-hour conversion
- Validates hour (0-23) and minute (0-59)
- Returns "HH:mm" string or null

#### `formatDateKey(date)` → `"YYYY-MM-DD"`
- ISO string storage format

#### `formatDateDisplay(dateKey)` → `"April 22, 2026"`
- User-friendly display format

#### `formatTimeDisplay(timeKey)` → `"10:00 AM"`
- Converts 24-hour to 12-hour with AM/PM

### Prompt Builders (Generate UI/Response)

#### `makeSpecialtyPrompt()`
Returns: `{ reply, stage, actions }`
- Displays all specialties as buttons

#### `makeDoctorPrompt(doctors)`
Returns: `{ reply, stage, actions }`
- Lists available doctors with fees
- Actions numbered 1, 2, 3...

#### `makeDatePrompt(session)`
Returns: `{ reply, stage, actions }`
- Shows quick options (Today, Tomorrow, etc.)

#### `makeTimePrompt()`
Returns: `{ reply, stage, actions }`
- Shows available time slots

#### `makeNotesPrompt()`
Returns: `{ reply, stage, actions }`
- Offers skip button

#### `makeSummaryPrompt(session)`
Returns: `{ reply, stage, bookingPreview, actions }`
- Shows full booking details
- Confirm and Start Over buttons

### Triage Functions

#### `detectSymptomTriage(input)` → `{ specialty, causeHint }` | `null`
- Keyword matching against TRIAGE_RULES
- Returns matched specialty and reason
- null if no symptoms detected

#### `buildTriageReply(triage)` → `string`
- Formats cause hint + specialist recommendation
- Used to prepend to doctor list

### Validation & Safety

#### `safeJsonParse(text)`
- Removes markdown fences
- Extracts {...} if wrapped in text
- Returns null on all failures

#### `normalizeAssistantPlan(plan)`
- Type-checks Gemini response
- Sanitizes all fields
- Handles missing keys
- Ensures boolean for restart/confirm fields

#### `stripJsonFence(text)`
- Removes ```json wrapper
- Handles incomplete fences

---

## Configuration & Environment

### Required Environment Variables

```bash
# Gemini API Configuration
GEMINI_API_KEY=<your-google-ai-studio-key>
GEMINI_MODEL=gemini-2.5-flash          # Optional, defaults shown

# Database (handled by dashboardService)
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>

# JWT Authentication
JWT_SECRET=<your-secret>
```

### Deployment Considerations

#### Session Storage
**Current**: In-memory Map
**Issues**: Lost on restart, not shared across instances
**Solutions for Production**:
- Redis cache: `redis.get(userId)` / `redis.set(userId, session)`
- Database: Store session in Supabase table, TTL-based cleanup
- SessionStore library: `express-session` with database backend

#### Rate Limiting
**Current**: None
**Recommendations**:
```javascript
// Per user, per minute
rateLimit({ windowMs: 60000, max: 20 })
```

#### Gemini API Quotas
- Monitor usage in Google AI Studio console
- Implement retry with exponential backoff
- Cache common responses (specialties, doctors)

#### Monitoring & Logging
```javascript
// Add to processMessage():
console.log(`[AI] User ${userId} → ${message.slice(0,50)}... → ${plan.intent}`);
// Track: success rate, avg response time, error categories
```

---

## Example Conversation Flow

### Scenario: Patient with Chest Pain

```
USER: "I'm having chest pain and dizziness"

[BACKEND PROCESSING]
1. detectSymptomTriage() finds "Cardiology" (matches "chest pain")
2. Fetches cardiologists
3. buildTriageReply() creates cause hint

RESPONSE:
{
  reply: "Possible reasons include acidity, muscle strain, anxiety, or 
          reduced blood flow to the heart. Please consult a Cardiologist. 
          Here are available Cardiologist professionals you can choose from. 
          I found these available doctors. Pick one by number or tap a doctor.",
  stage: "doctor",
  actions: [
    { type: "doctor", label: "1. Dr. Rajesh Sharma · रु1500", value: "uuid1" },
    { type: "doctor", label: "2. Dr. Priya Singh · रु1800", value: "uuid2" }
  ]
}

---

USER: "First doctor"

[PROCESSING]
1. resolveDoctorCandidate() matches "1" to Rajesh
2. Move to date stage
3. makeDatePrompt() generates prompt

RESPONSE:
{
  reply: "Great. Which date would you like for Dr. Rajesh Sharma? 
          You can type YYYY-MM-DD or use a quick option.",
  stage: "date",
  actions: [
    { type: "date", label: "Today", value: "today" },
    { type: "date", label: "Tomorrow", value: "tomorrow" },
    { type: "date", label: "Day after tomorrow", value: "day-after-tomorrow" }
  ]
}

---

USER: "tomorrow"

[PROCESSING]
1. parseDateInput("tomorrow") → Date(2026-04-22)
2. formatDateKey() → "2026-04-22"
3. Move to time stage

RESPONSE:
{
  reply: "Now choose a time. You can type a time like 10:00 AM 
          or tap one of the suggested slots.",
  stage: "time",
  actions: [
    { type: "time", label: "09:00", value: "09:00" },
    { type: "time", label: "10:00", value: "10:00" },
    ...
  ]
}

---

USER: "10 AM"

[PROCESSING]
1. parseTimeInput("10 AM") → "10:00"
2. Move to notes stage

RESPONSE:
{
  reply: "Optional: add a short note for the doctor, or type skip to continue.",
  stage: "notes",
  actions: [
    { type: "notes", label: "Skip notes", value: "skip" }
  ]
}

---

USER: "Experiencing pain for 2 weeks"

[PROCESSING]
1. Store notes: "Experiencing pain for 2 weeks"
2. Move to confirm stage
3. makeSummaryPrompt() formats booking

RESPONSE:
{
  reply: "Please confirm: Dr. Rajesh Sharma, April 22, 2026 at 10:00 AM. 
          Reply yes to book or no to change details.",
  stage: "confirm",
  bookingPreview: {
    specialty: "Cardiology",
    doctorName: "Rajesh Sharma",
    date: "2026-04-22",
    time: "10:00",
    notes: "Experiencing pain for 2 weeks"
  },
  actions: [
    { type: "confirm", label: "Confirm booking", value: "yes" },
    { type: "restart", label: "Start over", value: "restart" }
  ]
}

---

USER: "yes"

[PROCESSING]
1. Call dashboardService.bookAppointment()
2. Success: Create appointment record
3. Reset session
4. Return success response

RESPONSE:
{
  reply: "Your appointment is confirmed with Dr. Rajesh Sharma 
          on April 22, 2026 at 10:00 AM.",
  stage: "done",
  booking: {
    id: "booking-uuid",
    patientId: "patient-uuid",
    doctorId: "doctor-uuid",
    doctor: { user: { name: "Rajesh Sharma" } },
    scheduledAt: "2026-04-22T10:00:00Z",
    status: "confirmed"
  },
  actions: [
    { type: "restart", label: "Book another appointment", value: "restart" }
  ]
}
```

---

## Modifying the AI Assistant

### Common Modifications

#### 1. **Add a New Specialty**
```javascript
// In aiAssistant.service.js, add to SPECIALTIES:
const SPECIALTIES = [
  // ... existing ...
  { key: 'Oncology', label: 'Oncologist', 
    synonyms: ['oncology', 'oncologist', 'cancer'] },
];

// Add to TRIAGE_RULES:
{
  specialty: 'Oncology',
  keywords: ['cancer', 'tumor', 'chemotherapy'],
  causeHint: 'Cancer concerns require specialist evaluation. Please consult an Oncologist.'
}
```

#### 2. **Adjust LLM Behavior**
```javascript
// Temperature trade-offs:
temperature: 0.2   // More deterministic
temperature: 0.5   // Balanced
temperature: 0.8   // More creative

// Token limits:
maxOutputTokens: 256   // Shorter responses
maxOutputTokens: 1024  // Longer responses
```

#### 3. **Change Triage Keywords**
```javascript
// Make Neurology detection stricter:
keywords: ['severe headache', 'migraine', 'neurological condition']
// Was: ['headache', 'migraine', ...]

// Or looser:
keywords: ['head pain', 'headache', 'migraine', 'dizziness', 'dizzy', 'vertigo']
```

#### 4. **Add Step Between Time and Notes**
```javascript
// 1. Add new step to processMessage():
if (!session.draft.symptoms && session.step === 'symptoms') {
  // Prompt for symptom details before notes
  session.step = 'notes';
  return makeNotesPrompt();
}

// 2. Insert in workflow:
// ... time selection → [NEW SYMPTOMS STEP] → notes → confirm
```

#### 5. **Store Sessions in Database**
```javascript
// Replace in-memory Map with database:
async function getSession(userId) {
  let session = await db.session.findOne({ userId });
  if (!session) {
    session = { userId, step: 'specialty', draft: {...}, doctors: [] };
    await db.session.create(session);
  }
  return session;
}

async function resetSession(userId) {
  await db.session.deleteOne({ userId });
}

// After each change:
await db.session.updateOne({ userId }, { session });
```

#### 6. **Add Custom Response Templates**
```javascript
function getCustomReply(stage, context) {
  const templates = {
    specialty: `Welcome! I'll help you book a doctor. 
                Choose your concern: ${context.specialties.join(', ')}`,
    doctor: `Found ${context.doctors.length} doctors. Select by number:`,
    confirm: `Last step! Confirm details:
             👨‍⚕️ ${context.doctor}
             📅 ${context.date}
             🕐 ${context.time}`
  };
  return templates[stage] || '';
}
```

#### 7. **Modify Date/Time Parsing**
```javascript
// Support more date formats:
function parseDateInput(input) {
  const text = normalizeText(input);
  
  // Add support for relative dates:
  if (text.includes('next monday')) {
    return getNextMonday();
  }
  if (text.includes('next week')) {
    return getNextWeek();
  }
  
  // ... existing parsing ...
}

// Support 24-hour time input:
function parseTimeInput(input) {
  // Already supports HH:MM format
  // Now add flexible parsing:
  if (text.match(/^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)) {
    return input;  // Direct 24-hour time
  }
  // ... existing AM/PM parsing ...
}
```

#### 8. **Add Validation Before Booking**
```javascript
// Check doctor availability realtime:
async function validateBooking(doctorId, date, time) {
  const slot = await dashboardService.getSlot(doctorId, date, time);
  if (!slot || !slot.available) {
    throw new Error(`${time} is no longer available`);
  }
}

// In confirm step:
if (positiveConfirmation) {
  await validateBooking(session.draft.doctorId, session.draft.date, session.draft.time);
  const booking = await dashboardService.bookAppointment(...);
  // ...
}
```

---

## Performance Optimization Tips

### 1. **Cache Doctor Lists**
```javascript
const doctorCache = new Map();  // { specialty: [doctors] }

async function getCachedDoctors(specialty) {
  if (doctorCache.has(specialty)) {
    return doctorCache.get(specialty);
  }
  const doctors = await dashboardService.getAvailableDoctors(...);
  doctorCache.set(specialty, doctors);
  return doctors;
}

// Invalidate on doctor changes:
setTimeout(() => doctorCache.clear(), 5 * 60 * 1000);  // 5 min TTL
```

### 2. **Pre-compile Regex Patterns**
```javascript
const TIME_PATTERN = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i;

function parseTimeInput(input) {
  const match = input.match(TIME_PATTERN);
  // ... use match
}
```

### 3. **Reduce Gemini Calls**
```javascript
// Only call for ambiguous inputs, use heuristics for clear ones:
if (text === "1") {
  // Direct selection, skip Gemini
  return doctors[0];
} else {
  // Ambiguous, call Gemini
  const plan = await callGeminiJson(...);
}
```

### 4. **Batch Database Queries**
```javascript
// Instead of: doctor list fetch + availability check
// Try: single query with availability joined
const doctors = await dashboardService.getAvailableDoctors({ 
  specialty, 
  date: session.draft.date,  // Filter by chosen date
  includeAvailability: true
});
```

---

## Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| Session lost after restart | In-memory storage | Use Redis/DB persistence |
| Gemini API 401 error | Missing/invalid API key | Check `GEMINI_API_KEY` env var |
| Gemini API quota exceeded | Too many requests | Implement rate limiting, cache responses |
| Wrong specialty selected | Triage keywords too broad | Narrow keyword list or add negation keywords |
| Doctor list shows none | No doctors for specialty | Add doctors to database or create test data |
| Time slot "already booked" | Race condition between selection and confirmation | Add validation step or use database locks |
| Non-English input fails | Triage rules are English-only | Translate triage keywords or add language detection |
| Gemini returns non-JSON | Temperature too high or model instability | Lower temperature, limit tokens, add retries |

---

## Security Considerations

### Input Validation
```javascript
// Message length limited in schema:
message: z.string().min(1).max(2000)

// Always sanitize before database:
patientNotes: sanitizeHtml(session.draft.notes)
```

### Authentication
```javascript
// Every /api/ai/assistant request requires:
authenticate middleware  // Verifies JWT
requireRole('patient')   // Ensures user is patient
```

### Session Isolation
```javascript
// Sessions are per-userId, no cross-user access:
const session = getSession(userId);  // userId from JWT
// No way for user A to access user B's session
```

### API Rate Limiting
- Not currently implemented
- Add middleware: `express-rate-limit` or custom
- Prevent DoS attacks via rapid requests

---

## Summary

The AI Assistant is a sophisticated, multi-stage conversation system that:

1. **Manages state** via in-memory sessions (improvable with persistence)
2. **Leverages Gemini API** for natural language understanding with low-temperature, deterministic prompting
3. **Falls back gracefully** with keyword matching if Gemini fails
4. **Automates specialty selection** via symptom triage rules
5. **Guides users step-by-step** through booking with helpful prompts and quick actions
6. **Validates all inputs** to ensure valid bookings
7. **Handles edge cases** like booked slots and missing doctors

The system is extensible, allowing modifications to specialties, triage rules, prompts, and even the core workflow without major refactoring.


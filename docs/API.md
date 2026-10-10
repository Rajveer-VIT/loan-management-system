# FinFlow LMS REST API Documentation

Base URL: `/api/v1`  
Protocol: HTTP / HTTPS with JSON payloads.

---

## 📋 1. API Conventions

### Authorization Header
All protected endpoints require a JWT Bearer token in the `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

### Standard Success Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Paginated Envelope
List endpoints accept `page` (default 1) and `limit` (default 10, maximum 50) query parameters. Regex searches are safely escaped to prevent ReDoS.
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Standard Error Envelope
All error responses adhere to a unified error format:
```json
{
  "success": false,
  "message": "Human readable error summary",
  "code": "ERROR_CODE_STRING",
  "errors": [
    {
      "field": "body.pan",
      "message": "PAN format must be ABCDE1234F"
    }
  ]
}
```

#### Standard Error Codes:
- `BAD_REQUEST` (400): Malformed input or Zod schema validation error.
- `UNAUTHORIZED` (401): Missing, invalid, or expired JWT.
- `FORBIDDEN` (403): User role lacks required permission.
- `NOT_FOUND` (404): Resource not found (also returned on unauthorized borrower access to prevent resource existence leakage).
- `OPEN_LOAN_EXISTS` (409): Borrower already has an active application.
- `INVALID_STEP` (409): Attempting to upload slip or apply out of sequence.
- `INVALID_TRANSITION` (409): Illegal loan status state machine transition.
- `DUPLICATE_UTR` (409): Repayment UTR number has already been recorded.
- `OVERPAYMENT` (400): Payment amount exceeds outstanding balance.
- `BRE_VALIDATION_FAILED` (422): Profile rejected by Business Rule Engine.

---

## 🔐 2. Role × Endpoint Access Control Matrix

| Path | Method | ADMIN | SALES | SANCTION | DISBURSEMENT | COLLECTION | BORROWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/health` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/signup` | `POST` | ✅ Public | ✅ Public | ✅ Public | ✅ Public | ✅ Public | ✅ Public |
| `/auth/login` | `POST` | ✅ Public | ✅ Public | ✅ Public | ✅ Public | ✅ Public | ✅ Public |
| `/auth/me` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/borrower/loans/draft` | `GET` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/borrower/profile` | `POST` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/borrower/loans/:id/salary-slip` | `POST` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/borrower/loans/:id/apply` | `POST` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/borrower/loans` | `GET` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (Own Only) |
| `/borrower/loans/:id` | `GET` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (Own Only, 404 else) |
| `/sales/leads` | `GET` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/sales/stats` | `GET` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/sanction/loans` | `GET` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/sanction/loans/:id` | `GET` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/sanction/stats` | `GET` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/sanction/loans/:id/approve` | `PATCH` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/sanction/loans/:id/reject` | `PATCH` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/disbursement/loans` | `GET` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/disbursement/loans/:id` | `GET` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/disbursement/stats` | `GET` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/disbursement/loans/:id/disburse` | `PATCH` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/collection/loans` | `GET` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/collection/loans/:id` | `GET` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/collection/stats` | `GET` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/collection/loans/:id/payments` | `POST` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/collection/loans/:id/payments` | `GET` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/loans/:id/salary-slip` | `GET` | ✅ | ❌ 403 | ✅ | ✅ | ❌ 403 | ✅ (Own Only, 404 else) |

---

## 📡 3. Endpoint Specifications

### Health Check

#### `GET /health`
- **Allowed Roles**: Public (No Auth)
- **Description**: Verifies service status for deployment checks.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": "OK",
    "timestamp": "2026-10-10T02:18:22.000Z"
  }
  ```

---

### Authentication Module

#### `POST /auth/signup`
- **Allowed Roles**: Public
- **Description**: Registers a new borrower account. Bodies with `role` parameters are forced to `BORROWER` to prevent privilege escalation.
- **Request Body**:
  ```json
  {
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "password": "Borrower@123"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "66f1a8b9e4b0123456789abc",
        "name": "Rahul Sharma",
        "email": "rahul@example.com",
        "role": "BORROWER",
        "createdAt": "2026-10-10T02:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Status Codes**:
  - `201`: Account created.
  - `400`: Zod validation error.
  - `409`: Email already registered (`code: DUPLICATE_EMAIL`).

#### `POST /auth/login`
- **Allowed Roles**: Public
- **Description**: Authenticates user credentials and issues JWT token.
- **Request Body**:
  ```json
  {
    "email": "sanction@lms.com",
    "password": "Sanction@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "66f1a8b9e4b0123456789def",
        "name": "Sanction Officer",
        "email": "sanction@lms.com",
        "role": "SANCTION"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Status Codes**:
  - `200`: Login successful.
  - `401`: Invalid email or password (`code: UNAUTHORIZED`).

#### `GET /auth/me`
- **Allowed Roles**: Authenticated User
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "66f1a8b9e4b0123456789abc",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "BORROWER"
    }
  }
  ```

---

### Borrower Module

#### `GET /borrower/loans/draft`
- **Allowed Roles**: BORROWER
- **Description**: Retrieves borrower's active draft loan and server-derived stepper progress step (`personal`, `salary-slip`, `loan-config`, `done`).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "draftLoan": {
        "_id": "66f1a8b9e4b0123456789draft",
        "status": "DRAFT",
        "personalDetails": {
          "fullName": "Rahul Sharma",
          "pan": "ABCDE1234F",
          "dob": "1998-05-15T00:00:00.000Z",
          "monthlySalary": 50000,
          "employmentMode": "SALARIED"
        }
      },
      "currentStep": "salary-slip"
    }
  }
  ```

#### `POST /borrower/profile`
- **Allowed Roles**: BORROWER
- **Description**: Idempotently upserts borrower personal details and runs Business Rule Engine (BRE) checks.
- **Request Body**:
  ```json
  {
    "fullName": "Rahul Sharma",
    "pan": "ABCDE1234F",
    "dob": "1998-05-15",
    "monthlySalary": 50000,
    "employmentMode": "SALARIED"
  }
  ```
- **Status Codes**:
  - `200`: Profile saved and BRE passed.
  - `409`: Active open non-draft loan exists (`code: OPEN_LOAN_EXISTS`).
  - `422`: BRE evaluation failed (`code: BRE_VALIDATION_FAILED`).

#### `POST /borrower/loans/:id/salary-slip`
- **Allowed Roles**: BORROWER
- **Description**: Uploads salary slip (PDF/JPG/PNG $\le$ 5MB). Requires completed profile.
- **Status Codes**:
  - `200`: Upload successful.
  - `400`: Invalid file format or size $> 5\text{MB}$.
  - `409`: Profile not completed yet (`code: INVALID_STEP`).

#### `POST /borrower/loans/:id/apply`
- **Allowed Roles**: BORROWER
- **Description**: Configures loan amount and tenure days and submits application (`DRAFT` $\rightarrow$ `APPLIED`).
- **Request Body**:
  ```json
  {
    "amount": 100000,
    "tenureDays": 180
  }
  ```
- **Status Codes**:
  - `200`: Application submitted.
  - `409`: Incomplete profile or slip (`code: INVALID_STEP`).

#### `GET /borrower/loans`
- **Allowed Roles**: BORROWER
- **Description**: Returns list of loans owned by current borrower.

#### `GET /borrower/loans/:id`
- **Allowed Roles**: BORROWER
- **Description**: Returns loan details, payment history, totalPaid, and outstandingBalance. If loan belongs to another borrower, returns **404 Not Found**.

---

### Sales Module

#### `GET /sales/leads`
- **Allowed Roles**: SALES, ADMIN
- **Query Params**: `page` (default 1), `limit` (max 50), `search` (name/email)

#### `GET /sales/stats`
- **Allowed Roles**: SALES, ADMIN
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalLeads": 120,
      "newLeadsToday": 8,
      "funnel": {
        "registered": 30,
        "profileSaved": 25,
        "slipUploaded": 15,
        "applied": 50
      }
    }
  }
  ```

---

### Sanction Module

#### `GET /sanction/loans`
- **Allowed Roles**: SANCTION, ADMIN
- **Description**: Returns `APPLIED` loans awaiting underwriting.

#### `GET /sanction/loans/:id`
- **Allowed Roles**: SANCTION, ADMIN
- **Description**: Returns single `APPLIED` loan details.

#### `GET /sanction/stats`
- **Allowed Roles**: SANCTION, ADMIN

#### `PATCH /sanction/loans/:id/approve`
- **Allowed Roles**: SANCTION, ADMIN
- **Description**: Approves application (`APPLIED` $\rightarrow$ `SANCTIONED`).

#### `PATCH /sanction/loans/:id/reject`
- **Allowed Roles**: SANCTION, ADMIN
- **Request Body**: `{ "rejectionReason": "Income verification mismatch" }`

---

### Disbursement Module

#### `GET /disbursement/loans`
- **Allowed Roles**: DISBURSEMENT, ADMIN

#### `GET /disbursement/loans/:id`
- **Allowed Roles**: DISBURSEMENT, ADMIN

#### `GET /disbursement/stats`
- **Allowed Roles**: DISBURSEMENT, ADMIN

#### `PATCH /disbursement/loans/:id/disburse`
- **Allowed Roles**: DISBURSEMENT, ADMIN
- **Description**: Marks loan as disbursed (`SANCTIONED` $\rightarrow$ `DISBURSED`).

---

### Collection Module

#### `GET /collection/loans`
- **Allowed Roles**: COLLECTION, ADMIN
- **Query Params**: `page`, `limit` (max 50), `search`, `status` (`DISBURSED` | `CLOSED` | `ALL`, default `DISBURSED`)

#### `GET /collection/loans/:id`
- **Allowed Roles**: COLLECTION, ADMIN
- **Description**: Returns loan details, borrower info, and payment history.

#### `GET /collection/stats`
- **Allowed Roles**: COLLECTION, ADMIN

#### `POST /collection/loans/:id/payments`
- **Allowed Roles**: COLLECTION, ADMIN
- **Request Body**:
  ```json
  {
    "utrNumber": "UTR987654321",
    "amount": 25000,
    "paymentDate": "2026-10-10"
  }
  ```
- **Status Codes**:
  - `201`: Payment recorded.
  - `400`: Overpayment (`code: OVERPAYMENT`) or invalid payment date.
  - `409`: Duplicate UTR number (`code: DUPLICATE_UTR`).

---

### Shared Document Module

#### `GET /loans/:id/salary-slip`
- **Allowed Roles**: SANCTION, DISBURSEMENT, ADMIN, owning BORROWER
- **Description**: Streams salary slip file safely. Blocked for `SALES` and `COLLECTION` (HTTP 403). Non-owning borrowers receive HTTP 404.

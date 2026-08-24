# System Design

## Overview

The **Society Maintenance Tracker** is a full-stack web application designed to simplify maintenance complaint management in apartment societies. Residents can raise complaints, attach photos, track complaint status, and view society notices. Administrators can manage complaints, assign priorities, update statuses, maintain a complete complaint history, publish notices, and monitor overdue complaints.

The system uses **React (Vite)** for the frontend, **Node.js + Express** for the backend, and **PostgreSQL** for data storage. **JWT authentication** is used for secure access, while **Multer** handles photo uploads and **Nodemailer** manages email notifications.

## 1. Complaint History Model

A key design decision is keeping the current complaint state separate from its history.

The `complaints` table stores the latest information about each complaint, including its category, description, status, priority, resident, creation time, and photo information.

For tracking changes, the system uses a separate append-only `complaint_history` table containing:

* `complaint_id`
* `old_status`
* `new_status`
* `actor_id`
* `note`
* `created_at`

Whenever an administrator changes a complaint's status, a new history record is inserted instead of overwriting the previous status.

For example:

```text
Created → Open
Open → In Progress
In Progress → Resolved
```

Each status transition records the previous status, new status, administrator responsible for the change, optional notes, and timestamp.

An initial history record is also created when a complaint is submitted. This allows the system to maintain the complete lifecycle of a complaint.

For example, when a resident reports a water leakage issue, an administrator may change the status from `Open` to `In Progress` with the note `Plumber assigned`. Once the issue is fixed, the status can be changed to `Resolved` with another note.

This design provides a complete **audit trail**, improves accountability, and ensures that previous status information is never lost.

Residents can view the history of their own complaints, while administrators can view the history of all complaints.

## 2. Overdue Detection

The system does not store overdue status as a separate database column. Instead, overdue complaints are calculated dynamically when complaints are queried.

A complaint is considered overdue when it has not been resolved and its creation date is older than the configured number of days.

The condition used is:

```sql
status != 'Resolved'
AND created_at < NOW() - INTERVAL 'OVERDUE_DAYS days'
```

The `OVERDUE_DAYS` value is configurable through the `.env` file.

For example:

```text
OVERDUE_DAYS=7
```

means that an unresolved complaint older than seven days is considered overdue.

This approach removes the need for an `is_overdue` database column and avoids requiring a cron job or background process to continuously update complaint records.

Because the condition is evaluated using the current time, the overdue status remains accurate automatically. The admin complaint list can also sort overdue complaints first so that delayed issues receive attention quickly.

The dashboard uses the same logic to calculate the total number of overdue complaints.

## 3. Photo Handling

Residents can optionally attach a photo while submitting a complaint. Photos provide useful visual evidence for problems such as:

* Water leakage
* Damaged infrastructure
* Broken lights
* Garbage-related issues
* Other visible maintenance problems

The frontend sends complaint information using `multipart/form-data` because the request contains both text fields and an image.

The main fields include:

```text
category
description
photo
```

The backend uses **Multer** middleware to process the uploaded image.

The uploaded photo is associated with the corresponding complaint so that administrators can inspect the reported issue while reviewing and resolving it.

Photo uploads are optional, allowing residents to submit complaints even when an image is not available.

This makes the complaint process flexible while still providing administrators with visual evidence when required.

## 4. Notification Flow

The notification system keeps residents informed about important society updates.

Administrators can create notices containing:

* `title`
* `body`
* `is_important`

Important notices are displayed before regular notices so that critical announcements are easier for residents to notice.

For email notifications, the backend uses **Nodemailer** with an SMTP provider such as Gmail, Brevo, or Mailtrap.

SMTP configuration is stored in environment variables:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
```

Keeping these values in environment variables prevents sensitive email credentials from being stored directly in the source code.

The email functionality is designed to be non-blocking. If an email cannot be sent because of an SMTP configuration problem or temporary service issue, the error is logged by the backend without preventing the main API request from completing.

This ensures that notification failures do not interrupt the core complaint-management functionality.

## 5. Authentication and Authorization

The application uses **JWT-based authentication** to protect authenticated API endpoints.

After successful login, the backend returns a JWT token along with user information.

The token is sent with protected requests using:

```text
Authorization: Bearer <token>
```

Role-based authorization is used to separate resident and administrator functionality.

### Resident

Residents can:

* Create maintenance complaints
* Upload complaint photos
* View their own complaints
* View complaint history
* View society notices

### Admin

Administrators can:

* View all complaints
* Filter complaints by category and status
* Change complaint status
* Change complaint priority
* Add status notes
* View complete complaint history
* Create society notices
* View dashboard statistics
* Monitor overdue complaints

This prevents residents from accessing or modifying complaints belonging to other users.

## 6. Overall Architecture

The application follows a simple client-server architecture:

```text
                  ┌──────────────────┐
                  │  React Frontend  │
                  │     (Vite)       │
                  └────────┬─────────┘
                           │
                       Axios + JWT
                           │
                           ▼
                  ┌──────────────────┐
                  │  Express REST    │
                  │      API         │
                  └────────┬─────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐    ┌──────────┐    ┌────────────┐
   │ PostgreSQL │    │  Multer  │    │ Nodemailer │
   │  Database  │    │  Photos  │    │   Email    │
   └────────────┘    └──────────┘    └────────────┘
```

The React frontend communicates with the Express backend through REST APIs using Axios. The backend handles authentication, authorization, complaint management, photo uploads, complaint history, overdue detection, notices, and email notifications.

PostgreSQL provides persistent storage for users, complaints, complaint history, and notices. The separate complaint history table ensures that every status transition is preserved, while dynamic overdue detection keeps complaint prioritization accurate without requiring background jobs.

Overall, the system focuses on **traceability, transparency, secure access, evidence-based complaint reporting, automatic overdue detection, and reliable communication**. The architecture is simple, modular, and suitable for deployment using services such as Render, Railway, and Vercel.

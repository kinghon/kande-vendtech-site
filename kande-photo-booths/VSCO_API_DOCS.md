# VSCO Workspace API Documentation

Base URL: `https://workspace.vsco.co/api/v2/`
Auth: `ApiKeyAuth` header

## Key Endpoints for Dashboard

### Jobs (Events/Bookings)
- `GET /job` - List all jobs
  - `?includeClosed=false` - exclude closed
  - `?stage=booked` - filter by stage (lead/booked/fulfillment/completed)
  - Returns: eventDate, customFields, jobTypeName, title, stage

### Job Worksheet (Full Event Data)
- `GET /job/{jobId}/worksheet` - Get job with events and contacts in ONE call
  - Returns: events[], contacts[], customFields, everything

### Job Contacts
- `GET /job-contact?jobId={id}` - Get contacts/staff for a job
  - jobRoles - who's assigned to what role

### Events (Sessions)
- `GET /event?jobId={id}` - Get events for a job
  - startDate, startTime, endDate, endTime
  - location (address)

### Contacts/Address Book
- `GET /address-book/{id}` - Get contact details
  - firstName, lastName, email, cellPhone

### Orders (Services Booked)
- `GET /job/{jobId}/order` - Get orders for a job
  - lineItems - products/services (can exclude pricing)

### Custom Fields
- `GET /custom-field` - List all custom field definitions
  - canApplyTo: Job or Contact
  - kind: TextField, DropDown, Date, etc.

### Job Roles (Staff Assignments)
- `GET /job-role` - List role types
  - kind: customer, subject, team, vendor

### Users (Staff)
- `GET /user` - List studio staff

## Authentication
Header: `X-API-KEY: {api_key}`



# **Vibe Coding Assessment: Ethara Seat Allocation & Project Mapping System**

## **Assessment Objective**

Build a full-stack application that manages seat allocation for approximately 5,000 employees at Ethara. The system should help employees, HR, Admin, and Project teams quickly identify:

* Where an employee is seated  
* Which project the employee is assigned to  
* Which floor/zone/seat is available  
* Whether a new joiner has been allocated a seat  
* Seat utilization by project, floor, and team  
* AI-based assistance for seat and project queries

Candidates are allowed to use AI tools such as ChatGPT, Claude, Cursor, GitHub Copilot, Replit AI, or any similar tool. However, they must document all prompts used and explain how they validated the AI-generated code.

---

# **1\. Project Title**

Ethara Seat Allocation & Project Mapping System

---

# **2\. Business Scenario**

Ethara currently has around 5,000 employees working across multiple projects. Hiring is ongoing, and new employees are joining frequently. There is a need for a centralized system where employee seating, project mapping, floor allocation, and joining updates can be tracked properly.

The system should allow HR/Admin/Growth teams to upload or maintain employee allocation data and allow employees to search where their seat is allocated and which project they are assigned to.

The application should also include an AI assistant where an employee can ask natural language questions such as:

* “Where is my seat?”  
* “Which project am I assigned to?”  
* “Show all available seats on Floor 3.”  
* “Who is sitting near me?”  
* “How many seats are occupied for Project Talos?”  
* “Allocate a seat for a new employee joining today.”

---

# **3\. Required Features**

## **3.1 Employee Management**

The system should support:

* Employee ID  
* Employee name  
* Email  
* Department  
* Role  
* Joining date  
* Employment status  
* Project assignment  
* Seat allocation status

---

## **3.2 Project Mapping**

The system should support multiple projects such as:

* Indigo  
* Indreed  
* Mydreed  
* Preed  
* Serfy  
* Oreed  
* bedegreed  
* Opreed  
* Serry  
* Kaary  
* Mered

Each employee should be mapped to one active project.

---

## **3.3 Seat Allocation**

Each seat should include:

* Floor  
* Zone  
* Bay  
* Seat number  
* Seat status: Available / Occupied / Reserved / Maintenance  
* Allocated employee  
* Allocated project  
* Allocation date

The system should prevent duplicate seat allocation.

---

## **3.4 New Joiner Allocation**

When a new employee joins:

* Admin/HR should be able to add employee details.  
* System should suggest available seats.  
* Seat should be allocated based on project/team proximity.  
* If no seats are available in the preferred zone, system should suggest alternate zones.  
* Employee should be able to search seat details after allocation.

---

## **3.5 Search & Filter**

Users should be able to search by:

* Employee name  
* Employee ID  
* Email  
* Project  
* Floor  
* Zone  
* Seat status

---

## **3.6 Dashboard**

Create a dashboard showing:

* Total employees  
* Total seats  
* Occupied seats  
* Available seats  
* Reserved seats  
* Project-wise seat allocation  
* Floor-wise occupancy  
* New joiners pending allocation

---

## **3.7 AI Assistant / Vibe Coding Feature**

Add an AI assistant or rule-based natural language query interface.

Minimum requirement:

User can ask:

“Where is employee Amit seated?”

System should respond:

“Amit is seated on Floor 2, Zone B, Bay 4, Seat B4-23. He is assigned to Project Talos.”

Advanced AI requirement:

Use OpenAI / Claude / Gemini / local LLM / LangChain / simple intent parser to answer questions related to:

* Employee seat  
* Project assignment  
* Available seats  
* Team location  
* Seat utilization

If the AI API is not available, candidates can build a fallback keyword-based assistant.

---

# **4\. Technology Requirements**

Candidate may choose any stack, but recommended stack is:

## **Frontend**

* React.js / Next.js  
* Tailwind CSS  
* Simple responsive UI

## **Backend**

* Python FastAPI   
* REST APIs

## **Database**

* PostgreSQL preferred  
* SQLite acceptable for local demo  
* MongoDB acceptable if justified

## **Deployment**

Deploy using one of the following:

* Railway  
* Render  
* Vercel \+ Railway  
* Netlify \+ Render  
* Docker-based deployment

## **Optional**

* Docker  
* Redis caching  
* LangChain  
* OpenAI / Claude / Gemini API  
* CSV upload for employee-seat data

---

# **5\. Required API Endpoints**

## **Employee APIs**

POST /employees  
Create employee

GET /employees  
List employees

GET /employees/{id}  
Get employee details

PUT /employees/{id}  
Update employee

DELETE /employees/{id}  
Deactivate employee

---

## **Project APIs**

POST /projects  
Create project

GET /projects  
List projects

GET /projects/{id}/employees  
List employees in project

---

## **Seat APIs**

POST /seats  
Create seat

GET /seats  
List seats

GET /seats/available  
List available seats

POST /seats/allocate  
Allocate seat to employee

POST /seats/release  
Release seat

---

## **Dashboard APIs**

GET /dashboard/summary  
Return total seats, occupied seats, available seats, employee count

GET /dashboard/project-utilization  
Return project-wise allocation

GET /dashboard/floor-utilization  
Return floor-wise occupancy

---

## **AI Assistant API**

POST /ai/query

Request:

{  
"query": "Where is my seat? My email is amit@ethara.ai"  
}

Response:

{  
"answer": "You are allocated Floor 2, Zone B, Bay 4, Seat B4-23. Your project is Talos."  
}

---

# **6\. Sample Data Requirement**

Candidate must create seed data for:

* 5,000 employees  
* Minimum 5 floors  
* Minimum 10 zones  
* Minimum 5,500 seats  
* Minimum 10 projects  
* At least 500 available seats  
* At least 100 reserved seats  
* At least 50 employees pending allocation

---

# **7\. Database Model Suggestion**

## **employees**

* id  
* employee\_code  
* name  
* email  
* department  
* role  
* joining\_date  
* status  
* project\_id  
* created\_at  
* updated\_at

## **projects**

* id  
* name  
* description  
* manager\_name  
* status  
* created\_at

## **seats**

* id  
* floor  
* zone  
* bay  
* seat\_number  
* status  
* created\_at

## **seat\_allocations**

* id  
* employee\_id  
* seat\_id  
* project\_id  
* allocation\_status  
* allocation\_date  
* released\_date

---

# **8\. Core Business Rules**

1. One employee can have only one active seat.  
2. One seat can be allocated to only one active employee.  
3. Released seats should become available again.  
4. Reserved seats cannot be allocated unless status is changed.  
5. New joiners should be prioritized for available seats near their project team.  
6. Duplicate employee email should not be allowed.  
7. Duplicate seat number on the same floor/zone should not be allowed.  
8. Dashboard should update after every allocation or release.

---

# **9\. AI Tool Usage Requirement**

Candidate must submit a file named:

AI\_PROMPTS.md

This file must include:

* Prompt used for planning  
* Prompt used for backend  
* Prompt used for database design  
* Prompt used for frontend  
* Prompt used for AI assistant  
* Prompt used for debugging  
* Prompt used for deployment  
* What AI generated correctly  
* What AI generated incorrectly  
* What candidate manually fixed  
* How candidate verified correctness

---

# **10\. Prompt Flow Candidate Should Follow**

## **Prompt 1 – Architecture**

“Need prompt for the same”

## **Prompt 2 – Database**

““Need prompt for the same”

## **Prompt 3 – Backend APIs**

“Need prompt for the same”

## **Prompt 4 – Seat Allocation Logic**

““Need prompt for the same.”

## **Prompt 5 – AI Assistant**

“Need prompt for the same.”

## **Prompt 6 – Frontend**

“Need prompt for the same”

## **Prompt 7 – Testing**

“Need prompt for the same”

## **Prompt 8 – Debugging**

“Need prompt for the same”

## **Prompt 9 – Deployment**

“Need prompt for the same”

## **Prompt 10 – Refactoring**

“Need prompt for the same”

ETC.

---

# **11\. Deployment Requirement**

Candidate must deploy the project and share:

* Live frontend URL  
* Live backend URL  
* GitHub repository  
* README.md  
* AI\_PROMPTS.md  
* Sample login credentials if authentication is added  
* API documentation link or Swagger URL

Deployment platforms allowed:

* Railway  
* Render  
* Vercel  
* Netlify  
* Fly.io

---

# **12\. Submission Checklist**

Candidate must submit:

* GitHub repository  
* Live deployment link  
* README.md  
* AI\_PROMPTS.md  
* Database schema  
* Sample seed data  
* Screenshots  
* API documentation  
* Debugging notes  
* Deployment notes


Prep: Delete user Siew Wei Heng, Delete exercise Jumping Jacks

Welcome to the video demonstration for OCS PT Challenge.

In 2025, A fitness challenge called the OCS 59 PT Challenge was proposed, but rep submission was done through google forms. Cadets found this submission process too inconvenient, and the challenge lost traction. Next year in 2026, Comd OCS wants everyone to make an effort. He provided guidance, and thus a webapp idea was born, allowing everyone to track their progress in order to remain competitive.

Introducing the OCS PT Challenge webapp. Let's register a user. 
[
    Name: Siew Wei Heng
    Wing: DIS Wing
    Password: weiheng
]

and now, the app remembers my device. If I close the website [Close  ] and reopen it [Reopen ], I remain logged in.

I can access user settings at the top right [Click icon], where I can change my password, logout, or delete my account. [Close ]

Let's look at the leaderboard. Here we track the target goal of 20,260 reps, view the top achievers at the OCS Level, and monitor my own progress.

[Click on a user]

We can also view other user's score timeline by clicking on their names.

[Close ]

[Click Export button] The leaderboard also supports exporting data to CSV format. Clicking the export button downloads the current view - whether it's Total Reps, Exercise-Based, or All Scores - as a CSV file for offline analysis or record-keeping.

[Open inspect element and set mobile setting.]

The interface is fully responsive. It automatically adapts to mobile or desktop screens, ensuring a smooth experience on any device.

Let's enter an exercise.
[
    Burpees: 20
    Pushups: 20
]

It’s that easy. Now, let’s look at the maintenance side of the application in the Admin Panel.

[Go to admin panel]

Access is role-based. Entering a specific Wing password routes us to that Wing's management dashboard. Let's log in as DIS Wing.

[
    Password: 1o60BOh5eGcy2m38EjBnzp1MO7uKXsrT
]

We are greeted by the User Section. The most efficient way to onboard cadets [Click Nominal Rolls] is by uploading a nominal roll.

For help with the format, [Click ?] click the question mark guide.

[Go to sheets.google.com]

Let's create a csv through Google Sheets.

[input the name column] Let's have the name column. Starting from this column, let's create names. 

[
    "JEFF BEZOS"
    "ELON MUSK"
    "LEE CHONG WEI"
]

Let's download the csv. [Files > Download > .csv] Click on Files, Download, then .csv.

[Go to webapp]

Finally, go back to the OCS PT Challenge web app, [upload ] upload our file, and watch the nominal roll get uploaded.

As you can see, the users tables are updated.

[Click on Create] Clicking on create, we can fill in new cadet names and passwords for fringe cases. Let's create a test user to demonstrate this functionality.

[
    Name: test
]

[Submit] As you can see, the user is created and appears in the users table. Now let's delete this test user to clean up. [Click Delete on test user] [Confirm deletion] The user has been successfully removed from the system.

[Click Edit on a user] To manage scores for a user, we can click the Edit button on any user. This opens the Edit User interface with two tabs: User Details and Score Management. [Click Score Management tab] In the Score Management tab, we can view all scores for that user and delete any scores if needed.

[Close ]

Now let's explore the Reports section. [Go to user registration] To understand how reports work, let's go to the registration page.

[
    Name: JEFF SU
]

If we try to register a name not in the system, the field is blocked. This prevents bots and unauthorized personnel from clogging the database, and accessing the leaderboard or submitting scores.

If a genuine cadet cannot find their name, [Click report] they can submit a report for the admin to review, ideally backed by an instructor's verification. [Submit report]

[Submit the report] After submitting the report, [Go to admin view] let's go to the admin view.

In the correct admin wing, we can see the Reports section. Each report displays its type, such as NEW_ACCOUNT_REQUEST or ACCOUNT_CONFLICT. [Click ? next to Reports] Clicking the question mark next to Reports shows a guide explaining all report types. [Click ? next to type] We can also hover over the question mark next to each report type for a quick explanation. 

[Click Create Account] For new account requests, we can use the quick fix "Create Account" button to immediately create the user account. The report is automatically dismissed after successful creation. Thereafter, the admin should notify the user through relevant channels, and they may proceed to login.

[Go to login page] Let's verify that the account was created successfully by logging in as JEFF SU. [Enter JEFF SU credentials and login] Perfect! The login succeeds, confirming that the account creation process worked correctly.

[Go to register page] For account conflict, let's say that a malicious or careless actor has already signed into your account before you even did, and set a password "weiheng" so that you cannot login. Let's simulate the victim trying to register with their desired password.

[
    Name: SIEW WEI HENG
    Wing: DIS WING
    Password: lmao
]

The account conflict report pops up, allowing me to fill out a report to the admin in order to rectify this issue. Ideally, I would approach an instructor in order to further legitimize the report.

[Submit the report] [Go to admin view]

We can see the account conflict report in our admin view. Notice the report type is displayed as ACCOUNT_CONFLICT. [Click Approve Account] We can use the quick fix "Approve Account" button to approve the existing account and update the password to the one provided in the report, which is "lmao". This will automatically log out any users who were logged in with the old password, ensuring security. The report can be dismissed after handling.

[Go to login page] Now let's verify that the password change worked. First, let's try logging in with the old password "weiheng". [Enter weiheng as password] As expected, this fails because the password has been changed. Now let's try with the new password "lmao". [Enter lmao as password] Perfect! The login succeeds, confirming that the approval process successfully updated the password.

What if we want to add exercises? That would have to be on OCS level. [Go to OCS Level 8CX9XfgxDVtDPIPcZ03DumN7oMKqIoOB] Let's go there.

Creating exercises is just as easy as a form field. Let's add "Jumping Jacks". [Enter jumping jacks into create exercise and submit]

Let's take a look at how it looks like from the user's perspective [Go to user view and login]

This concludes the current feature set for the OCS PT Challenge. I hope you've gained a better understanding of the project.

---

## Recording Instructions

### Pre-Recording Setup
- [ ] **Delete user**: Siew Wei Heng, JEFF BEZOS, ELON MUSK, LEE CHONG WEI
- [ ] **Delete exercise**: Jumping Jacks
- [ ] **Logout** from admin panel
- [ ] Delete the sheets.google.csv fields and zoom in 240%

---

### User Registration & Basic Features

**1. Register New User**
- Name: `Siew Wei Heng`
- Wing: `DIS Wing`
- Password: `weiheng`

**2. Test Session Persistence**
- Close the website
- Reopen the website

**3. User Settings**
- Click **user icon** (top right)
- Close the modal

**4. Leaderboard Features**
- Click on a **user name** (in leaderboard)
- View user score timeline
- Close the modal

**4a. Export Leaderboard Data**
- Click the **Export button** (download icon) in the leaderboard header
- Verify CSV file downloads with appropriate filename based on current tab:
  - Total Reps tab: `total-reps-leaderboard-YYYY-MM-DD.csv`

**5. Mobile Responsiveness**
- Open **inspect element** and set mobile view
- Enter exercises:
  - Burpees: `20`
  - Pushups: `20`
- Exit mobile setting

---

### Admin Panel - Wing Level

**6. Admin Login (Wing Level)**
- Go to **admin panel**
- Password: `Wm1qIhpmiJlhb2Qe71D0OD4nbbKMCnae`

**7. Nominal Roll Upload**
- Click **"Upload Nominal Roll"** button
- Click **?** (help button) to view guide
- Go to **sheets.google.com**
- Create CSV with name column:
  - `JEFF BEZOS`
  - `ELON MUSK`
  - `LEE CHONG WEI`
- **Files > Download > .csv**
- Return to webapp
- **Upload** the CSV file
- Verify users table is updated

**8. Manual User Creation and Deletion**
- Click **"Create User"** button
- Fill in the form:
  - Name: `test`
  - Wing: `DIS Wing`
  - Password: `test123`
- Click **"Create"** or **"Submit"** button
- Verify user appears in the users table
- Click **"Delete"** button on the "test" user
- Confirm deletion in the confirmation modal
- Verify user is removed from the table

**9. Score Management (via Edit User)**
- Click **"Edit"** button on "Bryan" in the Users table
- Click **"Score Management"** tab in the Edit User modal
- View scores for that user
- (Optional) Click **"Delete"** on a score to test deletion
- Close the modal

---

### Reports Feature - New Account Request

**11. Test Registration Block**
- Go to **user registration** page
- Try to register: Name: `JEFF SU` (not in system)
- Verify field is blocked

**12. Submit New Account Report**
- Click **"Report"** button
- Fill out report form:
  - Name: `JEFF SU`
  - Wing: DIS WING
  - Password: weiheng
  - (Optional) Fill in email, phone, notes
- **Submit report**

**13. Admin Review - New Account**
- Go to **admin view**
- Click **?** next to "Reports" (view guide)
- Hover over **?** next to report type (view explanation)
- Click **"Create Account"** button (quick fix)

**13a. Verify Account Creation - Login as JEFF SU**
- Go to **login page**
- Enter credentials:
  - Name: `JEFF SU`
  - Wing: DIS WING
  - Password: weiheng
- Click **Login** or press Enter
- Verify login succeeds and user is logged in

---

### Reports Feature - Account Conflict

**14. Simulate Account Conflict**
- **First, ensure account exists with password "weiheng"** (this should already exist from initial registration)
- Go to **register page**
- Try to register:
  - Name: `SIEW WEI HENG`
  - Wing: `DIS WING`
  - Password: `lmao`
- Account conflict report should appear
- **Submit the report** (with password "lmao" in the report)

**15. Admin Review - Account Conflict**
- Go to **admin view**
- Verify report type shows `ACCOUNT_CONFLICT`
- Click **"Approve Account"** button (quick fix)
- Note: This updates the password to "lmao" and logs out users with old tokens

**15a. Verify Password Change**
- Go to **login page**
- Try to login with:
  - Name: `SIEW WEI HENG`
  - Wing: `DIS WING`
  - Password: `weiheng` (old password)
- Verify login **fails** (password no longer works)
- Try to login with:
  - Name: `SIEW WEI HENG`
  - Wing: `DIS WING`
  - Password: `lmao` (new password from report)
- Verify login **succeeds** (password was successfully updated)

---

### Admin Panel - OCS Level

**16. Admin Login (OCS Level)**
- Logout from wing admin
- Go to **admin panel**
- Password: `8CX9XfgxDVtDPIPcZ03DumN7oMKqIoOB`

**17. Create Exercise**
- Enter exercise name: `Jumping Jacks`
- **Submit** the form

**18. Verify Exercise in User View**
- Go to **user view** and login
- Verify "Jumping Jacks" exercise appears at the bottom


### Keys

**6. Admin Login (Wing Level)**
- Password: `Wm1qIhpmiJlhb2Qe71D0OD4nbbKMCnae`

**16. Admin Login (OCS Level)**
- Password: `8CX9XfgxDVtDPIPcZ03DumN7oMKqIoOB`
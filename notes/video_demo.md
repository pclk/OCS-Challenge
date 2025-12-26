Prep: Delete user Siew Wei Heng

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
    "Bryan Lim"
    "Myan Ra"
    "Jeff"
]

Let's download the csv. [Files > Download > .csv] Click on Files, Download, then .csv.

[Go to webapp]

Finally, go back to the OCS PT Challenge web app, [upload ] upload our file, and watch the nominal roll get uploaded.

As you can see, the users tables are updated.

[Click on Create] Clicking on create, we can fill in new cadet names and passwords for fringe cases.

[Close ]

We can view the score management accordingly here.

Now let's explore the Reports section. [Go to user registration] To understand how reports work, let's go to the registration page.

[
    Name: damien
]

If we try to register a name not in the system, the field is blocked. This prevents bots and unauthorized personnel from clogging the database, and accessing the leaderboard or submitting scores.

If a genuine cadet cannot find their name, [Click report] they can submit a report for the admin to review, ideally backed by an instructor's verification. [Submit report]

[Submit the report] After submitting the report, [Go to admin view] let's go to the admin view.

In the correct admin wing, we can see the Reports section. Each report displays its type, such as NEW_ACCOUNT_REQUEST or ACCOUNT_CONFLICT. [Click ? next to Reports] Clicking the question mark next to Reports shows a guide explaining all report types. [Click ? next to type] We can also hover over the question mark next to each report type for a quick explanation. 

[Click Create Account] For new account requests, we can use the quick fix "Create Account" button to immediately create the user account. The report is automatically dismissed after successful creation. Thereafter, the admin should notify the user through relevant channels, and they may proceed to login.

[Go to register page] For account conflict, let's say that a malicious or careless actor has already signed into your account before you even did, and set a password so that you cannot login. Let's simulate the victim.

[
    Name: SIEW WEI HENG
    Wing: DIS WING
    Password: lmao
]

The account conflict report pops up, allowing me to fill out a report to the admin in order to rectify this issue. Ideally, I would approach an instructor in order to further legitimize the report.

[Submit the report] [Go to admin view]

We can see the account conflict report in our admin view. Notice the report type is displayed as ACCOUNT_CONFLICT. [Click Approve Account] We can use the quick fix "Approve Account" button to approve the existing account, resolving the conflict. Alternatively, we may resolve the account by replacing the password via deletion and recreation if needed. The report can be dismissed after handling.

This concludes the current feature set for the OCS PT Challenge. I hope you've gained a better understanding of the project.
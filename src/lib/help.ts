// Content of the "i" information panel. Plain language, step by step.
export type Help = { title: string; summary: string; steps: string[]; notes?: string[] };

const HELP: { match: (p: string) => boolean; help: Help }[] = [
  {
    match: (p) => p === '/dashboard',
    help: {
      title: 'Dashboard',
      summary: 'Your starting page. It shows what needs your attention today.',
      steps: [
        'Cards at the top show unread objections, pending approvals or your next class — depending on what you do here.',
        'Use the menu on the left to open any page.',
        'The bell icon (top right) opens your notification centre.',
      ],
    },
  },
  {
    match: (p) => p === '/profile',
    help: {
      title: 'My profile',
      summary: 'Your Profile and Performance Sheet. Keep it correct and complete.',
      steps: [
        'Click “Change photo”, choose a picture, then drag and zoom to crop it. Press “Use this photo”.',
        'Edit your details and press “Submit changes”.',
        'Your changes are NOT public yet. A Developer, IT Technician or Authority must approve them first.',
        'You will get a notification when your changes are approved or rejected.',
      ],
      notes: [
        'Fields marked “Managed by administration” (ID No., Position, Supervisor, Date of joining, Observations) can only be changed by administration.',
      ],
    },
  },
  {
    match: (p) => p === '/my-routine',
    help: {
      title: 'My routine',
      summary: 'Your own class routine. It is worked out automatically from the main routine.',
      steps: [
        'Pick a day with the tabs at the top.',
        'Each row is a period with its time. The class you teach is shown on the right.',
        'Your form class is shown in the card at the top.',
        'A notification is sent to you before each class starts.',
      ],
      notes: ['You cannot edit this page. If something is wrong, tell the Routine Coordinator.'],
    },
  },
  {
    match: (p) => p === '/routine',
    help: {
      title: 'Routine editor',
      summary: 'Build and update the class routine for the Junior and Senior sections.',
      steps: [
        'Choose Junior or Senior Section, then choose the day.',
        'Each row is a mentor. Each column is a period. Type the class and section (for example “Six-A”) in the cell.',
        'Red cells mean a clash. Read the warning list above the table to see what is wrong.',
        'Press “Save routine”. Every mentor whose routine changed gets a notification.',
        'Use “Edit periods and times” to change period names or timings.',
      ],
      notes: [
        'A clash means the same class is booked twice at the same time, or one mentor has two classes at the same time.',
        'Clashes are warnings. You can still save, but check them first.',
      ],
    },
  },
  {
    match: (p) => p === '/routine/periods',
    help: {
      title: 'Periods and times',
      summary: 'Set the names and timings of the columns used in the routine.',
      steps: [
        'Change a name or time, then press “Save periods”.',
        'Use the small number in “Order” to move a period left or right.',
        'Add a new period at the bottom. Removing a period also removes the classes placed in it.',
      ],
      notes: ['Times are in Bangladesh time. Mentors are notified when timings change.'],
    },
  },
  {
    match: (p) => p === '/directory',
    help: {
      title: 'Mentor directory',
      summary: 'Contact details of all mentors.',
      steps: ['Press “Call” or “Email” on a card to contact a mentor.', 'Use the search box to find a name quickly.'],
    },
  },
  {
    match: (p) => p === '/notifications',
    help: {
      title: 'Notification centre',
      summary: 'Everything the system has told you, newest first.',
      steps: [
        'Bold items are unread. Click an item to open it.',
        'Press “Mark all as read” to clear the unread count.',
      ],
    },
  },
  {
    match: (p) => p === '/objections',
    help: {
      title: 'My objections',
      summary: 'Objections added about you by the Authority.',
      steps: ['Only you (and the Developer) can see these.', 'Open an objection to read it fully.'],
    },
  },
  {
    match: (p) => p === '/settings',
    help: {
      title: 'Settings',
      summary: 'Notifications and password.',
      steps: [
        'Every notification is sent by browser and by e-mail. You can switch one of them off.',
        'You cannot switch both off at the same time.',
        'To get browser notifications, press “Enable on this browser” and allow it when your browser asks.',
        'To change your password, enter your current one and a new one. Or press “E-mail me a reset link”.',
      ],
    },
  },
  {
    match: (p) => p === '/employees',
    help: {
      title: 'Employees',
      summary: 'The full employee list.',
      steps: [
        'Search by name, designation or e-mail.',
        'Open a person to see their details, add an objection, or (IT Technician / Developer) manage their account.',
        'Authority and Developer can print every profile with “Print all profiles”.',
      ],
    },
  },
  {
    match: (p) => p === '/employees/new',
    help: {
      title: 'Add an employee',
      summary: 'Create one account.',
      steps: [
        'Enter the name, e-mail and designation.',
        'Tick the roles this person needs. People only see their designation, not their roles.',
        'Enter an ID number. The employee signs in with that ID and uses the same value as their initial password. E-mail is optional.',
      ],
      notes: ['Only a Developer can create a Developer or IT Technician account.'],
    },
  },
  {
    match: (p) => p === '/employees/import',
    help: {
      title: 'Import from a spreadsheet',
      summary: 'Create many accounts at once from an Excel (.xlsx) or CSV file.',
      steps: [
        '1. Choose your file. The first row must contain column headings.',
        '2. Check the preview. Above each column you can see what it will be imported as. Change a match if it is wrong.',
        '3. Fix any rows marked with a problem, or leave them — they are skipped.',
        '4. Press “Import”. Each employee starts with their ID number as both sign-in ID and password. Invitation e-mails are sent when an e-mail address is provided.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/employees/'),
    help: {
      title: 'Employee details',
      summary: 'One employee’s profile and tools.',
      steps: [
        'Authority and Developer can read the full profile and print it with “Print profile”.',
        'Authority and Developer can add an objection. Only that employee (and the Developer) can read it.',
        'IT Technician and Developer can change designation and roles, or send a new set-password link.',
      ],
    },
  },
  {
    match: (p) => p === '/approvals',
    help: {
      title: 'Approvals',
      summary: 'Profile changes waiting for approval.',
      steps: [
        'Each card shows what the employee wants to change: old value and new value.',
        'Press “Approve” to save the change to their profile, or “Reject” (you may write a reason).',
        'The employee is notified either way.',
      ],
      notes: ['You cannot approve your own changes.'],
    },
  },
];

const FALLBACK: Help = {
  title: 'Help',
  summary: 'This is the K C Model School & College employee system.',
  steps: ['Use the menu on the left to move around.', 'Press the “i” button on any page for help about that page.'],
};

export function getHelp(pathname: string): Help {
  return HELP.find((h) => h.match(pathname))?.help ?? FALLBACK;
}

export const GENERAL_HELP: string[] = [
  'You see your designation (for example “Assistant Teacher”). The system uses hidden roles to decide what you may do.',
  'Notifications reach you in the notification centre, by browser, and by e-mail. You can turn off one of the two, not both.',
  'Forgot your password? Press “Forgot password?” on the sign-in page.',
];

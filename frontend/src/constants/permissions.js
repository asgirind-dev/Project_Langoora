// frontend/src/constants/permissions.js
export const PERMISSIONS_LIST = [
  {
    key: 'verify_tutors',
    label: 'Tutor Verification Power',
    desc: 'Approve or reject external partner academy tutors.',
  },
  {
    key: 'audit_exams',
    label: 'Exam Quality Audit Power',
    desc: 'Inspect question matrices and structures for quality assurance.',
  },
  {
    key: 'resolve_disputes',
    label: 'Resolve Content Disputes',
    desc: 'Settle student arguments and recheck requests.',
  },
  {
    key: 'manage_subscriptions',
    label: 'Subscription Framework Manager',
    desc: 'Modify packages, pricing, and active credit values.',
  },
  {
    key: 'approve_payouts',
    label: 'Tutor Payouts Approver',
    desc: 'Validate accumulated tutor credits and authorize bank transfers.',
  },
  {
    key: 'view_ledger',
    label: 'Transaction Ledger Auditor',
    desc: 'View full platform financial inflows and outflows ledger.',
  },
];
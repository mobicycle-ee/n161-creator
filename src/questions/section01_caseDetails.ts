// Question 1: Details of the case (Section 1 of N161)

export const QUESTION1_FIELDS = [
  { id: '1.1', label: 'Case number', required: true, hint: 'The case number from the court order' },
  { id: '1.2', label: 'Case name', required: true, hint: 'The full case name as it appears on the order' },
  { id: '1.3', label: 'Full name of appellant', required: true, hint: 'The person/entity appealing the decision' },
  { id: '1.4', label: 'Full name of respondent(s)', required: true, hint: 'The other party/parties in the case' },
  { id: '1.5', label: 'Date of order/decision being appealed', required: true, hint: 'The date the order was made' },
  { id: '1.6', label: 'Name of Judge', required: true, hint: 'The judge who made the decision' },
  { id: '1.7', label: 'Court or tribunal', required: true, hint: 'The court where the decision was made' },
  { id: '1.8', label: 'Claim number (if different)', required: false, hint: 'If different from case number' }
];

export const QUESTION1_PROMPT = `
You are analyzing a court order to extract case details for Section 1 of an N161 Appeal form.

Please extract the following information from the court order:

1. Case number - Look for case numbers, references like "AC-2025-LON-002606", "K10CL521", etc.
2. Case name - The full case name as it appears (e.g., "Roman House vs Claimant Ltd")
3. Full name of appellant - The person/entity appealing (usually the losing party in the original case)
4. Full name of respondent(s) - The other parties in the case
5. Date of order/decision being appealed - When the order was made
6. Name of Judge - The judge who made the decision (e.g., "HHJ Gerald", "Justice Lang DBE")
7. Court or tribunal - Where the decision was made
8. Claim number (if different from case number)

Return the information in JSON format with the field IDs as keys.

Important:
- If information is not clearly stated, indicate this with "Not specified in order"
- Be precise and use exact names and numbers from the order
- For appellant/respondent, consider who would logically be appealing (usually the losing party)
`;
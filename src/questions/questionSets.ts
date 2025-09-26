import { QUESTION1_FIELDS } from './section01_caseDetails';

export interface QuestionDefinition {
  id?: string;
  label: string;
  hint?: string;
}

export interface SectionQuestions {
  title: string;
  questions: QuestionDefinition[];
}

const section1Questions: QuestionDefinition[] = QUESTION1_FIELDS.map((field) => ({
  id: field.id,
  label: field.label,
  hint: field.hint,
}));

export const QUESTION_SETS: Record<string, SectionQuestions> = {
  section1: {
    title: 'Section 1 - Details of the case',
    questions: section1Questions,
  },
  section2: {
    title: 'Section 2 - Appeal Details',
    questions: [
      { id: '2.1', label: 'From which court is the appeal being brought, and if it is the High Court, which division applies?' },
      { id: '2.2', label: 'What is the name of the judge whose decision is being appealed?' },
      { id: '2.3', label: 'What is the status of that judge (for example District Judge, Circuit Judge/Recorder, Master, High Court Judge/Deputy, Tribunal Judge, Justice of the Peace)?' },
      { id: '2.4', label: 'What is the date of the decision you wish to appeal against?' },
      { id: '2.5', label: 'Is the decision you wish to appeal itself a previous appeal decision (Yes/No)?' },
    ],
  },
  section3: {
    title: 'Section 3 - Legal Representation',
    questions: [
      { id: '3.1', label: 'Are you, the appellant, legally represented for this appeal (Yes/No)?' },
      { id: '3.2', label: 'If represented, what type of representative is acting (solicitor, counsel conducting litigation, counsel for hearings only)?' },
      { id: '3.3', label: "What are the representative's contact details (name, address with postcode, DX number, telephone, fax, email, internal reference)?" },
      { id: '3.4', label: 'Are you, the appellant, in receipt of a Civil Legal Aid Certificate (Yes/No)?' },
      { id: '3.5', label: 'Is the respondent legally represented (Yes/No)?' },
      { id: '3.6', label: "If the respondent is represented, what are that representative's contact details (name, address with postcode, DX number, telephone, fax, email, reference)?" },
    ],
  },
  section4: {
    title: 'Section 4 - Permission to Appeal',
    questions: [
      { id: '4.1', label: 'Do you need permission to appeal in this case (Yes/No)?' },
      { id: '4.2', label: 'Has permission to appeal already been granted by the lower court (Yes/No)?' },
      { id: '4.3', label: 'If permission has been granted, when was it granted and by which judge?' },
      { id: '4.4', label: 'If permission was only granted in part, do you now seek permission for the refused grounds (Box A)?' },
      { id: '4.5', label: 'If permission has not yet been granted, do you ask the appeal court to grant permission in this notice (Box B)?' },
    ],
  },
  section5: {
    title: 'Section 5 - Order Being Appealed',
    questions: [
      { id: '5.1', label: "Have you lodged this appellant's notice within the required time limit (Yes/No)?" },
      { id: '5.2', label: 'Which order or parts of the order are you appealing against?' },
      { id: '5.3', label: 'If lodging out of time, what explanation will you provide in Section 11 and/or Section 10 Part B?' },
    ],
  },
  section6: {
    title: 'Section 6 - Grounds of Appeal',
    questions: [
      { id: '6.1', label: 'Do you confirm that the detailed grounds of appeal are attached on a separate sheet (Yes/No)?' },
      { id: '6.2', label: "What are the numbered grounds showing why the judge's order was wrong (set out on the attached sheet)?" },
    ],
  },
  section7: {
    title: 'Section 7 - Skeleton Argument',
    questions: [
      { id: '7.1', label: 'Is the skeleton argument in support of the grounds attached to this notice (Yes/No)?' },
      { id: '7.2', label: 'If not attached, will the skeleton argument be filed within 14 days of lodging this notice (Yes/No)?' },
      { id: '7.3', label: 'For appeals other than to the Court of Appeal (for example planning matters), is any additional skeleton argument provided, and if so what is included?' },
    ],
  },
  section8: {
    title: 'Section 8 - Aarhus Convention Claim',
    questions: [
      { id: '8.1', label: 'Do you contend that this appeal is an Aarhus Convention claim (Yes/No)?' },
      { id: '8.2', label: 'If the appeal is an Aarhus claim, do you wish the CPR Part 45 Aarhus costs limits to apply (Yes/No)?' },
      { id: '8.3', label: 'If you do not want the default costs limits to apply, what grounds support disapplying them?' },
      { id: '8.4', label: 'If claiming Aarhus status, what is the basis for that assertion (set out in the box provided)?' },
    ],
  },
  section9: {
    title: 'Section 9 - Relief Sought from the Appeal Court',
    questions: [
      { id: '9.1', label: 'Which remedy do you ask the appeal court to grant (set aside the order, vary the order, order a new trial)?' },
      { id: '9.2', label: 'If you seek to vary the order, what substituted order or wording are you asking the court to make?' },
      { id: '9.3', label: 'If you seek any other specific relief, how should the appeal court frame that order?' },
    ],
  },
  section10: {
    title: 'Section 10 - Other Applications',
    questions: [
      { id: '10.1', label: 'Are you applying for a stay of execution (Part A)? If yes, what stay is required and why?' },
      { id: '10.2', label: 'Are you applying for an extension of time to file the appeal notice (Part B)? If yes, what period and reasons apply?' },
      { id: '10.3', label: 'Are you asking the appeal court to make any additional order (Part C)? If yes, what precise order do you want?' },
      { id: '10.4', label: 'For every requested order above, which supporting reasons and evidence will you set out in Section 11?' },
    ],
  },
  section11: {
    title: 'Section 11 - Evidence in Support',
    questions: [
      { id: '11.1', label: 'What reasons support each application made in Section 10 (stay, extension, other order)?' },
      { id: '11.2', label: 'What evidence (facts, documents, witness statements, transcripts) do you rely on for each requested order?' },
      { id: '11.3', label: 'How do the evidence pieces link to the relief sought and the grounds of appeal?' },
    ],
  },
  section12: {
    title: 'Section 12 - Vulnerability',
    questions: [
      { id: '12.1', label: 'Do you or any witness need adjustments because of vulnerability (Yes/No)?' },
      { id: '12.2', label: 'If yes, what is the nature of the vulnerability and what steps, support, or adjustments do you ask the court and judge to provide?' },
    ],
  },
  section13: {
    title: 'Section 13 - Supporting Documents',
    questions: [
      { id: '13.1', label: "Have you filed the required number of appellant's notices and grounds of appeal copies for the appeal court and for each respondent?" },
      { id: '13.2', label: 'Have you provided a sealed copy of the order or tribunal determination being appealed?' },
      { id: '13.3', label: "Have you filed any order granting or refusing permission to appeal together with the judge's reasons?" },
      { id: '13.4', label: 'Have you supplied any witness statement or affidavit supporting applications included in the notice?' },
      { id: '13.5', label: "Where the challenged decision was itself made on appeal, have you filed the first order, reasons, and original appellant's notice?" },
      { id: '13.6', label: 'For judicial review or statutory appeals, have you filed the original decision that was before the lower court?' },
      { id: '13.7', label: 'Have you provided the skeleton argument(s) in support of the appeal or permission application?' },
      { id: '13.8', label: 'Have you supplied the approved transcript of the judgment?' },
      { id: '13.9', label: 'Have you included the Civil Legal Aid Agency certificate (if relying on it)?' },
      { id: '13.10', label: 'For any document not yet supplied, what is the reason and when will it be provided (recorded in the continuation box)?' },
    ],
  },
  section14: {
    title: 'Section 14 - Statement of Truth and Signature',
    questions: [
      { id: '14.1', label: 'Who is completing the statement of truth (appellant, litigation friend, authorised legal representative)?' },
      { id: '14.2', label: 'Do you confirm that the facts stated in Section 11 are true, or that the applicant believes them to be true?' },
      { id: '14.3', label: 'What is the full name of the signatory?' },
      { id: '14.4', label: 'If signing on behalf of a firm or company, what is the firm name and the position or office held by the signatory?' },
      { id: '14.5', label: 'On what date (day, month, year) is the statement signed?' },
      { id: '14.6', label: 'What is the signature provided on the notice?' },
    ],
  },
};

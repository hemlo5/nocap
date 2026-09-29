import type {
  EmploymentType,
  JobField,
  StartupRoleType,
  WorkMode,
} from "@/lib/types";
import { normalizeKey } from "@/lib/utils/strings";

export function classifyEmploymentType(text: string): EmploymentType {
  const value = normalizeKey(text);

  if (/\b(intern|internship|trainee|apprentice|campus)\b/.test(value)) {
    return "internship";
  }
  if (/\b(part time|part-time)\b/.test(value)) {
    return "part_time";
  }
  if (/\b(contract|contractor|temporary|freelance)\b/.test(value)) {
    return "contract";
  }
  return "full_time";
}

export function classifyWorkMode(text: string): WorkMode {
  const value = normalizeKey(text);

  if (/\b(remote|work from home|wfh|distributed)\b/.test(value)) {
    return "remote";
  }
  if (/\b(hybrid)\b/.test(value)) {
    return "hybrid";
  }
  return "onsite";
}

export function classifyField(text: string): JobField {
  const value = normalizeKey(text);

  if (/\b(ai|ml|machine learning|data science|genai|llm|deep learning)\b/.test(value)) {
    return "ai_ml";
  }
  if (
    /\b(software|engineer|developer|backend|frontend|full stack|devops|sre|platform|security|data engineer|qa|test automation|technical support)\b/.test(
      value,
    )
  ) {
    return "software";
  }
  if (/\b(product manager|product management|product designer|product)\b/.test(value)) {
    return "product";
  }
  if (/\b(design|designer|ux|ui|creative|art director)\b/.test(value)) {
    return "design";
  }
  if (/\b(finance|accounting|tax|payroll|treasury|controllership|analyst)\b/.test(value)) {
    return "finance";
  }
  if (/\b(marketing|brand|growth|content|seo|social)\b/.test(value)) {
    return "marketing";
  }
  if (/\b(sales|account executive|business development|customer success|revenue)\b/.test(value)) {
    return "sales";
  }
  if (/\b(operations|compliance|support|legal|people|hr|recruiting|facilities)\b/.test(value)) {
    return "operations";
  }
  return "other";
}

export function extractSkills(text: string): string[] {
  const known = [
    "React",
    "TypeScript",
    "JavaScript",
    "Python",
    "Java",
    "Go",
    "Ruby",
    "SQL",
    "Node.js",
    "Kubernetes",
    "AWS",
    "Machine Learning",
    "AI",
    "Data Science",
  ];
  const lower = text.toLowerCase();
  return known.filter((skill) => lower.includes(skill.toLowerCase()));
}

export function classifyStudentRelevant(text: string): boolean {
  const value = normalizeKey(text);
  return /\b(intern|internship|student|undergraduate|campus|new grad|newgrad|graduate program|graduate engineer|0-1 years|0 to 1 years|0-2 years|0 to 2 years|trainee|apprentice|fresher|entry level)\b/.test(
    value,
  );
}

export function classifyStartupRoleType(text: string): StartupRoleType {
  const value = normalizeKey(text);

  if (
    /\b(founder'?s office|founders office|founder associate|founders associate|chief of staff|eir|entrepreneur in residence|strategy operations|strategy and operations|bizops|business operations)\b/.test(
      value,
    )
  ) {
    return "founder_office";
  }
  if (
    /\b(research scientist|research engineer|applied scientist|scientist|research)\b/.test(
      value,
    )
  ) {
    return "research";
  }
  if (/\b(product manager|product management|product owner|product)\b/.test(value)) {
    return "product";
  }
  if (/\b(design|designer|ux|ui|brand designer|visual)\b/.test(value)) {
    return "design";
  }
  if (/\b(growth|gtm|go to market|go-to-market|partnership|business development)\b/.test(value)) {
    return "growth";
  }
  if (/\b(sales|account executive|customer success|revenue)\b/.test(value)) {
    return "sales";
  }
  if (/\b(marketing|content|seo|social|community)\b/.test(value)) {
    return "marketing";
  }
  if (/\b(finance|accounting|tax|payroll|treasury|analyst)\b/.test(value)) {
    return "finance";
  }
  if (/\b(operations|people|hr|recruiting|talent|legal|support)\b/.test(value)) {
    return "operations";
  }
  if (
    /\b(engineer|engineering|developer|software|backend|frontend|full stack|devops|sre|platform|security|data engineer|qa)\b/.test(
      value,
    )
  ) {
    return "engineering";
  }
  return "other";
}

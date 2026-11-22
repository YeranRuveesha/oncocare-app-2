// Dropdown options shared by the forms, the validation schemas and the database checks.
export const DIAGNOSES = ["AML", "ALL", "Lymphoma", "Thalassemia", "Other"] as const;
export const TRANSPLANT_TYPES = ["Autologous", "Allogeneic"] as const;
export const GENDERS = ["Male", "Female", "Binary", "Non-binary", "Other", "Prefer not to say"] as const;
export const RELATIONSHIPS = [
  "Mother", "Father", "Spouse/Partner", "Son", "Daughter", "Brother", "Sister", "Guardian", "Friend", "Other",
] as const;
export const QUALIFICATIONS = ["MBBS", "MD", "MS", "MRCP", "FRCP", "PhD"] as const;
export const SPECIALTIES = [
  "Haematology", "Clinical Oncology", "Paediatric Haematology/Oncology", "Bone Marrow Transplantation",
  "Internal Medicine", "Paediatrics", "General Medicine", "Other",
] as const;
export const HOSPITAL_TYPES = ["Government", "Private", "Teaching", "Other"] as const;
export const CLINICIAN_ROLE_OPTIONS = [
  { value: "junior_doctor", label: "Junior Doctor" },
  { value: "senior_consultant", label: "Senior Consultant" },
] as const;

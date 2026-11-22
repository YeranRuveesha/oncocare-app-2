import { Badge } from "@/components/ui/badge";
import { HOSPITAL_STATUS_LABEL, type HospitalStatus } from "@/lib/roles";

export default function HospitalStatusBadge({ status }: { status: HospitalStatus }) {
  const v = status === "active" ? "routine" : status === "deactivated" ? "emergency" : "urgent";
  return <Badge variant={v}>{HOSPITAL_STATUS_LABEL[status]}</Badge>;
}

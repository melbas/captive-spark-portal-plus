
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../../LanguageContext";

interface PendingInvitesAlertProps {
  pendingInvites: number;
}

const PendingInvitesAlert: React.FC<PendingInvitesAlertProps> = ({ pendingInvites }) => {
  const { t } = useLanguage();

  if (pendingInvites <= 0) return null;

  return (
    <Alert className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {pendingInvites} {t("pendingInvitations")}
      </AlertDescription>
    </Alert>
  );
};

export default PendingInvitesAlert;

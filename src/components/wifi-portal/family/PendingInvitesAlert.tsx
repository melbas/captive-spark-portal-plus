
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
    <Alert className="mt-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 animate-slide-in">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-pulse" />
      <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
        <span className="inline-flex items-center gap-2">
          <span className="bg-orange-200 dark:bg-orange-800 px-2 py-1 rounded-full text-xs font-bold">
            {pendingInvites}
          </span>
          {t("pendingInvitations")}
        </span>
      </AlertDescription>
    </Alert>
  );
};

export default PendingInvitesAlert;

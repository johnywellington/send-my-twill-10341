import { useEffect } from "react";
import { UserProfile } from "@/features/admin/hooks/use-users";
import { useUserActivity } from "@/features/admin/hooks/use-user-activity";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  LogIn,
  Shield,
  Ban,
  CheckCircle,
  Edit,
  Trash2,
  UserPlus,
  Settings,
} from "lucide-react";
import { format } from "date-fns";

interface UserActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
}

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case "login":
      return <LogIn className="h-4 w-4 text-blue-500" />;
    case "role_changed":
      return <Shield className="h-4 w-4 text-purple-500" />;
    case "suspended":
      return <Ban className="h-4 w-4 text-red-500" />;
    case "activated":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "profile_updated":
      return <Edit className="h-4 w-4 text-orange-500" />;
    case "account_deleted":
      return <Trash2 className="h-4 w-4 text-red-600" />;
    case "account_created":
      return <UserPlus className="h-4 w-4 text-green-600" />;
    case "settings_changed":
      return <Settings className="h-4 w-4 text-gray-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const getActivityColor = (actionType: string) => {
  switch (actionType) {
    case "login":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "role_changed":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "suspended":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "activated":
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "profile_updated":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "account_deleted":
      return "bg-red-600/10 text-red-800 dark:text-red-400";
    case "account_created":
      return "bg-green-600/10 text-green-800 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const UserActivityDialog = ({ open, onOpenChange, user }: UserActivityDialogProps) => {
  const { activities, loading, fetchActivity } = useUserActivity();

  useEffect(() => {
    if (user && open) {
      fetchActivity(user.user_id, 50);
    }
  }, [user, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Atividades</DialogTitle>
          <DialogDescription>
            Registro completo de ações de <strong>{user?.full_name}</strong> no sistema
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma atividade registrada</h3>
              <p className="text-muted-foreground">
                Este usuário ainda não possui histórico de atividades
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.action_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="font-medium">{activity.description}</div>
                          <Badge variant="outline" className={getActivityColor(activity.action_type)}>
                            {activity.action_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>
                              {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm:ss")}
                            </span>
                          </div>
                          
                          {activity.ip_address && (
                            <div className="flex items-center gap-1">
                              <span>🌐</span>
                              <span>{activity.ip_address}</span>
                            </div>
                          )}
                        </div>

                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <details className="mt-3">
                            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                              Ver detalhes técnicos
                            </summary>
                            <pre className="text-xs mt-2 p-3 bg-muted rounded-md overflow-x-auto">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

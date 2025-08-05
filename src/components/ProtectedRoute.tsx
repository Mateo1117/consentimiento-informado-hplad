import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-blue-light to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-medical-blue" />
              <p className="text-medical-gray">Verificando autenticación...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access if required
  if (requiredRole && user?.user_metadata?.role) {
    const userRole = user.user_metadata.role;
    if (!requiredRole.includes(userRole)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-medical-blue-light to-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-bold text-medical-blue mb-4">Acceso Denegado</h2>
              <p className="text-medical-gray mb-4">
                No tiene permisos suficientes para acceder a esta sección.
              </p>
              <p className="text-sm text-gray-600">
                Rol requerido: {requiredRole.join(' o ')} | Su rol: {userRole}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
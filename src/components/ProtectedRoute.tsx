import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";

type AppRole = 'admin' | 'doctor' | 'lab_technician' | 'receptionist' | 'viewer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, roles } = useAuth();
  const navigate = useNavigate();

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

  // Check role-based access from database roles
  if (requiredRole && requiredRole.length > 0) {
    const hasRequiredRole = requiredRole.some(role => roles.includes(role));
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-medical-blue-light to-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-medical-blue mb-4">Acceso Denegado</h2>
              <p className="text-medical-gray mb-4">
                No tiene permisos suficientes para acceder a esta sección.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Rol requerido:</strong> {requiredRole.map(r => {
                    const labels: Record<AppRole, string> = {
                      admin: 'Administrador',
                      doctor: 'Médico',
                      lab_technician: 'Técnico de Laboratorio',
                      receptionist: 'Recepcionista',
                      viewer: 'Visualizador'
                    };
                    return labels[r];
                  }).join(' o ')}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Sus roles:</strong> {roles.length > 0 ? roles.map(r => {
                    const labels: Record<AppRole, string> = {
                      admin: 'Administrador',
                      doctor: 'Médico',
                      lab_technician: 'Técnico de Laboratorio',
                      receptionist: 'Recepcionista',
                      viewer: 'Visualizador'
                    };
                    return labels[r];
                  }).join(', ') : 'Sin rol asignado'}
                </p>
              </div>
              <Button 
                onClick={() => navigate('/')}
                className="bg-medical-blue hover:bg-medical-blue/90"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
